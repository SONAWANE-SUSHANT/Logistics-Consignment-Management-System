import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

// Compact layout tuned to match the physical Tanushree Logistics bill format.
const ROW_HEIGHT = 15.5;
const FIRST_PAGE_ROWS = 41;
const CONTINUATION_PAGE_ROWS = 44;
const LAST_PAGE_ROWS = 31;

const company = {
  name: 'Tanushree Logistics',
  branch: 'Branch Off.- P.No.5, Gut No.53, Wadgaon,',
  city: 'Chhatrapati Sambhajinagar-431136',
  phone: '9529384849',
  email: 'tanushreelogistics09@gmail.com',
  gst: '27AAAGCS4976E2Z0',
  bankName: 'HDFC BANK',
  bankBranch: 'AKASHWANI, JALNA ROAD, AURANGABAD-431001',
  account: '50200104484950',
  ifsc: 'HDFC0000113',
};

const columns = [
  ['Sr.No.', '5%'],
  ['LR No.', '7%'],
  ['LR Date', '7%'],
  ['From', '8%'],
  ['To', '8%'],
  ['Inv.No.', '14%'],
  ['Inv.Date', '7%'],
  ['Weight', '6%'],
  ['Freight', '7%'],
  ['Collection', '8%'],
  ['Door Del.', '8%'],
  ['LR Charg', '7%'],
  ['Amt.', '8%'],
];

const safe = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

const money = (value = 0, decimals = 2) =>
  new Intl.NumberFormat('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(Number(value || 0));

const number = (value = 0) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(value || 0));

const compactDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(date);
};

const address = (customer = {}) => [customer.address, customer.city, customer.state, customer.pincode].filter(Boolean).join(', ');

const splitPages = (items) => {
  const lines = items?.length ? items : [];
  if (lines.length <= LAST_PAGE_ROWS) return [{ items: lines, showSummary: true }];

  const pages = [];
  let index = 0;

  while (lines.length - index > LAST_PAGE_ROWS) {
    const remaining = lines.length - index;
    const maxRows = pages.length ? CONTINUATION_PAGE_ROWS : FIRST_PAGE_ROWS;

    if (remaining <= maxRows) {
      pages.push({ items: lines.slice(index), showSummary: false });
      pages.push({ items: [], showSummary: true });
      return pages;
    }

    const rowsThisPage = remaining <= maxRows + LAST_PAGE_ROWS ? remaining - LAST_PAGE_ROWS : maxRows;
    pages.push({ items: lines.slice(index, index + rowsThisPage), showSummary: false });
    index += rowsThisPage;
  }

  pages.push({ items: lines.slice(index), showSummary: true });
  return pages;
};

const styles = StyleSheet.create({
  page: {
    padding: 14,
    fontFamily: 'Times-Roman',
    fontSize: 8,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  sheet: {
    borderWidth: 1.2,
    borderColor: '#111827',
  },
  header: {
    flexDirection: 'row',
    minHeight: 70,
    borderBottomWidth: 1.2,
    borderColor: '#111827',
  },
  sealWrap: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seal: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.4,
    borderColor: '#9f3412',
    color: '#9f3412',
    textAlign: 'center',
    paddingTop: 9,
    fontFamily: 'Times-Bold',
    fontSize: 11,
  },
  company: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  billTitle: {
    fontFamily: 'Times-Bold',
    fontSize: 8,
    marginBottom: 1,
  },
  companyName: {
    fontFamily: 'Times-Bold',
    fontSize: 20,
    color: '#1e3a8a',
    marginBottom: 1,
  },
  companyLine: {
    fontFamily: 'Times-Bold',
    fontSize: 8.6,
  },
  billMeta: {
    width: 110,
    borderLeftWidth: 1.2,
    borderColor: '#111827',
    justifyContent: 'flex-end',
  },
  metaRow: {
    flexDirection: 'row',
    minHeight: 18,
    borderTopWidth: 1.2,
    borderColor: '#111827',
  },
  metaLabel: {
    width: 40,
    padding: 3,
    fontFamily: 'Times-Bold',
    fontSize: 7.6,
  },
  metaValue: {
    flex: 1,
    padding: 3,
    fontFamily: 'Times-Bold',
    fontSize: 7.6,
  },
  party: {
    flexDirection: 'row',
    minHeight: 30,
    borderBottomWidth: 1.2,
    borderColor: '#111827',
  },
  partyMain: {
    flex: 1,
    padding: 4,
  },
  partyName: {
    fontFamily: 'Times-Bold',
    fontSize: 10.5,
    marginBottom: 2,
  },
  partyAddress: {
    fontFamily: 'Times-Bold',
    fontSize: 7.6,
  },
  gstBox: {
    width: 160,
    borderLeftWidth: 1.2,
    borderColor: '#111827',
    padding: 5,
    fontFamily: 'Times-Bold',
    fontSize: 8,
  },
  table: {
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    minHeight: 17,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1.2,
    borderColor: '#111827',
  },
  th: {
    paddingVertical: 3,
    paddingHorizontal: 2,
    textAlign: 'center',
    fontFamily: 'Times-Bold',
    fontSize: 7.4,
    borderRightWidth: 1,
    borderColor: '#111827',
  },
  row: {
    flexDirection: 'row',
    minHeight: ROW_HEIGHT,
    borderBottomWidth: 0.8,
    borderColor: '#111827',
  },
  cell: {
    paddingVertical: 2,
    paddingHorizontal: 2.5,
    borderRightWidth: 1,
    borderColor: '#111827',
    fontSize: 7,
  },
  centered: {
    textAlign: 'center',
  },
  right: {
    textAlign: 'right',
  },
  noRightBorder: {
    borderRightWidth: 0,
  },
  continued: {
    padding: 4,
    textAlign: 'right',
    fontSize: 7.4,
    fontFamily: 'Times-Italic',
  },
  totalRow: {
    flexDirection: 'row',
    minHeight: 19,
    borderBottomWidth: 1.2,
    borderColor: '#111827',
    fontFamily: 'Times-Bold',
    fontSize: 8.4,
  },
  totalLeft: {
    width: '33%',
    padding: 4,
    borderRightWidth: 1,
    borderColor: '#111827',
  },
  totalRate: {
    width: '35%',
    padding: 4,
    borderRightWidth: 1,
    borderColor: '#111827',
  },
  totalBlank: {
    flex: 1,
    borderRightWidth: 1,
    borderColor: '#111827',
  },
  totalAmount: {
    width: '8%',
    padding: 4,
    textAlign: 'right',
  },
  taxRow: {
    flexDirection: 'row',
    minHeight: 18,
    borderBottomWidth: 1.2,
    borderColor: '#111827',
    fontFamily: 'Times-Bold',
    fontSize: 8.4,
  },
  taxBlank: {
    flex: 1,
    borderRightWidth: 1,
    borderColor: '#111827',
  },
  taxLabel: {
    width: 95,
    padding: 4,
    borderRightWidth: 1,
    borderColor: '#111827',
  },
  taxAmount: {
    width: 65,
    padding: 4,
    textAlign: 'right',
  },
  words: {
    padding: 5,
    minHeight: 20,
    borderBottomWidth: 1.2,
    borderColor: '#111827',
    fontFamily: 'Times-Bold',
    fontSize: 8.4,
  },
  footer: {
    flexDirection: 'row',
    minHeight: 62,
  },
  bank: {
    width: '38%',
    padding: 6,
    fontSize: 7.6,
  },
  bankTitle: {
    fontFamily: 'Times-Bold',
    textDecoration: 'underline',
    marginBottom: 3,
    fontSize: 7.6,
  },
  bankName: {
    fontFamily: 'Times-Bold',
    color: '#1e3a8a',
    fontSize: 12,
    marginBottom: 2,
  },
  customerStamp: {
    flex: 1,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    color: '#64748b',
    fontFamily: 'Times-Bold',
    textTransform: 'uppercase',
    textAlign: 'center',
    fontSize: 8,
  },
  sign: {
    width: 120,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  roundStamp: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.4,
    borderColor: '#475569',
    color: '#475569',
    textAlign: 'center',
    paddingTop: 14,
    marginBottom: 4,
    fontSize: 6.6,
  },
  signatureText: {
    fontFamily: 'Times-Bold',
    fontSize: 8,
  },
  pageNumber: {
    position: 'absolute',
    bottom: 5,
    right: 14,
    fontSize: 6.6,
    color: '#64748b',
  },
});

const Header = ({ bill }) => (
  <>
    <View style={styles.header}>
      <View style={styles.sealWrap}>
        <Text style={styles.seal}>TL</Text>
      </View>
      <View style={styles.company}>
        <Text style={styles.billTitle}>Freight Bill</Text>
        <Text style={styles.companyName}>{company.name}</Text>
        <Text style={styles.companyLine}>{company.branch}</Text>
        <Text style={styles.companyLine}>{company.city}</Text>
        <Text style={styles.companyLine}>Ph.No.{company.phone}     Email ID:- {company.email}</Text>
      </View>
      <View style={styles.billMeta}>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Mode:-</Text>
          <Text style={styles.metaValue}>{bill.mode || 'Road'}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Bill No.</Text>
          <Text style={styles.metaValue}>{bill.billNumber || 'Draft'}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Date:</Text>
          <Text style={styles.metaValue}>{compactDate(bill.billDate || new Date())}</Text>
        </View>
      </View>
    </View>
    <View style={styles.party}>
      <View style={styles.partyMain}>
        <Text style={styles.partyName}>M/s {safe(bill.customerSnapshot?.companyName)}</Text>
        <Text style={styles.partyAddress}>Address- {address(bill.customerSnapshot)}</Text>
      </View>
      <Text style={styles.gstBox}>GST NO.{bill.customerSnapshot?.gstNumber || company.gst}</Text>
    </View>
  </>
);

const TableHeader = () => (
  <View style={styles.tableHeader} wrap={false}>
    {columns.map(([label, width], index) => (
      <Text key={label} style={[styles.th, { width }, index === columns.length - 1 && styles.noRightBorder]}>{label}</Text>
    ))}
  </View>
);

const TableRow = ({ item }) => {
  const values = [
    item.srNo,
    item.lrNumber,
    compactDate(item.lrDate),
    item.from,
    item.to,
    item.invoiceNumber,
    compactDate(item.invoiceDate),
    number(item.weight),
    number(item.freight),
    number(item.collectionCharges),
    number(item.doorDeliveryCharges),
    number(Number(item.lrCharges || 0) + Number(item.otherCharges || 0)),
    number(item.amount),
  ];

  return (
    <View style={styles.row} wrap={false}>
      {columns.map(([, width], index) => (
        <Text
          key={`${item.srNo}-${index}`}
          maxLines={index === 5 ? 2 : 1}
          style={[
            styles.cell,
            { width },
            [0, 1, 2, 6].includes(index) && styles.centered,
            index >= 7 && styles.right,
            index === columns.length - 1 && styles.noRightBorder,
          ]}
        >
          {values[index] || ''}
        </Text>
      ))}
    </View>
  );
};

const LastPageSummary = ({ bill }) => {
  const lines = bill.lineItems || [];
  const totalFreight = lines.reduce((sum, item) => sum + Number(item.freight || 0), 0);
  const totalWeight = lines.reduce((sum, item) => sum + Number(item.weight || 0), 0);
  const averageRate = Number(bill.ratePerKg || 0) || (totalWeight ? totalFreight / totalWeight : 0);

  return (
    <View wrap={false}>
      <View style={styles.totalRow} wrap={false}>
        <Text style={styles.totalLeft}>TOTAL</Text>
        <Text style={styles.totalRate}>Rate- Rs.{averageRate ? money(averageRate) : ''} Per Kg.</Text>
        <View style={styles.totalBlank} />
        <Text style={styles.totalAmount}>{money(bill.taxableAmount)}</Text>
      </View>
      <View style={styles.taxRow} wrap={false}>
        <View style={styles.taxBlank} />
        <Text style={styles.taxLabel}>CGST @ {money(bill.cgstRate)}</Text>
        <Text style={styles.taxAmount}>{money(bill.cgstAmount)}</Text>
      </View>
      <View style={styles.taxRow} wrap={false}>
        <View style={styles.taxBlank} />
        <Text style={styles.taxLabel}>SGST @ {money(bill.sgstRate)}</Text>
        <Text style={styles.taxAmount}>{money(bill.sgstAmount)}</Text>
      </View>
      {!!Number(bill.igstAmount || 0) && (
        <View style={styles.taxRow} wrap={false}>
          <View style={styles.taxBlank} />
          <Text style={styles.taxLabel}>IGST @ {money(bill.igstRate)}</Text>
          <Text style={styles.taxAmount}>{money(bill.igstAmount)}</Text>
        </View>
      )}
      <View style={styles.taxRow} wrap={false}>
        <View style={styles.taxBlank} />
        <Text style={styles.taxLabel}>Grand Total</Text>
        <Text style={styles.taxAmount}>{money(bill.grandTotal, 0)}</Text>
      </View>
      {bill.paidAmount !== undefined && bill.paidAmount !== null && (
        <>
          <View style={styles.taxRow} wrap={false}>
            <View style={styles.taxBlank} />
            <Text style={styles.taxLabel}>Paid Amount</Text>
            <Text style={styles.taxAmount}>{money(bill.paidAmount, 0)}</Text>
          </View>
          <View style={styles.taxRow} wrap={false}>
            <View style={styles.taxBlank} />
            <Text style={styles.taxLabel}>Balance Due</Text>
            <Text style={styles.taxAmount}>{money(bill.pendingAmount ?? (bill.grandTotal - bill.paidAmount), 0)}</Text>
          </View>
          <View style={styles.taxRow} wrap={false}>
            <View style={styles.taxBlank} />
            <Text style={styles.taxLabel}>Payment Status</Text>
            <Text style={styles.taxAmount}>{bill.status || 'Unpaid'}</Text>
          </View>
        </>
      )}
      <Text style={styles.words}>In words:- {bill.amountInWords}</Text>
      <View style={styles.footer} wrap={false}>
        <View style={styles.bank}>
          <Text style={styles.bankTitle}>Bank Detail</Text>
          <Text style={styles.bankName}>{company.bankName}</Text>
          <Text>{company.bankBranch}</Text>
          <Text>A/C NO.{company.account}</Text>
          <Text>IFSC : {company.ifsc}</Text>
        </View>
        <View style={styles.customerStamp}>
          <Text>{bill.customerSnapshot?.companyName}</Text>
        </View>
        <View style={styles.sign}>
          <Text style={styles.roundStamp}>Auth.{"\n"}Signatory</Text>
          <Text style={styles.signatureText}>Authorised Signatory</Text>
        </View>
      </View>
    </View>
  );
};

const FreightBillPdf = ({ bill }) => {
  const safeBill = bill || { lineItems: [], customerSnapshot: {} };
  const billHasNoItems = (safeBill.lineItems || []).length === 0;
  const pages = splitPages(safeBill.lineItems || []);

  return (
    <Document title={`Freight Bill ${safeBill.billNumber || 'Draft'}`} author={company.name}>
      {pages.map((page, pageIndex) => {
        const items = page.items;
        return (
          <Page key={`page-${pageIndex}`} size="A4" style={styles.page}>
            <View style={styles.sheet}>
              <Header bill={safeBill} />
              <View style={styles.table}>
                <TableHeader />
                {items.length ? (
                  items.map((item) => <TableRow key={`${item.lrNumber}-${item.srNo}`} item={item} />)
                ) : billHasNoItems ? (
                  <View style={styles.row}>
                    <Text style={[styles.cell, styles.centered, styles.noRightBorder, { width: '100%', minHeight: 42 }]}>
                      No consignments found for this customer and date range.
                    </Text>
                  </View>
                ) : null}
              </View>
              {page.showSummary ? <LastPageSummary bill={safeBill} /> : <Text style={styles.continued}>Continued on next page...</Text>}
            </View>
            <Text style={styles.pageNumber}>Page {pageIndex + 1} of {pages.length}</Text>
          </Page>
        );
      })}
    </Document>
  );
};

export default FreightBillPdf;