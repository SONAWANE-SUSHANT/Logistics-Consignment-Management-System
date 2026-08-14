// server.js — dotenv.config() must run FIRST, before anything that requires ./config/db,
// otherwise the pg Pool is built with DB_HOST/DB_USER/DB_PASSWORD all undefined and
// every query after that fails auth (this is why login specifically breaks)

const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
require('express-async-errors');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const { connectDB } = require('./config/db');

const { errorHandler, notFound } = require('./middlewares/errorMiddleware');

const authRoutes = require('./routes/authRoutes');
const customerRoutes = require('./routes/customerRoutes');
const tripRoutes = require('./routes/tripRoutes');
const consignmentRoutes = require('./routes/consignmentRoutes');
const freightBillRoutes = require('./routes/freightBillRoutes');
const reportRoutes = require('./routes/reportRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const searchRoutes = require('./routes/searchRoutes');
const adminRoutes = require('./routes/adminRoutes');
connectDB();

const app = express();

app.use(express.json());

app.use(cookieParser());

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
}));

app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/consignments', consignmentRoutes);
app.use('/api/freight-bills', freightBillRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});