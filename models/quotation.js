const mongoose = require('mongoose');

const quotationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  custId: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  validTill: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    required: true
  },
  items: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Inventory',
    required: true
  }],
  total: {
    type: Number,
    required: true
  },
  totalDiscount: {
    type: Number,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },

}, {
  timestamps: true,
});

module.exports = mongoose.model('Quotation', quotationSchema);