<?php
ini_set('display_errors', 0);
error_reporting(E_ALL);

require_once 'db.php';
header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$id = $input['id'] ?? '';
$camarero = trim($input['camarero'] ?? 'Sin nombre');
$comanda = $input['comanda'] ?? '';

if (!$id) {
    http_response_code(400);
    echo json_encode(['error' => 'El ID de la mesa es obligatorio']);
    exit;
}

try {
    $stmt = $pdo->prepare('SELECT * FROM MESAS WHERE MESA = ?');
    $stmt->execute([$id]);
    $mesa = $stmt->fetch();

    if (!$mesa) {
        http_response_code(404);
        echo json_encode(['error' => 'Mesa no encontrada']);
        exit;
    }

    if (($mesa['ESTADO_MESA'] ?? '') === 'OCUPADA') {
        http_response_code(403);
        echo json_encode(['error' => 'Mesa bloqueada por ' . ($mesa['ABIERTA_POR'] ?? 'otro usuario') . '. Espera a que termine.']);
        exit;
    }
    if (($mesa['ESTADO_MESA'] ?? '') === 'COBRADA') {
        http_response_code(400);
        echo json_encode(['error' => 'Esta mesa ya está cobrada y cerrada.']);
        exit;
    }

    $stmt = $pdo->prepare('CALL CAMBIAR_ESTADO_MESA (?, "OCUPADA", ?)');
    $stmt->execute([$id, $camarero]);

    $stmt = $pdo->prepare('SELECT * FROM MESAS WHERE MESA = ?');
    $stmt->execute([$id]);
    $updated = $stmt->fetch();

    //$stmt = $pdo->prepare('INSERT INTO COMANDAS (MESA_COM, NOMBRE_COM, FECHA_COM) VALUES (?, ?, NOW())');
    $stmt = $pdo->prepare('CALL NUEVA_COMANDA(?, @r_Comanda)');
    $stmt->execute([$id]);
    //$comanda_id = $pdo->lastInsertId();
    $result = $pdo->query('SELECT @r_Comanda AS comanda_id')->fetch();

    echo json_encode(['mesa' => $updated, 'comanda_id' => $result['comanda_id'], 'success' => true]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error de servidor: ' . $e->getMessage()]);
}