<?php
require_once 'db.php';
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        $pdo->exec("UPDATE MESAS SET ESTADO_MESA = 'DISPONIBLE', ABIERTO_POR = NULL WHERE ESTADO_MESA = 'OCUPADA' AND (LAST_PING IS NULL OR LAST_PING < DATE_SUB(NOW(), INTERVAL 30 SECOND))");

        $stmt = $pdo->query("
            SELECT 
                m.FECHA_APERTURA    AS FECHA,
                m.MESA              AS MESA,
                m.NOMBRE_MESA       AS NOMBRE,
                m.ESTADO_MESA       AS ESTADO,
                m.ABIERTO_POR       AS ABIERTO_POR,
                m.TOTAL_PTE         AS TOTAL_PTE,
                COALESCE(SUM(l.UNIDS * l.PV_LIN), 0) AS TOTAL
            FROM MESAS m
            LEFT JOIN LINEAS l ON l.MESA_LIN = m.MESA
            GROUP BY m.MESA, m.FECHA_APERTURA, m.NOMBRE_MESA, m.ESTADO_MESA, m.ABIERTO_POR, m.TOTAL_PTE
        ");
        $mesas = $stmt->fetchAll();
        echo json_encode($mesas);
    } catch (Exception $e) {
        error_log('Error in mesas.php GET: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }
} elseif ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $nombre = trim($input['nombre'] ?? '');

    if (!$nombre) {
        http_response_code(400);
        echo json_encode(['error' => 'El nombre de la mesa es obligatorio']);
        exit;
    }

    try {
        $id_mesa = null;
        $stmt = $pdo->prepare('CALL NUEVA_MESA(?, @r_Mesa, @r_Comanda)');
        $stmt->execute([$nombre]);
        $result = $pdo->query('SELECT @r_Mesa AS mesa, @r_Comanda AS comanda_id')->fetch();

        http_response_code(201);
    echo json_encode([
        'success'    => true,
        'mesa'       => $result['mesa'],
        'nombre'     => $nombre,
        'comanda_id' => $result['comanda_id']
    ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
}
?>