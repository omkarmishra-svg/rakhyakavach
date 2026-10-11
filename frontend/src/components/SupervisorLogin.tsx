import React, { useState } from 'react';
import {
  Shield,
  Lock,
  Mail,
  User,
  BadgeCheck,
  Eye,
  EyeOff,
  AlertTriangle,
  ArrowRight,
  Activity,
  CheckCircle2
} from 'lucide-react';
import { Supervisor } from '../types';

interface SupervisorLoginProps {
  onLoginSuccess: (supervisor: Supervisor) => void;
}

export const SupervisorLogin: React.FC<SupervisorLoginProps> = ({ onLoginSuccess }) => {
  const [empId, setEmpId] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);

    const trimmedEmpId = empId.trim().toUpperCase();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmpId || !trimmedName || !trimmedEmail || !trimmedPassword) {
      setErrorMessage('All fields are strictly required: Employee ID, Full Name, Email, and Password.');
      return;
    }

    if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      setErrorMessage('Please enter a valid work email address (e.g. name@enterprise.com).');
      return;
    }

    if (trimmedPassword.length < 4) {
      setErrorMessage('Password must contain at least 4 characters for security authorization.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/supervisor/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          emp_id: trimmedEmpId,
          name: trimmedName,
          email: trimmedEmail,
          password: trimmedPassword
        })
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.detail || data.message || 'Authentication failed. Please verify credentials.');
      }

      setSuccessNotice(data.message || 'Access granted. Initializing Safety Dashboard...');
      localStorage.setItem('raksha_supervisor_session', JSON.stringify(data.supervisor));

      setTimeout(() => {
        onLoginSuccess(data.supervisor);
      }, 700);
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error connecting to Raksha Kavach security server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="supervisor-auth-overlay">
      <div className="supervisor-auth-glow-bg" />
      <div className="supervisor-auth-grid-pattern" />

      <div className="supervisor-auth-card">
        {/* Brand Header with Official Raksha Kavach Logo */}
        <div className="supervisor-auth-header">
          <div className="supervisor-logo-container">
            <img
              src="/logo.png"
              alt="Raksha Kavach Official Logo"
              className="supervisor-official-logo"
            />
            <div className="supervisor-logo-glow" />
          </div>

          <div className="supervisor-brand-meta">
            <h1 className="supervisor-portal-title">RAKSHA KAVACH</h1>
            <div className="supervisor-portal-subtitle">
              <span className="live-sentry-tag">AI SAFETY SENTINEL</span>
              <span className="dot-sep">•</span>
              <span className="portal-spec">SUPERVISOR COMMAND PORTAL</span>
            </div>
            <p className="supervisor-portal-desc">
              Shift floor access control & continuous plant surveillance gateway. Enter authentic corporate supervisor credentials to initiate session.
            </p>
          </div>
        </div>

        {/* Security Alert / Notice */}
        {errorMessage && (
          <div className="supervisor-alert error">
            <AlertTriangle size={18} className="alert-icon" />
            <div className="alert-content">
              <strong>AUTHENTICATION REJECTED</strong>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {successNotice && (
          <div className="supervisor-alert success">
            <CheckCircle2 size={18} className="alert-icon" />
            <div className="alert-content">
              <strong>CREDENTIALS VERIFIED</strong>
              <span>{successNotice}</span>
            </div>
          </div>
        )}

        {/* Login Form: EmpID, Name, Email, Password */}
        <form onSubmit={handleSubmit} className="supervisor-form" noValidate>
          <div className="form-group">
            <label htmlFor="supervisor-empid">
              <BadgeCheck size={14} className="input-label-icon" />
              <span>EMPLOYEE ID (EMPID)</span>
              <span className="required-star">*</span>
            </label>
            <div className="input-wrapper">
              <input
                id="supervisor-empid"
                type="text"
                value={empId}
                onChange={(e) => setEmpId(e.target.value.toUpperCase())}
                placeholder="Enter Employee ID (e.g. RK-SUP-4081)"
                required
                autoComplete="off"
                disabled={isLoading}
              />
              <span className="input-field-indicator">EMPID</span>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="supervisor-name">
              <User size={14} className="input-label-icon" />
              <span>SUPERVISOR FULL NAME</span>
              <span className="required-star">*</span>
            </label>
            <div className="input-wrapper">
              <input
                id="supervisor-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter Full Name (e.g. Vikram Sharma)"
                required
                autoComplete="name"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="supervisor-email">
              <Mail size={14} className="input-label-icon" />
              <span>WORK EMAIL ADDRESS</span>
              <span className="required-star">*</span>
            </label>
            <div className="input-wrapper">
              <input
                id="supervisor-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter Corporate Email (e.g. v.sharma@factory-ehs.org)"
                required
                autoComplete="email"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="supervisor-password">
              <Lock size={14} className="input-label-icon" />
              <span>SECURITY ACCESS PASSWORD</span>
              <span className="required-star">*</span>
            </label>
            <div className="input-wrapper">
              <input
                id="supervisor-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter Supervisor Password"
                required
                autoComplete="current-password"
                disabled={isLoading}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="supervisor-submit-btn"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Activity size={18} className="spin-icon" />
                <span>VERIFYING SUPERVISOR CREDENTIALS...</span>
              </>
            ) : (
              <>
                <Shield size={18} />
                <span>AUTHORIZE & ENTER SAFETY DASHBOARD</span>
                <ArrowRight size={16} className="btn-arrow" />
              </>
            )}
          </button>
        </form>

        {/* Security & Audit Protocol Footer */}
        <div className="supervisor-auth-footer">
          <div className="security-tag-row">
            <div className="security-tag">
              <Shield size={12} />
              <span>OSHA 1910 & ISO 45001 COMPLIANT</span>
            </div>
            <div className="security-tag">
              <Activity size={12} />
              <span>LIVE AUDIT LOGGING ACTIVE</span>
            </div>
          </div>
          <p className="security-disclaimer">
            All supervisor sessions are cryptographically logged to the plant safety database. Unofficial access attempts are flagged by the AI sentinel.
          </p>
        </div>
      </div>
    </div>
  );
};
