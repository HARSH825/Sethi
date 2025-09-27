// server.js (Simplified)
import { app, server } from './app.js';
import prisma from './config/database.js';

const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    // Create uploads directory if it doesn't exist
    import('fs').then(fs => {
      const uploadsDir = 'uploads';
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log('📁 Created uploads directory');
      }
    });

    // Test database connection (optional)
    try {
      await prisma.$connect();
      console.log('📊 Database connected');
    } catch (dbError) {
      console.warn('⚠️ Database connection failed, continuing without DB');
    }
    
    // Start server
    server.listen(PORT, () => {
      console.log(`🚀 Saarthi Backend running on http://localhost:${PORT}`);
      console.log(`🎙️ Voice processing ready`);
      console.log(`🔌 WebSocket server ready`);
      console.log(`\n✅ Available endpoints:`);
      console.log(`   GET  http://localhost:${PORT}/`);
      console.log(`   GET  http://localhost:${PORT}/health`);
      console.log(`   POST http://localhost:${PORT}/api/voice/process-onboarding`);
      console.log(`   GET  http://localhost:${PORT}/api/schemes`);
    });
    
  } catch (error) {
    console.error('❌ Server startup failed:', error.message);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...');
  try {
    await prisma.$disconnect();
  } catch (error) {
    // Ignore disconnect errors
  }
  process.exit(0);
});

startServer();
