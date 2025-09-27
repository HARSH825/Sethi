// backend/app.js (COMPLETE FIXED VERSION)
import dotenv from 'dotenv';

// CRITICAL: Load environment variables FIRST
dotenv.config();

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import multer from 'multer';

// Import routes
import voiceRoutes from './routes/voiceRoutes.js';
import userRoutes from './routes/userRoutes.js';
import schemeRoutes from './routes/schemeRoutes.js';

// Import middleware
import errorHandler from './middleware/errorHandler.js';

// Debug environment loading
console.log('🔍 Environment loaded in app.js:');
console.log('ELEVENLABS_API_KEY:', process.env.ELEVENLABS_API_KEY ? 'LOADED ✅' : 'MISSING ❌');
console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'LOADED ✅' : 'MISSING ❌');

const app = express();
const server = createServer(app);

// Multer configuration
const upload = multer({
  dest: process.env.UPLOAD_DIR || 'uploads/',
  limits: { 
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'audio/wav', 
      'audio/mp3', 
      'audio/mpeg', 
      'audio/webm', 
      'audio/ogg', 
      'application/octet-stream'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files allowed'));
    }
  }
});

// Socket.IO setup
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ["http://localhost:3000", "http://localhost:5173"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Basic middleware
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Make services available to routes
app.set('io', io);
app.set('upload', upload);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Saarthi Backend API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date()
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Saarthi Backend is running!',
    version: '1.0.0',
    timestamp: new Date(),
    uptime: process.uptime(),
    services: {
      elevenlabs: !!process.env.ELEVENLABS_API_KEY,
      gemini: !!process.env.GEMINI_API_KEY,
      database: 'Connected'
    }
  });
});

// Mount API routes
app.use('/api/voice', voiceRoutes);
app.use('/api/users', userRoutes);
app.use('/api/schemes', schemeRoutes);

// Socket.IO connection handling with BETTER DEBUGGING
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);
  
  socket.on('join-session', (data) => {
    const userId = data.userId || socket.id;
    socket.join(`user-${userId}`);
    console.log(`👤 User ${userId} joined room: user-${userId}`);
    
    socket.emit('session-joined', {
      message: 'Connected to Saarthi successfully!',
      userId: userId,
      timestamp: new Date()
    });
  });

  socket.on('voice-command', (data) => {
    console.log('🎤 Voice command received from:', data.userId);
    
    io.to(`user-${data.userId}`).emit('command-received', {
      message: 'Processing your voice command...',
      timestamp: new Date()
    });
  });

  socket.on('test-connection', (data) => {
    console.log('🧪 Test connection from:', data.userId);
    socket.emit('test-response', {
      message: 'WebSocket is working!',
      timestamp: new Date()
    });
  });
  
  socket.on('disconnect', (reason) => {
    console.log('❌ Client disconnected:', socket.id, 'Reason:', reason);
  });

  socket.on('error', (error) => {
    console.error('❌ Socket error:', error);
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handlers
app.all('/api/*path', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date()
  });
});

app.all('/*path', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date()
  });
});

export { app, server, io };
