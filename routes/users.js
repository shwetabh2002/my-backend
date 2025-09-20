const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middlewares/auth');
const { 
  isAdmin, 
  isEmployeeOrAdmin, 
  canAccessResource, 
  canAccessOwnResource 
} = require('../middlewares/authorization');
const { validate, schemas } = require('../middlewares/validation');

// Apply authentication middleware to all routes
router.use(authenticate);

// Admin only routes
router.post('/', 
  isAdmin, 
  validate(schemas.createUser), 
  userController.createUser
);

router.put('/:id', 
  isAdmin, 
  validate(schemas.updateUser), 
  userController.updateUser
);

router.delete('/:id', 
  isAdmin, 
  userController.deleteUser
);

router.put('/:id/status', 
  isAdmin, 
  userController.updateUserStatus
);

router.get('/stats', 
  isAdmin, 
  userController.getUserStats
);

router.post('/bulk-update', 
  isAdmin, 
  userController.bulkUpdateUsers
);

// Employee and Admin routes
router.get('/', 
  isEmployeeOrAdmin, 
  userController.getUsers
);

router.get('/search', 
  isEmployeeOrAdmin, 
  userController.searchUsers
);

router.get('/by-role/:roleName', 
  isEmployeeOrAdmin, 
  userController.getUsersByRole
);

router.post('/customer', 
  validate(schemas.createCustomer), 
  userController.createCustomer
);

router.get('/get-customer', 
  isEmployeeOrAdmin, 
  userController.getCustomers
);

router.get('/get-customer/:id', 
  isEmployeeOrAdmin, 
  userController.getCustomerById
);

// Supplier routes
router.post('/supplier', 
  validate(schemas.createSupplier), 
  userController.createSupplier
);

router.get('/supplier', 
  isEmployeeOrAdmin, 
  userController.getSuppliers
);

router.get('/supplier/:id', 
  isEmployeeOrAdmin, 
  userController.getSupplierById
);

router.put('/supplier/:id', 
  isAdmin, 
  validate(schemas.updateSupplier), 
  userController.updateSupplier
);

router.delete('/supplier/:id', 
  isAdmin, 
  userController.deleteSupplier
);

// Routes with resource-specific access control
router.get('/:id', 
  canAccessOwnResource('user', 'read'), 
  userController.getUserById
);



module.exports = router;
