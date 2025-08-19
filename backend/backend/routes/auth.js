import express from 'express';
import {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  logout,
  getAllUsers,
  updateUserRole,
  toggleUserStatus
} from '../controllers/authController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes (require authentication)
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);
router.put('/change-password', authenticateToken, changePassword);
router.post('/logout', authenticateToken, logout);

// Admin routes
router.get('/users', authenticateToken, requireAdmin, getAllUsers);
router.put('/users/:userId/role', authenticateToken, requireAdmin, updateUserRole);
router.put('/users/:userId/toggle-status', authenticateToken, requireAdmin, toggleUserStatus);

export default router;