# Company Management API Documentation

## Overview
The Company Management API provides comprehensive CRUD operations for managing company information, contacts, and business relationships. This system follows industry-level coding conventions with proper validation, authorization, and error handling.

## Base URL
```
http://localhost:3001/companies
```

## Authentication
All endpoints (except search) require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Authorization
- **Admin**: Full access to all company operations
- **Employee**: Read and update access to companies
- **Customer**: No access to company management

## API Endpoints

### 1. Create Company
**POST** `/companies`

Creates a new company with comprehensive business information.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "TechCorp Solutions",
  "legalName": "TechCorp Solutions Inc.",
  "industry": "Technology",
  "businessType": "Corporation",
  "description": "Leading provider of enterprise software solutions",
  "taxId": "12-3456789",
  "registrationNumber": "TC001234",
  "incorporationDate": "2015-03-15T00:00:00.000Z",
  "website": "https://www.techcorp.com",
  "email": "info@techcorp.com",
  "phone": "+1-555-0100",
  "fax": "+1-555-0101",
  "address": {
    "street": "123 Technology Drive",
    "city": "San Francisco",
    "state": "California",
    "postalCode": "94105",
    "country": "United States"
  },
  "billingAddress": {
    "street": "123 Technology Drive",
    "city": "San Francisco",
    "state": "California",
    "postalCode": "94105",
    "country": "United States"
  },
  "contacts": [
    {
      "name": "John Smith",
      "email": "john.smith@techcorp.com",
      "phone": "+1-555-0102",
      "position": "CEO",
      "isPrimary": true
    }
  ],
  "annualRevenue": 50000000,
  "currency": "USD",
  "creditLimit": 1000000,
  "paymentTerms": "Net 30",
  "status": "active",
  "priority": "high",
  "customerTier": "platinum",
  "socialMedia": {
    "linkedin": "https://linkedin.com/company/techcorp",
    "twitter": "https://twitter.com/techcorp"
  },
  "tags": ["enterprise", "software", "cloud"],
  "categories": ["Technology", "Software"],
  "notes": "Major client with high growth potential"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Company created successfully",
  "data": {
    "_id": "64f8b2c1a1b2c3d4e5f67890",
    "name": "TechCorp Solutions",
    "legalName": "TechCorp Solutions Inc.",
    "companyCode": "COMP-000001",
    "industry": "Technology",
    "businessType": "Corporation",
    "status": "active",
    "priority": "high",
    "customerTier": "platinum",
    "createdAt": "2023-09-06T10:30:00.000Z",
    "updatedAt": "2023-09-06T10:30:00.000Z"
  }
}
```

### 2. Get All Companies
**GET** `/companies`

Retrieves companies with filtering, sorting, and pagination.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10, max: 100)
- `sort` (string): Sort field (default: '-createdAt')
- `search` (string): Search term
- `status` (string): Filter by status (active, inactive, suspended, pending, archived)
- `industry` (string): Filter by industry
- `businessType` (string): Filter by business type
- `priority` (string): Filter by priority (low, medium, high, critical)
- `customerTier` (string): Filter by customer tier (bronze, silver, gold, platinum, enterprise)
- `createdBy` (string): Filter by creator ID
- `dateFrom` (string): Filter by creation date from (ISO date)
- `dateTo` (string): Filter by creation date to (ISO date)

**Example:**
```
GET /companies?page=1&limit=20&status=active&industry=Technology&priority=high
```

**Response:**
```json
{
  "success": true,
  "message": "Companies retrieved successfully",
  "data": [
    {
      "_id": "64f8b2c1a1b2c3d4e5f67890",
      "name": "TechCorp Solutions",
      "legalName": "TechCorp Solutions Inc.",
      "companyCode": "COMP-000001",
      "industry": "Technology",
      "status": "active",
      "priority": "high",
      "customerTier": "platinum",
      "createdBy": {
        "_id": "64f8b2c1a1b2c3d4e5f67891",
        "name": "System Administrator",
        "email": "admin@example.com"
      },
      "createdAt": "2023-09-06T10:30:00.000Z"
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

### 3. Get Company by ID
**GET** `/companies/:id`

Retrieves a specific company by its ID.

**Response:**
```json
{
  "success": true,
  "message": "Company retrieved successfully",
  "data": {
    "_id": "64f8b2c1a1b2c3d4e5f67890",
    "name": "TechCorp Solutions",
    "legalName": "TechCorp Solutions Inc.",
    "companyCode": "COMP-000001",
    "industry": "Technology",
    "businessType": "Corporation",
    "description": "Leading provider of enterprise software solutions",
    "email": "info@techcorp.com",
    "phone": "+1-555-0100",
    "address": {
      "street": "123 Technology Drive",
      "city": "San Francisco",
      "state": "California",
      "postalCode": "94105",
      "country": "United States"
    },
    "contacts": [
      {
        "_id": "64f8b2c1a1b2c3d4e5f67892",
        "name": "John Smith",
        "email": "john.smith@techcorp.com",
        "phone": "+1-555-0102",
        "position": "CEO",
        "isPrimary": true
      }
    ],
    "annualRevenue": 50000000,
    "currency": "USD",
    "creditLimit": 1000000,
    "paymentTerms": "Net 30",
    "status": "active",
    "priority": "high",
    "customerTier": "platinum",
    "tags": ["enterprise", "software", "cloud"],
    "categories": ["Technology", "Software"],
    "createdBy": {
      "_id": "64f8b2c1a1b2c3d4e5f67891",
      "name": "System Administrator",
      "email": "admin@example.com"
    },
    "createdAt": "2023-09-06T10:30:00.000Z",
    "updatedAt": "2023-09-06T10:30:00.000Z"
  }
}
```

### 4. Update Company
**PUT** `/companies/:id`

Updates an existing company. All fields are optional.

**Request Body:**
```json
{
  "name": "Updated Company Name",
  "industry": "Updated Industry",
  "status": "inactive",
  "priority": "medium",
  "customerTier": "gold",
  "notes": "Updated notes about the company"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Company updated successfully",
  "data": {
    "_id": "64f8b2c1a1b2c3d4e5f67890",
    "name": "Updated Company Name",
    "industry": "Updated Industry",
    "status": "inactive",
    "priority": "medium",
    "customerTier": "gold",
    "updatedAt": "2023-09-06T11:00:00.000Z"
  }
}
```

### 5. Delete Company
**DELETE** `/companies/:id`

Deletes a company permanently.

**Response:**
```json
{
  "success": true,
  "message": "Company deleted successfully"
}
```

### 6. Update Company Status
**PATCH** `/companies/:id/status`

Updates only the company status.

**Request Body:**
```json
{
  "status": "suspended"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Company status updated successfully",
  "data": {
    "_id": "64f8b2c1a1b2c3d4e5f67890",
    "name": "TechCorp Solutions",
    "status": "suspended",
    "updatedAt": "2023-09-06T11:00:00.000Z"
  }
}
```

### 7. Add Contact to Company
**POST** `/companies/:id/contacts`

Adds a new contact to an existing company.

**Request Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane.doe@techcorp.com",
  "phone": "+1-555-0103",
  "position": "CTO",
  "isPrimary": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Contact added successfully",
  "data": {
    "_id": "64f8b2c1a1b2c3d4e5f67890",
    "name": "TechCorp Solutions",
    "contacts": [
      {
        "_id": "64f8b2c1a1b2c3d4e5f67892",
        "name": "John Smith",
        "email": "john.smith@techcorp.com",
        "phone": "+1-555-0102",
        "position": "CEO",
        "isPrimary": true
      },
      {
        "_id": "64f8b2c1a1b2c3d4e5f67893",
        "name": "Jane Doe",
        "email": "jane.doe@techcorp.com",
        "phone": "+1-555-0103",
        "position": "CTO",
        "isPrimary": false
      }
    ]
  }
}
```

### 8. Update Contact
**PUT** `/companies/:id/contacts/:contactId`

Updates an existing contact.

**Request Body:**
```json
{
  "name": "Jane Smith",
  "position": "Chief Technology Officer",
  "isPrimary": true
}
```

### 9. Remove Contact
**DELETE** `/companies/:id/contacts/:contactId`

Removes a contact from the company.

**Response:**
```json
{
  "success": true,
  "message": "Contact removed successfully",
  "data": {
    "_id": "64f8b2c1a1b2c3d4e5f67890",
    "name": "TechCorp Solutions",
    "contacts": []
  }
}
```

### 10. Search Companies
**GET** `/companies/search`

Searches companies by name, legal name, email, or contact information.

**Query Parameters:**
- `q` (string, required): Search term
- `limit` (number): Maximum results (default: 20)

**Example:**
```
GET /companies/search?q=tech&limit=10
```

**Response:**
```json
{
  "success": true,
  "message": "Search completed successfully",
  "data": [
    {
      "_id": "64f8b2c1a1b2c3d4e5f67890",
      "name": "TechCorp Solutions",
      "legalName": "TechCorp Solutions Inc.",
      "email": "info@techcorp.com",
      "industry": "Technology"
    }
  ],
  "count": 1
}
```

### 11. Get Company Statistics
**GET** `/companies/stats`

Retrieves comprehensive company statistics.

**Response:**
```json
{
  "success": true,
  "message": "Company statistics retrieved successfully",
  "data": {
    "totalCompanies": 6,
    "activeCompanies": 5,
    "inactiveCompanies": 0,
    "suspendedCompanies": 1,
    "byIndustry": {
      "Technology": {
        "total": 2,
        "active": 2,
        "inactive": 0,
        "suspended": 0
      },
      "Automotive": {
        "total": 1,
        "active": 1,
        "inactive": 0,
        "suspended": 0
      }
    },
    "byTier": {
      "platinum": {
        "total": 1,
        "active": 1,
        "inactive": 0,
        "suspended": 0
      },
      "gold": {
        "total": 2,
        "active": 2,
        "inactive": 0,
        "suspended": 0
      }
    }
  }
}
```

### 12. Get Companies by Industry
**GET** `/companies/industry/:industry`

Retrieves all companies in a specific industry.

**Example:**
```
GET /companies/industry/Technology
```

### 13. Get Companies by Status
**GET** `/companies/status/:status`

Retrieves all companies with a specific status.

**Example:**
```
GET /companies/status/active
```

### 14. Get Company by Code
**GET** `/companies/code/:code`

Retrieves a company by its unique company code.

**Example:**
```
GET /companies/code/COMP-000001
```

### 15. Bulk Update Companies
**POST** `/companies/bulk-update`

Updates multiple companies at once (Admin only).

**Request Body:**
```json
{
  "companyIds": [
    "64f8b2c1a1b2c3d4e5f67890",
    "64f8b2c1a1b2c3d4e5f67891"
  ],
  "updateData": {
    "status": "inactive",
    "priority": "low"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "2 companies updated successfully",
  "data": {
    "modifiedCount": 2,
    "matchedCount": 2
  }
}
```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation error",
  "errors": "Company name must be at least 2 characters long"
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
  "message": "Company not found"
}
```

### 409 Conflict
```json
{
  "success": false,
  "message": "Company with this email already exists"
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

### Company Schema
```javascript
{
  name: String (required, 2-200 chars),
  legalName: String (required, 2-200 chars),
  companyCode: String (auto-generated, unique),
  industry: String (required, 2-100 chars),
  businessType: Enum (Corporation, LLC, Partnership, etc.),
  description: String (max 1000 chars),
  taxId: String (unique, max 50 chars),
  registrationNumber: String (unique, max 50 chars),
  incorporationDate: Date,
  website: String (valid URL),
  email: String (required, valid email),
  phone: String (required, 10-20 chars),
  fax: String (10-20 chars),
  address: Object (required),
  billingAddress: Object (optional),
  shippingAddress: Object (optional),
  contacts: Array of Contact objects,
  annualRevenue: Number (min 0),
  currency: String (3 chars, default USD),
  creditLimit: Number (min 0),
  paymentTerms: Enum (Net 15, Net 30, etc.),
  status: Enum (active, inactive, suspended, pending, archived),
  priority: Enum (low, medium, high, critical),
  customerTier: Enum (bronze, silver, gold, platinum, enterprise),
  socialMedia: Object (linkedin, twitter, facebook),
  tags: Array of Strings,
  categories: Array of Strings,
  notes: String (max 2000 chars),
  internalNotes: String (max 2000 chars),
  createdBy: ObjectId (User reference),
  updatedBy: ObjectId (User reference),
  lastActivityDate: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Address Schema
```javascript
{
  street: String (required, 5-200 chars),
  city: String (required, 2-100 chars),
  state: String (required, 2-100 chars),
  postalCode: String (required, 3-20 chars),
  country: String (default: United States, 2-100 chars)
}
```

### Contact Schema
```javascript
{
  name: String (required, 2-100 chars),
  email: String (required, valid email),
  phone: String (required, 10-20 chars),
  position: String (required, 2-100 chars),
  isPrimary: Boolean (default: false)
}
```

## Usage Examples

### cURL Examples

#### Create a Company
```bash
curl -X POST http://localhost:3001/companies \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Tech Company",
    "legalName": "New Tech Company Inc.",
    "industry": "Technology",
    "email": "info@newtech.com",
    "phone": "+1-555-9999",
    "address": {
      "street": "123 Innovation St",
      "city": "San Francisco",
      "state": "California",
      "postalCode": "94105",
      "country": "United States"
    }
  }'
```

#### Get All Companies
```bash
curl -X GET "http://localhost:3001/companies?page=1&limit=10&status=active" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Search Companies
```bash
curl -X GET "http://localhost:3001/companies/search?q=tech&limit=5" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Update Company
```bash
curl -X PUT http://localhost:3001/companies/COMPANY_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "inactive",
    "priority": "low"
  }'
```

## Setup and Seeding

### Seed Company Data
```bash
npm run seed:companies
```

This will create sample companies with various industries, business types, and contact information.

### Complete Setup
```bash
# Install dependencies
npm install

# Seed roles and users
npm run seed

# Seed companies
npm run seed:companies

# Start the server
npm run dev
```

## Features

### Industry-Level Coding Conventions
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
- **Auto-generated Company Codes**: Sequential company codes (COMP-000001, etc.)
- **Contact Management**: Multiple contacts per company with primary contact designation
- **Address Management**: Separate billing and shipping addresses
- **Business Intelligence**: Comprehensive statistics and reporting
- **Bulk Operations**: Efficient bulk updates for administrative tasks
- **Social Media Integration**: LinkedIn, Twitter, Facebook profile links
- **Tagging System**: Flexible categorization and tagging
- **Financial Tracking**: Revenue, credit limits, and payment terms
- **Status Management**: Multi-level status and priority systems
- **Activity Tracking**: Last activity date for engagement monitoring

This Company Management API provides a robust, scalable solution for managing business relationships and company information with enterprise-grade features and security.
