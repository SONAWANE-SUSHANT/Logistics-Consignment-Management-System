const Customer = require('../models/Customer');
const Trip = require('../models/Trip');
const Consignment = require('../models/Consignment');
const FreightBill = require('../models/FreightBill');
const { pool } = require('../config/db');

const generateCustomerCode = async () => {
  const count = await Customer.countDocuments();
  return `CUST-${String(count + 1).padStart(4, '0')}`;
};

const generateTripNumber = async () => {
  const count = await Trip.countDocuments();
  return `TRIP-${String(count + 1).padStart(4, '0')}`;
};

const generateLRNumber = async () => {
  const START_NUMBER = 7501;
  try {
    const result = await pool.query(
      `SELECT MAX(CAST(substring("lr_number" from '[0-9]+') AS INT)) AS max_num FROM "consignments" WHERE "lr_number" IS NOT NULL`
    );
    const maxNum = result.rows[0]?.max_num;
    const nextSeq = maxNum && maxNum >= START_NUMBER ? maxNum + 1 : START_NUMBER;
    return `LR-${nextSeq}`;
  } catch (error) {
    const count = await Consignment.countDocuments();
    return `LR-${START_NUMBER + count}`;
  }
};


const generateFreightBillNumber = async () => {
  const now = new Date();
  const fiscalStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const fiscalLabel = `${String(fiscalStart).slice(-2)}-${String(fiscalStart + 1).slice(-2)}`;
  // Use the highest existing sequence number for this fiscal year, not a row count —
  // a count drifts (and collides with an already-used bill number) once any bill in
  // the year has been deleted.
  const result = await pool.query(
    `SELECT MAX(CAST(split_part("bill_number", '/', 2) AS INT)) AS max_num FROM "freight_bills" WHERE "bill_number" LIKE $1`,
    [`${fiscalLabel}/%`]
  );
  const nextSeq = (result.rows[0].max_num || 0) + 1;
  return `${fiscalLabel}/${String(nextSeq).padStart(3, '0')}`;
};

module.exports = { generateCustomerCode, generateTripNumber, generateLRNumber, generateFreightBillNumber };