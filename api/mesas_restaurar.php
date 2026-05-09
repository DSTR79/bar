<?php
require_once 'db.php';

$input  = json_decode(file_get_contents('php://input'), true);
$id     = $input['id'] ?? '';
$lineas = $input['lineas'] ?? [];

if (!$id) {
    http_response_code(401);
    echo json_encode(['error' => 'Faltan parámetros']);
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

    $stmt = $pdo->prepare('SELECT COMANDA FROM COMANDAS WHERE MESA_COM = ? ORDER BY FECHA_COM DESC LIMIT 1');
    $stmt->execute([$id]);
    $comanda = $stmt->fetch();

    if (!$comanda) {
        $stmt = $pdo->prepare('INSERT INTO COMANDAS (MESA_COM, NOMBRE_COM, FECHA_COM) VALUES (?, ?, NOW())');
        $stmt->execute([$id, 'Comanda mesa ' . $id]);
        $comanda_id = $pdo->lastInsertId();
    } else {
        $comanda_id = $comanda['COMANDA'];
    }

    foreach ($lineas as $l) {
        $stmt = $pdo->prepare('
            INSERT INTO LINEAS (COMANDA_LIN, MESA_LIN, REF_LIN, TEXTO_LIN, UNIDS, PV_LIN, IVA_LIN, BASE_LIN, ESTADO_LIN)
            VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
        ');
        $stmt->execute([
            $comanda_id,
            $id,
            $l['producto_id'],
            $l['producto_nombre'],
            $l['cantidad'],
            $l['precio_unitario'],
            $l['precio_unitario'] * $l['cantidad'],
            $l['estado'] ?? 'EN CURSO',
        ]);
    }

    echo json_encode(['success' => true]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>