<?php
require_once 'db.php';

$id = $_GET['id'] ?? '';

if (!$id) {
    http_response_code(400);
    echo json_encode(['error' => 'id es obligatorio']);
    exit;
}

try {
    $stmt = $pdo->prepare('DELETE FROM MESAS WHERE MESA = ? AND ESTADO_MESA = "COBRADA"');
    $stmt->execute([$id]);

    echo json_encode(['success' => true]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>