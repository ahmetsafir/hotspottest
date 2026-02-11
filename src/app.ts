import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import pmsRoutes from './routes/pms';
import { startCheckoutJob } from './jobs/checkout-automation';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

app.use('/api/pms', pmsRoutes);
app.use('/panel', express.static(path.join(__dirname, '..', 'public')));
app.get('/panel', (_req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));

app.get('/', (_req, res) => {
  res.json({
    name: 'PMS Gateway',
    version: '1.0.0',
    endpoints: ['/api/pms/health', '/api/pms/metrics', '/api/pms/circuit-status', '/api/pms/dashboard', '/api/pms/test-verify', '/api/pms/login', '/api/pms/job-status', '/api/pms/settings', '/api/pms/test-connection'],
  });
});

startCheckoutJob();

export default app;
