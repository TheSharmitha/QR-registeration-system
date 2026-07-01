import React, { useState, useEffect } from 'react';
import { submitPatientRegistration, getDoctorsList, getVisitTypesList } from '../api';

function PatientForm() {
  const [formData, setFormData] = useState({
    name: '',
    dob: '',
    gender: 'MALE',
    phone: '',
    purpose_of_visit: '',
    referral: '',
    appointment_date: '',
  });

  const [rawAadhaar, setRawAadhaar] = useState('');
  const [displayAadhaar, setDisplayAadhaar] = useState('');
  const [isAadhaarFocused, setIsAadhaarFocused] = useState(false);
  const [showAadhaar, setShowAadhaar] = useState(false); // toggle visibility
  
  const [calculatedAge, setCalculatedAge] = useState('');
  const [visitTypes, setVisitTypes] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState(null);

  // Fetch Master Data
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const docList = await getDoctorsList();
        const vtList = await getVisitTypesList();
        setDoctors(docList);
        setVisitTypes(vtList);
        if (vtList.length > 0) {
          setFormData(prev => ({ ...prev, purpose_of_visit: vtList[0] }));
        }
      } catch (err) {
        console.error('Failed to load master metadata:', err);
      }
    };
    fetchMasterData();
  }, []);

  // Real-time Age Calculation on DOB change
  useEffect(() => {
    if (!formData.dob) {
      setCalculatedAge('');
      return;
    }
    const today = new Date();
    const birthDate = new Date(formData.dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    setCalculatedAge(age >= 0 ? `${age} Years` : '0 Years');
  }, [formData.dob]);

  // Aadhaar input control and masking
  const handleAadhaarChange = (e) => {
    const value = e.target.value;
    // Extract only digits, limit to 12
    const cleanDigits = value.replace(/\D/g, '').slice(0, 12);
    setRawAadhaar(cleanDigits);

    // Update display input text
    if (isAadhaarFocused && !showAadhaar) {
      setDisplayAadhaar(cleanDigits);
    } else if (showAadhaar) {
      setDisplayAadhaar(cleanDigits);
    } else {
      setDisplayAadhaar(maskValue(cleanDigits));
    }
  };

  const maskValue = (digits) => {
    if (!digits) return '';
    if (digits.length <= 4) return digits;
    const lastFour = digits.slice(-4);
    const maskedPart = 'XXXX-XXXX-';
    return `${maskedPart}${lastFour}`;
  };

  const handleAadhaarFocus = () => {
    setIsAadhaarFocused(true);
    // Show full raw digits when typing
    setDisplayAadhaar(rawAadhaar);
  };

  const handleAadhaarBlur = () => {
    setIsAadhaarFocused(false);
    // Apply masking on blur
    if (!showAadhaar) {
      setDisplayAadhaar(maskValue(rawAadhaar));
    }
  };

  const toggleAadhaarVisibility = (e) => {
    e.preventDefault();
    const nextShow = !showAadhaar;
    setShowAadhaar(nextShow);
    if (nextShow) {
      setDisplayAadhaar(rawAadhaar);
    } else {
      setDisplayAadhaar(maskValue(rawAadhaar));
    }
  };

  // Form Validation
  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Patient name is required';
    } else if (!/^[a-zA-Z\s]+$/.test(formData.name)) {
      newErrors.name = 'Name must contain only alphabetic characters';
    }

    if (!formData.dob) {
      newErrors.dob = 'Date of birth is required';
    } else {
      const birth = new Date(formData.dob);
      const today = new Date();
      if (birth > today) {
        newErrors.dob = 'Date of birth cannot be in the future';
      }
    }

    if (!formData.phone) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(formData.phone)) {
      newErrors.phone = 'Phone number must be exactly 10 digits';
    }

    if (!rawAadhaar) {
      newErrors.gov_id = 'Government ID (Aadhaar) is required';
    } else if (!/^\d{12}$/.test(rawAadhaar)) {
      newErrors.gov_id = 'Aadhaar must be exactly 12 digits';
    }

    if (!formData.purpose_of_visit) {
      newErrors.purpose_of_visit = 'Purpose of visit is required';
    }

    if (!formData.appointment_date) {
      newErrors.appointment_date = 'Target visit date is required';
    } else {
      const appt = new Date(formData.appointment_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      appt.setHours(0, 0, 0, 0);
      if (appt < today) {
        newErrors.appointment_date = 'Visit date cannot be in the past';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear validation error when typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const submissionPayload = {
        ...formData,
        gov_id: rawAadhaar, // send raw 12-digit Aadhaar to backend (where it gets encrypted)
      };

      const result = await submitPatientRegistration(submissionPayload);
      setSuccessData({
        ...result.registration,
        doctor: selectedDoctor || 'General OPD Pool',
      });
    } catch (err) {
      console.error(err);
      if (err.response && err.response.data && err.response.data.errors) {
        const serverErrors = {};
        err.response.data.errors.forEach((e) => {
          serverErrors[e.field === 'gov_id' ? 'gov_id' : e.field] = e.message;
        });
        setErrors(serverErrors);
      } else {
        setErrors({ submit: err.response?.data?.error || 'Registration failed. Please contact receptionist.' });
      }
    } finally {
      setLoading(false);
    }
  };

  if (successData) {
    return (
      <div className="form-wrapper">
        <div className="form-card success-card" style={{ maxWidth: '480px' }}>
          <div className="success-icon">✓</div>
          <h2>Registration Submitted!</h2>
          <p className="qr-text-info">
            Show this QR code at the reception desk to complete your check-in.
          </p>

          <div className="qr-mock-box">
            <div className="qr-mock-image">
              <span style={{ fontSize: '2.5rem' }}>📱</span>
              <span>ASCAS CHECK-IN</span>
              <span style={{ fontSize: '0.65rem', color: '#64748b' }}>
                Temp ID: {successData.tmp_id.substring(0, 8)}...
              </span>
            </div>
          </div>

          <div style={{ textAlign: 'left', marginTop: '1rem' }} className="info-section">
            <div className="info-row">
              <span className="info-label">Name:</span>
              <span className="info-val">{successData.name}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Gender / Age:</span>
              <span className="info-val">{successData.gender} ({calculatedAge})</span>
            </div>
            <div className="info-row">
              <span className="info-label">Mobile:</span>
              <span className="info-val">{successData.phone}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Aadhaar (Gov ID):</span>
              <span className="info-val" style={{ fontFamily: 'monospace' }}>
                {successData.gov_id}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Status:</span>
              <span className="badge badge-pending">PENDING APPROVAL</span>
            </div>
          </div>

          <button onClick={() => { setSuccessData(null); setFormData({
            name: '', dob: '', gender: 'MALE', phone: '', purpose_of_visit: visitTypes[0] || '', referral: '', appointment_date: '',
          }); setRawAadhaar(''); setDisplayAadhaar(''); }} className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
            New Registration
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="form-wrapper">
      <div className="form-card">
        <div className="form-header">
          <h2>Patient Registration</h2>
          <p>Scan the QR Code in our lobby and fill in details for swift checkout</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {errors.submit && <div className="error-message" style={{ marginBottom: '1rem', textAlign: 'center' }}>{errors.submit}</div>}

          {/* Name Field */}
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
              disabled={loading}
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>

          {/* DOB & Age Grid */}
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label htmlFor="dob">Date of Birth</label>
              <input
                type="date"
                id="dob"
                name="dob"
                className="input-control"
                value={formData.dob}
                onChange={handleInputChange}
                disabled={loading}
              />
              {errors.dob && <span className="error-message">{errors.dob}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="age">Age (Calculated)</label>
              <input
                type="text"
                id="age"
                className="input-control"
                value={calculatedAge}
                placeholder="Select DOB..."
                readOnly
              />
            </div>
          </div>

          {/* Gender & Phone Grid */}
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label htmlFor="gender">Gender</label>
              <select
                id="gender"
                name="gender"
                className="input-control"
                value={formData.gender}
                onChange={handleInputChange}
                disabled={loading}
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
              {errors.gender && <span className="error-message">{errors.gender}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="phone">Mobile Number</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                className="input-control"
                placeholder="10-digit mobile number"
                value={formData.phone}
                onChange={handleInputChange}
                disabled={loading}
                maxLength="10"
              />
              {errors.phone && <span className="error-message">{errors.phone}</span>}
            </div>
          </div>

          {/* Government ID (Aadhaar Card) */}
          <div className="form-group">
            <label htmlFor="gov_id">Aadhaar Card Number (12 Digits)</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                id="gov_id"
                className="input-control"
                placeholder="XXXX-XXXX-XXXX"
                value={displayAadhaar}
                onChange={handleAadhaarChange}
                onFocus={handleAadhaarFocus}
                onBlur={handleAadhaarBlur}
                disabled={loading}
                style={{ paddingRight: '3.5rem', fontFamily: 'monospace', letterSpacing: '1px' }}
              />
              <button
                type="button"
                onClick={toggleAadhaarVisibility}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '1.1rem',
                  padding: '5px'
                }}
              >
                {showAadhaar ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {errors.gov_id && <span className="error-message">{errors.gov_id}</span>}
            <div className="info-alert" style={{ marginTop: '0.25rem' }}>
              <span>🔒</span>
              <span>Your Aadhaar number is encrypted instantly. For privacy compliance, the system displays only the last 4 digits.</span>
            </div>
          </div>

          {/* Visit Date & Purpose Grid */}
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label htmlFor="appointment_date">Preferred Visit Date</label>
              <input
                type="date"
                id="appointment_date"
                name="appointment_date"
                className="input-control"
                value={formData.appointment_date}
                onChange={handleInputChange}
                disabled={loading}
              />
              {errors.appointment_date && <span className="error-message">{errors.appointment_date}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="purpose_of_visit">Purpose of Visit</label>
              <select
                id="purpose_of_visit"
                name="purpose_of_visit"
                className="input-control"
                value={formData.purpose_of_visit}
                onChange={handleInputChange}
                disabled={loading}
              >
                {visitTypes.map((vt) => (
                  <option key={vt} value={vt}>{vt}</option>
                ))}
              </select>
              {errors.purpose_of_visit && <span className="error-message">{errors.purpose_of_visit}</span>}
            </div>
          </div>

          {/* Referral & Doctor pool Selection */}
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label htmlFor="referral">Referral Code/Doctor (Optional)</label>
              <input
                type="text"
                id="referral"
                name="referral"
                className="input-control"
                placeholder="e.g. Dr. Jane Smith"
                value={formData.referral}
                onChange={handleInputChange}
                disabled={loading}
              />
              {errors.referral && <span className="error-message">{errors.referral}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="selectedDoctor">Preferred Specialist (Optional)</label>
              <select
                id="selectedDoctor"
                className="input-control"
                value={selectedDoctor}
                onChange={(e) => setSelectedDoctor(e.target.value)}
                disabled={loading}
              >
                <option value="">No preference (OPD pool)</option>
                {doctors.map((doc) => (
                  <option key={doc.id} value={doc.name}>{doc.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '1.5rem', height: '3.2rem', fontSize: '1.05rem' }}
            disabled={loading}
          >
            {loading ? 'Submitting Details...' : 'Register Securely'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default PatientForm;
