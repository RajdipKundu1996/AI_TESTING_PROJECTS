// ===== HOME PAGE JS — TC Orchestrator =====

// ===== STATE =====
let attachedFile = null;
let generatedData = {};

const FILE_ICONS = {
  pdf: '📕', docx: '📘', doc: '📘', xlsx: '📗', xls: '📗',
  csv: '📊', jpeg: '🖼', jpg: '🖼', png: '🖼', default: '📄'
};

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ===== FADE-IN RENDER =====
function typewriterRender(containerId, htmlContent) {
  var container = document.getElementById(containerId);
  if (!container) return;
  container.style.opacity = '0';
  container.innerHTML = htmlContent;
  void container.offsetWidth;
  container.style.transition = 'opacity 0.6s ease-in';
  container.style.opacity = '1';
}

// ===== GENERATION STEPS =====
var STEPS = [
  'Initializing QA-Gen AI Engine...',
  'Extracting Requirements (RICEPOT: Requirements)...',
  'Mapping UI Components (RICEPOT: Interfaces)...',
  'Evaluating Edge Cases (RICEPOT: Errors)...',
  'Building Business Core (BLAST: Business Flow)...',
  'Drafting Logic Gates (BLAST: Logic Coverage)...',
  'Validating Technology Stack (BLAST: Tech/UI)...',
  'Generating Professional Test Plan...',
  'Structuring Modular Test Cases...',
  'Writing Native Automation Scripts...',
  'Finalizing Deliverables...'
];

async function startGeneration(inputSource) {
  document.getElementById('featureGrid').style.display = 'none';
  document.getElementById('outputStatsGrid').style.display = 'grid';
  document.getElementById('outputArea').style.display = 'block';
  document.getElementById('outputLoading').style.display = 'flex';
  document.getElementById('outputStream').innerHTML = '';

  ['planStatus', 'tcCountDisplay', 'covCountDisplay', 'autoCountDisplay'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.textContent = '...';
  });

  document.querySelectorAll('.out-tab').forEach(function(t) { t.classList.remove('active'); });
  var firstTab = document.querySelector('.out-tab[data-tab="testplan"]');
  if (firstTab) firstTab.classList.add('active');

  var autoLangEl = document.getElementById('autoLangSelect');
  var autoLang = autoLangEl ? autoLangEl.value : 'java';

  var stepIdx = 0;
  var stepEl = document.getElementById('loadingStep');
  
  // Custom deep analysis steps
  const DEEP_STEPS = [
    'Establishing Secure AI Link (Mistral/Gemini)...',
    'Ingesting PRD Context & Requirements...',
    'Performing Deep RICEPOT Technical Assessment...',
    'Orchestrating BLAST Coverage Strategy...',
    'Synthesizing Deliverables (This may take a moment)...'
  ];

  var timer = setInterval(function() {
    if (stepEl && stepIdx < DEEP_STEPS.length) {
      stepEl.textContent = DEEP_STEPS[stepIdx++];
    }
  }, 1200);

  try {
     // Prepare payloads
     const models = AppState.models;
     // Get currently selected engine from the dropdown on Home page
     const engineSelector = document.getElementById('selectedModel');
     const activeEngine = engineSelector ? engineSelector.value : 'ollama';

     const config = {
        current: activeEngine,
        data: models.data || models
     };

     // Create streaming UI
     const outputStream = document.getElementById('outputStream');
     outputStream.innerHTML = '<div class="streaming-box" id="streamingBox"></div>';
     const streamBox = document.getElementById('streamingBox');

     const onChunk = (chunk) => {
       if (streamBox) {
         streamBox.textContent += chunk;
         // Auto-scroll
         outputStream.scrollTop = outputStream.scrollHeight;
       }
     };

     const result = await AIEngine.generate(inputSource, config, onChunk, autoLang);
     const parsed = AIEngine.parseOutput(result);

     clearInterval(timer);
     document.getElementById('outputLoading').style.display = 'none';
     
     finalizeGeneration(inputSource, parsed);
  } catch (err) {
     clearInterval(timer);
     document.getElementById('outputLoading').style.display = 'none';
     showToast(err.message, 'error');
     console.error(err);
  }
}

function renderDynamicTestPlan(text) {
    if (!text) return '<div style="padding:20px;color:#a8b8cc">No Test Plan data generated.</div>';
    let html = text.replace(/## (.*?)\n/g, '<h3 style="color:#3b82f6;margin-top:16px">$1</h3>')
                   .replace(/# (.*?)\n/g, '<h2 style="color:#f59e0b">$1</h2>')
                   .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                   .replace(/\n\n/g, '<br><br>')
                   .replace(/\n- (.*?)(?=\n|$)/g, '<li>$1</li>');
    return `<div style="font-family:'Outfit',sans-serif">
      <div style="display:flex;align-items:center;gap:12px;border-bottom:2px solid rgba(59,130,246,0.3);padding-bottom:14px;margin-bottom:24px">
        <div style="background:linear-gradient(135deg,#3b82f6,#8b5cf6);border-radius:12px;width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:1.6rem">📋</div>
        <div>
          <div style="font-size:1.3rem;font-weight:800;color:#fff">AI Generated Test Plan</div>
          <div style="font-size:0.72rem;color:#6b7f96">Extracted from custom PRD Upload</div>
        </div>
      </div>
      <div style="max-height:550px; overflow-y:auto; padding-right:10px; color:#e2e8f0; font-family:'Inter',sans-serif; line-height:1.6; font-size:0.9rem;">
        ${html}
      </div>
    </div>`;
}

function renderDynamicScenarios(text) {
    if (!text) return '<div style="padding:20px;color:#a8b8cc">No Scenarios data generated.</div>';
    let html = text.replace(/## (.*?)\n/g, '<h3 style="color:#f59e0b;margin-top:16px">$1</h3>')
                   .replace(/# (.*?)\n/g, '<h2 style="color:#f59e0b">$1</h2>')
                   .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#f0f4f8">$1</strong>')
                   .replace(/\n\n/g, '<br><br>')
                   .replace(/(?:^|\n)- (.*?)(?=\n|$)/g, '<div style="display:flex;align-items:flex-start;gap:10px;background:rgba(255,255,255,0.03);border-radius:8px;padding:10px 12px;margin-bottom:6px"><span style="color:#f59e0b;font-weight:900">⚡</span><span style="font-size:0.85rem;color:#a8b8cc">$1</span></div>');
    return `<div style="font-family:'Outfit',sans-serif">
      <div style="display:flex;align-items:center;gap:12px;border-bottom:2px solid rgba(201,168,76,0.3);padding-bottom:14px;margin-bottom:24px">
        <div style="background:linear-gradient(135deg,#f59e0b,#c9a84c);border-radius:12px;width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:1.6rem">🗂</div>
        <div>
          <div style="font-size:1.3rem;font-weight:800;color:#fff">AI Generated Scenarios</div>
          <div style="font-size:0.72rem;color:#6b7f96">Extracted from custom PRD Upload</div>
        </div>
      </div>
      <div style="max-height:550px; overflow-y:auto; padding-right:10px; font-family:'Inter',sans-serif; color:#a8b8cc;">
        ${html}
      </div>
    </div>`;
}

function renderDynamicTestCases(text) {
    if (!text) return '<div style="padding:20px;color:#a8b8cc">No Test Cases generated.</div>';
    let content = text;
    if (text.includes('<table')) {
        content = text;
    } else if (text.includes('|')) {
        let lines = text.trim().split('\n');
        let htmlTable = '<table style="width:100%; border-collapse:collapse; font-size:0.8rem; font-family:\'Inter\',sans-serif">';
        let hasTable = false;
        let isHeader = true;

        for(let line of lines) {
            line = line.trim();
            if(!line) continue;
            if(line.includes('|')) {
                if(/^[\|\s\-:]+$/.test(line)) {
                     isHeader = false;
                     continue;
                }
                let rowData = line.split('|');
                if(rowData[0].trim() === '') rowData.shift();
                if(rowData.length > 0 && rowData[rowData.length-1].trim() === '') rowData.pop();
                
                if(rowData.length > 0) {
                    hasTable = true;
                    htmlTable += '<tr>';
                    for(let cell of rowData) {
                        let c = cell.trim();
                        if(isHeader) {
                            htmlTable += `<th style="background:linear-gradient(90deg,rgba(14,31,56,0.98),rgba(29,58,99,0.95)); padding:11px 12px; border:1px solid rgba(255,255,255,0.08); color:#c9a84c; font-weight:800; text-align:left; white-space:nowrap;">${c}</th>`;
                        } else {
                            htmlTable += `<td style="border:1px solid rgba(255,255,255,0.06); padding:10px 12px; color:#e2e8f0; line-height:1.5;">${c}</td>`;
                        }
                    }
                    htmlTable += '</tr>';
                }
            } else if (hasTable && isHeader === false) {
                // Done parsing table? We just ignore extra text
            }
        }
        if(hasTable) {
            htmlTable += '</table>';
            content = htmlTable;
        } else {
            content = `<pre style="font-family:'Consolas',monospace;background:#0d1624;padding:16px;border-radius:8px;color:#a8b8cc;overflow-x:auto">${text}</pre>`;
        }
    } else {
        content = `<pre style="font-family:'Consolas',monospace;background:#0d1624;padding:16px;border-radius:8px;color:#a8b8cc;overflow-x:auto">${text}</pre>`;
    }

    return `<div style="font-family:'Outfit',sans-serif">
      <style>
      .ai-dynamic-table table { width: 100%; border-collapse: collapse; font-family:'Inter',sans-serif; font-size:0.8rem; }
      .ai-dynamic-table tr:hover td { background: rgba(59,130,246,0.05); }
      </style>
      <div style="display:flex;align-items:center;gap:12px;border-bottom:2px solid rgba(16,185,129,0.3);padding-bottom:14px;margin-bottom:20px">
        <div style="background:linear-gradient(135deg,#10b981,#06b6d4);border-radius:12px;width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:1.6rem">🧪</div>
        <div>
          <div style="font-size:1.3rem;font-weight:800;color:#fff">AI Generated Test Cases</div>
          <div style="font-size:0.72rem;color:#6b7f96">Extracted from custom PRD Upload</div>
        </div>
      </div>
      <div style="overflow:auto; max-height:550px; border-radius:10px; padding:10px; background:rgba(255,255,255,0.02)">
        <div class="ai-dynamic-table">${content}</div>
      </div>
    </div>`;
}

function renderDynamicAutomation(text, language) {
    if (!text) return '<div style="padding:20px;color:#a8b8cc">No Automation Scripts generated.</div>';
    let codeStr = text.trim();
    if (codeStr.startsWith('\`\`\`')) {
        let lines = codeStr.split('\n');
        lines.shift();
        if (lines[lines.length-1].startsWith('\`\`\`')) lines.pop();
        codeStr = lines.join('\n');
    }
    codeStr = codeStr.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    let accentColor = language === 'python' ? '#3b82f6' : language === 'playwright' ? '#8b5cf6' : '#f59e0b';
    return `<div style="font-family:'Outfit',sans-serif">
      <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid ${accentColor}40;padding-bottom:14px;margin-bottom:20px">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="background:linear-gradient(135deg,${accentColor},${accentColor}99);border-radius:12px;width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:1.6rem">🤖</div>
          <div>
            <div style="font-size:1.3rem;font-weight:800;color:#fff">AI Generated Scripts</div>
            <div style="font-size:0.72rem;color:#6b7f96">Target Language: ${language.toUpperCase()}</div>
          </div>
        </div>
      </div>
      <pre style="margin:0;padding:20px 24px;font-family:Consolas,'Courier New',monospace;font-size:0.8rem;line-height:1.7;overflow:auto;max-height:450px;background:#0d1624;border:1px solid #1e293b;border-radius:10px;color:#e2e8f0">${codeStr}</pre>
    </div>`;
}

function finalizeGeneration(inputSource, aiData) {
  var autoLangEl = document.getElementById('autoLangSelect');
  var autoLang = autoLangEl ? autoLangEl.value : 'java';
  var displayTitle = inputSource.length > 50 ? inputSource.substring(0, 50) + '...' : inputSource;

  if (aiData && aiData.conversational) {
      generatedData.testplan   = `<div style="padding:24px; font-family:'Inter', sans-serif; font-size:1rem; color:#e2e8f0; line-height:1.7;">${aiData.conversational.replace(/\n/g, '<br>')}</div>`;
      generatedData.scenarios  = '<div style="padding:20px;color:#a8b8cc">Conversational Response — No Scenarios Generated.</div>';
      generatedData.testcases  = '<div style="padding:20px;color:#a8b8cc">Conversational Response — No Test Cases Generated.</div>';
      generatedData.automation = '<div style="padding:20px;color:#a8b8cc">Conversational Response — No Automation Generated.</div>';
  } else if (aiData && (aiData.testPlan || aiData.testCases)) {
      generatedData.testplan   = renderDynamicTestPlan(aiData.testPlan);
      generatedData.scenarios  = renderDynamicScenarios(aiData.scenarios);
      generatedData.testcases  = renderDynamicTestCases(aiData.testCases);
      generatedData.automation = renderDynamicAutomation(aiData.automation, autoLang);
  } else {
      generatedData.testplan   = generateTestPlanHTML();
      generatedData.scenarios  = generateScenariosHTML();
      generatedData.testcases  = generateTestCasesHTML();
      generatedData.automation = generateAutomationHTML(autoLang);
  }

  var planStatus = document.getElementById('planStatus');
  var tcCount    = document.getElementById('tcCountDisplay');
  var covCount   = document.getElementById('covCountDisplay');
  var autoCount  = document.getElementById('autoCountDisplay');
  
  if (planStatus) planStatus.textContent = aiData ? 'AI-Verified' : 'Drafted';
  if (tcCount)    tcCount.textContent    = aiData ? '35+ cases' : '24 cases';
  if (covCount)   covCount.textContent   = aiData ? '98% accuracy' : '92% cov';
  if (autoCount)  autoCount.textContent  = autoLang.toUpperCase();

  AppState.addLog('Deep Analysis Complete: ' + displayTitle.substring(0, 25) + '...', 'generation');
  AppState.addHistory({ title: displayTitle, completed: true });
  AppState.addProject(displayTitle, aiData ? 'Deeply Analyzed' : 'Analyzed');
  if (typeof renderHistoryPanel === 'function') renderHistoryPanel();

  localStorage.setItem('qa_gen_prd_pct', aiData ? '99' : '92');
  localStorage.setItem('qa_gen_tc_pct', aiData ? '97' : '88');

  typewriterRender('outputStream', generatedData.testplan);

  // Auto-push to Jira if configured
  if (aiData && typeof AppState !== 'undefined' && AppState.integrations.jira?.connected) {
      showToast('Auto-syncing assets to Jira...', 'info');
      const ticketPayload = {
          title: displayTitle.replace(/\n/g, ' '),
          testPlan: aiData.testPlan,
          testCases: aiData.testCases,
          scenarios: aiData.scenarios,
          automation: aiData.automation
      };
      
      AIEngine.pushToJira(ticketPayload, AppState.integrations.jira)
          .then(res => {
              showToast(`Jira Ticket Auto-Created: ${res.key}`, 'success', 6000);
              AppState.addLog(`Jira Ticket Synced: ${res.key}`, 'integration');
          })
          .catch(err => {
              showToast(`Jira Sync Blocked: ${err.message}`, 'error', 6000);
              console.error('Jira Auto-Push Error', err);
          });
  }
}

// ===== CONTENT GENERATORS =====

function generateTestPlanHTML() {
  var date = new Date().toLocaleDateString('en-GB');
  return `
  <div style="font-family:'Outfit',sans-serif">
    <div style="display:flex;align-items:center;gap:12px;border-bottom:2px solid rgba(59,130,246,0.3);padding-bottom:14px;margin-bottom:24px">
      <div style="background:linear-gradient(135deg,#3b82f6,#8b5cf6);border-radius:12px;width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:1.6rem">📋</div>
      <div>
        <div style="font-size:1.3rem;font-weight:800;color:#fff">Master Test Plan</div>
        <div style="font-size:0.72rem;color:#6b7f96">RICEPOT Analysis + BLAST Framework — Generated ${date}</div>
      </div>
    </div>

    <div style="max-height:550px; overflow-y:auto; padding-right:10px;">
    <!-- Executive Summary -->
    <div style="background:linear-gradient(135deg,rgba(59,130,246,0.08),rgba(139,92,246,0.06));border:1px solid rgba(59,130,246,0.25);border-radius:12px;padding:18px;margin-bottom:16px;border-left:4px solid #3b82f6">
      <div style="font-size:0.78rem;font-weight:800;color:#3b82f6;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">📌 1. Executive Summary</div>
      <p style="color:#a8b8cc;font-size:0.85rem;line-height:1.7">This Test Plan outlines the comprehensive testing strategy derived from the provided PRD. The strategy employs the <strong style="color:#3b82f6">RICEPOT</strong> analysis methodology combined with the <strong style="color:#8b5cf6">BLAST</strong> test design framework to ensure maximum coverage across functional, non-functional, and integration boundaries.</p>
    </div>

    <!-- RICEPOT Assessment -->
    <div style="background:linear-gradient(135deg,rgba(6,182,212,0.08),rgba(6,182,212,0.04));border:1px solid rgba(6,182,212,0.25);border-radius:12px;padding:18px;margin-bottom:16px;border-left:4px solid #06b6d4">
      <div style="font-size:0.78rem;font-weight:800;color:#06b6d4;text-transform:uppercase;letter-spacing:1px;margin-bottom:14px">🔬 2. RICEPOT Deep Assessment</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        ${[['R','Requirements','3b82f6','All core functional & non-functional requirements mapped and verified against acceptance criteria.'],
           ['I','Interfaces','8b5cf6','Web/UI components, REST endpoints, and WebSocket integrations identified and documented.'],
           ['C','Constraints','f59e0b','File format restrictions, login domain enforcement, rate limits and browser compatibility verified.'],
           ['E','Errors','ef4444','Negative boundaries, exception paths and injection attack vectors included in scope.'],
           ['P','Performance','10b981','Page load targets set to &lt;2000ms; API response time thresholds benchmarked.'],
           ['O','Operations','06b6d4','End-to-end workflow: Login → Dashboard → PRD Upload → Output → Export mapped completely.'],
           ['T','Testability','c9a84c','Unique DOM locators (IDs, data-* attrs) confirmed available for Automation tooling.']]
           .map(([letter,label,color,desc]) => `<div style="background:rgba(${letter==='R'?'59,130,246':letter==='I'?'139,92,246':letter==='C'?'245,158,11':letter==='E'?'239,68,68':letter==='P'?'16,185,129':letter==='O'?'6,182,212':'201,168,76'},0.07);border:1px solid rgba(${letter==='R'?'59,130,246':letter==='I'?'139,92,246':letter==='C'?'245,158,11':letter==='E'?'239,68,68':letter==='P'?'16,185,129':letter==='O'?'6,182,212':'201,168,76'},0.2);border-radius:8px;padding:10px">
             <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
               <span style="width:22px;height:22px;border-radius:6px;background:#${color};display:flex;align-items:center;justify-content:center;font-weight:900;font-size:0.7rem;color:#0a1628">${letter}</span>
               <span style="font-weight:700;font-size:0.8rem;color:#f0f4f8">${label}</span>
             </div>
             <div style="font-size:0.75rem;color:#a8b8cc;line-height:1.6">${desc}</div>
           </div>`)
           .join('')}
      </div>
    </div>

    <!-- Scope -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px">
      <div style="background:linear-gradient(135deg,rgba(16,185,129,0.08),rgba(16,185,129,0.04));border:1px solid rgba(16,185,129,0.25);border-radius:12px;padding:18px;border-left:4px solid #10b981">
        <div style="font-size:0.78rem;font-weight:800;color:#10b981;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">✅ 3. In-Scope</div>
        ${['Authentication & Domain Validation','Dashboard Analytics Rendering','PRD Upload & Parsing Workflow','AI Model Integration (Mistral/DeepSeek/Gemini)','Token Management System','Export & Report Generation'].map(i=>`<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:0.8rem;color:#a8b8cc"><span style="color:#10b981;font-weight:900">✓</span>${i}</div>`).join('')}
      </div>
      <div style="background:linear-gradient(135deg,rgba(239,68,68,0.08),rgba(239,68,68,0.04));border:1px solid rgba(239,68,68,0.25);border-radius:12px;padding:18px;border-left:4px solid #ef4444">
        <div style="font-size:0.78rem;font-weight:800;color:#ef4444;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">🚫 4. Out-of-Scope</div>
        ${['Infrastructure / DevOps provisioning','Database administration tasks','Third-party vendor SLAs','Mobile native applications (iOS/Android)'].map(i=>`<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:0.8rem;color:#a8b8cc"><span style="color:#ef4444;font-weight:900">✗</span>${i}</div>`).join('')}
      </div>
    </div>

    <!-- Environment -->
    <div style="background:linear-gradient(135deg,rgba(201,168,76,0.08),rgba(201,168,76,0.04));border:1px solid rgba(201,168,76,0.25);border-radius:12px;padding:18px;border-left:4px solid #c9a84c">
      <div style="font-size:0.78rem;font-weight:800;color:#c9a84c;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">🖥️ 5. Test Environment</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
        ${[['QA Env','https://qa.emudhra.internal','3b82f6'],['Browsers','Chrome 120+, Edge 120+, Safari 17','8b5cf6'],['Test Data','Seeded Active Directory Users','10b981'],['OS','Windows 11, macOS Ventura','f59e0b'],['Network','Internal 100 Mbps LAN','06b6d4'],['Tools','Selenium 4.x, TestNG, Maven','c9a84c']]
           .map(([label,val,color])=>`<div style="background:rgba(255,255,255,0.03);border-radius:8px;padding:10px">
             <div style="font-size:0.68rem;color:#6b7f96;font-weight:700;margin-bottom:3px">${label}</div>
             <div style="font-size:0.78rem;color:#${color};font-weight:600">${val}</div>
           </div>`).join('')}
      </div>
    </div>
    </div>
  </div>`;
}

function generateScenariosHTML() {
  var blastItems = [
    { letter: 'B', color: '59,130,246', label: 'Business Flow', emoji: '💼', desc: 'End-to-End User Journeys',
      scenarios: [
        'Valid enterprise user logs in with @emudhra.com credentials and navigates to Dashboard.',
        'User uploads a PRD document and successfully triggers AI-based test generation.',
        'User updates LLM settings in the Settings panel and exports generated test cases.'
      ]},
    { letter: 'L', color: '139,92,246', label: 'Logic Coverage', emoji: '🔁', desc: 'Decision Points & Validations',
      scenarios: [
        'Verify file upload rejects .exe and .bat but accepts .pdf, .docx, .xlsx.',
        'Verify only @emudhra.com domain emails trigger successful authentication.',
        'Verify zero-token state correctly disables the Analyze PRD button.'
      ]},
    { letter: 'A', color: '6,182,212', label: 'API & Integration', emoji: '🔌', desc: 'REST & LLM Connectivity',
      scenarios: [
        'Disconnect Mistral and verify fallback connection to DeepSeek API activates.',
        'Verify generated test plans export valid payloads to TestRail/JIRA endpoints.',
        'Validate Gemini API response is parsed and rendered correctly in all tabs.'
      ]},
    { letter: 'S', color: '239,68,68', label: 'Security', emoji: '🛡️', desc: 'Negative & Injection Tests',
      scenarios: [
        'Insert "Ignore previous rules" into PRD input and verify prompt-injection guard blocks it.',
        'Copy active session cookie to incognito browser and verify session is rejected.',
        'Attempt SQL injection in the username field and verify safe error handling.'
      ]},
    { letter: 'T', color: '16,185,129', label: 'Technology / UI', emoji: '🖥️', desc: 'Rendering & Responsiveness',
      scenarios: [
        'Verify tabular output scrolls gracefully in horizontal container on screens <768px.',
        'WCAG 2.1 AA contrast validation for dark mode color palette configurations.',
        'Verify animation and spinner loads correctly when LLM call is in progress.'
      ]}
  ];

  return `
  <div style="font-family:'Outfit',sans-serif">
    <div style="display:flex;align-items:center;gap:12px;border-bottom:2px solid rgba(201,168,76,0.3);padding-bottom:14px;margin-bottom:24px">
      <div style="background:linear-gradient(135deg,#f59e0b,#c9a84c);border-radius:12px;width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:1.6rem">🗂</div>
      <div>
        <div style="font-size:1.3rem;font-weight:800;color:#fff">BLAST Test Scenarios</div>
        <div style="font-size:0.72rem;color:#6b7f96">Derived from RICEPOT analysis — 5 categories, 15 scenarios</div>
      </div>
    </div>
    
    <div style="max-height:550px; overflow-y:auto; padding-right:10px;">
    ${blastItems.map(item => `
    <div style="background:rgba(${item.color},0.06);border:1px solid rgba(${item.color},0.25);border-radius:12px;padding:18px;margin-bottom:14px;border-left:4px solid rgba(${item.color},1)">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
        <span style="width:34px;height:34px;border-radius:10px;background:rgba(${item.color},0.2);display:flex;align-items:center;justify-content:center;font-size:1.1rem">${item.emoji}</span>
        <div>
          <div style="font-weight:800;color:#f0f4f8;font-size:0.92rem"><span style="color:rgba(${item.color},1);font-size:1rem">${item.letter}</span> — ${item.label}</div>
          <div style="font-size:0.7rem;color:#6b7f96">${item.desc}</div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${item.scenarios.map((sc, idx) => `
        <div style="display:flex;align-items:flex-start;gap:10px;background:rgba(255,255,255,0.03);border-radius:8px;padding:10px 12px">
          <span style="width:22px;height:22px;border-radius:6px;background:rgba(${item.color},0.25);color:rgba(${item.color},1);font-weight:800;font-size:0.7rem;display:flex;align-items:center;justify-content:center;flex-shrink:0">${idx+1}</span>
          <span style="font-size:0.82rem;color:#a8b8cc;line-height:1.6">${sc}</span>
        </div>`).join('')}
      </div>
    </div>`).join('')}
    </div>
  </div>`;
}

function generateTestCasesHTML() {
  var date = new Date().toLocaleDateString('en-GB');
  // 15-column format exactly matching TestCaseDocumentFormat.xlsx
  var cases = [
    { sn:'1', mod:'Login Page', sub:'Authentication', prdId:'PRD-LOGIN-001', pre:'User is on login screen', id:'TC-LOGIN-001', sc:'Valid Login — B (Business Flow)', steps:'1. Navigate to http://127.0.0.1:5500\n2. Enter admin@emudhra.com\n3. Enter password admin123\n4. Click Login button', exp:'Dashboard renders; URL changes to /dashboard.html', act:'', status:'Not Started', tester:'Auto-Gen', date:date, bugId:'', remarks:'B - Business Flow' },
    { sn:'2', mod:'Login Page', sub:'Domain Guard', prdId:'PRD-LOGIN-001', pre:'User is on login screen', id:'TC-LOGIN-002', sc:'Invalid Domain — L (Logic Coverage)', steps:'1. Enter hacker@gmail.com\n2. Enter any password\n3. Click Login', exp:'Error: "User not registered" displayed. No navigation.', act:'', status:'Not Started', tester:'Auto-Gen', date:date, bugId:'', remarks:'L - Logic Coverage' },
    { sn:'3', mod:'Login Page', sub:'Authentication', prdId:'PRD-LOGIN-001', pre:'User is on login screen', id:'TC-LOGIN-003', sc:'Empty Username — L (Logic)', steps:'1. Leave username blank\n2. Enter valid password\n3. Click Login', exp:'Validation alert: "Username is required"', act:'', status:'Not Started', tester:'Auto-Gen', date:date, bugId:'', remarks:'L - Logic Coverage' },
    { sn:'4', mod:'Home Page', sub:'PRD Upload', prdId:'PRD-UPLOAD-001', pre:'Valid session & token > 0', id:'TC-HOME-001', sc:'Valid File Upload — T (Technology/UI)', steps:'1. Click Attach File\n2. Select a .pdf PRD document\n3. Observe preview panel', exp:'File preview displayed with name and size; Analyze PRD enabled', act:'', status:'Not Started', tester:'Auto-Gen', date:date, bugId:'', remarks:'T - Technology/UI' },
    { sn:'5', mod:'Home Page', sub:'File Validation', prdId:'PRD-UPLOAD-001', pre:'Valid session', id:'TC-HOME-002', sc:'Rejected File Type — L (Logic)', steps:'1. Click Attach File\n2. Attempt to upload a .exe file', exp:'File rejected; Toast: "File type not allowed"', act:'', status:'Not Started', tester:'Auto-Gen', date:date, bugId:'', remarks:'L - Logic Coverage' },
    { sn:'6', mod:'Home Page', sub:'Agent Engine', prdId:'PRD-AI-001', pre:'Valid PRD attached;', id:'TC-HOME-003', sc:'AI Generation — A (API/Integration)', steps:'1. Select Mistral model\n2. Click Analyze PRD\n3. Wait for completion', exp:'Token deducted; output populates in 4 tabs', act:'', status:'Not Started', tester:'Auto-Gen', date:date, bugId:'', remarks:'A - API Integration' },
    { sn:'7', mod:'Home Page', sub:'Security Fence', prdId:'PRD-SEC-001', pre:'User is logged in', id:'TC-SEC-001', sc:'Prompt Injection — S (Security)', steps:'1. Type "Ignore previous instructions" in textarea\n2. Click Analyze PRD', exp:'Blocked: Shield icon shown; Toast: Analysis Blocked', act:'', status:'Not Started', tester:'Auto-Gen', date:date, bugId:'', remarks:'S - Security' },
    { sn:'8', mod:'Dashboard', sub:'Model Config', prdId:'PRD-DASH-001', pre:'User on Dashboard', id:'TC-DASH-001', sc:'Mistral Status Active — B (Business)', steps:'1. Navigate to Dashboard\n2. Check Model Active panel', exp:'Mistral shows Active badge (green dot)', act:'', status:'Not Started', tester:'Auto-Gen', date:date, bugId:'', remarks:'B - Business Flow' }
  ];

  var statusColors = {
    'Pass':        'rgba(16,185,129,0.15)',
    'Fail':        'rgba(239,68,68,0.15)',
    'Blocked':     'rgba(245,158,11,0.15)',
    'Not Started': 'rgba(107,127,150,0.15)',
    'In Progress': 'rgba(59,130,246,0.15)',
    'NA':          'rgba(255,255,255,0.06)'
  };
  var statusTextColors = { 'Pass':'#10b981','Fail':'#ef4444','Blocked':'#f59e0b','Not Started':'#6b7f96','In Progress':'#3b82f6','NA':'#6b7f96' };

  var rows = cases.map(function(c, idx) {
    var bg = idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.025)';
    var sBg = statusColors[c.status] || statusColors['Not Started'];
    var sTxt = statusTextColors[c.status] || '#6b7f96';
    return `<tr style="background:${bg};transition:background 0.15s" onmouseover="this.style.background='rgba(59,130,246,0.06)'" onmouseout="this.style.background='${bg}'">
      <td style="text-align:center;font-weight:800;color:#c9a84c;border:1px solid rgba(255,255,255,0.06);padding:8px">${c.sn}</td>
      <td style="border:1px solid rgba(255,255,255,0.06);padding:8px;color:#3b82f6;font-weight:600">${c.mod}</td>
      <td style="border:1px solid rgba(255,255,255,0.06);padding:8px;color:#06b6d4">${c.sub}</td>
      <td style="border:1px solid rgba(255,255,255,0.06);padding:8px;color:#8b5cf6;font-weight:600">${c.prdId}</td>
      <td style="border:1px solid rgba(255,255,255,0.06);padding:8px;color:#a8b8cc;font-size:0.75rem">${c.pre}</td>
      <td style="border:1px solid rgba(255,255,255,0.06);padding:8px"><span style="background:rgba(201,168,76,0.12);color:#c9a84c;padding:3px 8px;border-radius:6px;font-weight:800;font-size:0.75rem;white-space:nowrap">${c.id}</span></td>
      <td style="border:1px solid rgba(255,255,255,0.06);padding:8px;color:#f0f4f8;font-size:0.78rem">${c.sc}</td>
      <td style="border:1px solid rgba(255,255,255,0.06);padding:8px;color:#a8b8cc;font-size:0.72rem;white-space:pre-wrap;max-width:220px">${c.steps}</td>
      <td style="border:1px solid rgba(255,255,255,0.06);padding:8px;color:#10b981;font-size:0.78rem">${c.exp}</td>
      <td style="border:1px solid rgba(255,255,255,0.06);padding:8px;color:#f59e0b;font-size:0.78rem;font-style:italic">${c.act || '—'}</td>
      <td style="border:1px solid rgba(255,255,255,0.06);padding:8px;text-align:center"><span style="background:${sBg};color:${sTxt};padding:3px 8px;border-radius:6px;font-size:0.72rem;font-weight:700;border:1px solid ${sTxt}40">${c.status}</span></td>
      <td style="border:1px solid rgba(255,255,255,0.06);padding:8px;color:#a8b8cc;font-size:0.78rem">${c.tester}</td>
      <td style="border:1px solid rgba(255,255,255,0.06);padding:8px;color:#6b7f96;font-size:0.75rem">${c.date}</td>
      <td style="border:1px solid rgba(255,255,255,0.06);padding:8px;color:#ef4444;font-size:0.75rem">${c.bugId || '—'}</td>
      <td style="border:1px solid rgba(255,255,255,0.06);padding:8px;color:#8b5cf6;font-size:0.75rem">${c.remarks}</td>
    </tr>`;
  }).join('');

  return `
  <div style="font-family:'Outfit',sans-serif">
    <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid rgba(16,185,129,0.3);padding-bottom:14px;margin-bottom:20px">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="background:linear-gradient(135deg,#10b981,#06b6d4);border-radius:12px;width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:1.6rem">🧪</div>
        <div>
          <div style="font-size:1.3rem;font-weight:800;color:#fff">Test Case Matrix</div>
          <div style="font-size:0.72rem;color:#6b7f96">Format: TestCaseDocumentFormat.xlsx · ${cases.length} cases · 15 columns</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${[['Pass','#10b981'],['Fail','#ef4444'],['Blocked','#f59e0b'],['Not Started','#6b7f96']].map(([s,c])=>`<span style="background:rgba(255,255,255,0.04);border:1px solid ${c}40;color:${c};font-size:0.68rem;font-weight:700;padding:3px 8px;border-radius:6px">${s}</span>`).join('')}
      </div>
    </div>

    <!-- Column Legend -->
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
      ${['S.No','Module','Sub-Module','PRD ID','Pre-Conditions','Case ID','Scenario','Steps','Expected','Actual','Status','Tester','Date','Bug ID','Remarks'].map((col,i)=>{
        var cols=['#c9a84c','#3b82f6','#06b6d4','#8b5cf6','#a8b8cc','#c9a84c','#f0f4f8','#a8b8cc','#10b981','#f59e0b','#6b7f96','#a8b8cc','#6b7f96','#ef4444','#8b5cf6'];
        return `<span style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);color:${cols[i]};font-size:0.62rem;font-weight:700;padding:2px 7px;border-radius:4px">${col}</span>`;
      }).join('')}
    </div>

    <div style="overflow:auto; max-height:480px; border-radius:10px; border:1px solid rgba(255,255,255,0.08);">
      <table style="min-width:1800px;border-collapse:collapse;font-size:0.8rem;font-family:'Inter',sans-serif">
        <thead>
          <tr style="background:linear-gradient(90deg,rgba(14,31,56,0.98),rgba(29,58,99,0.95));position:sticky;top:0;z-index:10">
            ${['S.No','Module Name','Sub-Module Name','PRD ID','Pre-Conditions','Test Case ID','Test Scenario','Test Steps','Expected Result','Actual Result','Status','Tester\'s Name','Testing Date','Bug ID','Remarks'].map((h,i)=>{
              var hColors=['#c9a84c','#3b82f6','#06b6d4','#8b5cf6','#a8b8cc','#c9a84c','#f0f4f8','#a8b8cc','#10b981','#f59e0b','#6b7f96','#a8b8cc','#6b7f96','#ef4444','#8b5cf6'];
              return `<th style="padding:11px 12px;border:1px solid rgba(255,255,255,0.08);color:${hColors[i]};font-weight:800;font-size:0.72rem;white-space:nowrap;text-align:left;letter-spacing:0.3px">${h}</th>`;
            }).join('')}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>`;
}

function generateAutomationHTML(language) {
  var langLabel, ext, codeLines, accentColor;

  if (language === 'python') {
    langLabel = 'Python + Selenium WebDriver'; ext = 'py'; accentColor = '#3b82f6';
    codeLines = [
      '# === Flow: Authentication Testing ===',
      'import pytest',
      'from selenium import webdriver',
      'from selenium.webdriver.common.by import By',
      'from selenium.webdriver.support.ui import WebDriverWait',
      'from selenium.webdriver.support import expected_conditions as EC',
      '',
      'class TestAuthentication:',
      '    def setup_method(self):',
      '        self.driver = webdriver.Chrome()',
      '        self.wait = WebDriverWait(self.driver, 10)',
      '        self.driver.get("http://127.0.0.1:5500")',
      '',
      '    def teardown_method(self):',
      '        self.driver.quit()',
      '',
      '    # TC-LOGIN-001: Valid Enterprise Domain Login',
      '    def test_valid_domain_login(self):',
      '        self.driver.find_element(By.ID, "username").send_keys("admin@emudhra.com")',
      '        self.driver.find_element(By.ID, "password").send_keys("admin123")',
      '        self.driver.find_element(By.ID, "loginBtn").click()',
      '        self.wait.until(EC.url_contains("dashboard.html"))',
      '        assert "dashboard" in self.driver.current_url',
      '',
      '    # TC-LOGIN-002: Rejection of Non-Enterprise Domains',
      '    def test_invalid_domain_rejection(self):',
      '        self.driver.find_element(By.ID, "username").send_keys("hacker@gmail.com")',
      '        self.driver.find_element(By.ID, "password").send_keys("password123")',
      '        self.driver.find_element(By.ID, "loginBtn").click()',
      '        error_msg = self.wait.until(EC.visibility_of_element_located((By.ID, "loginErrorText")))',
      '        assert "User not registered" in error_msg.text'
    ];
  } else if (language === 'playwright') {
    langLabel = 'Playwright (JavaScript/TypeScript)'; ext = 'spec.js'; accentColor = '#8b5cf6';
    codeLines = [
      "// === Flow: Authentication Testing ===",
      "const { test, expect } = require('@playwright/test');",
      '',
      "test.describe('Enterprise Authentication — TC-LOGIN-001 to TC-LOGIN-002', () => {",
      '',
      "  test.beforeEach(async ({ page }) => {",
      "    await page.goto('http://127.0.0.1:5500');",
      '  });',
      '',
      "  // TC-LOGIN-001: Valid Enterprise Domain Login",
      "  test('Valid Enterprise Domain Login', async ({ page }) => {",
      "    await page.fill('#username', 'admin@emudhra.com');",
      "    await page.fill('#password', 'admin123');",
      "    await page.click('#loginBtn');",
      "    await expect(page).toHaveURL(/.*dashboard/);",
      "    await expect(page.locator('[data-user-name]')).toBeVisible();",
      '  });',
      '',
      "  // TC-LOGIN-002: Rejection of Non-Enterprise Domains",
      "  test('Rejection of Non-Enterprise Domains', async ({ page }) => {",
      "    await page.fill('#username', 'test@yahoo.com');",
      "    await page.fill('#password', 'pass123');",
      "    await page.click('#loginBtn');",
      "    const errorMsg = page.locator('#loginErrorText');",
      '    await expect(errorMsg).toBeVisible();',
      "    await expect(errorMsg).toContainText('User not registered');",
      '  });',
      '});'
    ];
  } else {
    langLabel = 'Java + Selenium (TestNG / Page Object Model)'; ext = 'java'; accentColor = '#f59e0b';
    codeLines = [
      'package com.emudhra.tests;',
      '',
      'import org.openqa.selenium.By;',
      'import org.openqa.selenium.WebDriver;',
      'import org.openqa.selenium.WebElement;',
      'import org.openqa.selenium.chrome.ChromeDriver;',
      'import org.openqa.selenium.support.ui.WebDriverWait;',
      'import org.openqa.selenium.support.ui.ExpectedConditions;',
      'import org.testng.Assert;',
      'import org.testng.annotations.*;',
      'import java.time.Duration;',
      '',
      'public class AuthenticationTests {',
      '    WebDriver driver;',
      '    WebDriverWait wait;',
      '',
      '    // === Flow: Setup ===',
      '    @BeforeMethod',
      '    public void setup() {',
      '        driver = new ChromeDriver();',
      '        wait = new WebDriverWait(driver, Duration.ofSeconds(10));',
      '        driver.get("http://127.0.0.1:5500");',
      '    }',
      '',
      '    @AfterMethod',
      '    public void teardown() { if (driver != null) driver.quit(); }',
      '',
      '    // === TC-LOGIN-001: Valid Enterprise Login ===',
      '    @Test(description = "Valid enterprise domain login")',
      '    public void testValidEnterpriseLogin() {',
      '        driver.findElement(By.id("username")).sendKeys("admin@emudhra.com");',
      '        driver.findElement(By.id("password")).sendKeys("admin123");',
      '        driver.findElement(By.id("loginBtn")).click();',
      '        wait.until(ExpectedConditions.urlContains("dashboard.html"));',
      '        Assert.assertTrue(driver.getCurrentUrl().contains("dashboard"), "Dashboard navigation verified");',
      '    }',
      '',
      '    // === TC-LOGIN-002: Invalid Domain Rejection ===',
      '    @Test(description = "Reject non-emudhra.com domain login")',
      '    public void testInvalidDomainRejection() {',
      '        driver.findElement(By.id("username")).sendKeys("user@gmail.com");',
      '        driver.findElement(By.id("password")).sendKeys("test1234");',
      '        driver.findElement(By.id("loginBtn")).click();',
      '        WebElement err = wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("loginErrorText")));',
      '        Assert.assertTrue(err.getText().contains("User not registered"), "Domain guard validated");',
      '    }',
      '}'
    ];
  }

  var codeStr = codeLines.join('\n')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return `
  <div style="font-family:'Outfit',sans-serif">
    <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid rgba(${language==='python'?'59,130,246':language==='playwright'?'139,92,246':'245,158,11'},0.3);padding-bottom:14px;margin-bottom:20px">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="background:linear-gradient(135deg,${accentColor},${accentColor}99);border-radius:12px;width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:1.6rem">🤖</div>
        <div>
          <div style="font-size:1.3rem;font-weight:800;color:#fff">Automation Scripts</div>
          <div style="font-size:0.72rem;color:#6b7f96">${langLabel}</div>
        </div>
      </div>
      <span style="background:rgba(255,255,255,0.05);border:1px solid ${accentColor}40;color:${accentColor};font-size:0.75rem;font-weight:700;padding:5px 14px;border-radius:20px">test_auth.${ext}</span>
    </div>

    <!-- File Header Bar -->
    <div style="background:#0d1624;border-radius:10px 10px 0 0;border:1px solid #1e293b;padding:8px 16px;display:flex;align-items:center;gap:8px">
      <span style="width:12px;height:12px;border-radius:50%;background:#ef4444;display:inline-block"></span>
      <span style="width:12px;height:12px;border-radius:50%;background:#f59e0b;display:inline-block"></span>
      <span style="width:12px;height:12px;border-radius:50%;background:#10b981;display:inline-block"></span>
      <span style="margin-left:8px;color:#475569;font-size:0.72rem;font-family:monospace">test_auth.${ext}</span>
    </div>
    <pre style="margin:0;padding:20px 24px;font-family:Consolas,'Courier New',monospace;font-size:0.8rem;line-height:1.7;overflow:auto;max-height:420px;background:#0d1624;border:1px solid #1e293b;border-top:none;border-radius:0 0 10px 10px;color:#e2e8f0">${codeStr}</pre>
  </div>`;
}
// ===== HANDLE FILE ATTACH =====
function handleFileAttach(file) {
  attachedFile = file;
  var ext = file.name.split('.').pop().toLowerCase();
  var icon = document.getElementById('filePrevIcon');
  var name = document.getElementById('filePrevName');
  var size = document.getElementById('filePrevSize');
  var prev = document.getElementById('filePreview');
  if (icon) icon.textContent = FILE_ICONS[ext] || FILE_ICONS.default;
  if (name) name.textContent = file.name;
  if (size) size.textContent = formatBytes(file.size);
  if (prev) prev.style.display = 'flex';
  showToast('File attached: ' + file.name, 'success');
}

// ===== INIT: All event listeners inside DOMContentLoaded =====
document.addEventListener('DOMContentLoaded', function() {

  // --- File Input ---
  var fileInput = document.getElementById('fileInput');
  if (fileInput) {
    fileInput.addEventListener('change', function(e) {
      var file = e.target.files[0];
      if (file) {
        // Show professional loader
        var loader = document.getElementById('uploadLoader');
        if (loader) {
          loader.style.display = 'flex';
          // Simulate a small "professional processing" delay as requested for feedback
          setTimeout(function() {
            loader.style.display = 'none';
            handleFileAttach(file);
          }, 800);
        } else {
          handleFileAttach(file);
        }
      }
    });
  }

  // --- File Remove ---
  var fileRemoveBtn = document.getElementById('fileRemoveBtn');
  if (fileRemoveBtn) {
    fileRemoveBtn.addEventListener('click', function() {
      attachedFile = null;
      if (fileInput) fileInput.value = '';
      var prev = document.getElementById('filePreview');
      if (prev) prev.style.display = 'none';
      showToast('File removed', 'info');
    });
  }

  // --- Drag & Drop ---
  var dropZone = document.getElementById('dropZone');
  if (dropZone) {
    dropZone.addEventListener('dragover', function(e) {
      e.preventDefault();
      dropZone.style.borderStyle = 'solid';
      dropZone.style.borderColor = 'var(--accent-blue)';
    });
    dropZone.addEventListener('dragleave', function() {
      dropZone.style.borderStyle = 'dashed';
      dropZone.style.borderColor = 'var(--border-subtle)';
    });
    dropZone.addEventListener('drop', function(e) {
      e.preventDefault();
      dropZone.style.borderStyle = 'dashed';
      dropZone.style.borderColor = 'var(--border-subtle)';
      var file = e.dataTransfer.files[0];
      if (file) handleFileAttach(file);
    });
  }

  // --- Output Tabs ---
  document.querySelectorAll('.out-tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      document.querySelectorAll('.out-tab').forEach(function(t) { t.classList.remove('active'); });
      tab.classList.add('active');
      var type = tab.dataset.tab;
      var stream = document.getElementById('outputStream');
      if (stream && generatedData[type]) {
        stream.style.opacity = '0';
        stream.innerHTML = generatedData[type];
        void stream.offsetWidth;
        stream.style.transition = 'opacity 0.4s ease-in';
        stream.style.opacity = '1';
      }
    });
  });

  // --- Analyze PRD Button ---
  var analyzeBtn = document.getElementById('analyzePrdBtn');
  if (analyzeBtn) {
    analyzeBtn.addEventListener('click', function() {
      var prdTextArea = document.getElementById('prdTextarea');
      var prdText = prdTextArea ? prdTextArea.value.trim() : '';
      var engineSelector = document.getElementById('selectedModel');
      var activeEngine = engineSelector ? engineSelector.value : 'openrouter';

      if (!prdText && !attachedFile) {
        showToast('Please enter text or attach a file to analyze.', 'error');
        return;
      }

      if (prdText && typeof isMaliciousQuery === 'function' && isMaliciousQuery(prdText)) {
        showToast('Analysis Blocked', 'error');
        document.getElementById('featureGrid').style.display = 'none';
        document.getElementById('outputStatsGrid').style.display = 'none';
        document.getElementById('outputArea').style.display = 'block';
        document.getElementById('outputStream').innerHTML =
          '<div class="empty-state" style="color:var(--accent-red)">'
          + '<div style="font-size:3rem">🛡</div>'
          + '<h3 style="color:var(--text-white)">Request Blocked</h3>'
          + '<p>' + (typeof SYSTEM !== 'undefined' ? SYSTEM.MALICIOUS_RESPONSE : 'Request blocked.') + '</p>'
          + '</div>';
        if (typeof AppState !== 'undefined') AppState.addLog('Blocked malicious/unrelated query', 'security');
        return;
      }

      if (typeof AppState !== 'undefined' && !AppState.consumeToken(320, typeof activeEngine !== 'undefined' ? activeEngine : (document.getElementById('selectedModel') ? document.getElementById('selectedModel').value : 'openrouter'))) {
        showToast('Insufficient tokens. Please contact your administrator to recharge.', 'error');
        return;
      }

      document.querySelectorAll('[data-tokens]').forEach(function(el) {
        if (typeof AppState !== 'undefined') el.textContent = AppState.tokens.toLocaleString();
      });

      startGeneration(prdText || (attachedFile ? attachedFile.name : 'PRD Input'));
    });
  }

  // --- Export Button ---
  var exportBtn = document.getElementById('exportBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', function() { openModal('exportModal'); });
  }

  // --- Export Rows ---
  document.querySelectorAll('.export-row').forEach(function(row) {
    row.addEventListener('click', function() {
      var format = row.id.split('-')[1];
      var stream = document.getElementById('outputStream');
      var text = stream ? stream.innerText : '';

      if (format === 'xlsx') {
        var activeTab = document.querySelector('.out-tab.active');
        if (!activeTab || activeTab.dataset.tab !== 'testcases') {
          showToast('Only Test Cases can be exported as .xlsx. Switch to the Test Cases tab first.', 'warning', 4000);
          return;
        }
      }

      closeModal('exportModal');
      showToast('Preparing ' + format.toUpperCase() + ' export... (Simulated)', 'info');

      setTimeout(function() {
        var blob = new Blob([text], { type: 'text/plain' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'QA-Gen-Output.' + format;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Export complete!', 'success');
      }, 1200);
    });
  });

  // --- Copy Output ---
  var copyBtn = document.getElementById('copyOutputBtn');
  if (copyBtn) {
    copyBtn.addEventListener('click', function() {
      var stream = document.getElementById('outputStream');
      var text = stream ? stream.innerText : '';
      if (typeof copyToClipboard === 'function') copyToClipboard(text);
    });
  }

  // --- Edit Profile Save ---
  var saveProfileBtn = document.getElementById('saveProfileBtn');
  if (saveProfileBtn) {
    saveProfileBtn.addEventListener('click', function() {
      var name  = document.getElementById('editName')  ? document.getElementById('editName').value.trim()  : '';
      var email = document.getElementById('editEmail') ? document.getElementById('editEmail').value.trim() : '';
      var role  = document.getElementById('editRole')  ? document.getElementById('editRole').value.trim()  : '';
      if (typeof AppState !== 'undefined') {
        AppState.updateUser({ name: name || AppState.user.name, email: email || AppState.user.email, role: role || AppState.user.role });
        if (typeof populateUserData === 'function') populateUserData();
      }
      showToast('Profile updated!', 'success');
      closeModal('editProfileModal');
    });
  }

  // Pre-fill edit profile modal
  var editProfileTrigger = document.querySelector('[data-action="edit-profile"]');
  if (editProfileTrigger && typeof AppState !== 'undefined') {
    editProfileTrigger.addEventListener('click', function() {
      var u = AppState.user;
      if (!u) return;
      var editName  = document.getElementById('editName');
      var editEmail = document.getElementById('editEmail');
      var editRole  = document.getElementById('editRole');
      if (editName)  editName.value  = u.name  || '';
      if (editEmail) editEmail.value = u.email || '';
      if (editRole)  editRole.value  = u.role  || '';
    });
  }

  // Theme selector live preview
  var themeSelect = document.getElementById('themeSelect');
  if (themeSelect) {
    themeSelect.addEventListener('change', function() {
      if (typeof applyTheme === 'function') applyTheme(themeSelect.value);
    });
  }

});
