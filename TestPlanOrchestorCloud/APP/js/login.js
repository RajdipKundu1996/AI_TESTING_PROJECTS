// ===== AUTH STORE =====
const AUTH = {
  VALID_USERS: [
    { username: 'admin', password: 'admin123', name: 'Alex Smith', role: 'Project Manager', email: 'admin@emudhra.com', initials: 'AS' },
    { username: 'qa@emudhra.com', password: 'qagen2026', name: 'QA Engineer', role: 'Senior QA', email: 'qa@emudhra.com', initials: 'QE' },
    { username: 'demo@emudhra.com', password: 'demo123', name: 'Demo User', role: 'Tester', email: 'demo@emudhra.com', initials: 'DU' },
    { username: 'lead@emudhra.com', password: 'lead123', name: 'Tech Lead', role: 'Lead Engineer', email: 'lead@emudhra.com', initials: 'TL' }
  ],
  login(username, password) {
    return this.VALID_USERS.find(u =>
      (u.username === username || u.email === username) && u.password === password
    ) || null;
  },
  validateDomain(username) {
    // If it looks like an email, check domain
    if (username.includes('@')) {
      const domain = username.split('@')[1]?.toLowerCase();
      return domain === 'emudhra.com';
    }
    // For simple usernames (like 'admin'), allow through
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

// ===== TOGGLE PASSWORD VISIBILITY =====
let passwordVisible = false;
togglePassword.addEventListener('click', () => {
  passwordVisible = !passwordVisible;
  passwordInput.type = passwordVisible ? 'text' : 'password';
  eyeIcon.innerHTML = passwordVisible
    ? '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>'
    : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
  togglePassword.classList.toggle('active', passwordVisible);
});

// ===== SHOW/HIDE ERROR =====
function showError(msg) {
  loginErrorText.textContent = msg;
  loginError.style.display = 'flex';
  loginError.classList.add('shake');
  setTimeout(() => loginError.classList.remove('shake'), 500);
}
function hideError() {
  loginError.style.display = 'none';
}

// ===== CLEAR ON TYPE =====
usernameInput.addEventListener('input', hideError);
passwordInput.addEventListener('input', hideError);

// ===== ENTER KEY =====
[usernameInput, passwordInput].forEach(el => {
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
  const btnLoader = loginBtn.querySelector('.btn-loader');
  btnText.style.display = 'none';
  btnLoader.style.display = 'flex';
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

      window.location.href = 'pages/dashboard.html';
    } else {
      btnText.style.display = 'block';
      btnLoader.style.display = 'none';
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

// ===== INIT =====
if (sessionStorage.getItem('qa_gen_user')) {
  window.location.href = 'pages/dashboard.html';
} else {
  document.addEventListener('DOMContentLoaded', initParticles);
}
