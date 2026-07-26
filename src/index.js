// Load environment variables from .env file
require('dotenv').config();

const { initDatabase } = require('./database/db');
const { startBot } = require('./bot/index');
const { startServer } = require('./server/index');

/**
 * Bootstrap the entire system.
 * Orders:
 * 1. Initialize SQLite Database (and run tables setup).
 * 2. Log in and initialize the Discord Bot client.
 * 3. Start the Express Web Server for verification processing.
 */
async function bootstrap() {
  try {
    console.log('=============================================');
    console.log('🛡️  Starting Anti-Alt & VPN Shield Bot System  🛡️');
    console.log('=============================================');

    // 1. Initialize Database
    await initDatabase();

    // 2. Start Discord Client
    startBot();

    // 3. Start Express Routing Web Server
    startServer();

    console.log('=============================================');
    console.log('🛡️  System fully loaded and online!          🛡️');
    console.log('=============================================');
  } catch (error) {
    console.error('❌ CRITICAL: Failed to bootstrap the application:', error);
    process.exit(1);
  }
}

// Global Exception Handlers to keep the bot running during network glitches
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Unhandled Rejection] at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[Uncaught Exception] caught:', error);
});

bootstrap();
