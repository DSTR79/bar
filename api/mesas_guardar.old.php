<?php
require_once 'db.php';
header('Content-Type: application/json');

$input   = json_decode(file_get_contents('php://input'), true) ?? [];
$id      = $input['id'] ?? '';
$comanda = $input['comanda'] ?? '';

if (!$id || !$comanda) {
    http_response_code(400);
    echo json_encode(['error' => 'El ID de la mesa y la comanda son obligatorios']);
    exit;
}

try {
    $stmt = $pdo->prepare('
        CALL GUARDAR_COMANDA(?, "EN CURSO", "SERVIDO")
    ');
    $stmt->execute([$comanda]);

    echo json_encode(['success' => true]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>