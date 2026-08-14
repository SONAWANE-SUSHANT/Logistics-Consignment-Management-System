import { useEffect, useState, useCallback } from 'react';

// Adjust this if your API is mounted elsewhere / behind a different prefix
const API_BASE = '/api/admin/billing';

const TABS = [
  { key: 'partially-paid', label: 'Partially Paid' },
  { key: 'unpaid', label: 'Unpaid' },
  { key: 'paid', label: 'Paid' },
];

const currency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const dateFmt = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('en-IN');
};

const statusBadgeClass = (status) => {
  switch (status) {
    case 'Paid':
      return 'bg-emerald-100 text-emerald-700';
    case 'Partially Paid':
      return 'bg-amber-100 text-amber-700';
    case 'Unpaid':
      return 'bg-rose-100 text-rose-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
};

const SummaryCard = ({ label, value, sub }) => (
  <div className="rounded-lg border border-slate-200 p-4">
    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-1 text-xl font-semibold text-slate-950">{value}</p>
    {sub ? <p className="mt-0.5 text-xs text-slate-500">{sub}</p> : null}
  </div>
);

const AdminBillingPanel = () => {
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState(null);

  const [activeTab, setActiveTab] = useState('partially-paid');
  const [bills, setBills] = useState([]);
  const [billsLoading, setBillsLoading] = useState(true);
  const [billsError, setBillsError] = useState(null);
  const [limit, setLimit] = useState(25);

  const fetchJson = useCallback(async (url) => {
    const res = await fetch(url, { credentials: 'include' });
    const payload = await res.json().catch(() => null);
    if (!res.ok || !payload?.success) {
      throw new Error(payload?.message || `Request failed (${res.status})`);
    }
    return payload.data;
  }, []);

  useEffect(() => {
    let cancelled = false;
    setSummaryLoading(true);
    setSummaryError(null);

    fetchJson(`${API_BASE}/summary`)
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch((err) => {
        if (!cancelled) setSummaryError(err.message);
      })
      .finally(() => {
        if (!cancelled) setSummaryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchJson]);

  useEffect(() => {
    let cancelled = false;
    setBillsLoading(true);
    setBillsError(null);

    fetchJson(`${API_BASE}/${activeTab}?limit=${limit}`)
      .then((data) => {
        if (!cancelled) setBills(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!cancelled) setBillsError(err.message);
      })
      .finally(() => {
        if (!cancelled) setBillsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, limit, fetchJson]);

  return (
    <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Admin Billing</h2>
          <p className="text-sm text-slate-500">Live totals and bill status pulled from freight billing.</p>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-5">
        {summaryLoading ? (
          <p className="text-sm text-slate-500">Loading summary…</p>
        ) : summaryError ? (
          <p className="text-sm text-rose-600">{summaryError}</p>
        ) : summary ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label="Total Bills" value={summary.totalBills} />
            <SummaryCard label="Total Billed" value={currency(summary.totalBilled)} />
            <SummaryCard label="Total Paid" value={currency(summary.totalPaid)} />
            <SummaryCard label="Total Pending" value={currency(summary.totalPending)} />
            <SummaryCard label="Unpaid Bills" value={summary.unpaidBills} />
            <SummaryCard label="Partially Paid Bills" value={summary.partiallyPaidBills} />
            <SummaryCard label="Paid Bills" value={summary.paidBills} />
          </div>
        ) : null}
      </div>

      {/* Tabs */}
      <div className="mt-6 flex items-center gap-2 border-b border-slate-200">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${
              activeTab === tab.key
                ? 'border-slate-900 text-slate-950'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bills table */}
      <div className="mt-4 overflow-x-auto">
        {billsLoading ? (
          <p className="py-6 text-sm text-slate-500">Loading bills…</p>
        ) : billsError ? (
          <p className="py-6 text-sm text-rose-600">{billsError}</p>
        ) : bills.length === 0 ? (
          <p className="py-6 text-sm text-slate-500">No bills found for this status.</p>
        ) : (
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead>
              <tr className="text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4">Bill #</th>
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Company</th>
                <th className="py-2 pr-4">City</th>
                <th className="py-2 pr-4">GST</th>
                <th className="py-2 pr-4 text-right">Grand Total</th>
                <th className="py-2 pr-4 text-right">Paid</th>
                <th className="py-2 pr-4 text-right">Pending</th>
                <th className="py-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bills.map((bill) => (
                <tr key={bill.id}>
                  <td className="py-2 pr-4 font-medium text-slate-900">{bill.billNumber}</td>
                  <td className="py-2 pr-4 text-slate-600">{dateFmt(bill.billDate)}</td>
                  <td className="py-2 pr-4 text-slate-600">{bill.companyName}</td>
                  <td className="py-2 pr-4 text-slate-600">{bill.city}</td>
                  <td className="py-2 pr-4 text-slate-600">{bill.gstNumber || '-'}</td>
                  <td className="py-2 pr-4 text-right text-slate-900">{currency(bill.grandTotal)}</td>
                  <td className="py-2 pr-4 text-right text-slate-600">{currency(bill.paidAmount)}</td>
                  <td className="py-2 pr-4 text-right text-slate-600">{currency(bill.pendingAmount)}</td>
                  <td className="py-2 pr-4">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(bill.status)}`}>
                      {bill.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!billsLoading && !billsError && bills.length >= limit && (
        <button
          type="button"
          onClick={() => setLimit((l) => l + 25)}
          className="mt-4 rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Load more
        </button>
      )}
    </section>
  );
};

export default AdminBillingPanel;