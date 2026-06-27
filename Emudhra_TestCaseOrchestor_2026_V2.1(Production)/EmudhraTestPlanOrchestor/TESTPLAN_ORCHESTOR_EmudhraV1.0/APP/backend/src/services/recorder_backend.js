'use strict';
/**
 * Recorder Backend — WebSocket server (port 3001)
 * Uses Playwright to:
 *   1. Open the target app in a real browser
 *   2. Inject an event-capture script that harvests locators + actions
 *   3. Stream captured steps (with screenshots) back to AutoFlow UI
 *   4. Replay recorded steps and stream per-step results for test-case storage
 *
 * Prerequisites:
 *   npm install playwright ws
 *   npx playwright install chromium
 */

let pw, WS;
try { pw = require('playwright'); } catch {
  console.error('[Recorder] playwright not installed. Run: npm install playwright && npx playwright install chromium');
  process.exit(1);
}
try { WS = require('ws'); } catch {
  console.error('[Recorder] ws not installed. Run: npm install ws');
  process.exit(1);
}

const { chromium, firefox, webkit } = pw;
const { WebSocketServer } = WS;
const PORT = 3001;

// ── Capture script injected into every page the user visits ─────────
// Runs in browser context. Calls window.__afCapture(evt) for each action.
// All helpers are defined INSIDE so the serialized closure is self-contained.
function CAPTURE_FN() {
  if (window.__afCaptureReady) return;
  window.__afCaptureReady = true;

  // Resolve human-readable label for a form element
  function getLabel(el) {
    try {
      if (el.id) {
        const lbl = document.querySelector('label[for="' + el.id + '"]');
        if (lbl) return lbl.innerText.trim().slice(0, 60);
      }
      const pl = el.closest('label');
      if (pl) {
        const clone = pl.cloneNode(true);
        clone.querySelectorAll('input,select,textarea,button').forEach(function(n) { n.remove(); });
        const t = clone.innerText.trim().slice(0, 60);
        if (t) return t;
      }
      const lbId = el.getAttribute('aria-labelledby');
      if (lbId) {
        const lEl = document.getElementById(lbId);
        if (lEl) return lEl.innerText.trim().slice(0, 60);
      }
    } catch (e2) {}
    return null;
  }

  function locators(el) {
    const L = { tag: el.tagName.toLowerCase() };
    for (const a of ['data-testid','data-test','data-cy','data-qa','data-automation-id']) {
      const v = el.getAttribute(a);
      if (v) { L.testId = '[' + a + '="' + v + '"]'; break; }
    }
    if (el.id && !/^\d/.test(el.id) && el.id.length < 80) L.id = '#' + el.id;
    if (el.name) L.name = '[name="' + el.name + '"]';
    const al = el.getAttribute('aria-label');
    if (al) L.ariaLabel = '[aria-label="' + al + '"]';
    L.css   = cssPath(el);
    L.xpath = xpathOf(el);
    L.best  = L.testId || L.id || L.name || L.ariaLabel || L.css;

    // Rich metadata — used for human-readable descriptions + test case display
    L.labelText  = getLabel(el);
    L.placeholder = el.placeholder || null;
    L.inputType  = el.type || null;
    L.tagText    = (el.innerText || el.textContent || '').trim().slice(0, 60) || null;
    L.href       = el.href || el.getAttribute('href') || null;
    L.nameAttr   = el.name || null;
    L.role       = el.getAttribute('role') || null;
    return L;
  }

  // Build plain-English description from captured metadata
  function buildDesc(action, L, value) {
    const ariaLbl = L.ariaLabel ? L.ariaLabel.replace(/^\[aria-label="(.+)"\]$/, '$1') : null;
    const fieldName = L.labelText || L.placeholder || ariaLbl || L.nameAttr ||
      (L.id ? L.id.replace('#', '') : null) || L.best;
    const tag = L.tag, iType = L.inputType;

    if (action === 'click') {
      if (tag === 'a')                                                 return 'Click link "' + (L.tagText || L.href || fieldName) + '"';
      if (tag === 'button' || iType === 'submit' || iType === 'button' || L.role === 'button')
                                                                       return 'Click button "' + (L.tagText || fieldName) + '"';
      if (iType === 'checkbox') return 'Toggle checkbox "' + fieldName + '"';
      if (iType === 'radio')    return 'Select radio button "' + fieldName + '"';
      return 'Click "' + (L.tagText || fieldName) + '"';
    }
    if (action === 'type') {
      const v = value === '***' ? '[password]' : '"' + value.slice(0, 30) + '"';
      return 'Enter ' + v + ' in "' + fieldName + '" field';
    }
    if (action === 'select')  return 'Select "' + value + '" from "' + fieldName + '" dropdown';
    if (action === 'check')   return 'Check "' + fieldName + '"';
    if (action === 'uncheck') return 'Uncheck "' + fieldName + '"';
    return action + ' on ' + fieldName;
  }

  function cssPath(el) {
    const p = [];
    let c = el;
    while (c && c.tagName && c.tagName !== 'HTML') {
      if (c.id && !/^\d/.test(c.id)) { p.unshift('#' + c.id); break; }
      let seg = c.tagName.toLowerCase();
      if (c.parentElement) {
        const sibs = [...c.parentElement.children].filter(s => s.tagName === c.tagName);
        if (sibs.length > 1) seg += ':nth-of-type(' + (sibs.indexOf(c) + 1) + ')';
      }
      p.unshift(seg);
      c = c.parentElement;
    }
    return p.join(' > ');
  }

  function xpathOf(el) {
    if (el.id) return '//*[@id="' + el.id + '"]';
    const p = [];
    let c = el;
    while (c && c.nodeType === 1) {
      let i = 1, s = c.previousElementSibling;
      while (s) { if (s.tagName === c.tagName) i++; s = s.previousElementSibling; }
      p.unshift(c.tagName.toLowerCase() + (i > 1 ? '[' + i + ']' : ''));
      c = c.parentElement;
    }
    return '/' + p.join('/');
  }

  function interactive(el) {
    if (!el || !el.tagName) return false;
    if (['A','BUTTON','INPUT','SELECT','TEXTAREA'].includes(el.tagName)) return true;
    const r = el.getAttribute('role');
    return r === 'button' || r === 'link' || r === 'menuitem' || r === 'tab' ||
           r === 'option' || r === 'checkbox' || r === 'radio';
  }

  // ── click ────────────────────────────────────────────────────────
  document.addEventListener('click', e => {
    const el = e.composedPath().find(n => n.tagName && interactive(n)) || e.target;
    if (!interactive(el)) return;
    const L = locators(el);
    window.__afCapture({ action: 'click', selector: L.best, locator: L, value: '',
      description: buildDesc('click', L, '') });
  }, true);

  // ── type (debounced 800 ms) ───────────────────────────────────────
  const _t = new WeakMap();
  document.addEventListener('input', e => {
    const el = e.target;
    if (!['INPUT','TEXTAREA'].includes(el.tagName)) return;
    if (['submit','button','hidden','file','image','reset'].includes(el.type)) return;
    clearTimeout(_t.get(el));
    _t.set(el, setTimeout(() => {
      const L = locators(el);
      const val = el.type === 'password' ? '***' : el.value;
      window.__afCapture({ action: 'type', selector: L.best, locator: L, value: val,
        description: buildDesc('type', L, val) });
    }, 800));
  }, true);

  // ── select / checkbox / radio ─────────────────────────────────────
  document.addEventListener('change', e => {
    const el = e.target;
    if (el.tagName === 'SELECT') {
      const L = locators(el);
      const selectedText = el.options[el.selectedIndex]?.text || el.value;
      window.__afCapture({ action: 'select', selector: L.best, locator: L, value: el.value,
        description: buildDesc('select', L, selectedText) });
    }
    if (el.type === 'checkbox' || el.type === 'radio') {
      const L = locators(el);
      window.__afCapture({ action: 'click', selector: L.best, locator: L,
        value: el.checked ? 'checked' : 'unchecked',
        description: buildDesc(el.checked ? 'check' : 'uncheck', L, '') });
    }
  }, true);

  // ── password reveal: capture actual value when eye-button reveals the field ──
  (function() {
    var _obs = new MutationObserver(function(muts) {
      muts.forEach(function(m) {
        if (m.type !== 'attributes' || m.attributeName !== 'type') return;
        var el = m.target;
        if (el.tagName === 'INPUT' && el.type === 'text' && el.value && m.oldValue === 'password') {
          var L = locators(el);
          window.__afCapture({
            action: 'type', selector: L.best, locator: L,
            value: el.value,
            description: buildDesc('type', L, el.value) + ' [password revealed]'
          });
        }
      });
    });
    function watchPwd() {
      document.querySelectorAll('input').forEach(function(el) {
        if (el.type === 'password' || el.type === 'text') {
          _obs.observe(el, { attributes: true, attributeFilter: ['type'], attributeOldValue: true });
        }
      });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watchPwd);
    else watchPwd();
    // Watch for dynamically added inputs
    new MutationObserver(function(muts) {
      muts.forEach(function(m) {
        m.addedNodes.forEach(function(n) {
          if (!n || n.nodeType !== 1) return;
          var els = (n.tagName === 'INPUT') ? [n] : Array.from(n.querySelectorAll ? n.querySelectorAll('input') : []);
          els.forEach(function(el) {
            if (el.type === 'password' || el.type === 'text') {
              _obs.observe(el, { attributes: true, attributeFilter: ['type'], attributeOldValue: true });
            }
          });
        });
      });
    }).observe(document.documentElement, { childList: true, subtree: true });
  }());
}

// ── Recording indicator injected into every page in the recording browser ──
// Shows a persistent red banner so the user never confuses the recording
// window with their normal browser.
function BANNER_FN() {
  var ID = '__af_rec_banner', SID = '__af_rec_style';

  function inject() {
    if (document.getElementById(ID)) return;

    // Keyframe animation
    if (!document.getElementById(SID)) {
      var s = document.createElement('style');
      s.id = SID;
      s.textContent = '@keyframes __afPulse{0%,100%{opacity:1}50%{opacity:.25}}';
      (document.head || document.documentElement).appendChild(s);
    }

    var bar = document.createElement('div');
    bar.id = ID;
    bar.setAttribute('style', [
      'position:fixed', 'top:0', 'left:0', 'right:0', 'height:30px',
      'z-index:2147483647',
      'background:linear-gradient(90deg,#7f1d1d 0%,#dc2626 50%,#7f1d1d 100%)',
      'color:#fff',
      'font-family:ui-monospace,monospace',
      'font-size:11px', 'font-weight:700', 'letter-spacing:.08em',
      'display:flex', 'align-items:center', 'justify-content:center', 'gap:10px',
      'box-shadow:0 3px 14px rgba(185,28,28,.9)',
      'pointer-events:none', 'user-select:none'
    ].join(';'));

    var dot = document.createElement('span');
    dot.setAttribute('style',
      'width:9px;height:9px;border-radius:50%;background:#fca5a5;flex-shrink:0;' +
      'animation:__afPulse 1s ease-in-out infinite');

    var txt = document.createElement('span');
    txt.textContent = '●  AUTOFLOW RECORDING IN PROGRESS  —  Perform your test actions in this window  —  Return to the AutoFlow UI tab to Stop Recording';

    bar.appendChild(dot);
    bar.appendChild(txt);

    if (document.body) {
      document.body.insertBefore(bar, document.body.firstChild);
      // Push body content below the banner so nothing is hidden under it
      var existing = document.body.style.marginTop || document.body.style.paddingTop || '';
      if (!existing) document.body.style.setProperty('margin-top', '30px', 'important');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject);
  else inject();

  // Re-inject after SPA route changes that wipe the DOM
  window.addEventListener('load',     inject);
  window.addEventListener('pageshow', inject);
}

// ── Shared state ──────────────────────────────────────────────────────
let ST = { browser:null, page:null, steps:[], counter:0, recording:false };

async function cleanup() {
  ST.recording = false;
  if (ST.browser) { try { await ST.browser.close(); } catch {} ST.browser=null; ST.page=null; }
}

// ── WebSocket server ──────────────────────────────────────────────────
const wss = new WebSocketServer({ port: PORT });

wss.on('connection', ws => {
  console.log('[Recorder] UI connected');

  ws.on('message', async raw => {
    let m; try { m = JSON.parse(raw.toString()); } catch { return; }
    if (m.type === 'ping')             ws.send(JSON.stringify({ type:'pong' }));
    else if (m.type === 'start_recording') await doStart(ws, m);
    else if (m.type === 'stop_recording')  await doStop(ws);
    else if (m.type === 'replay')          await doReplay(ws, m);
  });

  ws.on('close',  async () => { console.log('[Recorder] UI disconnected'); await cleanup(); });
  ws.on('error', () => {});
});

// ── Recording ─────────────────────────────────────────────────────────
async function doStart(ws, { url, browser='chromium' }) {
  await cleanup();
  ST = { browser:null, page:null, steps:[], counter:0, recording:true };

  try {
    const B = browser==='firefox'?firefox : browser==='webkit'?webkit : chromium;

    const launchOpts = { headless: false };
    if (browser !== 'firefox' && browser !== 'webkit') {
      launchOpts.args = [
        '--start-maximized',
        '--no-first-run',
        '--no-default-browser-check'
      ];
    }
    ST.browser = await B.launch(launchOpts);
    const ctx = await ST.browser.newContext({ viewport: null });
    ST.page   = await ctx.newPage();
    await ST.page.bringToFront();

    // Bridge: page → Node.js
    await ST.page.exposeFunction('__afCapture', async evt => {
      if (!ST.recording) return;
      const step = mkStep(evt.action, evt.selector, evt.value, evt.description, evt.locator);
      ST.steps.push(step);
      try {
        const buf = await ST.page.screenshot({ type:'jpeg', quality:55 });
        step.screenshot = 'data:image/jpeg;base64,' + buf.toString('base64');
      } catch {}
      safeSend(ws, { type:'step_captured', step });
    });

    // Navigate events
    let firstNav = true;
    ST.page.on('framenavigated', async frame => {
      if (frame !== ST.page.mainFrame() || !ST.recording) return;
      const u = frame.url();
      if (!u || u === 'about:blank') return;
      if (firstNav) { firstNav = false; return; } // skip the initial goto()
      const step = mkStep('navigate', u, '', `Navigate to ${u}`, { best:u, css:u });
      ST.steps.push(step);
      try {
        await ST.page.waitForLoadState('domcontentloaded',{timeout:4000}).catch(()=>{});
        const buf = await ST.page.screenshot({ type:'jpeg', quality:55 });
        step.screenshot = 'data:image/jpeg;base64,' + buf.toString('base64');
      } catch {}
      safeSend(ws, { type:'step_captured', step });
    });

    // Banner first (visual indicator), then capture script (event harvesting)
    await ST.page.addInitScript(BANNER_FN);
    await ST.page.addInitScript(CAPTURE_FN);
    await ST.page.goto(url, { waitUntil:'domcontentloaded', timeout:20000 });

    safeSend(ws, { type:'recording_started', url });
    console.log('[Recorder] Recording:', url);

  } catch (err) {
    safeSend(ws, { type:'error', message:err.message });
    await cleanup();
  }
}

async function doStop(ws) {
  ST.recording = false;
  safeSend(ws, { type:'recording_stopped', steps:ST.steps });
  console.log('[Recorder] Stopped. Steps:', ST.steps.length);
  await cleanup();
}

// ── Replay ────────────────────────────────────────────────────────────
async function doReplay(ws, { steps }) {
  await cleanup();
  if (!steps?.length) { safeSend(ws,{type:'error',message:'No steps provided'}); return; }

  safeSend(ws, { type:'replay_started', total:steps.length });

  try {
    ST.browser = await chromium.launch({ headless:false, args:['--start-maximized','--no-first-run','--no-default-browser-check'] });
    const ctx = await ST.browser.newContext({ viewport:null });
    ST.page   = await ctx.newPage();
    await ST.page.bringToFront();

    let passed=0, failed=0;

    for (const step of steps) {
      const t0 = Date.now();
      let status='passed', actualResult='', errorMessage='', screenshot=null;

      try {
        await runStep(ST.page, step);
        await ST.page.waitForTimeout(400).catch(()=>{});
        actualResult = await getActual(ST.page, step);
        passed++;
      } catch (err) {
        status='failed';
        errorMessage = err.message.slice(0,200);
        actualResult = 'Error: ' + errorMessage;
        failed++;
      }

      try {
        const buf = await ST.page.screenshot({ type:'jpeg', quality:60 });
        screenshot = 'data:image/jpeg;base64,' + buf.toString('base64');
      } catch {}

      safeSend(ws, {
        type:'step_result',
        step:{ ...step, status, duration:Date.now()-t0, errorMessage, actualResult, screenshot },
        passed, failed
      });
    }

    safeSend(ws, { type:'replay_complete', total:steps.length, passed, failed });
    console.log(`[Recorder] Replay: ${passed}✅ ${failed}❌`);

  } catch (err) {
    safeSend(ws, { type:'error', message:err.message });
  } finally {
    await cleanup();
  }
}

async function runStep(page, step) {
  const sel = step.locator?.best || step.target;
  switch (step.action) {

    case 'navigate': {
      const resp = await page.goto(step.target, { waitUntil: 'domcontentloaded', timeout: 20000 });
      // HTTP error codes (not 3xx, not 0 for non-HTTP schemes) = failure
      if (resp && !resp.ok() && resp.status() !== 0 && resp.status() !== 304) {
        throw new Error(`Navigation returned HTTP ${resp.status()} for: ${step.target}`);
      }
      break;
    }

    case 'click':
    case 'submit': {
      await page.locator(sel).first().click({ timeout: 10000 });
      // Allow any resulting navigation or DOM update to settle
      await page.waitForLoadState('domcontentloaded', { timeout: 4000 }).catch(() => {});
      break;
    }

    case 'doubleclick':
      await page.locator(sel).first().dblclick({ timeout: 10000 }); break;

    case 'type': {
      const el = page.locator(sel).first();
      await el.waitFor({ state: 'visible', timeout: 10000 });
      await el.click();
      await el.fill(step.value || '', { timeout: 10000 });
      // Verify value was actually entered (skip masked passwords)
      if (step.value && step.value !== '***') {
        const actual = await el.inputValue().catch(() => null);
        if (actual !== null && actual !== step.value) {
          await el.click({ clickCount: 3 });
          await el.fill(step.value || '');
        }
      }
      break;
    }

    case 'hover':
      await page.locator(sel).first().hover({ timeout: 10000 }); break;

    case 'select':
      await page.locator(sel).first().selectOption(step.value || '', { timeout: 10000 }); break;

    case 'assert': {
      const visible = await page.locator(sel).first()
        .waitFor({ state: 'visible', timeout: 10000 })
        .then(() => true).catch(() => false);
      if (!visible) throw new Error(`Element not visible: ${sel}`);
      break;
    }

    case 'wait':
      if (sel && sel !== 'page')
        await page.locator(sel).first().waitFor({ state: 'visible', timeout: parseInt(step.value) || 10000 });
      else
        await page.waitForTimeout(parseInt(step.value) || 2000);
      break;

    case 'scroll':
      await page.evaluate(() => window.scrollBy(0, 500)); break;

    case 'keypress':
      await page.keyboard.press(step.value || 'Enter'); break;

    default:
      await page.locator(sel).first().click({ timeout: 10000 });
  }

  // If expectedResult is set, verify it against the page state
  if (step.expectedResult && step.expectedResult.trim()) {
    await verifyExpectedResult(page, step);
  }
}

// Validate that the page matches step.expectedResult after execution
async function verifyExpectedResult(page, step) {
  const expected = step.expectedResult.trim();
  const lower = expected.toLowerCase();

  // URL assertion
  if (expected.startsWith('http') || expected.startsWith('/')) {
    const url = page.url();
    if (!url.includes(expected))
      throw new Error(`Expected URL to contain "${expected}", got "${url}"`);
    return;
  }

  // CSS / XPath element assertion
  if (expected.startsWith('#') || expected.startsWith('.') || expected.startsWith('[') || expected.startsWith('//')) {
    const visible = await page.locator(expected).first()
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true).catch(() => false);
    if (!visible) throw new Error(`Expected element "${expected}" not found on page`);
    return;
  }

  // Text content assertion (case-insensitive)
  const bodyText = await page.locator('body').textContent().catch(() => '');
  if (!bodyText.toLowerCase().includes(lower))
    throw new Error(`Expected text "${expected}" not found on page`);
}

async function getActual(page, step) {
  try {
    const url = page.url();
    const title = await page.title().catch(() => '');
    const sel = step.locator?.best || step.target;
    switch (step.action) {
      case 'navigate':
        return `Navigated to: ${url} | Title: "${title}"`;
      case 'type': {
        const val = (step.value === '***')
          ? '[password entered]'
          : await page.locator(sel).first().inputValue().catch(() => step.value || '');
        return `Value entered: "${val}" | Page: "${title}"`;
      }
      case 'select': {
        const val = await page.locator(sel).first().inputValue().catch(() => step.value || '');
        return `Selected: "${val}" | Page: "${title}"`;
      }
      case 'click':
      case 'submit':
        return `Clicked successfully | Now on: "${title}" (${url})`;
      case 'assert': {
        const vis = await page.locator(sel).first().isVisible().catch(() => false);
        return `Element ${vis ? 'visible ✓' : 'not found ✗'}: ${sel}`;
      }
      default:
        return `Completed | Page: "${title}" (${url})`;
    }
  } catch { return 'Step completed (details unavailable)'; }
}

// ── Helpers ───────────────────────────────────────────────────────────
let _id = 0;
function mkStep(action, target, value, description, locator) {
  return {
    id: Date.now() + (++_id),
    stepNumber: ST.steps.length + 1,
    action, target: target||'', value: value||'',
    expectedResult:'', description: description||'',
    locator: locator||{ best:target, css:target },
    timestamp: new Date().toISOString(),
    duration:0, status:'pending', screenshot:null
  };
}

function safeSend(ws, obj) {
  try { if (ws.readyState === 1) ws.send(JSON.stringify(obj)); } catch {}
}

console.log(`[Recorder] WebSocket server ready  →  ws://localhost:${PORT}`);
console.log('[Recorder] Waiting for AutoFlow UI to connect...');
