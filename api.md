# REST API Specification

This document details all REST API endpoints for the **Logistics Consignment Management System** (Matoshree Logistics).

- **Base URL**: `http://localhost:5000/api`
- **Content-Type**: `application/json`
- **Authentication**: JWT stored in an `HttpOnly` cookie named `token`. Frontend requests must specify `credentials: 'include'`.

---

## Standard Error Response

```json
{
  "message": "Error message description",
  "stack": "Stack trace (included in development mode only)"
}
```

---

## 1. Authentication API (`/api/auth`)

### 1.1 User Login
Authenticates user credentials and issues a secure `HttpOnly` JWT cookie.

- **Endpoint**: `POST /api/auth/login`
- **Auth Required**: No
- **Request Body**:
  ```json
  {
    "email": "admin@example.com",
    "password": "password123"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "id": 1,
    "name": "Admin User",
    "email": "admin@example.com",
    "role": "admin"
  }
  ```

### 1.2 User Logout
Clears the session cookie.

- **Endpoint**: `POST /api/auth/logout`
- **Auth Required**: No
- **Response** (`200 OK`):
  ```json
  {
    "message": "Logged out successfully"
  }
  ```

### 1.3 Get Current Profile
Returns authenticated user session details.

- **Endpoint**: `GET /api/auth/profile`
- **Auth Required**: Yes
- **Response** (`200 OK`):
  ```json
  {
    "id": 1,
    "name": "Admin User",
    "email": "admin@example.com",
    "role": "admin",
    "createdAt": "2026-09-15T10:00:00.000Z"
  }
  ```

---

## 2. Customer Management API (`/api/customers`)

All endpoints in this section require authentication.

### 2.1 List Customers
- **Endpoint**: `GET /api/customers`
- **Query Parameters**:
  - `search` (string): Searches company name, contact, GST, PAN, phone, city, customer code.
  - `state` (string): Filter by state.
  - `city` (string): Filter by city.
  - `page` (integer, default: 1): Page number.
  - `limit` (integer, default: 10): Items per page.
  - `sort` (string, default: `-createdAt`): Sort order.
- **Response** (`200 OK`):
  ```json
  {
    "customers": [
      {
        "_id": 1,
        "customerCode": "CUST-0001",
        "companyName": "Acme Logistics Ltd",
        "contactPerson": "John Doe",
        "phone": "9876543210",
        "gstNumber": "27AAACA1234A1Z5",
        "city": "Pune",
        "state": "Maharashtra"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10,
    "pages": 1
  }
  ```

### 2.2 Create Customer
- **Endpoint**: `POST /api/customers`
- **Request Body**:
  ```json
  {
    "companyName": "Acme Logistics Ltd",
    "contactPerson": "John Doe",
    "phone": "9876543210",
    "email": "contact@acme.com",
    "gstNumber": "27AAACA1234A1Z5",
    "panNumber": "AAACA1234A",
    "address": "GIDC Estate, Plot 42",
    "city": "Pune",
    "state": "Maharashtra",
    "pincode": "411001"
  }
  ```
- **Response** (`201 Created`): Returns the created customer object.

### 2.3 Get Customer By ID
- **Endpoint**: `GET /api/customers/:id`
- **Response** (`200 OK`): Customer object.

### 2.4 Update Customer
- **Endpoint**: `PUT /api/customers/:id`
- **Request Body**: Any editable fields from `POST`.
- **Response** (`200 OK`): Updated customer object.

### 2.5 Delete Customer
- **Endpoint**: `DELETE /api/customers/:id`
- **Response** (`200 OK`):
  ```json
  { "message": "Customer deleted" }
  ```
- **Error Response** (`400 Bad Request`): If customer has associated consignments.

### 2.6 Get Customer Consignment History
- **Endpoint**: `GET /api/customers/:id/history`
- **Response** (`200 OK`): Array of consignments where customer is consigner or consignee.

---

## 3. Trip Dispatch API (`/api/trips`)

### 3.1 List Trips
- **Endpoint**: `GET /api/trips`
- **Query Parameters**: `search`, `status` (`To Be Gone` | `Ongoing` | `Completed`), `page`, `limit`, `sort`.
- **Response** (`200 OK`):
  ```json
  {
    "trips": [
      {
        "_id": 1,
        "tripNumber": "TRIP-0001",
        "vehicleNumber": "MH 12 AB 1234",
        "source": "Pune",
        "destination": "Mumbai",
        "status": "Ongoing",
        "departureDate": "2026-09-16T08:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10,
    "pages": 1
  }
  ```

### 3.2 Create Trip
- **Endpoint**: `POST /api/trips`
- **Request Body**:
  ```json
  {
    "vehicleNumber": "MH 12 AB 1234",
    "source": "Pune",
    "destination": "Mumbai",
    "departureDate": "2026-09-16T08:00:00.000Z",
    "expectedArrival": "2026-09-16T18:00:00.000Z",
    "status": "To Be Gone"
  }
  ```
- **Response** (`201 Created`): Created trip object with auto-generated `tripNumber`.

---

## 4. Consignment & Lorry Receipt API (`/api/consignments`)

### 4.1 List Consignments
- **Endpoint**: `GET /api/consignments`
- **Query Parameters**: `search`, `status`, `tripNumber`, `vehicleNumber`, `page`, `limit`.
- **Response** (`200 OK`): Paginated array of consignments with populated customer and trip info.

### 4.2 Create Consignment (Generate LR)
- **Endpoint**: `POST /api/consignments`
- **Request Body**:
  ```json
  {
    "consignerId": 1,
    "consigneeId": 2,
    "tripId": 1,
    "bookingDate": "2026-09-16",
    "bookingTime": "10:30 AM",
    "invoiceNumber": "INV-2026-001",
    "invoiceDate": "2026-09-15",
    "ewayBillNumber": "EWB1234567890",
    "packageType": "Box",
    "packageCount": 20,
    "actualWeight": 450.5,
    "chargeableWeight": 500.0,
    "goodsValue": 120000.0,
    "freight": 2500.0,
    "hamali": 200.0,
    "stCharges": 50.0,
    "doorDeliveryCharges": 300.0,
    "collectionCharges": 150.0,
    "insurance": 100.0,
    "otherCharges": 0.0,
    "totalAmount": 3300.0
  }
  ```
- **Response** (`201 Created`): Consignment object with auto-assigned `lrNumber`.

---

## 5. Freight Billing & Payments API (`/api/freight-bills`)

### 5.1 Preview Freight Bill Calculation
Computes tax and line items for preview prior to saving the bill.

- **Endpoint**: `POST /api/freight-bills/preview` (or `GET /api/freight-bills/preview`)
- **Request Body**:
  ```json
  {
    "customerId": 1,
    "fromDate": "2026-09-01",
    "toDate": "2026-09-16",
    "ratePerKg": 5.5,
    "cgstRate": 9,
    "sgstRate": 9,
    "igstRate": 0,
    "mode": "Road",
    "consignmentIds": [1, 2, 3]
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "customerId": 1,
    "customerSnapshot": {
      "companyName": "Acme Logistics Ltd",
      "gstNumber": "27AAACA1234A1Z5"
    },
    "taxableAmount": 15200.00,
    "cgstAmount": 1368.00,
    "sgstAmount": 1368.00,
    "igstAmount": 0.00,
    "grandTotal": 17936,
    "amountInWords": "Seventeen Thousand Nine Hundred Thirty Six Rupees only.",
    "lineItems": [...]
  }
  ```

### 5.2 Create Freight Bill
Generates a permanent invoice, captures customer snapshot, and marks consignments as `Bill Generated`.

- **Endpoint**: `POST /api/freight-bills`
- **Request Body**: Same parameters as preview, plus optional `notes` and `billDate`.
- **Response** (`201 Created`): Persisted freight bill with assigned `billNumber`.

### 5.3 Record Payment Against Bill
Records a full or partial installment.

- **Endpoint**: `POST /api/freight-bills/:id/payments`
- **Request Body**:
  ```json
  {
    "amount": 5000.00,
    "paymentDate": "2026-09-16",
    "mode": "NEFT",
    "notes": "UTR: AXIS987654321"
  }
  ```
- **Response** (`201 Created`):
  ```json
  {
    "_id": 1,
    "billNumber": "FB-202609-0001",
    "grandTotal": 17936,
    "paidAmount": 5000.00,
    "pendingAmount": 12936.00,
    "status": "Partially Paid"
  }
  ```

### 5.4 Get Payment History for a Bill
- **Endpoint**: `GET /api/freight-bills/:id/payments`
- **Response** (`200 OK`):
  ```json
  {
    "payments": [
      {
        "id": 1,
        "amount": 5000.00,
        "payment_date": "2026-09-16T10:00:00.000Z",
        "mode": "NEFT",
        "notes": "UTR: AXIS987654321"
      }
    ],
    "paidAmount": 5000.00,
    "pendingAmount": 12936.00,
    "grandTotal": 17936.00,
    "status": "Partially Paid"
  }
  ```

### 5.5 Mark Bill As Fully Settled
- **Endpoint**: `PATCH /api/freight-bills/:id/mark-paid`
- **Response** (`200 OK`): Updated bill with `status: "Paid"` and `pendingAmount: 0`.

---

## 6. Dashboard & Analytics API (`/api/dashboard`)

- **Endpoint**: `GET /api/dashboard`
- **Response** (`200 OK`):
  ```json
  {
    "stats": {
      "totalCustomers": 45,
      "totalTrips": 120,
      "toBeGoneTrips": 8,
      "ongoingTrips": 15,
      "completedTrips": 97,
      "totalConsignments": 540
    },
    "monthly": [
      { "month": "Apr", "consignments": 85, "trips": 18 },
      { "month": "May", "consignments": 92, "trips": 21 }
    ],
    "tripStatusDistribution": [
      { "name": "Completed", "value": 97 },
      { "name": "Ongoing", "value": 15 },
      { "name": "To Be Gone", "value": 8 }
    ],
    "recentTrips": [...],
    "recentConsignments": [...],
    "recentCustomers": [...]
  }
  ```

---

## 7. Global Search API (`/api/search`)

- **Endpoint**: `GET /api/search?q=keyword`
- **Response** (`200 OK`):
  ```json
  {
    "customers": [...],
    "trips": [...],
    "consignments": [...]
  }
  ```

---

## 8. Admin & AI Billing Assistant API (`/api/admin`)

### 8.1 Billing Financial Summary
- **Endpoint**: `GET /api/admin/billing/summary`
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "data": {
      "totalBilled": 250000.00,
      "totalCollected": 180000.00,
      "totalPending": 70000.00,
      "unpaidCount": 12,
      "partiallyPaidCount": 5,
      "paidCount": 38
    }
  }
  ```

### 8.2 Ask AI Billing Assistant
Interactive natural language queries orchestrated by a LangGraph `StateGraph` (`agent` node -> `toolsCondition` -> `ToolNode` loop) using Google Gemini (`gemini-3.6-flash`).

- **Endpoint**: `POST /api/admin/ai/ask`
- **Request Body**:
  ```json
  {
    "message": "Which customers currently have partially paid freight bills?",
    "history": [
      { "role": "user", "content": "Hello" },
      { "role": "assistant", "content": "Hello! How can I assist you with freight billing?" }
    ]
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "data": {
      "reply": "Here are the partially paid freight bills:\n\n1. Bill Number: 26-27/001\n   Customer: Acme Logistics Ltd\n   Total: ₹17,936\n   Paid: ₹5,000\n   Pending: ₹12,936\n   Status: Partially Paid\n\nSummary: Total Pending: ₹12,936.",
      "toolsUsed": ["get_partially_paid_bills"]
    }
  }
  ```
- **Available Database Tools (Zod validated)**:
  - `get_billing_summary`: Freight billing summary, gross billed, paid, pending, and bill counts.
  - `get_partially_paid_bills`: Bills with partial settlement recorded.
  - `get_unpaid_bills`: Bills with zero payment recorded.
  - `get_paid_bills`: Fully cleared bills.
