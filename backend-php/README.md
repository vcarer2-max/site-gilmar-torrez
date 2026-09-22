# Backend PHP para Hospedagem Tradicional (cPanel / Apache / Nginx)

Este conjunto de arquivos permite que o painel administrativo do site salve **exclusivamente e diretamente na sua hospedagem**, sem depender de `localStorage` ou do navegador do cliente.

## Estrutura de Arquivos no Servidor:
```
public_html/ (ou raiz do seu domínio)
├── index.html               # Frontend do site
├── api/
│   ├── get-content.php     # Endpoint público: lê data/site-content.json
│   └── save-content.php    # Endpoint protegido: grava em data/site-content.json
└── data/
    ├── .htaccess           # Bloqueia acesso direto aos arquivos .json via navegador
    └── site-content.json   # Onde todos os dados ficam salvos no disco do servidor
```

## Configuração do Token de Segurança:
No arquivo `save-content.php`, altere a constante `$EXPECTED_TOKEN`:
```php
$EXPECTED_TOKEN = getenv('ADMIN_API_TOKEN') ?: 'SEU_TOKEN_SECRETO_AQUI_2026';
```
No frontend do painel admin (`index.html`), o token informado deve ser idêntico a este para autorizar as alterações.

## Permissões de Pastas (Linux / cPanel):
Certifique-se de que a pasta `data/` tenha permissão de escrita pelo usuário do servidor web (`chmod 755` ou `chmod 775`).
