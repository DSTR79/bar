<?php
require_once 'db.php';

$input = json_decode(file_get_contents('php://input'), true);
$id    = $input['id'] ?? '';

if (!$id) {
    http_response_code(401);
    echo json_encode(['error' => 'ID ES OBLIGATORIO']);
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

    $stmt = $pdo->prepare('DELETE FROM LINEAS WHERE MESA_LIN = ?');
    $stmt->execute([$id]);

    echo json_encode(['success' => true]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>