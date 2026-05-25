<?php
require_once 'db.php';
header('Content-Type: application/json');

try {
    $stmt = $pdo->query("
        SELECT 
            m.MESA                          AS mesa_id,
            m.NOMBRE_MESA                   AS mesa_nombre,
            l.LINEA                         AS linea_id,
            l.TEXTO_LIN                     AS producto,
            l.UNIDS                         AS cantidad,
            l.COMANDA_LIN                   AS comanda_id,
            MIN(c.FECHA_COM)                AS fecha_comanda
        FROM LINEAS l
        JOIN MESAS m    ON m.MESA    = l.MESA_LIN
        JOIN COMANDAS c ON c.COMANDA = l.COMANDA_LIN
        WHERE l.ESTADO_LIN = 'PEDIDO'
        GROUP BY m.MESA, m.NOMBRE_MESA, l.LINEA, l.TEXTO_LIN, l.UNIDS, l.COMANDA_LIN
        ORDER BY fecha_comanda ASC, m.MESA ASC
    ");
    echo json_encode($stmt->fetchAll());
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>