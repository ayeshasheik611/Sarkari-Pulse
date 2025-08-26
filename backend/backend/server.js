import express from 'express';
import { createServer } from 'http';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 9000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sarkari_pulse';

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Basic health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    port: PORT
  });
});

// Basic API endpoint
app.get('/api', (req, res) => {
  res.json({ 
    message: 'MyScheme API Server with Authentication', 
    version: '1.0.0',
    endpoints: [
      'GET /api/health',
      'GET /api/schemes',
      'GET /api/myscheme',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/auth/profile (protected)',
      'PUT /api/auth/profile (protected)',
      'PUT /api/auth/change-password (protected)',
      'GET /api/worldbank',
      'GET /api/worldbank/economy',
      'GET /api/worldbank/gdp',
      'GET /api/worldbank/dashboard'
    ]
  });
});

// Import routes dynamically to avoid circular dependencies
async function setupRoutes() {
  try {
    // Import existing scheme routes
    const { default: schemeRoutes } = await import('./routes/schemes.js');
    app.use('/api/schemes', schemeRoutes);
    console.log('✅ Scheme routes loaded');

    // Import MyScheme routes
    const { default: myschemeRoutes } = await import('./routes/myscheme.js');
    app.use('/api/myscheme', myschemeRoutes);
    console.log('✅ MyScheme routes loaded');

    // Import Authentication routes
    const { default: authRoutes } = await import('./routes/auth.js');
    app.use('/api/auth', authRoutes);
    console.log('✅ Authentication routes loaded');

    // Import World Bank routes
    const { default: worldBankRoutes } = await import('./routes/worldBank.js');
    app.use('/api/worldbank', worldBankRoutes);
    console.log('✅ World Bank routes loaded');

    // Import and initialize WebSocket service
    const { default: websocketService } = await import('./services/websocketService.js');
    websocketService.initialize(server);
    console.log('✅ WebSocket service initialized');

    // WebSocket test endpoint
    app.get('/api/ws-test', (req, res) => {
      websocketService.broadcast('test-message', {
        message: 'Test broadcast from server',
        timestamp: new Date().toISOString()
      });
      res.json({ message: 'Test broadcast sent' });
    });

    // Import and start cron jobs
    const { startCronJobs } = await import('./cronJobs.js');
    startCronJobs();
    console.log('✅ Cron jobs started');

  } catch (error) {
    console.error('❌ Error setting up routes:', error.message);
  }
}

// Connect to MongoDB and start server
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log("✅ MongoDB connected");
    
    // Setup routes after DB connection
    await setupRoutes();
    
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 API endpoints available at http://localhost:${PORT}/api`);
      console.log(`🔌 WebSocket server available at ws://localhost:${PORT}`);
      console.log(`🌐 Dashboard available at http://localhost:${PORT}/myscheme-dashboard.html`);
      console.log(`🚀 Bulk Scraping Dashboard at http://localhost:${PORT}/bulk-scraping-dashboard.html`);
    });
  })
  .catch(err => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

export default app;
