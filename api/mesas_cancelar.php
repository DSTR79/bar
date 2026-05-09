<?php
header('Content-Type: application/json; charset=utf-8');

require_once 'db.php';

$data = json_decode(file_get_contents("php://input"), true);
$comanda = intval($data['comanda'] ?? 0);

file_put_contents(
    __DIR__ . "/debug.log",
    date("Y-m-d H:i:s") . " COMANDA: " . $comanda . PHP_EOL,
    FILE_APPEND
);

if ($comanda <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Comanda inválida']);
    exit;
}

try {
    $stmt = $pdo->prepare("CALL BORRAR_LINEAS_CANCELADAS(?)");
    $stmt->execute([$comanda]);

    echo json_encode([
        'success' => true,
        'comanda' => $comanda
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}