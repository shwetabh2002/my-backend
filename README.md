# Express.js RBAC Backend

A production-ready Express.js backend with Role-Based Access Control (RBAC) authentication system, built with MongoDB, Mongoose, and JWT.

## Features

- 🔐 **JWT Authentication** - Secure login for employees and admins
- 🛡️ **Role-Based Access Control** - Granular permissions system
- 👥 **User Management** - Full CRUD operations with role assignment
- 🎭 **Role Management** - Create, update, and manage roles and permissions
- ✅ **Request Validation** - Joi-based validation middleware
- 📄 **Pagination** - Built-in pagination for list APIs
- 🚀 **Production Ready** - Error handling, rate limiting, security headers
- 🔄 **Token Refresh** - Automatic token refresh mechanism

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Joi
- **Security**: bcryptjs, helmet, cors
- **Rate Limiting**: express-rate-limit

## Project Structure

```
├── config/          # Database and environment configuration
├── controllers/     # Request/response handlers
├── middlewares/     # Authentication, authorization, validation
├── models/          # Mongoose schemas
├── routes/          # API route definitions
├── scripts/         # Database seeding and utilities
├── services/        # Business logic and database operations
├── utils/           # Helper functions (JWT, pagination)
├── server.js        # Main application entry point
├── package.json     # Dependencies and scripts
└── README.md        # This file
```

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd express-rbac-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   PORT=3000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/rbac_backend
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_EXPIRES_IN=24h
   JWT_REFRESH_EXPIRES_IN=7d
   ```

4. **Database Setup**
   - Ensure MongoDB is running
   - Create database (or it will be created automatically)

5. **Seed Database** (Optional)
   ```bash
   npm run seed
   ```

6. **Start the server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## API Endpoints

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/login` | Login for employees/admins | No |
| POST | `/auth/refresh-token` | Refresh access token | No |
| POST | `/auth/logout` | Logout user | Yes |
| GET | `/auth/profile` | Get user profile | Yes |
| PUT | `/auth/change-password` | Change password | Yes |
| GET | `/auth/validate-token` | Validate token | Yes |

### Users

| Method | Endpoint | Description | Auth Required | Role Required |
|--------|----------|-------------|---------------|---------------|
| POST | `/users` | Create user | Yes | Admin |
| GET | `/users` | List users (paginated) | Yes | Employee/Admin |
| GET | `/users/:id` | Get user details | Yes | Self/Admin |
| PUT | `/users/:id` | Update user | Yes | Admin |
| DELETE | `/users/:id` | Delete user | Yes | Admin |
| GET | `/users/stats` | User statistics | Yes | Admin |
| GET | `/users/search` | Search users | Yes | Employee/Admin |
| GET | `/users/by-role/:roleName` | Users by role | Yes | Employee/Admin |

### Roles

| Method | Endpoint | Description | Auth Required | Role Required |
|--------|----------|-------------|---------------|---------------|
| POST | `/roles` | Create role | Yes | Admin |
| GET | `/roles` | List roles (paginated) | Yes | Any |
| GET | `/roles/:id` | Get role details | Yes | Any |
| PUT | `/roles/:id` | Update role | Yes | Admin |
| DELETE | `/roles/:id` | Delete role | Yes | Admin |
| GET | `/roles/stats` | Role statistics | Yes | Admin |
| GET | `/roles/search` | Search roles | Yes | Any |
| GET | `/roles/with-user-count` | Roles with user count | Yes | Any |

## User Types & Permissions

### Admin
- Full system access
- Can manage all users and roles
- All CRUD operations

### Employee
- Limited access
- Can view users (basic info only)
- Cannot modify data

### Customer
- No login capability
- Read-only access to public resources
- Cannot access protected endpoints

## Default Credentials

After running the seed script:

- **Admin**: `admin@example.com` / `admin123`
- **Employee**: `john.employee@example.com` / `employee123`
- **Customer**: `jane.customer@example.com` / `customer123`

## Usage Examples

### Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }'
```

### Create User (Admin only)
```bash
curl -X POST http://localhost:3000/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New User",
    "email": "newuser@example.com",
    "password": "password123",
    "type": "employee",
    "roleIds": ["ROLE_ID_HERE"]
  }'
```

### Get Users with Pagination
```bash
curl -X GET "http://localhost:3000/users?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment | development |
| `MONGODB_URI` | MongoDB connection string | - |
| `JWT_SECRET` | JWT signing secret | - |
| `JWT_EXPIRES_IN` | Access token expiry | 24h |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry | 7d |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | 900000 (15min) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | 100 |

## Security Features

- **Password Hashing**: bcryptjs with salt rounds
- **JWT Tokens**: Secure token-based authentication
- **Rate Limiting**: Prevent abuse and DDoS attacks
- **Security Headers**: Helmet.js for security headers
- **CORS**: Configurable cross-origin resource sharing
- **Input Validation**: Joi schema validation
- **Error Handling**: Centralized error handling without exposing internals

## Development

### Scripts
```bash
npm run dev          # Start development server with nodemon
npm start           # Start production server
npm run seed        # Seed database with initial data
npm test            # Run tests (when implemented)
```

### Code Style
- ES6+ syntax
- Async/await for asynchronous operations
- Consistent error handling
- Middleware-based architecture
- Service layer for business logic

## Production Deployment

1. **Set environment variables**
   - Use strong JWT secrets
   - Configure production MongoDB URI
   - Set NODE_ENV=production

2. **Security considerations**
   - Use HTTPS in production
   - Configure proper CORS settings
   - Set appropriate rate limits
   - Monitor logs and errors

3. **Performance optimization**
   - Enable MongoDB indexes
   - Use connection pooling
   - Implement caching if needed

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions, please create an issue in the repository.
