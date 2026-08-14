import { useCallback, useEffect, useId, useRef, useState } from 'react';

const API_BASE = '/api/admin/billing';
const AI_API_URL = '/api/admin/ai/ask';

const TABS = [
  { key: 'partially-paid', label: 'Partially Paid', dot: 'bg-amber-500', countKey: 'partiallyPaidBills' },
  { key: 'unpaid', label: 'Unpaid', dot: 'bg-rose-500', countKey: 'unpaidBills' },
  { key: 'paid', label: 'Paid', dot: 'bg-emerald-500', countKey: 'paidBills' },
];

const SUGGESTIONS = [
  'What is the total pending amount?',
  'How many bills are unpaid?',
  'List the largest partially paid bills',
];

/* ---------- formatting helpers ---------- */

const currency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const compactCurrency = (value) =>
  new Intl.NumberFormat('en-IN', {
    notation: 'compact',
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 1,
  }).format(Number(value || 0));

const dateFmt = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const STATUS_STYLES = {
  Paid: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
  'Partially Paid': 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
  Unpaid: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200',
};

const StatusBadge = ({ status }) => (
  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status] || 'bg-slate-100 text-slate-600'}`}>
    {status}
  </span>
);

/* ---------- small icons (inline, no extra dependency) ---------- */

const ChevronIcon = ({ open }) => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
  >
    <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SparkIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
    <path d="M10 2.5 11.4 7 16 8.4 11.4 9.8 10 14.3 8.6 9.8 4 8.4 8.6 7 10 2.5Z" fill="currentColor" />
  </svg>
);

/* ---------- KPI card ---------- */

const KpiCard = ({ label, value, tone }) => (
  <div className={`rounded-md border p-3 ${tone === 'pending' ? 'border-amber-200 bg-amber-50/60' : 'border-slate-200 bg-white'}`}>
    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
    <p className={`mt-1 text-lg font-semibold ${tone === 'pending' ? 'text-amber-700' : 'text-slate-900'}`}>{value}</p>
  </div>
);

/* ---------- Billing Assistant (integrated, not a generic chat widget) ---------- */

const BillingAssistant = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const history = messages.map(({ role, content }) => ({ role, content }));
    setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(AI_API_URL, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, history }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success) throw new Error(payload?.message || `Request failed (${res.status})`);
      setMessages((prev) => [...prev, { role: 'assistant', content: payload.data.reply }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col rounded-md border border-slate-200 bg-slate-50">
      <div className="flex items-center gap-2 border-b border-slate-200 px-3.5 py-2.5">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white">
          <SparkIcon />
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-900">Billing Assistant</p>
          <p className="text-[11px] text-slate-500">Answers grounded in your live bill data</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-2.5 overflow-y-auto px-3.5 py-3" style={{ minHeight: '14rem', maxHeight: '18rem' }}>
        {messages.length === 0 && !loading ? (
          <div className="flex h-full flex-col justify-center gap-2">
            <p className="text-xs text-slate-500">Try asking:</p>
            <div className="flex flex-col gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-left text-xs text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[90%] whitespace-pre-wrap rounded-md px-2.5 py-1.5 text-xs leading-relaxed ${
                  m.role === 'user' ? 'bg-slate-900 text-white' : 'bg-white text-slate-800 ring-1 ring-slate-200'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))
        )}
        {loading && <p className="text-xs text-slate-400">Checking the numbers…</p>}
      </div>

      {error && <p className="px-3.5 pb-1 text-xs text-rose-600">{error}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-1.5 border-t border-slate-200 p-2.5"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about bill status…"
          className="flex-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:border-slate-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
        >
          Ask
        </button>
      </form>
    </div>
  );
};

/* ---------- main section ---------- */

const AdminBillingSection = () => {
  const panelId = useId();
  const [open, setOpen] = useState(false);

  const [summary, setSummary] = useState(null);
  const [summaryError, setSummaryError] = useState(null);

  const [activeTab, setActiveTab] = useState('partially-paid');
  const [bills, setBills] = useState([]);
  const [billsLoading, setBillsLoading] = useState(false);
  const [billsError, setBillsError] = useState(null);
  const [limit, setLimit] = useState(25);

  const fetchJson = useCallback(async (url) => {
    const res = await fetch(url, { credentials: 'include' });
    const payload = await res.json().catch(() => null);
    if (!res.ok || !payload?.success) throw new Error(payload?.message || `Request failed (${res.status})`);
    return payload.data;
  }, []);

  // Summary loads once on mount so the collapsed header can show a live glance.
  useEffect(() => {
    let cancelled = false;
    fetchJson(`${API_BASE}/summary`)
      .then((data) => !cancelled && setSummary(data))
      .catch((err) => !cancelled && setSummaryError(err.message));
    return () => {
      cancelled = true;
    };
  }, [fetchJson]);

  // Bill list only fetches once the section is actually opened — avoids
  // unnecessary work while collapsed.
  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setBillsLoading(true);
    setBillsError(null);

    fetchJson(`${API_BASE}/${activeTab}?limit=${limit}`)
      .then((data) => !cancelled && setBills(Array.isArray(data) ? data : []))
      .catch((err) => !cancelled && setBillsError(err.message))
      .finally(() => !cancelled && setBillsLoading(false));

    return () => {
      cancelled = true;
    };
  }, [open, activeTab, limit, fetchJson]);

  const changeTab = (key) => {
    setActiveTab(key);
    setLimit(25);
  };

  return (
    <section className="rounded-lg bg-white shadow-sm ring-1 ring-slate-200">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-4 rounded-lg px-5 py-4 text-left hover:bg-slate-50"
      >
        <div className="flex items-center gap-3">
          <ChevronIcon open={open} />
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Admin Billing</h2>
            <p className="text-xs text-slate-500">Freight bill status, totals, and the billing assistant</p>
          </div>
        </div>

        {summary && (
          <div className="hidden shrink-0 items-center gap-4 text-xs sm:flex">
            <span className="text-slate-500">
              Pending <span className="font-semibold text-amber-700">{compactCurrency(summary.totalPending)}</span>
            </span>
            <span className="text-slate-500">
              Unpaid <span className="font-semibold text-rose-700">{summary.unpaidBills}</span>
            </span>
          </div>
        )}
      </button>

      <div
        id={panelId}
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-slate-200 p-5">
            {summaryError && <p className="mb-4 text-sm text-rose-600">{summaryError}</p>}

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
              {/* Main column: KPIs, tabs, table */}
              <div className="space-y-5">
                {/* KPI row */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <KpiCard label="Total Bills" value={summary ? summary.totalBills : '—'} />
                  <KpiCard label="Total Billed" value={summary ? currency(summary.totalBilled) : '—'} />
                  <KpiCard label="Total Paid" value={summary ? currency(summary.totalPaid) : '—'} />
                  <KpiCard label="Total Pending" value={summary ? currency(summary.totalPending) : '—'} tone="pending" />
                </div>

                {/* Tabs (status counts live in the tab badges) */}
                <div>
                  <div className="flex items-center gap-1 border-b border-slate-200">
                    {TABS.map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => changeTab(tab.key)}
                        aria-selected={activeTab === tab.key}
                        className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition ${
                          activeTab === tab.key
                            ? 'border-slate-900 text-slate-950'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${tab.dot}`} />
                        {tab.label}
                        {summary && (
                          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                            {summary[tab.countKey]}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Table */}
                  <div className="mt-3 max-h-[420px] overflow-auto rounded-md border border-slate-200">
                    {billsLoading ? (
                      <p className="p-6 text-center text-sm text-slate-500">Loading bills…</p>
                    ) : billsError ? (
                      <p className="p-6 text-center text-sm text-rose-600">{billsError}</p>
                    ) : bills.length === 0 ? (
                      <p className="p-6 text-center text-sm text-slate-500">No bills found for this status.</p>
                    ) : (
                      <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="sticky top-0 z-10 bg-slate-50">
                          <tr className="text-left text-[11px] font-medium uppercase tracking-wide text-slate-500">
                            <th className="px-3 py-2">Bill #</th>
                            <th className="px-3 py-2">Date</th>
                            <th className="px-3 py-2">Company</th>
                            <th className="px-3 py-2">City</th>
                            <th className="px-3 py-2">GST</th>
                            <th className="px-3 py-2 text-right">Grand Total</th>
                            <th className="px-3 py-2 text-right">Paid</th>
                            <th className="px-3 py-2 text-right">Pending</th>
                            <th className="px-3 py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {bills.map((bill) => (
                            <tr key={bill.id} className="hover:bg-slate-50">
                              <td className="px-3 py-2 font-medium text-slate-900">{bill.billNumber}</td>
                              <td className="whitespace-nowrap px-3 py-2 text-slate-600">{dateFmt(bill.billDate)}</td>
                              <td className="max-w-[160px] truncate px-3 py-2 text-slate-600" title={bill.companyName}>
                                {bill.companyName}
                              </td>
                              <td className="px-3 py-2 text-slate-600">{bill.city}</td>
                              <td className="px-3 py-2 text-slate-600">{bill.gstNumber || '-'}</td>
                              <td className="px-3 py-2 text-right text-slate-900">{currency(bill.grandTotal)}</td>
                              <td className="px-3 py-2 text-right text-slate-600">{currency(bill.paidAmount)}</td>
                              <td className="px-3 py-2 text-right text-slate-600">{currency(bill.pendingAmount)}</td>
                              <td className="px-3 py-2">
                                <StatusBadge status={bill.status} />
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
                      className="mt-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                    >
                      Load 25 more
                    </button>
                  )}
                </div>
              </div>

              {/* Side column: integrated assistant */}
              <div className="lg:sticky lg:top-4 lg:self-start">
                <BillingAssistant />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AdminBillingSection;