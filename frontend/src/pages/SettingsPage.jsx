import PageHeader from '../components/PageHeader';
import FormField, { inputClass } from '../components/FormField';
import AdminBillingSection from '../components/AdminBillingSection';

const SettingsPage = () => (
  <div className="space-y-6">
    <PageHeader title="Settings" description="Company defaults prepared for LR printing and future integrations." />
    <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-lg font-semibold text-slate-950">Company Details</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <FormField label="Company Name"><input className={inputClass} defaultValue="Tanushree Logistics" /></FormField>
        <FormField label="Support Email"><input className={inputClass} defaultValue="admin@shreemaruti.com" /></FormField>
        <FormField label="Contact Number"><input className={inputClass} placeholder="+91" /></FormField>
        <FormField label="GST Number"><input className={inputClass} placeholder="Company GST" /></FormField>
      </div>
    </section>
    <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-lg font-semibold text-slate-950">Operational Preferences</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <label className="flex items-center justify-between rounded-lg border border-slate-200 p-4 text-sm font-medium text-slate-700">
          Toast Notifications
          <input type="checkbox" defaultChecked className="h-4 w-4" />
        </label>
        <label className="flex items-center justify-between rounded-lg border border-slate-200 p-4 text-sm font-medium text-slate-700">
          Auto LR Number
          <input type="checkbox" defaultChecked className="h-4 w-4" />
        </label>
        <label className="flex items-center justify-between rounded-lg border border-slate-200 p-4 text-sm font-medium text-slate-700">
          Completed Trip Lock
          <input type="checkbox" defaultChecked className="h-4 w-4" />
        </label>
      </div>
    </section>

    <AdminBillingSection />
  </div>
);

export default SettingsPage;