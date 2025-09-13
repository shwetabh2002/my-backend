const inventoryService = require('../services/inventoryService');

class InventoryController {
  // Create new inventory item
  createInventory = async (req, res) => {
    try {
      const inventoryData = req.body;
      const currentUser = req.user;

      const inventory = await inventoryService.createInventory(inventoryData, currentUser);

      res.status(201).json({
        success: true,
        message: 'Inventory item created successfully',
        data: inventory
      });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
          statusCode: error.statusCode
        });
      }
      
      console.error('Create inventory error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500
      });
    }
  };

  // Get all inventory items with pagination and filters
  getInventoryItems = async (req, res) => {
    try {
      const filters = {
        type: req.query.type,
        category: req.query.category,
        brand: req.query.brand,
        condition: req.query.condition,
        model: req.query.model,
        year: req.query.year,
        search: req.query.search,
        minPrice: req.query.minPrice,
        maxPrice: req.query.maxPrice,
        inStock: req.query.inStock === 'true' ? true : req.query.inStock === 'false' ? false : undefined
      };

      const paginationOptions = {
        page: req.query.page,
        limit: req.query.limit,
        sortBy: req.query.sortBy,
        sortOrder: req.query.sortOrder
      };

      const result = await inventoryService.getInventoryItems(filters, paginationOptions);

      res.status(200).json({
        success: true,
        message: 'Inventory items retrieved successfully',
        data: result
      });
    } catch (error) {
      console.error('Get inventory items error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500
      });
    }
  };

  // Get inventory item by ID
  getInventoryItemById = async (req, res) => {
    try {
      const { itemId } = req.params;

      const item = await inventoryService.getInventoryItemById(itemId);

      res.status(200).json({
        success: true,
        message: 'Inventory item retrieved successfully',
        data: item
      });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
          statusCode: error.statusCode
        });
      }
      
      console.error('Get inventory item error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500
      });
    }
  };

  // Update inventory item
  updateInventoryItem = async (req, res) => {
    try {
      const { itemId } = req.params;
      const updateData = req.body;
      const currentUser = req.user;

      const updatedItem = await inventoryService.updateInventoryItem(itemId, updateData, currentUser);

      res.status(200).json({
        success: true,
        message: 'Inventory item updated successfully',
        data: updatedItem
      });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
          statusCode: error.statusCode
        });
      }
      
      console.error('Update inventory item error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500
      });
    }
  };

  // Delete inventory item
  deleteInventoryItem = async (req, res) => {
    try {
      const { itemId } = req.params;
      const currentUser = req.user;

      const result = await inventoryService.deleteInventoryItem(itemId, currentUser);

      res.status(200).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
          statusCode: error.statusCode
        });
      }
      
      console.error('Delete inventory item error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500
      });
    }
  };

  // Update stock quantity
  updateStock = async (req, res) => {
    try {
      const { itemId } = req.params;
      const { quantity, operation } = req.body;
      const currentUser = req.user;

      const updatedItem = await inventoryService.updateStock(itemId, quantity, operation, currentUser);

      res.status(200).json({
        success: true,
        message: 'Stock updated successfully',
        data: updatedItem
      });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
          statusCode: error.statusCode
        });
      }
      
      console.error('Update stock error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500
      });
    }
  };

  // Get inventory statistics
  getInventoryStats = async (req, res) => {
    try {
      const currentUser = req.user;

      const stats = await inventoryService.getInventoryStats(currentUser);

      res.status(200).json({
        success: true,
        message: 'Inventory statistics retrieved successfully',
        data: stats
      });
    } catch (error) {
      console.error('Get inventory stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500
      });
    }
  };

  // Search inventory items
  searchInventory = async (req, res) => {
    try {
      const { query, limit } = req.query;

      if (!query) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required',
          statusCode: 400
        });
      }

      const items = await inventoryService.searchInventory(query, parseInt(limit) || 10);

      res.status(200).json({
        success: true,
        message: 'Search completed successfully',
        data: items
      });
    } catch (error) {
      console.error('Search inventory error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500
      });
    }
  };

  // Get low stock alerts
  getLowStockAlerts = async (req, res) => {
    try {
      const { threshold } = req.query;
      const alertThreshold = parseInt(threshold) || 10;

      const alerts = await inventoryService.getLowStockAlerts(alertThreshold);

      res.status(200).json({
        success: true,
        message: 'Low stock alerts retrieved successfully',
        data: alerts
      });
    } catch (error) {
      console.error('Get low stock alerts error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500
      });
    }
  };
  getInventorycategory = async (req, res) => {
    try {
      const { 
        category, 
        brand, 
        model, 
        year, 
        type, 
        color, 
        interiorColor,
        currencyType,
        page = 1,
        limit = 100
      } = req.query;
      
      const filters = {};
      if(category) filters.category = category;
      if(brand) filters.brand = brand;
      if(model) filters.model = model;
      if(year) filters.year = year;
      if(type) filters.type = type;
      if(color) filters.color = color;
      if(interiorColor) filters.interiorColor = interiorColor;
      
      const options = {
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 1000) // Max 1000 items per page
      };
      
      const items = await inventoryService.getInventorycategory(filters, currencyType, options);
      
      res.status(200).json({
        success: true,
        message: 'Inventory category retrieved successfully',
        data: items
      });
    } catch (error) {
      console.error('Get inventory category error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500
      });
    }
  };

  // Get inventory with comprehensive filtering
  getInventory = async (req, res) => {
    try {
      const {
        search,
        type,
        category,
        subcategory,
        brand,
        model,
        year,
        color,
        interiorColor,
        condition,
        status,
        inStock,
        minPrice,
        maxPrice,
        minQuantity,
        maxQuantity,
        createdBy,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        limit = 20
      } = req.query;

      const filters = {
        search,
        type,
        category,
        subcategory,
        brand,
        model,
        year: year ? parseInt(year) : undefined,
        color,
        condition,
        status,
        inStock: inStock === 'true' ? true : inStock === 'false' ? false : undefined,
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        minQuantity: minQuantity ? parseInt(minQuantity) : undefined,
        maxQuantity: maxQuantity ? parseInt(maxQuantity) : undefined,
        createdBy,
        sortBy,
        sortOrder
      };

      const options = {
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 100) // Max 100 items per page
      };

      const result = await inventoryService.getInventory(filters, options);

      res.status(200).json({
        success: true,
        message: 'Inventory retrieved successfully',
        data: result
      });
    } catch (error) {
      console.error('Get inventory error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500
      });
    }
  };
}

module.exports = new InventoryController();
