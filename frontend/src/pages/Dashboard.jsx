import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  getPendingRegistrations, 
  getDoctorsList, 
  getVisitTypesList, 
  approveRegistration, 
  rejectRegistration 
} from '../api';

function Dashboard() {
  const [pendingQueue, setPendingQueue] = useState([]);
  const [filteredQueue, setFilteredQueue] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [visitTypes, setVisitTypes] = useState([]);
  
  // Search and Filter states
  const [searchName, setSearchName] = useState('');
  const [searchMobile, setSearchMobile] = useState('');
  const [filterDoctor, setFilterDoctor] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // Dashboard Stats
  const [stats, setStats] = useState({
    pending: 0,
    approvedCount: 0, // Mock session stats
    rejectedCount: 0
  });

  // Selected patient for drawer
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [drawerMode, setDrawerMode] = useState(''); // 'VIEW', 'APPROVE', 'REJECT'
  
  // Editing state in drawer
  const [editForm, setEditForm] = useState({
    name: '',
    dob: '',
    gender: 'MALE',
    phone: '',
    appointment_date: '',
    appointment_time: '',
    doctor_name: '',
    visit_type: '',
    remarks: '',
  });

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [receptionistName, setReceptionistName] = useState('Sarah Jenkins');
  const [currentUser, setCurrentUser] = useState(null);
  const [alertMsg, setAlertMsg] = useState('');

  // Load User details
  useEffect(() => {
    const userStr = localStorage.getItem('ascas_user');
    if (userStr) {
      const u = JSON.parse(userStr);
      setReceptionistName(u.name || u.username);
      setCurrentUser(u);
    }
  }, []);

  const location = useLocation();
  useEffect(() => {
    if (location.state && location.state.unauthorized) {
      setAlertMsg('Access Denied: Only administrators are authorized to access the staff management panel.');
      // Clear navigation state to prevent alert from persisting on reload
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Fetch pending registration and master lists
  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getPendingRegistrations();
      const docs = await getDoctorsList();
      const vts = await getVisitTypesList();

      setPendingQueue(data);
      setFilteredQueue(data);
      setDoctors(docs);
      setVisitTypes(vts);
      setStats((prev) => ({
        ...prev,
        pending: data.length,
      }));
    } catch (err) {
      console.error(err);
      setError('Failed to fetch data from API. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter application logic
  useEffect(() => {
    let result = [...pendingQueue];

    if (searchName) {
      result = result.filter((r) =>
        r.name.toLowerCase().includes(searchName.toLowerCase())
      );
    }

    if (searchMobile) {
      result = result.filter((r) => r.phone.includes(searchMobile));
    }

    if (filterDoctor) {
      // In a real application, the specialist pool is selected
      // We will match if the user has written custom doctors or match referral
      result = result.filter((r) => 
        (r.referral && r.referral.toLowerCase().includes(filterDoctor.toLowerCase())) ||
        (r.purpose_of_visit && r.purpose_of_visit.toLowerCase().includes(filterDoctor.toLowerCase()))
      );
    }

    if (filterDate) {
      const fDate = new Date(filterDate).toDateString();
      result = result.filter((r) => 
        new Date(r.appointment_date).toDateString() === fDate
      );
    }

    setFilteredQueue(result);
  }, [searchName, searchMobile, filterDoctor, filterDate, pendingQueue]);

  const calculateAge = (dobString) => {
    if (!dobString) return 0;
    const today = new Date();
    const birthDate = new Date(dobString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 ? age : 0;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Drawer triggers
  const openDrawer = (record, mode) => {
    setSelectedRecord(record);
    setDrawerMode(mode);
    setError('');

    // Pre-populate edit form fields
    setEditForm({
      name: record.name,
      dob: record.dob.substring(0, 10), // Date string format YYYY-MM-DD
      gender: record.gender,
      phone: record.phone,
      appointment_date: record.appointment_date.substring(0, 10),
      appointment_time: '10:00', // Default time slot allocation
      doctor_name: doctors[0]?.name || '',
      visit_type: record.purpose_of_visit || visitTypes[0] || '',
      remarks: '',
    });
  };

  const closeDrawer = () => {
    setSelectedRecord(null);
    setDrawerMode('');
    setError('');
  };

  // Submit Approval
  const handleApprove = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError('');

    try {
      const payload = {
        name: editForm.name,
        dob: editForm.dob,
        gender: editForm.gender,
        phone: editForm.phone,
        appointment_date: editForm.appointment_date,
        appointment_time: editForm.appointment_time,
        doctor_name: editForm.doctor_name,
        visit_type: editForm.visit_type,
        remarks: editForm.remarks || 'Approved and registered.',
      };

      await approveRegistration(selectedRecord.tmp_id, payload);

      // Success
      setStats((prev) => ({
        ...prev,
        approvedCount: prev.approvedCount + 1,
      }));
      
      // Remove from list
      setPendingQueue((prev) => prev.filter((r) => r.tmp_id !== selectedRecord.tmp_id));
      closeDrawer();
      
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to approve registration.');
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Rejection
  const handleReject = async (e) => {
    e.preventDefault();
    if (!editForm.remarks.trim()) {
      setError('Please provide remarks explaining the rejection reason.');
      return;
    }

    setActionLoading(true);
    setError('');

    try {
      await rejectRegistration(selectedRecord.tmp_id, editForm.remarks);

      // Success
      setStats((prev) => ({
        ...prev,
        rejectedCount: prev.rejectedCount + 1,
      }));

      // Remove from list
      setPendingQueue((prev) => prev.filter((r) => r.tmp_id !== selectedRecord.tmp_id));
      closeDrawer();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to reject registration.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      {/* Title Bar */}
      <div className="dashboard-title-bar">
        <div>
          <h2>Reception Queue Monitor</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Approve QR-submitted registrations and book doctor appointments
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          {currentUser && currentUser.role === 'ADMIN' && (
            <Link 
              to="/users" 
              className="btn btn-secondary" 
              style={{ 
                padding: '0.5rem 1rem', 
                fontSize: '0.85rem', 
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              👥 Manage Staff Accounts
            </Link>
          )}
          <div className="receptionist-badge">
            <span className="active-dot"></span>
            <span>Station: <strong>Reception Main Desk</strong></span>
            <span style={{ color: 'var(--text-muted)' }}>|</span>
            <span>Logged in as: <strong>{receptionistName}</strong></span>
          </div>
        </div>
      </div>

      {alertMsg && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '6px',
          padding: '0.85rem 1.25rem',
          marginBottom: '1.5rem',
          color: '#ef4444',
          fontSize: '0.9rem',
          fontWeight: '500',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <span>⛔ {alertMsg}</span>
          <button 
            type="button" 
            onClick={() => setAlertMsg('')}
            style={{
              background: 'none',
              border: 'none',
              color: '#ef4444',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '1.2rem',
              lineHeight: '1'
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Stats Counter Section */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Pending QR Submissions</span>
          <span className="stat-value pending">{stats.pending}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Approved (This Session)</span>
          <span className="stat-value approved">{stats.approvedCount}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Rejected (This Session)</span>
          <span className="stat-value rejected">{stats.rejectedCount}</span>
        </div>
      </div>

      {/* Filter Options bar */}
      <div className="filter-bar">
        <div className="filter-group">
          <label>Patient Name</label>
          <input
            type="text"
            className="filter-control"
            placeholder="Search name..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label>Mobile Number</label>
          <input
            type="text"
            className="filter-control"
            placeholder="Search phone..."
            value={searchMobile}
            onChange={(e) => setSearchMobile(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label>Specialist / Referral</label>
          <select
            className="filter-control"
            value={filterDoctor}
            onChange={(e) => setFilterDoctor(e.target.value)}
          >
            <option value="">All Specialists</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Visit Date</label>
          <input
            type="date"
            className="filter-control"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
        </div>

        <button 
          onClick={() => { setSearchName(''); setSearchMobile(''); setFilterDoctor(''); setFilterDate(''); }}
          className="btn btn-secondary" 
          style={{ height: '38px', padding: '0 1rem' }}
        >
          Clear Filters
        </button>
      </div>

      {/* Main Grid Queue Table */}
      <div className="table-card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '1rem' }}>🔄</span>
            <p style={{ color: 'var(--text-secondary)' }}>Loading pending queue registrations...</p>
          </div>
        ) : error && pendingQueue.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--error)' }}>
            <p>{error}</p>
            <button onClick={fetchData} className="btn btn-primary" style={{ marginTop: '1rem' }}>Retry Connection</button>
          </div>
        ) : filteredQueue.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📭</span>
            <h3>No pending registrations found</h3>
            <p>Either all registrations are processed, or try relaxing filter keywords.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="pending-table">
              <thead>
                <tr>
                  <th>Patient Name</th>
                  <th>Mobile</th>
                  <th>Gender / Age</th>
                  <th>Appt. Date</th>
                  <th>Referral / Purpose</th>
                  <th>Submitted At</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredQueue.map((record) => (
                  <tr key={record.tmp_id}>
                    <td>
                      <strong>{record.name}</strong>
                    </td>
                    <td>{record.phone}</td>
                    <td>
                      {record.gender} ({calculateAge(record.dob)} Y)
                    </td>
                    <td>
                      <span style={{ fontWeight: '500' }}>
                        {formatDate(record.appointment_date)}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {record.purpose_of_visit}
                      </div>
                      {record.referral && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>
                          Ref: {record.referral}
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {formatDateTime(record.submitted_at)}
                    </td>
                    <td>
                      <span className="badge badge-pending">PENDING</span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          onClick={() => openDrawer(record, 'APPROVE')}
                          className="btn btn-success"
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                        >
                          Review & Approve
                        </button>
                        <button
                          onClick={() => openDrawer(record, 'REJECT')}
                          className="btn btn-danger"
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Approval/Rejection Drawer */}
      {selectedRecord && (
        <>
          <div className="modal-overlay" onClick={closeDrawer}></div>
          <div className="drawer">
            <div className="drawer-header">
              <h3>
                {drawerMode === 'APPROVE' && 'Approve Patient Registration'}
                {drawerMode === 'REJECT' && 'Reject Patient Registration'}
                {drawerMode === 'VIEW' && 'Patient Registration Details'}
              </h3>
              <button onClick={closeDrawer} className="close-btn">&times;</button>
            </div>

            <div className="drawer-body">
              {error && (
                <div className="error-message" style={{ marginBottom: '1.25rem', padding: '0.75rem', backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: '5px' }}>
                  {error}
                </div>
              )}

              {/* Read-Only Meta Information */}
              <div className="info-section">
                <div className="info-row">
                  <span className="info-label">Source:</span>
                  <span className="info-val" style={{ textTransform: 'uppercase' }}>{selectedRecord.source}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Aadhaar (Masked):</span>
                  <span className="info-val" style={{ fontFamily: 'monospace' }}>{selectedRecord.gov_id}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Submitted Time:</span>
                  <span className="info-val">{formatDateTime(selectedRecord.submitted_at)}</span>
                </div>
              </div>

              {/* Form editing/processing fields */}
              <form onSubmit={drawerMode === 'APPROVE' ? handleApprove : handleReject}>
                {drawerMode === 'APPROVE' ? (
                  <>
                    <h4 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', color: 'var(--primary)' }}>
                      1. Confirm / Correct Patient Details
                    </h4>
                    
                    <div className="form-group">
                      <label>Patient Name</label>
                      <input
                        type="text"
                        className="input-control"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        required
                        disabled={actionLoading}
                      />
                    </div>

                    <div className="form-grid form-grid-2">
                      <div className="form-group">
                        <label>Date of Birth</label>
                        <input
                          type="date"
                          className="input-control"
                          value={editForm.dob}
                          onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
                          required
                          disabled={actionLoading}
                        />
                      </div>
                      <div className="form-group">
                        <label>Gender</label>
                        <select
                          className="input-control"
                          value={editForm.gender}
                          onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                          disabled={actionLoading}
                        >
                          <option value="MALE">MALE</option>
                          <option value="FEMALE">FEMALE</option>
                          <option value="OTHER">OTHER</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Mobile Phone</label>
                      <input
                        type="text"
                        className="input-control"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        required
                        disabled={actionLoading}
                      />
                    </div>

                    <div className="form-grid form-grid-2">
                      <div className="form-group">
                        <label>Planned Appointment Date</label>
                        <input
                          type="date"
                          className="input-control"
                          value={editForm.appointment_date}
                          onChange={(e) => setEditForm({ ...editForm, appointment_date: e.target.value })}
                          required
                          disabled={actionLoading}
                        />
                      </div>
                      <div className="form-group">
                        <label>Allocated Appointment Time</label>
                        <input
                          type="time"
                          className="input-control"
                          value={editForm.appointment_time}
                          onChange={(e) => setEditForm({ ...editForm, appointment_time: e.target.value })}
                          required
                          disabled={actionLoading}
                        />
                      </div>
                    </div>

                    <h4 style={{ margin: '1.5rem 0 1rem 0', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', color: 'var(--primary)' }}>
                      2. Assign Specialist & Visit Type
                    </h4>

                    <div className="form-group">
                      <label>Assign Doctor</label>
                      <select
                        className="input-control"
                        value={editForm.doctor_name}
                        onChange={(e) => setEditForm({ ...editForm, doctor_name: e.target.value })}
                        required
                        disabled={actionLoading}
                      >
                        {doctors.map((d) => (
                          <option key={d.id} value={d.name}>{d.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Visit Type</label>
                      <select
                        className="input-control"
                        value={editForm.visit_type}
                        onChange={(e) => setEditForm({ ...editForm, visit_type: e.target.value })}
                        required
                        disabled={actionLoading}
                      >
                        {visitTypes.map((v) => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Remarks / Notes (Optional)</label>
                      <textarea
                        className="input-control"
                        rows="3"
                        placeholder="e.g. Needs immediate check, patient referred from clinic X"
                        value={editForm.remarks}
                        onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
                        disabled={actionLoading}
                        style={{ resize: 'vertical' }}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                      You are rejecting the registration for patient <strong>{selectedRecord.name}</strong>.
                    </div>
                    
                    {/* Rejection Notification Notice */}
                    <div style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      borderRadius: '6px',
                      padding: '0.75rem',
                      marginBottom: '1.25rem',
                      fontSize: '0.85rem',
                      color: '#ef4444',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <span>⚠️</span>
                      <span><strong>Notice:</strong> Rejecting this record will automatically send a status notification to the patient advising them to select an alternate date.</span>
                    </div>

                    {/* Quick Select Reason Chips */}
                    <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                      <label style={{ marginBottom: '0.5rem', display: 'block', fontSize: '0.85rem', fontWeight: '600' }}>Quick Select Reason</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {[
                          'Doctor Unavailable',
                          'Slot Fully Booked',
                          'Clinic Closed on Selected Date'
                        ].map((reason) => (
                          <button
                            key={reason}
                            type="button"
                            onClick={() => setEditForm(prev => ({ ...prev, remarks: reason }))}
                            style={{
                              padding: '0.35rem 0.75rem',
                              fontSize: '0.8rem',
                              borderRadius: '20px',
                              border: editForm.remarks === reason ? '1px solid #ef4444' : '1px solid var(--border)',
                              backgroundColor: editForm.remarks === reason ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                              color: editForm.remarks === reason ? '#ef4444' : 'var(--text-primary)',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              fontWeight: editForm.remarks === reason ? '600' : 'normal'
                            }}
                          >
                            {reason}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Rejection Reason / Remarks (Required)</label>
                      <textarea
                        className="input-control"
                        rows="4"
                        placeholder="Please select a quick reason above or type specific details..."
                        value={editForm.remarks}
                        onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
                        required
                        disabled={actionLoading}
                        style={{ resize: 'vertical' }}
                      />
                    </div>
                  </>
                )}
              </form>
            </div>

            <div className="drawer-footer">
              <button 
                type="button" 
                onClick={closeDrawer} 
                className="btn btn-secondary"
                disabled={actionLoading}
              >
                Cancel
              </button>
              {drawerMode === 'APPROVE' ? (
                <button
                  type="submit"
                  onClick={handleApprove}
                  className="btn btn-success"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Processing Approval...' : 'Approve & Schedule'}
                </button>
              ) : (
                <button
                  type="submit"
                  onClick={handleReject}
                  className="btn btn-danger"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Rejecting Record...' : 'Confirm Rejection'}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Dashboard;
