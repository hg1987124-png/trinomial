import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execFile } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const ACCOUNTS_FILE = path.join(DATA_DIR, 'accounts.json');
const PYTHON_OTP_SCRIPT = path.join(__dirname, 'send_otp_email.py');

export type AccountRole = 'user' | 'ngo';

export interface AuthAccount {
  id: string;
  role: AccountRole;
  name: string;
  email: string;
  phone?: string;
  ward?: string;
  // Citizen-specific optional fields
  skills_or_interests?: string;
  // NGO-specific fields
  organization_name?: string;
  ngo_darpan_id?: string;
  service_domains?: string[];
  verified: boolean;
  created_at: string;
  last_login_at: string;
}

interface PendingOtpRecord {
  email: string;
  role: AccountRole;
  mode: 'login' | 'register';
  otp_hash: string;
  expires_at: number; // epoch ms (5 minutes)
  attempts: number;
  profile_draft: {
    name?: string;
    phone?: string;
    ward?: string;
    skills_or_interests?: string;
    organization_name?: string;
    ngo_darpan_id?: string;
    service_domains?: string[];
  };
}

interface AccountsStore {
  accounts: AuthAccount[];
  sessions: Record<string, { account_id: string; created_at: string }>;
}

const pendingOtps = new Map<string, PendingOtpRecord>();

function hashOtp(otp: string, email: string, role: AccountRole): string {
  return crypto
    .createHash('sha256')
    .update(`${email.toLowerCase().trim()}:${role}:${otp.trim()}`)
    .digest('hex');
}

function loadAccountsStore(): AccountsStore {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(ACCOUNTS_FILE)) {
      const raw = fs.readFileSync(ACCOUNTS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.accounts)) {
        return {
          accounts: parsed.accounts,
          sessions: parsed.sessions || {},
        };
      }
    }
  } catch (err) {
    console.warn('[Auth] Failed to read accounts.json, initializing fresh store:', err);
  }

  const initial: AccountsStore = {
    accounts: [],
    sessions: {},
  };
  saveAccountsStore(initial);
  return initial;
}

function saveAccountsStore(store: AccountsStore): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Auth] Failed to save accounts.json:', err);
  }
}

const store: AccountsStore = loadAccountsStore();

export function findAccountByEmailAndRole(email: string, role: AccountRole): AuthAccount | undefined {
  const normEmail = email.toLowerCase().trim();
  return store.accounts.find(
    (a) => a.email.toLowerCase() === normEmail && a.role === role
  );
}

export function findAccountByEmailAnyRole(email: string): AuthAccount[] {
  const normEmail = email.toLowerCase().trim();
  return store.accounts.filter((a) => a.email.toLowerCase() === normEmail);
}

function dispatchEmailViaPythonSmtp(
  toEmail: string,
  otpCode: string,
  userName: string,
  role: AccountRole
): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(
      'python3',
      [PYTHON_OTP_SCRIPT, toEmail, otpCode, userName, role],
      {
        timeout: 20000,
        env: { ...process.env, PYTHONUNBUFFERED: '1' },
      },
      (error, stdout, stderr) => {
        if (error) {
          const errText = (stderr || error.message || 'SMTP dispatch failed').trim();
          return reject(new Error(`Failed to send verification email to ${toEmail}: ${errText}`));
        }
        if (stdout && stdout.includes('SUCCESS')) {
          return resolve();
        }
        resolve();
      }
    );
  });
}

export async function requestOtpForAccount(params: {
  email: string;
  role: AccountRole;
  mode: 'login' | 'register';
  name?: string;
  phone?: string;
  ward?: string;
  skills_or_interests?: string;
  organization_name?: string;
  ngo_darpan_id?: string;
  service_domains?: string[];
}): Promise<{ message: string; email: string; role: AccountRole; expires_in_seconds: number }> {
  const email = (params.email || '').trim().toLowerCase();
  const role: AccountRole = params.role === 'ngo' ? 'ngo' : 'user';
  const mode = params.mode === 'register' ? 'register' : 'login';

  if (!email || !email.includes('@') || !email.includes('.')) {
    throw new Error('Please enter a valid email address.');
  }

  const existingSameRole = findAccountByEmailAndRole(email, role);

  if (mode === 'login' && !existingSameRole) {
    const otherRole: AccountRole = role === 'ngo' ? 'user' : 'ngo';
    const existingOtherRole = findAccountByEmailAndRole(email, otherRole);
    if (existingOtherRole) {
      throw new Error(
        `This email is registered under the ${
          otherRole === 'ngo' ? 'NGO Portal' : 'Citizen / Volunteer Portal'
        }, not the ${
          role === 'ngo' ? 'NGO Portal' : 'Citizen / Volunteer Portal'
        }. Please switch to the ${
          otherRole === 'ngo' ? 'NGO Login' : 'Citizen Login'
        } tab or register a new ${role.toUpperCase()} account.`
      );
    }
    throw new Error(
      `No ${
        role === 'ngo' ? 'NGO Partner' : 'Citizen / Volunteer'
      } account found for ${email}. Please switch to "Register New ${
        role === 'ngo' ? 'NGO' : 'Citizen'
      } Account" first.`
    );
  }

  if (mode === 'register') {
    if (!params.name || !params.name.trim()) {
      throw new Error(
        role === 'ngo'
          ? 'Please provide the authorized NGO coordinator name.'
          : 'Please provide your full name.'
      );
    }
    if (role === 'ngo' && (!params.organization_name || !params.organization_name.trim())) {
      throw new Error('Please provide your NGO / Civic Organization name.');
    }
  }

  // Generate 6-digit numeric OTP
  const otpCode = String(crypto.randomInt(100000, 999999));
  const key = `${role}:${email}`;
  const displayName =
    (params.name && params.name.trim()) ||
    existingSameRole?.name ||
    (role === 'ngo' ? params.organization_name || 'NGO Partner' : 'Citizen Volunteer');

  // Send OTP strictly to the user's email inbox via Python SMTP (never returned in API response!)
  await dispatchEmailViaPythonSmtp(email, otpCode, displayName, role);

  pendingOtps.set(key, {
    email,
    role,
    mode,
    otp_hash: hashOtp(otpCode, email, role),
    expires_at: Date.now() + 5 * 60 * 1000, // 5 minutes
    attempts: 0,
    profile_draft: {
      name: params.name?.trim(),
      phone: params.phone?.trim(),
      ward: params.ward?.trim(),
      skills_or_interests: params.skills_or_interests?.trim(),
      organization_name: params.organization_name?.trim(),
      ngo_darpan_id: params.ngo_darpan_id?.trim(),
      service_domains: params.service_domains,
    },
  });

  return {
    message: `A 6-digit verification passcode has been sent to your email (${email}). Please check your inbox and enter the code within 5 minutes.`,
    email,
    role,
    expires_in_seconds: 300,
  };
}

export function verifyOtpAndLogin(params: {
  email: string;
  role: AccountRole;
  otp_code: string;
}): { token: string; account: AuthAccount } {
  const email = (params.email || '').trim().toLowerCase();
  const role: AccountRole = params.role === 'ngo' ? 'ngo' : 'user';
  const otpCode = (params.otp_code || '').trim();

  if (!email || !otpCode) {
    throw new Error('Email and 6-digit verification code are required.');
  }

  const key = `${role}:${email}`;
  const record = pendingOtps.get(key);

  if (!record) {
    throw new Error('No active verification code found for this email. Please request a new passcode.');
  }

  if (Date.now() > record.expires_at) {
    pendingOtps.delete(key);
    throw new Error('Your verification passcode has expired (5-minute limit). Please request a new code.');
  }

  record.attempts += 1;
  if (record.attempts > 5) {
    pendingOtps.delete(key);
    throw new Error('Too many incorrect verification attempts. Please request a new passcode.');
  }

  const candidateHash = hashOtp(otpCode, email, role);
  if (candidateHash !== record.otp_hash) {
    throw new Error('Invalid verification passcode. Please check your email inbox and try again.');
  }

  // OTP verified! Remove pending OTP record
  pendingOtps.delete(key);

  const nowIso = new Date().toISOString();
  let account = findAccountByEmailAndRole(email, role);

  if (account) {
    account.verified = true;
    account.last_login_at = nowIso;
    if (record.profile_draft.name) account.name = record.profile_draft.name;
    if (record.profile_draft.phone) account.phone = record.profile_draft.phone;
    if (record.profile_draft.ward) account.ward = record.profile_draft.ward;
    if (role === 'user' && record.profile_draft.skills_or_interests) {
      account.skills_or_interests = record.profile_draft.skills_or_interests;
    }
    if (role === 'ngo') {
      if (record.profile_draft.organization_name) {
        account.organization_name = record.profile_draft.organization_name;
      }
      if (record.profile_draft.ngo_darpan_id) {
        account.ngo_darpan_id = record.profile_draft.ngo_darpan_id;
      }
      if (record.profile_draft.service_domains) {
        account.service_domains = record.profile_draft.service_domains;
      }
    }
  } else {
    account = {
      id: `${role}-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      role,
      name:
        record.profile_draft.name ||
        (role === 'ngo' ? 'NGO Coordinator' : email.split('@')[0]),
      email,
      phone: record.profile_draft.phone,
      ward: record.profile_draft.ward || 'L-Ward',
      skills_or_interests:
        role === 'user' ? record.profile_draft.skills_or_interests : undefined,
      organization_name:
        role === 'ngo'
          ? record.profile_draft.organization_name || 'Registered Civic NGO Partner'
          : undefined,
      ngo_darpan_id:
        role === 'ngo'
          ? record.profile_draft.ngo_darpan_id || 'MH/2026/DARPAN-VERIFIED'
          : undefined,
      service_domains:
        role === 'ngo'
          ? record.profile_draft.service_domains || ['Water Supply', 'Community Mobilization']
          : undefined,
      verified: true,
      created_at: nowIso,
      last_login_at: nowIso,
    };
    store.accounts.unshift(account);
  }

  const token = crypto.randomBytes(32).toString('hex');
  store.sessions[token] = {
    account_id: account.id,
    created_at: nowIso,
  };
  saveAccountsStore(store);

  return { token, account };
}

export function getAccountByToken(token?: string | null): AuthAccount | null {
  if (!token) return null;
  const clean = token.replace(/^Bearer\s+/i, '').trim();
  const sess = store.sessions[clean];
  if (!sess) return null;
  return store.accounts.find((a) => a.id === sess.account_id) || null;
}

export function revokeSession(token?: string | null): void {
  if (!token) return;
  const clean = token.replace(/^Bearer\s+/i, '').trim();
  if (store.sessions[clean]) {
    delete store.sessions[clean];
    saveAccountsStore(store);
  }
}
