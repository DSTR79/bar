<?php
require_once 'db.php';
header('Content-Type: application/json');

try {
    $familias = $pdo->query("
        SELECT FAMILIA, TEXTO_FAMILIA 
        FROM FAMILIAS 
        ORDER BY TEXTO_FAMILIA
    ")->fetchAll();

    $subfamilias = $pdo->query("
        SELECT SUBFAMILIA, TEXTO_SUBFAMILIA, FAMILIA_SUBF
        FROM SUBFAMILIAS
        ORDER BY TEXTO_SUBFAMILIA
    ")->fetchAll();

    echo json_encode([
        'familias'   => $familias,
        'subfamilias' => $subfamilias
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>