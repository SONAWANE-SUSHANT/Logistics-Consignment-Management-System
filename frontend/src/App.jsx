import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CustomersPage from './pages/CustomersPage';
import TripsPage from './pages/TripsPage';
import TripDetailsPage from './pages/TripDetailsPage';
import ConsignmentsPage from './pages/ConsignmentsPage';
import ConsignmentDetailsPage from './pages/ConsignmentDetailsPage';
import FreightBillsPage from './pages/FreightBillsPage';
import GenerateFreightBillPage from './pages/GenerateFreightBillPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import Layout from './layouts/Layout';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center bg-surface text-slate-500">Loading workspace...</div>;
  return user ? children : <Navigate to="/login" replace />;
};

const App = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="trips" element={<TripsPage />} />
        <Route path="trips/:id" element={<TripDetailsPage />} />
        <Route path="consignments" element={<ConsignmentsPage />} />
        <Route path="consignments/:id" element={<ConsignmentDetailsPage />} />
        <Route path="freight-bills" element={<FreightBillsPage />} />
        <Route path="freight-bills/generate" element={<GenerateFreightBillPage />} />
        <Route path="freight-bills/:id" element={<FreightBillsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
};

export default App;