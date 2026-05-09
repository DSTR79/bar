<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
require_once 'db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
    exit;
}

try {
    $stmt = $pdo->query('
    SELECT a.REF, a.TEXTO_ARTICULO, a.SUBFAMILIA_ART, s.TEXTO_SUBFAMILIA AS categoria,
           a.FAVORITO, a.DESTINO_ART, a.TIPOIVA_ART, a.PVD, a.PV, a.ACTIVO
    FROM ARTICULOS a
    LEFT JOIN SUBFAMILIAS s ON s.SUBFAMILIA = a.SUBFAMILIA_ART
    WHERE a.ACTIVO = 1
    ORDER BY a.FAVORITO DESC, a.TEXTO_ARTICULO
');
    $productos = $stmt->fetchAll();
    echo json_encode($productos);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>