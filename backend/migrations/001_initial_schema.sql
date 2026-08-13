-- Matoshree Logistics
-- Initial PostgreSQL schema for the PgModel-based backend.
-- Fresh database setup only.
-- This migration includes freight-bill payment tracking so a new database
-- can be initialized without running the older payment migration separately.

BEGIN;

-- ============================================================
-- 1. USERS
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150),
    email VARCHAR(255),
    password TEXT,
    role VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique
    ON users (LOWER(email))
    WHERE email IS NOT NULL;

-- ============================================================
-- 2. CUSTOMERS
-- ============================================================

CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    customer_code VARCHAR(50),
    company_name VARCHAR(255),
    contact_person VARCHAR(255),
    gst_number VARCHAR(50),
    pan_number VARCHAR(50),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    country VARCHAR(100),
    remarks TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_customer_code_unique
    ON customers (customer_code)
    WHERE customer_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customers_company_name
    ON customers (company_name);

CREATE INDEX IF NOT EXISTS idx_customers_phone
    ON customers (phone);

CREATE INDEX IF NOT EXISTS idx_customers_gst_number
    ON customers (gst_number);

-- ============================================================
-- 3. TRIPS
-- ============================================================

CREATE TABLE IF NOT EXISTS trips (
    id SERIAL PRIMARY KEY,
    trip_number VARCHAR(50),
    vehicle_number VARCHAR(100),
    source VARCHAR(255),
    destination VARCHAR(255),
    departure_date TIMESTAMP,
    expected_arrival TIMESTAMP,
    status VARCHAR(50),
    remarks TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_trips_trip_number_unique
    ON trips (trip_number)
    WHERE trip_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_trips_vehicle_number
    ON trips (vehicle_number);

CREATE INDEX IF NOT EXISTS idx_trips_status
    ON trips (status);

CREATE INDEX IF NOT EXISTS idx_trips_departure_date
    ON trips (departure_date);

-- ============================================================
-- 5. FREIGHT BILLS
-- ============================================================

CREATE TABLE IF NOT EXISTS freight_bills (
    id SERIAL PRIMARY KEY,

    bill_number VARCHAR(100) NOT NULL,
    bill_date TIMESTAMP,

    mode VARCHAR(50),

    customer_id INTEGER REFERENCES customers(id) ON DELETE RESTRICT,

    -- Customer snapshot stored on the bill so historical bills
    -- remain printable even if customer details change later.
    company_name VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    gst_number VARCHAR(50),
    phone VARCHAR(50),
    email VARCHAR(255),

    from_date TIMESTAMP,
    to_date TIMESTAMP,

    rate_per_kg NUMERIC(14, 2),

    taxable_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,

    cgst_rate NUMERIC(8, 3) NOT NULL DEFAULT 0,
    sgst_rate NUMERIC(8, 3) NOT NULL DEFAULT 0,
    igst_rate NUMERIC(8, 3) NOT NULL DEFAULT 0,

    cgst_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    sgst_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    igst_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,

    grand_total NUMERIC(14, 2) NOT NULL DEFAULT 0,

    amount_in_words TEXT,
    notes TEXT,

    status VARCHAR(50) NOT NULL DEFAULT 'Unpaid',

    -- Running total of payments recorded against this bill.
    -- pending amount is calculated by the application as:
    -- grand_total - paid_amount
    paid_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,

    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT freight_bills_bill_number_unique UNIQUE (bill_number),

    CONSTRAINT freight_bills_status_check
        CHECK (status IN ('Unpaid', 'Partially Paid', 'Paid'))
);

CREATE INDEX IF NOT EXISTS idx_freight_bills_customer_id
    ON freight_bills (customer_id);

CREATE INDEX IF NOT EXISTS idx_freight_bills_bill_date
    ON freight_bills (bill_date);

CREATE INDEX IF NOT EXISTS idx_freight_bills_status
    ON freight_bills (status);

CREATE INDEX IF NOT EXISTS idx_freight_bills_company_name
    ON freight_bills (company_name);

-- ============================================================
-- 4. CONSIGNMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS consignments (
    id SERIAL PRIMARY KEY,
    lr_number VARCHAR(100),
    booking_date TIMESTAMP,
    booking_time VARCHAR(50),

    consigner_id INTEGER REFERENCES customers(id) ON DELETE RESTRICT,
    consignee_id INTEGER REFERENCES customers(id) ON DELETE RESTRICT,
    trip_id INTEGER REFERENCES trips(id) ON DELETE RESTRICT,

    invoice_number VARCHAR(100),
    invoice_date TIMESTAMP,
    eway_bill_number VARCHAR(100),
    eway_bill_date TIMESTAMP,
    eway_bill_valid_upto TIMESTAMP,

    description TEXT,
    package_type VARCHAR(100),
    package_count INTEGER,
    dimensions TEXT,

    rate NUMERIC(12, 2),
    booking_mode VARCHAR(100),
    mode_of_delivery VARCHAR(100),
    payment_mode VARCHAR(100),

    delivery_date TIMESTAMP,

    part_number VARCHAR(100),
    part_name VARCHAR(255),
    quantity NUMERIC(12, 2),

    private_mark TEXT,

    actual_weight NUMERIC(12, 3),
    chargeable_weight NUMERIC(12, 3),
    goods_value NUMERIC(14, 2),

    freight NUMERIC(14, 2),
    collection_charges NUMERIC(14, 2),
    door_delivery_charges NUMERIC(14, 2),
    hamali NUMERIC(14, 2),
    st_charges NUMERIC(14, 2),
    other_charges NUMERIC(14, 2),
    insurance NUMERIC(14, 2),

    sub_total NUMERIC(14, 2),
    gst NUMERIC(14, 2),
    sgst NUMERIC(14, 2),
    cgst NUMERIC(14, 2),
    igst NUMERIC(14, 2),
    total_amount NUMERIC(14, 2),

    remarks TEXT,
    status VARCHAR(50),
    bill_status VARCHAR(50) NOT NULL DEFAULT 'Not Billed',
    payment_status VARCHAR(50) NOT NULL DEFAULT 'Pending',

    freight_bill_id INTEGER REFERENCES freight_bills(id) ON DELETE SET NULL,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_consignments_lr_number_unique
    ON consignments (lr_number)
    WHERE lr_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_consignments_consigner_id
    ON consignments (consigner_id);

CREATE INDEX IF NOT EXISTS idx_consignments_consignee_id
    ON consignments (consignee_id);

CREATE INDEX IF NOT EXISTS idx_consignments_trip_id
    ON consignments (trip_id);

CREATE INDEX IF NOT EXISTS idx_consignments_freight_bill_id
    ON consignments (freight_bill_id);

CREATE INDEX IF NOT EXISTS idx_consignments_booking_date
    ON consignments (booking_date);

CREATE INDEX IF NOT EXISTS idx_consignments_bill_status
    ON consignments (bill_status);

CREATE INDEX IF NOT EXISTS idx_consignments_payment_status
    ON consignments (payment_status);

-- ============================================================
-- 6. FREIGHT BILL LINE ITEMS
-- ============================================================

CREATE TABLE IF NOT EXISTS freight_bill_lines (
    id SERIAL PRIMARY KEY,

    freight_bill_id INTEGER NOT NULL
        REFERENCES freight_bills(id) ON DELETE CASCADE,

    consignment_id INTEGER
        REFERENCES consignments(id) ON DELETE RESTRICT,

    sr_no INTEGER,

    lr_number VARCHAR(100),
    lr_date TIMESTAMP,

    source VARCHAR(255),
    destination VARCHAR(255),

    invoice_number VARCHAR(100),
    invoice_date TIMESTAMP,

    weight NUMERIC(12, 3),
    freight NUMERIC(14, 2),
    collection_charges NUMERIC(14, 2),
    door_delivery_charges NUMERIC(14, 2),
    lr_charges NUMERIC(14, 2),
    other_charges NUMERIC(14, 2),
    amount NUMERIC(14, 2),

    CONSTRAINT freight_bill_lines_bill_consignment_unique
        UNIQUE (freight_bill_id, consignment_id)
);

CREATE INDEX IF NOT EXISTS idx_freight_bill_lines_bill_id
    ON freight_bill_lines (freight_bill_id);

CREATE INDEX IF NOT EXISTS idx_freight_bill_lines_consignment_id
    ON freight_bill_lines (consignment_id);

-- ============================================================
-- 7. FREIGHT BILL PAYMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS freight_bill_payments (
    id SERIAL PRIMARY KEY,

    freight_bill_id INTEGER NOT NULL
        REFERENCES freight_bills(id) ON DELETE CASCADE,

    amount NUMERIC(14, 2) NOT NULL
        CHECK (amount > 0),

    payment_date TIMESTAMP NOT NULL DEFAULT NOW(),

    mode VARCHAR(50),
    notes TEXT,

    created_by INTEGER
        REFERENCES users(id) ON DELETE SET NULL,

    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_freight_bill_payments_bill_id
    ON freight_bill_payments (freight_bill_id);

CREATE INDEX IF NOT EXISTS idx_freight_bill_payments_payment_date
    ON freight_bill_payments (payment_date);

-- ============================================================
-- 8. RELATIONSHIP / SEARCH INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_consignments_invoice_number
    ON consignments (invoice_number);

CREATE INDEX IF NOT EXISTS idx_consignments_eway_bill_number
    ON consignments (eway_bill_number);

-- ============================================================
-- 9. SEQUENCES
-- ============================================================
-- SERIAL columns already create PostgreSQL sequences automatically.
-- Reset them to the current maximum ID when this script is re-run
-- against a database that already contains rows.

SELECT setval(
    pg_get_serial_sequence('users', 'id'),
    COALESCE((SELECT MAX(id) FROM users), 1),
    (SELECT COUNT(*) > 0 FROM users)
);

SELECT setval(
    pg_get_serial_sequence('customers', 'id'),
    COALESCE((SELECT MAX(id) FROM customers), 1),
    (SELECT COUNT(*) > 0 FROM customers)
);

SELECT setval(
    pg_get_serial_sequence('trips', 'id'),
    COALESCE((SELECT MAX(id) FROM trips), 1),
    (SELECT COUNT(*) > 0 FROM trips)
);

SELECT setval(
    pg_get_serial_sequence('consignments', 'id'),
    COALESCE((SELECT MAX(id) FROM consignments), 1),
    (SELECT COUNT(*) > 0 FROM consignments)
);

SELECT setval(
    pg_get_serial_sequence('freight_bills', 'id'),
    COALESCE((SELECT MAX(id) FROM freight_bills), 1),
    (SELECT COUNT(*) > 0 FROM freight_bills)
);

SELECT setval(
    pg_get_serial_sequence('freight_bill_lines', 'id'),
    COALESCE((SELECT MAX(id) FROM freight_bill_lines), 1),
    (SELECT COUNT(*) > 0 FROM freight_bill_lines)
);

SELECT setval(
    pg_get_serial_sequence('freight_bill_payments', 'id'),
    COALESCE((SELECT MAX(id) FROM freight_bill_payments), 1),
    (SELECT COUNT(*) > 0 FROM freight_bill_payments)
);

COMMIT;