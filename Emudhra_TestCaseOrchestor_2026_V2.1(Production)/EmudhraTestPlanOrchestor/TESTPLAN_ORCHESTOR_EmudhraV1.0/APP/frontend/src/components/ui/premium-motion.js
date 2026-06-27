/* ================================================================
   PREMIUM MOTION ENGINE v2 — eMudhra QA-Gen AI
   Kinetic Typography · Scroll Reveal · Magnetic · Cursor · 3D Tilt
   Nav Stagger · Input Glow · Table Hover · Tab Indicator · Counters
   ================================================================ */
(function PremiumMotion() {
  'use strict';

  /* ── Config ─────────────────────────────────────────────────── */
  const CFG = {
    cursorGlow:     !('ontouchstart' in window),
    kinetic:        true,
    scrollReveal:   true,
    magnetic:       !('ontouchstart' in window),
    tilt:           !('ontouchstart' in window),
    orbs:           false,
    prefersReduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  };

  /* ── Helpers ─────────────────────────────────────────────────── */
  function raf(fn) { requestAnimationFrame(fn); }
  function tagged(el, key) {
    if (el.dataset[key]) return true;
    el.dataset[key] = '1';
    return false;
  }

  /* ── 1. Ambient Orbs ─────────────────────────────────────────── */
  function injectOrbs() {
    if (!CFG.orbs || CFG.prefersReduced) return;
    [1, 2, 3].forEach(n => {
      if (document.querySelector('.pm-orb-' + n)) return;
      const el = document.createElement('div');
      el.className = 'pm-orb pm-orb-' + n;
      document.body.insertBefore(el, document.body.firstChild);
    });
  }

  /* ── 2. Cursor Glow ─────────────────────────────────────────── */
  function initCursorGlow() {
    if (!CFG.cursorGlow || CFG.prefersReduced) return;
    if (document.querySelector('.pm-cursor-glow')) return;

    const glow = document.createElement('div');
    glow.className = 'pm-cursor-glow';
    glow.style.cssText = 'position:fixed;pointer-events:none;z-index:9999;border-radius:50%;width:400px;height:400px;';
    document.body.appendChild(glow);

    let mx = -999, my = -999, cx = -999, cy = -999, rafId = null;
    document.addEventListener('mousemove', e => {
      mx = e.clientX; my = e.clientY;
      if (!rafId) rafId = requestAnimationFrame(tick);
    });
    function tick() {
      rafId = null;
      cx += (mx - cx) * 0.12;
      cy += (my - cy) * 0.12;
      glow.style.transform = `translate(${cx - 200}px,${cy - 200}px)`;
      if (Math.abs(mx - cx) > 0.5 || Math.abs(my - cy) > 0.5)
        rafId = requestAnimationFrame(tick);
    }
    document.addEventListener('mouseleave', () => { glow.style.opacity = '0'; });
    document.addEventListener('mouseenter', () => { glow.style.opacity = '1'; });
  }

  /* ── 3. Kinetic Typography ──────────────────────────────────── */
  function splitToChars(el) {
    if (tagged(el, 'pmKinetic')) return;
    const text = el.textContent.trim();
    if (!text) return;
    const words = text.split(' ');
    el.innerHTML = '';
    words.forEach((word, wi) => {
      if (wi > 0) {
        const sp = document.createElement('span');
        sp.style.cssText = 'display:inline-block;width:.28em;';
        el.appendChild(sp);
      }
      word.split('').forEach((ch, ci) => {
        const span = document.createElement('span');
        span.className = 'pm-kinetic-char';
        span.textContent = ch;
        span.style.animationDelay = ((wi * 5 + ci) * 38) + 'ms';
        el.appendChild(span);
      });
    });
  }

  function initKineticTypography() {
    if (!CFG.kinetic || CFG.prefersReduced) return;
    const sel = [
      '.workspace-brand', '.page-title', '.hero-title',
      '.section-title',   '.af-hero-title', '.hld-hero-title',
      '.enterprise-hero-title', '.testing-hero-title',
    ];
    sel.forEach(s => {
      document.querySelectorAll(s).forEach(el => {
        if (el.textContent.trim().length < 60) splitToChars(el);
      });
    });
  }

  /* ── 4. Scroll Reveal — all pages ───────────────────────────── */
  function initScrollReveal() {
    if (!CFG.scrollReveal || CFG.prefersReduced) return;

    const rules = [
      /* generic */
      { sel: '.feature-card',                     cls: 'pm-reveal',       stagger: true  },
      { sel: '.card:not(.input-card)',             cls: 'pm-reveal',       stagger: false },
      { sel: '.workspace-hero',                    cls: 'pm-reveal-scale', stagger: false },
      { sel: '.workspace-kicker',                  cls: 'pm-reveal',       stagger: false },
      { sel: '.prd-intel-panel',                   cls: 'pm-reveal',       stagger: false },
      { sel: '.output-stats-grid',                 cls: 'pm-reveal',       stagger: false },
      { sel: '.history-item',                      cls: 'pm-reveal-left',  stagger: true  },
      /* AutoFlow */
      { sel: '.af-card',                           cls: 'pm-card-enter',   stagger: true  },
      { sel: '.af-step',                           cls: 'pm-reveal-left',  stagger: true  },
      { sel: '.af-stat-card',                      cls: 'pm-reveal',       stagger: true  },
      /* HLD/LLD */
      { sel: '.hld-stat',                          cls: 'pm-card-enter',   stagger: true  },
      { sel: '.hld-module-card',                   cls: 'pm-card-enter',   stagger: true  },
      { sel: '.hld-section',                       cls: 'pm-reveal',       stagger: false },
      { sel: '.hld-output-panel',                  cls: 'pm-reveal',       stagger: false },
      /* Enterprise */
      { sel: '.enterprise-card',                   cls: 'pm-card-enter',   stagger: true  },
      { sel: '.enterprise-stat',                   cls: 'pm-reveal',       stagger: true  },
      { sel: '.enterprise-panel',                  cls: 'pm-reveal',       stagger: false },
      /* Testing Buddy */
      { sel: '.buddy-card',                        cls: 'pm-card-enter',   stagger: true  },
      { sel: '.buddy-history-item',                cls: 'pm-reveal-left',  stagger: true  },
      /* Admin / Reports */
      { sel: '.admin-card',                        cls: 'pm-card-enter',   stagger: true  },
      { sel: '.report-card',                       cls: 'pm-card-enter',   stagger: true  },
      { sel: '.report-section',                    cls: 'pm-reveal',       stagger: false },
      /* Dashboard */
      { sel: '.dashboard-card',                    cls: 'pm-card-enter',   stagger: true  },
      { sel: '.kpi-card',                          cls: 'pm-card-enter',   stagger: true  },
      { sel: '.metric-card',                       cls: 'pm-card-enter',   stagger: true  },
      /* Home */
      { sel: '.home-feature-item',                 cls: 'pm-reveal-left',  stagger: true  },
      { sel: '.home-stat',                         cls: 'pm-reveal',       stagger: true  },
      /* Analysis */
      { sel: '.analysis-card',                     cls: 'pm-card-enter',   stagger: true  },
      { sel: '.analysis-panel',                    cls: 'pm-reveal',       stagger: false },
    ];

    rules.forEach(({ sel, cls, stagger }) => {
      document.querySelectorAll(sel).forEach((el, i) => {
        const already = el.classList.contains('pm-reveal') ||
                        el.classList.contains('pm-reveal-left') ||
                        el.classList.contains('pm-reveal-scale') ||
                        el.classList.contains('pm-card-enter');
        if (already) return;
        el.classList.add(cls);
        if (stagger) el.style.transitionDelay = (i % 8) * 0.07 + 's';
      });
    });

    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('pm-visible');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });

    document.querySelectorAll(
      '.pm-reveal,.pm-reveal-left,.pm-reveal-scale,.pm-card-enter'
    ).forEach(el => io.observe(el));

    window._pmRevealObserver = io;
    window._pmRevealRules    = rules;
  }

  /* ── 5. Magnetic Buttons — all pages ────────────────────────── */
  function initMagneticButtons() {
    if (!CFG.magnetic || CFG.prefersReduced) return;

    const BTNS =
      '.btn-primary, .analyze-btn, .btn-api, .btn-gold,' +
      '.af-btn.primary, .hld-gen-btn, .hld-export-btn,' +
      '.enterprise-generate-btn, .buddy-send-btn,' +
      '.admin-action-btn, .report-export-btn';

    document.querySelectorAll(BTNS).forEach(btn => {
      if (tagged(btn, 'pmMagnetic')) return;
      const STRENGTH = 0.26;
      let rect, rafId;

      btn.addEventListener('mouseenter', () => { rect = btn.getBoundingClientRect(); });
      btn.addEventListener('mousemove', e => {
        if (!rect) rect = btn.getBoundingClientRect();
        const dx = (e.clientX - (rect.left + rect.width  / 2)) * STRENGTH;
        const dy = (e.clientY - (rect.top  + rect.height / 2)) * STRENGTH;
        cancelAnimationFrame(rafId);
        rafId = raf(() => {
          btn.style.transform = `translate(${dx}px,${dy}px) scale(1.04)`;
        });
      });
      btn.addEventListener('mouseleave', () => {
        cancelAnimationFrame(rafId);
        btn.style.transition = 'transform .4s cubic-bezier(.34,1.56,.64,1)';
        btn.style.transform  = '';
        setTimeout(() => { btn.style.transition = ''; }, 400);
      });
    });
  }

  /* ── 6. Card 3D Tilt — all pages ────────────────────────────── */
  function initCardTilt() {
    if (!CFG.tilt || CFG.prefersReduced) return;

    const CARDS =
      '.feature-card, .af-card, .hld-module-card,' +
      '.enterprise-card, .buddy-card, .dashboard-card,' +
      '.kpi-card, .metric-card, .report-card, .admin-card';

    const MAX = 5;
    document.querySelectorAll(CARDS).forEach(card => {
      if (tagged(card, 'pmTilt')) return;
      let rafId;

      card.addEventListener('mousemove', e => {
        const r  = card.getBoundingClientRect();
        const rx =  ((e.clientY - r.top  - r.height / 2) / (r.height / 2)) * MAX;
        const ry = -((e.clientX - r.left - r.width  / 2) / (r.width  / 2)) * MAX;
        cancelAnimationFrame(rafId);
        rafId = raf(() => {
          card.style.transform =
            `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-6px) scale(1.015)`;
        });
      });
      card.addEventListener('mouseleave', () => {
        cancelAnimationFrame(rafId);
        card.style.transition = 'transform .5s cubic-bezier(.16,1,.3,1)';
        card.style.transform  = '';
        setTimeout(() => { card.style.transition = ''; }, 500);
      });
    });
  }

  /* ── 7. Staggered Page Entrance ─────────────────────────────── */
  function initPageEntrance() {
    if (CFG.prefersReduced) return;

    const topbar  = document.querySelector('.topbar');
    const sidebar = document.querySelector('.sidebar');

    if (topbar && !tagged(topbar, 'pmEntered')) {
      topbar.style.cssText += ';opacity:0;transform:translateY(-16px);transition:opacity .5s ease,transform .5s cubic-bezier(.16,1,.3,1)';
      raf(() => setTimeout(() => {
        topbar.style.opacity = '';
        topbar.style.transform = '';
      }, 60));
    }
    if (sidebar && !tagged(sidebar, 'pmEntered')) {
      sidebar.style.cssText += ';opacity:0;transform:translateX(-20px);transition:opacity .55s ease,transform .55s cubic-bezier(.16,1,.3,1)';
      raf(() => setTimeout(() => {
        sidebar.style.opacity = '';
        sidebar.style.transform = '';
      }, 120));
    }

    /* Stagger nav items */
    document.querySelectorAll('.nav-item').forEach((el, i) => {
      if (tagged(el, 'pmNavEnter')) return;
      el.classList.add('pm-nav-enter');
      el.style.animationDelay = (0.04 + i * 0.05) + 's';
    });
  }

  /* ── 8. Button Ripple — all pages ───────────────────────────── */
  function initRipple() {
    if (!document.querySelector('#pm-ripple-style')) {
      const s = document.createElement('style');
      s.id = 'pm-ripple-style';
      s.textContent = '@keyframes pm-ripple{to{transform:scale(2.8);opacity:0;}}';
      document.head.appendChild(s);
    }

    document.addEventListener('click', e => {
      const btn = e.target.closest(
        '.btn-primary,.analyze-btn,.btn-gold,.btn-outline,' +
        '.af-btn,.hld-gen-btn,.hld-export-btn,' +
        '.enterprise-generate-btn,.buddy-send-btn'
      );
      if (!btn) return;
      const d    = Math.max(btn.clientWidth, btn.clientHeight);
      const rect = btn.getBoundingClientRect();
      const circle = document.createElement('span');
      circle.style.cssText =
        `position:absolute;width:${d}px;height:${d}px;border-radius:50%;` +
        `left:${e.clientX - rect.left - d/2}px;top:${e.clientY - rect.top - d/2}px;` +
        `background:rgba(255,255,255,.22);transform:scale(0);` +
        `animation:pm-ripple .6s ease-out forwards;pointer-events:none;`;
      if (getComputedStyle(btn).position === 'static') btn.style.position = 'relative';
      btn.style.overflow = 'hidden';
      btn.appendChild(circle);
      setTimeout(() => circle.remove(), 620);
    });
  }

  /* ── 9. Nav Active Highlight ─────────────────────────────────── */
  function initNavHighlight() {
    const path = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-item[data-page], .nav-item[href]').forEach(item => {
      const target = (item.dataset.page || item.getAttribute('href') || '').split('/').pop();
      if (target && path.includes(target.replace('.html', '')))
        item.classList.add('active');
    });
  }

  /* ── 10. Topbar Scroll Shrink ────────────────────────────────── */
  function initTopbarShrink() {
    const topbar = document.querySelector('.topbar');
    if (!topbar) return;
    const scroller = document.querySelector('.main-content') || window;
    let last = 0;
    scroller.addEventListener('scroll', () => {
      const y = scroller === window ? window.scrollY : scroller.scrollTop;
      if (y > 20 && last <= 20)
        topbar.style.cssText += ';box-shadow:0 2px 30px rgba(0,0,0,.5)!important;backdrop-filter:blur(28px) saturate(200%)!important;';
      else if (y <= 20 && last > 20)
        topbar.style.boxShadow = '';
      last = y;
    }, { passive: true });
  }

  /* ── 11. Tooltips ────────────────────────────────────────────── */
  function initTooltips() {
    document.querySelectorAll('[title]').forEach(el => {
      const tip = el.getAttribute('title');
      if (!tip) return;
      el.removeAttribute('title');
      el.dataset.pmTip = tip;
    });
    let tipEl = null;
    document.addEventListener('mouseover', e => {
      const host = e.target.closest('[data-pm-tip]');
      if (!host) return;
      if (!tipEl) {
        tipEl = document.createElement('div');
        tipEl.style.cssText =
          'position:fixed;z-index:10000;pointer-events:none;' +
          'background:rgba(6,18,42,.97);color:#e2e8f0;' +
          'font-size:.72rem;font-family:"Outfit",sans-serif;font-weight:600;' +
          'padding:4px 10px;border-radius:8px;white-space:nowrap;' +
          'border:1px solid rgba(255,255,255,.1);' +
          'box-shadow:0 4px 20px rgba(0,0,0,.4);' +
          'opacity:0;transition:opacity .15s ease;';
        document.body.appendChild(tipEl);
      }
      tipEl.textContent = host.dataset.pmTip;
      setTimeout(() => { if (tipEl) tipEl.style.opacity = '1'; }, 10);
    });
    document.addEventListener('mousemove', e => {
      if (!tipEl || tipEl.style.opacity === '0') return;
      tipEl.style.left = (e.clientX + 14) + 'px';
      tipEl.style.top  = (e.clientY - 28) + 'px';
    });
    document.addEventListener('mouseout', e => {
      if (e.target.closest('[data-pm-tip]') && tipEl) tipEl.style.opacity = '0';
    });
  }

  /* ── 12. Counter Animations — all pages ─────────────────────── */
  function animateCounter(el, to, duration) {
    if (tagged(el, 'pmCounted')) return;
    const start = performance.now();
    const update = now => {
      const t = Math.min((now - start) / duration, 1);
      const e = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(to * e).toLocaleString();
      if (t < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }

  function initCounters() {
    if (CFG.prefersReduced) return;
    const COUNTER_SEL =
      '.prd-metric-val, .stat-number, .kpi-value,' +
      '.af-stat-val, .af-stat-number,' +
      '#elementsCount, #actionsCount, #pagesCount, #totalSteps,' +
      '.hld-stat-value, .enterprise-stat-val,' +
      '.dashboard-stat-val, .report-stat-val, .admin-stat-val,' +
      '.metric-value, .count-badge';

    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el  = entry.target;
        const raw = el.textContent.trim().replace(/,/g, '');
        const num = parseFloat(raw);
        if (!isNaN(num) && num > 0) animateCounter(el, num, 900);
        io.unobserve(el);
      });
    }, { threshold: 0.5 });

    document.querySelectorAll(COUNTER_SEL).forEach(el => io.observe(el));
    window._pmCounterObserver = io;
  }

  /* ── 13. Input Focus Glow — all forms ───────────────────────── */
  function initInputGlow() {
    if (CFG.prefersReduced) return;
    const INPUT_SEL =
      '.af-input, .af-select, .af-textarea,' +
      '.hld-textarea, .hld-select, .hld-input,' +
      'input[type="text"], input[type="search"],' +
      'input[type="email"], input[type="password"],' +
      'textarea, select';

    document.querySelectorAll(INPUT_SEL).forEach(el => {
      if (tagged(el, 'pmGlow')) return;
      el.addEventListener('focus', () => {
        el.style.transition =
          'border-color .22s ease,box-shadow .22s ease,transform .18s ease';
        el.style.transform  = 'scale(1.008)';
        el.style.boxShadow  =
          '0 0 0 3px rgba(59,130,246,.18),0 4px 16px rgba(59,130,246,.12)';
      });
      el.addEventListener('blur', () => {
        el.style.transform = '';
        el.style.boxShadow = '';
      });
    });
  }

  /* ── 14. Tab Active Underline Slide ──────────────────────────── */
  function initTabIndicator() {
    if (CFG.prefersReduced) return;
    const TAB_SEL = '.hld-tab, .af-tab, [role="tab"], .enterprise-tab-btn, .buddy-tab';
    document.querySelectorAll(TAB_SEL).forEach(tab => {
      if (tagged(tab, 'pmTab')) return;
      tab.classList.add('hld-tab');
    });
  }

  /* ── 15. Table Row Stagger + Hover ───────────────────────────── */
  function initTableRows() {
    if (CFG.prefersReduced) return;
    document.querySelectorAll('table tbody tr').forEach((row, i) => {
      if (tagged(row, 'pmRow')) return;
      row.style.opacity    = '0';
      row.style.transform  = 'translateX(-8px)';
      row.style.transition =
        `opacity .35s ease ${i * 0.04}s,transform .35s cubic-bezier(.16,1,.3,1) ${i * 0.04}s`;
      setTimeout(() => {
        row.style.opacity   = '';
        row.style.transform = '';
      }, 100 + i * 40);
    });
  }

  /* ── 16. Stat number bounce on DOM change ────────────────────── */
  function bounceEl(el) {
    el.style.transition = 'transform .25s cubic-bezier(.34,1.56,.64,1)';
    el.style.transform  = 'scale(1.25)';
    setTimeout(() => { el.style.transform = ''; }, 260);
  }

  /* ── 17. Live DOM re-init ────────────────────────────────────── */
  function observeDOMChanges() {
    const STAT_SEL =
      '#elementsCount,#actionsCount,#pagesCount,#totalSteps,' +
      '.af-stat-val,.af-stat-number';

    /* Watch stat changes */
    document.querySelectorAll(STAT_SEL).forEach(el => {
      const mo = new MutationObserver(() => bounceEl(el));
      mo.observe(el, { childList: true, characterData: true, subtree: true });
    });

    /* Watch new nodes for re-tagging */
    const mo = new MutationObserver(mutations => {
      let hasNew = false;
      mutations.forEach(m => m.addedNodes.forEach(n => {
        if (n.nodeType === 1) hasNew = true;
      }));
      if (!hasNew) return;

      initMagneticButtons();
      initCardTilt();
      initInputGlow();
      initTableRows();
      initCounters();
      initTabIndicator();

      if (window._pmRevealObserver && window._pmRevealRules) {
        window._pmRevealRules.forEach(({ sel, cls, stagger }) => {
          document.querySelectorAll(sel).forEach((el, i) => {
            const already = el.classList.contains('pm-reveal') ||
                            el.classList.contains('pm-reveal-left') ||
                            el.classList.contains('pm-reveal-scale') ||
                            el.classList.contains('pm-card-enter');
            if (already) return;
            el.classList.add(cls);
            if (stagger) el.style.transitionDelay = (i % 8) * 0.07 + 's';
            window._pmRevealObserver.observe(el);
          });
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  /* ── Boot ────────────────────────────────────────────────────── */
  function boot() {
    injectOrbs();
    initPageEntrance();
    initKineticTypography();
    initScrollReveal();
    initMagneticButtons();
    initCardTilt();
    initCursorGlow();
    initRipple();
    initNavHighlight();
    initTopbarShrink();
    initTooltips();
    initCounters();
    initInputGlow();
    initTabIndicator();
    initTableRows();
    observeDOMChanges();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    requestAnimationFrame(boot);
  }

})();
