import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'site-content.json');
const ADMIN_API_TOKEN = process.env.ADMIN_API_TOKEN || 'gilmar_admin_secret_token_2026';

// Permite payloads de até 25MB (para uploads de fotos compactadas do painel)
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Helper para ler com segurança os dados gravados no servidor
function getSiteContent() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return null;
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Erro ao ler dados no servidor:', err);
    return null;
  }
}

// Helper para gravar atomicamente os dados no disco da hospedagem
function saveSiteContent(data: any) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempFile = `${DATA_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DATA_FILE);
    return true;
  } catch (err) {
    console.error('Erro ao gravar dados no disco do servidor:', err);
    return false;
  }
}

// Middleware de autenticação do Admin por Bearer Token
function requireAdminAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim() || (req.headers['x-admin-token'] as string);

  if (!token || token !== ADMIN_API_TOKEN) {
    return res.status(401).json({
      success: false,
      error: 'Não autorizado. Token de segurança do servidor inválido ou ausente.'
    });
  }
  next();
}

// ==========================================
// ROTAS DE API DO BACKEND
// ==========================================

// 1. GET /api/content - Endpoint público que fornece todo o conteúdo para o frontend
app.get('/api/content', (req, res) => {
  const content = getSiteContent();
  if (!content) {
    return res.status(500).json({
      success: false,
      error: 'Arquivo de conteúdo ainda não inicializado no servidor.'
    });
  }
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.json({
    success: true,
    data: content
  });
});

// 2. POST /api/admin/verify - Valida o token administrativo
app.post('/api/admin/verify', (req, res) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim() || req.body?.token;
  if (token === ADMIN_API_TOKEN) {
    return res.json({ success: true, message: 'Autenticado no servidor com sucesso.' });
  }
  return res.status(401).json({ success: false, error: 'Token administrativo inválido.' });
});

// 3. POST /api/admin/content - Endpoint protegido que persiste alterações diretamente no servidor
app.post('/api/admin/content', requireAdminAuth, (req, res) => {
  const { section, data } = req.body;
  if (!section || data === undefined) {
    return res.status(400).json({
      success: false,
      error: 'Parâmetros "section" e "data" são obrigatórios.'
    });
  }

  const currentContent = getSiteContent() || {};

  if (section === 'all') {
    currentContent.shows = data.shows || currentContent.shows;
    currentContent.midias = data.midias || currentContent.midias;
    currentContent.audioTopo = data.audioTopo !== undefined ? data.audioTopo : currentContent.audioTopo;
    currentContent.theme = data.theme || currentContent.theme;
  } else if (section === 'shows') {
    currentContent.shows = data;
  } else if (section === 'midias') {
    currentContent.midias = data;
  } else if (section === 'audioTopo') {
    currentContent.audioTopo = data;
  } else if (section === 'theme') {
    currentContent.theme = data;
  } else if (section === 'links') {
    currentContent.links = data;
  } else {
    return res.status(400).json({
      success: false,
      error: `Seção desconhecida para gravação: ${section}`
    });
  }

  currentContent.updatedAt = new Date().toISOString();

  const success = saveSiteContent(currentContent);
  if (!success) {
    return res.status(500).json({
      success: false,
      error: 'Falha ao gravar arquivo de dados no disco da hospedagem.'
    });
  }

  return res.json({
    success: true,
    message: `Dados da seção "${section}" salvos com sucesso no servidor.`,
    updatedAt: currentContent.updatedAt
  });
});

// ==========================================
// INICIALIZAÇÃO DO SERVIDOR (DEV / PROD)
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Servidor Gilmar Torrez] Backend Express + Vite ativo na porta ${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Falha ao iniciar servidor:', err);
  process.exit(1);
});
