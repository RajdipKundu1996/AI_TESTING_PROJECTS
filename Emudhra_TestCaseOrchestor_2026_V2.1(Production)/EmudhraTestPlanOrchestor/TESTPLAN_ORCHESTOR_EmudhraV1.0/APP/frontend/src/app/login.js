// ===== LOGOUT REASON BANNER =====
(function() {
  var reason = sessionStorage.getItem('qa_gen_logout_reason');
  var msg    = sessionStorage.getItem('qa_gen_logout_msg');
  if (!reason || !msg) return;
  sessionStorage.removeItem('qa_gen_logout_reason');
  sessionStorage.removeItem('qa_gen_logout_msg');
  document.addEventListener('DOMContentLoaded', function() {
    var banner = document.createElement('div');
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#7f1d1d;color:#fecaca;padding:14px 24px;font-size:0.87rem;font-weight:500;display:flex;align-items:center;gap:12px;box-shadow:0 2px 12px rgba(0,0,0,0.4)';
    banner.innerHTML = '<span style="font-size:1.25em;flex-shrink:0">⚠️</span><span style="flex:1">' + msg + '</span><button onclick="this.parentElement.remove()" style="background:none;border:none;color:#fecaca;font-size:1.4em;cursor:pointer;line-height:1">&times;</button>';
    document.body.appendChild(banner);
  });
})();

// ===== CONCURRENT LOGIN MODAL =====
function showConflictModal(pendingToken, onYes, onNo) {
  var ov = document.createElement('div');
  ov.id = 'conflictOverlay';
  ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.72);display:flex;align-items:center;justify-content:center';
  ov.innerHTML = '<div style="background:#1e293b;border:1px solid #334155;border-radius:16px;padding:32px 28px;max-width:420px;width:90%;box-shadow:0 24px 64px rgba(0,0,0,0.6)">'
    + '<div style="font-size:1.25rem;font-weight:700;color:#f8fafc;margin-bottom:10px">⚠️ Account Already Active</div>'
    + '<p style="color:#94a3b8;font-size:0.87rem;line-height:1.65;margin:0 0 8px">This account is currently signed in from another device or browser.</p>'
    + '<p style="color:#94a3b8;font-size:0.87rem;line-height:1.65;margin:0 0 24px">If you continue, the other session will be automatically signed out.</p>'
    + '<div style="display:flex;gap:12px;justify-content:flex-end">'
    + '<button id="_cfCancel" style="padding:10px 20px;border-radius:8px;border:1px solid #475569;background:none;color:#cbd5e1;cursor:pointer;font-size:0.875rem">Cancel</button>'
    + '<button id="_cfYes" style="padding:10px 22px;border-radius:8px;border:none;background:#2563eb;color:#fff;cursor:pointer;font-size:0.875rem;font-weight:600">Yes, Log Me In</button>'
    + '</div></div>';
  document.body.appendChild(ov);
  document.getElementById('_cfCancel').onclick = function() { ov.remove(); onNo(); };
  document.getElementById('_cfYes').onclick    = function() { ov.remove(); onYes(pendingToken); };
}

// ===== AUTH STORE (legacy local fallback — no built-in accounts) =====
const AUTH = {
  VALID_USERS: [],
  getRegisteredUsers() {
    try { return JSON.parse(localStorage.getItem('qa_registered_users_v1') || '[]'); } catch (_) { return []; }
  },
  login(username, password) {
    // No built-in accounts — always returns null; real auth uses auth_server.js on port 3005
    return null;
  }
};

// ===== DOM REFS =====
const loginBtn = document.getElementById('loginBtn');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginError = document.getElementById('loginError');
const loginErrorText = document.getElementById('loginErrorText');
const togglePassword = document.getElementById('togglePassword');
const eyeIcon = document.getElementById('eyeIcon');
const defaultLoginLabel = loginBtn?.querySelector('.btn-text')?.textContent || 'Sign in';

// ===== TOGGLE PASSWORD VISIBILITY =====
let passwordVisible = false;
if (togglePassword) {
  togglePassword.addEventListener('click', () => {
    passwordVisible = !passwordVisible;
    if (passwordInput) passwordInput.type = passwordVisible ? 'text' : 'password';
    if (eyeIcon) eyeIcon.innerHTML = passwordVisible
      ? '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>'
      : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
    togglePassword.classList.toggle('active', passwordVisible);
  });
}

// ===== SHOW/HIDE ERROR =====
function showError(msg) {
  if (loginError && loginErrorText) {
    loginErrorText.textContent = msg;
    loginError.style.display = 'flex';
    loginError.classList.add('shake');
    setTimeout(() => loginError.classList.remove('shake'), 500);
  } else {
    // Fallback for minimal pages: alert and console
    console.warn('Login error (fallback):', msg);
    try { alert(msg); } catch (e) { /* ignore */ }
  }
}
function hideError() {
  if (loginError) loginError.style.display = 'none';
}

// ===== CLEAR ON TYPE =====
if (usernameInput) usernameInput.addEventListener('input', hideError);
if (passwordInput) passwordInput.addEventListener('input', hideError);

// ===== ENTER KEY =====
[usernameInput, passwordInput].forEach(el => {
  if (!el) return;
  el.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
});

// ===== AUTH API =====
var AUTH_API = 'http://127.0.0.1:3005';

// ===== SHARED LOGIN FINALIZER =====
function finishPasswordLogin(u, sessionId) {
  var initials = (u.fullName || 'U?').split(' ').map(function(n) { return n[0]; }).join('').toUpperCase().slice(0, 2);
  var userData = {
    username: u.email, name: u.fullName, email: u.email,
    role: u.accountType === 'Internal' ? 'QA Lead' : 'External User',
    initials: initials, mobile: u.mobile,
    employeeId: u.employeeId, organization: u.organization,
    accountType: u.accountType,
    loginTime: new Date().toLocaleString(),
    activeProject: 'Delta Secure', loginMethod: 'password', sessionStatus: 'Active'
  };
  sessionStorage.setItem('qa_gen_user', JSON.stringify(userData));
  sessionStorage.setItem('qa_gen_session_id', sessionId || '');
  sessionStorage.setItem('af_fresh_login', '1');
  var loginHist = JSON.parse(localStorage.getItem('qa_gen_login_history') || '[]');
  loginHist.unshift({ date: new Date().toLocaleDateString('en-GB'), time: new Date().toLocaleTimeString(), full: new Date().toLocaleString(), user: u.fullName });
  localStorage.setItem('qa_gen_login_history', JSON.stringify(loginHist.slice(0, 100)));
  showWelcomeAnimation(userData.name, function() { window.location.href = 'src/pages/dashboard.html'; });
}

// ===== LOGIN HANDLER =====
function handleLogin() {
  var username = usernameInput.value.trim();
  var password = passwordInput.value;

  if (!username) { showError('Username or email is required.'); usernameInput.focus(); return; }
  if (!password) { showError('Password is required.'); passwordInput.focus(); return; }

  // Show loading
  var btnText = loginBtn.querySelector('.btn-text');
  if (btnText) btnText.style.display = 'none';
  loginBtn.textContent = 'Signing in...';
  loginBtn.disabled = true;

  function restoreBtn() {
    loginBtn.innerHTML = '<span class="btn-text">' + defaultLoginLabel + '</span>';
    loginBtn.disabled = false;
  }

  fetch(AUTH_API + '/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: username, password: password })
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    // Concurrent login conflict
    if (data.conflict) {
      restoreBtn();
      showConflictModal(data.pendingToken, function(pt) {
        loginBtn.textContent = 'Signing in...';
        loginBtn.disabled = true;
        fetch(AUTH_API + '/api/auth/confirm-takeover', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pendingToken: pt })
        }).then(function(r) { return r.json(); }).then(function(d2) {
          if (d2.success) {
            finishPasswordLogin(d2.user, d2.sessionId);
          } else {
            restoreBtn();
            showError('Session takeover failed. Please try again.');
          }
        }).catch(function() { restoreBtn(); showError('Authentication server is unavailable.'); });
      }, function() { restoreBtn(); });
      return;
    }
    if (data.success) {
      finishPasswordLogin(data.user, data.sessionId);
      return;
    }
    restoreBtn();
    if (data.error === 'user_not_found') {
      showError('No account found with this email. Please register first.');
    } else if (data.error === 'incorrect_password') {
      showError('Incorrect password. Please try again.');
      passwordInput.value = '';
      passwordInput.focus();
    } else if (data.error === 'account_suspended') {
      showError(data.message || 'Your account has been suspended.');
    } else {
      showError('Login failed. Please try again.');
    }
  })
  .catch(function() {
    restoreBtn();
    showError('Authentication server is unavailable. Please start the app via node start.js and try again.');
  });
}

loginBtn.addEventListener('click', handleLogin);

// ===== REQUEST A DEMO =====
document.getElementById('requestDemoBtn')?.addEventListener('click', () => {
  window.open('https://www.emudhra.com', '_blank');
});

// ===== PARTICLE CANVAS ANIMATION =====
function initParticles() {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  for (let i = 0; i < 60; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      r: Math.random() * 2 + 0.5,
      alpha: Math.random() * 0.4 + 0.1
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(201, 168, 76, ${p.alpha})`;
      ctx.fill();
    });

    // Connect nearby particles
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(59, 130, 246, ${0.08 * (1 - dist / 120)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }
  draw();

  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
}

// ===== MOBILE OTP LOGIN ENGINE =====
(function () {
  'use strict';

  var OTP_EXPIRY     = 300;   // 5 minutes
  var MAX_ATTEMPTS   = 3;
  var LOCK_DURATION  = 120;   // 2 minutes
  var RESEND_DELAY   = 30;    // 30 seconds

  function G(id) { return document.getElementById(id); }

  // ── state ──────────────────────────────────────────────────────────────────
  var currentMobile   = '';
  var currentUserData = null;
  var currentOtp      = '';
  var attemptsLeft    = MAX_ATTEMPTS;
  var isLocked        = false;
  var otpSecsLeft     = OTP_EXPIRY;
  var lockSecsLeft    = LOCK_DURATION;
  var resendSecsLeft  = RESEND_DELAY;
  var _otpTick        = null;
  var _lockTick       = null;
  var _resendTick     = null;

  // ── helpers ────────────────────────────────────────────────────────────────
  function fmt(s) {
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  }

  function auditLog(action, mobile, note) {
    var ua      = navigator.userAgent;
    var browser = ua.indexOf('Chrome') > -1 ? 'Chrome' : ua.indexOf('Firefox') > -1 ? 'Firefox' : 'Safari';
    var device  = /Mobile|Android|iPhone/i.test(ua) ? 'Mobile' : 'Desktop';
    var logs    = JSON.parse(localStorage.getItem('qa_gen_logs') || '[]');
    logs.unshift({
      id: Date.now(), date: new Date().toLocaleDateString('en-GB'),
      time: new Date().toLocaleTimeString(),
      activity: '[OTP] ' + action + ' | Mobile: ' + (mobile || 'N/A') + (note ? ' | ' + note : ''),
      type: 'otp_auth', user: mobile || 'Unknown', browser: browser, device: device, ip: '127.0.0.1'
    });
    localStorage.setItem('qa_gen_logs', JSON.stringify(logs.slice(0, 500)));
  }

  function findByMobile(mobile) {
    // 1. built-in users (with phone field added in VALID_USERS)
    var b = AUTH.VALID_USERS.find(function (u) { return u.phone === mobile; });
    if (b) return { name: b.name, email: b.email, mobile: mobile };
    // 2. self-registered users (register.html)
    var r = AUTH.getRegisteredUsers().find(function (u) {
      return (u.mobile || u.phone || '').replace(/\D/g, '') === mobile;
    });
    if (r) return { name: r.name, email: r.email, mobile: mobile };
    // 3. admin-managed users (admin.html, admin_users_v3)
    try {
      var admins = JSON.parse(localStorage.getItem('admin_users_v3') || '[]');
      var a = admins.find(function (u) {
        return (u.phone || '').replace(/\D/g, '').slice(-10) === mobile;
      });
      if (a) return { name: a.name, email: a.email, mobile: mobile };
    } catch (_) { /* */ }
    return null;
  }

  // ── view helpers ───────────────────────────────────────────────────────────
  function showFlow() {
    var f = document.querySelector('.simple-form');
    var o = G('mobileOtpFlow');
    if (f) f.style.display = 'none';
    if (o) o.style.display = 'block';
    showPanel('motpStep1');
  }

  function showPassword() {
    var f = document.querySelector('.simple-form');
    var o = G('mobileOtpFlow');
    if (f) f.style.display = '';  // removes inline; CSS restores flex
    if (o) o.style.display = 'none';
  }

  function showPanel(id) {
    ['motpStep1', 'motpStep2'].forEach(function (p) {
      var el = G(p);
      if (el) el.style.display = p === id ? 'block' : 'none';
    });
  }

  function setMobileErr(msg) {
    var el = G('motpMobileError');
    if (!el) return;
    el.textContent = msg;
    el.style.display = msg ? 'block' : 'none';
  }

  function setMsg(msg, type) {
    var el = G('motpVerifyMsg');
    if (!el) return;
    el.textContent = msg;
    el.className = 'motpMsg' + (type ? ' ' + type : '');
    el.style.display = msg ? 'block' : 'none';
  }

  function showBanner(txt) {
    var b = G('motpSentBanner');
    var t = G('motpSentBannerText');
    if (!b) return;
    if (t) t.textContent = txt;
    b.style.display = 'flex';
    clearTimeout(b._hideTimer);
    b._hideTimer = setTimeout(function () { b.style.display = 'none'; }, 4000);
  }

  function syncSendBtn() {
    var btn = G('motpSendBtn');
    var inp = G('motpMobile');
    if (!btn || !inp) return;
    var v = inp.value.trim();
    btn.disabled = isLocked || !/^\d{10}$/.test(v);
  }

  function setBoxesDisabled(state) {
    document.querySelectorAll('#motpBoxes .otp-dig-box').forEach(function (b) { b.disabled = state; });
  }

  // ── countdown timers ───────────────────────────────────────────────────────
  function startOtpTimer() {
    clearInterval(_otpTick);
    otpSecsLeft = OTP_EXPIRY;
    var disp    = G('motpCountdownDisplay');
    var row     = G('motpCountdownRow');
    var vBtn    = G('motpVerifyBtn');
    if (disp) disp.textContent = fmt(otpSecsLeft);
    if (row)  row.classList.remove('expired');
    if (vBtn) vBtn.disabled = false;
    setBoxesDisabled(false);
    _otpTick = setInterval(function () {
      otpSecsLeft--;
      if (disp) disp.textContent = fmt(otpSecsLeft);
      if (otpSecsLeft <= 0) {
        clearInterval(_otpTick);
        if (row)  row.classList.add('expired');
        if (vBtn) vBtn.disabled = true;
        setBoxesDisabled(true);
        setMsg('OTP expired. Please request a new OTP.', 'error');
        clearInterval(_resendTick);
        var rb = G('motpResendBtn'), rc = G('motpResendCooldownRow');
        if (rb) rb.disabled = false;
        if (rc) rc.style.display = 'none';
        auditLog('OTP Expired', currentMobile);
      }
    }, 1000);
  }

  function startResendCooldown() {
    clearInterval(_resendTick);
    resendSecsLeft = RESEND_DELAY;
    var rb = G('motpResendBtn');
    var rt = G('motpResendTimer');
    var rc = G('motpResendCooldownRow');
    if (rb) rb.disabled = true;
    if (rc) rc.style.display = 'inline';
    if (rt) rt.textContent = resendSecsLeft;
    _resendTick = setInterval(function () {
      resendSecsLeft--;
      if (rt) rt.textContent = resendSecsLeft;
      if (resendSecsLeft <= 0) {
        clearInterval(_resendTick);
        if (rb) rb.disabled = false;
        if (rc) rc.style.display = 'none';
      }
    }, 1000);
  }

  function triggerLockout(seconds) {
    isLocked = true;
    clearInterval(_otpTick);
    clearInterval(_resendTick);
    lockSecsLeft = (seconds && seconds > 0) ? seconds : LOCK_DURATION;
    var lp  = G('motpLockPanel');
    var lcd = G('motpLockCountdown');
    var vB  = G('motpVerifyBtn');
    var rB  = G('motpResendBtn');
    if (lp)  { lp.style.display = 'flex'; }
    if (lcd) lcd.textContent = fmt(lockSecsLeft);
    if (vB)  vB.disabled = true;
    if (rB)  rB.disabled = true;
    setBoxesDisabled(true);
    auditLog('User Locked', currentMobile, '3 failed attempts');
    _lockTick = setInterval(function () {
      lockSecsLeft--;
      if (lcd) lcd.textContent = fmt(lockSecsLeft);
      if (lockSecsLeft <= 0) {
        clearInterval(_lockTick);
        isLocked = false;
        attemptsLeft = MAX_ATTEMPTS;
        if (lp) lp.style.display = 'none';
        setMsg('Account unlocked. You may try again.', 'success');
        syncSendBtn();
        var mi = G('motpMobile');
        if (mi) mi.disabled = false;
        showPanel('motpStep1');
        auditLog('User Unlocked', currentMobile);
      }
    }, 1000);
  }

  // ── OTP box wiring ─────────────────────────────────────────────────────────
  function wireOtpBoxes() {
    var boxes = document.querySelectorAll('#motpBoxes .otp-dig-box');
    boxes.forEach(function (box, i) {
      box.addEventListener('input', function () {
        this.value = this.value.replace(/\D/g, '');
        if (this.value) {
          this.classList.add('filled');
          if (i < boxes.length - 1) { boxes[i + 1].focus(); }
          else {
            var code = Array.from(boxes).map(function (b) { return b.value; }).join('');
            if (code.length === 6) setTimeout(doVerify, 200);
          }
        } else { this.classList.remove('filled'); }
      });
      box.addEventListener('keydown', function (e) {
        if (e.key === 'Backspace' && !this.value && i > 0) boxes[i - 1].focus();
      });
      box.addEventListener('paste', function (e) {
        e.preventDefault();
        var text = ((e.clipboardData || window.clipboardData).getData('text') || '').replace(/\D/g, '').slice(0, 6);
        text.split('').forEach(function (ch, j) {
          if (boxes[j]) { boxes[j].value = ch; boxes[j].classList.add('filled'); }
        });
        var nxt = Math.min(text.length, 5);
        if (boxes[nxt]) boxes[nxt].focus();
        if (text.length === 6) setTimeout(doVerify, 200);
      });
    });
  }

  // ── OTP verify ─────────────────────────────────────────────────────────────
  function doVerify() {
    if (isLocked) return;
    var boxes   = document.querySelectorAll('#motpBoxes .otp-dig-box');
    var entered = Array.from(boxes).map(function (b) { return b.value; }).join('');
    if (entered.length < 6) { setMsg('OTP must contain exactly 6 digits.', 'error'); return; }
    if (otpSecsLeft <= 0)   { setMsg('OTP expired. Please request a new OTP.', 'error'); return; }

    var mobile = '+91' + currentMobile;
    var vBtn   = G('motpVerifyBtn');
    if (vBtn) vBtn.disabled = true;
    setBoxesDisabled(true);

    function finishSuccess(userData) {
      clearInterval(_otpTick);
      clearInterval(_resendTick);
      setMsg('OTP verified successfully. Signing in...', 'success');
      auditLog('OTP Verified', mobile, 'Login Success');
      if (vBtn) { var s = vBtn.querySelector('.btn-text'); if (s) s.textContent = 'Signing in…'; }
      sessionStorage.setItem('qa_gen_user', JSON.stringify(userData));
      sessionStorage.setItem('qa_gen_session_id', userData.sessionId || '');
      sessionStorage.setItem('af_fresh_login', '1');
      var hist = JSON.parse(localStorage.getItem('qa_gen_login_history') || '[]');
      hist.unshift({ date: new Date().toLocaleDateString('en-GB'), time: new Date().toLocaleTimeString(), full: new Date().toLocaleString(), user: userData.name });
      localStorage.setItem('qa_gen_login_history', JSON.stringify(hist.slice(0, 100)));
      setTimeout(function () {
        showWelcomeAnimation(userData.name, function () { window.location.href = 'src/pages/dashboard.html'; });
      }, 400);
    }

    fetch(AUTH_API + '/api/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: mobile, otp: entered })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.success) {
        var u = data.user || {};
        var initials = (u.fullName || 'U?').split(' ').map(function(n) { return n[0]; }).join('').toUpperCase().slice(0, 2);
        finishSuccess({
          username: u.email || mobile, name: u.fullName || 'User', email: u.email || '',
          role: u.accountType === 'Internal' ? 'QA Lead' : 'External User',
          mobile: mobile, employeeId: u.employeeId || '', organization: u.organization || '',
          accountType: u.accountType || 'Internal',
          loginTime: new Date().toLocaleString(), loginMethod: 'OTP',
          browser: navigator.userAgent.indexOf('Chrome') > -1 ? 'Chrome' : 'Browser',
          device: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop',
          sessionStatus: 'Active', activeProject: 'Delta Secure', initials: initials,
          sessionId: data.sessionId || ''
        });
      } else if (data.error === 'account_blocked') {
        var remaining = Math.ceil((new Date(data.blockedUntil) - new Date()) / 1000);
        setMsg('Maximum OTP attempts exceeded. Account temporarily locked.', 'error');
        triggerLockout(remaining);
        auditLog('User Locked', mobile, '3 failed attempts');
      } else if (data.error === 'otp_expired') {
        setMsg('OTP expired. Please request a new OTP.', 'error');
        if (vBtn) vBtn.disabled = false;
        setBoxesDisabled(false);
      } else {
        attemptsLeft = (data.attemptsLeft !== undefined) ? data.attemptsLeft : (attemptsLeft - 1);
        auditLog('OTP Failed', mobile, 'Attempts left: ' + attemptsLeft);
        setMsg('Invalid OTP. Attempts remaining: ' + attemptsLeft, 'error');
        boxes.forEach(function(b) { b.value = ''; b.classList.remove('filled'); });
        if (vBtn) vBtn.disabled = false;
        setBoxesDisabled(false);
        if (boxes[0]) boxes[0].focus();
      }
    })
    .catch(function() {
      // Server unreachable — fallback: show error
      if (vBtn) vBtn.disabled = false;
      setBoxesDisabled(false);
      setMsg('Could not reach authentication server. Please ensure the app is started correctly.', 'error');
    });
  }

  // ── event wiring ───────────────────────────────────────────────────────────
  var mobileInp = G('motpMobile');
  var sendBtn   = G('motpSendBtn');
  var verifyBtn = G('motpVerifyBtn');
  var resendBtn = G('motpResendBtn');
  var useOtpLnk = G('useOtpLink');

  if (mobileInp) {
    mobileInp.addEventListener('input', function () {
      this.value = this.value.replace(/\D/g, '').slice(0, 10);
      var v = this.value;
      if (v.length > 0 && v.length < 10) { setMobileErr('Please enter a valid mobile number.'); }
      else if (v.length === 0)            { setMobileErr(''); }
      else                                { setMobileErr(''); }
      syncSendBtn();
    });
    mobileInp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && sendBtn && !sendBtn.disabled) sendBtn.click();
    });
  }

  if (sendBtn) {
    sendBtn.addEventListener('click', function () {
      var val = (mobileInp ? mobileInp.value : '').trim();
      if (!val)                    { setMobileErr('Mobile number is required.'); return; }
      if (!/^\d{10}$/.test(val))   { setMobileErr('Please enter a valid 10-digit mobile number.'); return; }

      setMobileErr('');
      currentMobile = val;
      attemptsLeft  = MAX_ATTEMPTS;
      isLocked      = false;
      var self = this;
      self.disabled = true;
      var st = self.querySelector('.btn-text');
      if (st) st.textContent = 'Sending…';

      var mobile = '+91' + val;

      fetch(AUTH_API + '/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: mobile })
      })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var s2 = G('motpSendBtn');
        if (s2) { s2.disabled = false; var st2 = s2.querySelector('.btn-text'); if (st2) st2.textContent = 'Send OTP →'; }
        if (!data.success) {
          if (data.error === 'user_not_found') {
            setMobileErr('This number is not registered. Please register first.');
          } else if (data.error === 'account_blocked') {
            var remaining = Math.ceil((new Date(data.blockedUntil) - new Date()) / 1000);
            setMobileErr('');
            showPanel('motpStep2');
            triggerLockout(remaining);
          } else {
            setMobileErr('Failed to send OTP. Please try again.');
          }
          return;
        }
        currentUserData = { mobile: mobile };
        var masked = G('motpMaskedMobile');
        if (masked) masked.textContent = 'XXXXXX' + val.slice(-4);
        showPanel('motpStep2');
        setMsg('', '');
        G('motpLockPanel') && (G('motpLockPanel').style.display = 'none');
        var boxes = document.querySelectorAll('#motpBoxes .otp-dig-box');
        boxes.forEach(function(b) { b.value = ''; b.classList.remove('filled'); b.disabled = false; });
        startOtpTimer();
        startResendCooldown();
        showBanner('OTP has been sent to your registered mobile.');
        auditLog('OTP Sent', mobile, 'via API');
        if (boxes[0]) boxes[0].focus();
      })
      .catch(function() {
        var s2 = G('motpSendBtn');
        if (s2) { s2.disabled = false; var st2 = s2.querySelector('.btn-text'); if (st2) st2.textContent = 'Send OTP →'; }
        setMobileErr('Could not reach authentication server. Please ensure the app is started correctly.');
      });
    });
  }

  if (useOtpLnk) {
    useOtpLnk.addEventListener('click', function () { showFlow(); if (mobileInp) mobileInp.focus(); });
    useOtpLnk.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.click(); } });
  }

  G('motpBackToPassword') && G('motpBackToPassword').addEventListener('click', function () {
    clearInterval(_otpTick); clearInterval(_lockTick); clearInterval(_resendTick); showPassword();
  });

  G('motpBackToStep1') && G('motpBackToStep1').addEventListener('click', function () {
    clearInterval(_otpTick); clearInterval(_resendTick); showPanel('motpStep1'); setMsg('', '');
  });

  if (verifyBtn) verifyBtn.addEventListener('click', doVerify);

  if (resendBtn) {
    resendBtn.addEventListener('click', function () {
      if (this.disabled || isLocked) return;
      attemptsLeft = MAX_ATTEMPTS;
      var self     = this;
      self.disabled = true;
      self.textContent = 'Sending…';
      var mobile = '+91' + currentMobile;

      fetch(AUTH_API + '/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: mobile })
      })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        self.textContent = 'Resend OTP';
        var boxes = document.querySelectorAll('#motpBoxes .otp-dig-box');
        boxes.forEach(function(b) { b.value = ''; b.classList.remove('filled'); b.disabled = false; });
        setMsg('', '');
        G('motpLockPanel') && (G('motpLockPanel').style.display = 'none');
        if (data.success) {
          startOtpTimer();
          startResendCooldown();
          showBanner('A new OTP has been sent to your registered mobile.');
          auditLog('OTP Resent', mobile);
          if (boxes[0]) boxes[0].focus();
        } else if (data.error === 'account_blocked') {
          var remaining = Math.ceil((new Date(data.blockedUntil) - new Date()) / 1000);
          triggerLockout(remaining);
        } else {
          setMsg('Failed to resend OTP. Please try again.', 'error');
          self.disabled = false;
        }
      })
      .catch(function() {
        self.textContent = 'Resend OTP';
        self.disabled = false;
        setMsg('Could not reach authentication server. Please try again.', 'error');
      });
    });
  }

  // registration redirect: go straight into OTP flow
  if (window.location.search.includes('registered=1')) {
    var toast = G('regSuccessToast');
    if (toast) toast.classList.add('show');
    showFlow();
  }

  wireOtpBoxes();
})();

// ===== WELCOME ANIMATION — QA / Software-Testing Theme =====
function showWelcomeAnimation(userName, callback) {
  var firstName = (userName || 'there').split(' ')[0];

  /* ── Overlay ── */
  var ov = document.createElement('div');
  ov.id = 'welcomeOverlay';
  ov.style.cssText = 'position:fixed;inset:0;z-index:999999;overflow:hidden;background:#020d18;font-family:Consolas,"Courier New",monospace;';
  document.body.appendChild(ov);

  /* ── 1. MATRIX RAIN CANVAS — raining test keywords ── */
  var mCvs = document.createElement('canvas');
  mCvs.style.cssText = 'position:absolute;inset:0;opacity:0.48;pointer-events:none;';
  mCvs.width = window.innerWidth;
  mCvs.height = window.innerHeight;
  ov.appendChild(mCvs);
  var mCtx = mCvs.getContext('2d');
  var cols = Math.ceil(window.innerWidth / 16);
  var drops = [];
  for (var c0 = 0; c0 < cols; c0++) drops.push(-(Math.random() * 30));
  var matWords = [
    'TC-001','TC-042','PASS','FAIL','expect(','assert(',
    'toBe(','it(','test(','describe(','QA','BUG','FIX',
    'E2E','CI','CD','API','✓','✗','→','null','async','await',
    '.spec','mock','stub','spy','TC-103','TC-127','[RUN]','SKIP'
  ];
  var matTimer = setInterval(function() {
    mCtx.fillStyle = 'rgba(2,13,24,0.16)';
    mCtx.fillRect(0, 0, mCvs.width, mCvs.height);
    for (var ci = 0; ci < drops.length; ci++) {
      var word = matWords[(Math.random() * matWords.length) | 0];
      var bright = Math.random() > 0.9;
      mCtx.fillStyle = bright ? '#e0ffe8'
        : Math.random() > 0.62 ? 'rgba(0,200,255,0.6)' : 'rgba(0,255,100,0.56)';
      mCtx.font = (word.length > 4 ? '9' : '13') + 'px Consolas';
      mCtx.fillText(word, ci * 16, drops[ci] * 16);
      if (drops[ci] * 16 > mCvs.height && Math.random() > 0.97) drops[ci] = 0;
      drops[ci] += 0.44 + Math.random() * 0.24;
    }
  }, 48);

  /* ── 2. FLYING TEST RESULT CHIPS from left ── */
  var chipWrap = document.createElement('div');
  chipWrap.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;';
  ov.appendChild(chipWrap);
  [
    {t:'✓  TC-001  Login Validation',       c:'#00ff88', y:6,  d:130},
    {t:'✓  TC-042  API Auth Test',           c:'#00e676', y:13, d:280},
    {t:'✓  TC-089  Form Submission',         c:'#69ff47', y:20, d:450},
    {t:'✓  TC-103  Data Integrity Check',    c:'#00ff88', y:72, d:190},
    {t:'✓  TC-127  End-to-End User Flow',    c:'#00e676', y:79, d:370},
    {t:'✓  TC-155  Performance Benchmark',   c:'#69ff47', y:86, d:560},
    {t:'⚡  Playwright  Automation: ON',     c:'#00cfff', y:27, d:530},
    {t:'⚡  Code Coverage: 96.4%',           c:'#29b6f6', y:34, d:690},
    {t:'⚡  CI/CD Pipeline: All Green',      c:'#00cfff', y:41, d:870},
    {t:'⚡  Regression Suite: Clean',        c:'#29b6f6', y:60, d:620},
    {t:'⚡  Smoke Tests: All Passing',       c:'#00cfff', y:67, d:800},
  ].forEach(function(r) {
    setTimeout(function() {
      var chip = document.createElement('div');
      chip.style.cssText = 'position:absolute;top:' + r.y + '%;left:-340px;' +
        'background:rgba(0,12,22,0.84);border:1px solid ' + r.c + ';' +
        'border-radius:5px;color:' + r.c + ';font-size:11px;' +
        'padding:4px 12px;white-space:nowrap;box-shadow:0 0 12px ' + r.c + '2a;letter-spacing:0.3px;';
      chip.textContent = r.t;
      chipWrap.appendChild(chip);
      var t0 = Date.now(), spd = 0.19 + Math.random() * 0.11;
      (function move() {
        var x = -340 + (Date.now() - t0) * spd;
        if (x > window.innerWidth + 80) { chip.remove(); return; }
        chip.style.left = x + 'px';
        requestAnimationFrame(move);
      })();
    }, r.d);
  });

  /* ── 3. CENTRAL TERMINAL CARD ── */
  var card = document.createElement('div');
  card.style.cssText =
    'position:absolute;left:50%;top:50%;' +
    'transform:translate(-50%,-50%) scale(0.82);' +
    'width:min(490px,90vw);' +
    'background:rgba(1,10,22,0.96);' +
    'border:1px solid rgba(0,180,255,0.32);' +
    'border-radius:14px;' +
    'box-shadow:0 0 90px rgba(0,180,255,0.1),0 0 40px rgba(0,255,100,0.05),0 28px 70px rgba(0,0,0,0.65);' +
    'overflow:hidden;opacity:0;' +
    'transition:opacity 0.45s ease,transform 0.45s cubic-bezier(.34,1.56,.64,1);';
  card.innerHTML =
    '<div style="background:#061018;border-bottom:1px solid rgba(0,180,255,0.13);' +
    'padding:10px 16px;display:flex;align-items:center;gap:7px;">' +
      '<div style="width:11px;height:11px;border-radius:50%;background:#ff5f57;box-shadow:0 0 6px #ff5f5744;"></div>' +
      '<div style="width:11px;height:11px;border-radius:50%;background:#ffbd2e;box-shadow:0 0 6px #ffbd2e44;"></div>' +
      '<div style="width:11px;height:11px;border-radius:50%;background:#28ca41;box-shadow:0 0 6px #28ca4144;"></div>' +
      '<span style="flex:1;text-align:center;color:rgba(0,180,255,0.5);font-size:10px;letter-spacing:2.5px;">QA-GEN AI  ——  ENTERPRISE CONSOLE</span>' +
    '</div>' +
    '<div style="padding:22px 26px;">' +
      '<div id="waLines" style="font-size:11.5px;line-height:2;min-height:155px;"></div>' +
      '<div id="waReveal" style="text-align:center;opacity:0;transition:opacity 0.7s ease;' +
           'margin-top:16px;padding-top:16px;border-top:1px solid rgba(0,180,255,0.1);">' +
        '<div style="font-size:9.5px;letter-spacing:3px;color:rgba(0,180,255,0.42);' +
             'font-family:Outfit,sans-serif;margin-bottom:8px;">ACCESS GRANTED — WELCOME</div>' +
        '<div style="font-size:2.4rem;font-weight:900;font-family:Outfit,sans-serif;' +
             'background:linear-gradient(135deg,#00ff88 0%,#00cfff 50%,#69ff47 100%);' +
             '-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;' +
             'line-height:1.1;margin-bottom:6px;">' + firstName + '</div>' +
        '<div style="font-size:12px;color:rgba(255,255,255,0.28);font-family:Outfit,sans-serif;margin-bottom:18px;">' +
             'Your QA workspace is initialising…</div>' +
        '<div style="width:100%;height:4px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden;">' +
          '<div id="waBar" style="height:100%;width:0%;border-radius:4px;' +
               'background:linear-gradient(90deg,#00ff88,#00cfff,#00ff88);' +
               'box-shadow:0 0 12px #00ff8866;transition:width 2.8s cubic-bezier(0.1,0,0.2,1);"></div>' +
        '</div>' +
        '<div style="font-size:9.5px;color:rgba(0,180,255,0.28);font-family:Outfit,sans-serif;margin-top:8px;letter-spacing:1px;">Initialising enterprise modules…</div>' +
      '</div>' +
    '</div>';
  ov.appendChild(card);

  /* Animate card in at 480ms */
  setTimeout(function() {
    card.style.opacity = '1';
    card.style.transform = 'translate(-50%,-50%) scale(1)';
    var termLines = document.getElementById('waLines');
    [
      {t:'$ qa-gen start --enterprise --all-suites', c:'#00cfff',              d:0},
      {t:'  ⟳  Bootstrapping test runner…',  c:'rgba(255,255,255,0.32)', d:360},
      {t:'  ✓  Unit Tests       [82 / 82]   PASS',    c:'#00ff88',  d:680},
      {t:'  ✓  Integration      [38 / 38]   PASS',    c:'#00ff88',  d:930},
      {t:'  ✓  E2E Flow         [47 / 47]   PASS',    c:'#00ff88',  d:1160},
      {t:'  ✓  API Contract     [23 / 23]   PASS',    c:'#00ff88',  d:1390},
      {t:'  ⚡  Coverage ██████████ 96.4 %  TARGET MET', c:'#ffd700', d:1620},
      {t:'',                                              c:'#fff',              d:1820},
      {t:'  ✅  ALL 190 TESTS PASSED — BUILD: GREEN ✓', c:'#00ff88', d:1870},
    ].forEach(function(l) {
      setTimeout(function() {
        var el = document.createElement('div');
        el.style.cssText = 'color:' + l.c + ';opacity:0;transform:translateX(-8px);' +
          'transition:opacity 0.28s ease,transform 0.28s ease;' +
          (l.t.indexOf('ALL') >= 0 ? 'font-weight:700;text-shadow:0 0 16px #00ff88;' : '');
        el.textContent = l.t;
        termLines.appendChild(el);
        requestAnimationFrame(function() { requestAnimationFrame(function() {
          el.style.opacity = '1'; el.style.transform = 'translateX(0)';
        }); });
      }, l.d);
    });
    /* Reveal welcome after all tests shown */
    setTimeout(function() {
      var rev = document.getElementById('waReveal');
      if (rev) rev.style.opacity = '1';
      setTimeout(function() { var b = document.getElementById('waBar'); if (b) b.style.width = '100%'; }, 80);
    }, 2260);
  }, 480);

  /* ── 4. CHECKMARK BURST from center when tests finish ── */
  setTimeout(function() {
    var symbols = ['✓','✓','✓','⚡','▶','✓'];
    var bColors  = ['#00ff88','#00cfff','#69ff47'];
    for (var bi = 0; bi < 22; bi++) {
      (function(i) {
        var angle = (i / 22) * Math.PI * 2;
        var dist  = 130 + Math.random() * 180;
        var ck = document.createElement('div');
        ck.style.cssText = 'position:absolute;left:50%;top:50%;font-size:' + (13 + Math.random() * 12) + 'px;' +
          'color:' + bColors[(i * 7) % bColors.length] + ';transform:translate(-50%,-50%);' +
          'text-shadow:0 0 14px currentColor;pointer-events:none;' +
          'transition:transform 1.3s cubic-bezier(0.1,0,0.15,1),opacity 1.3s ease;opacity:1;';
        ck.textContent = symbols[(i * 3) % symbols.length];
        ov.appendChild(ck);
        requestAnimationFrame(function() { requestAnimationFrame(function() {
          ck.style.transform =
            'translate(calc(-50% + ' + (Math.cos(angle) * dist) + 'px),' +
            'calc(-50% + ' + (Math.sin(angle) * dist) + 'px))';
          ck.style.opacity = '0';
        }); });
        setTimeout(function() { if (ck.parentNode) ck.remove(); }, 1450);
      })(bi);
    }
  }, 2100);

  /* ── Dismiss after 5.6 s ── */
  setTimeout(function() {
    clearInterval(matTimer);
    ov.style.transition = 'opacity 0.72s ease';
    ov.style.opacity = '0';
    setTimeout(function() { if (ov.parentNode) ov.remove(); callback(); }, 740);
  }, 5600);
}

// ===== INIT =====
if (sessionStorage.getItem('qa_gen_user')) {
  window.location.href = 'src/pages/dashboard.html';
} else {
  document.addEventListener('DOMContentLoaded', initParticles);
}
