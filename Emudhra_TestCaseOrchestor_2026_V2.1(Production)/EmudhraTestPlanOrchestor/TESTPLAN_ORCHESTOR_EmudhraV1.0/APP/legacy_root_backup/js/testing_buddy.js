/**
 * Testing Buddy AI — Intelligent QA Companion v2
 * Features: avatar system, localStorage persistence, project knowledge RAG,
 *           streaming AI responses, window controls, settings modal, emotional reactions
 */

/* ─────────────────────────────────────────────────────────────────────────────
   CONSTANTS
   ───────────────────────────────────────────────────────────────────────────── */
const AVATARS = {
  qabot:  { emoji: '🤖', label: 'QA Bot' },
  robot:  { emoji: '🤖', label: 'Robot' },
  panda:  { emoji: '🐼', label: 'Panda' },
  cat:    { emoji: '🐱', label: 'Cat' },
  fox:    { emoji: '🦊', label: 'Fox' },
  owl:    { emoji: '🦉', label: 'Owl' },
  bunny:  { emoji: '🐰', label: 'Bunny' }
};

const QABOT_WELCOME_SVG = `<svg viewBox="0 0 380 305" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:280px;height:225px">
  <!-- Cape (behind body) -->
  <path d="M62 145 Q40 178 44 245 Q58 268 110 274 Q162 268 176 245 Q180 178 158 145Z" fill="#3b82f6" opacity="0.85"/>
  <circle cx="76" cy="205" r="2.5" fill="white" opacity="0.4"/>
  <circle cx="152" cy="218" r="2" fill="white" opacity="0.3"/>
  <circle cx="100" cy="245" r="1.5" fill="white" opacity="0.35"/>
  <circle cx="140" cy="192" r="2" fill="white" opacity="0.4"/>
  <path d="M80 228 L82 222 L84 228 L90 230 L84 232 L82 238 L80 232 L74 230Z" fill="white" opacity="0.35"/>
  <!-- Legs -->
  <rect x="85" y="260" width="20" height="38" rx="7" fill="#1e293b"/>
  <rect x="115" y="260" width="20" height="38" rx="7" fill="#1e293b"/>
  <!-- Shoes -->
  <ellipse cx="95" cy="301" rx="18" ry="8" fill="#f8fafc"/>
  <ellipse cx="125" cy="301" rx="18" ry="8" fill="#f8fafc"/>
  <path d="M77 301 Q95 293 113 301" stroke="#3b82f6" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path d="M107 301 Q125 293 143 301" stroke="#3b82f6" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <!-- Hoodie body -->
  <path d="M66 148 Q60 200 64 260 Q88 276 110 276 Q132 276 156 260 Q160 200 154 148Z" fill="white"/>
  <text x="110" y="194" font-size="20" font-weight="900" fill="#3b82f6" text-anchor="middle" font-family="Arial,sans-serif">QA</text>
  <text x="110" y="211" font-size="12" font-weight="700" fill="#93c5fd" text-anchor="middle" font-family="Arial,sans-serif">BOT</text>
  <!-- Pocket -->
  <rect x="90" y="220" width="40" height="26" rx="8" fill="#eff6ff"/>
  <circle cx="110" cy="232" r="9" fill="#3b82f6" opacity="0.18"/>
  <!-- Drawstring -->
  <circle cx="102" cy="160" r="4" fill="#3b82f6"/>
  <circle cx="118" cy="160" r="4" fill="#3b82f6"/>
  <path d="M102 164 Q110 170 118 164" stroke="#3b82f6" stroke-width="1.5" fill="none"/>
  <!-- Left arm (holding clipboard) -->
  <path d="M66 158 Q48 175 42 205" stroke="white" stroke-width="22" stroke-linecap="round"/>
  <!-- Clipboard -->
  <rect x="20" y="198" width="38" height="50" rx="5" fill="#1e293b"/>
  <rect x="31" y="193" width="16" height="9" rx="3.5" fill="#334155"/>
  <rect x="24" y="205" width="30" height="36" rx="3" fill="#0f2340"/>
  <text x="39" y="221" font-size="9" font-weight="900" fill="#60a5fa" text-anchor="middle" font-family="Arial,sans-serif">QA</text>
  <path d="M27 232 L33 239 L51 222" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Right arm (waving) -->
  <path d="M154 158 Q172 148 182 125" stroke="white" stroke-width="22" stroke-linecap="round"/>
  <!-- Hand -->
  <circle cx="185" cy="116" r="14" fill="#fcd9b5"/>
  <ellipse cx="178" cy="103" rx="4.5" ry="9" fill="#fcd9b5" transform="rotate(-25 178 103)"/>
  <ellipse cx="186" cy="100" rx="4.5" ry="9" fill="#fcd9b5" transform="rotate(-8 186 100)"/>
  <ellipse cx="194" cy="104" rx="4" ry="8" fill="#fcd9b5" transform="rotate(12 194 104)"/>
  <!-- Antenna -->
  <line x1="110" y1="18" x2="110" y2="40" stroke="#9ca3af" stroke-width="4" stroke-linecap="round"/>
  <circle cx="110" cy="15" r="9" fill="#3b82f6"/>
  <circle cx="110" cy="15" r="4.5" fill="#bfdbfe"/>
  <!-- Helmet dome -->
  <path d="M50 98 Q50 44 110 44 Q170 44 170 98 Q170 132 150 142 Q110 152 70 142 Q50 132 50 98Z" fill="white" stroke="#e2e8f0" stroke-width="1.5"/>
  <!-- Side rings -->
  <circle cx="51" cy="100" r="13" fill="none" stroke="#3b82f6" stroke-width="3.5"/>
  <circle cx="51" cy="100" r="6" fill="#3b82f6" opacity="0.18"/>
  <circle cx="169" cy="100" r="13" fill="none" stroke="#3b82f6" stroke-width="3.5"/>
  <circle cx="169" cy="100" r="6" fill="#3b82f6" opacity="0.18"/>
  <!-- Black visor -->
  <rect x="66" y="53" width="88" height="48" rx="13" fill="#0f172a"/>
  <!-- Blue eyes on visor -->
  <circle cx="90" cy="74" r="14" fill="#1d4ed8"/>
  <circle cx="130" cy="74" r="14" fill="#1d4ed8"/>
  <circle cx="90" cy="74" r="9" fill="#3b82f6"/>
  <circle cx="130" cy="74" r="9" fill="#3b82f6"/>
  <circle cx="93.5" cy="69" r="3.5" fill="#bfdbfe"/>
  <circle cx="133.5" cy="69" r="3.5" fill="#bfdbfe"/>
  <!-- Visor smile -->
  <path d="M87 92 Q110 101 133 92" stroke="#60a5fa" stroke-width="3" fill="none" stroke-linecap="round"/>
  <!-- Human face -->
  <ellipse cx="110" cy="130" rx="40" ry="33" fill="#fcd9b5"/>
  <!-- Hair -->
  <path d="M70 118 Q74 108 88 112 Q110 107 132 112 Q146 108 150 118" fill="#2c1a0e"/>
  <path d="M70 120 Q64 132 70 146" fill="#2c1a0e"/>
  <path d="M150 120 Q156 132 150 146" fill="#2c1a0e"/>
  <path d="M76 115 Q82 107 92 114" fill="#2c1a0e"/>
  <path d="M128 114 Q138 107 144 115" fill="#2c1a0e"/>
  <!-- Anime eyes -->
  <ellipse cx="95" cy="129" rx="11" ry="13" fill="#1a1005"/>
  <ellipse cx="125" cy="129" rx="11" ry="13" fill="#1a1005"/>
  <circle cx="95" cy="128" r="7.5" fill="#8B5030"/>
  <circle cx="125" cy="128" r="7.5" fill="#8B5030"/>
  <circle cx="99" cy="123" r="3.5" fill="white"/>
  <circle cx="129" cy="123" r="3.5" fill="white"/>
  <!-- Nose -->
  <path d="M108 137 Q110 140 112 137" stroke="#b07050" stroke-width="2" fill="none"/>
  <!-- Smile -->
  <path d="M99 146 Q110 155 121 146" stroke="#a05030" stroke-width="3" fill="none" stroke-linecap="round"/>
  <!-- Blush -->
  <ellipse cx="76" cy="133" rx="13" ry="8" fill="#ffb3a7" opacity="0.45"/>
  <ellipse cx="144" cy="133" rx="13" ry="8" fill="#ffb3a7" opacity="0.45"/>
  <!-- Speech bubble -->
  <path d="M228 32 Q228 16 242 16 L366 16 Q380 16 380 32 L380 100 Q380 116 366 116 L272 116 L255 130 L262 116 L242 116 Q228 116 228 100Z" fill="white" stroke="#e2e8f0" stroke-width="2"/>
  <text x="304" y="48" font-size="16" font-weight="800" fill="#3b82f6" text-anchor="middle" font-family="Arial,sans-serif">Hello!</text>
  <text x="304" y="68" font-size="13" font-weight="600" fill="#475569" text-anchor="middle" font-family="Arial,sans-serif">I'm your</text>
  <text x="304" y="86" font-size="13" font-weight="700" fill="#3b82f6" text-anchor="middle" font-family="Arial,sans-serif">QA assistant</text>
  <text x="304" y="108" font-size="15" fill="#3b82f6" text-anchor="middle" font-family="Arial,sans-serif">&#9829;</text>
</svg>`;

const PERSONALITIES = {
  friendly:     { style: 'Be warm, encouraging, supportive, and use light humor occasionally.' },
  professional: { style: 'Be concise, precise, and professional. Focus on accuracy and structure.' },
  mentor:       { style: 'Be educational. Explain concepts clearly, teach best practices, ask thought-provoking follow-up questions.' },
  funny:        { style: 'Be playful. Use bug-related humor occasionally while staying genuinely helpful.' },
  cute:         { style: 'Be adorable and very enthusiastic. Use cute emojis liberally.' },
  expert:       { style: 'Be highly technical. Use industry terminology (IEEE 829, ISO 29119). Provide deep architectural-level insights.' }
};

const COMM_STYLES = {
  balanced:  'Mix narrative explanations with structured bullet points.',
  concise:   'Always use bullet points. Keep answers short and direct. No long paragraphs.',
  detailed:  'Provide comprehensive explanations. Cover edge cases and alternatives.',
  socratic:  'Guide the user with questions to reach the answer themselves, then confirm.'
};

const VOICE_TONES = {
  warm:      'Use warm, friendly language. Start with an encouraging opener.',
  neutral:   'Use neutral, objective language. No emotional qualifiers.',
  formal:    'Use formal language. No contractions. Professional register.',
  energetic: 'Use energetic, enthusiastic language! High-energy and motivating!',
  calm:      'Use calm, measured language. Methodical and reassuring.'
};

const LANG_INSTRUCTIONS = {
  en: '',
  hi: 'LANGUAGE REQUIREMENT: You MUST respond entirely in Hindi (हिन्दी). All headings, explanations, bullet points, tables, and conclusions must be written in Hindi. Technical terms (like "test case", "API", "Playwright") may keep their English names, but all surrounding text must be in Hindi.',
  bn: 'LANGUAGE REQUIREMENT: You MUST respond entirely in Bengali (বাংলা). All headings, explanations, bullet points, tables, and conclusions must be written in Bengali. Technical terms may keep their English names, but all surrounding text must be in Bengali.',
  mr: 'LANGUAGE REQUIREMENT: You MUST respond entirely in Marathi (मराठी). All headings, explanations, bullet points, tables, and conclusions must be written in Marathi. Technical terms may keep their English names, but all surrounding text must be in Marathi.',
  te: 'LANGUAGE REQUIREMENT: You MUST respond entirely in Telugu (తెలుగు). All headings, explanations, bullet points, tables, and conclusions must be written in Telugu. Technical terms may keep their English names, but all surrounding text must be in Telugu.',
  ta: 'LANGUAGE REQUIREMENT: You MUST respond entirely in Tamil (தமிழ்). All headings, explanations, bullet points, tables, and conclusions must be written in Tamil. Technical terms may keep their English names, but all surrounding text must be in Tamil.',
  gu: 'LANGUAGE REQUIREMENT: You MUST respond entirely in Gujarati (ગુજરાતી). All headings, explanations, bullet points, tables, and conclusions must be written in Gujarati. Technical terms may keep their English names, but all surrounding text must be in Gujarati.',
  ur: 'LANGUAGE REQUIREMENT: You MUST respond entirely in Urdu (اردو). All headings, explanations, bullet points, tables, and conclusions must be written in Urdu. Technical terms may keep their English names, but all surrounding text must be in Urdu.',
  kn: 'LANGUAGE REQUIREMENT: You MUST respond entirely in Kannada (ಕನ್ನಡ). All headings, explanations, bullet points, tables, and conclusions must be written in Kannada. Technical terms may keep their English names, but all surrounding text must be in Kannada.',
  od: 'LANGUAGE REQUIREMENT: You MUST respond entirely in Odia (ଓଡ଼ିଆ). All headings, explanations, bullet points, tables, and conclusions must be written in Odia. Technical terms may keep their English names, but all surrounding text must be in Odia.',
  ml: 'LANGUAGE REQUIREMENT: You MUST respond entirely in Malayalam (മലയാളം). All headings, explanations, bullet points, tables, and conclusions must be written in Malayalam. Technical terms may keep their English names, but all surrounding text must be in Malayalam.',
};

/* ── Extended personality system (from avatar settings) ── */
const PERSONALITY_EXTENDED = {
  professional:    { style: 'Be concise, precise, and enterprise-focused. Use formal but clear language. Lead with key points.', icon: '💼' },
  friendly:        { style: 'Be warm, encouraging, and conversational. Use relatable analogies. Celebrate small wins.', icon: '😊' },
  mentor:          { style: 'Guide step-by-step. Explain reasoning behind decisions. Ask clarifying questions.', icon: '🎓' },
  qa_expert:       { style: 'Be highly technical and testing-focused. Use industry terms (IEEE 829, ISO 29119). Provide detailed edge-case analysis.', icon: '🔬' },
  product_analyst: { style: 'Focus on business value and user impact. Frame everything in terms of requirements and acceptance criteria.', icon: '📊' },
  automation_arch: { style: 'Always recommend automation-first approaches. Provide code examples. Highlight ROI of automation.', icon: '🤖' },
  cheerful:        { style: 'Use high energy, enthusiasm, and emojis liberally. Make testing fun and engaging!', icon: '🎉' },
  executive:       { style: 'Be ultra-concise. Use bullet points. Lead with the bottom line. Avoid jargon.', icon: '⚡' },
};

/* ── Dynamic greeting pool (never repeat consecutive) ── */
const GREETING_POOL = [
  name => `Namaste 🙏 Welcome back, ${name}!`,
  name => `Namaste 🙏 Ready to generate enterprise-grade test cases today?`,
  name => `Good day ☀️ Let's improve software quality together, ${name}!`,
  name => `Hello ${name}! 👋 Your QA workspace is ready and waiting.`,
  name => `Welcome back 🚀 Shall we analyze your PRD today, ${name}?`,
  name => `Greetings 🙏 How can I assist your testing journey today?`,
  name => `Hi ${name}! ✨ I'm fully powered up and ready to help.`,
  name => `Good to see you again! 🎯 Let's build test excellence together.`,
  name => `Ready when you are! 🔍 What shall we test today, ${name}?`,
  name => `${name}, your AI QA companion is online 💡 Let's get started!`,
];
let _lastGreetingIdx = -1;
function getNextGreeting(name) {
  let idx;
  do { idx = Math.floor(Math.random() * GREETING_POOL.length); } while (idx === _lastGreetingIdx && GREETING_POOL.length > 1);
  _lastGreetingIdx = idx;
  return GREETING_POOL[idx](name || 'there');
}

/* ── Avatar settings integration ── */
const AVATAR_SETTINGS_KEY = 'veda_avatar_v1';
function loadAvatarSettings() {
  try { const s = localStorage.getItem(AVATAR_SETTINGS_KEY); return s ? JSON.parse(s) : null; } catch { return null; }
}

function applyAvatarToChat(avSettings) {
  if (!avSettings) return;
  const svg = document.getElementById('vedaChatSvg');
  if (svg) {
    if (avSettings.skin)      svg.style.setProperty('--skin-color', avSettings.skin);
    if (avSettings.hairColor) svg.style.setProperty('--hair-color', avSettings.hairColor);
    ['Short','Long','Wavy','Updo','Modern'].forEach(st => {
      const hb = svg.querySelector(`#hairBack${st}`);
      const hf = svg.querySelector(`#hairFront${st}`);
      const on = st === (avSettings.hairStyle || 'Short');
      if (hb) hb.style.display = on ? '' : 'none';
      if (hf) hf.style.display = on ? '' : 'none';
    });
    ['Corporate','AI','QA','Consultant','Startup','Traditional','Festival'].forEach(o => {
      const el = svg.querySelector(`#outfit${o}`);
      if (el) el.style.display = (o === (avSettings.outfit || 'Corporate')) ? '' : 'none';
    });
    const hs = svg.querySelector('#accessoryHeadset');
    const er = svg.querySelector('#accessoryEarrings');
    if (hs) hs.style.display = avSettings.showHeadset  ? '' : 'none';
    if (er) er.style.display = avSettings.showEarrings ? '' : 'none';
  }
  if (avSettings.name) {
    const nameEl = document.getElementById('buddyChatName');
    if (nameEl) nameEl.textContent = avSettings.displayName || avSettings.name;
  }
  const welcTitle = document.getElementById('buddyWelcomeTitle');
  if (welcTitle) welcTitle.textContent = getNextGreeting(avSettings.name || 'there');
}

const REACTIONS = {
  success:  { emoji: '🎉', mood: 'Celebrating!', animation: 'pulse' },
  bug:      { emoji: '🐛', mood: 'Bug found!', animation: 'shake' },
  critical: { emoji: '🚨', mood: 'Critical issue!', animation: 'shake' },
  thinking: { emoji: '🤔', mood: 'Analyzing...', animation: 'spin' },
  happy:    { emoji: '😊', mood: 'Happy to help!', animation: 'bounce' },
  warn:     { emoji: '⚠️', mood: 'Watch out!', animation: 'shake' },
  teach:    { emoji: '📚', mood: 'Teaching mode', animation: 'none' },
  search:   { emoji: '🔍', mood: 'Investigating...', animation: 'spin' },
  celebrate:{ emoji: '🥳', mood: 'Excellent work!', animation: 'pulse' },
  loading:  { emoji: '⏳', mood: 'Processing...', animation: 'spin' },
  ready:    { emoji: '✅', mood: 'Ready to help', animation: 'none' }
};

const LS_SETTINGS_KEY = 'buddy_settings_v3';
const LS_KNOWLEDGE_KEY = 'hld_project_knowledge';

/* ─────────────────────────────────────────────────────────────────────────────
   SETTINGS PERSISTENCE
   ───────────────────────────────────────────────────────────────────────────── */
const BuddySettings = {
  defaults: {
    avatar: 'qabot',
    name: 'Testy',
    gender: 'neutral',
    role: 'Your QA Intelligence Companion',
    personality: 'friendly',
    commStyle: 'balanced',
    voiceTone: 'warm',
    lang: 'en',
    engine: ''
  },

  load() {
    try {
      const saved = localStorage.getItem(LS_SETTINGS_KEY);
      return saved ? { ...this.defaults, ...JSON.parse(saved) } : { ...this.defaults };
    } catch { return { ...this.defaults }; }
  },

  save(settings) {
    try { localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(settings)); } catch(e) {}
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   KNOWLEDGE BASE (reads from HLD/LLD Maker output)
   ───────────────────────────────────────────────────────────────────────────── */
const BuddyKnowledge = {
  _data: null,

  load() {
    try {
      const raw = localStorage.getItem(LS_KNOWLEDGE_KEY);
      if (!raw) { this._data = null; return null; }
      this._data = JSON.parse(raw);
      return this._data;
    } catch { this._data = null; return null; }
  },

  buildContext() {
    if (!this._data) return '';
    const analysis = this._data.analysis || {};
    const parts = [];

    if (this._data.name) parts.push(`Project: ${this._data.name}`);

    if (analysis.overview) {
      const snippet = analysis.overview.slice(0, 800).replace(/```[\s\S]*?```/g, '').trim();
      if (snippet) parts.push('## Architecture Overview\n' + snippet);
    }
    if (analysis.modules) {
      const snippet = analysis.modules.slice(0, 600).replace(/```[\s\S]*?```/g, '').trim();
      if (snippet) parts.push('## Key Modules\n' + snippet);
    }
    if (analysis.risks) {
      const snippet = analysis.risks.slice(0, 400).replace(/```[\s\S]*?```/g, '').trim();
      if (snippet) parts.push('## Risk Areas\n' + snippet);
    }
    if (analysis.testing) {
      const snippet = analysis.testing.slice(0, 500).replace(/```[\s\S]*?```/g, '').trim();
      if (snippet) parts.push('## Testing Coverage Plan\n' + snippet);
    }

    if (!parts.length) return '';
    return '\n\n--- PROJECT KNOWLEDGE (from HLD/LLD analysis) ---\n' + parts.join('\n\n') + '\n---\n';
  },

  hasData() { return this._data !== null; },

  getProjectName() { return this._data ? this._data.name : null; },

  clear() {
    this._data = null;
    try { localStorage.removeItem(LS_KNOWLEDGE_KEY); } catch(e) {}
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   WINDOW CONTROLS
   ───────────────────────────────────────────────────────────────────────────── */
const BuddyWindow = {
  _mode: 'normal',

  _getLayout() { return document.querySelector('.buddy-layout'); },

  _clearModes(layout) {
    layout.classList.remove('docked-left', 'docked-right', 'minimized', 'fullscreen');
    document.querySelectorAll('.buddy-win-btn').forEach(b => b.classList.remove('active'));
  },

  dockLeft() {
    const l = this._getLayout(); if (!l) return;
    if (this._mode === 'docked-left') { this._clearModes(l); this._mode = 'normal'; return; }
    this._clearModes(l); l.classList.add('docked-left');
    this._mode = 'docked-left';
    document.getElementById('buddyWinDockL').classList.add('active');
  },

  dockRight() {
    const l = this._getLayout(); if (!l) return;
    if (this._mode === 'docked-right') { this._clearModes(l); this._mode = 'normal'; return; }
    this._clearModes(l); l.classList.add('docked-right');
    this._mode = 'docked-right';
    document.getElementById('buddyWinDockR').classList.add('active');
  },

  minimize() {
    const l = this._getLayout(); if (!l) return;
    if (this._mode === 'minimized') { this._clearModes(l); this._mode = 'normal'; document.getElementById('buddyWinMin').textContent = '_'; return; }
    this._clearModes(l); l.classList.add('minimized');
    this._mode = 'minimized';
    document.getElementById('buddyWinMin').classList.add('active');
    document.getElementById('buddyWinMin').textContent = '□';
  },

  maximize() {
    const l = this._getLayout(); if (!l) return;
    if (this._mode === 'fullscreen') { this._clearModes(l); this._mode = 'normal'; document.getElementById('buddyWinMax').textContent = '⤢'; return; }
    this._clearModes(l); l.classList.add('fullscreen');
    this._mode = 'fullscreen';
    document.getElementById('buddyWinMax').classList.add('active');
    document.getElementById('buddyWinMax').textContent = '✕';
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN APP
   ───────────────────────────────────────────────────────────────────────────── */
const BuddyApp = (() => {
  let state = { ...BuddySettings.defaults, chatHistory: [], streaming: false };
  let _modalSelectedAvatar = null;

  /* ── Helpers ── */
  function getAvatarSVGFromPanel(id) {
    const opt = document.querySelector(`.buddy-avatar-opt[data-avatar="${id}"] svg`);
    return opt ? opt.outerHTML : (AVATARS[id]?.emoji || '🤖');
  }

  function formatTime() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function scrollToBottom() {
    const msgs = document.getElementById('buddyMessages');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
  }

  function setMood(key) {
    const r = REACTIONS[key] || REACTIONS.ready;
    const badge = document.getElementById('buddyMoodBadge');
    if (badge) badge.textContent = r.emoji + ' ' + r.mood;
  }

  function detectReaction(text) {
    const t = (text || '').toLowerCase();
    if (/critical|blocker|p0|severity\s*1/i.test(t)) return 'critical';
    if (/bug|defect|issue|error|fail|broken/i.test(t)) return 'bug';
    if (/warning|risk|caution|concern/i.test(t)) return 'warn';
    if (/generate|create|write|produce|make/i.test(t)) return 'search';
    if (/explain|how|what|why|teach|learn/i.test(t)) return 'teach';
    if (/great|excellent|perfect|congrats|well done/i.test(t)) return 'celebrate';
    return 'happy';
  }

  function updateKnowledgeBadge() {
    const badge = document.getElementById('buddyKnowledgeBadge');
    if (!badge) return;
    if (BuddyKnowledge.hasData()) {
      const name = BuddyKnowledge.getProjectName() || 'Project';
      badge.textContent = '📚 ' + name.slice(0, 20);
      badge.className = 'buddy-knowledge-badge';
    } else {
      badge.textContent = 'No project';
      badge.className = 'buddy-knowledge-badge none';
    }
  }

  function syncLangSelects() {
    const lang = state.lang || 'en';
    const sidebar = document.getElementById('buddyLang');
    const header  = document.getElementById('buddyLangHeader');
    if (sidebar) sidebar.value = lang;
    if (header)  header.value  = lang;
    if (typeof BuddyLangPicker !== 'undefined') BuddyLangPicker.sync(lang);
  }

  const ENGINE_LABELS = {
    mistral: 'Mistral AI',
    ollama: 'Ollama (Local)',
    openai: 'OpenAI',
    huggingface: 'Hugging Face',
    gemini: 'Google Gemini',
    anthropic: 'Anthropic Claude',
    sarvam: 'Sarvam AI'
  };

  function populateEngineSelects() {
    const models = (typeof AppState !== 'undefined') ? AppState.models : null;
    const engines = models && models.data ? Object.keys(models.data) : Object.keys(ENGINE_LABELS);
    const current = state.engine || '';

    const makeOptions = (includeAuto) => {
      let html = includeAuto ? `<option value="">Auto (${ENGINE_LABELS[models?.current] || 'App Default'})</option>` : '';
      engines.forEach(key => {
        const cfg = models?.data?.[key] || {};
        const hasKey = key === 'ollama' || !!cfg.apiKey;
        const label = ENGINE_LABELS[key] || key;
        const status = hasKey ? '' : ' ⚠ No key';
        html += `<option value="${key}"${key === current ? ' selected' : ''}>${label}${status}</option>`;
      });
      return html;
    };

    const sidebar = document.getElementById('buddyEngineSelect');
    if (sidebar) sidebar.innerHTML = makeOptions(true);

    const modal = document.getElementById('bsEngine');
    if (modal) modal.innerHTML = makeOptions(true);
  }

  function applyStateToSidebar() {
    const nameEl = document.getElementById('buddyName');
    const genderEl = document.getElementById('buddyGender');
    const persEl = document.getElementById('buddyPersonality');
    const commEl = document.getElementById('buddyCommStyle');
    const toneEl = document.getElementById('buddyVoiceTone');
    if (nameEl) nameEl.value = state.name;
    if (genderEl) genderEl.value = state.gender;
    if (persEl) persEl.value = state.personality;
    if (commEl) commEl.value = state.commStyle;
    if (toneEl) toneEl.value = state.voiceTone;
    syncLangSelects();
    populateEngineSelects();

    // Select avatar in sidebar
    document.querySelectorAll('.buddy-avatar-opt').forEach(o => {
      o.classList.toggle('selected', o.dataset.avatar === state.avatar);
    });
  }

  function applyStateToHeader() {
    const nameEl = document.getElementById('buddyChatName');
    if (nameEl) nameEl.textContent = state.name;

    const roleEl = document.querySelector('.buddy-chat-role');
    if (roleEl) roleEl.textContent = state.role;

    const welcomeTitle = document.getElementById('buddyWelcomeTitle');
    if (welcomeTitle) welcomeTitle.textContent = `Hi! I'm ${state.name}, your QA Buddy!`;

    const welcomeEmoji = document.getElementById('buddyWelcomeEmoji');
    if (welcomeEmoji) {
      if (state.avatar === 'qabot') {
        welcomeEmoji.innerHTML = QABOT_WELCOME_SVG;
        welcomeEmoji.style.cssText = 'font-size:0;line-height:0;margin-bottom:8px';
      } else {
        welcomeEmoji.textContent = AVATARS[state.avatar]?.emoji || '🤖';
        welcomeEmoji.style.cssText = '';
      }
    }

    const display = document.getElementById('buddyChatAvatarDisplay');
    if (display) {
      const svg = document.querySelector(`.buddy-avatar-opt[data-avatar="${state.avatar}"] svg`);
      if (svg) display.innerHTML = svg.outerHTML;
      else display.textContent = AVATARS[state.avatar]?.emoji || '🤖';
    }
  }

  /* ── System Prompt ── */
  function buildSystemPrompt(userText) {
    const p = PERSONALITY_EXTENDED[state.personality] || PERSONALITIES[state.personality] || PERSONALITIES.friendly;
    const c = COMM_STYLES[state.commStyle] || COMM_STYLES.balanced;
    const v = VOICE_TONES[state.voiceTone] || VOICE_TONES.warm;
    const pronoun = { male: 'he/him', female: 'she/her', neutral: 'they/them' }[state.gender] || 'they/them';
    const knowledge = BuddyKnowledge.buildContext();
    const langInstr = LANG_INSTRUCTIONS[state.lang] || '';

    const msg = (userText || '').trim().toLowerCase();
    const rawMsg = (userText || '').trim();

    const isGreeting = /^(hi+|hello+|hey+|good\s?(morning|afternoon|evening|night)|howdy|greetings|sup|what'?s up|how are you|who are you|what can you do|thanks?|thank you|okay|ok+|cool|great|got it|sure|bye|goodbye|welcome|hola)\b/i.test(msg) && msg.length < 30;
    const isPersonalQuestion = /\b(your (age|birthday|born|name|version|model|creator|owner|company)|who (made|built|created|owns|trained) you|what are you|are you (human|a robot|a bot|an ai|real)|do you (eat|sleep|breathe|feel|have feelings|have emotions)|how old are you|what is your age|tell me about yourself|introduce yourself)\b/i.test(msg);
    const isTestCaseRequest = /\b(test cases?|test scenario|test suite|tc-|tc list|write tests?|generate tests?|create tests?)\b/i.test(msg);
    const isAutomationRequest = /\b(automat|playwright|selenium|cypress|postman|k6|jmeter|script|automation code)\b/i.test(msg);
    const isDefectRequest = /\b(defect|bug|root cause|analyze|analyse|issue|error|fail|crash|broken|problem|why is|what caused|investigate)\b/i.test(msg);
    const isRiskRequest = /\b(risk|risks|assess|mitigation|impact)\b/i.test(msg);

    let responseGuide = '';
    if (isPersonalQuestion) {
      responseGuide = `CURRENT MESSAGE TYPE: Personal / identity question about you (the AI).
The user asked: "${rawMsg}"
RESPOND: Answer honestly and briefly about what you are as an AI assistant.
- You are ${state.name}, an AI QA companion — not a human, not a physical being
- You do not have an age, birthday, or physical body
- You were created to assist QA engineers with testing tasks
- Be warm and friendly; use ONE emoji at the start
- End with an invitation to help with QA work
- Keep it to 3-5 sentences. NO test case tables. NO Pro Tip.`;
    } else if (isGreeting) {
      responseGuide = `CURRENT MESSAGE TYPE: Greeting.
The user said: "${rawMsg}"
RESPOND with EXACTLY this structure (adapt the wording but keep the structure):
1. Start with "👋 Hi [name if known, otherwise omit]!" or "😊 Hello!" — a warm one-line greeting
2. Introduce yourself: "I'm ${state.name}, your AI QA companion."
3. Mention 2-3 things you can help with (test cases, defect analysis, automation scripts)
4. End with: "What would you like to work on today?"
DO NOT say anything about age. DO NOT generate test cases or tables. Keep it under 4 sentences.`;
    } else if (isTestCaseRequest) {
      responseGuide = `CURRENT MESSAGE TYPE: Test case generation request.
RESPOND: Generate a comprehensive markdown table with columns: TC-ID | Description | Pre-conditions | Steps | Expected Result | Priority | Type.
Add a "💡 **Pro tip:**" at the end with one actionable suggestion.`;
    } else if (isAutomationRequest) {
      responseGuide = `CURRENT MESSAGE TYPE: Automation script request.
RESPOND: Write clean, commented automation code in the requested framework. Use proper code blocks with the framework name.
Add a "💡 **Pro tip:**" at the end.`;
    } else if (isDefectRequest) {
      responseGuide = `CURRENT MESSAGE TYPE: Defect / root cause analysis request.
RESPOND: Provide structured defect analysis — symptoms, probable root causes (use 5 Whys or Fishbone if helpful), impact assessment, and recommended fixes.
Start with a relevant emoji. Add a "💡 **Pro tip:**" at the end.`;
    } else if (isRiskRequest) {
      responseGuide = `CURRENT MESSAGE TYPE: Risk analysis request.
RESPOND: Identify risks, likelihood, impact, and mitigation strategies. Use a clear list or table.
Start with a relevant emoji. Add a "💡 **Pro tip:**" at the end.`;
    } else {
      responseGuide = `CURRENT MESSAGE TYPE: General QA question or conversation.
RESPOND: Answer the user's EXACT question directly and helpfully. Use markdown where it improves clarity.
Start with a relevant emoji. Add a "💡 **Pro tip:**" only if the response is technical (skip for simple answers).`;
    }

    return `You are ${state.name}, an advanced AI QA companion (pronouns: ${pronoun}).
Role: ${state.role || 'Senior QA Engineer, QA Architect, and SDET — all in one.'}

PERSONALITY: ${p.style}
COMMUNICATION STYLE: ${c}
VOICE TONE: ${v}
${langInstr ? '\n' + langInstr + '\n' : ''}
Your QA expertise covers:
1. Comprehensive test cases — functional, regression, integration, API, UI, security, performance, boundary, negative, exploratory
2. Root cause analysis — 5 Whys, Fishbone, impact analysis, defect triaging
3. Automation scripts — Playwright, Selenium, Cypress, Postman, k6, JMeter
4. Requirement gap analysis between PRD, implementation, and test coverage
5. Test risk assessment and mitigation strategies
6. Application flow explanations — modules, APIs, data flows
7. Test strategies, QA plans, QA KPIs and metrics
8. Exploratory testing heuristics (SFDPOT, HICCUPP)
9. Bug prediction — complexity hotspots, defect-prone modules
10. Test data design — equivalence partitioning, boundary analysis, decision tables

═══════════════════════════════════════════════════
CRITICAL INSTRUCTION — ALWAYS OBEY:
${responseGuide}
═══════════════════════════════════════════════════

MOST IMPORTANT RULE: Read the user's EXACT words and respond to THOSE words specifically.
Never generate test cases when the user did not ask for test cases.
Never ignore what the user said in favour of a generic QA output.

${knowledge}`;
  }

  /* ── Markdown renderer ── */
  function renderMd(text) {
    return (text || '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/```(\w*)\n?([\s\S]*?)```/g, (_,lang,c) => `<pre class="lang-${lang}"><code>${c}</code></pre>`)
      .replace(/`([^`\n]+)`/g, '<code>$1</code>')
      .replace(/\*\*\*(.+?)\*\*\*/g,'<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
      .replace(/\*(.+?)\*/g,'<em>$1</em>')
      .replace(/^#{3}\s(.+)$/gm,'<h3>$1</h3>')
      .replace(/^#{2}\s(.+)$/gm,'<h2>$1</h2>')
      .replace(/^#{1}\s(.+)$/gm,'<h1>$1</h1>')
      .replace(/^\|(.+)\|$/gm, line => {
        const cells = line.split('|').slice(1,-1);
        if (cells.every(c => /^[-: ]+$/.test(c.trim()))) return '';
        return '<tr>' + cells.map(c => `<td>${c.trim()}</td>`).join('') + '</tr>';
      })
      .replace(/(<tr>.*?<\/tr>\n?)+/gs, m => `<table>${m}</table>`)
      .replace(/^[-*]\s(.+)$/gm,'<li>$1</li>')
      .replace(/^\d+\.\s(.+)$/gm,'<li class="ordered">$1</li>')
      .replace(/(<li>.*?<\/li>\n?)+/gs, m => `<ul>${m}</ul>`)
      .replace(/\n\n/g,'</p><p>')
      .replace(/\n/g,'<br>');
  }

  /* ── Message rendering ── */
  function appendMessage(role, text, opts = {}) {
    const welcome = document.getElementById('buddyWelcome');
    if (welcome) welcome.style.display = 'none';

    const msgs = document.getElementById('buddyMessages');
    const wrap = document.createElement('div');
    wrap.className = `buddy-msg ${role}`;

    const userInitials = (AppState && AppState.user ? AppState.user.name || 'U' : 'U').substring(0, 2).toUpperCase();
    const emoji = AVATARS[state.avatar]?.emoji || '🤖';

    const avatarHTML = role === 'bot'
      ? `<div class="buddy-msg-avatar">${emoji}</div>`
      : `<div class="buddy-msg-avatar">${userInitials}</div>`;

    const reaction = opts.reaction || '';
    wrap.innerHTML = `
      ${avatarHTML}
      <div style="max-width:620px">
        ${reaction ? `<div class="buddy-reaction">${reaction}</div>` : ''}
        <div class="buddy-msg-bubble" ${opts.bubbleId ? `id="${opts.bubbleId}"` : ''}>${renderMd(text)}</div>
        <div class="buddy-msg-time">${formatTime()}</div>
      </div>`;

    msgs.appendChild(wrap);
    scrollToBottom();
    return wrap;
  }

  function appendTyping() {
    const welcome = document.getElementById('buddyWelcome');
    if (welcome) welcome.style.display = 'none';
    const msgs = document.getElementById('buddyMessages');
    const wrap = document.createElement('div');
    wrap.className = 'buddy-msg bot';
    wrap.id = 'buddyTyping';
    const emoji = AVATARS[state.avatar]?.emoji || '🤖';
    wrap.innerHTML = `
      <div class="buddy-msg-avatar">${emoji}</div>
      <div>
        <div class="buddy-typing">
          <span class="buddy-typing-dot"></span>
          <span class="buddy-typing-dot"></span>
          <span class="buddy-typing-dot"></span>
        </div>
      </div>`;
    msgs.appendChild(wrap);
    scrollToBottom();
  }

  function removeTyping() {
    const t = document.getElementById('buddyTyping');
    if (t) t.remove();
  }

  /* ── Send ── */
  async function sendMessage(userText) {
    if (!userText || state.streaming) return;
    state.streaming = true;

    const sendBtn = document.getElementById('buddySendBtn');
    const chatInput = document.getElementById('buddyChatInput');
    if (sendBtn) sendBtn.disabled = true;
    if (chatInput) chatInput.disabled = true;

    appendMessage('user', userText);
    setMood('thinking');
    appendTyping();

    state.chatHistory.push({ role: 'user', content: userText });

    const models = AppState.models;
    const engine = state.engine || models.current || 'mistral';
    const config = { current: engine, data: models.data || models };

    const sysPrompt = buildSystemPrompt(userText);

    // Separate history (prior turns) from current user message
    const priorTurns = state.chatHistory.slice(-11, -1); // up to 10 turns before current
    const histCtx = priorTurns.length > 0
      ? priorTurns.map(m => `${m.role === 'user' ? 'User' : state.name}: ${m.content}`).join('\n\n')
      : '';

    const fullPrompt = histCtx
      ? `${sysPrompt}\n\n=== Previous Conversation ===\n${histCtx}\n\n=== User's Current Message ===\nUser: ${userText}\n\n${state.name}:`
      : `${sysPrompt}\n\n=== User's Message ===\nUser: ${userText}\n\n${state.name}:`;

    const reaction = detectReaction(userText);
    let responseText = '';
    let streamBubble = null;
    let msgWrap = null;
    let firstChunk = true;

    try {
      await AIEngine.generateWithPrompt(fullPrompt, config, (chunk) => {
        responseText += chunk;
        if (firstChunk) {
          firstChunk = false;
          removeTyping();
          const msgs = document.getElementById('buddyMessages');
          const welcome = document.getElementById('buddyWelcome');
          if (welcome) welcome.style.display = 'none';
          const emoji = AVATARS[state.avatar]?.emoji || '🤖';
          const reactionEl = REACTIONS[reaction]?.emoji || '';
          msgWrap = document.createElement('div');
          msgWrap.className = 'buddy-msg bot';
          msgWrap.innerHTML = `
            <div class="buddy-msg-avatar">${emoji}</div>
            <div style="max-width:620px">
              ${reactionEl ? `<div class="buddy-reaction">${reactionEl}</div>` : ''}
              <div class="buddy-msg-bubble"><span class="buddy-stream-span"></span><span class="buddy-stream-cursor"></span></div>
              <div class="buddy-msg-time">${formatTime()}</div>
            </div>`;
          msgs.appendChild(msgWrap);
          streamBubble = msgWrap.querySelector('.buddy-stream-span');
        }
        if (streamBubble) {
          streamBubble.innerHTML = renderMd(responseText);
          scrollToBottom();
        }
      });

      if (firstChunk) {
        // No chunks received at all — show fallback message
        removeTyping();
        const fallback = responseText.trim() || '⚠️ I didn\'t receive a response. Please check your AI engine settings in Dashboard → Settings, or try rephrasing your question.';
        appendMessage('bot', fallback, { reaction: REACTIONS[reaction]?.emoji });
      } else {
        const cursor = msgWrap ? msgWrap.querySelector('.buddy-stream-cursor') : document.querySelector('.buddy-stream-cursor');
        if (cursor) cursor.remove();
        // Stream finished but response is empty/whitespace — fill bubble with fallback
        if (!responseText.trim() && streamBubble) {
          const bubble = streamBubble.closest ? streamBubble.closest('.buddy-msg-bubble') : streamBubble.parentElement;
          if (bubble) bubble.innerHTML = renderMd('⚠️ The AI returned an empty response. Please try again or check your engine settings.');
        }
      }

      const cleanResponse = responseText.trim();
      if (cleanResponse) {
        state.chatHistory.push({ role: 'assistant', content: cleanResponse });
        if (state.chatHistory.length > 24) state.chatHistory = state.chatHistory.slice(-20);
        updateMemoryFromExchange(userText, cleanResponse);
      }
      setMood(reaction);

    } catch (err) {
      removeTyping();
      appendMessage('bot', `⚠️ Error: ${err.message || 'Check your AI engine settings in Dashboard.'}`);
      setMood('warn');
    } finally {
      state.streaming = false;
      if (sendBtn) sendBtn.disabled = false;
      if (chatInput) { chatInput.disabled = false; chatInput.focus(); }
    }
  }

  function updateMemoryFromExchange(question, response) {
    const memList = document.getElementById('buddyMemoryList');
    if (!memList) return;
    const keywords = ['module', 'api', 'database', 'feature', 'user story', 'requirement', 'flow', 'architecture', 'risk', 'test'];
    const relevant = keywords.some(k => question.toLowerCase().includes(k) || response.toLowerCase().includes(k));
    if (relevant) {
      const item = document.createElement('div');
      item.className = 'buddy-memory-item';
      item.textContent = question.slice(0, 60) + (question.length > 60 ? '...' : '');
      // Keep only last 8 items
      const existing = memList.querySelectorAll('.buddy-memory-item');
      if (existing.length >= 8) existing[0].remove();
      const placeholder = memList.querySelector('div[style*="italic"]');
      if (placeholder) placeholder.remove();
      memList.appendChild(item);
    }
  }

  function resizeTextarea(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }

  /* ── Settings Modal Tab Logic ── */
  function updateModalKnowledgeTab() {
    const info = document.getElementById('bsKnowledgeInfo');
    if (!info) return;
    const data = BuddyKnowledge.load();
    if (data) {
      const d = new Date(data.savedAt || 0).toLocaleString();
      const chars = (data.rawText || '').length;
      const sections = Object.keys(data.analysis || {}).filter(k => data.analysis[k]);
      info.innerHTML = `
        <div style="color:var(--text-primary);font-weight:700;margin-bottom:6px">📚 ${data.name}</div>
        <div style="color:var(--text-muted);font-size:0.75rem">Saved: ${d}</div>
        <div style="color:var(--text-muted);font-size:0.75rem">Source: ${chars.toLocaleString()} characters</div>
        <div style="color:var(--text-muted);font-size:0.75rem">Sections: ${sections.join(', ')}</div>`;
    } else {
      info.innerHTML = `<div style="color:var(--text-muted);font-style:italic">No project knowledge loaded yet.<br>Upload a PRD/BRD in <strong>HLD → LLD Maker</strong> and click "Share to Buddy" to load project context here.</div>`;
    }
  }

  /* ── Public API ── */
  return {
    setAvatar(avatarId, el) {
      state.avatar = avatarId;
      document.querySelectorAll('.buddy-avatar-opt').forEach(o => o.classList.remove('selected'));
      if (el) el.classList.add('selected');
      applyStateToHeader();
      BuddySettings.save(state);
    },

    applyConfig() {
      state.name = (document.getElementById('buddyName')?.value.trim() || 'Testy').slice(0, 20);
      state.gender = document.getElementById('buddyGender')?.value || 'neutral';
      state.personality = document.getElementById('buddyPersonality')?.value || 'friendly';
      state.commStyle = document.getElementById('buddyCommStyle')?.value || 'balanced';
      state.voiceTone = document.getElementById('buddyVoiceTone')?.value || 'warm';
      state.lang = document.getElementById('buddyLang')?.value || 'en';
      state.engine = document.getElementById('buddyEngineSelect')?.value || '';

      const selectedAv = document.querySelector('.buddy-avatar-opt.selected');
      if (selectedAv && selectedAv.dataset.avatar) state.avatar = selectedAv.dataset.avatar;

      applyStateToSidebar();
      applyStateToHeader();
      BuddySettings.save(state);
      setMood('ready');
      if (typeof showToast === 'function') showToast(`✓ ${state.name} settings saved!`, 'success');
    },

    setLang(lang) {
      state.lang = lang || 'en';
      syncLangSelects();
      BuddySettings.save(state);
      const names = { en:'English', hi:'Hindi', bn:'Bengali', mr:'Marathi', te:'Telugu', ta:'Tamil', gu:'Gujarati', ur:'Urdu', kn:'Kannada', od:'Odia', ml:'Malayalam' };
      if (typeof showToast === 'function') showToast(`🌐 Language: ${names[lang] || lang}`, 'success');
    },

    clearMemory() {
      BuddyKnowledge.clear();
      const memList = document.getElementById('buddyMemoryList');
      if (memList) memList.innerHTML = '<div style="font-size:0.74rem;color:var(--text-muted);font-style:italic">No context loaded.</div>';
      updateKnowledgeBadge();
      updateModalKnowledgeTab();
      if (typeof showToast === 'function') showToast('Knowledge cleared', 'info');
    },

    refreshKnowledge() {
      BuddyKnowledge.load();
      updateKnowledgeBadge();
      updateModalKnowledgeTab();
      const name = BuddyKnowledge.getProjectName();
      if (name) {
        if (typeof showToast === 'function') showToast(`✓ Loaded: ${name}`, 'success');
      } else {
        if (typeof showToast === 'function') showToast('No project knowledge found. Use HLD → LLD Maker first.', 'info');
      }
    },

    openSettings() {
      // Sync modal fields from state
      const fields = [
        ['bsName', state.name],
        ['bsGender', state.gender],
        ['bsRole', state.role],
        ['bsPersonality', state.personality],
        ['bsCommStyle', state.commStyle],
        ['bsVoiceTone', state.voiceTone],
        ['bsLang', state.lang || 'en'],
      ];
      fields.forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
      });
      populateEngineSelects();
      const bsEng = document.getElementById('bsEngine');
      if (bsEng) bsEng.value = state.engine || '';

      // Select avatar in modal grid
      _modalSelectedAvatar = state.avatar;
      document.querySelectorAll('.buddy-modal-avatar-opt').forEach(o => {
        o.classList.toggle('selected', o.dataset.av === state.avatar);
      });

      updateModalKnowledgeTab();

      // Open modal — ensure identity tab is active
      this.modalTab('identity', document.querySelector('.buddy-modal-tab'));
      if (typeof openModal === 'function') openModal('buddySettingsModal');
      else { const m = document.getElementById('buddySettingsModal'); if (m) m.style.display = 'flex'; }
    },

    modalTab(tabName, btn) {
      document.querySelectorAll('.buddy-modal-tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.buddy-modal-tab-panel').forEach(p => p.classList.remove('active'));
      if (btn) btn.classList.add('active');
      const panel = document.getElementById('bmt-' + tabName);
      if (panel) panel.classList.add('active');
      if (tabName === 'knowledge') updateModalKnowledgeTab();
    },

    modalSelectAvatar(avatarId, el) {
      _modalSelectedAvatar = avatarId;
      document.querySelectorAll('.buddy-modal-avatar-opt').forEach(o => o.classList.remove('selected'));
      if (el) el.classList.add('selected');
    },

    saveSettings() {
      const name = (document.getElementById('bsName')?.value.trim() || 'Testy').slice(0, 20);
      const gender = document.getElementById('bsGender')?.value || 'neutral';
      const role = (document.getElementById('bsRole')?.value.trim() || 'Your QA Intelligence Companion').slice(0, 40);
      const personality = document.getElementById('bsPersonality')?.value || 'friendly';
      const commStyle = document.getElementById('bsCommStyle')?.value || 'balanced';
      const voiceTone = document.getElementById('bsVoiceTone')?.value || 'warm';
      const lang = document.getElementById('bsLang')?.value || 'en';
      const engine = document.getElementById('bsEngine')?.value || '';
      const avatar = _modalSelectedAvatar || state.avatar;

      state = { ...state, name, gender, role, personality, commStyle, voiceTone, lang, engine, avatar };
      BuddySettings.save(state);

      // Apply everywhere
      applyStateToHeader();
      applyStateToSidebar();

      if (typeof closeModal === 'function') closeModal('buddySettingsModal');
      else { const m = document.getElementById('buddySettingsModal'); if (m) m.style.display = 'none'; }

      setMood('ready');
      if (typeof showToast === 'function') showToast(`✓ ${name} configured & saved!`, 'success');
    },

    quickSend(text) {
      const input = document.getElementById('buddyChatInput');
      if (input) { input.value = text; resizeTextarea(input); }
      this.send();
    },

    send() {
      const input = document.getElementById('buddyChatInput');
      const text = (input ? input.value : '').trim();
      if (!text || state.streaming) return;
      if (input) { input.value = ''; input.style.height = 'auto'; }
      sendMessage(text);
    },

    init() {
      // Load saved settings
      const saved = BuddySettings.load();
      state = { ...state, ...saved };

      // Apply to UI
      applyStateToHeader();
      applyStateToSidebar();

      // Load knowledge from HLD/LLD Maker
      BuddyKnowledge.load();
      updateKnowledgeBadge();

      // Update memory list with knowledge summary
      if (BuddyKnowledge.hasData()) {
        const memList = document.getElementById('buddyMemoryList');
        if (memList) {
          const name = BuddyKnowledge.getProjectName() || 'Project';
          memList.innerHTML = `<div class="buddy-memory-item">📚 Project knowledge: ${name}</div>
            <div class="buddy-memory-item">Architecture analysis loaded — ask me anything about the project</div>`;
        }
      }

      // Chat input listeners
      const chatInput = document.getElementById('buddyChatInput');
      const sendBtn = document.getElementById('buddySendBtn');

      if (chatInput) {
        chatInput.addEventListener('input', () => resizeTextarea(chatInput));
        chatInput.addEventListener('keydown', e => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.send(); }
        });
      }
      if (sendBtn) sendBtn.addEventListener('click', () => this.send());

      // Sidebar name live preview
      const nameInput = document.getElementById('buddyName');
      if (nameInput) nameInput.addEventListener('input', () => {
        const n = nameInput.value.trim() || 'Testy';
        const el = document.getElementById('buddyChatName');
        if (el) el.textContent = n;
      });

      // Keyboard shortcut: Escape closes fullscreen
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && BuddyWindow._mode === 'fullscreen') BuddyWindow.maximize();
      });

      setMood('ready');

      // Apply avatar personalization settings
      const avSettings = loadAvatarSettings();
      if (avSettings) applyAvatarToChat(avSettings);

      // Listen for live changes from avatar_settings.html (same tab)
      document.addEventListener('vedaSettingsChanged', e => {
        const s = e.detail || loadAvatarSettings();
        if (s) applyAvatarToChat(s);
      });

      // Catch cross-tab saves: localStorage 'storage' event fires in all OTHER tabs
      window.addEventListener('storage', function(e) {
        if (e.key === 'veda_avatar_v1' && e.newValue) {
          try { const s = JSON.parse(e.newValue); if (s) applyAvatarToChat(s); } catch(err) {}
        }
      });
    }
  };
})();

document.addEventListener('DOMContentLoaded', () => BuddyApp.init());
