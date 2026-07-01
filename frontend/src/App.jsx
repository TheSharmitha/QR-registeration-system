import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import PatientForm from './pages/PatientForm.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';

function AppContent() {
  const location = useLocation();
  const isPatientView = location.pathname === '/register';

  const handleLogout = () => {
    localStorage.removeItem('ascas_token');
    localStorage.removeItem('ascas_user');
    window.location.href = '/login';
  };

  const isAuthenticated = () => {
    return !!localStorage.getItem('ascas_token');
  };

  return (
    <div className="app-container">
      {/* Conditionally Render Header: ONLY on staff views (/login, /dashboard) */}
      {!isPatientView && (
        <header className="header">
          <Link to="/dashboard" className="brand">
            <span className="brand-logo">🏥</span>
            <div>
              <span className="brand-text">ASCAS</span>
              <span className="brand-subtitle">Staff Portal v1.0</span>
            </div>
          </Link>
          <nav style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {isAuthenticated() ? (
              <>
                <Link to="/dashboard" className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                  Dashboard
                </Link>
                <button onClick={handleLogout} className="btn btn-danger" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                  Logout
                </button>
              </>
            ) : (
              <Link to="/login" className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                Staff Login
              </Link>
            )}
          </nav>
        </header>
      )}

      {/* Routes */}
      <Routes>
        <Route path="/" element={<Navigate to="/register" replace />} />
        <Route path="/register" element={<PatientForm />} />
        <Route path="/login" element={<Login />} />
        <Route 
          path="/dashboard" 
          element={isAuthenticated() ? <Dashboard /> : <Navigate to="/login" replace />} 
        />
        <Route path="*" element={<Navigate to="/register" replace />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
