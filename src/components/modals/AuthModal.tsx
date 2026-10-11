import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Building2,
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  KeyRound,
  MapPin,
  Phone,
  FileBadge,
} from 'lucide-react';
import { AccountRole, AuthAccount } from '../../types/civic';
import { api } from '../../services/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRole?: AccountRole;
  initialMode?: 'login' | 'register';
  onAuthSuccess: (account: AuthAccount, token: string) => void;
}

const MUMBAI_WARDS = [
  'A-Ward (Colaba / Fort)',
  'D-Ward (Malabar Hill / Grant Road)',
  'F-North (Matunga / Sion)',
  'G-North (Dharavi / Dadar / Mahim)',
  'H-East (Bandra East / Santacruz)',
  'K-West (Andheri West / Juhu)',
  'L-Ward (Kurla / Saki Naka)',
  'M-East (Govandi / Mankhurd / Deonar)',
  'M-West (Chembur)',
  'N-Ward (Ghatkopar)',
  'R-North (Dahisar)',
  'S-Ward (Bhandup / Powai)',
];

const NGO_SERVICE_DOMAINS = [
  'Water Supply & Sanitation',
  'Solid Waste & Cleanliness',
  'Sewerage & Storm Drain Audits',
  'Air Quality & Environmental Health',
  'Public Toilets & Slum Sanitation',
  'Roads & Pedestrian Safety',
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialRole = 'user',
  initialMode = 'login',
  onAuthSuccess,
}) => {
  const [role, setRole] = useState<AccountRole>(initialRole);
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [step, setStep] = useState<'form' | 'verify_otp'>('form');

  // Shared fields
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [ward, setWard] = useState('L-Ward (Kurla / Saki Naka)');

  // Citizen-specific fields
  const [skillsOrInterests, setSkillsOrInterests] = useState(
    'Community Awareness, Water Quality Observation, Field Survey'
  );

  // NGO-specific fields
  const [organizationName, setOrganizationName] = useState('');
  const [ngoDarpanId, setNgoDarpanId] = useState('');
  const [selectedDomains, setSelectedDomains] = useState<string[]>([
    'Water Supply & Sanitation',
    'Solid Waste & Cleanliness',
  ]);

  // OTP Verification fields
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setRole(initialRole);
      setMode(initialMode);
      setStep('form');
      setOtpCode('');
      setError(null);
      setInfoMessage(null);
    }
  }, [isOpen, initialRole, initialMode]);

  if (!isOpen) return null;

  const handleRoleSwitch = (newRole: AccountRole) => {
    setRole(newRole);
    setStep('form');
    setOtpCode('');
    setError(null);
    setInfoMessage(null);
  };

  const handleModeSwitch = (newMode: 'login' | 'register') => {
    setMode(newMode);
    setStep('form');
    setOtpCode('');
    setError(null);
    setInfoMessage(null);
  };

  const toggleDomain = (domain: string) => {
    setSelectedDomains((prev) =>
      prev.includes(domain) ? prev.filter((d) => d !== domain) : [...prev, domain]
    );
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError('Please enter a valid email address to receive your verification passcode.');
      return;
    }

    if (mode === 'register') {
      if (!name.trim()) {
        setError(
          role === 'ngo'
            ? 'Please enter the authorized NGO coordinator name.'
            : 'Please enter your full name.'
        );
        return;
      }
      if (role === 'ngo' && !organizationName.trim()) {
        setError('Please enter your NGO or Civic Organization name.');
        return;
      }
    }

    setLoading(true);
    try {
      const res = await api.sendAuthOtp({
        email: trimmedEmail,
        role,
        mode,
        name: mode === 'register' ? name.trim() : undefined,
        phone: mode === 'register' ? phone.trim() : undefined,
        ward: mode === 'register' ? ward.split(' (')[0] : undefined,
        skills_or_interests:
          mode === 'register' && role === 'user' ? skillsOrInterests.trim() : undefined,
        organization_name:
          mode === 'register' && role === 'ngo' ? organizationName.trim() : undefined,
        ngo_darpan_id:
          mode === 'register' && role === 'ngo' ? ngoDarpanId.trim() : undefined,
        service_domains:
          mode === 'register' && role === 'ngo' ? selectedDomains : undefined,
      });

      setInfoMessage(res.message);
      setStep('verify_otp');
    } catch (err: any) {
      setError(err?.message || 'Failed to send verification email. Please verify the address and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanOtp = otpCode.trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      setError('Please enter the 6-digit numeric passcode sent to your email inbox.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.verifyAuthOtp({
        email: email.trim(),
        role,
        otp_code: cleanOtp,
      });

      onAuthSuccess(res.account, res.token);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Invalid or expired verification passcode.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-md w-full max-w-lg shadow-xl overflow-hidden my-8">
        {/* Top Portal Switcher (Separate Citizen vs. NGO Portals) */}
        <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={() => handleRoleSwitch('user')}
            className={`py-3.5 px-4 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer border-b-2 ${
              role === 'user'
                ? 'bg-white text-[#047857] border-[#047857]'
                : 'text-slate-600 hover:text-[#047857] border-transparent'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Citizen / Volunteer Portal</span>
          </button>

          <button
            type="button"
            onClick={() => handleRoleSwitch('ngo')}
            className={`py-3.5 px-4 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer border-b-2 ${
              role === 'ngo'
                ? 'bg-white text-[#F97316] border-[#F97316]'
                : 'text-slate-600 hover:text-[#F97316] border-transparent'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>NGO &amp; Organization Portal</span>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Modal Header */}
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <span
                className={`text-[10px] font-bold uppercase tracking-widest block ${
                  role === 'ngo' ? 'text-[#F97316]' : 'text-[#047857]'
                }`}
              >
                {role === 'ngo'
                  ? 'VERIFIED NGO & CIVIC COORDINATOR ACCESS'
                  : 'CITIZEN & FIELD VOLUNTEER ACCESS'}
              </span>
              <h2 className="text-lg font-extrabold text-slate-900 mt-0.5">
                {role === 'ngo'
                  ? mode === 'login'
                    ? 'Sign In to NGO Partner Account'
                    : 'Register Official NGO Partner Account'
                  : mode === 'login'
                  ? 'Sign In to Citizen / Volunteer Account'
                  : 'Create Citizen / Volunteer Account'}
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                {role === 'ngo'
                  ? 'Publish volunteer mobilization drives, coordinate with municipal wards, and update civic issue statuses.'
                  : 'Join verified community action drives, report local civic issues, and track ward-level progress.'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Login / Register Mode Switch */}
          {step === 'form' && (
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-md text-xs">
              <button
                type="button"
                onClick={() => handleModeSwitch('login')}
                className={`flex-1 py-1.5 font-bold rounded-xs transition-colors cursor-pointer ${
                  mode === 'login'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Existing {role === 'ngo' ? 'NGO' : 'Citizen'} Sign In
              </button>
              <button
                type="button"
                onClick={() => handleModeSwitch('register')}
                className={`flex-1 py-1.5 font-bold rounded-xs transition-colors cursor-pointer ${
                  mode === 'register'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Register New {role === 'ngo' ? 'NGO' : 'Citizen'} Account
              </button>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Step 1: Email & Profile Form */}
          {step === 'form' && (
            <form onSubmit={handleRequestOtp} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                  {role === 'ngo' ? 'Official NGO Email Address *' : 'Your Email Address *'}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={
                      role === 'ngo'
                        ? 'coordinator@your-ngo.org'
                        : 'citizen@example.com'
                    }
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-hidden focus:border-[#047857]"
                  />
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  A 6-digit verification passcode will be sent directly to this email inbox.
                </span>
              </div>

              {mode === 'register' && (
                <div className="space-y-3.5 pt-2 border-t border-slate-200">
                  {role === 'ngo' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                          NGO / Organization Name *
                        </label>
                        <div className="relative">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            required
                            value={organizationName}
                            onChange={(e) => setOrganizationName(e.target.value)}
                            placeholder="e.g., Pani Haq Samiti"
                            className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                          NGO Darpan / Reg. ID
                        </label>
                        <div className="relative">
                          <FileBadge className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={ngoDarpanId}
                            onChange={(e) => setNgoDarpanId(e.target.value)}
                            placeholder="e.g., MH/2025/0284910"
                            className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                        {role === 'ngo' ? 'Coordinator Full Name *' : 'Your Full Name *'}
                      </label>
                      <div className="relative">
                        <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder={role === 'ngo' ? 'Coordinator Name' : 'Priya Sharma'}
                          className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                        Contact Phone
                      </label>
                      <div className="relative">
                        <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+91 98200 00000"
                          className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                      Primary Municipal Ward
                    </label>
                    <div className="relative">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <select
                        value={ward}
                        onChange={(e) => setWard(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900"
                      >
                        {MUMBAI_WARDS.map((w) => (
                          <option key={w} value={w}>
                            {w}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {role === 'user' ? (
                    <div>
                      <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                        Volunteer Interests / Skills
                      </label>
                      <input
                        type="text"
                        value={skillsOrInterests}
                        onChange={(e) => setSkillsOrInterests(e.target.value)}
                        placeholder="e.g., Water Advisory Distribution, Ward Survey, Photography"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1.5">
                        Active Civic Service Domains
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {NGO_SERVICE_DOMAINS.map((dom) => {
                          const active = selectedDomains.includes(dom);
                          return (
                            <button
                              key={dom}
                              type="button"
                              onClick={() => toggleDomain(dom)}
                              className={`px-2.5 py-1 rounded-xs text-[11px] font-semibold border transition-colors cursor-pointer ${
                                active
                                  ? 'bg-[#F97316] text-white border-[#F97316]'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {dom}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-2.5 px-4 text-white font-bold rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50 ${
                    role === 'ngo'
                      ? 'bg-[#F97316] hover:bg-[#EA580C]'
                      : 'bg-[#047857] hover:bg-[#035f44]'
                  }`}
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Sending Verification Code to {email || 'Email'}...</span>
                    </>
                  ) : (
                    <>
                      <span>Send 6-Digit Verification Passcode to Email</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Step 2: Enter 6-Digit Email OTP */}
          {step === 'verify_otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4 text-xs">
              {infoMessage && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-900 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-bold">Verification Email Sent</div>
                    <p className="text-[11px] leading-relaxed">{infoMessage}</p>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                  Enter 6-Digit Email Passcode *
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-md text-slate-900 font-mono text-base tracking-[0.4em] font-bold focus:outline-hidden focus:border-[#047857]"
                  />
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Check the inbox (and Spam/Promotions folder) of <strong>{email}</strong> for the email from Kartavya Civic.
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep('form');
                    setError(null);
                  }}
                  className="px-3.5 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold rounded-md cursor-pointer"
                >
                  Change Email
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleRequestOtp}
                    className="px-3 py-2 text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
                  >
                    Resend Code
                  </button>

                  <button
                    type="submit"
                    disabled={loading || otpCode.length !== 6}
                    className={`px-5 py-2 text-white font-bold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 ${
                      role === 'ngo'
                        ? 'bg-[#F97316] hover:bg-[#EA580C]'
                        : 'bg-[#047857] hover:bg-[#035f44]'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>{loading ? 'Verifying...' : 'Verify & Sign In'}</span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
