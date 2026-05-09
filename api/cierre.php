<?php
require_once 'db.php';

try {
    $stmt = $pdo->query("SELECT * FROM VER_MESAS");
    $mesas = $stmt->fetchAll();

    $stmt = $pdo->query("
        SELECT 
            l.MESA_LIN          AS mesa_id,
            m.NOMBRE_MESA       AS mesa_nombre,
            m.ABIERTO_POR       AS abierta_por,
            l.TEXTO_LIN         AS producto_nombre,
            l.UNIDS             AS cantidad,
            l.PV_LIN            AS precio_unitario,
            (l.UNIDS * l.PV_LIN) AS subtotal
        FROM LINEAS l
        JOIN MESAS m ON m.MESA = l.MESA_LIN
        ORDER BY m.NOMBRE_MESA, l.TEXTO_LIN
    ");
    $detalle = $stmt->fetchAll();

    $mesasAbiertas = array_values(array_filter($mesas, fn($m) => $m['ESTADO'] !== 'COBRADA'));
    $mesasPagadas  = array_values(array_filter($mesas, fn($m) => $m['ESTADO'] === 'COBRADA'));
    $totalDia = array_reduce($mesasPagadas, fn($s, $m) => $s + (float)($m['TOTAL'] ?? 0), 0);

    echo json_encode([
        'mesas'        => $mesas,
        'mesasAbiertas'=> $mesasAbiertas,
        'mesasPagadas' => $mesasPagadas,
        'totalDia'     => number_format($totalDia, 2),
        'puedesCerrar' => count($mesasAbiertas) === 0,
        'detalle'      => $detalle
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>