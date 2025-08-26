import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 9000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sarkari_pulse';
const JWT_SECRET = process.env.JWT_SECRET;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    port: PORT,
    jwt_secret: JWT_SECRET ? 'Set' : 'Missing'
  });
});

// Simple login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('🔐 Login attempt:', req.body);
    
    const { identifier, password } = req.body;
    
    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email/username and password are required'
      });
    }

    // Find user
    const user = await User.findOne({
      $or: [
        { email: identifier },
        { username: identifier }
      ]
    });

    if (!user) {
      console.log('❌ User not found:', identifier);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    console.log('🔐 Password valid:', isPasswordValid);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate token
    if (!JWT_SECRET) {
      console.error('❌ JWT_SECRET not found');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error'
      });
    }

    const token = jwt.sign(
      { userId: user._id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ Login successful for:', user.email);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          isActive: user.isActive
        },
        token
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
});

// World Bank API test
app.get('/api/worldbank', (req, res) => {
  res.json({
    success: true,
    message: 'World Bank API is working',
    endpoints: [
      '/api/worldbank/economy',
      '/api/worldbank/gdp',
      '/api/worldbank/dashboard'
    ]
  });
});

// Start server
async function startServer() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected');
    
    console.log('🔍 Environment check:');
    console.log(`   PORT: ${PORT}`);
    console.log(`   JWT_SECRET: ${JWT_SECRET ? 'Set (' + JWT_SECRET.length + ' chars)' : 'Missing'}`);
    console.log(`   MONGODB_URI: ${MONGODB_URI ? 'Set' : 'Missing'}`);
    
    app.listen(PORT, () => {
      console.log(`🚀 Simple server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🔐 Login endpoint: http://localhost:${PORT}/api/auth/login`);
      console.log(`🌍 World Bank API: http://localhost:${PORT}/api/worldbank`);
      console.log('');
      console.log('✅ Server is ready for frontend connections!');
    });
    
  } catch (error) {
    console.error('❌ Server startup error:', error);
    process.exit(1);
  }
}

startServer();