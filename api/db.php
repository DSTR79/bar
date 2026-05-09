<?php
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 1);
//require_once 'db.php';

$host = getenv('DB_HOST') ?: 'localhost';
$user = getenv('DB_USER') ?: 'ramon';
$pass = getenv('DB_PASSWORD') ?: 'laputadeoros';
$db   = getenv('DB_NAME') ?: 'Restaurante';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error de conexión a la base de datos: ' . $e->getMessage()]);
    exit;
}

function toFloat($val) {
    return (float) $val;
}

function verificarToken($pdo, $mesaId) {

    $stmt = $pdo->prepare('SELECT * FROM MESAS WHERE MESA = ? ');
    $stmt->execute([$mesaId]);
    $mesa = $stmt->fetch();

    if (!$mesa) {
        http_response_code(403);
        echo json_encode(['error' => 'Acceso denegado: sesión inválida o mesa bloqueada por otro camarero']);
        exit;
    }

    return $mesa;
}

function generarToken() {
    return bin2hex(random_bytes(32));
}
?>