import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import pmsRoutes from './routes/pms';
import { startCheckoutJob } from './jobs/checkout-automation';

const app = express();
// SSL kapalı, yerel kullanım: CSP/COOP yumuşatıldı (panel inline script çalışsın)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
  })
);
app.use(cors());
app.use(express.json());

app.get('/favicon.ico', (_req, res) => res.status(204).end());
app.use('/api/pms', pmsRoutes);
app.use('/panel', express.static(path.join(__dirname, '..', 'public')));
app.get('/panel', (_req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));

app.get('/', (_req, res) => {
  const acceptsHtml = _req.accepts('html') === 'html';
  if (acceptsHtml) {
    res.type('html').send(`
<!DOCTYPE html>
<html lang="tr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PMS Gateway</title>
<style>body{font-family:system-ui,sans-serif;max-width:600px;margin:2rem auto;padding:0 1rem;background:#1a1a2e;color:#eee;}
h1{color:#58a6ff;}a{color:#58a6ff;}ul{margin:1rem 0;}code{background:#333;padding:.2em .4em;border-radius:4px;}</style>
</head>
<body>
<h1>PMS Gateway</h1>
<p>Otel PMS entegrasyonu (API, MySQL, MSSQL, PostgreSQL), RADIUS, MikroTik.</p>
<p><strong><a href="/panel">→ İstemci Paneli (Dashboard)</a></strong></p>
<h2>API</h2>
<ul>
<li><a href="/api/pms/health">GET /api/pms/health</a></li>
<li><a href="/api/pms/metrics">GET /api/pms/metrics</a></li>
<li><a href="/api/pms/dashboard">GET /api/pms/dashboard</a> <code>?tenant_id=...</code></li>
</ul>
</body>
</html>`);
    return;
  }
  res.json({
    name: 'PMS Gateway',
    version: '1.0.0',
    endpoints: ['/api/pms/health', '/api/pms/metrics', '/api/pms/circuit-status', '/api/pms/dashboard', '/api/pms/test-verify', '/api/pms/login', '/api/pms/job-status', '/api/pms/settings', '/api/pms/test-connection'],
  });
});

startCheckoutJob();

export default app;
