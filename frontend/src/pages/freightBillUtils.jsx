import { useState } from 'react';
import { BlobProvider, PDFDownloadLink, PDFViewer } from '@react-pdf/renderer';
import { FiDownload, FiExternalLink } from 'react-icons/fi';
import FreightBillPdf from '../components/FreightBillPdf';
import FormField, { inputClass } from '../components/FormField';
import Modal from '../components/Modal';

export const today = new Date().toISOString().slice(0, 10);

export const money = (value = 0) =>
  new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value || 0));

export const displayBillStatus = (value) => (value === 'Bill Generated' ? 'Bill Generated' : 'Not Billed');

export const displayPaymentStatus = (row) =>
  displayBillStatus(row.billStatus) === 'Bill Generated' ? row.paymentStatus || 'Pending' : '-';

export const paymentStatusTextClass = (status) => {
  if (status === 'Paid') return 'text-emerald-600';
  if (status === 'Partially Paid') return 'text-amber-600';
  return 'text-red-600';
};

export const billPendingAmount = (bill) =>
  Number(bill?.pendingAmount ?? (Number(bill?.grandTotal || 0) - Number(bill?.paidAmount || 0)));

const paymentModeOptions = ['Cash', 'Cheque', 'Bank Transfer', 'UPI', 'Other'];

export const toISODate = (date) => date.toISOString().slice(0, 10);

export const datePresets = [
  { key: 'last2', label: 'Last 2 Days', days: 2 },
  { key: 'last7', label: 'Last 7 Days', days: 7 },
  { key: 'lastMonth', label: 'Last Month', days: 30 },
  { key: 'all', label: 'All' },
];

export const consignmentStatusFilters = [
  { key: 'all', label: 'All' },
  { key: 'billGenerated', label: 'Bill Generated' },
  { key: 'notBilled', label: 'Not Billed' },
  { key: 'paid', label: 'Paid' },
  { key: 'unpaid', label: 'Unpaid' },
];

const pdfFileName = (bill) => `Freight-Bill-${String(bill?.billNumber || 'Draft').replace(/[^\w.-]+/g, '-')}.pdf`;

export const PdfActions = ({ bill }) => {
  return (
    <div className="flex flex-wrap gap-2">
      <PDFDownloadLink
        document={<FreightBillPdf bill={bill} />}
        fileName={pdfFileName(bill)}
        className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2.5 font-semibold text-white"
      >
        {({ loading }) => {
          return (
            <span className="inline-flex items-center gap-2">
              <FiDownload />
              {loading ? 'Preparing PDF...' : 'Download PDF'}
            </span>
          );
        }}
      </PDFDownloadLink>
      <BlobProvider document={<FreightBillPdf bill={bill} />}>
        {({ url, loading }) => {
          const linkClassName = 'inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 font-semibold text-white' + (loading || !url ? ' pointer-events-none opacity-60' : '');
          return (
            <a href={url || undefined} target="_blank" rel="noreferrer" className={linkClassName}>
              <FiExternalLink />
              {loading ? 'Preparing...' : 'Open / Print'}
            </a>
          );
        }}
      </BlobProvider>
    </div>
  );
};

export const PdfPreview = ({ bill }) => {
  return (
    <div className="h-[78vh] overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
      <PDFViewer width="100%" height="100%" showToolbar>
        <FreightBillPdf bill={bill} />
      </PDFViewer>
    </div>
  );
};

export const RecordPaymentModal = ({ bill, onClose, onSubmit, isSubmitting }) => {
  const pending = billPendingAmount(bill);
  const [amount, setAmount] = useState(pending > 0 ? pending.toFixed(2) : '');
  const [paymentDate, setPaymentDate] = useState(today);
  const [mode, setMode] = useState('Cash');
  const [notes, setNotes] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({ amount: Number(amount), paymentDate, mode, notes });
  };

  return (
    <Modal title={`Record Payment - ${bill.billNumber || 'Draft'}`} onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <p className="text-sm text-slate-500">
          Grand Total Rs. {money(bill.grandTotal)} | Paid Rs. {money(bill.paidAmount)} | Pending Rs. {money(pending)}
        </p>
        <FormField label="Amount">
          <input
            type="number"
            min="0.01"
            step="0.01"
            max={pending > 0 ? pending : undefined}
            className={inputClass}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />
        </FormField>
        <FormField label="Payment Date">
          <input
            type="date"
            className={inputClass}
            value={paymentDate}
            onChange={(event) => setPaymentDate(event.target.value)}
            required
          />
        </FormField>
        <FormField label="Mode">
          <select className={inputClass} value={mode} onChange={(event) => setMode(event.target.value)}>
            {paymentModeOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Notes">
          <input
            type="text"
            className={inputClass}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional"
          />
        </FormField>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-md border border-slate-200 px-4 py-2 font-semibold text-slate-700">
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !amount || Number(amount) <= 0}
            className="rounded-md bg-accent px-4 py-2 font-semibold text-white disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save Payment'}
          </button>
        </div>
      </form>
    </Modal>
  );
};