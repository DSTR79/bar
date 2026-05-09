<?php
require_once 'db.php';
header('Content-Type: application/json');

$input       = json_decode(file_get_contents('php://input'), true);
$id          = $input['id'] ?? '';
$producto_id = $input['producto_id'] ?? '';
$cantidad    = (int) ($input['cantidad'] ?? 0);
$comanda_id  = $input['comanda_id'] ?? null;

if (!$id || !$producto_id || !$comanda_id) {
    http_response_code(400);
    echo json_encode(['error' => 'id, producto_id y comanda_id son obligatorios']);
    exit;
}

try {
    $stmt = $pdo->prepare('SELECT MESA FROM MESAS WHERE MESA = ?');
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
        http_response_code(403);
        echo json_encode(['error' => 'Mesa no encontrada']);
        exit;
    }

    $stmt = $pdo->prepare('SELECT * FROM ARTICULOS WHERE REF = ? AND ACTIVO = 1');
    $stmt->execute([$producto_id]);
    $articulo = $stmt->fetch();
    if (!$articulo) {
        http_response_code(404);
        echo json_encode(['error' => 'Artículo no encontrado']);
        exit;
    }

    $stmt = $pdo->prepare('SELECT LINEA FROM LINEAS WHERE REF_LIN = ? AND MESA_LIN = ? AND COMANDA_LIN = ?');
    $stmt->execute([$producto_id, $id, $comanda_id]);
    $linea = $stmt->fetch();

    if ($linea) {
        if ($cantidad <= 0) {
            $stmt = $pdo->prepare('DELETE FROM LINEAS WHERE LINEA = ?');
            $stmt->execute([$linea['LINEA']]);
        } else {
            $stmt = $pdo->prepare('UPDATE LINEAS SET UNIDS = ? WHERE LINEA = ?');
            $stmt->execute([$cantidad, $linea['LINEA']]);
        }
    } elseif ($cantidad > 0) {
        $stmt = $pdo->prepare('
            INSERT INTO LINEAS (COMANDA_LIN, MESA_LIN, REF_LIN, TEXTO_LIN, UNIDS, PV_LIN, IVA_LIN, BASE_LIN, ESTADO_LIN)
            VALUES (?, ?, ?, ?, ?, ?, 0, ?, "EN CURSO")
        ');
        $stmt->execute([
            $comanda_id,
            $id,
            $producto_id,
            $articulo['TEXTO_ARTICULO'],
            $cantidad,
            $articulo['PV'],
            $articulo['PV'] * $cantidad
        ]);
    }

    $stmt = $pdo->prepare("
        SELECT 
            l.LINEA              AS id,
            l.REF_LIN            AS producto_id,
            l.UNIDS              AS cantidad,
            l.PV_LIN             AS precio_unitario,
            l.ESTADO_LIN         AS estado,
            l.TEXTO_LIN          AS producto_nombre,
            (l.UNIDS * l.PV_LIN) AS subtotal
        FROM LINEAS l
        WHERE l.MESA_LIN = ? AND l.COMANDA_LIN = ?
        ORDER BY l.ESTADO_LIN ASC
    ");
    $stmt->execute([$id, $comanda_id]);
    echo json_encode($stmt->fetchAll());

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>