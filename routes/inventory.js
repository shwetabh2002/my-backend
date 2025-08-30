const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { authenticate } = require('../middlewares/auth');
const { 
  isAdmin, 
  isEmployeeOrAdmin, 
  canAccessResource 
} = require('../middlewares/authorization');
const { validate, schemas } = require('../middlewares/validation');

// Public routes (no authentication required)
router.get('/search', inventoryController.searchInventory);

// Protected routes (authentication required)
router.use(authenticate);

// Inventory CRUD operations (admin and employees with inventory permissions)
router.post('/',
  canAccessResource('inventory', 'create'),
  validate(schemas.createInventory),
  inventoryController.createInventory
);

router.get('/',
  canAccessResource('inventory', 'read'),
  inventoryController.getInventoryItems
);

// Get inventory requirements/categories (must come before :itemId route)
router.get('/requirements-cars',
  canAccessResource('inventory', 'read'),
  inventoryController.getInventorycategory
);

// Get inventory statistics
router.get('/stats/overview',
  canAccessResource('inventory', 'read'),
  inventoryController.getInventoryStats
);

// Get low stock alerts
router.get('/alerts/low-stock',
  canAccessResource('inventory', 'read'),
  inventoryController.getLowStockAlerts
);

router.put('/:itemId',
  canAccessResource('inventory', 'update'),
  validate(schemas.updateInventory),
  inventoryController.updateInventoryItem
);

router.delete('/:itemId',
  canAccessResource('inventory', 'delete'),
  inventoryController.deleteInventoryItem
);

// Stock management
router.patch('/:itemId/stock',
  canAccessResource('inventory', 'update'),
  validate(schemas.updateStock),
  inventoryController.updateStock
);

// Get specific inventory item by ID (must be last to avoid conflicts)
router.get('/:itemId', inventoryController.getInventoryItemById);

module.exports = router;
