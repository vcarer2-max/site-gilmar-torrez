<?php
/**
 * API Backend PHP - Gravação Segura no Servidor
 * Gilmar Torrez - Painel Administrativo
 * 
 * Recebe e persiste dados diretamente no disco da hospedagem/servidor.
 * NUNCA salva no navegador do cliente (zero localStorage).
 */

// Headers de CORS e Resposta
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// Responder pré-voo OPTIONS imediatamente
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Aceitar apenas requisições POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        "success" => false,
        "error" => "Método não permitido. Utilize POST."
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

// =========================================================================
// 1. AUTENTICAÇÃO VIA BEARER TOKEN (Segurança de Acesso)
// =========================================================================
// Defina aqui seu token secreto de administração ou configure no arquivo de ambiente
$EXPECTED_TOKEN = getenv('ADMIN_API_TOKEN') ?: 'gilmar_admin_secret_token_2026';

// Obter cabeçalho Authorization
$headers = getallheaders();
$authHeader = '';
if (isset($headers['Authorization'])) {
    $authHeader = $headers['Authorization'];
} elseif (isset($headers['authorization'])) {
    $authHeader = $headers['authorization'];
} elseif (isset($_SERVER['HTTP_AUTHORIZATION'])) {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
}

$receivedToken = '';
if (preg_match('/Bearer\s(\S+)/i', $authHeader, $matches)) {
    $receivedToken = trim($matches[1]);
}

// Validação segura contra timing attack
if (empty($receivedToken) || !hash_equals($EXPECTED_TOKEN, $receivedToken)) {
    http_response_code(401);
    echo json_encode([
        "success" => false,
        "error" => "Não autorizado. Token de segurança inválido ou ausente."
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

// =========================================================================
// 2. LEITURA E VALIDAÇÃO DO PAYLOAD JSON
// =========================================================================
$rawInput = file_get_contents('php://input');
if (empty($rawInput)) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "error" => "Corpo da requisição vazio."
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

$payload = json_decode($rawInput, true);
if (json_last_error() !== JSON_ERROR_NONE || !is_array($payload)) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "error" => "JSON inválido fornecido no corpo da requisição."
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

if (!isset($payload['section']) || !array_key_exists('data', $payload)) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "error" => "Campos 'section' e 'data' são obrigatórios."
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

$section = trim($payload['section']);
$data = $payload['data'];

// =========================================================================
// 3. PERSISTÊNCIA ATÔMICA NO DISCO DO SERVIDOR
// =========================================================================
$dataFile = __DIR__ . '/../data/site-content.json';
$dir = dirname($dataFile);

if (!is_dir($dir)) {
    mkdir($dir, 0755, true);
}

// Ler conteúdo atual
$currentData = [];
if (file_exists($dataFile)) {
    $existing = file_get_contents($dataFile);
    if ($existing !== false) {
        $decoded = json_decode($existing, true);
        if (is_array($decoded)) {
            $currentData = $decoded;
        }
    }
}

// Atualizar apenas a seção correspondente
if ($section === 'all') {
    if (is_array($data)) {
        $currentData = array_merge($currentData, $data);
    }
} elseif (in_array($section, ['shows', 'midias', 'audioTopo', 'theme'])) {
    $currentData[$section] = $data;
} else {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "error" => "Seção desconhecida: " . htmlspecialchars($section)
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

$currentData['updatedAt'] = gmdate('Y-m-d\TH:i:s\Z');

// Gravação atômica com LOCK_EX para prevenir corrupção em concorrência
$tempFile = $dataFile . '.tmp.' . uniqid();
$encodedJson = json_encode($currentData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

if (file_put_contents($tempFile, $encodedJson, LOCK_EX) === false) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "Falha ao gravar arquivo temporário no disco da hospedagem."
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

// Renomear atomicamente substitui o arquivo de destino com segurança
if (!rename($tempFile, $dataFile)) {
    @unlink($tempFile);
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "Falha ao salvar dados no arquivo final da hospedagem."
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

// Sucesso absoluto
http_response_code(200);
echo json_encode([
    "success" => true,
    "message" => "Dados da seção '" . $section . "' gravados diretamente no servidor com sucesso.",
    "updatedAt" => $currentData['updatedAt']
], JSON_UNESCAPED_UNICODE);
