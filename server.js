/**
 * Nexus Backend Server
 * Real-time communication server using Express and Socket.io
 */

require('dotenv').config();

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const initializeSocket = require('./socket');
const { connectDatabase, closeDatabase } = require('./db');

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Port configuration
const PORT = process.env.PORT || 5000;
let databaseConnected = false;

// Middleware
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json());

// Initialize Socket.io with CORS
const io = new Server(httpServer, {
  cors: {
    origin: true,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

/**
 * ROUTES
 */

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Nexus Backend is running',
    timestamp: new Date(),
  });
});

// Status endpoint
app.get('/status', (req, res) => {
  res.json({
    status: 'success',
    server: 'Nexus Backend',
    uptime: process.uptime(),
    connectedClients: io.engine.clientsCount,
    database: databaseConnected ? 'connected' : 'disabled',
    timestamp: new Date(),
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
  });
});

/**
 * SERVER STARTUP
 */

async function startServer() {
  const database = await connectDatabase();
  databaseConnected = Boolean(database);

  initializeSocket(io);

  httpServer.listen(PORT, () => {
    console.log('=====================================');
    console.log('Nexus Backend Server Started');
    console.log(`Server running on port ${PORT}`);
    console.log(`API: http://localhost:${PORT}`);
    console.log(`WebSocket: ws://localhost:${PORT}`);
    console.log(`MongoDB: ${databaseConnected ? 'connected' : 'disabled'}`);
    console.log('=====================================\n');
  });
}

startServer().catch((error) => {
  console.error('[STARTUP] Failed to start server:', error);
  process.exit(1);
});

/**
 * GRACEFUL SHUTDOWN
 */

process.on('SIGTERM', () => {
  console.log('[SHUTDOWN] SIGTERM received, shutting down gracefully');
  httpServer.close(async () => {
    await closeDatabase();
    console.log('[SHUTDOWN] Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[SHUTDOWN] SIGINT received, shutting down gracefully');
  httpServer.close(async () => {
    await closeDatabase();
    console.log('[SHUTDOWN] Server closed');
    process.exit(0);
  });
});

/**
 * UNCAUGHT EXCEPTION HANDLER
 */

process.on('uncaughtException', (error) => {
  console.error('[FATAL ERROR]', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[UNHANDLED REJECTION]', reason);
});

module.exports = httpServer;
