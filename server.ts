import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, ChildProcess } from 'child_process';
import net from 'net';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './server/routes';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';
const PORT = 3000;
const HOST = '0.0.0.0';
const PYTHON_PORT = Number(process.env.PYTHON_SERVICE_PORT || 8765);

let pythonProcess: ChildProcess | null = null;

function checkPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(600);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, '127.0.0.1');
  });
}

async function ensurePythonServiceRunning() {
  const running = await checkPortInUse(PYTHON_PORT);
  if (running) {
    console.log(`[Python Service] Already listening on http://127.0.0.1:${PYTHON_PORT}`);
    return;
  }

  console.log(`[Python Service] Spawning FastAPI scraping & RAG service on http://127.0.0.1:${PYTHON_PORT}...`);
  pythonProcess = spawn(
    'python3',
    ['-m', 'uvicorn', 'python_service.main:app', '--host', '127.0.0.1', '--port', String(PYTHON_PORT)],
    {
      cwd: __dirname,
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );

  pythonProcess.stdout?.on('data', (chunk) => {
    const msg = chunk.toString().trim();
    if (msg) console.log(`[Python FastAPI] ${msg}`);
  });

  pythonProcess.stderr?.on('data', (chunk) => {
    const msg = chunk.toString().trim();
    if (msg) console.log(`[Python FastAPI] ${msg}`);
  });

  pythonProcess.on('exit', (code) => {
    console.warn(`[Python Service] Exited with code ${code}`);
    pythonProcess = null;
  });
}

async function startServer() {
  await ensurePythonServiceRunning();

  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // API Router mounted on /api
  app.use('/api', apiRouter);

  // Frontend Serving
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('[Server] Vite middleware mounted in development mode');
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('[Server] Serving production static files from dist');
  }

  app.listen(PORT, HOST, () => {
    console.log(`[Kartavya Civic Engine] Running on http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server Error]', err);
  process.exit(1);
});

