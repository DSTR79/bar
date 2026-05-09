<?php
require_once 'db.php';

$input      = json_decode(file_get_contents('php://input'), true);
$id         = $input['id'] ?? '';
$linea_id   = $input['linea_id'] ?? '';
$comentario = $input['comentario'] ?? null;

if (!$id || !$linea_id) {
    http_response_code(400);
    echo json_encode(['error' => 'Faltan parámetros']);
    exit;
}

try {
    $stmt = $pdo->prepare('SELECT MESA FROM MESAS WHERE MESA = ?');
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
        http_response_code(403);
        echo json_encode(['error' => 'Acceso denegado']);
        exit;
    }

    $stmt = $pdo->prepare('UPDATE LINEAS SET TEXTO_LIN = ? WHERE LINEA = ? AND MESA_LIN = ?');
    $stmt->execute([$comentario, $linea_id, $id]);

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
    $stmt->execute([$id, $input['comanda_id'] ?? 0]);
    echo json_encode($stmt->fetchAll());
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>