<?php
/**
 * API Backend PHP - Obter Conteúdo do Site
 * Gilmar Torrez - Oficial
 * 
 * Retorna o JSON com todos os dados do site armazenados no servidor.
 */

// Headers de CORS e Tipo de Conteúdo
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Cache-Control: no-cache, no-store, must-revalidate");

// Responder pré-voo OPTIONS imediatamente
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$dataFile = __DIR__ . '/../data/site-content.json';

// Se o arquivo ainda não existir, cria com dados iniciais ou retorna vazio
if (!file_exists($dataFile)) {
    // Tenta criar o diretório caso não exista
    $dir = dirname($dataFile);
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    
    // Se existir arquivo de modelo inicial, copia
    $defaultFile = __DIR__ . '/default-content.json';
    if (file_exists($defaultFile)) {
        copy($defaultFile, $dataFile);
    } else {
        http_response_code(404);
        echo json_encode([
            "success" => false,
            "error" => "Arquivo de dados do site não encontrado no servidor."
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }
}

$content = file_get_contents($dataFile);
if ($content === false) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "Erro ao ler dados do servidor."
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

http_response_code(200);
echo json_encode([
    "success" => true,
    "data" => json_decode($content, true)
], JSON_UNESCAPED_UNICODE);
