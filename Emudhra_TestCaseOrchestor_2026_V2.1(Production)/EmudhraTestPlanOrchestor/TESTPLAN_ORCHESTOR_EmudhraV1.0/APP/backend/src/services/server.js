/**
 * AutoFlow Tester — Playwright Backend Server
 * WebSocket server on ws://localhost:3001
 *
 * Install:  npm install ws playwright
 * Run:      node server.js
 *
 * Handles:
 *   ping              → pong
 *   start_recording   → launches Playwright browser with auto-step capture
 *   stop_recording    → stops recording, sends captured steps back
 *   replay            → executes recorded steps, streams step_result + screenshots
 */

const http = require('http');
const { WebSocketServer } = require('ws');
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const PORT = 3001;

// Screenshot directory alongside this file
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const server = http.createServer();
const wss = new WebSocketServer({ server });

console.log(`[AutoFlow] Playwright backend starting on ws://localhost:${PORT}`);

wss.on('connection', (ws) => {
  console.log('[AutoFlow] Client connected');

  let browserCtx = null;   // { browser, context, page, steps }
  let recording   = false;

  ws.on('message', async (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {

      case 'ping':
        send(ws, { type: 'pong' });
        break;

      // ── START RECORDING ──────────────────────────────────────────
      case 'start_recording': {
        if (recording) { send(ws, { type: 'error', message: 'Already recording' }); return; }
        const targetUrl = msg.url || 'about:blank';
        const browserName = (msg.browser || 'chromium').toLowerCase();

        try {
          const launchFn = browserName === 'firefox' ? require('playwright').firefox
                         : browserName === 'webkit'  ? require('playwright').webkit
                         : chromium;

          const browser = await launchFn.launch({
            headless: false,
            args: ['--start-maximized'],
          });
          const context = await browser.newContext({ viewport: null });
          const page    = await context.newPage();

          const capturedSteps = [];

          // Inject step-capture script into every page/frame
          await context.addInitScript(() => {
            window.__AF_STEPS__ = [];
            const _send = (step) => {
              window.__AF_STEPS__.push(step);
              window.__AF_STEP_SEND__ && window.__AF_STEP_SEND__(step);
            };
            const getLocator = (el) => {
              if (el.getAttribute('data-testid')) return { type: 'testId', value: el.getAttribute('data-testid') };
              if (el.id) return { type: 'id', value: '#' + el.id };
              if (el.name) return { type: 'name', value: `[name="${el.name}"]` };
              const cls = el.className && typeof el.className === 'string' ? el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
              if (cls) return { type: 'css', value: el.tagName.toLowerCase() + '.' + cls };
              return { type: 'xpath', value: '//' + el.tagName.toLowerCase() };
            };
            document.addEventListener('click', (e) => {
              const el = e.target; if (!el) return;
              const loc = getLocator(el);
              _send({ id: Date.now() + '_click', action: 'click', target: loc.value, locator: loc, timestamp: Date.now() });
            }, true);
            document.addEventListener('change', (e) => {
              const el = e.target; if (!el) return;
              const loc = getLocator(el);
              if (el.tagName === 'SELECT') {
                _send({ id: Date.now() + '_select', action: 'select', target: loc.value, value: el.value, locator: loc, timestamp: Date.now() });
              } else {
                _send({ id: Date.now() + '_type', action: 'type', target: loc.value, value: el.value, locator: loc, timestamp: Date.now() });
              }
            }, true);
          });

          // Poll for steps captured in browser
          const pollTimer = setInterval(async () => {
            if (!recording) { clearInterval(pollTimer); return; }
            try {
              const newSteps = await page.evaluate(() => {
                const s = window.__AF_STEPS__ || [];
                window.__AF_STEPS__ = [];
                return s;
              });
              for (const step of newSteps) {
                step.stepNumber = capturedSteps.length + 1;
                capturedSteps.push(step);
                send(ws, { type: 'step_captured', step });
              }
            } catch { /* page may be navigating */ }
          }, 500);

          // Capture navigation events
          page.on('framenavigated', async (frame) => {
            if (frame !== page.mainFrame()) return;
            const url = frame.url();
            if (url === 'about:blank') return;
            const step = {
              id: Date.now() + '_nav',
              action: 'navigate',
              target: url,
              locator: null,
              timestamp: Date.now(),
              stepNumber: capturedSteps.length + 1,
            };
            capturedSteps.push(step);
            send(ws, { type: 'step_captured', step });
          });

          await page.goto(targetUrl);

          browserCtx = { browser, context, page, capturedSteps, pollTimer };
          recording = true;
          send(ws, { type: 'recording_started' });
        } catch (err) {
          send(ws, { type: 'error', message: 'Failed to launch browser: ' + err.message });
        }
        break;
      }

      // ── STOP RECORDING ───────────────────────────────────────────
      case 'stop_recording': {
        if (!recording || !browserCtx) { send(ws, { type: 'error', message: 'Not currently recording' }); return; }
        recording = false;
        clearInterval(browserCtx.pollTimer);
        const steps = [...browserCtx.capturedSteps];
        try { await browserCtx.browser.close(); } catch {}
        browserCtx = null;
        send(ws, { type: 'recording_stopped', steps });
        break;
      }

      // ── REPLAY ───────────────────────────────────────────────────
      case 'replay': {
        const steps    = msg.steps || [];
        const maximize = msg.maximize !== false; // default true

        if (!steps.length) { send(ws, { type: 'error', message: 'No steps to replay' }); return; }

        send(ws, { type: 'replay_started', total: steps.length });

        let browser, context, page;
        try {
          browser = await chromium.launch({
            headless: false,
            args: maximize ? ['--start-maximized'] : [],
          });
          context = await browser.newContext({ viewport: null });
          page    = await context.newPage();
        } catch (err) {
          send(ws, { type: 'error', message: 'Failed to launch replay browser: ' + err.message });
          return;
        }

        let passed = 0, failed = 0;

        for (let i = 0; i < steps.length; i++) {
          const step = steps[i];
          const t0   = Date.now();
          let   status = 'passed', errorMessage = '', actualResult = '', screenshot = null;

          try {
            switch (step.action) {
              case 'navigate':
                await page.goto(step.target, { waitUntil: 'domcontentloaded', timeout: 30000 });
                actualResult = `Navigated to ${page.url()}`;
                break;

              case 'click':
                await page.locator(step.target).first().click({ timeout: 10000 });
                actualResult = `Clicked "${step.target}"`;
                break;

              case 'type':
                await page.locator(step.target).first().fill(step.value || '', { timeout: 10000 });
                actualResult = `Typed "${step.value}" into "${step.target}"`;
                break;

              case 'select':
                await page.locator(step.target).first().selectOption(step.value || '', { timeout: 10000 });
                actualResult = `Selected "${step.value}" in "${step.target}"`;
                break;

              case 'hover':
                await page.locator(step.target).first().hover({ timeout: 10000 });
                actualResult = `Hovered over "${step.target}"`;
                break;

              case 'doubleclick':
                await page.locator(step.target).first().dblclick({ timeout: 10000 });
                actualResult = `Double-clicked "${step.target}"`;
                break;

              case 'keypress':
                await page.keyboard.press(step.value || 'Enter');
                actualResult = `Pressed key "${step.value || 'Enter'}"`;
                break;

              case 'scroll':
                await page.evaluate((sel) => {
                  const el = sel ? document.querySelector(sel) : window;
                  if (el && el !== window) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  else window.scrollBy(0, 300);
                }, step.target || null);
                actualResult = `Scrolled "${step.target || 'page'}"`;
                break;

              case 'submit':
                await page.locator(step.target).first().press('Enter', { timeout: 10000 });
                actualResult = `Submitted form via "${step.target}"`;
                break;

              case 'wait': {
                const ms = parseInt(step.value, 10) || 1000;
                await page.waitForTimeout(ms);
                actualResult = `Waited ${ms}ms`;
                break;
              }

              case 'assert': {
                const el = await page.locator(step.target).first();
                const isVisible = await el.isVisible({ timeout: 8000 });
                if (!isVisible) throw new Error(`Element "${step.target}" is not visible`);
                const txt = await el.innerText().catch(() => '');
                if (step.value && !txt.includes(step.value)) {
                  throw new Error(`Expected text "${step.value}" not found in "${step.target}" (got "${txt.slice(0,80)}")`);
                }
                actualResult = `Asserted "${step.target}" is visible` + (txt ? ` with text "${txt.slice(0,80)}"` : '');
                break;
              }

              default:
                actualResult = `Step type "${step.action}" executed`;
            }
          } catch (err) {
            status       = 'failed';
            errorMessage = err.message;
            actualResult = `FAILED: ${err.message}`;
          }

          // Screenshot after each step
          try {
            const ssFile = path.join(SCREENSHOT_DIR, `step_${String(i + 1).padStart(3, '0')}_${Date.now()}.png`);
            await page.screenshot({ path: ssFile, fullPage: false });
            const imgBuf = fs.readFileSync(ssFile);
            screenshot = 'data:image/png;base64,' + imgBuf.toString('base64');
            // Clean up the file after encoding (keep screenshots folder tidy)
            try { fs.unlinkSync(ssFile); } catch {}
          } catch { /* non-critical */ }

          const duration = Date.now() - t0;
          if (status === 'passed') passed++; else failed++;

          send(ws, {
            type: 'step_result',
            step: {
              ...step,
              status,
              duration,
              errorMessage,
              actualResult,
              screenshot,
            },
            passed,
            failed,
          });

          // Short pause between steps for stability
          await page.waitForTimeout(200).catch(() => {});
        }

        try { await browser.close(); } catch {}

        send(ws, { type: 'replay_complete', total: steps.length, passed, failed });
        break;
      }

      default:
        console.log('[AutoFlow] Unknown message type:', msg.type);
    }
  });

  ws.on('close', () => {
    console.log('[AutoFlow] Client disconnected');
    if (browserCtx) {
      recording = false;
      clearInterval(browserCtx.pollTimer);
      browserCtx.browser.close().catch(() => {});
      browserCtx = null;
    }
  });
});

function send(ws, obj) {
  try {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj));
  } catch (err) {
    console.error('[AutoFlow] Send error:', err.message);
  }
}

server.listen(PORT, () => {
  console.log(`[AutoFlow] ✅ Backend ready — ws://localhost:${PORT}`);
  console.log(`[AutoFlow]    Playwright Chromium will launch maximized for replay`);
});
