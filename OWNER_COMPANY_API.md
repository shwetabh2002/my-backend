# Owner Company API Documentation

## Overview
This API manages **your company's details** - the company that sells products to customers. This is different from managing multiple companies; it's specifically for your business information that will be used in invoices, quotations, and other business documents.

## Base URL
```
http://localhost:3001/companies/owner
```

## Authentication
All endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## API Endpoints

### 1. Get Your Company Details
**GET** `/companies/owner/company`

Retrieves your company's complete information.

**Response:**
```json
{
  "success": true,
  "message": "Owner company retrieved successfully",
  "data": {
    "_id": "64f8b2c1a1b2c3d4e5f67890",
    "name": "Your Business Name",
    "legalName": "Your Business Name Inc.",
    "companyCode": "COMP-000001",
    "industry": "Technology",
    "businessType": "Corporation",
    "email": "info@yourbusiness.com",
    "phone": "+1-555-0000",
    "address": {
      "street": "123 Your Business Street",
      "city": "Your City",
      "state": "Your State",
      "postalCode": "12345",
      "country": "United States"
    },
    "contacts": [
      {
        "name": "Your Name",
        "email": "your.email@yourbusiness.com",
        "phone": "+1-555-0000",
        "position": "CEO/Owner",
        "isPrimary": true
      }
    ],
    "isOwner": true,
    "createdAt": "2023-09-06T10:30:00.000Z"
  }
}
```

### 2. Get Company Details for Documents
**GET** `/companies/owner/company/documents`

Retrieves simplified company details optimized for use in invoices, quotations, and other business documents.

**Response:**
```json
{
  "success": true,
  "message": "Company details retrieved successfully",
  "data": {
    "name": "Your Business Name",
    "legalName": "Your Business Name Inc.",
    "companyCode": "COMP-000001",
    "email": "info@yourbusiness.com",
    "phone": "+1-555-0000",
    "fax": "+1-555-0001",
    "website": "https://www.yourbusiness.com",
    "address": {
      "street": "123 Your Business Street",
      "city": "Your City",
      "state": "Your State",
      "postalCode": "12345",
      "country": "United States"
    },
    "billingAddress": {
      "street": "123 Your Business Street",
      "city": "Your City",
      "state": "Your State",
      "postalCode": "12345",
      "country": "United States"
    },
    "taxId": "12-3456789",
    "registrationNumber": "YB123456",
    "currency": "USD",
    "paymentTerms": "Due on Receipt",
    "socialMedia": {
      "linkedin": "https://linkedin.com/company/yourbusiness",
      "twitter": "https://twitter.com/yourbusiness",
      "facebook": "https://facebook.com/yourbusiness"
    }
  }
}
```

### 3. Set Owner Company
**PATCH** `/companies/owner/company/:id`

Sets a specific company as your owner company (Admin only).

**Response:**
```json
{
  "success": true,
  "message": "Owner company set successfully",
  "data": {
    "_id": "64f8b2c1a1b2c3d4e5f67890",
    "name": "Your Business Name",
    "isOwner": true,
    "updatedAt": "2023-09-06T11:00:00.000Z"
  }
}
```

## Setup Instructions

### 1. Create Your Owner Company
```bash
# First, create your company with your actual business details
npm run seed:owner-company
```

### 2. Update Company Details
Edit `scripts/seedOwnerCompany.js` and update with your actual business information:
- Company name and legal name
- Industry and business type
- Contact information (email, phone, address)
- Tax ID and registration number
- Website and social media links
- Any other relevant details

### 3. Re-run the Script
```bash
npm run seed:owner-company
```

## Usage Examples

### cURL Examples

#### Get Your Company Details
```bash
curl -X GET http://localhost:3001/companies/owner/company \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Get Company Details for Documents
```bash
curl -X GET http://localhost:3001/companies/owner/company/documents \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Set Owner Company (Admin only)
```bash
curl -X PATCH http://localhost:3001/companies/owner/company/COMPANY_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Integration with Other APIs

### Use in Invoices
```javascript
// Get company details for invoice header
const companyResponse = await fetch('/companies/owner/company/documents', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const companyData = await companyResponse.json();

// Use in invoice template
const invoiceData = {
  company: companyData.data,
  customer: customerData,
  items: invoiceItems,
  // ... other invoice data
};
```

### Use in Quotations
```javascript
// Get company details for quotation header
const companyResponse = await fetch('/companies/owner/company/documents', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const companyData = await companyResponse.json();

// Use in quotation template
const quotationData = {
  company: companyData.data,
  customer: customerData,
  products: quotationItems,
  // ... other quotation data
};
```

## Key Features

- **Single Owner Company**: Only one company can be marked as the owner
- **Document-Ready Data**: Optimized data structure for business documents
- **Complete Business Information**: All necessary details for invoices, quotations, etc.
- **Easy Integration**: Simple API calls to get your company details
- **Admin Control**: Only admins can change which company is the owner

## Data Fields Available

### For Business Documents
- `name`: Your company name
- `legalName`: Legal business name
- `companyCode`: Unique company identifier
- `email`: Business email
- `phone`: Business phone
- `fax`: Business fax (optional)
- `website`: Company website
- `address`: Business address
- `billingAddress`: Billing address
- `taxId`: Tax identification number
- `registrationNumber`: Business registration number
- `currency`: Default currency
- `paymentTerms`: Your payment terms
- `socialMedia`: Social media links

This API is designed to make it easy to retrieve your company's information for use in any business documents or applications you build! 🏢
