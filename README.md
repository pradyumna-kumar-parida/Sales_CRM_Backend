# CRM Sales Management System

## About the Project

This is a backend project for a CRM (Customer Relationship Management) system. It is built using Node.js, Express.js, and MongoDB.

The main purpose of this project is to manage leads, customers, deals, and sales activities in one place. Users can log in based on their roles and perform operations according to their permissions.

## Technologies Used

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT for authentication
- bcryptjs for password hashing
- dotenv for environment variables
- Helmet for security headers
- express-rate-limit for rate limiting
- Postman for API testing

## Features

- User registration and login
- Access and refresh token authentication
- Protected routes and role-based access
- User management
- Lead creation, updating, assignment, and status management
- Lead conversion into a customer and deal
- Customer management
- Deal creation and stage management
- Activities and follow-ups
- Timeline history for supported events
- Sales analytics and pipeline reports
- Search, filtering, sorting, and pagination where supported
- Input validation and error handling

## User Roles

### Admin

Can manage users, assign leads, access CRM records according to permissions, and view sales reports.

### Sales Manager

Can manage permitted team records, assign leads, manage deals, and view team performance.

### Sales Executive

Can work with assigned leads, manage permitted customer and deal records, convert eligible leads, and create activities and follow-ups.

## Project Structure

```text
crm-sales-backend/
├── src/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── app.js
│   └── seedAdmin.js
├── .env
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── README.md
└── server.js
```

## Installation and Setup

### 1. Install dependencies

Make sure Node.js, npm, and MongoDB are installed.

Open a terminal in the project folder and run:

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file in the root directory using `.env.example` as a reference.

Add the required port, MongoDB connection string, and JWT secrets.

Do not upload your actual `.env` file to GitHub.

### 3. Start MongoDB

Make sure MongoDB is running and the connection string in `.env` is correct.

This project uses a MongoDB replica-set connection for the local database configuration. A replica set is required for database transactions.

### 4. Start the server

Run the development command:

```bash
npm run dev
```

Check `package.json` if your start script has a different name.

The API runs at:

```text
http://localhost:4000
```

To check whether the server is running, open this URL in your browser:

```text
http://localhost:4000/
```

## Environment Variables

The `.env.example` file contains the environment variable names required by the project.

Example:

```env
PORT=4000
MONGODB_URI=your_mongodb_connection_string
JWT_ACCESS_SECRET=your_access_token_secret
JWT_REFRESH_SECRET=your_refresh_token_secret
```

Use strong, separate secrets for access and refresh tokens.

## Authentication

The application uses JWT access and refresh tokens.

1. Register a user or log in.
2. Copy the access token from the response.
3. For protected APIs, select **Bearer Token** in Postman and paste the access token.
4. Use the refresh-token endpoint when required.
5. Use the logout endpoint to log out.

Example authorization header:

```http
Authorization: Bearer YOUR_ACCESS_TOKEN
```

Passwords are hashed before being saved in the database.

## API Endpoints

Base URL: `http://localhost:4000`

| Module         | Endpoint          | Purpose                                             |
| -------------- | ----------------- | --------------------------------------------------- |
| Authentication | `/api/auth`       | Register, login, logout, profile, and token refresh |
| Users          | `/api/users`      | Manage users                                        |
| Leads          | `/api/leads`      | Manage leads and assignments                        |
| Customers      | `/api/customers`  | Manage customers                                    |
| Deals          | `/api/deals`      | Manage deals and deal stages                        |
| Activities     | `/api/activities` | Manage activities and follow-ups                    |
| Timeline       | `/api/timeline`   | View timeline events                                |
| Analytics      | `/api/analytics`  | View sales statistics and reports                   |

These are the base paths. Check the route files for the exact methods and individual endpoints.

## Important Business Rules

- Only authenticated and authorized users can access protected APIs.
- Users can perform actions according to their roles and record permissions.
- Lead assignment is restricted to authorized users.
- Only eligible qualified leads should be converted.
- A lead should not be converted more than once.
- Customers and deals should retain their relationship with the original lead.
- Deal value must be greater than zero.
- Deal probability must be between 0 and 100.
- A lost deal must have a reason.
- Closed deals should not be moved back to active stages through normal stage updates.
- Activity overdue status is determined by its due date and completion status.

## Database Design

The project uses Mongoose models to define the structure and validation of database records.

The main collections are:

- Users
- Leads
- Customers
- Deals
- Activities
- Timeline

References connect related records. For example, a customer can reference its original lead, and a deal can reference both a lead and a customer.

Timestamps are used to track record creation and updates. Indexes are defined on selected fields to support common queries and filtering.

## Testing

The APIs were tested using Postman.

To test the application:

1. Start the backend server.
2. Log in and copy the access token.
3. Add the token to protected requests.
4. Test the APIs for each module.
5. Check validation errors and role-based access using different user accounts.
6. Test lead conversion, deal stage changes, activity completion, timeline records, and analytics.

## Assumptions

- This is a backend-only project; no frontend is included.
- MongoDB is used to store application data.
- API access depends on the user's role and permissions.
- Dates should be sent in a valid format, preferably ISO 8601.
- Search, filtering, sorting, and pagination are available on the endpoints where implemented.

## API Documentation

A Postman collection can be included with the project to demonstrate the available endpoints, request bodies, authentication, and responses.

**Postman collection:** [CRM Sales API Collection](CRM_SALES_APIS.postman_collection.json)

For the detailed collection structure, field definitions, relationships, and indexes, see [DATABASE_DESIGN.md](DATABASE_DESIGN.md).

## Deployed API: https://sales-crm-backend-2ew2.onrender.com

## Sample API Requests and Responses

### 1. User Login

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "admin@gmail.com",
  "password": "<your_password>"
}
```

**Successful Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "<access_token>",
    "refreshToken": "<refresh_token>",
    "user": {
      "id": "<user_id>",
      "name": "CRM Admin",
      "email": "admin@gmail.com",
      "role": "Admin"
    }
  }
}
```

**Response Description:**
- `success`: Indicates whether the request succeeded.
- `message`: Provides the result of the login operation.
- `accessToken`: Used to access protected API endpoints.
- `refreshToken`: Used to obtain a new access token according to the refresh-token flow.
- `user`: Contains the authenticated user's basic information and role.

**Authentication:** For protected endpoints, send the access token in the request header:

```http
Authorization: Bearer <access_token>
```

