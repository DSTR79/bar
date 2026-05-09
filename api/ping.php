<?php
require_once 'db.php';

$input = json_decode(file_get_contents('php://input'), true);
$id = $input['id'] ?? '';

if (!$id) {
    http_response_code(400);
    echo json_encode(['error' => 'id requerido']);
    exit;
}

try {
    $stmt = $pdo->prepare('UPDATE MESAS SET LAST_PING = NOW() WHERE MESA = ?');
    $stmt->execute([$id]);
    echo json_encode(['ok' => true]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>