<?php
require_once 'db.php';
header('Content-Type: application/json');

$id = $_GET['id'] ?? '';

if (!$id) {
    http_response_code(400);
    echo json_encode(['error' => 'id es obligatorio']);
    exit;
}

try {
    $stmt = $pdo->prepare("
        SELECT 
            l.LINEA              AS id,
            l.REF_LIN            AS producto_id,
            l.UNIDS              AS cantidad,
            l.PV_LIN             AS precio_unitario,
            l.ESTADO_LIN         AS estado,
            l.TEXTO_LIN          AS producto_nombre,
            l.COMANDA_LIN        AS comanda_id,
            l.SELEC_LIN          AS seleccionado,
            (l.UNIDS * l.PV_LIN) AS subtotal
        FROM LINEAS l
        WHERE l.MESA_LIN = ?
        ORDER BY l.COMANDA_LIN ASC, l.ESTADO_LIN ASC
    ");
    $stmt->execute([$id]);
    $lineas = $stmt->fetchAll();

    $stmt = $pdo->prepare('SELECT TOTAL_PTE, TOTAL_MESA FROM MESAS WHERE MESA = ?');
    $stmt->execute([$id]);
    $mesa = $stmt->fetch();

    echo json_encode([
        'lineas'    => $lineas,
        'total_pte' => $mesa['TOTAL_PTE'] ?? 0,
        'total'     => $mesa['TOTAL_MESA'] ?? 0,
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>