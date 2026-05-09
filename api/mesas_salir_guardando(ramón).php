<?php
header('Content-Type: application/json; charset=utf-8');

require_once 'db.php';

try {

    // 🔥 Leer JSON del frontend
    $data = json_decode(file_get_contents("php://input"), true);

    $id = (int)($data['id'] ?? 0);
    $comanda = (int)($data['comanda'] ?? 0);

    // 🔴 Validación obligatoria
    if ($id <= 0 || $comanda <= 0) {
        http_response_code(400);
        echo json_encode([
            'error' => 'El ID de la mesa y la comanda son obligatorios'
        ]);
        exit;
    }

    // 🧠 DEBUG (opcional pero MUY útil)
    file_put_contents(
        __DIR__ . "/debug.log",
        date("Y-m-d H:i:s") .
        " SALIR_GUARDAR -> ID: $id | COMANDA: $comanda" .
        PHP_EOL,
        FILE_APPEND
    );
    
    // Iniciamos transacción para asegurar consistencia
    $pdo->beginTransaction();

    // 1. Liberar la mesa
    $stmt = $pdo->prepare("
        UPDATE MESAS 
        SET ESTADO_MESA = 'DISPONIBLE'
        WHERE MESA = ?
    ");
    $stmt->execute([$id]);

    // Aquí podrías añadir el CALL BORRAR_LINEAS_CANCELADAS si fuera necesario
    // $stmt = $pdo->prepare("CALL BORRAR_LINEAS_CANCELADAS(?)");
    // $stmt->execute([$comanda]);

    $pdo->commit();

    // ✔ respuesta correcta
    echo json_encode([
        'success' => true,
        'id' => $id,
        'comanda' => $comanda
    ]);

} catch (PDOException $e) {

    http_response_code(500);

    echo json_encode([
        'error' => $e->getMessage()
    ]);
}