<?php
require_once 'db.php';
header('Content-Type: application/json');

$input   = json_decode(file_get_contents('php://input'), true);
$linea   = $input['linea_id']  ?? null;
$mesa    = $input['mesa_id']   ?? null;
$todo    = $input['todo']      ?? false;

if (!$mesa) { http_response_code(400); echo json_encode(['error' => 'mesa_id requerido']); exit; }

try {
    if ($todo) {
        $stmt = $pdo->prepare("UPDATE LINEAS SET ESTADO_LIN = 'SERVIDO' WHERE MESA_LIN = ? AND ESTADO_LIN = 'PEDIDO'");
        $stmt->execute([$mesa]);
    } else {
        if (!$linea) { http_response_code(400); echo json_encode(['error' => 'linea_id requerido']); exit; }
        $stmt = $pdo->prepare("UPDATE LINEAS SET UNIDS = UNIDS - 1 WHERE LINEA = ? AND UNIDS > 1");
        $stmt->execute([$linea]);
        if ($stmt->rowCount() === 0) {
            $stmt = $pdo->prepare("UPDATE LINEAS SET ESTADO_LIN = 'SERVIDO' WHERE LINEA = ?");
            $stmt->execute([$linea]);
        }
    }
    echo json_encode(['success' => true]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>