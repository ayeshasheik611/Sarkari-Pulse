import mongoose from 'mongoose';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sarkari_pulse';

async function checkUsers() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected');

    // Find all users
    const users = await User.find({}).select('username email role isActive createdAt');
    
    console.log('\n📊 Current Users in Database:');
    console.log('================================');
    
    if (users.length === 0) {
      console.log('❌ No users found in database');
    } else {
      users.forEach((user, index) => {
        console.log(`${index + 1}. Username: ${user.username}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Active: ${user.isActive}`);
        console.log(`   Created: ${user.createdAt}`);
        console.log('');
      });
    }

    // Try to find the specific user
    const targetUser = await User.findByEmailOrUsername('ayeshasheik611@gmail.com');
    
    if (targetUser) {
      console.log('🎯 Target User Found:');
      console.log(`   Username: ${targetUser.username}`);
      console.log(`   Email: ${targetUser.email}`);
      console.log(`   Active: ${targetUser.isActive}`);
      console.log(`   Role: ${targetUser.role}`);
      
      // Reset password to a known value
      console.log('\n🔄 Resetting password to "password123"...');
      targetUser.password = 'password123';
      await targetUser.save();
      console.log('✅ Password reset successfully');
      
      // Test password
      const isValid = await targetUser.comparePassword('password123');
      console.log(`🔐 Password test: ${isValid ? '✅ Valid' : '❌ Invalid'}`);
      
    } else {
      console.log('❌ Target user not found');
      
      // Create the user
      console.log('\n🆕 Creating new user...');
      const newUser = new User({
        username: 'ayesha',
        email: 'ayeshasheik611@gmail.com',
        password: 'password123',
        profile: {
          firstName: 'Ayesha',
          lastName: 'Sheikh'
        }
      });
      
      await newUser.save();
      console.log('✅ User created successfully');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB disconnected');
    process.exit(0);
  }
}

checkUsers();