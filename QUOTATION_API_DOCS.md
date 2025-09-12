# Quotation Management API Documentation

## Overview
The Quotation Management API provides comprehensive CRUD operations for managing quotations, quotes, and proposals. This system follows industry-level coding standards with proper validation, authorization, and error handling.

## Base URL
```
http://localhost:3001/quotations
```

## Authentication
All endpoints (except search) require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Authorization
- **Admin**: Full access to all quotation operations
- **Employee**: Create, read, and update access to quotations
- **Customer**: No access to quotation management

## API Endpoints

### 1. Create Quotation
**POST** `/quotations`

Creates a new quotation with comprehensive business information.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "customer": {
    "custId": "CUS-001",
    "address": {
      "street": "123 Customer Street",
      "city": "Dubai",
      "state": "Dubai",
      "postalCode": "12345",
      "country": "United Arab Emirates"
    }
  },
  "title": "Car Parts Quotation",
  "description": "Quotation for automotive parts and accessories",
  "validTill": "2024-01-15T00:00:00.000Z",
  "status": "draft",
  "items": [
    {
      "inventoryId": "64f8b2c1a1b2c3d4e5f67890",
      "quantity": 2,
      "unitPrice": 150.00,
      "discount": 10,
      "discountType": "percentage",
      "taxRate": 5
    },
    {
      "inventoryId": "64f8b2c1a1b2c3d4e5f67891",
      "quantity": 1,
      "unitPrice": 300.00,
      "discount": 0,
      "discountType": "percentage",
      "taxRate": 5
    }
  ],
  "totalDiscount": 5,
  "discountType": "percentage",
  "taxRate": 5,
  "currency": "AED",
  "exchangeRate": 1,
  "termsAndConditions": "Payment terms: Net 30 days. Prices valid for 30 days.",
  "notes": "Special pricing for bulk order",
  "deliveryAddress": {
    "street": "456 Delivery Street",
    "city": "Dubai",
    "state": "Dubai",
    "postalCode": "54321",
    "country": "United Arab Emirates"
  },
  "paymentTerms": "Net 30"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Quotation created successfully",
  "data": {
    "_id": "64f8b2c1a1b2c3d4e5f67892",
    "quotationNumber": "QUO-2024-000001",
    "customer": {
      "userId": "64f8b2c1a1b2c3d4e5f67893",
      "custId": "CUS-001",
      "name": "John Customer",
      "email": "john@customer.com",
      "phone": "+971-50-1234567",
      "address": {
        "street": "123 Customer Street",
        "city": "Dubai",
        "state": "Dubai",
        "postalCode": "12345",
        "country": "United Arab Emirates"
      }
    },
    "title": "Car Parts Quotation",
    "description": "Quotation for automotive parts and accessories",
    "validTill": "2024-01-15T00:00:00.000Z",
    "status": "draft",
    "items": [
      {
        "_id": "64f8b2c1a1b2c3d4e5f67894",
        "inventoryId": "64f8b2c1a1b2c3d4e5f67890",
        "name": "Brake Pads",
        "description": "High-quality brake pads",
        "sku": "BP-001",
        "quantity": 2,
        "unitPrice": 150.00,
        "discount": 10,
        "discountType": "percentage",
        "taxRate": 5,
        "lineTotal": 315.00
      }
    ],
    "subtotal": 600.00,
    "totalDiscount": 30.00,
    "taxAmount": 28.50,
    "totalAmount": 598.50,
    "currency": "AED",
    "createdAt": "2024-01-01T10:30:00.000Z"
  }
}
```

### 2. Get All Quotations
**GET** `/quotations`

Retrieves quotations with filtering, sorting, and pagination.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10, max: 100)
- `sort` (string): Sort field (default: '-createdAt')
- `search` (string): Search term
- `status` (string): Filter by status (draft, sent, viewed, accepted, rejected, expired, converted)
- `customerId` (string): Filter by customer ID
- `createdBy` (string): Filter by creator ID
- `dateFrom` (string): Filter by creation date from (ISO date)
- `dateTo` (string): Filter by creation date to (ISO date)
- `validTillFrom` (string): Filter by validity date from (ISO date)
- `validTillTo` (string): Filter by validity date to (ISO date)

**Example:**
```
GET /quotations?page=1&limit=20&status=sent&customerId=CUS-001
```

**Response:**
```json
{
  "success": true,
  "message": "Quotations retrieved successfully",
  "data": [
    {
      "_id": "64f8b2c1a1b2c3d4e5f67892",
      "quotationNumber": "QUO-2024-000001",
      "customer": {
        "custId": "CUS-001",
        "name": "John Customer",
        "email": "john@customer.com"
      },
      "title": "Car Parts Quotation",
      "status": "sent",
      "totalAmount": 598.50,
      "currency": "AED",
      "validTill": "2024-01-15T00:00:00.000Z",
      "createdAt": "2024-01-01T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

### 3. Get Quotation by ID
**GET** `/quotations/:id`

Retrieves a specific quotation by its ID.

**Response:**
```json
{
  "success": true,
  "message": "Quotation retrieved successfully",
  "data": {
    "_id": "64f8b2c1a1b2c3d4e5f67892",
    "quotationNumber": "QUO-2024-000001",
    "customer": {
      "userId": "64f8b2c1a1b2c3d4e5f67893",
      "custId": "CUS-001",
      "name": "John Customer",
      "email": "john@customer.com",
      "phone": "+971-50-1234567",
      "address": {
        "street": "123 Customer Street",
        "city": "Dubai",
        "state": "Dubai",
        "postalCode": "12345",
        "country": "United Arab Emirates"
      }
    },
    "title": "Car Parts Quotation",
    "description": "Quotation for automotive parts and accessories",
    "validTill": "2024-01-15T00:00:00.000Z",
    "status": "draft",
    "items": [
      {
        "_id": "64f8b2c1a1b2c3d4e5f67894",
        "inventoryId": "64f8b2c1a1b2c3d4e5f67890",
        "name": "Brake Pads",
        "description": "High-quality brake pads",
        "sku": "BP-001",
        "quantity": 2,
        "unitPrice": 150.00,
        "discount": 10,
        "discountType": "percentage",
        "taxRate": 5,
        "lineTotal": 315.00
      }
    ],
    "subtotal": 600.00,
    "totalDiscount": 30.00,
    "taxAmount": 28.50,
    "totalAmount": 598.50,
    "currency": "AED",
    "exchangeRate": 1,
    "termsAndConditions": "Payment terms: Net 30 days. Prices valid for 30 days.",
    "notes": "Special pricing for bulk order",
    "deliveryAddress": {
      "street": "456 Delivery Street",
      "city": "Dubai",
      "state": "Dubai",
      "postalCode": "54321",
      "country": "United Arab Emirates"
    },
    "paymentTerms": "Net 30",
    "createdBy": {
      "_id": "64f8b2c1a1b2c3d4e5f67895",
      "name": "System Administrator",
      "email": "admin@example.com"
    },
    "createdAt": "2024-01-01T10:30:00.000Z",
    "updatedAt": "2024-01-01T10:30:00.000Z"
  }
}
```

### 4. Get Quotation by Number
**GET** `/quotations/number/:number`

Retrieves a quotation by its quotation number.

**Example:**
```
GET /quotations/number/QUO-2024-000001
```

### 5. Update Quotation
**PUT** `/quotations/:id`

Updates an existing quotation. All fields are optional.

**Request Body:**
```json
{
  "title": "Updated Car Parts Quotation",
  "status": "sent",
  "items": [
    {
      "inventoryId": "64f8b2c1a1b2c3d4e5f67890",
      "quantity": 3,
      "unitPrice": 140.00,
      "discount": 15,
      "discountType": "percentage",
      "taxRate": 5
    }
  ],
  "totalDiscount": 10,
  "notes": "Updated pricing with additional discount"
}
```

### 6. Delete Quotation
**DELETE** `/quotations/:id`

Deletes a quotation permanently.

**Response:**
```json
{
  "success": true,
  "message": "Quotation deleted successfully"
}
```

### 7. Update Quotation Status
**PATCH** `/quotations/:id/status`

Updates only the quotation status.

**Request Body:**
```json
{
  "status": "sent"
}
```

### 8. Mark Quotation as Sent
**PATCH** `/quotations/:id/send`

Marks a draft quotation as sent.

**Response:**
```json
{
  "success": true,
  "message": "Quotation marked as sent successfully",
  "data": {
    "_id": "64f8b2c1a1b2c3d4e5f67892",
    "status": "sent",
    "sentAt": "2024-01-01T11:00:00.000Z"
  }
}
```

### 9. Mark Quotation as Viewed
**PATCH** `/quotations/:id/view`

Marks a sent quotation as viewed (public endpoint).

**Response:**
```json
{
  "success": true,
  "message": "Quotation marked as viewed successfully",
  "data": {
    "_id": "64f8b2c1a1b2c3d4e5f67892",
    "status": "viewed",
    "viewedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

### 10. Accept Quotation
**PATCH** `/quotations/:id/accept`

Accepts a quotation (public endpoint).

**Response:**
```json
{
  "success": true,
  "message": "Quotation accepted successfully",
  "data": {
    "_id": "64f8b2c1a1b2c3d4e5f67892",
    "status": "accepted",
    "respondedAt": "2024-01-01T13:00:00.000Z"
  }
}
```

### 11. Reject Quotation
**PATCH** `/quotations/:id/reject`

Rejects a quotation (public endpoint).

**Response:**
```json
{
  "success": true,
  "message": "Quotation rejected successfully",
  "data": {
    "_id": "64f8b2c1a1b2c3d4e5f67892",
    "status": "rejected",
    "respondedAt": "2024-01-01T13:00:00.000Z"
  }
}
```

### 12. Convert Quotation
**PATCH** `/quotations/:id/convert`

Converts an accepted quotation to an order/invoice.

**Response:**
```json
{
  "success": true,
  "message": "Quotation converted successfully",
  "data": {
    "_id": "64f8b2c1a1b2c3d4e5f67892",
    "status": "converted"
  }
}
```

### 13. Duplicate Quotation
**POST** `/quotations/:id/duplicate`

Creates a duplicate of an existing quotation.

**Response:**
```json
{
  "success": true,
  "message": "Quotation duplicated successfully",
  "data": {
    "_id": "64f8b2c1a1b2c3d4e5f67896",
    "quotationNumber": "QUO-2024-000002",
    "title": "Copy of Car Parts Quotation",
    "status": "draft"
  }
}
```

### 14. Get Quotations by Customer
**GET** `/quotations/customer/:customerId`

Retrieves all quotations for a specific customer.

**Query Parameters:**
- `limit` (number): Maximum results (default: 50)

### 15. Get Quotations by Status
**GET** `/quotations/status/:status`

Retrieves all quotations with a specific status.

**Query Parameters:**
- `limit` (number): Maximum results (default: 50)

### 16. Get Expired Quotations
**GET** `/quotations/expired`

Retrieves all expired quotations.

### 17. Get Quotations Expiring Soon
**GET** `/quotations/expiring-soon`

Retrieves quotations expiring soon.

**Query Parameters:**
- `days` (number): Days ahead to check (default: 3)

### 18. Search Quotations
**GET** `/quotations/search`

Searches quotations by quotation number, title, customer name, email, or customer ID.

**Query Parameters:**
- `q` (string, required): Search term
- `limit` (number): Maximum results (default: 20)

**Example:**
```
GET /quotations/search?q=car&limit=10
```

### 19. Get Quotation Statistics
**GET** `/quotations/stats`

Retrieves comprehensive quotation statistics.

**Response:**
```json
{
  "success": true,
  "message": "Quotation statistics retrieved successfully",
  "data": {
    "totalQuotations": 25,
    "totalValue": 150000.00,
    "byStatus": {
      "draft": {
        "count": 5,
        "value": 25000.00
      },
      "sent": {
        "count": 10,
        "value": 60000.00
      },
      "accepted": {
        "count": 8,
        "value": 55000.00
      },
      "rejected": {
        "count": 2,
        "value": 10000.00
      }
    },
    "byMonth": {
      "2024-01": {
        "count": 15,
        "value": 90000.00
      },
      "2024-02": {
        "count": 10,
        "value": 60000.00
      }
    }
  }
}
```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation error",
  "errors": "Title must be at least 2 characters long"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Access denied. No token provided"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Access denied. Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Quotation not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error"
}
```

## Data Models

### Quotation Schema
```javascript
{
  quotationNumber: String (auto-generated, unique),
  customer: {
    userId: ObjectId (User reference),
    custId: String (required),
    name: String (required),
    email: String (required),
    phone: String (required),
    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String (default: United Arab Emirates)
    }
  },
  title: String (required, 2-200 chars),
  description: String (max 1000 chars),
  validTill: Date (required, default: 30 days from now),
  status: Enum (draft, sent, viewed, accepted, rejected, expired, converted),
  items: [QuotationItem],
  subtotal: Number (calculated),
  totalDiscount: Number (default: 0),
  discountType: Enum (percentage, fixed),
  taxRate: Number (0-100),
  taxAmount: Number (calculated),
  totalAmount: Number (calculated),
  currency: String (3 chars, default: AED),
  exchangeRate: Number (default: 1),
  termsAndConditions: String (max 2000 chars),
  notes: String (max 1000 chars),
  deliveryAddress: Address,
  paymentTerms: Enum (Due on Receipt, Net 15, Net 30, etc.),
  createdBy: ObjectId (User reference),
  updatedBy: ObjectId (User reference),
  sentAt: Date,
  viewedAt: Date,
  respondedAt: Date,
  expiresAt: Date (TTL index),
  createdAt: Date,
  updatedAt: Date
}
```

### QuotationItem Schema
```javascript
{
  inventoryId: ObjectId (Inventory reference, required),
  name: String (required, 2-200 chars),
  description: String (max 500 chars),
  sku: String (max 50 chars),
  quantity: Number (required, min: 1),
  unitPrice: Number (required, min: 0),
  discount: Number (default: 0, min: 0),
  discountType: Enum (percentage, fixed),
  taxRate: Number (0-100),
  lineTotal: Number (calculated)
}
```

## Usage Examples

### cURL Examples

#### Create a Quotation
```bash
curl -X POST http://localhost:3001/quotations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customer": {
      "custId": "CUS-001"
    },
    "title": "Car Parts Quotation",
    "items": [
      {
        "inventoryId": "64f8b2c1a1b2c3d4e5f67890",
        "quantity": 2,
        "unitPrice": 150.00
      }
    ],
    "currency": "AED"
  }'
```

#### Get All Quotations
```bash
curl -X GET "http://localhost:3001/quotations?page=1&limit=10&status=sent" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Mark Quotation as Sent
```bash
curl -X PATCH http://localhost:3001/quotations/QUOTATION_ID/send \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Accept Quotation (Public)
```bash
curl -X PATCH http://localhost:3001/quotations/QUOTATION_ID/accept
```

## Key Features

### Industry-Level Coding Standards
- **Comprehensive Validation**: Joi schemas with detailed error messages
- **Proper Error Handling**: Custom error classes with appropriate HTTP status codes
- **Authorization**: Role-based access control with granular permissions
- **Pagination**: Efficient data retrieval with pagination support
- **Search**: Full-text search across multiple fields
- **Audit Trail**: Created/updated by tracking and timestamps
- **Data Integrity**: Unique constraints and validation rules
- **Performance**: Indexed fields for optimal query performance
- **Scalability**: Modular architecture with separation of concerns

### Advanced Features
- **Auto-generated Quotation Numbers**: Sequential quotation numbers (QUO-2024-000001, etc.)
- **Automatic Calculations**: Subtotal, discounts, taxes, and totals
- **Status Workflow**: Draft → Sent → Viewed → Accepted/Rejected → Converted
- **Expiry Management**: TTL indexes and expiry tracking
- **Customer Integration**: Automatic customer data population
- **Inventory Integration**: Real-time inventory data and pricing
- **Currency Support**: Multi-currency with exchange rates
- **Duplicate Functionality**: Easy quotation duplication
- **Comprehensive Statistics**: Business intelligence and reporting
- **Public Endpoints**: Customer-facing acceptance/rejection

### Business Logic
- **Automatic Pricing**: Current inventory prices applied automatically
- **Discount Management**: Item-level and quotation-level discounts
- **Tax Calculations**: Configurable tax rates per item
- **Validity Tracking**: Automatic expiry management
- **Status Transitions**: Enforced workflow with proper validations
- **Customer Validation**: Ensures customer exists before quotation creation
- **Inventory Validation**: Validates inventory items and availability

This Quotation Management API provides a robust, scalable solution for managing quotations and proposals with enterprise-grade features and security! 📋
