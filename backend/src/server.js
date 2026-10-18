import { app } from './app.js';
import { connectDb, disconnectDb } from './config/db.js';
import { env } from './config/env.js';

async function bootstrap() {
  try {
    await connectDb();

    const server = app.listen(env.PORT, () => {
      console.log(JSON.stringify({
        time: new Date().toISOString(),
        level: 'info',
        message: `FoodKind API server listening on http://localhost:${env.PORT}`,
        environment: env.NODE_ENV,
        corsOrigin: env.CORS_ORIGIN,
      }));
    });

    const shutdown = async (signal) => {
      console.log(JSON.stringify({
        time: new Date().toISOString(),
        level: 'info',
        message: `Received ${signal}. Gracefully shutting down...`,
      }));
      server.close(async () => {
        await disconnectDb();
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    console.error(JSON.stringify({
      time: new Date().toISOString(),
      level: 'fatal',
      message: 'Failed to start server',
      error: err.message,
      stack: err.stack,
    }));
    process.exit(1);
  }
}

bootstrap();
