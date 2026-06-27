// ===== AUTH STORE =====
const AUTH = {
  VALID_USERS: [
    { username: 'admin', password: 'admin123', name: 'Admin', role: 'Administrator', email: 'admin@emudhra.com', initials: 'AD', phone: '9876543210' },
    { username: 'qa@emudhra.com', password: 'qagen2026', name: 'QA Engineer', role: 'Senior QA', email: 'qa@emudhra.com', initials: 'QE', phone: '9876543211' },
    { username: 'demo@emudhra.com', password: 'demo123', name: 'Demo User', role: 'Tester', email: 'demo@emudhra.com', initials: 'DU', phone: '9876543212' },
    { username: 'lead@emudhra.com', password: 'lead123', name: 'Tech Lead', role: 'Lead Engineer', email: 'lead@emudhra.com', initials: 'TL', phone: '9876543213' },
    { username: 'sahilkhan.m@emudhra.com', password: 'emudhra@2026', name: 'Sahil Khan', role: 'Administrator', email: 'sahilkhan.m@emudhra.com', initials: 'SK', phone: '9999999999' }
  ],
  getRegisteredUsers() {
    try { return JSON.parse(localStorage.getItem('qa_registered_users_v1') || '[]'); } catch (_) { return []; }
  },
  login(username, password) {
    const builtIn = this.VALID_USERS.find(u =>
      (u.username === username || u.email === username) && u.password === password
    );
    if (builtIn) return builtIn;
    const reg = this.getRegisteredUsers().find(u =>
      (u.email === username || u.empId === username) && u.password === password
    );
    return reg ? { username: reg.email, password: reg.password, name: reg.name, role: reg.role || 'QA Engineer', email: reg.email, initials: reg.initials || 'U?' } : null;
  },
  findByIdentifier(identifier) {
    const builtin = this.VALID_USERS.find(u => u.username === identifier || u.email === identifier);
    if (builtin) return { name: builtin.name, email: builtin.email };
    const reg = this.getRegisteredUsers().find(u => u.email === identifier || u.empId === identifier);
    return reg ? { name: reg.name, email: reg.email } : null;
  },
  validateDomain(username) {
    if (username.includes('@')) {
      const domain = username.split('@')[1]?.toLowerCase();
      return domain === 'emudhra.com';
    }
    return true;
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

// ===== LOGIN HANDLER =====
function handleLogin() {
  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  if (!username) { showError('Username or email is required.'); usernameInput.focus(); return; }
  if (!password) { showError('Password is required.'); passwordInput.focus(); return; }

  // Domain validation
  if (!AUTH.validateDomain(username)) {
    showError('User not registered. Contact Administrator.');
    return;
  }

  // Show loading
  const btnText = loginBtn.querySelector('.btn-text');
  if (btnText) btnText.style.display = 'none';
  loginBtn.textContent = 'Signing in...';
  loginBtn.disabled = true;

  setTimeout(() => {
    const user = AUTH.login(username, password);
    if (user) {
      const userData = {
        ...user,
        loginTime: new Date().toLocaleString(),
        activeProject: 'Delta Secure'
      };
      sessionStorage.setItem('qa_gen_user', JSON.stringify(userData));
      sessionStorage.setItem('af_fresh_login', '1');   // clear draft on next autoflow load

      // Store login record permanently
      const loginHist = JSON.parse(localStorage.getItem('qa_gen_login_history') || '[]');
      loginHist.unshift({
        date: new Date().toLocaleDateString('en-GB'),
        time: new Date().toLocaleTimeString(),
        full: new Date().toLocaleString(),
        user: user.name
      });
      localStorage.setItem('qa_gen_login_history', JSON.stringify(loginHist.slice(0, 100)));

      // Add security log
      const logs = JSON.parse(localStorage.getItem('qa_gen_logs') || '[]');
      logs.unshift({
        id: Date.now(),
        date: new Date().toLocaleDateString('en-GB'),
        time: new Date().toLocaleTimeString(),
        activity: 'User logged in: ' + user.name + ' (' + user.email + ')',
        type: 'auth',
        user: user.name
      });
      localStorage.setItem('qa_gen_logs', JSON.stringify(logs));

      window.location.href = 'pages/home.html';
    } else {
      loginBtn.innerHTML = `<span class="btn-text">${defaultLoginLabel}</span>`;
      loginBtn.disabled = false;
      showError('Invalid credentials. Please check username and password.');
      passwordInput.value = '';
      passwordInput.focus();
    }
  }, 1400);
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

  var DEMO_OTP       = '482916';
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

  function triggerLockout() {
    isLocked = true;
    clearInterval(_otpTick);
    clearInterval(_resendTick);
    lockSecsLeft = LOCK_DURATION;
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
    if (entered === currentOtp) {
      clearInterval(_otpTick);
      clearInterval(_resendTick);
      setMsg('OTP verified successfully. Signing in...', 'success');
      auditLog('OTP Verified', currentMobile, 'Login Success');
      var vBtn = G('motpVerifyBtn');
      if (vBtn) { var s = vBtn.querySelector('.btn-text'); if (s) s.textContent = 'Signing in…'; vBtn.disabled = true; }
      var u = currentUserData || {};
      var initials = (u.name || 'U?').split(' ').map(function (n) { return n[0]; }).join('').toUpperCase().slice(0, 2);
      var session = {
        username: u.email || currentMobile,
        name: u.name || 'User',
        email: u.email || currentMobile + '@emudhra.com',
        role: u.role || 'QA Engineer',
        mobile: currentMobile,
        loginTime: new Date().toLocaleString(),
        loginMethod: 'OTP',
        browser: navigator.userAgent.indexOf('Chrome') > -1 ? 'Chrome' : 'Browser',
        device: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop',
        sessionStatus: 'Active',
        activeProject: 'Delta Secure',
        initials: initials
      };
      sessionStorage.setItem('qa_gen_user', JSON.stringify(session));
      sessionStorage.setItem('af_fresh_login', '1');
      var hist = JSON.parse(localStorage.getItem('qa_gen_login_history') || '[]');
      hist.unshift({ date: new Date().toLocaleDateString('en-GB'), time: new Date().toLocaleTimeString(), full: new Date().toLocaleString(), user: session.name });
      localStorage.setItem('qa_gen_login_history', JSON.stringify(hist.slice(0, 100)));
      setTimeout(function () { window.location.href = 'pages/home.html'; }, 1200);
    } else {
      attemptsLeft--;
      auditLog('OTP Failed', currentMobile, 'Attempts left: ' + attemptsLeft);
      if (attemptsLeft <= 0) {
        setMsg('Maximum OTP attempts exceeded. Account temporarily locked.', 'error');
        triggerLockout();
      } else {
        setMsg('Invalid OTP. Attempts remaining: ' + attemptsLeft, 'error');
        boxes.forEach(function (b) { b.value = ''; b.classList.remove('filled'); });
        if (boxes[0]) boxes[0].focus();
      }
    }
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
      if (!val)            { setMobileErr('Mobile number is required.'); return; }
      if (!/^\d{10}$/.test(val)) { setMobileErr('Please enter a valid mobile number.'); return; }
      var found = findByMobile(val);
      if (!found) {
        setMobileErr('Phone number is not registered. Please register first or contact administrator.');
        return;
      }
      setMobileErr('');
      currentMobile   = val;
      currentUserData = found;
      currentOtp      = DEMO_OTP;
      attemptsLeft    = MAX_ATTEMPTS;
      isLocked        = false;
      this.disabled   = true;
      var st = this.querySelector('.btn-text');
      if (st) st.textContent = 'Sending…';
      setTimeout(function () {
        var s2 = G('motpSendBtn');
        if (s2) { s2.disabled = false; var st2 = s2.querySelector('.btn-text'); if (st2) st2.textContent = 'Send OTP →'; }
        var masked = G('motpMaskedMobile');
        if (masked) masked.textContent = 'XXXXXX' + val.slice(-4);
        showPanel('motpStep2');
        setMsg('', '');
        G('motpLockPanel') && (G('motpLockPanel').style.display = 'none');
        var boxes = document.querySelectorAll('#motpBoxes .otp-dig-box');
        boxes.forEach(function (b) { b.value = ''; b.classList.remove('filled'); b.disabled = false; });
        startOtpTimer();
        startResendCooldown();
        showBanner('OTP has been sent successfully.');
        auditLog('OTP Sent', currentMobile, 'User: ' + found.name);
        if (boxes[0]) boxes[0].focus();
      }, 700);
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
      currentOtp   = DEMO_OTP;
      attemptsLeft = MAX_ATTEMPTS;
      this.disabled = true;
      var st = this;
      st.textContent = 'Sending…';
      setTimeout(function () {
        st.textContent = 'Resend OTP';
        var boxes = document.querySelectorAll('#motpBoxes .otp-dig-box');
        boxes.forEach(function (b) { b.value = ''; b.classList.remove('filled'); b.disabled = false; });
        setMsg('', '');
        G('motpLockPanel') && (G('motpLockPanel').style.display = 'none');
        startOtpTimer();
        startResendCooldown();
        showBanner('A new OTP has been sent.');
        auditLog('OTP Resent', currentMobile);
        if (boxes[0]) boxes[0].focus();
      }, 600);
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

// ===== INIT =====
if (sessionStorage.getItem('qa_gen_user')) {
  window.location.href = 'pages/home.html';
} else {
  document.addEventListener('DOMContentLoaded', initParticles);
}
