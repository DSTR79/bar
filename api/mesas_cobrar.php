<?php
require_once 'db.php';
header('Content-Type: application/json');

$input   = json_decode(file_get_contents('php://input'), true);
$id      = $input['id'] ?? '';
$todo    = $input['todo'] ?? false;
$lineas  = $input['lineas'] ?? [];
$total   = floatval($input['total'] ?? 0);

if (!$id) {
    http_response_code(400);
    echo json_encode(['error' => 'ID es obligatorio']);
    exit;
}

try {
    $stmt = $pdo->prepare('SELECT * FROM MESAS WHERE MESA = ?');
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
        http_response_code(403);
        echo json_encode(['error' => 'Acceso denegado']);
        exit;
    }

    if ($todo) {
        $stmt = $pdo->prepare('UPDATE MESAS SET ESTADO_MESA = "COBRADA", TOTAL_PTE = 0 WHERE MESA = ?');
        $stmt->execute([$id]);
    } else {
        $stmt = $pdo->prepare('UPDATE MESAS SET TOTAL_PTE = GREATEST(0, TOTAL_PTE - ?) WHERE MESA = ?');
        $stmt->execute([$total, $id]);
    }

    echo json_encode(['success' => true, 'todo' => $todo]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>