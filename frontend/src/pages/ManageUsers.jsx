import React, { useState, useEffect } from 'react';
import { registerStaffUser, getStaffList } from '../api';

function ManageUsers() {
  const [usersList, setUsersList] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    role: 'RECEPTIONIST',
  });
  
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const list = await getStaffList();
      setUsersList(list);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch staff list. Only administrators can access this view.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.username.trim() || !formData.password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setSubmitLoading(true);
    setError('');
    setSuccess('');

    try {
      await registerStaffUser(formData);
      setSuccess(`Staff user "${formData.username}" created successfully!`);
      // Reset form
      setFormData({
        name: '',
        username: '',
        password: '',
        role: 'RECEPTIONIST',
      });
      // Refresh list
      fetchUsers();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to create new staff user.');
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      {/* Title Bar */}
      <div className="dashboard-title-bar">
        <div>
          <h2>Staff User Management</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Register new receptionist or admin staff accounts and monitor access roles
          </p>
        </div>
      </div>

      <div className="form-grid form-grid-2" style={{ gap: '2rem', alignItems: 'start' }}>
        {/* Left Side: Create User Form */}
        <div className="form-card" style={{ margin: 0, padding: '2rem', maxWidth: '100%' }}>
          <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', color: 'var(--primary)' }}>
            ➕ Create New Staff User
          </h3>

          <form onSubmit={handleFormSubmit}>
            {error && (
              <div className="error-message" style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: '5px' }}>
                {error}
              </div>
            )}
            
            {success && (
              <div style={{ color: 'var(--success)', marginBottom: '1rem', padding: '0.75rem', backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: '5px', fontSize: '0.9rem', fontWeight: '500' }}>
                {success}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                type="text"
                id="name"
                name="name"
                className="input-control"
                placeholder="e.g. John Doe"
                value={formData.name}
                onChange={handleInputChange}
                disabled={submitLoading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                className="input-control"
                placeholder="letters/numbers only, min 3 chars"
                value={formData.username}
                onChange={handleInputChange}
                disabled={submitLoading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Temporary Password</label>
              <input
                type="password"
                id="password"
                name="password"
                className="input-control"
                placeholder="min 6 characters"
                value={formData.password}
                onChange={handleInputChange}
                disabled={submitLoading}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="role">Assign System Role</label>
              <select
                id="role"
                name="role"
                className="input-control"
                value={formData.role}
                onChange={handleInputChange}
                disabled={submitLoading}
                required
              >
                <option value="RECEPTIONIST">RECEPTIONIST (Frontdesk Approval Queue)</option>
                <option value="ADMIN">ADMIN (Full Access & User Management)</option>
              </select>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', height: '2.8rem' }}
              disabled={submitLoading}
            >
              {submitLoading ? 'Registering Staff...' : 'Create Account'}
            </button>
          </form>
        </div>

        {/* Right Side: Existing Users Grid */}
        <div className="table-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', color: 'var(--primary)' }}>
            👥 Registered Staff List
          </h3>

          {loading && usersList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem' }}>🔄</span>
              <p style={{ color: 'var(--text-secondary)' }}>Loading staff records...</p>
            </div>
          ) : usersList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
              No staff members found or access restricted.
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="pending-table" style={{ fontSize: '0.9rem' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '0.5rem 1rem' }}>Name</th>
                    <th style={{ padding: '0.5rem 1rem' }}>Username</th>
                    <th style={{ padding: '0.5rem 1rem' }}>Role</th>
                    <th style={{ padding: '0.5rem 1rem' }}>Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map((user) => (
                    <tr key={user.id}>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <strong>{user.name}</strong>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>{user.username}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span className={`badge ${user.role === 'ADMIN' ? 'badge-approved' : 'badge-pending'}`}>
                          {user.role}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                        {new Date(user.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ManageUsers;
