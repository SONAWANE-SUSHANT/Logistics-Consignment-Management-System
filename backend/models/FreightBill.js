const PgModel = require('./pgModel');
const { pool } = require('../config/db');

const roundMoney = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const paymentStatusFor = (grandTotal, paidAmount) => {
  const total = roundMoney(grandTotal);
  const paid = roundMoney(paidAmount);
  if (paid <= 0) return 'Unpaid';
  if (paid >= total) return 'Paid';
  return 'Partially Paid';
};

const lineColumns = {
  consignmentId: 'consignment_id',
  srNo: 'sr_no',
  lrNumber: 'lr_number',
  lrDate: 'lr_date',
  from: 'source',
  to: 'destination',
  invoiceNumber: 'invoice_number',
  invoiceDate: 'invoice_date',
  weight: 'weight',
  freight: 'freight',
  collectionCharges: 'collection_charges',
  doorDeliveryCharges: 'door_delivery_charges',
  lrCharges: 'lr_charges',
  otherCharges: 'other_charges',
  amount: 'amount',
};

const quoteIdent = (value) => `"${String(value).replace(/"/g, '""')}"`;

class FreightBillModel extends PgModel {
  constructor() {
    super({
      table: 'freight_bills',
      columns: {
        'customerSnapshot.companyName': 'company_name',
        'customerSnapshot.gstNumber': 'gst_number',
      },
      fields: [
        '_id',
        'id',
        'billNumber',
        'billDate',
        'mode',
        'customerId',
        'companyName',
        'address',
        'city',
        'state',
        'pincode',
        'gstNumber',
        'phone',
        'email',
        'fromDate',
        'toDate',
        'ratePerKg',
        'taxableAmount',
        'cgstRate',
        'sgstRate',
        'igstRate',
        'cgstAmount',
        'sgstAmount',
        'igstAmount',
        'grandTotal',
        'amountInWords',
        'notes',
        'status',
        'paidAmount',
        'createdBy',
        'createdAt',
        'updatedAt',
      ],
    });
  }

  hydrate(row) {
    const doc = super.hydrate(row);
    if (!doc) return null;
    doc.customerSnapshot = {
      companyName: doc.companyName,
      address: doc.address,
      city: doc.city,
      state: doc.state,
      pincode: doc.pincode,
      gstNumber: doc.gstNumber,
      phone: doc.phone,
      email: doc.email,
    };
    doc.lineItems = doc.lineItems || [];
    doc.paidAmount = roundMoney(doc.paidAmount || 0);
    doc.grandTotal = Number(doc.grandTotal || 0);
    doc.pendingAmount = roundMoney(Math.max(doc.grandTotal - doc.paidAmount, 0));
    doc.status = doc.status || paymentStatusFor(doc.grandTotal, doc.paidAmount);
    return doc;
  }

  toDb(data) {
    const flat = { ...data };
    if (data.customerSnapshot) {
      flat.companyName = data.customerSnapshot.companyName;
      flat.address = data.customerSnapshot.address;
      flat.city = data.customerSnapshot.city;
      flat.state = data.customerSnapshot.state;
      flat.pincode = data.customerSnapshot.pincode;
      flat.gstNumber = data.customerSnapshot.gstNumber;
      flat.phone = data.customerSnapshot.phone;
      flat.email = data.customerSnapshot.email;
    }
    return super.toDb(flat);
  }

  async create(data) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const db = this.toDb(data);
      const columns = Object.keys(db);
      const values = Object.values(db);
      const placeholders = values.map((_, index) => `$${index + 1}`);
      const result = await client.query(
        `INSERT INTO ${this.tableName()} (${columns.map(quoteIdent).join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
        values
      );
      const bill = this.hydrate(result.rows[0]);
      await this.replaceLineItems(client, bill._id, data.lineItems || []);
      await client.query('COMMIT');
      bill.lineItems = await this.getLineItems(bill._id);
      return bill;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateById(id, data) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const db = this.toDb(data);
      const columns = Object.keys(db);
      let bill;
      if (columns.length) {
        const values = Object.values(db);
        values.push(id);
        const setSql = columns.map((column, index) => `${quoteIdent(column)} = $${index + 1}`).join(', ');
        const result = await client.query(
          `UPDATE ${this.tableName()} SET ${setSql}, ${quoteIdent('updated_at')} = NOW() WHERE ${quoteIdent('id')} = $${values.length} RETURNING *`,
          values
        );
        bill = this.hydrate(result.rows[0]);
      } else {
        const result = await client.query(`SELECT * FROM ${this.tableName()} WHERE ${quoteIdent('id')} = $1`, [id]);
        bill = this.hydrate(result.rows[0]);
      }
      if (data.lineItems) await this.replaceLineItems(client, id, data.lineItems);
      await client.query('COMMIT');
      bill.lineItems = await this.getLineItems(id);
      return bill;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteById(id) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE ${quoteIdent('consignments')} SET ${quoteIdent('freight_bill_id')} = NULL, ${quoteIdent('bill_status')} = 'Not Billed', ${quoteIdent('payment_status')} = 'Pending', ${quoteIdent('updated_at')} = NOW() WHERE ${quoteIdent('freight_bill_id')} = $1`,
        [id]
      );
      await client.query(`DELETE FROM ${quoteIdent('freight_bill_lines')} WHERE ${quoteIdent('freight_bill_id')} = $1`, [id]);
      await client.query(`DELETE FROM ${this.tableName()} WHERE ${quoteIdent('id')} = $1`, [id]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteMany(filter = {}) {
    const bills = await this.find(filter).select('_id').exec();
    if (!bills.length) return { deletedCount: 0 };
    const ids = bills.map((bill) => bill._id);
    await pool.query(
      `UPDATE ${quoteIdent('consignments')} SET ${quoteIdent('freight_bill_id')} = NULL, ${quoteIdent('bill_status')} = 'Not Billed', ${quoteIdent('payment_status')} = 'Pending', ${quoteIdent('updated_at')} = NOW() WHERE ${quoteIdent('freight_bill_id')} = ANY($1::int[])`,
      [ids]
    );
    await pool.query(`DELETE FROM ${quoteIdent('freight_bill_lines')} WHERE ${quoteIdent('freight_bill_id')} = ANY($1::int[])`, [ids]);
    const result = await pool.query(`DELETE FROM ${this.tableName()} WHERE ${quoteIdent('id')} = ANY($1::int[])`, [ids]);
    return { deletedCount: result.rowCount };
  }

  async findRows(filter, options) {
    const rows = await super.findRows(filter, options);
    if (!rows.length) return rows;
    const lineMap = await this.getLineItemsForBills(rows.map((row) => row._id));
    rows.forEach((row) => {
      row.lineItems = lineMap.get(String(row._id)) || [];
    });
    return rows;
  }

  // Records a payment against a freight bill, atomically updating the running
  // paid_amount / status columns alongside the payment history row. Locks the
  // bill row (FOR UPDATE) so concurrent payments can't race past the grand total.
  async recordPayment(billId, { amount, paymentDate, mode, notes, createdBy } = {}) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const billResult = await client.query(
        `SELECT * FROM ${this.tableName()} WHERE ${quoteIdent('id')} = $1 FOR UPDATE`,
        [billId]
      );
      if (!billResult.rows[0]) {
        await client.query('ROLLBACK');
        return null;
      }

      const bill = this.hydrate(billResult.rows[0]);
      const paymentAmount = roundMoney(amount);

      if (!paymentAmount || paymentAmount <= 0) {
        const error = new Error('Payment amount must be greater than zero');
        error.statusCode = 400;
        throw error;
      }

      const newPaidAmount = roundMoney(bill.paidAmount + paymentAmount);
      if (newPaidAmount - bill.grandTotal > 0.01) {
        const error = new Error('Payment amount exceeds the pending balance');
        error.statusCode = 400;
        throw error;
      }

      const newStatus = paymentStatusFor(bill.grandTotal, newPaidAmount);

      await client.query(
        `INSERT INTO ${quoteIdent('freight_bill_payments')} (${quoteIdent('freight_bill_id')}, ${quoteIdent('amount')}, ${quoteIdent('payment_date')}, ${quoteIdent('mode')}, ${quoteIdent('notes')}, ${quoteIdent('created_by')}) VALUES ($1, $2, $3, $4, $5, $6)`,
        [billId, paymentAmount, paymentDate || new Date(), mode || null, notes || null, createdBy || null]
      );

      const updateResult = await client.query(
        `UPDATE ${this.tableName()} SET ${quoteIdent('paid_amount')} = $1, ${quoteIdent('status')} = $2, ${quoteIdent('updated_at')} = NOW() WHERE ${quoteIdent('id')} = $3 RETURNING *`,
        [newPaidAmount, newStatus, billId]
      );
      const updatedBill = this.hydrate(updateResult.rows[0]);

      if (newStatus === 'Paid') {
        await client.query(
          `UPDATE ${quoteIdent('consignments')} SET ${quoteIdent('payment_status')} = 'Paid', ${quoteIdent('updated_at')} = NOW() WHERE ${quoteIdent('freight_bill_id')} = $1`,
          [billId]
        );
      }

      await client.query('COMMIT');
      updatedBill.lineItems = await this.getLineItems(billId);
      updatedBill.payments = await this.getPayments(billId);
      return updatedBill;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getPayments(billId) {
    const result = await pool.query(
      `SELECT * FROM ${quoteIdent('freight_bill_payments')} WHERE ${quoteIdent('freight_bill_id')} = $1 ORDER BY ${quoteIdent('payment_date')} ASC, ${quoteIdent('id')} ASC`,
      [billId]
    );
    return result.rows.map((row) => ({
      _id: row.id,
      id: row.id,
      freightBillId: row.freight_bill_id,
      amount: Number(row.amount),
      paymentDate: row.payment_date,
      mode: row.mode,
      notes: row.notes,
      createdBy: row.created_by,
      createdAt: row.created_at,
    }));
  }

  async replaceLineItems(client, billId, lineItems) {
    await client.query(`DELETE FROM ${quoteIdent('freight_bill_lines')} WHERE ${quoteIdent('freight_bill_id')} = $1`, [billId]);
    for (const item of lineItems) {
      const db = { freight_bill_id: billId };
      Object.entries(lineColumns).forEach(([field, column]) => {
        db[column] = item[field];
      });
      const columns = Object.keys(db);
      const values = Object.values(db);
      const placeholders = values.map((_, index) => `$${index + 1}`);
      await client.query(
        `INSERT INTO ${quoteIdent('freight_bill_lines')} (${columns.map(quoteIdent).join(', ')}) VALUES (${placeholders.join(', ')})`,
        values
      );
    }
  }

  async getLineItems(billId) {
    const map = await this.getLineItemsForBills([billId]);
    return map.get(String(billId)) || [];
  }

  async getLineItemsForBills(billIds) {
    const result = await pool.query(
      `SELECT * FROM ${quoteIdent('freight_bill_lines')} WHERE ${quoteIdent('freight_bill_id')} = ANY($1::int[]) ORDER BY ${quoteIdent('sr_no')} ASC`,
      [billIds]
    );
    const map = new Map();
    result.rows.forEach((row) => {
      const item = {
        _id: row.id,
        id: row.id,
        consignmentId: row.consignment_id,
        srNo: row.sr_no,
        lrNumber: row.lr_number,
        lrDate: row.lr_date,
        from: row.source,
        to: row.destination,
        invoiceNumber: row.invoice_number,
        invoiceDate: row.invoice_date,
        weight: row.weight,
        freight: row.freight,
        collectionCharges: row.collection_charges,
        doorDeliveryCharges: row.door_delivery_charges,
        lrCharges: row.lr_charges,
        otherCharges: row.other_charges,
        amount: row.amount,
      };
      const key = String(row.freight_bill_id);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });
    return map;
  }
}

module.exports = new FreightBillModel();