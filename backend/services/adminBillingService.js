const { pool } = require('../config/db');

/*
 * Admin Billing Data Service
 *
 * IMPORTANT:
 * This service contains only business/data retrieval logic.
 *
 * It does NOT know anything about:
 * - React
 * - Express
 * - LangGraph
 * - LLMs
 *
 * This makes it reusable by:
 * 1. Admin REST APIs
 * 2. Future LangGraph tools
 * 3. Future dashboards/reports
 */

/**
 * Get all partially paid freight bills.
 *
 * A bill is partially paid when:
 * paid_amount > 0
 * AND
 * paid_amount < grand_total
 *
 * We calculate this from the actual PostgreSQL values instead of
 * trusting a potentially stale status field.
 */
const getPartiallyPaidBills = async ({
  limit = 100,
  offset = 0,
} = {}) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const safeOffset = Math.max(Number(offset) || 0, 0);

  const query = `
    SELECT
      fb.id,
      fb.bill_number,
      fb.bill_date,
      fb.customer_id,
      fb.company_name,
      fb.city,
      fb.gst_number,
      fb.grand_total,
      COALESCE(fb.paid_amount, 0) AS paid_amount,
      GREATEST(
        fb.grand_total - COALESCE(fb.paid_amount, 0),
        0
      ) AS pending_amount,
      fb.status,
      fb.created_at
    FROM freight_bills fb
    WHERE COALESCE(fb.paid_amount, 0) > 0
      AND COALESCE(fb.paid_amount, 0) < fb.grand_total
    ORDER BY fb.bill_date DESC, fb.id DESC
    LIMIT $1
    OFFSET $2
  `;

  const result = await pool.query(query, [
    safeLimit,
    safeOffset,
  ]);

  return result.rows.map((bill) => ({
    id: bill.id,
    billNumber: bill.bill_number,
    billDate: bill.bill_date,
    customerId: bill.customer_id,
    companyName: bill.company_name,
    city: bill.city,
    gstNumber: bill.gst_number,

    grandTotal: Number(bill.grand_total || 0),
    paidAmount: Number(bill.paid_amount || 0),
    pendingAmount: Number(bill.pending_amount || 0),

    status: 'Partially Paid',

    createdAt: bill.created_at,
  }));
};


/**
 * Get billing summary.
 *
 * This will be useful for:
 * - Admin dashboard
 * - Admin chat
 * - LangGraph
 */
const getBillingSummary = async () => {
  const query = `
    SELECT
      COUNT(*)::INTEGER AS total_bills,

      COALESCE(SUM(grand_total), 0) AS total_billed,

      COALESCE(SUM(paid_amount), 0) AS total_paid,

      COALESCE(
        SUM(
          GREATEST(
            grand_total - COALESCE(paid_amount, 0),
            0
          )
        ),
        0
      ) AS total_pending,

      COUNT(*) FILTER (
        WHERE COALESCE(paid_amount, 0) <= 0
      )::INTEGER AS unpaid_bills,

      COUNT(*) FILTER (
        WHERE COALESCE(paid_amount, 0) > 0
          AND COALESCE(paid_amount, 0) < grand_total
      )::INTEGER AS partially_paid_bills,

      COUNT(*) FILTER (
        WHERE COALESCE(paid_amount, 0) >= grand_total
      )::INTEGER AS paid_bills

    FROM freight_bills
  `;

  const result = await pool.query(query);

  const row = result.rows[0];

  return {
    totalBills: Number(row.total_bills || 0),
    totalBilled: Number(row.total_billed || 0),
    totalPaid: Number(row.total_paid || 0),
    totalPending: Number(row.total_pending || 0),

    unpaidBills: Number(row.unpaid_bills || 0),
    partiallyPaidBills: Number(row.partially_paid_bills || 0),
    paidBills: Number(row.paid_bills || 0),
  };
};


/**
 * Get unpaid bills.
 *
 * Future LangGraph can use this as another tool.
 */
const getUnpaidBills = async ({
  limit = 100,
  offset = 0,
} = {}) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const safeOffset = Math.max(Number(offset) || 0, 0);

  const query = `
    SELECT
      fb.id,
      fb.bill_number,
      fb.bill_date,
      fb.customer_id,
      fb.company_name,
      fb.city,
      fb.gst_number,
      fb.grand_total,
      COALESCE(fb.paid_amount, 0) AS paid_amount,
      fb.grand_total AS pending_amount,
      fb.status,
      fb.created_at
    FROM freight_bills fb
    WHERE COALESCE(fb.paid_amount, 0) <= 0
    ORDER BY fb.bill_date DESC, fb.id DESC
    LIMIT $1
    OFFSET $2
  `;

  const result = await pool.query(query, [
    safeLimit,
    safeOffset,
  ]);

  return result.rows.map((bill) => ({
    id: bill.id,
    billNumber: bill.bill_number,
    billDate: bill.bill_date,
    customerId: bill.customer_id,
    companyName: bill.company_name,
    city: bill.city,
    gstNumber: bill.gst_number,

    grandTotal: Number(bill.grand_total || 0),
    paidAmount: Number(bill.paid_amount || 0),
    pendingAmount: Number(bill.pending_amount || 0),

    status: 'Unpaid',

    createdAt: bill.created_at,
  }));
};


/**
 * Get fully paid bills.
 */
const getPaidBills = async ({
  limit = 100,
  offset = 0,
} = {}) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const safeOffset = Math.max(Number(offset) || 0, 0);

  const query = `
    SELECT
      fb.id,
      fb.bill_number,
      fb.bill_date,
      fb.customer_id,
      fb.company_name,
      fb.city,
      fb.gst_number,
      fb.grand_total,
      COALESCE(fb.paid_amount, 0) AS paid_amount,
      0 AS pending_amount,
      fb.status,
      fb.created_at
    FROM freight_bills fb
    WHERE COALESCE(fb.paid_amount, 0) >= fb.grand_total
    ORDER BY fb.bill_date DESC, fb.id DESC
    LIMIT $1
    OFFSET $2
  `;

  const result = await pool.query(query, [
    safeLimit,
    safeOffset,
  ]);

  return result.rows.map((bill) => ({
    id: bill.id,
    billNumber: bill.bill_number,
    billDate: bill.bill_date,
    customerId: bill.customer_id,
    companyName: bill.company_name,
    city: bill.city,
    gstNumber: bill.gst_number,

    grandTotal: Number(bill.grand_total || 0),
    paidAmount: Number(bill.paid_amount || 0),
    pendingAmount: 0,

    status: 'Paid',

    createdAt: bill.created_at,
  }));
};


module.exports = {
  getPartiallyPaidBills,
  getUnpaidBills,
  getPaidBills,
  getBillingSummary,
};