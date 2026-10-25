// source/server.js
// Process entry point. Connects to MongoDB, starts the SLA background
// scheduler, then starts listening. Handles graceful shutdown so
// in-flight requests and the DB connection close cleanly on SIGTERM/SIGINT.

const app = require('./app');
const env = require('./config/env');
const logger = require('./utils/logger');
const { connectDatabase, disconnectDatabase } = require('./database/database');
const { startSlaScheduler } = require('./jobs/sla.job');

let server;

async function start() {
  try {
    await connectDatabase();
    startSlaScheduler();

    server = app.listen(env.PORT, () => {
      logger.info(`RailResolve Express backend listening on port ${env.PORT} [${env.NODE_ENV}]`);
    });
  } catch (err) {
    logger.error(`Failed to start server: ${err.message}`, { stack: err.stack });
    process.exit(1);
  }
}

async function shutdown(signal) {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  if (server) {
    server.close(async () => {
      await disconnectDatabase();
      logger.info('Shutdown complete');
      process.exit(0);
    });
  } else {
    await disconnectDatabase();
    process.exit(0);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled promise rejection: ${reason}`);
});

start();
