import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Inbox } from './pages/Inbox';
import { EmailDetail } from './pages/EmailDetail';
import { Compose } from './pages/Compose';
import { Analytics } from './pages/Analytics';
import { Accounts } from './pages/Accounts';
import { Team } from './pages/Team';
import { MockOAuth } from './pages/MockOAuth';
import { MockOutlookOAuth } from './pages/MockOutlookOAuth';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/mock-oauth" element={<MockOAuth />} />
          <Route path="/mock-outlook-oauth" element={<MockOutlookOAuth />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="inbox" element={<Inbox />} />
            <Route path="inbox/:id" element={<EmailDetail />} />
            <Route path="compose" element={<Compose />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="accounts" element={<Accounts />} />
            <Route path="team" element={<Team />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
