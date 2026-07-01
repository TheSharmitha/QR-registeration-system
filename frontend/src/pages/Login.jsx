import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../api';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in both fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await loginUser(username, password);
      // Save details to LocalStorage
      localStorage.setItem('ascas_token', data.token);
      localStorage.setItem('ascas_user', JSON.stringify(data.user));
      
      // Redirect to receptionist approval queue dashboard
      navigate('/dashboard');
      window.location.reload(); // Refresh header navigation status
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Staff Portal</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            ASCAS QR Registration Administration Dashboard
          </p>
        </div>

        <form onSubmit={handleLogin}>
          {error && (
            <div className="error-message" style={{ marginBottom: '1rem', textAlign: 'center' }}>
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              className="input-control"
              placeholder="e.g. admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              autoComplete="username"
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              className="input-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', height: '2.8rem' }}
            disabled={loading}
          >
            {loading ? 'Verifying...' : 'Login Securely'}
          </button>
        </form>
        
        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          ASCAS Patient Registration System v1.0.0
          <br/>
          Secure Audit & Role-based authentication enabled.
        </div>
      </div>
    </div>
  );
}

export default Login;
