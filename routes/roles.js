const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const { authenticate } = require('../middlewares/auth');
const { isAdmin } = require('../middlewares/authorization');
const { validate, schemas } = require('../middlewares/validation');

// Apply authentication middleware to all routes
router.use(authenticate);

// Admin only routes
router.post('/', 
  isAdmin, 
  validate(schemas.createRole), 
  roleController.createRole
);

router.put('/:id', 
  isAdmin, 
  validate(schemas.updateRole), 
  roleController.updateRole
);

router.delete('/:id', 
  isAdmin, 
  roleController.deleteRole
);

router.put('/:id/permissions', 
  isAdmin, 
  roleController.assignPermissions
);

router.get('/stats', 
  isAdmin, 
  roleController.getRoleStats
);

router.post('/bulk-create', 
  isAdmin, 
  roleController.bulkCreateRoles
);

// Public routes (for authenticated users)
router.get('/', roleController.getRoles);
router.get('/search', roleController.searchRoles);
router.get('/with-user-count', roleController.getRolesWithUserCount);
router.get('/:id', roleController.getRoleById);
router.get('/name/:name', roleController.getRoleByName);
router.get('/:id/permissions', roleController.getRolePermissions);
router.get('/:id/check-permission', roleController.checkRolePermission);

module.exports = router;
