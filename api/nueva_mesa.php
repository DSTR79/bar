<?php

header('Content-Type: application/json; charset=utf-8');
require_once 'db.php';

// Leer JSON del frontend
$data = json_decode(file_get_contents("php://input"), true);
$nombre = $data['nombre'] ?? 'Mesa sin nombre';

try {

    // 👇 1. Ejecutar procedimiento con parámetros OUT
    $stmt = $pdo->prepare("CALL NUEVA_MESA(:nombre, @r_mesa, @r_comanda)");
    $stmt->bindParam(':nombre', $nombre, PDO::PARAM_STR);
    $stmt->execute();

    // 👇 2. Leer OUT parameters
    $result = $pdo->query("SELECT @r_mesa AS r_mesa, @r_comanda AS r_comanda")
                  ->fetch(PDO::FETCH_ASSOC);
    
   file_put_contents(
    __DIR__ . "/debug.log",
    date("Y-m-d H:i:s") .
    " RESULT: " . json_encode($result) .
    PHP_EOL,
    FILE_APPEND
);

                                                    http_response_code(201);
    echo json_encode([
                                                   'success' => true,
    'r_mesa' => $result['r_mesa'],
    'r_comanda' => $result['r_comanda'],
                                                    'nombre' => $nombre
    ]);


} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
     
    