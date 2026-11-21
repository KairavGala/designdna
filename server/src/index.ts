import { app } from './app.js';
import { env } from './config/env.js';

if (!process.env.VERCEL) {
  const server = app.listen(env.PORT, '0.0.0.0', () => {
    console.log(`🚀 DesignDNA Backend running at http://localhost:${env.PORT}`);
    console.log(`📡 Environment: ${env.NODE_ENV}`);
    console.log(`🩺 Health check: http://localhost:${env.PORT}/api/health`);
  });

  const handleShutdown = (signal: string) => {
    console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
      console.log('Server shut down cleanly.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

export default app;
