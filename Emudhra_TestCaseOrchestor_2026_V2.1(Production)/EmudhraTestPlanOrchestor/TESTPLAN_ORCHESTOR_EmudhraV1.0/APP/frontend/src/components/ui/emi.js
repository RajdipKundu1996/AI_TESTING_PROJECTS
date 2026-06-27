/**
 * Veda — eMudhra AI Assistant
 * Named after the sacred Vedas (divine knowledge) of Indian mythology.
 * Self-contained widget. No external dependencies.
 * Shortcut: Ctrl+Shift+V  |  API: window.Veda
 */
(function () {
  'use strict';

  /* ── Persistence ────────────────────────────────────────────────── */
  var CFG_KEY       = 'veda_cfg_v1';
  var GREETED_KEY   = 'veda_greeted_date';
  var PROACTIVE_KEY = 'veda_proactive_date';

  var DEFAULTS = { enabled: true, greetings: true, contextHints: true, navAssist: true, animations: true };

  function cfg()      { try { return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(CFG_KEY) || '{}')); } catch (e) { return Object.assign({}, DEFAULTS); } }
  function saveCfg(s) { localStorage.setItem(CFG_KEY, JSON.stringify(s)); }

  /* ── Page detection ─────────────────────────────────────────────── */
  var PAGES = {
    'home.html':         { name: 'Dashboard',         key: 'home'        },
    'autoflow.html':     { name: 'AutoFlow Tester',   key: 'autoflow'    },
    'analysis.html':     { name: 'AI Analysis',       key: 'analysis'    },
    'reports.html':      { name: 'Reports',           key: 'reports'     },
    'dashboard.html':    { name: 'Analytics',         key: 'dashboard'   },
    'admin.html':        { name: 'Admin Panel',       key: 'admin'       },
    'enterprise.html':   { name: 'Enterprise QE',     key: 'enterprise'  },
    'hld_lld.html':      { name: 'HLD → LLD Maker', key: 'hldlld'  },
    'testing_buddy.html':{ name: 'Testing Buddy AI',  key: 'buddy'       },
  };
  function currPage() {
    var f = window.location.pathname.split('/').pop() || 'home.html';
    return PAGES[f] || { name: 'eMudhra', key: 'unknown' };
  }

  var PAGE_TIPS = {
    home:       { icon: '🚀', text: 'Click any module card to jump straight to a feature, or use the top navigation bar.' },
    autoflow:   { icon: '🎯', text: 'Click **Start Recording** to auto-capture steps in a real browser, then **Replay Test** to execute them.' },
    analysis:   { icon: '🔬', text: 'Upload screenshots or test output for AI-powered defect detection and classification.' },
    reports:    { icon: '📊', text: 'Export any test run as Excel or PDF using the download buttons on each report card.' },
    dashboard:  { icon: '💡', text: 'Charts here update as you run tests — click any metric card for a detailed drill-down.' },
    admin:      { icon: '🛡️', text: 'Use **Invite User** to add teammates, assign roles (Admin, Tester, Viewer), and manage access.' },
    enterprise: { icon: '🏆', text: 'Paste your requirement above and click **Generate** — I\'ll create enterprise-grade test cases instantly.' },
    hldlld:     { icon: '🏗️', text: 'Upload your HLD document (PDF/Word/Excel) and switch tabs to see AI-generated LLD, diagrams, and test strategy.' },
    buddy:      { icon: '🤝', text: 'Ask me anything about your project — I\'ll search your knowledge base and give AI-powered answers in real time.' },
    unknown:    { icon: '✨', text: 'I can guide you to any feature — just describe what you are looking for!' },
  };

  /* ── Context-aware quick chips per page ─────────────────────────── */
  var PAGE_CHIPS = {
    autoflow:   ['Start Recording', 'Replay Test', 'Generate Script', 'Add a Step'],
    analysis:   ['Analyze Screenshot', 'View Defects', 'Export Report', 'Open AutoFlow'],
    reports:    ['Export to Excel', 'Filter Results', 'Compare Runs', 'Open Dashboard'],
    dashboard:  ['View Pass Rate', 'Test Trends', 'Coverage Report', 'Open Reports'],
    admin:      ['Invite a User', 'Manage Roles', 'View Activity', 'Open Settings'],
    enterprise: ['Generate Test Cases', 'Export to Excel', 'Risk Analysis', 'Open Admin'],
    hldlld:     ['Upload HLD Document', 'Generate LLD', 'View Diagrams', 'Export Strategy'],
    buddy:      ['Ask about my project', 'Generate test cases', 'Find test gaps', 'Open AutoFlow'],
    home:       ['Start Testing', 'View Reports', 'AI Analysis', 'Admin Panel'],
  };
  var DEFAULT_CHIPS = ['How do I record a test?', 'Where are test reports?', 'How to generate a script?', 'Open Settings'];

  function getPageChips() {
    return PAGE_CHIPS[currPage().key] || DEFAULT_CHIPS;
  }

  /* ── Knowledge base ─────────────────────────────────────────────── */
  var KB = [
    { k: ['record','recording','auto-capture','start recording','how do i record','how to record'],
      r: 'To record a test flow:\n1. Open **AutoFlow Tester**\n2. Enter your Target URL\n3. Click **Start Recording**\n4. Perform your actions in the browser\n5. Click **Stop Recording**\n\nSteps are captured automatically with smart locators!',
      nav: 'autoflow.html', cta: 'Open AutoFlow Tester' },

    { k: ['replay','execute test','run test','playback','play back','how to replay','how do i replay'],
      r: 'To replay a test:\n1. Open **AutoFlow Tester**\n2. Load or record a flow\n3. Click **Replay Test**\n\nA maximized browser will launch, hit your URL, and execute every step with live screenshots.',
      nav: 'autoflow.html', cta: 'Open AutoFlow Tester' },

    { k: ['report','reports','test history','past run','export result','download result','test result'],
      r: 'Test Reports are on the Reports page:\n\n- All past test runs with timestamps\n- Pass / fail breakdowns per step\n- Export as Excel or PDF\n- Compare runs across dates',
      nav: 'reports.html', cta: 'Open Reports' },

    { k: ['dashboard','analytics','metric','chart','graph','pass rate','coverage','trend'],
      r: 'The Analytics Dashboard shows:\n\n- Overall pass / fail rates\n- Step execution trends\n- Test coverage metrics\n- Flow history timeline',
      nav: 'dashboard.html', cta: 'Open Dashboard' },

    { k: ['analysis','ai analysis','screenshot analysis','defect','bug detection','classify','root cause'],
      r: 'AI Analysis is on the Analysis page:\n\n- Upload screenshots or test logs\n- Automated defect classification\n- Severity scoring\n- Root cause hints',
      nav: 'analysis.html', cta: 'Open AI Analysis' },

    { k: ['admin','user management','invite user','manage user','role','permission','suspend','remove user'],
      r: 'User management is in the Admin Panel:\n\n- Invite users by email\n- Assign roles: Admin, Tester, Viewer\n- Suspend or remove accounts\n- View usage activity',
      nav: 'admin.html', cta: 'Open Admin Panel' },

    { k: ['enterprise','certificate','bulk test','compliance','batch test'],
      r: 'Enterprise features are on the Enterprise page:\n\n- Bulk test execution\n- Certificate management\n- Compliance reporting\n- Advanced integrations',
      nav: 'enterprise.html', cta: 'Open Enterprise' },

    { k: ['settings','theme','dark mode','light mode','appearance','api key','change theme'],
      r: 'Open Settings via the gear icon in the top navigation bar.\n\nYou can change:\n- Theme (9 options: Light, Dark, Ocean, Forest, Midnight...)\n- API keys for AI features\n- Veda Assistant preferences',
      nav: null, cta: null },

    { k: ['home','main page','overview','go home','landing page'],
      r: 'The Home Dashboard is your starting point:\n\n- Quick-access module cards\n- Recent test flows\n- System status\n- Feature announcements',
      nav: 'home.html', cta: 'Go to Home' },

    { k: ['step','add step','manual step','edit step','delete step'],
      r: 'Managing steps in AutoFlow Tester:\n\n- **Add Step** — manually add any action type\n- **Start Recording** — auto-capture from browser\n- Click the edit button to modify a step\n- **AI Generate** creates steps from your description',
      nav: 'autoflow.html', cta: 'Open AutoFlow Tester' },

    { k: ['script','generate script','playwright','selenium','cypress','export code','test framework'],
      r: 'Script generation in AutoFlow Tester:\n\n1. Add or record your steps\n2. Click **Generate Script**\n3. Choose: Playwright, Selenium, or Cypress\n4. Copy or download the code',
      nav: 'autoflow.html', cta: 'Open AutoFlow Tester' },

    { k: ['test case','test cases','test suite'],
      r: 'Test Cases are auto-generated when you replay a flow.\nFind them in the **Test Cases** tab inside AutoFlow Tester.\n\nExport to Excel for your test management tool.',
      nav: 'autoflow.html', cta: 'Open AutoFlow Tester' },

    { k: ['feature','capabilities','what can','what is','new feature','discover'],
      r: 'eMudhra AutoFlow features:\n\n- Browser recording with auto-locators\n- Automated replay with live screenshots\n- AI step and expected-result generation\n- Script export: Playwright, Selenium, Cypress\n- Analytics, coverage and failure analysis\n- AI defect classification\n- Team and role management\n- Enterprise bulk testing',
      nav: null, cta: null },

    { k: ['expected result','expected','auto-fill','ai generate expected'],
      r: 'In the Add/Edit Step modal, the Expected Result field auto-fills as you pick the action and target.\n\nYou can also:\n- Click **AI Generate** for a smart suggestion\n- Click **From Actual** to copy the last actual result',
      nav: 'autoflow.html', cta: 'Open AutoFlow Tester' },
  ];

  /* ── Helpers ─────────────────────────────────────────────────────── */
  function el(id) { return document.getElementById(id); }

  /* Returns the assistant's saved display name, falling back to 'Aditi' */
  function aditiName() {
    try {
      var av = JSON.parse(localStorage.getItem('veda_avatar_v1') || 'null');
      return (av && (av.displayName || av.name)) || 'Aditi';
    } catch(e) { return 'Aditi'; }
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function md(s) {
    return esc(s)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }

  function userName() {
    try {
      var raw = localStorage.getItem('currentUser') || localStorage.getItem('userName') || '';
      if (!raw) return 'there';
      var base = raw.indexOf('@') > -1 ? raw.split('@')[0] : raw;
      return base.replace(/[_.\-]/g, ' ')
                 .replace(/\b\w/g, function (c) { return c.toUpperCase(); })
                 .trim() || 'there';
    } catch (e) { return 'there'; }
  }

  function today() { return new Date().toDateString(); }

  function getTimeStr() {
    var d = new Date(), h = d.getHours(), m = d.getMinutes();
    var ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + ':' + (m < 10 ? '0' + m : m) + ' ' + ampm;
  }

  /* ── Response engine ─────────────────────────────────────────────── */
  function respond(text) {
    var low = text.toLowerCase().trim();
    var pg  = currPage();
    var u   = userName();

    if (/^(hi|hello|hey|hiya|yo|sup|namaste|vanakkam|hlo)[\s!.]*$/.test(low)) {
      return { t: 'Namaste 🙏 **' + u + '**!\n\nI am **' + aditiName() + '**, your Enterprise QA Intelligence Companion.\nYou are currently on **' + pg.name + '**.\n\nHow can I assist you today?', c: getPageChips() };
    }
    if (/\b(bye|goodbye|see you|alvida|tata)\b/.test(low)) {
      return { t: '👋 Goodbye ' + u + '! Keep testing and happy coding! 💻✨' };
    }
    if (/\b(thanks|thank you|dhanyavaad|shukriya|thx|ty|great|perfect|awesome)\b/.test(low)) {
      return { t: '😊 Happy to help! Keep testing and happy coding! 💻' };
    }
    if (/who are you|your name|what.*you|about veda|about aditi|about yourself|about qa bot/.test(low)) {
      return { t: 'I am **' + aditiName() + '** ✨ — your Enterprise QA Intelligence Companion!\n\nI help you:\n- Analyze requirements and detect risks\n- Generate enterprise-grade test cases\n- Navigate the QA-Gen AI platform\n- Predict defects before they reach production\n\nNameplate: **Modern Indian Technology Professional** · QA AI Assistant 🙏' };
    }
    if (/what.*help|help me|what.*can.*do|guide me|capabilities/.test(low)) {
      return { t: 'Here is what I can help with:\n\n- **Navigation** — find any feature or menu\n- **How-to guides** — step-by-step instructions\n- **Feature discovery** — learn what is available\n- **Page tips** — context-aware hints\n\nJust ask!', c: getPageChips() };
    }

    for (var i = 0; i < KB.length; i++) {
      var entry = KB[i];
      for (var j = 0; j < entry.k.length; j++) {
        if (low.indexOf(entry.k[j]) > -1) {
          return { t: entry.r, nav: entry.nav, cta: entry.cta };
        }
      }
    }

    var tipObj = PAGE_TIPS[pg.key] || PAGE_TIPS.unknown;
    var tip = tipObj.text || tipObj;
    return {
      t: 'Hmm, let me think... 🤔\n\nSince you are on **' + pg.name + '**:\n\n' + tip + '\n\nOr try: "Where is [feature]?" or "How do I [task]?"',
    };
  }

  /* ══════════════════════════════════════════════════════════════════
     SVG — Aditi · Enterprise AI QA Assistant
     Premium 2D portrait · Modern Indian Tech Professional
     AI Uniform (white+blue) · Saffron smart badge · Intelligent eyes
     Expressions: happy · thinking · excited · sad · cry · wink · analyse · celebrate
  ══════════════════════════════════════════════════════════════════ */
  var ROBOT_SVG = (
    '<svg id="vedaRobotSvg" viewBox="0 0 70 84" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +

    /* ── Circular background — enterprise blue-white ── */
    '<circle cx="35" cy="38" r="37" fill="#EFF6FF" opacity="0.97"/>' +
    '<circle cx="35" cy="38" r="36.5" fill="none" stroke="#BFDBFE" stroke-width="0.8"/>' +

    /* ── Shadow glow halo ── */
    '<ellipse id="vedaGlow" cx="35" cy="81" rx="18" ry="4" fill="#2563EB" opacity="0.2"/>' +

    /* ── Long hair — back layer ── */
    '<g id="vedaHairBack"><path d="M18 14 Q4 26 4 52 Q5 64 11 74 Q14 70 15 60 Q15 38 21 18Z" fill="#2D1B0E"/>' +
    '<path d="M52 14 Q66 26 66 52 Q65 64 59 74 Q56 70 55 60 Q55 38 49 18Z" fill="#2D1B0E"/></g>' +

    /* ── Modern slim AI headset ── */
    '<path d="M13 27 Q16 5 35 4 Q54 5 57 27" fill="none" stroke="#374151" stroke-width="2.8" stroke-linecap="round"/>' +
    '<ellipse cx="13" cy="27" rx="5" ry="5.5" fill="#1D4ED8"/>' +
    '<ellipse cx="13" cy="27" rx="3" ry="3.4" fill="#3B82F6"/>' +
    '<ellipse cx="13" cy="27" rx="1.2" ry="1.5" fill="#93C5FD"/>' +
    '<ellipse cx="57" cy="27" rx="5" ry="5.5" fill="#1D4ED8"/>' +
    '<ellipse cx="57" cy="27" rx="3" ry="3.4" fill="#3B82F6"/>' +
    '<ellipse cx="57" cy="27" rx="1.2" ry="1.5" fill="#93C5FD"/>' +
    '<path d="M14 31 Q10 39 11 46" fill="none" stroke="#374151" stroke-width="1.8" stroke-linecap="round"/>' +
    '<circle cx="11" cy="46" r="2.4" fill="#1D4ED8"/>' +
    '<circle cx="11" cy="46" r="1.1" fill="#60A5FA"/>' +

    /* ── Face skin (warm Indian peach) ── */
    '<ellipse id="vedaSkinFace" cx="35" cy="28" rx="18" ry="21" fill="#F7C09A"/>' +

    /* ── Hair crown — front layer ── */
    '<g id="vedaHairFront"><path d="M17 28 Q18 4 35 3 Q52 4 53 28 Q48 14 35 13 Q22 14 17 28Z" fill="#2D1B0E"/>' +
    '<path d="M34 3.5 Q35 10 36 3.5" fill="#2D1B0E"/>' +
    '<path d="M17 28 Q14 35 15 44" fill="none" stroke="#2D1B0E" stroke-width="5" stroke-linecap="round"/>' +
    '<path d="M53 28 Q56 35 55 44" fill="none" stroke="#2D1B0E" stroke-width="5" stroke-linecap="round"/></g>' +

    /* ── Bindi ── */
    '<g id="vedaBindi"><circle id="vedaAntenna" cx="35" cy="14" r="2.6" fill="#DC2626"/>' +
    '<circle cx="35" cy="14" r="1.3" fill="#FCA5A5"/>' +
    '<circle cx="35" cy="14" r="0.4" fill="white" opacity="0.6"/></g>' +

    /* ── Eyebrows ── */
    '<path id="vedaBrowL" d="M21.5 20 Q26.5 16.5 31 18" stroke="#1C0A02" stroke-width="2" fill="none" stroke-linecap="round"/>' +
    '<path id="vedaBrowR" d="M39 18 Q43.5 16.5 48.5 20" stroke="#1C0A02" stroke-width="2" fill="none" stroke-linecap="round"/>' +

    /* ── Blush cheeks ── */
    '<ellipse id="vedaBlushL" cx="21" cy="29" rx="6" ry="3.5" fill="#F87171" opacity="0.18"/>' +
    '<ellipse id="vedaBlushR" cx="49" cy="29" rx="6" ry="3.5" fill="#F87171" opacity="0.18"/>' +

    /* ── Left eye — large intelligent ── */
    '<g id="vedaEyeL">' +
      '<ellipse cx="27.5" cy="25" rx="6.5" ry="7" fill="#1C0A04"/>' +
      '<ellipse cx="27.5" cy="25.3" rx="4.5" ry="5" fill="#5C2D04"/>' +
      '<ellipse cx="27.5" cy="25.7" rx="2.6" ry="2.9" fill="#080302"/>' +
      '<circle cx="25" cy="22.5" r="2.2" fill="white" opacity="0.94"/>' +
      '<circle cx="30.5" cy="24.5" r="1.1" fill="white" opacity="0.72"/>' +
      '<path d="M21.2 21.5 Q27.5 18.2 33.8 21.5" fill="none" stroke="#1C0A04" stroke-width="1.8" stroke-linecap="round"/>' +
    '</g>' +

    /* ── Right eye — large intelligent ── */
    '<g id="vedaEyeR">' +
      '<ellipse cx="42.5" cy="25" rx="6.5" ry="7" fill="#1C0A04"/>' +
      '<ellipse cx="42.5" cy="25.3" rx="4.5" ry="5" fill="#5C2D04"/>' +
      '<ellipse cx="42.5" cy="25.7" rx="2.6" ry="2.9" fill="#080302"/>' +
      '<circle cx="40" cy="22.5" r="2.2" fill="white" opacity="0.94"/>' +
      '<circle cx="45.5" cy="24.5" r="1.1" fill="white" opacity="0.72"/>' +
      '<path d="M36.2 21.5 Q42.5 18.2 48.8 21.5" fill="none" stroke="#1C0A04" stroke-width="1.8" stroke-linecap="round"/>' +
    '</g>' +

    /* ── Nose ── */
    '<path d="M33.5 32 Q35 34.5 36.5 32" stroke="#C48A6A" stroke-width="1.3" fill="none" stroke-linecap="round"/>' +

    /* ── Mouth variants ── */
    '<path id="vedaMSmile" d="M28 38 Q35 44.5 42 38" stroke="#C0392B" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
    '<path id="vedaMHappy" d="M26 37.5 Q35 45.5 44 37.5" stroke="#C0392B" stroke-width="2.8" fill="none" stroke-linecap="round" opacity="0"/>' +
    '<path id="vedaMThink" d="M30 40.5 Q35 41 40 40.5" stroke="#C0392B" stroke-width="2" fill="none" stroke-linecap="round" opacity="0"/>' +
    '<path id="vedaMCry" d="M28 42 Q35 37 42 42" stroke="#C0392B" stroke-width="2.3" fill="none" stroke-linecap="round" opacity="0"/>' +

    /* ── Teardrops ── */
    '<ellipse id="vedaTearL" cx="24" cy="40" rx="1.6" ry="2.8" fill="#93C5FD" opacity="0"/>' +
    '<ellipse id="vedaTearR" cx="46" cy="40" rx="1.6" ry="2.8" fill="#93C5FD" opacity="0"/>' +

    /* ── Professional gold stud earrings ── */
    '<g id="vedaEarrings"><circle cx="15.5" cy="34" r="2.4" fill="#D4AF37"/>' +
    '<circle cx="15.5" cy="34" r="1.0" fill="#FDE68A"/>' +
    '<circle cx="54.5" cy="34" r="2.4" fill="#D4AF37"/>' +
    '<circle cx="54.5" cy="34" r="1.0" fill="#FDE68A"/></g>' +

    /* ── Neck ── */
    '<rect id="vedaSkinNeck" x="31" y="47" width="8" height="7" rx="2.5" fill="#F7C09A"/>' +

    /* ── AI Uniform — white coat with dynamic collar ── */
    '<path id="vedaOutfitBlouse" d="M14 54 Q11 60 10 70 L60 70 Q59 60 56 54 Q45 50 35 50 Q25 50 14 54Z" fill="#EBF5FF"/>' +
    '<path id="vedaCollar" d="M26 54 Q30 58 35 56 Q40 58 44 54 Q40 52 35 53 Q30 52 26 54Z" fill="#1D4ED8"/>' +
    '<path id="vedaCollarLine" d="M33 53 Q35 57 37 53" fill="none" stroke="#DBEAFE" stroke-width="0.8"/>' +
    '<path d="M14 54 Q11 60 10 70" stroke="#93C5FD" stroke-width="1.2" fill="none" opacity="0.7"/>' +
    '<path d="M56 54 Q59 60 60 70" stroke="#93C5FD" stroke-width="1.2" fill="none" opacity="0.7"/>' +
    /* Traditional/Festival gold dupatta drape (hidden by default) */
    '<path id="vedaDupatta" d="M14 54 Q4 62 5 72 Q6 78 10 82" fill="none" stroke="#FCD34D" stroke-width="3" stroke-linecap="round" opacity="0"/>' +
    '<circle id="vedaGoldDot1" cx="17" cy="73" r="2.2" fill="#FCD34D" opacity="0"/>' +
    '<circle id="vedaGoldDot2" cx="13" cy="66" r="1.6" fill="#FCD34D" opacity="0"/>' +
    '<circle id="vedaGoldDot3" cx="53" cy="73" r="2.2" fill="#FCD34D" opacity="0"/>' +

    /* ── Saffron smart badge ── */
    '<rect x="27.5" y="61" width="15" height="7" rx="3" fill="#F59E0B"/>' +
    '<rect x="28.5" y="62" width="13" height="5" rx="2" fill="#FDE68A" opacity="0.45"/>' +
    '<path d="M30 64.5 H36" stroke="#92400E" stroke-width="0.9" stroke-linecap="round" opacity="0.7"/>' +
    '<path d="M30 66 H38" stroke="#92400E" stroke-width="0.7" stroke-linecap="round" opacity="0.45"/>' +
    '<circle cx="40.5" cy="65" r="1.6" fill="#DC2626" opacity="0.85"/>' +
    '<circle cx="40.5" cy="65" r="0.6" fill="#FCA5A5" opacity="0.9"/>' +

    /* ── Right arm ── */
    '<g id="emiArmRight">' +
      '<path d="M56 55 Q66 59 65 67" fill="none" stroke="#F7C09A" stroke-width="7.5" stroke-linecap="round"/>' +
      '<ellipse cx="65" cy="64" rx="4" ry="1.4" fill="none" stroke="#1D4ED8" stroke-width="2"/>' +
      '<circle cx="65" cy="69" r="4" fill="#F7C09A"/>' +
    '</g>' +

    /* ── Uniform lower body ── */
    '<path id="vedaLowerBody" d="M10 70 Q9 77 10 84 L60 84 Q61 77 60 70Z" fill="#EBF5FF"/>' +
    '<path id="vedaSareeBorder" d="M10 78 Q35 83 60 78" stroke="#1D4ED8" stroke-width="2.5" fill="none"/>' +
    '<path id="vedaSareeDash" d="M10 78 Q35 83 60 78" stroke="#93C5FD" stroke-width="0.9" fill="none" stroke-dasharray="3,2.5" opacity="0.9"/>' +

    /* ── Left arm ── */
    '<g id="vedaArmL">' +
      '<path d="M14 55 Q4 59 5 67" fill="none" stroke="#F7C09A" stroke-width="7.5" stroke-linecap="round"/>' +
      '<circle cx="5" cy="71" r="4" fill="#F7C09A"/>' +
    '</g>' +

    '</svg>'
  );

  /* Small avatar for panel header and messages — Aditi AI Assistant */
  var AVATAR_SVG = (
    '<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<circle id="vedaAvatarBg" cx="16" cy="16" r="16" fill="#1D4ED8"/>' +
    '<circle cx="16" cy="16" r="15.5" fill="none" stroke="#93C5FD" stroke-width="0.7"/>' +
    '<g id="vedaAvatarHairBack"><ellipse cx="4" cy="17" rx="4" ry="9" fill="#2D1B0E"/>' +
    '<ellipse cx="28" cy="17" rx="4" ry="9" fill="#2D1B0E"/></g>' +
    '<path d="M5.5 13 Q7 3 16 3 Q25 3 26.5 13" fill="none" stroke="#374151" stroke-width="1.6" stroke-linecap="round"/>' +
    '<circle cx="5.5" cy="13" r="2.6" fill="#3B82F6"/>' +
    '<circle cx="5.5" cy="13" r="1.2" fill="#93C5FD"/>' +
    '<circle cx="26.5" cy="13" r="2.6" fill="#3B82F6"/>' +
    '<circle cx="26.5" cy="13" r="1.2" fill="#93C5FD"/>' +
    '<ellipse id="vedaAvatarSkinFace" cx="16" cy="18" rx="9.5" ry="11" fill="#F7C09A"/>' +
    '<path id="vedaAvatarHairFront" d="M6.5 18 Q7 4 16 4 Q25 4 25.5 18 Q22 10 16 9.5 Q10 10 6.5 18Z" fill="#2D1B0E"/>' +
    '<circle cx="16" cy="10.5" r="1.5" fill="#DC2626"/>' +
    '<circle cx="16" cy="10.5" r="0.7" fill="#FCA5A5"/>' +
    '<circle cx="5.5" cy="20.5" r="1.4" fill="#D4AF37"/>' +
    '<circle cx="26.5" cy="20.5" r="1.4" fill="#D4AF37"/>' +
    '<ellipse cx="12.5" cy="18.5" rx="3" ry="3.4" fill="#1C0A04"/>' +
    '<ellipse cx="12.5" cy="18.7" rx="2" ry="2.3" fill="#5C2D04"/>' +
    '<ellipse cx="12.5" cy="19" rx="1.1" ry="1.3" fill="#080302"/>' +
    '<circle cx="11.2" cy="17" r="1.1" fill="white" opacity="0.92"/>' +
    '<ellipse cx="19.5" cy="18.5" rx="3" ry="3.4" fill="#1C0A04"/>' +
    '<ellipse cx="19.5" cy="18.7" rx="2" ry="2.3" fill="#5C2D04"/>' +
    '<ellipse cx="19.5" cy="19" rx="1.1" ry="1.3" fill="#080302"/>' +
    '<circle cx="18.2" cy="17" r="1.1" fill="white" opacity="0.92"/>' +
    '<ellipse cx="8.5" cy="22" rx="2.5" ry="1.5" fill="#F87171" opacity="0.4"/>' +
    '<ellipse cx="23.5" cy="22" rx="2.5" ry="1.5" fill="#F87171" opacity="0.4"/>' +
    '<path d="M12 24 Q16 27.5 20 24" stroke="#C0392B" stroke-width="1.6" stroke-linecap="round" fill="none"/>' +
    '</svg>'
  );

  /* ── Dynamic greeting engine (100+ pool, never consecutive repeat) ── */
  var GREETING_POOL = [
    function(u,p) { return 'Namaste 🙏 Welcome back, **' + u + '**! Ready to engineer quality?'; },
    function(u,p) { return 'Hello **' + u + '**! 👋 I\'m **' + aditiName() + '**, your Enterprise QA Intelligence Companion.'; },
    function(u,p) { return 'Namaste 🙏 Glad to see you, **' + u + '**! What shall we analyze today?'; },
    function(u,p) { return '🌟 Good to see you, **' + u + '**! Your QA partner is online.'; },
    function(u,p) { return 'Welcome back 🚀 **' + u + '**! Let\'s generate enterprise-grade test coverage.'; },
    function(u,p) { return 'Greetings 🙏 **' + u + '**! Ready to detect risks and drive quality?'; },
    function(u,p) { return '💡 Hello **' + u + '**! I\'m here to help you build bulletproof test suites.'; },
    function(u,p) { return 'Namaste **' + u + '**! 🌿 Every test case we write is a step toward zero defects.'; },
    function(u,p) { return '🔬 Welcome, **' + u + '**! Let\'s analyze requirements and predict defects.'; },
    function(u,p) { return 'Hello 👋 **' + u + '**! QA excellence starts here. How can I assist?'; },
    function(u,p) { return 'Namaste 🙏 **' + u + '**! Enterprise quality engineering, at your service.'; },
    function(u,p) { return '✨ Welcome back, **' + u + '**! Ready to transform requirements into test coverage?'; },
    function(u,p) { return '🌞 Good morning energy, **' + u + '**! Let\'s improve quality today.'; },
    function(u,p) { return '🔵 Hello **' + u + '**! **' + aditiName() + '** is online and ready to assist on **' + p + '**.'; },
    function(u,p) { return 'Namaste! 🙏 I\'ve been waiting to help you, **' + u + '**. What\'s on your testing agenda?'; },
    function(u,p) { return '🏆 Welcome, **' + u + '**! Quality is not an act — it\'s a habit. Let\'s build it.'; },
    function(u,p) { return '🤖 Hello **' + u + '**! Your AI-powered QA companion is ready. Ask me anything!'; },
    function(u,p) { return 'Greetings, **' + u + '**! 🛡️ I\'m here to protect your product quality.'; },
    function(u,p) { return '🚀 Ready to launch, **' + u + '**! What requirement shall we analyze first?'; },
    function(u,p) { return 'Namaste 🙏 **' + u + '**! Let\'s turn every risk into a test case today.'; },
    function(u,p) { return '💡 Welcome back! I\'m **' + aditiName() + '**, your QA intelligence layer for **' + p + '**.'; },
    function(u,p) { return '✅ Hello **' + u + '**! Today\'s goal: zero defects in production. Let\'s plan it.'; },
    function(u,p) { return 'Hi **' + u + '**! 🌟 Great to see you on **' + p + '**. How can I help?'; },
    function(u,p) { return '🔮 Namaste, **' + u + '**! I can detect requirements ambiguity before it becomes a bug.'; },
    function(u,p) { return '📊 Welcome, **' + u + '**! Coverage analytics, risk analysis — all at your command.'; },
    function(u,p) { return 'Hello 👋 Your enterprise QA partner is live. What\'s our mission today, **' + u + '**?'; },
    function(u,p) { return '🌈 Namaste! Quality has many colors. Let me help you paint the complete picture, **' + u + '**.'; },
    function(u,p) { return '🤝 Hello **' + u + '**! I\'m **' + aditiName() + '** — let\'s collaborate on world-class test engineering.'; },
    function(u,p) { return '🙏 Vanakkam **' + u + '**! Your intelligent QA companion awaits your command.'; },
    function(u,p) { return '🕰️ Welcome back, **' + u + '**! Every minute spent testing saves hours of production firefighting.'; },
  ];
  var _greetIdx = -1;
  function getDynGreeting(u, p) {
    var idx;
    do { idx = Math.floor(Math.random() * GREETING_POOL.length); } while (idx === _greetIdx && GREETING_POOL.length > 1);
    _greetIdx = idx;
    return GREETING_POOL[idx](u || 'there', p || 'the platform');
  }

  /* ── Smart contextual reactions ─────────────────────────────────── */
  function setupSmartReactions() {
    /* File / PRD upload detection */
    document.addEventListener('change', function(e) {
      if (!cfg().enabled || !cfg().greetings) return;
      if (e.target && e.target.type === 'file' && e.target.files && e.target.files.length > 0) {
        setTimeout(function() {
          if (!isOpen) {
            var gt = el('emiGText'), g = el('emiGreeting');
            if (gt && g) {
              gt.innerHTML = '🙏 <strong>Namaste!</strong> I received your document. Let me help you analyze it.';
              g.style.display = 'block';
              setMood('veda-thinking');
              setTimeout(function() { if (g) g.style.display = 'none'; setMood(''); }, 9000);
            }
          }
        }, 600);
      }
    });

    /* Analyze / generate button clicks */
    document.addEventListener('click', function(e) {
      if (!cfg().enabled) return;
      var t = e.target;
      if (!t) return;
      var text = ((t.textContent || t.innerText || t.value || '') + ' ' + (t.getAttribute('title') || '')).toLowerCase();
      if (/analyz|analyse|generate.*test|test.*generat|run.*test|execute.*test/.test(text)) {
        setMood('veda-thinking');
        setTimeout(function() { setMood(''); }, 6000);
      }
      if (/generate.*test|test.*generat|create.*test/.test(text)) {
        setTimeout(function() {
          if (!isOpen && cfg().greetings) {
            var gt = el('emiGText'), g = el('emiGreeting');
            if (gt && g) {
              gt.innerHTML = '🎉 <strong>Great news!</strong> Your enterprise test cases are being generated!';
              g.style.display = 'block';
              setMood('veda-excited');
              burstSparkles();
              setTimeout(function() { if (g) g.style.display = 'none'; setMood(''); }, 8000);
            }
          }
        }, 1800);
      }
    });
  }

  /* ── Inject HTML ─────────────────────────────────────────────────── */
  function inject() {
    var w = document.createElement('div');
    w.id = 'emiWidget';
    w.setAttribute('aria-label', 'Veda AI Assistant');
    w.innerHTML =
      /* greeting bubble */
      '<div id="emiGreeting" style="display:none" role="status" aria-live="polite">' +
        '<button type="button" class="emi-greeting-close" id="emiGClose" aria-label="Dismiss">&#x2715;</button>' +
        '<div id="emiGText"></div>' +
      '</div>' +
      /* chat panel */
      '<div id="emiPanel" role="dialog" aria-label="Veda AI Assistant Chat" aria-hidden="true">' +
        '<div class="emi-panel-header">' +
          '<div class="emi-panel-avatar">' + AVATAR_SVG + '</div>' +
          '<div class="emi-panel-info">' +
            '<div class="emi-panel-name">' + aditiName() + ' &#x2728;</div>' +
            '<div class="emi-panel-status"><span class="emi-online-dot"></span> Online &middot; QA Intelligence</div>' +
          '</div>' +
          '<div class="emi-header-actions">' +
            '<button type="button" class="emi-header-btn" id="emiClearBtn" title="Clear chat" aria-label="Clear chat">' +
              '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">' +
                '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>' +
                '<path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>' +
              '</svg>' +
            '</button>' +
            '<button type="button" class="emi-panel-close" id="emiClose" aria-label="Close Veda chat">&#x2715;</button>' +
          '</div>' +
        '</div>' +
        '<div class="emi-messages" id="emiMsgs" role="log" aria-live="polite" aria-label="Chat messages"></div>' +
        '<div class="emi-input-section">' +
          '<div class="emi-input-wrap">' +
            '<input class="emi-input" id="emiIn" type="text" placeholder="Ask ' + aditiName() + ' anything…" aria-label="Message to assistant" autocomplete="off" maxlength="200"/>' +
            '<button type="button" class="emi-send-btn" id="emiSend" aria-label="Send message">' +
              '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>' +
            '</button>' +
          '</div>' +
          '<div class="emi-input-hint">Enter to send &nbsp;&middot;&nbsp; Ctrl+Shift+V to toggle</div>' +
        '</div>' +
      '</div>' +
      /* robot button */
      '<button type="button" id="emiRobot" aria-label="Open Veda AI Assistant" title="Veda — eMudhra AI Assistant (Ctrl+Shift+V)">' +
        ROBOT_SVG +
      '</button>';
    document.body.appendChild(w);
  }

  /* ── State ───────────────────────────────────────────────────────── */
  var isOpen        = false;
  var busy          = false;
  var isLoggingOut  = false; /* prevent pagehide firing during logout */

  /* ── Mood / expression system ────────────────────────────────────── */
  var MOODS = ['veda-happy', 'veda-thinking', 'veda-excited', 'veda-sad', 'veda-cry', 'veda-wink', 'veda-jump', 'veda-analyse', 'veda-success', 'veda-celebrate'];

  function setMood(mood) {
    var robot = el('emiRobot');
    var svg   = el('vedaRobotSvg');
    for (var i = 0; i < MOODS.length; i++) {
      if (robot) robot.classList.remove(MOODS[i]);
      if (svg)   svg.classList.remove(MOODS[i]);
    }
    if (mood) {
      if (robot) robot.classList.add(mood);
      if (svg)   svg.classList.add(mood);
    }
  }

  /* ── Sparkle burst ───────────────────────────────────────────────── */
  function burstSparkles() {
    if (!cfg().animations) return;
    var robot = el('emiRobot');
    if (!robot) return;
    var rect = robot.getBoundingClientRect();
    var cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    var colors = ['#2563EB', '#1D4ED8', '#F59E0B', '#3B82F6', '#FCD34D', '#60A5FA', '#93C5FD', '#D4AF37'];
    for (var i = 0; i < 12; i++) {
      (function (i) {
        var spark = document.createElement('div');
        spark.className = 'veda-spark' + (i % 3 === 0 ? ' star' : '');
        var angle = (i / 12) * 360, dist = 36 + (i % 4) * 12;
        var sx = Math.cos(angle * Math.PI / 180) * dist;
        var sy = Math.sin(angle * Math.PI / 180) * dist;
        var size = (i % 3 === 0) ? '10px' : '7px';
        spark.style.cssText =
          'left:' + (cx - 4) + 'px;top:' + (cy - 4) + 'px;' +
          'width:' + size + ';height:' + size + ';' +
          'background:' + colors[i % colors.length] + ';' +
          '--sx:' + sx + 'px;--sy:' + sy + 'px;' +
          'animation-delay:' + (i * 38) + 'ms;';
        document.body.appendChild(spark);
        setTimeout(function () { try { spark.remove(); } catch (e) {} }, 1100);
      })(i);
    }
  }

  /* ── Float emoji (idle charm) ────────────────────────────────────── */
  function floatEmoji(emoji) {
    if (!cfg().animations) return;
    var robot = el('emiRobot');
    if (!robot) return;
    var div = document.createElement('div');
    div.className = 'veda-float-emoji';
    div.textContent = emoji;
    div.style.left = (16 + Math.round(Math.random() * 52)) + '%';
    robot.style.position = 'relative';
    robot.appendChild(div);
    setTimeout(function () { try { div.remove(); } catch (e) {} }, 2200);
  }

  /* ── Wink (idle behavior) ────────────────────────────────────────── */
  function doWink() {
    var svg = el('vedaRobotSvg');
    if (!svg || busy) return;
    var hasMood = MOODS.filter(function (m) { return m !== 'veda-wink'; }).some(function (m) { return svg.classList.contains(m); });
    if (hasMood) return;
    svg.classList.add('veda-wink');
    setTimeout(function () { svg.classList.remove('veda-wink'); }, 1100);
  }

  /* ── Idle behaviors ──────────────────────────────────────────────── */
  function scheduleIdleBehaviors() {
    var IDLE_EMOJIS = ['✨', '💡', '💙', '🌟', '✅', '⭐', '💫', '🔵'];
    function next() {
      var delay = 9000 + Math.round(Math.random() * 8000);
      setTimeout(function () {
        if (!busy) {
          var r = Math.random();
          if      (r < 0.28) doWink();
          else if (r < 0.48 && !isOpen) floatEmoji(IDLE_EMOJIS[Math.floor(Math.random() * IDLE_EMOJIS.length)]);
        }
        next();
      }, delay);
    }
    next();
  }

  /* ── Message rendering ───────────────────────────────────────────── */
  function addMsg(text, from, chips, nav, cta) {
    var box = el('emiMsgs');
    if (!box) return;

    var d = document.createElement('div');
    d.className = 'emi-msg emi-from-' + from;

    var timeHtml = '<div class="emi-msg-time">' + getTimeStr() + '</div>';
    var bubbleHtml = '<div class="emi-msg-bubble">' + md(text) + '</div>' + timeHtml;
    var chipsHtml  = '';
    if (nav && cta) {
      chipsHtml += '<div class="emi-chips"><button type="button" class="emi-chip" data-href="' + esc(nav) + '">' + esc(cta) + '</button></div>';
    }
    if (chips && chips.length) {
      chipsHtml += '<div class="emi-chips">' + chips.map(function (c) {
        return '<button type="button" class="emi-chip">' + esc(c) + '</button>';
      }).join('') + '</div>';
    }

    if (from === 'bot') {
      d.innerHTML =
        '<div class="emi-msg-icon">' + AVATAR_SVG + '</div>' +
        '<div class="emi-msg-body">' + bubbleHtml + chipsHtml + '</div>';
    } else {
      d.innerHTML = '<div class="emi-msg-body">' + bubbleHtml + '</div>';
    }

    box.appendChild(d);
    box.scrollTop = box.scrollHeight;

    var navChips = d.querySelectorAll('.emi-chip[data-href]');
    for (var i = 0; i < navChips.length; i++) {
      (function (btn) {
        btn.addEventListener('click', function () { window.location.href = btn.getAttribute('data-href'); });
      })(navChips[i]);
    }
    var askChips = d.querySelectorAll('.emi-chip:not([data-href])');
    for (var j = 0; j < askChips.length; j++) {
      (function (btn) {
        btn.addEventListener('click', function () { handleInput(btn.textContent || btn.innerText); });
      })(askChips[j]);
    }
  }

  function showTyping() {
    var box = el('emiMsgs');
    if (!box) return;
    var d = document.createElement('div');
    d.id = 'emiTyping';
    d.className = 'emi-typing-row';
    d.innerHTML =
      '<div class="emi-msg-icon">' + AVATAR_SVG + '</div>' +
      '<div class="emi-msg-body">' +
        '<div class="emi-msg-bubble emi-typing"><span></span><span></span><span></span></div>' +
        '<div class="emi-thinking-label" id="emiThinkingLabel">' + aditiName() + ' is analysing…</div>' +
      '</div>';
    box.appendChild(d);
    box.scrollTop = box.scrollHeight;
  }
  function hideTyping() { var t = el('emiTyping'); if (t) t.remove(); }

  /* ── Input handling ──────────────────────────────────────────────── */
  function handleInput(text) {
    text = (text || '').trim();
    if (!text || busy) return;
    var inp = el('emiIn');
    if (inp) inp.value = '';
    addMsg(text, 'user', [], null, null);
    busy = true;
    setMood('veda-thinking');
    showTyping();
    setTimeout(function () {
      hideTyping();
      busy = false;
      var r = respond(text);
      addMsg(r.t || '', 'bot', r.c || [], r.nav || null, r.cta || null);
      setMood('veda-happy');
      burstSparkles();
      setTimeout(function () {
        var svg = el('vedaRobotSvg');
        if (svg && svg.classList.contains('veda-happy')) setMood('');
      }, 3600);
    }, 520 + Math.round(Math.random() * 340));
  }

  /* ── Panel open ──────────────────────────────────────────────────── */
  function openPanel() {
    var p = el('emiPanel');
    if (!p) return;
    isOpen = true;
    var g = el('emiGreeting');
    if (g) g.style.display = 'none';
    p.style.display = 'flex';
    setMood('veda-happy');
    setTimeout(function () {
      p.classList.add('emi-open');
      p.setAttribute('aria-hidden', 'false');
    }, 10);

    var box = el('emiMsgs');
    if (box && box.children.length === 0) {
      var s  = cfg();
      var pg = currPage();
      var u  = userName();
      var tipObj2 = PAGE_TIPS[pg.key];
      var tip = s.contextHints && tipObj2
        ? '\n\n💡 **Tip:** ' + (tipObj2.text || tipObj2)
        : '';
      var greeting = s.greetings
        ? getDynGreeting(u, pg.name) + tip + '\n\nHow can I help you today?'
        : 'Namaste 🙏 I am **' + aditiName() + '**, your Enterprise QA Intelligence Companion. How can I help?';
      addMsg(greeting, 'bot', getPageChips(), null, null);
    }

    var arm = el('emiArmRight');
    if (arm && cfg().animations) {
      arm.classList.add('emi-arm-wave');
      setTimeout(function () { arm.classList.remove('emi-arm-wave'); }, 1900);
    }

    setTimeout(function () {
      var svg = el('vedaRobotSvg');
      if (svg && svg.classList.contains('veda-happy')) setMood('');
    }, 4200);

    setTimeout(function () { var i = el('emiIn'); if (i) i.focus(); }, 300);
  }

  /* ── Panel close (instant, no goodbye message) ───────────────────── */
  function closePanel() {
    var p = el('emiPanel');
    if (!p) return;
    isOpen = false;
    p.classList.remove('emi-open');
    p.setAttribute('aria-hidden', 'true');
    setMood('');
    setTimeout(function () { if (!isOpen) p.style.display = 'none'; }, 240);
  }

  /* ── Close WITH happy bye message (X button + robot click-to-close) ─
   *  "Bye! Keep testing and happy coding!" — happy mood, wave, then close
   */
  function closeWithBye() {
    if (!isOpen) return;
    var box = el('emiMsgs');
    setMood('veda-happy');
    addMsg('👋 Bye! **Keep testing and happy coding!** 💻✨\n\nCome back anytime — I am always here! 🙏', 'bot', [], null, null);
    var arm = el('emiArmRight');
    if (arm && cfg().animations) {
      arm.classList.add('emi-arm-wave');
      setTimeout(function () { arm.classList.remove('emi-arm-wave'); }, 1700);
    }
    setTimeout(function () { closePanel(); }, 1900);
  }

  /* ── Cry + hide (when Veda is disabled in settings) ─────────────── */
  function showCryAndDisable() {
    if (!isOpen) openPanel();
    var box = el('emiMsgs');
    if (box) box.innerHTML = '';

    setMood('veda-cry');

    addMsg(
      '😢 Oh no! You are disabling me...\n\n**Bye, see you again!** 🥹\n\nWhenever you need me, just enable QA Bot in Settings.\n\nI will miss you! 💙',
      'bot', [], null, null
    );

    var arm = el('emiArmRight');
    if (arm && cfg().animations) {
      arm.classList.add('emi-arm-wave');
      setTimeout(function () { arm.classList.remove('emi-arm-wave'); }, 2400);
    }

    setTimeout(function () {
      closePanel();
      var w = el('emiWidget');
      if (w) w.style.display = 'none';
    }, 3200);
  }

  /* ── Goodbye before logout (sad mode — actual account logout) ─────── */
  function showGoodbye(afterMs, onDone) {
    var s = cfg();
    if (!s.greetings) { if (onDone) onDone(); return; }

    if (!isOpen) openPanel();
    var box = el('emiMsgs');
    if (box) box.innerHTML = '';

    setMood('veda-sad');
    isLoggingOut = true;

    var u = userName();
    addMsg(
      '👋 Alvida **' + u + '**!\n\nThank you for using eMudhra AutoFlow.\n\nMay your tests always pass! See you soon. 😊',
      'bot', [], null, null
    );

    var arm = el('emiArmRight');
    if (arm && s.animations) {
      arm.classList.add('emi-arm-wave');
      setTimeout(function () { arm.classList.remove('emi-arm-wave'); }, 2400);
    }

    if (onDone) {
      setTimeout(onDone, afterMs || 2600);
    }
  }

  /* ── Settings panel injection ────────────────────────────────────── */
  function injectSettings() {
    if (el('vedaSettingsBlock')) return;
    var body = document.querySelector('#settingsModal .modal-body');
    if (!body) return;
    var s = cfg();
    var sec = document.createElement('div');
    sec.id = 'vedaSettingsBlock';
    sec.className = 'emi-settings-section';
    sec.innerHTML =
      '<div class="emi-settings-header">' +
        '✨ Veda AI Assistant' +
        '<label class="emi-toggle" title="Enable / disable Veda" style="margin-left:auto">' +
          '<input type="checkbox" id="vedaMaster" ' + (s.enabled ? ' checked' : '') + '/>' +
          '<span class="emi-toggle-track"></span>' +
        '</label>' +
      '</div>' +
      '<div id="vedaSubCfg" class="emi-settings-grid" style="display:' + (s.enabled ? 'grid' : 'none') + '">' +
        '<label><input type="checkbox" id="vedaCfgGreet"' + (s.greetings    ? ' checked' : '') + '/> Welcome greetings</label>' +
        '<label><input type="checkbox" id="vedaCfgCtx"'   + (s.contextHints ? ' checked' : '') + '/> Context hints</label>'     +
        '<label><input type="checkbox" id="vedaCfgNav"'   + (s.navAssist    ? ' checked' : '') + '/> Navigation assist</label>' +
        '<label><input type="checkbox" id="vedaCfgAnim"'  + (s.animations   ? ' checked' : '') + '/> Animations</label>'        +
      '</div>';
    body.appendChild(sec);

    el('vedaMaster').addEventListener('change', function () {
      var ns = cfg();
      ns.enabled = this.checked;
      saveCfg(ns);
      el('vedaSubCfg').style.display = this.checked ? 'grid' : 'none';
      if (!this.checked) {
        /* Cry and hide when disabled */
        showCryAndDisable();
      } else {
        /* Re-enable: show widget happily */
        var w = el('emiWidget');
        if (w) w.style.display = 'flex';
        setMood('veda-happy');
        burstSparkles();
        setTimeout(function () { setMood(''); }, 2000);
      }
    });

    var pairs = [
      ['vedaCfgGreet', 'greetings'],
      ['vedaCfgCtx',   'contextHints'],
      ['vedaCfgNav',   'navAssist'],
      ['vedaCfgAnim',  'animations'],
    ];
    for (var i = 0; i < pairs.length; i++) {
      (function (p) {
        var inp = el(p[0]);
        if (inp) inp.addEventListener('change', function () { var ns = cfg(); ns[p[1]] = this.checked; saveCfg(ns); });
      })(pairs[i]);
    }
  }

  /* ── Proactive page tip (once per day, 35s after load) ──────────── */
  function scheduleProactive() {
    if (!cfg().contextHints) return;
    setTimeout(function () {
      if (isOpen) return;
      var s = cfg();
      if (!s.contextHints || !s.enabled) return;
      if (localStorage.getItem(PROACTIVE_KEY) === today()) return;
      localStorage.setItem(PROACTIVE_KEY, today());
      var g = el('emiGreeting'), gt = el('emiGText');
      if (!g || !gt) return;
      var tipObjP = PAGE_TIPS[currPage().key] || PAGE_TIPS.unknown;
      var tipText = tipObjP.text || tipObjP;
      gt.innerHTML = (tipObjP.icon || '💡') + ' <strong>Tip:</strong> ' + tipText.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      g.style.display = 'block';
      setTimeout(function () { if (g) g.style.display = 'none'; }, 12000);
    }, 35000);
  }

  /* ── Auto-greet on first daily visit ─────────────────────────────── */
  function autoGreetOnStart() {
    var s = cfg();
    if (!s.greetings) return;
    if (localStorage.getItem(GREETED_KEY) === today()) return;
    localStorage.setItem(GREETED_KEY, today());

    setTimeout(function () {
      setMood('veda-happy');
      var arm = el('emiArmRight');
      if (arm && s.animations) {
        arm.classList.add('emi-arm-wave');
        setTimeout(function () { arm.classList.remove('emi-arm-wave'); }, 2400);
      }
    }, 800);

    setTimeout(function () { openPanel(); }, 1600);
  }

  /* ── Avatar personalisation — reads veda_avatar_v1 and applies colors ── */
  var EMI_OUTFIT_COLORS = {
    Corporate:'#881337', AI:'#2563EB', QA:'#1E3A5F',
    Consultant:'#1F2937', Startup:'#6366F1', Traditional:'#E8630A', Festival:'#C026D3'
  };

  function applyAvatarToEmi() {
    var av;
    try { av = JSON.parse(localStorage.getItem('veda_avatar_v1') || 'null'); } catch(e) { av = null; }
    if (!av) return;

    var skin   = av.skin      || '#F7C09A';
    var hair   = av.hairColor || '#2D1B0E';
    var outfit = EMI_OUTFIT_COLORS[av.outfit] || '#881337';

    /* ── ROBOT_SVG (floating widget) ── */
    var svg = el('vedaRobotSvg');
    if (svg) {
      /* Skin */
      var skinFace = svg.querySelector('#vedaSkinFace');
      var skinNeck = svg.querySelector('#vedaSkinNeck');
      if (skinFace) skinFace.setAttribute('fill', skin);
      if (skinNeck) skinNeck.setAttribute('fill', skin);

      /* Arms (skin-coloured stroke + hand circles) */
      var armR = svg.querySelector('#emiArmRight');
      if (armR) {
        var rp = armR.querySelector('path');
        var rc = armR.querySelectorAll('circle');
        if (rp) rp.setAttribute('stroke', skin);
        if (rc[rc.length - 1]) rc[rc.length - 1].setAttribute('fill', skin);
      }
      var armL = svg.querySelector('#vedaArmL');
      if (armL) {
        var lp = armL.querySelector('path');
        var lc = armL.querySelector('circle');
        if (lp) lp.setAttribute('stroke', skin);
        if (lc) lc.setAttribute('fill', skin);
      }

      /* Hair back */
      var hairBack = svg.querySelector('#vedaHairBack');
      if (hairBack) hairBack.querySelectorAll('path').forEach(function(p) { p.setAttribute('fill', hair); });

      /* Hair front (crown + wisps) */
      var hairFront = svg.querySelector('#vedaHairFront');
      if (hairFront) hairFront.querySelectorAll('path').forEach(function(p) {
        if (p.getAttribute('fill') !== 'none') p.setAttribute('fill', hair);
        var s = p.getAttribute('stroke');
        if (s && s !== 'none') p.setAttribute('stroke', hair);
      });

      /* Eyebrows */
      var browL = svg.querySelector('#vedaBrowL');
      var browR = svg.querySelector('#vedaBrowR');
      if (browL) browL.setAttribute('stroke', hair);
      if (browR) browR.setAttribute('stroke', hair);

      /* Outfit colour — update all outfit-related elements */
      var blouse      = svg.querySelector('#vedaOutfitBlouse');
      var collar      = svg.querySelector('#vedaCollar');
      var lowerBody   = svg.querySelector('#vedaLowerBody');
      var sareeBorder = svg.querySelector('#vedaSareeBorder');
      var sareeDash   = svg.querySelector('#vedaSareeDash');
      var glow        = svg.querySelector('#vedaGlow');
      var dupatta     = svg.querySelector('#vedaDupatta');
      var goldDot1    = svg.querySelector('#vedaGoldDot1');
      var goldDot2    = svg.querySelector('#vedaGoldDot2');
      var goldDot3    = svg.querySelector('#vedaGoldDot3');

      var COLLAR_COLORS = {
        Corporate:'#1D4ED8', AI:'#2563EB', QA:'#1E3A5F', Consultant:'#374151',
        Startup:'#4F46E5', Traditional:'#FCD34D', Festival:'#F59E0B'
      };
      var isTraditional = av.outfit === 'Traditional' || av.outfit === 'Festival';
      var collarColor   = COLLAR_COLORS[av.outfit] || '#1D4ED8';

      if (blouse)      blouse.setAttribute('fill', outfit);
      if (collar)      collar.setAttribute('fill', collarColor);
      if (lowerBody)   lowerBody.setAttribute('fill', isTraditional ? outfit : '#EBF5FF');
      if (sareeBorder) sareeBorder.setAttribute('stroke', outfit);
      if (sareeDash)   sareeDash.setAttribute('stroke', isTraditional ? '#FDE68A' : '#93C5FD');
      if (glow)        glow.setAttribute('fill', outfit);

      /* Show gold dupatta drape and dots for Traditional/Festival */
      var gdOp = isTraditional ? '1' : '0';
      if (dupatta)  dupatta.setAttribute('opacity', gdOp);
      if (goldDot1) goldDot1.setAttribute('opacity', gdOp);
      if (goldDot2) goldDot2.setAttribute('opacity', gdOp);
      if (goldDot3) goldDot3.setAttribute('opacity', gdOp);

      /* Gender handling */
      var isMale = av.gender === 'male';
      var earrings = svg.querySelector('#vedaEarrings');
      var bindi    = svg.querySelector('#vedaBindi');
      if (earrings) earrings.style.display = isMale ? 'none' : '';
      if (bindi)    bindi.style.display    = isMale ? 'none' : '';
    }

    /* ── AVATAR_SVG (panel header icon) ── */
    var avBg   = document.getElementById('vedaAvatarBg');
    var avHairBack  = document.getElementById('vedaAvatarHairBack');
    var avHairFront = document.getElementById('vedaAvatarHairFront');
    var avSkin = document.getElementById('vedaAvatarSkinFace');
    if (avBg)        avBg.setAttribute('fill', outfit);
    if (avSkin)      avSkin.setAttribute('fill', skin);
    if (avHairFront) avHairFront.setAttribute('fill', hair);
    if (avHairBack)  avHairBack.querySelectorAll('ellipse').forEach(function(e) { e.setAttribute('fill', hair); });

    /* Update all name references throughout the panel */
    var n = av.displayName || av.name || 'Aditi';
    var nameEl   = document.querySelector('.emi-panel-name');
    var inputEl  = el('emiIn');
    var thinkEl  = el('emiThinkingLabel');
    if (nameEl)  nameEl.textContent    = n + ' ✨';
    if (inputEl) inputEl.placeholder   = 'Ask ' + n + ' anything…';
    if (thinkEl) thinkEl.textContent   = n + ' is analysing…';
  }

  /* ── Init ────────────────────────────────────────────────────────── */
  function init() {
    inject();

    /* Apply saved avatar personalisation immediately after DOM is in place */
    applyAvatarToEmi();
    document.addEventListener('vedaSettingsChanged', applyAvatarToEmi);

    if (!cfg().enabled) {
      var w = el('emiWidget');
      if (w) w.style.display = 'none';
      document.addEventListener('click', function (e) {
        if (e.target.closest && e.target.closest('#settingsBtn, [data-action="settings"], [onclick*="settingsModal"]')) {
          setTimeout(injectSettings, 140);
        }
      });
      return;
    }

    /* Robot click — JUMP on open, happy bye on close */
    el('emiRobot').addEventListener('click', function () {
      if (!isOpen) {
        /* Excited jump before opening */
        var robot = el('emiRobot');
        var svg   = el('vedaRobotSvg');
        if (robot) robot.classList.add('veda-jump');
        if (svg)   svg.classList.add('veda-happy'); /* happy face while jumping */
        burstSparkles();
        setTimeout(function () {
          if (robot) robot.classList.remove('veda-jump');
          openPanel();
        }, 620);
      } else {
        closeWithBye();
      }
    });

    /* Panel close button → happy bye */
    el('emiClose').addEventListener('click', closeWithBye);

    /* Greeting bubble */
    el('emiGClose').addEventListener('click', function (e) {
      e.stopPropagation();
      var g = el('emiGreeting');
      if (g) g.style.display = 'none';
    });
    el('emiGreeting').addEventListener('click', openPanel);

    /* Clear chat button */
    el('emiClearBtn').addEventListener('click', function () {
      var box = el('emiMsgs');
      if (box) box.innerHTML = '';
      setMood('veda-happy');
      addMsg('Chat cleared! 🧹 How can I help you test today?', 'bot', getPageChips(), null, null);
      setTimeout(function () {
        var svg = el('vedaRobotSvg');
        if (svg && svg.classList.contains('veda-happy')) setMood('');
      }, 3000);
    });

    /* Chat send */
    el('emiSend').addEventListener('click', function () { handleInput(el('emiIn').value); });
    el('emiIn').addEventListener('keydown', function (e) { if (e.key === 'Enter') handleInput(el('emiIn').value); });

    /* Keyboard shortcut */
    document.addEventListener('keydown', function (e) {
      if (e.ctrlKey && e.shiftKey && e.key === 'V') { e.preventDefault(); isOpen ? closeWithBye() : openPanel(); }
      if (e.key === 'Escape' && isOpen) closeWithBye();
    });

    /* ── Page close — happy bye when browser tab/window closes ───────
     * Uses pagehide (reliable) + beforeunload (tries to flash panel).
     * isLoggingOut flag prevents double-bye during logout.
     */
    var closingByeShown = false;
    function showClosingBye() {
      if (closingByeShown || isLoggingOut) return;
      closingByeShown = true;
      if (!isOpen) openPanel();
      var box = el('emiMsgs');
      if (box) box.innerHTML = '';
      setMood('veda-happy');
      addMsg('👋 Bye! **Keep testing and happy coding!** 💻✨', 'bot', [], null, null);
      var arm = el('emiArmRight');
      if (arm) { arm.classList.add('emi-arm-wave'); }
    }
    window.addEventListener('pagehide', showClosingBye);
    window.addEventListener('beforeunload', showClosingBye);

    /* ── Logout intercept ─────────────────────────────────────────────
     * vedaByeDone flag: first click → goodbye + set flag → btn.click()
     * re-fires → our listener returns, event reaches shared.js normally.
     */
    var vedaByeDone = false;

    document.addEventListener('click', function (e) {
      var btn = e.target && typeof e.target.closest === 'function'
        ? e.target.closest('[data-action="logout"], #logoutBtn')
        : null;
      if (!btn && e.target && /^log\s*out$/i.test((e.target.textContent || '').trim())) btn = e.target;
      if (!btn) return;

      if (vedaByeDone) { vedaByeDone = false; return; }

      var s = cfg();
      if (!s.enabled || !s.greetings) return;

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      // If shared.js registered a confirmation handler, delegate to it
      if (typeof window.showLogoutConfirm === 'function') {
        window.showLogoutConfirm();
        return;
      }

      // Fallback: panel goodbye → re-click
      var capturedBtn = btn;
      showGoodbye(2400, function () {
        closePanel();
        vedaByeDone = true;
        capturedBtn.click();
        setTimeout(function () { vedaByeDone = false; isLoggingOut = false; }, 600);
      });
    }, true);

    /* Settings modal integration */
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (t.closest && t.closest('#settingsBtn, [data-action="settings"], [onclick*="settingsModal"]')) {
        setTimeout(injectSettings, 140);
      }
    });

    /* ── Auto module guide ───────────────────────────────────────────── */
    function showPageGuideBubble(pageInfo, tipObj) {
      if (el('vedaGuide')) return;
      var icon    = tipObj.icon || '✨';
      var tipText = (tipObj.text || tipObj).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

      var bubble = document.createElement('div');
      bubble.id = 'vedaGuide';
      bubble.style.cssText =
        'position:fixed;bottom:128px;right:22px;z-index:9997;width:288px;' +
        'background:linear-gradient(148deg,#0a0118 0%,#160626 55%,#0a0118 100%);' +
        'border:1.5px solid rgba(212,175,55,.45);border-radius:20px;' +
        'padding:15px 15px 13px;' +
        'box-shadow:0 24px 70px rgba(0,0,0,.75),0 0 50px rgba(212,175,55,.08);' +
        'transform:scale(0.08) rotate(10deg);opacity:0;transform-origin:bottom right;' +
        'transition:transform .55s cubic-bezier(.34,1.56,.64,1),opacity .3s ease;';

      bubble.innerHTML = [
        '<style>',
        '@keyframes vgBubPulse{0%,100%{box-shadow:0 0 0 0 rgba(212,175,55,.45)}',
        '  60%{box-shadow:0 0 0 8px rgba(212,175,55,0)}}',
        '@keyframes vgBubFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}',
        '@keyframes vgBubShine{0%,100%{opacity:.6}50%{opacity:1}}',
        '@keyframes vgBubBar{from{width:100%}to{width:0%}}',
        '@keyframes vgBubSpark{0%{opacity:0;transform:scale(0) translate(-50%,-50%)}',
        '  50%{opacity:1;transform:scale(1.2) translate(-50%,-50%)}',
        '  100%{opacity:0;transform:scale(.3) translate(-50%,-50%)}}',
        '#vedaGuide.vg-active{animation:vgBubPulse 2.6s ease-in-out .4s infinite}',
        '#vgBubAv{animation:vgBubFloat 3.2s ease-in-out infinite}',
        '#vgBubIcon{animation:vgBubShine 1.8s ease-in-out infinite}',
        '.vg-spark{position:absolute;pointer-events:none;font-size:.95rem;',
        '  animation:vgBubSpark .9s ease-out forwards}',
        '</style>',

        /* dismiss btn */
        '<button id="vgBubDismiss" style="position:absolute;top:9px;right:9px;',
          'background:rgba(255,255,255,.07);border:none;color:rgba(255,255,255,.45);',
          'width:21px;height:21px;border-radius:50%;cursor:pointer;font-size:11px;',
          'line-height:1;transition:background .2s,color .2s">&times;</button>',

        /* header row */
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">',
        '  <div id="vgBubAv" style="width:44px;height:44px;flex-shrink:0;border-radius:50%;',
        '      background:linear-gradient(135deg,#7B1535,#3A0E20);',
        '      border:2px solid rgba(212,175,55,.55);',
        '      display:flex;align-items:center;justify-content:center;position:relative;',
        '      box-shadow:0 0 20px rgba(212,175,55,.2)">',
        '    <!-- excited wide-eye Veda -->',
        '    <svg width="30" height="30" viewBox="0 0 58 58" fill="none">',
        '      <circle cx="29" cy="27" r="17" fill="#C07868"/>',
        '      <ellipse cx="22.5" cy="24.5" rx="4.2" ry="5.5" fill="#1a0820"/>',
        '      <ellipse cx="35.5" cy="24.5" rx="4.2" ry="5.5" fill="#1a0820"/>',
        '      <circle cx="23.5" cy="22.5" r="1.6" fill="white"/>',
        '      <circle cx="36.5" cy="22.5" r="1.6" fill="white"/>',
        '      <circle cx="24.5" cy="21.2" r=".7" fill="white" opacity=".8"/>',
        '      <circle cx="37.5" cy="21.2" r=".7" fill="white" opacity=".8"/>',
        '      <path d="M21.5 32.5 Q29 39 36.5 32.5" stroke="#D4AF37" stroke-width="2.2" stroke-linecap="round" fill="none"/>',
        '      <circle cx="29" cy="15.5" r="2.2" fill="#D4AF37" opacity=".9"/>',
        '      <path d="M12 25 Q12 10 29 10 Q46 10 46 25 Q42 12 29 12 Q16 12 12 25Z" fill="#1a0820"/>',
        '      <path d="M12 27 Q10 33 13.5 36" stroke="#D4AF37" stroke-width="2" stroke-linecap="round"/>',
        '      <circle cx="13" cy="36" r="3.2" fill="#D4AF37"/>',
        '      <path d="M46 27 Q48 33 44.5 36" stroke="#D4AF37" stroke-width="2" stroke-linecap="round"/>',
        '      <circle cx="45" cy="36" r="3.2" fill="#D4AF37"/>',
        '      <path d="M12 27 Q29 18 46 27" stroke="#D4AF37" stroke-width="1.6" fill="none"/>',
        '    </svg>',
        '    <div id="vgBubIcon" style="position:absolute;top:-7px;right:-6px;font-size:1rem">' + icon + '</div>',
        '  </div>',
        '  <div>',
        '    <div style="font-size:.58rem;letter-spacing:.14em;color:rgba(212,175,55,.6);',
        '        font-weight:700;text-transform:uppercase">VEDA GUIDE</div>',
        '    <div style="font-size:.76rem;color:rgba(255,255,255,.75);font-weight:600;margin-top:1px">',
        '      ' + pageInfo.name,
        '    </div>',
        '  </div>',
        '</div>',

        /* tip text */
        '<div style="font-size:.78rem;color:rgba(255,255,255,.72);line-height:1.58;',
        '    border-top:1px solid rgba(255,255,255,.06);padding-top:9px">',
        '  ' + tipText,
        '</div>',

        /* countdown bar */
        '<div style="margin-top:10px;height:2px;background:rgba(255,255,255,.06);border-radius:2px;overflow:hidden">',
        '  <div id="vgBubBar" style="height:100%;width:100%;',
        '      background:linear-gradient(90deg,#7B1535,#D4AF37,#F5D878);',
        '      border-radius:2px;transition:width 7s linear"></div>',
        '</div>',
      ].join('');

      document.body.appendChild(bubble);

      /* entrance */
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          bubble.style.transform = 'scale(1) rotate(0deg)';
          bubble.style.opacity   = '1';
          setTimeout(function () {
            bubble.classList.add('vg-active');
            var bar = document.getElementById('vgBubBar');
            if (bar) bar.style.width = '0%';
            /* burst sparks */
            var sparks = ['✨','⭐','💫','🌟'];
            for (var si = 0; si < 5; si++) {
              (function (si) {
                var sp = document.createElement('div');
                sp.className = 'vg-spark';
                var ang = (si / 5) * 360;
                var d   = 50 + Math.random() * 30;
                sp.style.left = 'calc(50% + ' + (Math.cos(ang * Math.PI / 180) * d) + 'px)';
                sp.style.top  = 'calc(10px + ' + (Math.sin(ang * Math.PI / 180) * d) + 'px)';
                sp.style.animationDelay = (si * 0.1) + 's';
                sp.textContent = sparks[si % sparks.length];
                bubble.appendChild(sp);
                setTimeout(function () { if (sp.parentNode) sp.remove(); }, 1200);
              })(si);
            }
          }, 100);
        });
      });

      function dismissBubble() {
        clearTimeout(autoTimer);
        bubble.style.transition =
          'transform .38s cubic-bezier(.16,1,.3,1),opacity .28s ease';
        bubble.style.transform = 'scale(0.3) rotate(-8deg)';
        bubble.style.opacity   = '0';
        setTimeout(function () { if (bubble.parentNode) bubble.remove(); }, 400);
      }

      var autoTimer = setTimeout(dismissBubble, 7500);

      var dismissBtn = document.getElementById('vgBubDismiss');
      if (dismissBtn) {
        dismissBtn.addEventListener('mouseover', function () {
          this.style.background = 'rgba(255,255,255,.15)';
          this.style.color      = 'white';
        });
        dismissBtn.addEventListener('mouseout', function () {
          this.style.background = 'rgba(255,255,255,.07)';
          this.style.color      = 'rgba(255,255,255,.45)';
        });
        dismissBtn.addEventListener('click', dismissBubble);
      }
    }

    function autoGuideModule() {
      var s = cfg();
      if (!s.enabled || !s.contextHints) return;

      var pg      = currPage();
      var tipObj  = PAGE_TIPS[pg.key];
      if (!tipObj || pg.key === 'unknown') return;

      var GUIDE_KEY = 'veda_guide_shown_v2';
      try {
        var shown = JSON.parse(localStorage.getItem(GUIDE_KEY) || '{}');
        if (shown[pg.key] === today()) return;
      } catch (e) { return; }

      setTimeout(function () {
        if (el('vedaGuide')) return;
        showPageGuideBubble(pg, tipObj);
        /* Mark shown */
        try {
          var shown2 = JSON.parse(localStorage.getItem(GUIDE_KEY) || '{}');
          shown2[pg.key] = today();
          localStorage.setItem(GUIDE_KEY, JSON.stringify(shown2));
        } catch (e) {}
      }, 1800);
    }

    /* Boot */
    autoGreetOnStart();
    autoGuideModule();
    scheduleProactive();
    scheduleIdleBehaviors();
    setupSmartReactions();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* Public API */
  window.Veda = {
    open:       openPanel,
    close:      closePanel,
    closeBye:   closeWithBye,
    goodbye:    showGoodbye,
    setMood:    setMood,
    sparkle:    burstSparkles,
    getConfig:  cfg,
    saveConfig: saveCfg,
  };
  window.EmiAssistant = window.Veda;

})();
