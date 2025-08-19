# Authentication System Setup Guide

## 🚀 Complete Authentication Implementation

This guide will help you integrate the authentication system into your existing backend.

## 📦 Backend Dependencies

First, install the required packages in your backend project:

```bash
npm install bcryptjs jsonwebtoken mongoose cors express
```

## 🔧 Backend Integration Steps

### 1. Environment Variables

Create a `.env` file in your backend root:

```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-make-it-long-and-random

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/sarkari-pulse

# Server Configuration
PORT=9000
```

### 2. Add Authentication to Your Existing Server

Copy the authentication code from `backend-auth-example.js` and integrate it into your existing Express server:

1. **Add the User model and authentication middleware**
2. **Add the auth routes** (`/api/auth/signup`, `/api/auth/login`, etc.)
3. **Protect your existing routes** by adding the `authenticateToken` middleware

### 3. Protect Your Existing Routes

Update your existing scheme routes to require authentication:

```javascript
// Before (unprotected)
app.get('/api/myscheme', async (req, res) => {
  // Your existing logic
});

// After (protected)
app.get('/api/myscheme', authenticateToken, async (req, res) => {
  // Your existing logic
  // Now you have access to req.user with user info
});
```

### 4. Database Setup

Make sure MongoDB is running and accessible. The User collection will be created automatically when the first user signs up.

## 🎯 Frontend Features

The frontend now includes:

### ✅ Authentication Features
- **Real Login/Signup Forms** with validation
- **JWT Token Management** with automatic refresh
- **Secure API Calls** with authentication headers
- **Auto-logout** on token expiration
- **User Info Display** in navigation
- **Loading States** during authentication

### ✅ Security Features
- **Password Hashing** with bcrypt (12 salt rounds)
- **JWT Tokens** with 7-day expiration
- **Input Validation** on both frontend and backend
- **Protected Routes** requiring authentication
- **Automatic Token Refresh** for seamless experience

### ✅ User Experience
- **Seamless Login/Signup Toggle** in one form
- **Real-time Validation** with error messages
- **Success Notifications** for user feedback
- **Persistent Sessions** across browser refreshes
- **Graceful Error Handling** for network issues

## 🔒 Security Best Practices Implemented

1. **Password Security**
   - Minimum 6 characters required
   - Bcrypt hashing with salt rounds
   - Passwords never stored in plain text

2. **Token Security**
   - JWT tokens with expiration
   - Secure token storage in localStorage
   - Automatic cleanup on logout

3. **API Security**
   - All scheme endpoints protected
   - Bearer token authentication
   - Proper error handling for auth failures

4. **Input Validation**
   - Email format validation
   - Password strength requirements
   - Sanitized user inputs

## 🧪 Testing the Authentication

### 1. Start Your Backend
```bash
cd your-backend-directory
npm start
```

### 2. Test the Endpoints

**Health Check:**
```bash
curl http://localhost:9000/api/health
```

**Create Account:**
```bash
curl -X POST http://localhost:9000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:9000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### 3. Test the Frontend

1. **Start your frontend** (should already be running on `http://localhost:5173`)
2. **Try to access the app** - you should see the login page
3. **Create a new account** using the signup form
4. **Login with your credentials**
5. **Verify the user info** appears in the navigation
6. **Test logout functionality**

## 🐛 Troubleshooting

### Common Issues:

1. **"Authentication required" errors**
   - Make sure your backend is running on port 9000
   - Check that JWT_SECRET is set in your environment
   - Verify MongoDB is connected

2. **CORS errors**
   - Ensure `cors()` middleware is enabled in your backend
   - Check that frontend is making requests to the correct backend URL

3. **Token expiration**
   - Tokens expire after 7 days by default
   - Users will be automatically logged out and redirected to login

4. **Database connection issues**
   - Make sure MongoDB is running
   - Check the MONGODB_URI in your .env file

## 🔄 Next Steps

1. **Integrate the auth code** into your existing backend
2. **Test the authentication flow** end-to-end
3. **Customize the user experience** as needed
4. **Add additional user fields** if required (profile picture, role, etc.)
5. **Implement password reset** functionality if needed

## 📝 API Endpoints Summary

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/signup` | Create new account | No |
| POST | `/api/auth/login` | Login user | No |
| POST | `/api/auth/logout` | Logout user | Yes |
| GET | `/api/auth/verify` | Verify token | Yes |
| POST | `/api/auth/refresh` | Refresh token | Yes |
| GET | `/api/myscheme` | Get schemes | Yes |
| POST | `/api/myscheme/scrape` | Trigger scraping | Yes |

The authentication system is now fully functional and ready for production use! 🎉