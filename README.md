 Logistics Consignment Management System

This workspace contains a PostgreSQL-backed logistics consignment management system with an Express API and a React/Tailwind frontend.

## Backend

Folder: `backend`

### Setup

1. Copy `backend/.env.example` to `backend/.env`.
2. Fill in your PostgreSQL values:
   ```bash
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=postgres
   DB_PASSWORD=postgres
   DB_NAME=matoshree_logistics
   ```
3. Install dependencies:
   ```bash
   cd backend
   npm install
   ```
4. Create the admin user:
   ```bash
   npm run seed
   ```
5. Start the backend:
   ```bash
   npm run dev
   ```

### Backend Details

- Express.js API
- PostgreSQL via `pg`
- JWT auth with HTTP-only cookies
- Customers, trips, consignments, freight bills, reports, dashboard, and search endpoints

## Frontend

Folder: `frontend`

### Setup

1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```
2. Start the frontend:
   ```bash
   npm run dev
   ```

## Notes

- Backend runs on `http://localhost:5000`
- Frontend runs on `http://localhost:5173`
- Add a strong `JWT_SECRET` in `backend/.env`
