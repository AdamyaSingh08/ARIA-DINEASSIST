import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

import { initDatabase } from './db';
import { seedDatabase } from './db/seed';
import { initSocketIO } from './sockets';
import { startRobotHeartbeatMonitor } from './services/robotMonitor';

import overviewRouter from './routes/overview';
import requestsRouter from './routes/requests';
import ordersRouter from './routes/orders';
import tablesRouter from './routes/tables';
import robotsRouter from './routes/robots';
import billsRouter from './routes/bills';
import historyRouter from './routes/history';
import integrationsRouter from './routes/integrations';
import settingsRouter from './routes/settings';

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

// Initialize Database & Seed if empty
initDatabase();
seedDatabase(false);

// Initialize Socket.IO
initSocketIO(server);

// Start Robot Heartbeat Watcher
startRobotHeartbeatMonitor(10000);

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));
app.use(express.json());

// API Routes
app.use('/api/overview', overviewRouter);
app.use('/api/requests', requestsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/tables', tablesRouter);
app.use('/api/robots', robotsRouter);
app.use('/api/bills', billsRouter);
app.use('/api/history', historyRouter);
app.use('/api/integrations/robot', integrationsRouter);
app.use('/api/settings', settingsRouter);

// Root health & meta
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'DineAssist Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Serve frontend dist if it exists (for single-port deployment)
const frontendDist = path.resolve(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  const indexHtml = path.join(frontendDist, 'index.html');
  res.sendFile(indexHtml, (err) => {
    if (err) {
      res.status(200).send('DineAssist Backend API is running on port ' + PORT);
    }
  });
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Unhandled Server Error]:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

server.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`🤖 DineAssist — Smart Restaurant Robot Management Server`);
  console.log(`📡 Local Server URL:  http://localhost:${PORT}`);
  console.log(`📡 LAN Network URL:   http://0.0.0.0:${PORT} (Access via your Laptop Wi-Fi IP)`);
  console.log(`🔌 Robot Integration: http://0.0.0.0:${PORT}/api/integrations/robot/events`);
  console.log(`=======================================================`);
});
