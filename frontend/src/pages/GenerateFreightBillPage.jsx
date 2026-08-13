import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { FiFileText } from 'react-icons/fi';
import DataTable from '../components/DataTable';
import FormField, { inputClass } from '../components/FormField';
import Modal from '../components/Modal';
import { api, listParams } from '../services/api';
import { formatDate } from '../utils/formatters';
import { ConsignmentForm } from './ConsignmentsPage';
import { TripForm } from './TripsPage';
import {
  today,
  money,
  displayBillStatus,
  displayPaymentStatus,
  toISODate,
  datePresets,
  consignmentStatusFilters,
  PdfActions,
  PdfPreview,
} from './freightBillUtils';

const GenerateFreightBillPage = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ customerId: '', fromDate: today, toDate: today, ratePerKg: '', cgstRate: 9, sgstRate: 9, igstRate: 0 });
  const [datePreset, setDatePreset] = useState('custom');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedConsignmentIds, setSelectedConsignmentIds] = useState([]);
  const [editingConsignment, setEditingConsignment] = useState(null);
  const [tripModal, setTripModal] = useState(false);
  const [preview, setPreview] = useState(null);

  const { data: customerData } = useQuery({ queryKey: ['customers', 'freight-bill'], queryFn: async () => (await api.get('/customers', { params: { limit: 500, sort: 'companyName' } })).data });
  const { data: tripData } = useQuery({ queryKey: ['trips', 'freight-bill-edit'], queryFn: async () => (await api.get('/trips', { params: { limit: 500 } })).data });
  const { data: consignmentData, isFetching: isFetchingConsignments } = useQuery({
    queryKey: ['freight-bill-consignments', filters.customerId, filters.fromDate, filters.toDate],
    queryFn: async () => (await api.get('/freight-bills/consignments', { params: listParams({ customerId: filters.customerId, fromDate: filters.fromDate, toDate: filters.toDate }) })).data,
    // FIX: previously required fromDate && toDate too, which are intentionally '' when
    // the "All" date preset is selected — that made this query disabled and no
    // consignments would ever load. Only customerId is actually required to fetch.
    enabled: Boolean(filters.customerId),
  });

  const selectedCustomer = useMemo(
    () => (customerData?.customers || []).find((customer) => customer._id === filters.customerId),
    [customerData, filters.customerId]
  );

  const billConsignments = consignmentData?.consignments || [];
  const filteredConsignments = billConsignments.filter((item) => {
    const billStatusValue = displayBillStatus(item.billStatus);
    const paymentStatusValue = displayPaymentStatus(item);
    if (statusFilter === 'billGenerated') return billStatusValue === 'Bill Generated';
    if (statusFilter === 'notBilled') return billStatusValue !== 'Bill Generated';
    if (statusFilter === 'paid') return billStatusValue === 'Bill Generated' && paymentStatusValue === 'Paid';
    if (statusFilter === 'unpaid') return billStatusValue === 'Bill Generated' && paymentStatusValue !== 'Paid';
    return true;
  });
  const selectableConsignments = filteredConsignments.filter((item) => item.canSelectForBill !== false && displayBillStatus(item.billStatus) !== 'Bill Generated');
  const allConsignmentsSelected = selectableConsignments.length > 0 && selectableConsignments.every((item) => selectedConsignmentIds.includes(item._id));
  const ratePerKg = Number(filters.ratePerKg || 0);

  useEffect(() => {
    setSelectedConsignmentIds([]);
    setPreview(null);
  }, [filters.customerId, filters.fromDate, filters.toDate]);

  const updateFilter = (name, value) => {
    setFilters((current) => ({ ...current, [name]: value }));
    if (name === 'fromDate' || name === 'toDate') setDatePreset('custom');
    if (!['customerId', 'fromDate', 'toDate'].includes(name)) {
      setPreview(null);
    }
  };

  const applyDatePreset = (key) => {
    setDatePreset(key);

    if (key === 'all') {
      // Backend requires real fromDate/toDate values (empty strings are rejected
      // with a 400), so "All" uses a wide valid range instead of blanking them out.
      setFilters((current) => ({
        ...current,
        fromDate: '2000-01-01',
        toDate: today,
      }));
      return;
    }

    const preset = datePresets.find((item) => item.key === key);
    if (!preset) return;

    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (preset.days - 1));

    setFilters((current) => ({
      ...current,
      fromDate: toISODate(start),
      toDate: toISODate(end),
    }));
  };

  const toggleConsignment = (consignmentId) => {
    const consignment = billConsignments.find((item) => item._id === consignmentId);
    if (!consignment || consignment.canSelectForBill === false || displayBillStatus(consignment.billStatus) === 'Bill Generated') return;
    setPreview(null);
    setSelectedConsignmentIds((current) =>
      current.includes(consignmentId) ? current.filter((idValue) => idValue !== consignmentId) : [...current, consignmentId]
    );
  };

  const toggleAllConsignments = () => {
    setPreview(null);
    setSelectedConsignmentIds((current) => {
      if (allConsignmentsSelected) {
        const visibleIds = new Set(selectableConsignments.map((item) => item._id));
        return current.filter((idValue) => !visibleIds.has(idValue));
      }
      const merged = new Set(current);
      selectableConsignments.forEach((item) => merged.add(item._id));
      return [...merged];
    });
  };

  const billPayload = () => ({
    ...filters,
    ratePerKg,
    consignmentIds: selectedConsignmentIds,
  });

  const previewBill = useMutation({
    mutationFn: async () => (await api.post('/freight-bills/preview', billPayload())).data,
    onSuccess: (bill) => {
      setPreview({ ...bill, billDate: today, billNumber: 'Draft' });
      toast.success(`${bill.lineItems.length} LR records loaded`);
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Could not preview bill'),
  });

  const createBill = useMutation({
    mutationFn: async () => (await api.post('/freight-bills', billPayload())).data,
    onSuccess: (bill) => {
      toast.success(`Freight bill ${bill.billNumber} generated`);
      navigate(`/freight-bills/${bill._id}`);
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Could not generate bill'),
  });

  const loadConsignmentForEdit = useMutation({
    mutationFn: async (consignmentId) => (await api.get(`/consignments/${consignmentId}`)).data,
    onSuccess: (consignment) => {
      setEditingConsignment({
        ...consignment,
        consignerId: consignment.consignerId?._id,
        consigneeId: consignment.consigneeId?._id,
        tripId: consignment.tripId?._id,
      });
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Could not load consignment'),
  });

  const queryClient = useQueryClient();

  const saveConsignment = useMutation({
    mutationFn: async (payload) => (await api.put(`/consignments/${editingConsignment._id}`, payload)).data,
    onSuccess: () => {
      toast.success('Consignment updated');
      setEditingConsignment(null);
      setPreview(null);
      queryClient.invalidateQueries({ queryKey: ['freight-bill-consignments'] });
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Could not save consignment'),
  });

  const createTrip = useMutation({
    mutationFn: async (payload) => (await api.post('/trips', payload)).data,
    onSuccess: (trip) => {
      toast.success(`Trip ${trip.tripNumber} created`);
      queryClient.invalidateQueries({ queryKey: ['trips', 'freight-bill-edit'] });
      setTripModal(false);
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Could not create trip'),
  });

  const consignmentColumns = [
    {
      key: 'select',
      label: (
        <input
          type="checkbox"
          checked={allConsignmentsSelected}
          onChange={toggleAllConsignments}
          disabled={!selectableConsignments.length}
          className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent"
          title="Select all consignments"
        />
      ),
      render: (row) => {
        const isBilled = displayBillStatus(row.billStatus) === 'Bill Generated' || row.canSelectForBill === false;
        return (
        <input
          type="checkbox"
          checked={selectedConsignmentIds.includes(row._id)}
          onChange={() => toggleConsignment(row._id)}
          disabled={isBilled}
          className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent"
          title={isBilled ? `${row.lrNumber} already billed` : `Select ${row.lrNumber}`}
        />
      );
      },
    },
    { key: 'lrNumber', label: 'LR Number' },
    { key: 'bookingDate', label: 'Date', render: (row) => formatDate(row.bookingDate) },
    { key: 'consigner', label: 'Consigner' },
    { key: 'consignee', label: 'Consignee' },
    { key: 'route', label: 'Route', render: (row) => [row.from, row.to].filter(Boolean).join(' - ') || '-' },
    { key: 'billStatus', label: 'Bill Status', render: (row) => displayBillStatus(row.billStatus) },
    { key: 'paymentStatus', label: 'Payment Status', render: (row) => displayPaymentStatus(row) },
    { key: 'chargeableWeight', label: 'Chargeable Wt.', render: (row) => money(row.chargeableWeight) },
    { key: 'freight', label: 'Bill Freight', render: (row) => `Rs. ${money(Number(row.chargeableWeight || 0) * ratePerKg)}` },
    { key: 'storedFreight', label: 'Stored Freight', render: (row) => `Rs. ${money(row.storedFreight)}` },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <button
          onClick={() => loadConsignmentForEdit.mutate(row._id)}
          disabled={loadConsignmentForEdit.isPending}
          className="rounded-md border border-slate-200 px-3 py-1.5 text-slate-700 disabled:opacity-50"
        >
          Edit
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Box 1: customer + rate + GST selection, with the page title tucked into the top-right corner */}
      <section className="space-y-4 rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="grid gap-4 md:grid-cols-6">
          <div className="md:col-span-2">
            <FormField label="Customer">
              <select className={inputClass} value={filters.customerId} onChange={(event) => updateFilter('customerId', event.target.value)}>
                <option value="">Select customer</option>
                {(customerData?.customers || []).map((customer) => <option key={customer._id} value={customer._id}>{customer.companyName}</option>)}
              </select>
            </FormField>
          </div>

          <FormField label="Rate Per Kg">
            <input type="number" min="0" step="0.01" className={inputClass} value={filters.ratePerKg} onChange={(event) => updateFilter('ratePerKg', event.target.value)} placeholder="0.00" />
          </FormField>
          <FormField label="GST Rates">
            <div className="grid grid-cols-3 gap-2">
              <input type="number" className={inputClass} value={filters.cgstRate} onChange={(event) => updateFilter('cgstRate', event.target.value)} title="CGST %" />
              <input type="number" className={inputClass} value={filters.sgstRate} onChange={(event) => updateFilter('sgstRate', event.target.value)} title="SGST %" />
              <input type="number" className={inputClass} value={filters.igstRate} onChange={(event) => updateFilter('igstRate', event.target.value)} title="IGST %" />
            </div>
          </FormField>

          <div className="text-right md:col-span-2">
            <h1 className="text-lg font-bold text-slate-950">Generate Freight Bill</h1>
            <p className="text-xs text-slate-500">Select LR records for a customer and billing period to generate a printable freight bill.</p>
            <Link to="/freight-bills" className="mt-2 inline-block rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
              View Generated Bills
            </Link>
          </div>
        </div>
      </section>

      {/* Box 2: quick range + status summary (small top part) + consignment data (below) */}
      {filters.customerId && (
        <section className="space-y-3 rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-700">Quick range:</span>
            {datePresets.map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => applyDatePreset(preset.key)}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold ${datePreset === preset.key ? 'bg-accent text-white' : 'border border-slate-200 text-slate-700'}`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
            <p className="text-sm text-slate-500">
              {selectedCustomer ? `${selectedConsignmentIds.length} of ${billConsignments.length} LR records selected for ${selectedCustomer.companyName}.` : 'Select a billing period to load matching LR records.'}
            </p>
            <div className="flex gap-2">
              <button onClick={() => previewBill.mutate()} disabled={!selectedConsignmentIds.length || filters.ratePerKg === '' || previewBill.isPending} className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"><FiFileText /> Preview</button>
              <button onClick={() => createBill.mutate()} disabled={!preview?.lineItems?.length || createBill.isPending} className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><FiFileText /> Generate & Save</button>
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-slate-200 pt-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-slate-700">Status:</span>
              {consignmentStatusFilters.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setStatusFilter(option.key)}
                  className={`rounded-md px-3 py-1.5 text-sm font-semibold ${statusFilter === option.key ? 'bg-primary text-white' : 'border border-slate-200 text-slate-700'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={allConsignmentsSelected}
                onChange={toggleAllConsignments}
                disabled={!selectableConsignments.length}
                className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent"
              />
              Select All Visible ({isFetchingConsignments ? '...' : `${filteredConsignments.length} of ${billConsignments.length}`})
            </label>
          </div>

          {isFetchingConsignments ? (
            <div className="text-sm text-slate-500">Loading consignments...</div>
          ) : (
            <div className="max-h-[380px] overflow-y-auto rounded-md border border-slate-200">
              <DataTable columns={consignmentColumns} rows={filteredConsignments} emptyText="No consignments match this filter" />
            </div>
          )}
        </section>
      )}

      {preview && (
        <section className="space-y-4 rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Bill Preview</h2>
              <p className="text-sm text-slate-500">{preview.lineItems.length} LRs | Grand total Rs. {money(preview.grandTotal)}</p>
            </div>
            <PdfActions bill={preview} />
          </div>
          <PdfPreview bill={preview} />
        </section>
      )}

      {editingConsignment && (
        <Modal title="Edit Consignment" onClose={() => setEditingConsignment(null)} width="max-w-5xl">
          <ConsignmentForm
            customers={customerData?.customers || []}
            trips={tripData?.trips || []}
            initial={editingConsignment}
            onCancel={() => setEditingConsignment(null)}
            onNewTrip={() => setTripModal(true)}
            onSubmit={(values) => saveConsignment.mutate(values)}
          />
        </Modal>
      )}
      {tripModal && (
        <Modal title="Create Trip" onClose={() => setTripModal(false)}>
          <TripForm onCancel={() => setTripModal(false)} onSubmit={(values) => createTrip.mutate(values)} />
        </Modal>
      )}
    </div>
  );
};

export default GenerateFreightBillPage;