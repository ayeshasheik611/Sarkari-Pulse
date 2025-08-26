import mongoose from 'mongoose';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sarkari_pulse';
const JWT_SECRET = process.env.JWT_SECRET;

async function testAuth() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected');
    
    console.log('🔍 Environment Variables:');
    console.log(`   JWT_SECRET: ${JWT_SECRET ? '✅ Set' : '❌ Missing'}`);
    console.log(`   JWT_SECRET length: ${JWT_SECRET ? JWT_SECRET.length : 0}`);
    
    // Find the user
    const user = await User.findByEmailOrUsername('ayeshasheik611@gmail.com');
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('\n👤 User found:');
    console.log(`   Username: ${user.username}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Active: ${user.isActive}`);
    
    // Test password
    const isPasswordValid = await user.comparePassword('password123');
    console.log(`\n🔐 Password test: ${isPasswordValid ? '✅ Valid' : '❌ Invalid'}`);
    
    if (isPasswordValid && JWT_SECRET) {
      // Generate token
      const token = jwt.sign(
        { userId: user._id },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      console.log('\n🎫 JWT Token generated successfully:');
      console.log(`   Token: ${token.substring(0, 50)}...`);
      
      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log(`   Decoded userId: ${decoded.userId}`);
      console.log('✅ Authentication test successful!');
      
      // Create login response
      const loginResponse = {
        success: true,
        message: 'Login successful',
        data: {
          user: user.getPublicProfile(),
          token
        }
      };
      
      console.log('\n📋 Login Response:');
      console.log(JSON.stringify(loginResponse, null, 2));
      
    } else {
      console.log('❌ Authentication test failed');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB disconnected');
    process.exit(0);
  }
}

testAuth();