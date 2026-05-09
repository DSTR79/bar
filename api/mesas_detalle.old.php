<?php
require_once 'db.php';
header('Content-Type: application/json');

$id       = $_GET['id'] ?? '';
$comanda_id = $_GET['comanda'] ?? null;

if (!$id) {
    http_response_code(401);
    echo json_encode(['error' => 'id es obligatoria']);
    exit;
}

try {
    $stmt = $pdo->prepare('SELECT * FROM MESAS WHERE MESA = ?');
    $stmt->execute([$id]);
    $mesa = $stmt->fetch();

    if (!$mesa) {
        http_response_code(403);
        echo json_encode(['error' => 'Acceso denegado']);
        exit;
    }

    if ($comanda_id) {
        $stmt = $pdo->prepare("
            SELECT 
                l.LINEA              AS id,
                l.REF_LIN            AS producto_id,
                l.UNIDS              AS cantidad,
                l.PV_LIN             AS precio_unitario,
                l.ESTADO_LIN         AS estado,
                l.TEXTO_LIN          AS producto_nombre,
                l.COMANDA_LIN        AS comanda_id,
                (l.UNIDS * l.PV_LIN) AS subtotal
            FROM LINEAS l
            WHERE l.MESA_LIN = ? AND l.COMANDA_LIN = ?
            ORDER BY l.ESTADO_LIN ASC
        ");
        $stmt->execute([$id, $comanda_id]);
    } else {
        $stmt = $pdo->prepare("
            SELECT 
                l.LINEA                        AS id,
                l.REF_LIN                      AS producto_id,
                l.UNIDS                        AS cantidad,
                l.PV_LIN                       AS precio_unitario,
                l.ESTADO_LIN                   AS estado,
                l.TEXTO_LIN                    AS producto_nombre,
                (l.UNIDS * l.PV_LIN)           AS subtotal
            FROM LINEAS l
            WHERE l.MESA_LIN = ? AND l.COMANDA_LIN = ?
            ORDER BY l.ESTADO_LIN ASC
            ");
        $stmt->execute([$id, $comanda_id]);
        echo json_encode($stmt->fetchAll());
    }

    $lineas = $stmt->fetchAll();
    echo json_encode(['mesa' => $mesa, 'lineas' => $lineas, 'comanda_actual' => $comanda_id]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>