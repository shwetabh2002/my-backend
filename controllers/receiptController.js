const receiptService = require('../services/receiptService');
const { asyncHandler } = require('../middlewares/errorHandler');

class ReceiptController {
  // Get all receipts
  getAllReceipts = asyncHandler(async (req, res) => {
    const filters = req.query;
    const result = await receiptService.getAllReceipts(filters);

    res.status(200).json({
      success: true,
      message: 'Receipts retrieved successfully',
      data: result.receipts,
      pagination: result.pagination,
      summary: result.summary,
      filters: result.filters
    });
  });

  // Get receipt by ID
  getReceiptById = asyncHandler(async (req, res) => {
    const receiptId = req.params.id;
    const receipt = await receiptService.getReceiptById(receiptId);

    res.status(200).json({
      success: true,
      message: 'Receipt retrieved successfully',
      data: receipt
    });
  });

  // Create receipt
  createReceipt = asyncHandler(async (req, res) => {
    const receiptData = req.body;
    const createdBy = req.user._id;

    const receipt = await receiptService.createReceipt(receiptData, createdBy);

    res.status(201).json({
      success: true,
      message: 'Receipt created successfully',
      data: receipt
    });
  });

  // Update receipt
  updateReceipt = asyncHandler(async (req, res) => {
    const receiptId = req.params.id;
    const updateData = req.body;
    const updatedBy = req.user._id;

    const receipt = await receiptService.updateReceipt(receiptId, updateData, updatedBy);

    res.status(200).json({
      success: true,
      message: 'Receipt updated successfully',
      data: receipt
    });
  });

  // Delete receipt
  deleteReceipt = asyncHandler(async (req, res) => {
    const receiptId = req.params.id;
    const result = await receiptService.deleteReceipt(receiptId);

    res.status(200).json({
      success: true,
      message: result.message,
      data: { receiptId: result.receiptId }
    });
  });


  // Get receipts by customer
  getReceiptsByCustomer = asyncHandler(async (req, res) => {
    const customerId = req.params.customerId;
    const filters = req.query;

    const result = await receiptService.getReceiptsByCustomer(customerId, filters);

    res.status(200).json({
      success: true,
      message: 'Customer receipts retrieved successfully',
      data: result.receipts,
      pagination: result.pagination,
      summary: result.summary
    });
  });


  // Get receipt summary
  getReceiptSummary = asyncHandler(async (req, res) => {
    const filters = req.query;
    const summary = await receiptService.getReceiptSummary(filters);

    res.status(200).json({
      success: true,
      message: 'Receipt summary retrieved successfully',
      data: summary
    });
  });
}

module.exports = new ReceiptController();
