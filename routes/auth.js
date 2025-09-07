const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middlewares/auth');
const { validate, schemas } = require('../middlewares/validation');

// Public routes
router.post('/login', validate(schemas.login), authController.login);
router.post('/refresh-token', authController.refreshToken);

// Protected routes
router.use(authenticate); // Apply authentication middleware to all routes below

router.post('/logout', authController.logout);
router.get('/profile', authController.getProfile);
router.put('/change-password', authController.changePassword);
router.get('/validate-token', authController.validateToken);
router.get('/permissions', authController.getUserPermissions);

module.exports = router;
