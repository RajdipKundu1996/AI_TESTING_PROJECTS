'use strict';
const http  = require('http');
const path  = require('path');
const fs    = require('fs');
const XLSX  = require('xlsx');

const PORT       = 3005;
const EXCEL_PATH = path.join(__dirname, '..', '..', '..', 'UserCredentials.xlsx');
const SHEET      = 'UserCredentials';
const COLS       = [
  'Serial No','Full Name','Employee ID','Organization','Official Email',
  'Mobile Number','Password','Account Type','Account Status',
  'OTP Attempts','OTP Block Until','Registered At','Last Updated'
];

// ── In-memory OTP store ──────────────────────────────────────────────────────
const otpStore = new Map();   // mobile → { otp: string, expiresAt: Date }

// ── Session Store & Audit Infrastructure ─────────────────────────────────────
const sessions        = new Map();  // sid → SessionRecord
const sessionsByEmail = new Map();  // email → Set<sid>
const pendingLogins   = new Map();  // pendingToken → { email, user, exp }
const EVENTS_PATH     = path.join(__dirname, '..', '..', '..', 'SecurityEvents.json');

function genId() { return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9); }

function readEvents() {
  try { return fs.existsSync(EVENTS_PATH) ? JSON.parse(fs.readFileSync(EVENTS_PATH, 'utf8')) : []; }
  catch { return []; }
}
function appendEvent(ev) {
  try {
    const all = readEvents();
    all.unshift({ event_id: genId(), timestamp: new Date().toISOString(), ...ev });
    fs.writeFileSync(EVENTS_PATH, JSON.stringify(all.slice(0, 1000), null, 2));
  } catch (e) { console.error('[Auth] Event log error:', e.message); }
}

function getIp(req) {
  const raw = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1';
  return raw.replace(/^::ffff:/, '');
}
function isPrivate(ip) { return /^(127\.|0\.|localhost|::1$|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(ip || ''); }

async function geolocate(ip) {
  if (isPrivate(ip)) return '—';
  return new Promise(resolve => {
    const r = http.request(
      { hostname: 'ip-api.com', path: `/json/${ip}?fields=city,status`, method: 'GET', timeout: 3000 },
      res2 => {
        let d = ''; res2.on('data', c => (d += c));
        res2.on('end', () => { try { const j = JSON.parse(d); resolve(j.status === 'success' && j.city ? j.city : '—'); } catch { resolve('—'); } });
      }
    );
    r.on('error', () => resolve('—')); r.on('timeout', () => { r.destroy(); resolve('—'); }); r.end();
  });
}

function sessStatus(s) {
  if (!s || !s.valid) return 'Offline';
  const now = Date.now(), ls = new Date(s.lastSeen).getTime(), lt = new Date(s.loginTime).getTime();
  if (now - lt > 8 * 3600000) return 'Offline';
  if (now - ls > 30 * 60000) return 'Idle';
  return 'Active';
}

function emailSessions(email) { return [...(sessionsByEmail.get(email) || [])].map(id => sessions.get(id)).filter(Boolean); }
function addSess(email, sid)   { if (!sessionsByEmail.has(email)) sessionsByEmail.set(email, new Set()); sessionsByEmail.get(email).add(sid); }
function delSess(email, sid)   { (sessionsByEmail.get(email) || new Set()).delete(sid); }

function createSession(req, email, row) {
  const ip  = getIp(req);
  const sid = genId();
  sessions.set(sid, {
    sessionId: sid, email, fullName: row['Full Name'] || '', accountType: row['Account Type'] || '',
    ip, location: '—', userAgent: req.headers['user-agent'] || '',
    loginTime: new Date().toISOString(), lastSeen: new Date().toISOString(),
    valid: true, forceLogout: false, forceLogoutReason: null
  });
  addSess(email, sid);
  geolocate(ip).then(city => { const s = sessions.get(sid); if (s) s.location = city; });
  return sid;
}

function invalidateSessions(email, reason) {
  for (const s of emailSessions(email)) {
    if (s.valid) { s.valid = false; s.forceLogout = true; s.forceLogoutReason = reason; }
  }
}

// ── Date formatter (human-readable for display columns) ─────────────────────
// Idempotent: already in DD/MM/YYYY format → returned unchanged; ISO/other → converted
function fmtDT(val) {
  if (!val) return '';
  const s = String(val).trim();
  if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) return s;   // already formatted
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;               // unparseable → keep as-is
    const p = n => String(n).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  } catch(_) { return s; }
}

// ── Excel helpers ────────────────────────────────────────────────────────────
function readRows() {
  try {
    if (!fs.existsSync(EXCEL_PATH)) return [];
    const wb = XLSX.readFile(EXCEL_PATH);
    const ws = wb.Sheets[SHEET];
    if (!ws) return [];
    return XLSX.utils.sheet_to_json(ws, { defval: '' });
  } catch (e) {
    console.error('[Auth] Excel read error:', e.message);
    return [];
  }
}

function writeRows(rows) {
  try {
    const wb  = XLSX.utils.book_new();

    // Always use aoa_to_sheet so column order and cell types are guaranteed
    const aoa = [ COLS.slice() ];   // Row 1: header

    for (const row of rows) {
      // Retrieve values in exact COLS order, enforcing correct types per column
      const blockUntil = row['OTP Block Until'];
      aoa.push([
        Number(row['Serial No'])    || 0,                        // A – number
        String(row['Full Name']     || '').trim(),               // B – text
        String(row['Employee ID']   || '').trim(),               // C – text
        String(row['Organization']  || '').trim(),               // D – text
        String(row['Official Email']|| '').toLowerCase().trim(), // E – text
        String(row['Mobile Number'] || '').trim(),               // F – text
        String(row['Password']        || ''),                      // G – text
        String(row['Account Type']    || '').trim(),               // H – text
        String(row['Account Status']  || 'Active').trim(),         // I – Active/Suspended
        Number(row['OTP Attempts'])  >= 0 ? Number(row['OTP Attempts']) : 0, // J – number
        (blockUntil && String(blockUntil).trim()) ? String(blockUntil).trim() : null, // K – ISO or empty
        row['Registered At'] ? fmtDT(row['Registered At'])  : '',  // L – readable date
        row['Last Updated']  ? fmtDT(row['Last Updated'])   : '',  // M – readable date
      ]);
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Column widths so Excel opens looking clean
    ws['!cols'] = [
      { wch: 10 },   // Serial No
      { wch: 26 },   // Full Name
      { wch: 16 },   // Employee ID
      { wch: 22 },   // Organization
      { wch: 36 },   // Official Email
      { wch: 18 },   // Mobile Number
      { wch: 22 },   // Password
      { wch: 14 },   // Account Type
      { wch: 14 },   // Account Status
      { wch: 14 },   // OTP Attempts
      { wch: 26 },   // OTP Block Until
      { wch: 22 },   // Registered At
      { wch: 22 },   // Last Updated
    ];

    XLSX.utils.book_append_sheet(wb, ws, SHEET);
    XLSX.writeFile(wb, EXCEL_PATH);
  } catch (e) {
    console.error('[Auth] Excel write error:', e.message);
  }
}

function initExcel() {
  if (fs.existsSync(EXCEL_PATH)) {
    console.log('[Auth] UserCredentials.xlsx found');
    return;
  }
  // No default accounts — users must register first
  writeRows([]);
  console.log('[Auth] Created empty UserCredentials.xlsx — register a new account to get started');
}

// ── Request body parser ──────────────────────────────────────────────────────
function readBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', c => (data += c));
    req.on('end', () => {
      try { resolve(JSON.parse(data)); }
      catch { resolve({}); }
    });
  });
}

// ── Response helper ──────────────────────────────────────────────────────────
function respond(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(body));
}

// ── Validation ───────────────────────────────────────────────────────────────
const isEmail    = e  => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const isMobile   = m  => /^\+\d{10,15}$/.test(m);
const isPassword = p  => p && p.length >= 8 && /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p);
const isName     = n  => /^[A-Za-z\s]{2,}$/.test((n || '').trim());
const isEmpId    = id => /^[A-Z0-9][A-Z0-9\-]{2,19}$/i.test((id || '').trim());

// ── HTTP Server ──────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const url      = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const pathname = url.pathname;
  const method   = req.method.toUpperCase();

  if (method === 'OPTIONS') { respond(res, 204, {}); return; }

  // ── Health ─────────────────────────────────────────────────────────────────
  if (pathname === '/health') {
    respond(res, 200, { status: 'ok', service: 'auth', port: PORT });
    return;
  }

  // ── GET /api/check-email ───────────────────────────────────────────────────
  if (method === 'GET' && pathname === '/api/check-email') {
    const email = (url.searchParams.get('email') || '').toLowerCase().trim();
    const rows  = readRows();
    respond(res, 200, { exists: rows.some(r => (r['Official Email'] || '').toLowerCase() === email) });
    return;
  }

  // ── GET /api/check-mobile ──────────────────────────────────────────────────
  if (method === 'GET' && pathname === '/api/check-mobile') {
    const mobile = (url.searchParams.get('mobile') || '').trim();
    const excludeEmail = (url.searchParams.get('excludeEmail') || '').toLowerCase();
    const rows   = readRows();
    const exists = rows.some(r => r['Mobile Number'] === mobile &&
      (r['Official Email'] || '').toLowerCase() !== excludeEmail);
    respond(res, 200, { exists });
    return;
  }

  // ── POST /api/register ─────────────────────────────────────────────────────
  if (method === 'POST' && pathname === '/api/register') {
    const body = await readBody(req);
    const { fullName, employeeId, organization, email, mobile, password } = body;

    if (!isName(fullName))
      return respond(res, 400, { success: false, error: 'validation_error', message: 'Name must contain only letters and spaces (min 2 characters)' });
    if (!isEmpId(employeeId))
      return respond(res, 400, { success: false, error: 'validation_error', message: 'Employee ID must be at least 3 alphanumeric characters (letters, digits, hyphens)' });
    if (!organization || !['eMudhra Limited', 'External'].includes(organization))
      return respond(res, 400, { success: false, error: 'validation_error', message: 'Please select your organization' });
    if (!isEmail(email))
      return respond(res, 400, { success: false, error: 'validation_error', message: 'Please enter a valid email address' });

    const emailLc = email.toLowerCase();
    if (organization === 'eMudhra Limited' && !emailLc.endsWith('@emudhra.com'))
      return respond(res, 400, { success: false, error: 'validation_error', message: 'Internal employees must use an @emudhra.com email' });
    if (organization === 'External' && emailLc.endsWith('@emudhra.com'))
      return respond(res, 400, { success: false, error: 'validation_error', message: 'External users cannot use an @emudhra.com email' });
    if (!isMobile(mobile))
      return respond(res, 400, { success: false, error: 'validation_error', message: 'Enter a valid mobile number (e.g. +919876543210)' });
    if (!isPassword(password))
      return respond(res, 400, { success: false, error: 'validation_error', message: 'Password must be 8+ characters with uppercase, lowercase, number, and special character' });

    const rows = readRows();
    if (rows.some(r => (r['Official Email'] || '').toLowerCase() === emailLc))
      return respond(res, 400, { success: false, error: 'email_exists', message: 'An account with this email already exists' });
    if (rows.some(r => r['Mobile Number'] === mobile))
      return respond(res, 400, { success: false, error: 'mobile_exists', message: 'This mobile number is already registered' });

    const now         = new Date().toISOString();
    const accountType = emailLc.endsWith('@emudhra.com') ? 'Internal' : 'External';
    const serialNo    = rows.length > 0 ? Math.max(...rows.map(r => Number(r['Serial No']) || 0)) + 1 : 1;

    rows.push({
      'Serial No': serialNo, 'Full Name': fullName.trim(),
      'Employee ID': (employeeId || '').toUpperCase().trim(),
      'Organization': organization,
      'Official Email': emailLc, 'Mobile Number': mobile,
      'Password': password, 'Account Type': accountType,
      'Account Status': 'Active',
      'OTP Attempts': 0, 'OTP Block Until': '',
      'Registered At': now, 'Last Updated': now,
    });
    writeRows(rows);
    console.log(`[Auth] Registered: ${emailLc}`);
    respond(res, 200, { success: true });
    return;
  }

  // ── POST /api/login ────────────────────────────────────────────────────────
  if (method === 'POST' && pathname === '/api/login') {
    const body  = await readBody(req);
    const email = (body.email || '').toLowerCase().trim();
    const rows  = readRows();
    const row   = rows.find(r => (r['Official Email'] || '').toLowerCase() === email);

    if (!row) return respond(res, 200, { success: false, error: 'user_not_found' });
    if (row['Password'] !== body.password) return respond(res, 200, { success: false, error: 'incorrect_password' });
    if ((row['Account Status'] || 'Active') === 'Suspended')
      return respond(res, 200, { success: false, error: 'account_suspended', message: 'Your account has been suspended. Contact your administrator.' });

    const userData = {
      fullName: row['Full Name'], employeeId: row['Employee ID'],
      organization: row['Organization'], email: row['Official Email'],
      mobile: row['Mobile Number'], accountType: row['Account Type'],
    };

    // Concurrent session detection
    const active = emailSessions(email).filter(s => s.valid);
    if (active.length > 0) {
      const pt = genId();
      pendingLogins.set(pt, { email, user: userData, exp: Date.now() + 5 * 60000 });
      setTimeout(() => pendingLogins.delete(pt), 5 * 60000);
      return respond(res, 200, { conflict: true, pendingToken: pt, existingCount: active.length });
    }

    const sid = createSession(req, email, row);
    appendEvent({ event_type: 'LOGIN', actor_user_id: email, session_id: sid, ip_address: getIp(req), metadata: { method: 'password' } });
    return respond(res, 200, { success: true, sessionId: sid, user: userData });
  }

  // ── POST /api/otp/send ─────────────────────────────────────────────────────
  if (method === 'POST' && pathname === '/api/otp/send') {
    const body   = await readBody(req);
    const mobile = (body.mobile || '').trim();
    const rows   = readRows();
    const rowIdx = rows.findIndex(r => r['Mobile Number'] === mobile);

    if (rowIdx === -1) return respond(res, 200, { success: false, error: 'user_not_found' });

    const row       = rows[rowIdx];
    const blockUntil = row['OTP Block Until'];

    if (blockUntil && new Date(blockUntil) > new Date()) {
      return respond(res, 200, { success: false, error: 'account_blocked', blockedUntil: blockUntil });
    }
    // Reset expired block
    if (Number(row['OTP Attempts']) >= 3 && (!blockUntil || new Date(blockUntil) <= new Date())) {
      rows[rowIdx]['OTP Attempts']   = 0;
      rows[rowIdx]['OTP Block Until'] = '';
      writeRows(rows);
    }

    const otp       = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    otpStore.set(mobile, { otp, expiresAt });
    console.log(`[OTP] Mobile: ${mobile} | OTP: ${otp} | Expires: ${expiresAt.toISOString()}`);
    respond(res, 200, { success: true, message: 'OTP sent' });
    return;
  }

  // ── POST /api/otp/verify ───────────────────────────────────────────────────
  if (method === 'POST' && pathname === '/api/otp/verify') {
    const body   = await readBody(req);
    const mobile = (body.mobile || '').trim();
    const otp    = String(body.otp || '');

    const stored = otpStore.get(mobile);
    if (!stored || new Date(stored.expiresAt) < new Date()) {
      otpStore.delete(mobile);
      return respond(res, 200, { success: false, error: 'otp_expired' });
    }

    if (stored.otp !== otp) {
      const rows   = readRows();
      const rowIdx = rows.findIndex(r => r['Mobile Number'] === mobile);
      if (rowIdx !== -1) {
        const newAttempts = Number(rows[rowIdx]['OTP Attempts'] || 0) + 1;
        rows[rowIdx]['OTP Attempts'] = newAttempts;
        if (newAttempts >= 3) {
          const blockedUntil = new Date(Date.now() + 2 * 60 * 1000).toISOString();
          rows[rowIdx]['OTP Block Until'] = blockedUntil;
          otpStore.delete(mobile);
          writeRows(rows);
          return respond(res, 200, { success: false, error: 'account_blocked', blockedUntil });
        }
        writeRows(rows);
        return respond(res, 200, { success: false, error: 'incorrect_otp', attemptsLeft: 3 - newAttempts });
      }
      return respond(res, 200, { success: false, error: 'incorrect_otp', attemptsLeft: 2 });
    }

    // OTP matched ─────────────────────────────────────────────────────────────
    otpStore.delete(mobile);
    const rows2  = readRows();
    const rowIdx2 = rows2.findIndex(r => r['Mobile Number'] === mobile);
    if (rowIdx2 !== -1) {
      rows2[rowIdx2]['OTP Attempts']   = 0;
      rows2[rowIdx2]['OTP Block Until'] = '';
      writeRows(rows2);
    }
    const row  = rowIdx2 !== -1 ? rows2[rowIdx2] : {};
    const ueml = (row['Official Email'] || '').toLowerCase();
    const sid2 = ueml ? createSession(req, ueml, row) : '';
    if (ueml && sid2) appendEvent({ event_type: 'LOGIN', actor_user_id: ueml, session_id: sid2, ip_address: getIp(req), metadata: { method: 'OTP' } });
    respond(res, 200, {
      success: true, sessionId: sid2,
      user: {
        fullName: row['Full Name'] || '', employeeId: row['Employee ID'] || '',
        organization: row['Organization'] || '', email: row['Official Email'] || '',
        mobile: row['Mobile Number'] || mobile, accountType: row['Account Type'] || 'Internal',
      },
    });
    return;
  }

  // ── GET /api/profile ───────────────────────────────────────────────────────
  if (method === 'GET' && pathname === '/api/profile') {
    const email = (url.searchParams.get('email') || '').toLowerCase().trim();
    const rows  = readRows();
    const row   = rows.find(r => (r['Official Email'] || '').toLowerCase() === email);
    if (!row) return respond(res, 200, { success: false, error: 'not_found' });
    respond(res, 200, {
      success: true,
      user: {
        serialNo: row['Serial No'], fullName: row['Full Name'],
        employeeId: row['Employee ID'], organization: row['Organization'],
        email: row['Official Email'], mobile: row['Mobile Number'],
        accountType: row['Account Type'],
        registeredAt: row['Registered At'], lastUpdated: row['Last Updated'],
      },
    });
    return;
  }

  // ── PUT /api/profile ───────────────────────────────────────────────────────
  if (method === 'PUT' && pathname === '/api/profile') {
    const body   = await readBody(req);
    const { email, fullName, mobile, currentPassword, newPassword } = body;
    const rows   = readRows();
    const rowIdx = rows.findIndex(r => (r['Official Email'] || '').toLowerCase() === (email || '').toLowerCase().trim());
    if (rowIdx === -1) return respond(res, 200, { success: false, error: 'not_found' });

    if (currentPassword !== undefined && rows[rowIdx]['Password'] !== currentPassword)
      return respond(res, 200, { success: false, error: 'wrong_password', message: 'Current password is incorrect' });
    if (fullName !== undefined) {
      if (!isName(fullName)) return respond(res, 400, { success: false, error: 'validation_error', message: 'Invalid full name' });
      rows[rowIdx]['Full Name'] = fullName.trim();
    }
    if (mobile !== undefined) {
      if (!isMobile(mobile)) return respond(res, 400, { success: false, error: 'validation_error', message: 'Invalid mobile number' });
      const clash = rows.some((r, i) => i !== rowIdx && r['Mobile Number'] === mobile);
      if (clash) return respond(res, 400, { success: false, error: 'mobile_exists', message: 'This mobile number is already registered' });
      rows[rowIdx]['Mobile Number'] = mobile;
    }
    if (newPassword !== undefined) {
      if (!isPassword(newPassword)) return respond(res, 400, { success: false, error: 'validation_error', message: 'Password must be 8+ characters with uppercase, lowercase, number, and special character' });
      rows[rowIdx]['Password'] = newPassword;
    }
    rows[rowIdx]['Last Updated'] = new Date().toISOString();
    writeRows(rows);
    respond(res, 200, { success: true, user: { fullName: rows[rowIdx]['Full Name'], mobile: rows[rowIdx]['Mobile Number'] } });
    return;
  }

  // ── POST /api/auth/confirm-takeover ─────────────────────────────────────────
  if (method === 'POST' && pathname === '/api/auth/confirm-takeover') {
    const body = await readBody(req);
    const p    = pendingLogins.get(body.pendingToken);
    if (!p || Date.now() > p.exp) return respond(res, 400, { success: false, error: 'expired_token' });
    pendingLogins.delete(body.pendingToken);
    const oldSess = emailSessions(p.email).filter(s => s.valid);
    for (const s of oldSess) appendEvent({ event_type: 'SESSION_TAKEOVER', actor_user_id: p.email, displaced_session: s.sessionId, ip_address: getIp(req) });
    invalidateSessions(p.email, 'concurrent_override');
    const rows = readRows();
    const row  = rows.find(r => (r['Official Email'] || '').toLowerCase() === p.email);
    if (!row) return respond(res, 400, { success: false, error: 'user_not_found' });
    const sid = createSession(req, p.email, row);
    appendEvent({ event_type: 'LOGIN', actor_user_id: p.email, session_id: sid, ip_address: getIp(req), metadata: { method: 'password', via: 'takeover' } });
    return respond(res, 200, { success: true, sessionId: sid, user: p.user });
  }

  // ── POST /api/session/heartbeat ──────────────────────────────────────────────
  if (method === 'POST' && pathname === '/api/session/heartbeat') {
    const body = await readBody(req);
    const s    = sessions.get(body.sessionId);
    if (!s) return respond(res, 200, { valid: false, reason: 'session_expired' });
    if (!s.valid) return respond(res, 200, { valid: false, reason: s.forceLogoutReason || 'force_logout' });
    if (Date.now() - new Date(s.loginTime).getTime() > 8 * 3600000) {
      s.valid = false;
      return respond(res, 200, { valid: false, reason: 'session_expired' });
    }
    s.lastSeen = new Date().toISOString();
    return respond(res, 200, { valid: true, status: sessStatus(s) });
  }

  // ── POST /api/auth/logout ────────────────────────────────────────────────────
  if (method === 'POST' && pathname === '/api/auth/logout') {
    const body = await readBody(req);
    const s    = sessions.get(body.sessionId);
    if (s) {
      s.valid = false;
      delSess(s.email, body.sessionId);
      appendEvent({ event_type: 'LOGOUT', actor_user_id: s.email, session_id: body.sessionId, ip_address: getIp(req) });
    }
    return respond(res, 200, { success: true });
  }

  // ── POST /api/auth/force-logout ──────────────────────────────────────────────
  if (method === 'POST' && pathname === '/api/auth/force-logout') {
    const body   = await readBody(req);
    const target = (body.email || '').toLowerCase().trim();
    const admin  = (body.adminEmail || '').toLowerCase().trim();
    if (!target) return respond(res, 400, { success: false, error: 'email_required' });
    const active = emailSessions(target).filter(s => s.valid);
    for (const s of active) {
      s.valid = false; s.forceLogout = true; s.forceLogoutReason = 'force_logout';
      appendEvent({ event_type: 'FORCE_LOGOUT', actor_user_id: admin || 'admin', target_user_id: target, session_id: s.sessionId, ip_address: getIp(req) });
    }
    return respond(res, 200, { success: true, count: active.length });
  }

  // ── GET /api/admin/sessions/concurrent ───────────────────────────────────────
  if (method === 'GET' && pathname === '/api/admin/sessions/concurrent') {
    const live = [];
    for (const [, s] of sessions) {
      if (!s.valid) continue;
      const st = sessStatus(s);
      if (st === 'Offline') continue;
      live.push({ sessionId: s.sessionId, email: s.email, fullName: s.fullName, accountType: s.accountType, location: s.location, loginTime: s.loginTime, lastSeen: s.lastSeen, status: st });
    }
    return respond(res, 200, { success: true, sessions: live });
  }

  // ── GET /api/stats/kpi ───────────────────────────────────────────────────────
  if (method === 'GET' && pathname === '/api/stats/kpi') {
    const rows     = readRows();
    const allSess  = [...sessions.values()].filter(s => s.valid);
    const activeCt = allSess.filter(s => sessStatus(s) === 'Active').length;
    return respond(res, 200, { success: true, registeredUsers: rows.length, activeSessions: activeCt, securityEvents: readEvents().length, tokensConsumed: 0 });
  }

  // ── GET /api/logs/security ───────────────────────────────────────────────────
  if (method === 'GET' && pathname === '/api/logs/security') {
    const page  = Math.max(1, parseInt(url.searchParams.get('page')  || '1',  10));
    const limit = Math.min(100, parseInt(url.searchParams.get('limit') || '50', 10));
    const all   = readEvents();
    return respond(res, 200, { success: true, events: all.slice((page - 1) * limit, page * limit), total: all.length, page, limit });
  }

  // ── GET /api/admin/users ────────────────────────────────────────────────────
  if (method === 'GET' && pathname === '/api/admin/users') {
    const rows = readRows();
    const users = rows.map(r => {
      const email   = (r['Official Email'] || '').toLowerCase();
      const ss      = emailSessions(email);
      const live    = ss.filter(s => s.valid);
      const top     = live.sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen))[0];
      const st      = top ? sessStatus(top) : 'Offline';
      return {
        serialNo:      r['Serial No']     || '',
        fullName:      r['Full Name']      || '',
        employeeId:    r['Employee ID']    || '',
        organization:  r['Organization']   || '',
        email,
        mobile:        r['Mobile Number']  || '',
        accountType:   r['Account Type']   || '',
        accountStatus: r['Account Status'] || 'Active',
        registeredAt:  r['Registered At']  || '',
        lastUpdated:   r['Last Updated']   || '',
        sessionStatus: st,
        location:      top ? top.location : '—',
        sessionCount:  live.length,
        lastSeen:      top ? (top.forceLogout ? 'Forced out' : top.lastSeen) : (r['Last Updated'] || ''),
        userAgent:     top ? top.userAgent : '',
      };
    });
    return respond(res, 200, { success: true, users });
  }

  // ── PATCH /api/admin/user-status ────────────────────────────────────────────
  if (method === 'PATCH' && pathname === '/api/admin/user-status') {
    const body   = await readBody(req);
    const { email, status } = body;
    if (!email || !['Active', 'Suspended'].includes(status))
      return respond(res, 400, { success: false, error: 'invalid_params', message: 'email and status (Active|Suspended) required' });
    const rows = readRows();
    const idx  = rows.findIndex(r => (r['Official Email'] || '').toLowerCase() === (email || '').toLowerCase().trim());
    if (idx === -1) return respond(res, 404, { success: false, error: 'not_found' });
    rows[idx]['Account Status'] = status;
    rows[idx]['Last Updated']   = new Date().toISOString();
    writeRows(rows);
    appendEvent({ event_type: 'SUSPEND_USER', actor_user_id: 'admin', target_user_id: email, ip_address: getIp(req), metadata: { newStatus: status } });
    if (status === 'Suspended') invalidateSessions(email, 'force_logout');
    console.log(`[Auth] Status changed: ${email} → ${status}`);
    return respond(res, 200, { success: true });
  }

  // ── DELETE /api/admin/user ───────────────────────────────────────────────────
  if (method === 'DELETE' && pathname === '/api/admin/user') {
    const body  = await readBody(req);
    const email = (body.email || '').toLowerCase().trim();
    if (!email) return respond(res, 400, { success: false, error: 'invalid_params', message: 'email required' });
    const rows = readRows();
    const idx  = rows.findIndex(r => (r['Official Email'] || '').toLowerCase() === email);
    if (idx === -1) return respond(res, 404, { success: false, error: 'not_found' });
    const deleted = rows[idx]['Full Name'];
    rows.splice(idx, 1);
    rows.forEach((r, i) => { r['Serial No'] = i + 1; }); // re-sequence
    writeRows(rows);
    console.log(`[Auth] Deleted user: ${email} (${deleted})`);
    return respond(res, 200, { success: true });
  }

  respond(res, 404, { error: 'Not found' });
});

initExcel();
server.listen(PORT, '127.0.0.1', () => {
  console.log(`[Auth] Server running on http://127.0.0.1:${PORT}`);
});
