const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middlewares/auth');
const { isAdmin } = require('../middlewares/authorization');
const { validate, schemas } = require('../middlewares/validation');

// Public routes
router.post('/login', validate(schemas.login), authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/forgot-password', validate(schemas.forgotPassword), authController.forgotPassword);
router.post('/reset-password', validate(schemas.resetPassword), authController.resetPassword);

// Protected routes
router.use(authenticate); // Apply authentication middleware to all routes below

router.post('/logout', authController.logout);
router.get('/profile', authController.getProfile);
router.put('/change-password', validate(schemas.changePassword), authController.changePassword);
router.get('/validate-token', authController.validateToken);
router.get('/permissions', authController.getUserPermissions);
router.post('/admin-reset-password', isAdmin, validate(schemas.adminResetPassword), authController.adminResetPassword);

module.exports = router;
