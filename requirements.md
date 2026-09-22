# Software Requirements Specification (SRS)

## Logistics Consignment Management System (Matoshree Logistics)

---

## 1. Project Overview & Business Domain

The **Logistics Consignment Management System** is a business application engineered for regional freight operators, third-party logistics (3PL) providers, and dispatch managers. The platform manages the entire lifecycle of commercial road transport:

1. Registering corporate clients (consigners and consignees).
2. Managing transport vehicles, routes, and trip dispatches.
3. Issuing standardized Lorry Receipts (LRs) / Consignment Notes.
4. Consolidating delivered consignments into GST-compliant Freight Bills.
5. Tracking accounts receivable via multi-installment payment recording.
6. Assisting financial audits with real-time AI query tools.

---

## 2. User Roles & Personas

| Role | Responsibilities | Access Scope |
|:---|:---|:---|
| **System Administrator** | User accounts, systemic configurations, financial oversight, database seeds, AI billing assistant. | Full access across all modules. |
| **Billing Manager** | Freight bill generation, GST configuration, recording payments, reconciling pending receivables. | Read/Write on Bills, Customers, Reports. |
| **Dispatch Operator** | Creating trips, registering consignments/LRs, vehicle assignment, status updates. | Read/Write on Trips, Consignments, Master search. |

---

## 3. Functional Requirements (FR)

### FR-1: Authentication & User Management
- **FR-1.1**: The system must securely authenticate users via email and password using salted bcrypt hashes.
- **FR-1.2**: Upon successful login, the system must set a secure, tamper-proof `HttpOnly`, `SameSite=Strict` JWT cookie.
- **FR-1.3**: The system must provide a logout mechanism that immediately invalidates the client cookie.

### FR-2: Customer Master Directory
- **FR-2.1**: The system must auto-generate unique sequential customer identifiers (`CUST-XXXX`).
- **FR-2.2**: The system must capture commercial client details: Company Name, Contact Person, GSTIN, PAN, Phone, Email, Billing Address, City, State, and Pincode.
- **FR-2.3**: Prevent accidental deletion of any customer who has an existing consignment history (`ON DELETE RESTRICT`).
- **FR-2.4**: Provide a multi-field real-time search across company name, GST, phone, and city.

### FR-3: Trip Management & Vehicle Dispatch
- **FR-3.1**: The system must auto-generate unique trip identifiers (`TRIP-XXXX`).
- **FR-3.2**: Capture commercial vehicle registration number, source warehouse, destination hub, departure date, and expected arrival time.
- **FR-3.3**: Support trip status progression: `To Be Gone` $\rightarrow$ `Ongoing` $\rightarrow$ `Completed`.
- **FR-3.4**: Disallow adding or modifying consignments on any trip marked as `Completed`.

### FR-4: Consignment & Lorry Receipt (LR) Generation
- **FR-4.1**: The system must auto-generate unique LR Numbers in chronological format (`LR-YYYYMMDD-XXXX`).
- **FR-4.2**: Record both actual scale weight and chargeable (volumetric) weight.
- **FR-4.3**: Calculate base freight and auxiliary charges:
  $$\text{Total Amount} = \text{Freight} + \text{Collection} + \text{Door Delivery} + \text{Hamali} + \text{ST Charges} + \text{Insurance} + \text{Other}$$
- **FR-4.4**: Track statutory transport compliance fields: E-Way Bill Number, E-Way Bill Date, and Expiry Date.
- **FR-4.5**: Support delivery lifecycle transitions: `Pending` $\rightarrow$ `In Transit` $\rightarrow$ `Delivered`.

### FR-5: Freight Billing & Tax Engine
- **FR-5.1**: Provide dynamic bill previews filtering unbilled consignments by customer and date range.
- **FR-5.2**: Calculate rate per kg against chargeable weight with configurable GST splits (CGST + SGST for intra-state, IGST for inter-state):
  $$\text{Taxable Amount} = \sum (\text{Line Item Amounts})$$
  $$\text{Grand Total} = \text{Taxable Amount} + \text{CGST} + \text{SGST} + \text{IGST}$$
- **FR-5.3**: Automatically convert numerical grand totals into formal Indian currency words (Rupees and Paise).
- **FR-5.4**: Permanently snapshot customer billing information at time of bill generation to guarantee legal audit validity.
- **FR-5.5**: Prevent race conditions on concurrent bill generation through retry mechanisms and unique database constraints.

### FR-6: Payment Reconciliation & Ledger
- **FR-6.1**: Maintain an audit ledger of payments per bill (`freight_bill_payments`).
- **FR-6.2**: Support multi-installment partial payments, ensuring payment amount $> 0$ and $\le \text{Pending Balance}$.
- **FR-6.3**: Automatically update bill payment status:
  - `Unpaid`: $\text{Paid Amount} = 0$
  - `Partially Paid`: $0 < \text{Paid Amount} < \text{Grand Total}$
  - `Paid`: $\text{Paid Amount} \ge \text{Grand Total}$
- **FR-6.4**: Automatically update consignment payment status to `Paid` once the parent bill is completely settled.

### FR-7: Reports, Dashboards & Exports
- **FR-7.1**: Real-time dashboard KPI cards: Total Customers, Total Trips, Trips by Status, Total Consignments.
- **FR-7.2**: 6-month historical trend charts comparing consignment volume and trip frequencies.
- **FR-7.3**: Client-side printable PDF generation for Lorry Receipts and Freight Invoices.
- **FR-7.4**: Excel (`.xlsx`) report exports for accounting departments.

### FR-8: Global Multi-Entity Search
- **FR-8.1**: Single top-bar search bar returning matching results grouped by Customers, Trips, and Consignments.

### FR-9: AI Billing Intelligence
- **FR-9.1**: Internal chat drawer for operational executives powered by Google Gemini (`gemini-3.6-flash`) via LangChain and LangGraph.
- **FR-9.2**: Cyclical LangGraph `StateGraph` orchestration with an `agent` node and `tools` node routed by `toolsCondition` that queries read-only PostgreSQL views for exact unpaid, partially paid, and billing summary figures with zero hallucination.

---

## 4. Non-Functional Requirements (NFR)

| ID | Category | Requirement Specification |
|:---|:---|:---|
| **NFR-1** | **Security** | Zero plaintext credentials; passwords hashed with bcrypt; credentials transmitted over HTTPS; JWT tokens stored in HttpOnly cookies with CSRF SameSite protection. |
| **NFR-2** | **SQL Safety** | All database queries executed via parameterized placeholders (`$1, $2`) using PostgreSQL native driver; zero string concatenation. |
| **NFR-3** | **Financial Integrity** | Monetary values stored using `NUMERIC(14,2)` to prevent binary floating-point roundoff errors; customer snapshots prevent historical billing corruption. |
| **NFR-4** | **Performance** | API response time $< 200\text{ms}$ for paginated table queries up to 100,000 records supported by targeted B-Tree indexes. |
| **NFR-5** | **Availability** | Stateless backend architecture allowing horizontal container scaling behind an Nginx reverse proxy or load balancer. |
| **NFR-6** | **Usability** | Responsive web interface supporting desktop dispatch monitors, tablets, and mobile field inspection devices. |
