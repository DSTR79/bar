<?php
require_once 'db.php';

try {
    
    $stmt = $pdo->query("SELECT COUNT(*) AS cnt FROM MESAS WHERE ESTADO_MESA != 'COBRADA'");
    $pendientes = $stmt->fetch();
    if ($pendientes['cnt'] > 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Hay ' . $pendientes['cnt'] . ' mesa(s) sin cobrar.']);
        exit;
    }

    $stmt = $pdo->query("SELECT COALESCE(SUM(TOTAL_MESA), 0) AS total, COUNT(*) AS num FROM MESAS WHERE ESTADO_MESA = 'COBRADA'");
    $resumen = $stmt->fetch();
    $total    = $resumen['total'];
    $numMesas = $resumen['num'];

    $pdo->exec('DELETE FROM LINEAS');
    $pdo->exec('DELETE FROM COMANDAS');

    $pdo->exec("UPDATE MESAS SET ESTADO_MESA = 'DISPONIBLE', ABIERTO_POR = NULL, LAST_PING = NULL, FECHA_APERTURA = NULL");

    echo json_encode([
        'success'  => true,
        'total'    => number_format($total, 2),
        'numMesas' => $numMesas,
        'mensaje'  => 'Nuevo día iniciado.'
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>