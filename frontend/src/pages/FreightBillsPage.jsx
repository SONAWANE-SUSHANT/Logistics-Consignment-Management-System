import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { FiEye, FiPlus, FiSearch, FiTrash2 } from 'react-icons/fi';
import DataTable from '../components/DataTable';
import { inputClass } from '../components/FormField';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import { api, listParams } from '../services/api';
import { formatDate } from '../utils/formatters';
import {
  money,
  paymentStatusTextClass,
  billPendingAmount,
  PdfActions,
  PdfPreview,
  RecordPaymentModal,
} from './freightBillUtils';

const FreightBillDetails = ({ id }) => {
  const queryClient = useQueryClient();
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ['freight-bill', id], queryFn: async () => (await api.get(`/freight-bills/${id}`)).data });

  const recordPayment = useMutation({
    mutationFn: async (payload) => (await api.post(`/freight-bills/${id}/payments`, payload)).data,
    onSuccess: () => {
      toast.success('Payment recorded');
      setPaymentModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['freight-bill', id] });
      queryClient.invalidateQueries({ queryKey: ['freight-bills'] });
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Could not record payment'),
  });

  if (isLoading) return <div className="text-sm text-slate-500">Loading freight bill...</div>;

  const pendingAmount = billPendingAmount(data);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Freight Bill ${data.billNumber}`}
        description={`${data.customerSnapshot?.companyName} | ${formatDate(data.fromDate)} to ${formatDate(data.toDate)}`}
        action={<div className="flex flex-wrap gap-2">
          <Link to="/freight-bills" className="rounded-md border border-slate-200 px-4 py-2.5 font-semibold text-slate-700">Back</Link>
          {data.status !== 'Paid' && (
            <button
              onClick={() => setPaymentModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2.5 font-semibold text-white"
            >
              Record Payment
            </button>
          )}
          <PdfActions bill={data} />
        </div>}
      />

      <section className="grid gap-4 rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:grid-cols-4">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">Total Amount</p>
          <p className="text-lg font-bold text-slate-950">Rs. {money(data.grandTotal)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">Paid Amount</p>
          <p className="text-lg font-bold text-emerald-600">Rs. {money(data.paidAmount)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">Pending Amount</p>
          <p className="text-lg font-bold text-amber-600">Rs. {money(pendingAmount)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">Payment Status</p>
          <p className={`text-lg font-bold ${paymentStatusTextClass(data.status)}`}>{data.status || 'Unpaid'}</p>
        </div>
      </section>

      <section className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <PdfPreview bill={data} />
      </section>

      {!!(data.payments || []).length && (
        <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-3 text-lg font-semibold text-slate-950">Payment History</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2 pr-4">Mode</th>
                  <th className="py-2 pr-4">Notes</th>
                </tr>
              </thead>
              <tbody>
                {data.payments.map((payment) => (
                  <tr key={payment._id} className="border-b border-slate-100">
                    <td className="py-2 pr-4">{formatDate(payment.paymentDate)}</td>
                    <td className="py-2 pr-4">Rs. {money(payment.amount)}</td>
                    <td className="py-2 pr-4">{payment.mode || '-'}</td>
                    <td className="py-2 pr-4">{payment.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {paymentModalOpen && (
        <RecordPaymentModal
          bill={data}
          onClose={() => setPaymentModalOpen(false)}
          isSubmitting={recordPayment.isPending}
          onSubmit={(payload) => recordPayment.mutate(payload)}
        />
      )}
    </div>
  );
};

const FreightBillsPage = () => {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [paymentBill, setPaymentBill] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['freight-bills', page, search],
    queryFn: async () => (await api.get('/freight-bills', { params: listParams({ page, search }) })).data,
  });

  const deleteBill = useMutation({
    mutationFn: async (billId) => (await api.delete(`/freight-bills/${billId}`)).data,
    onSuccess: () => {
      toast.success('Freight bill deleted');
      queryClient.invalidateQueries({ queryKey: ['freight-bills'] });
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Could not delete bill'),
  });

  const markBillPaid = useMutation({
    mutationFn: async (billId) => (await api.post(`/freight-bills/${billId}/mark-paid`)).data,
    onSuccess: (bill) => {
      toast.success(`Freight bill ${bill.billNumber} marked as paid`);
      queryClient.invalidateQueries({ queryKey: ['freight-bills'] });
      queryClient.invalidateQueries({ queryKey: ['freight-bill-consignments'] });
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Could not mark bill as paid'),
  });

  const recordPayment = useMutation({
    mutationFn: async ({ billId, ...payload }) => (await api.post(`/freight-bills/${billId}/payments`, payload)).data,
    onSuccess: (bill) => {
      toast.success(`Payment recorded for ${bill.billNumber}`);
      setPaymentBill(null);
      queryClient.invalidateQueries({ queryKey: ['freight-bills'] });
      queryClient.invalidateQueries({ queryKey: ['freight-bill-consignments'] });
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Could not record payment'),
  });

  const rows = data?.freightBills || [];
  const columns = [
    { key: 'billNumber', label: 'Bill No.' },
    { key: 'customer', label: 'Customer', render: (row) => row.customerSnapshot?.companyName },
    { key: 'period', label: 'Period', render: (row) => `${formatDate(row.fromDate)} - ${formatDate(row.toDate)}` },
    { key: 'items', label: 'LRs', render: (row) => row.lineItems?.length || 0 },
    { key: 'total', label: 'Grand Total', render: (row) => `Rs. ${money(row.grandTotal)}` },
    { key: 'paidAmount', label: 'Paid', render: (row) => `Rs. ${money(row.paidAmount)}` },
    { key: 'pendingAmount', label: 'Pending', render: (row) => `Rs. ${money(billPendingAmount(row))}` },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <span className={`font-semibold ${paymentStatusTextClass(row.status)}`}>{row.status || 'Unpaid'}</span>,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <Link to={`/freight-bills/${row._id}`} className="rounded-md border border-slate-200 p-2 text-slate-700" title="View bill"><FiEye /></Link>
          {row.status !== 'Paid' && (
            <>
              <button onClick={() => setPaymentBill(row)} className="rounded-md border border-accent/40 px-3 py-1.5 text-accent">Record Payment</button>
              <button onClick={() => markBillPaid.mutate(row._id)} disabled={markBillPaid.isPending} className="rounded-md border border-emerald-200 px-3 py-1.5 text-emerald-700 disabled:opacity-50">Mark as Paid</button>
            </>
          )}
          <button onClick={() => window.confirm('Delete this freight bill?') && deleteBill.mutate(row._id)} className="rounded-md border border-red-200 p-2 text-red-600" title="Delete bill"><FiTrash2 /></button>
        </div>
      ),
    },
  ];

  if (id) return <FreightBillDetails id={id} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Freight Bills"
        description="View, print, and manage payments for previously generated freight bills."
        action={
          <Link to="/freight-bills/generate" className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2.5 font-semibold text-white">
            <FiPlus /> Generate New Bill
          </Link>
        }
      />

      <section className="space-y-4 rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-200 print:hidden">
        <div className="relative">
          <FiSearch className="absolute left-3 top-3 text-slate-400" />
          <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search bill number, customer, GST..." className={`${inputClass} pl-10`} />
        </div>
        {isLoading ? (
          <div className="text-sm text-slate-500">Loading freight bills...</div>
        ) : (
          <div className="max-h-[420px] overflow-y-auto rounded-md border border-slate-200">
            <DataTable columns={columns} rows={rows} />
          </div>
        )}
        <Pagination page={data?.page || page} pages={data?.pages || 1} onPage={setPage} />
      </section>

      {paymentBill && (
        <RecordPaymentModal
          bill={paymentBill}
          onClose={() => setPaymentBill(null)}
          isSubmitting={recordPayment.isPending}
          onSubmit={(payload) => recordPayment.mutate({ billId: paymentBill._id, ...payload })}
        />
      )}
    </div>
  );
};

export default FreightBillsPage;