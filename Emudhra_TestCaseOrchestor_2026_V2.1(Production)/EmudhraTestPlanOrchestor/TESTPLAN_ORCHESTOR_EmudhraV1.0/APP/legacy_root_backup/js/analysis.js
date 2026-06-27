const ANALYSIS_PROJECTS_KEY = 'qa_gen_analysis_projects';
const ANALYSIS_ACTIVE_KEY = 'qa_gen_analysis_active_project';
const ANALYSIS_ACTIVITIES_KEY = 'qa_gen_analysis_activities';
const SUPPORTED_REPOSITORY_EXTENSIONS = ['xlsx', 'xls', 'csv'];
const REPO_AUTH_USERS = [
  { username: 'admin', password: 'admin123', name: 'Admin', email: 'admin@emudhra.com' },
  { username: 'qa@emudhra.com', password: 'qagen2026', name: 'QA Engineer', email: 'qa@emudhra.com' },
  { username: 'demo@emudhra.com', password: 'demo123', name: 'Demo User', email: 'demo@emudhra.com' },
  { username: 'lead@emudhra.com', password: 'lead123', name: 'Tech Lead', email: 'lead@emudhra.com' }
];

const typeMeta = {
  'Web App': { icon: 'WA', color: '#3b82f6' },
  'Mobile App': { icon: 'MA', color: '#8b5cf6' },
  'AI Product': { icon: 'AI', color: '#06b6d4' },
  'API System': { icon: 'API', color: '#10b981' },
  'Cloud Platform': { icon: 'CL', color: '#f59e0b' },
  'Enterprise System': { icon: 'ES', color: '#ef4444' }
};

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function metricFromSeed(seed, min, spread) {
  let hash = 0;
  String(seed || '').split('').forEach(ch => { hash = ((hash << 5) - hash) + ch.charCodeAt(0); hash |= 0; });
  return Math.max(0, Math.min(100, min + Math.abs(hash % spread)));
}

function getStoredProjects() {
  const projects = readJson(ANALYSIS_PROJECTS_KEY, []);
  if (projects.length) return projects;
  const sharedProjects = (window.AppState && Array.isArray(AppState.projects)) ? AppState.projects : [];
  return sharedProjects.slice(0, 5).map((p, idx) => createProject({
    projectName: p.title || `QA Project ${idx + 1}`,
    coreProduct: 'QA-Gen AI',
    projectType: idx % 2 ? 'API System' : 'Enterprise System',
    projectManager: 'Project Manager',
    developers: 'Development Team',
    testEngineers: 'QA Team'
  }, false));
}

function createProject(formData, persist = true) {
  const base = `${formData.projectName}-${formData.coreProduct}-${Date.now()}`;
  const prd = metricFromSeed(base + 'prd', 74, 22);
  const tc = metricFromSeed(base + 'tc', 70, 25);
  const automation = metricFromSeed(base + 'automation', 42, 45);
  const gap = Math.max(4, 100 - Math.round((prd + tc) / 2));
  const project = {
    id: `pa-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: formData.projectName,
    coreProduct: formData.coreProduct,
    type: formData.projectType,
    manager: formData.projectManager,
    developers: formData.developers,
    testEngineers: formData.testEngineers,
    status: 'Active',
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    metrics: { prd, tc, automation, gap },
    modules: [
      { name: 'Authentication & Access', pct: Math.min(100, prd + 4), status: 'Healthy' },
      { name: 'Core Workflow', pct: Math.min(100, tc + 3), status: 'Stable' },
      { name: 'API & Integration', pct: metricFromSeed(base + 'api', 68, 24), status: 'Review' },
      { name: 'Reports & Export', pct: metricFromSeed(base + 'reports', 62, 28), status: 'Watch' },
      { name: 'Security Validation', pct: metricFromSeed(base + 'security', 65, 26), status: 'Critical' }
    ],
    testCaseSheets: []
  };
  if (persist) {
    const projects = getStoredProjects();
    projects.unshift(project);
    writeJson(ANALYSIS_PROJECTS_KEY, projects.slice(0, 50));
    addActivity('Added', project, `${project.manager} created the project workspace`);
  }
  return project;
}

function getActivities() {
  return readJson(ANALYSIS_ACTIVITIES_KEY, []);
}

function addActivity(type, project, action, userName) {
  const activities = getActivities();
  activities.unshift({
    id: Date.now(),
    type,
    projectId: project.id,
    projectName: project.name,
    user: userName || project.manager || 'Admin',
    action,
    timestamp: new Date().toISOString()
  });
  writeJson(ANALYSIS_ACTIVITIES_KEY, activities.slice(0, 80));
}

let projects = [];
let activeProjectId = null;
let pendingRepoAuth = null;
let activeRepositorySheetId = null;
let editingProjectId = null;
let projectRepositoryOpen = false;
let traceabilityFilter = 'all';
const PROJECT_FILTER_DEFAULTS = {
  projectName: '',
  coreProduct: '',
  projectType: '',
  projectManager: '',
  developers: '',
  testEngineers: '',
  createdFrom: '',
  createdTo: '',
  modifiedFrom: '',
  modifiedTo: ''
};
let projectFilters = { ...PROJECT_FILTER_DEFAULTS };

function getActiveProject() {
  return projects.find(project => project.id === activeProjectId) || projects[0] || null;
}

function saveProjects() {
  writeJson(ANALYSIS_PROJECTS_KEY, projects.slice(0, 50));
}

function ensureProjectMetadata() {
  let changed = false;
  projects.forEach(project => {
    if (!project.createdAt) {
      project.createdAt = new Date().toISOString();
      changed = true;
    }
    if (!project.modifiedAt) {
      project.modifiedAt = project.createdAt;
      changed = true;
    }
  });
  if (changed) saveProjects();
}

function dateOnly(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function todayIso() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isoToDisplay(value) {
  const iso = String(value || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

function displayToIso(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function setProjectDateField(name, isoValue) {
  const nativeInput = document.querySelector(`#projectFilterForm [name="${name}"]`);
  const displayInput = document.getElementById(`${nativeInput?.id || ''}Display`);
  const cleanValue = isoValue || '';
  if (nativeInput) nativeInput.value = cleanValue;
  if (displayInput) displayInput.value = isoToDisplay(cleanValue);
}

function syncProjectDateDisplay(nativeInput) {
  if (!nativeInput) return;
  const displayInput = document.getElementById(`${nativeInput.id}Display`);
  if (displayInput) displayInput.value = isoToDisplay(nativeInput.value);
}

function syncProjectDateText(displayInput) {
  if (!displayInput) return true;
  const nativeId = displayInput.id.replace(/Display$/, '');
  const nativeInput = document.getElementById(nativeId);
  const parsed = displayToIso(displayInput.value);
  if (parsed === null) {
    showToast('Enter date in DD/MM/YYYY format.', 'error');
    displayInput.focus();
    return false;
  }
  if (parsed && parsed > todayIso()) {
    showToast('Date cannot be greater than today.', 'error');
    displayInput.focus();
    return false;
  }
  if (nativeInput) nativeInput.value = parsed || '';
  displayInput.value = isoToDisplay(parsed);
  return true;
}

function syncAllProjectDateFields() {
  const displays = document.querySelectorAll('#projectFilterForm .date-display-input');
  for (const display of displays) {
    if (!syncProjectDateText(display)) return false;
  }
  return true;
}

function focusProjectDate(name) {
  const nativeInput = document.querySelector(`#projectFilterForm [name="${name}"]`);
  const displayInput = document.getElementById(`${nativeInput?.id || ''}Display`);
  if (displayInput) displayInput.focus();
}

function validateProjectDateRange(fromName, toName, label) {
  const from = document.querySelector(`#projectFilterForm [name="${fromName}"]`)?.value || '';
  const to = document.querySelector(`#projectFilterForm [name="${toName}"]`)?.value || '';
  const max = todayIso();
  if (from && !to) {
    showToast(`${label} To Date is required when From Date is entered.`, 'error');
    focusProjectDate(toName);
    return false;
  }
  if (to && !from) {
    showToast(`${label} From Date is required when To Date is entered.`, 'error');
    focusProjectDate(fromName);
    return false;
  }
  if ((from && from > max) || (to && to > max)) {
    showToast(`${label} date cannot be greater than today.`, 'error');
    focusProjectDate(from && from > max ? fromName : toName);
    return false;
  }
  if (from && to && from > to) {
    showToast(`${label} From Date cannot be after To Date.`, 'error');
    focusProjectDate(fromName);
    return false;
  }
  return true;
}

function setupProjectDateFields() {
  const max = todayIso();
  document.querySelectorAll('#projectFilterForm .native-date-input').forEach(input => {
    input.max = max;
    input.addEventListener('change', () => syncProjectDateDisplay(input));
  });
  document.querySelectorAll('#projectFilterForm .date-display-input').forEach(input => {
    input.addEventListener('blur', () => syncProjectDateText(input));
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') syncProjectDateText(input);
    });
  });
  document.querySelectorAll('#projectFilterForm .date-field-shell, #projectFilterForm .date-picker-btn').forEach(element => {
    element.addEventListener('click', event => {
      const targetId = element.dataset.dateTarget || element.dataset.dateShell;
      const input = document.getElementById(targetId);
      if (!input) return;
      if (event.target.classList.contains('date-display-input')) {
        event.target.focus();
      }
      try {
        if (typeof input.showPicker === 'function') input.showPicker();
        else input.click();
      } catch (err) {
        input.focus();
      }
    });
  });
}

function isWithinDateRange(value, from, to) {
  const day = dateOnly(value);
  if (!day) return true;
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}

function matchesText(value, query) {
  return !query || String(value || '').toLowerCase().includes(String(query).toLowerCase().trim());
}

function projectMatchesFilters(project) {
  return matchesText(project.name, projectFilters.projectName)
    && matchesText(project.coreProduct, projectFilters.coreProduct)
    && (!projectFilters.projectType || project.type === projectFilters.projectType)
    && matchesText(project.manager, projectFilters.projectManager)
    && matchesText(project.developers, projectFilters.developers)
    && matchesText(project.testEngineers, projectFilters.testEngineers)
    && isWithinDateRange(project.createdAt, projectFilters.createdFrom, projectFilters.createdTo)
    && isWithinDateRange(project.modifiedAt || project.createdAt, projectFilters.modifiedFrom, projectFilters.modifiedTo);
}

function getActiveFilterCount() {
  return Object.values(projectFilters).filter(value => String(value || '').trim()).length;
}

function updateProjectFilterSummary() {
  const summary = document.getElementById('projectFilterSummary');
  if (!summary) return;
  const count = getActiveFilterCount();
  summary.textContent = count ? `${count} filter${count === 1 ? '' : 's'} applied` : 'All projects';
}

function getCurrentUserName() {
  return (window.AppState && AppState.user && AppState.user.name) || 'Admin';
}

function validateRepoCredentials(login, password) {
  return REPO_AUTH_USERS.find(user => (user.username === login || user.email === login) && user.password === password) || null;
}

function requestRepositoryAuth(actionLabel) {
  return new Promise(resolve => {
    pendingRepoAuth = resolve;
    const modal = document.getElementById('repoAuthModal');
    const title = document.getElementById('repoAuthTitle');
    const message = document.getElementById('repoAuthMessage');
    const error = document.getElementById('repoAuthError');
    const login = document.getElementById('repoAuthLogin');
    const password = document.getElementById('repoAuthPassword');
    const target = actionLabel.toLowerCase().includes('project') ? 'this project repository' : 'this repository sheet';
    if (title) title.textContent = `${actionLabel} Authorization`;
    if (message) message.textContent = `Enter login ID and password to ${actionLabel.toLowerCase()} ${target}.`;
    if (error) error.style.display = 'none';
    if (login) login.value = (window.AppState && AppState.user && AppState.user.email) || '';
    if (password) password.value = '';
    if (modal) modal.style.display = 'flex';
    setTimeout(() => password && password.focus(), 50);
  });
}

function closeRepositoryAuth(result) {
  const modal = document.getElementById('repoAuthModal');
  if (modal) modal.style.display = 'none';
  if (pendingRepoAuth) pendingRepoAuth(result || null);
  pendingRepoAuth = null;
}

function setActiveProject(id) {
  activeProjectId = id;
  projectRepositoryOpen = true;
  localStorage.setItem(ANALYSIS_ACTIVE_KEY, id);
  renderAll();
  setTimeout(() => document.getElementById('repositoryPanel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
}

function closeProjectRepository() {
  projectRepositoryOpen = false;
  activeRepositorySheetId = null;
  closeRepositoryDetail();
  renderAll();
  setTimeout(() => document.getElementById('projectCarousel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
}

function renderProjects() {
  const carousel = document.getElementById('projectCarousel');
  const empty = document.getElementById('emptyProjectState');
  const filtered = projects.filter(projectMatchesFilters);
  if (!carousel || !empty) return;
  updateProjectFilterSummary();

  empty.style.display = projects.length ? 'none' : 'grid';
  carousel.style.display = projects.length ? 'grid' : 'none';
  if (projects.length && !filtered.length) {
    carousel.innerHTML = `<div class="soft-empty project-filter-empty">No projects match the selected filters. Adjust the filter fields or reset the search.</div>`;
    return;
  }
  carousel.innerHTML = filtered.map(project => {
    const meta = typeMeta[project.type] || typeMeta['Enterprise System'];
    const teamCount = project.developers.split(',').filter(Boolean).length + project.testEngineers.split(',').filter(Boolean).length + 1;
    return `
      <article class="project-card ${project.id === activeProjectId ? 'active' : ''}" data-project-id="${project.id}" tabindex="0" role="button">
        <div class="project-card-main">
          <span class="project-icon" style="--project-color:${meta.color}">${meta.icon}</span>
          <span class="project-card-body">
            <strong>${escapeHtml(project.name)}</strong>
            <small>${escapeHtml(project.coreProduct)} - ${escapeHtml(project.type)}</small>
            <span class="project-card-meta"><span>${teamCount} members</span><span class="status-dot-inline"></span>${escapeHtml(project.status)}</span>
            <small>Created ${formatDateTime(project.createdAt)} - Modified ${formatDateTime(project.modifiedAt || project.createdAt)}</small>
          </span>
        </div>
        <div class="project-card-actions" aria-label="Project actions">
          <button class="mini-action-btn view" type="button" data-project-open="${project.id}">Open Repository</button>
          <button class="mini-action-btn edit" type="button" data-project-edit="${project.id}">Edit</button>
          <button class="mini-action-btn delete" type="button" data-project-delete="${project.id}">Delete</button>
        </div>
      </article>
    `;
  }).join('');
  carousel.querySelectorAll('[data-project-id]').forEach(card => {
    card.addEventListener('click', event => {
      if (event.target.closest('button')) return;
      setActiveProject(card.dataset.projectId);
    });
    card.addEventListener('keydown', event => {
      if ((event.key === 'Enter' || event.key === ' ') && !event.target.closest('button')) {
        event.preventDefault();
        setActiveProject(card.dataset.projectId);
      }
    });
  });
}

function renderActiveProject() {
  const project = getActiveProject();
  const strip = document.getElementById('activeProjectStrip');
  if (!strip) return;
  strip.style.display = project && projectRepositoryOpen ? 'flex' : 'none';
  if (!project) return;
  const meta = typeMeta[project.type] || typeMeta['Enterprise System'];
  document.getElementById('activeProjectIcon').textContent = meta.icon;
  document.getElementById('activeProjectIcon').style.setProperty('--project-color', meta.color);
  document.getElementById('activeProjectName').textContent = project.name;
  document.getElementById('activeProjectMeta').textContent = `${project.coreProduct} - ${project.type} - Managed by ${project.manager}`;
  document.getElementById('activeProjectStatus').textContent = project.status;
}

function getProjectSheets(project) {
  if (!project) return [];
  if (!Array.isArray(project.testCaseSheets)) project.testCaseSheets = [];
  return project.testCaseSheets;
}

function formatDateTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

function getRepositoryRows() {
  const project = getActiveProject();
  let sheets = getProjectSheets(project).slice();
  const query = (document.getElementById('repoSearch')?.value || '').toLowerCase().trim();
  const sort = document.getElementById('repoSort')?.value || 'modifiedDesc';
  if (query) {
    sheets = sheets.filter(sheet => [sheet.name, sheet.createdBy, sheet.modifiedBy].join(' ').toLowerCase().includes(query));
  }
  sheets.sort((a, b) => {
    if (sort === 'nameAsc') return a.name.localeCompare(b.name);
    const field = sort.startsWith('created') ? 'createdDate' : 'modifiedDate';
    const delta = new Date(a[field]).getTime() - new Date(b[field]).getTime();
    return sort.endsWith('Asc') ? delta : -delta;
  });
  return sheets;
}

function renderRepository() {
  const project = getActiveProject();
  const panel = document.getElementById('repositoryPanel');
  const body = document.getElementById('repositoryTableBody');
  if (!panel || !body) return;
  panel.style.display = project && projectRepositoryOpen ? 'block' : 'none';
  if (!project) return;
  const meta = document.getElementById('repositoryProjectMeta');
  if (meta) meta.textContent = `${project.name} repository - upload, replace, preview, download, and manage test case sheets for this project.`;

  const sheets = getRepositoryRows();
  body.innerHTML = sheets.length ? sheets.map(sheet => `
    <tr data-repo-open="${sheet.id}" class="${sheet.id === activeRepositorySheetId ? 'repo-row-active' : ''}">
      <td>
        <div class="sheet-name-cell">
          <span class="sheet-file-icon">${escapeHtml(sheet.extension.toUpperCase())}</span>
          <span>
            <strong>${escapeHtml(sheet.name)}</strong>
            <small>Version ${sheet.version || 1} - ${escapeHtml(sheet.sizeLabel || '')}</small>
          </span>
        </div>
      </td>
      <td>${escapeHtml(formatDateTime(sheet.createdDate))}</td>
      <td>${escapeHtml(sheet.createdBy)}</td>
      <td>${escapeHtml(formatDateTime(sheet.modifiedDate))}</td>
      <td>${escapeHtml(sheet.modifiedBy)}</td>
      <td>
        <div class="repo-row-actions">
          <button type="button" class="repo-action-btn view" data-repo-view="${sheet.id}">${sheet.id === activeRepositorySheetId ? 'Hide' : 'View'}</button>
          <button type="button" class="repo-action-btn download" data-repo-download="${sheet.id}">Download</button>
          <button type="button" class="repo-action-btn update" data-repo-update="${sheet.id}">Edit</button>
          <button type="button" class="repo-action-btn delete" data-repo-delete="${sheet.id}">Delete</button>
        </div>
      </td>
    </tr>
  `).join('') : `<tr><td colspan="6"><div class="repo-empty-state">No test case sheets uploaded for this project yet. Upload an Excel or CSV sheet to create the repository.</div></td></tr>`;
  const detailPanel = document.getElementById('repositoryDetailPanel');
  if (activeRepositorySheetId && !findRepositorySheet(activeRepositorySheetId) && detailPanel) {
    detailPanel.style.display = 'none';
    activeRepositorySheetId = null;
  }
}

function closeRepositoryDetail() {
  const panel = document.getElementById('repositoryDetailPanel');
  if (panel) panel.style.display = 'none';
  activeRepositorySheetId = null;
  renderRepository();
}

function findRepositorySheet(sheetId) {
  const project = getActiveProject();
  if (!project) return null;
  return getProjectSheets(project).find(sheet => sheet.id === sheetId) || null;
}

function dataUrlToArrayBuffer(dataUrl) {
  const base64 = String(dataUrl || '').split(',')[1] || '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function csvToRows(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === '"' && inQuotes && next === '"') {
      cell += '"';
      i++;
    } else if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && next === '\n') i++;
      row.push(cell);
      if (row.some(value => String(value).trim())) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  row.push(cell);
  if (row.some(value => String(value).trim())) rows.push(row);
  return rows;
}

function parseRepositorySheet(sheet) {
  if (!sheet || !sheet.content) return [];
  if (sheet.extension === 'csv') {
    const base64 = String(sheet.content).split(',')[1] || '';
    const text = decodeURIComponent(escape(atob(base64)));
    return [{ name: 'CSV Sheet', rows: csvToRows(text) }];
  }
  if (typeof XLSX === 'undefined') {
    return [{ name: 'Preview unavailable', rows: [['XLSX preview library was not loaded. Use Download to open this file.']] }];
  }
  const workbook = XLSX.read(dataUrlToArrayBuffer(sheet.content), { type: 'array' });
  return workbook.SheetNames.map(name => {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: '' });
    return { name, rows };
  });
}

function buildPreviewTable(rows, limit) {
  const visible = (rows || []).slice(0, limit || 12);
  if (!visible.length) return '<div class="repo-empty-state">No rows found in this sheet.</div>';
  const maxCols = Math.min(12, Math.max(...visible.map(row => row.length), 1));
  return `<table class="sheet-preview-table">
    <tbody>
      ${visible.map((row, rowIdx) => `<tr>${Array.from({ length: maxCols }, (_, colIdx) => {
        const tag = rowIdx === 0 ? 'th' : 'td';
        return `<${tag}>${escapeHtml(row[colIdx] || '')}</${tag}>`;
      }).join('')}</tr>`).join('')}
    </tbody>
  </table>`;
}

function openRepositorySheet(sheetId) {
  const sheet = findRepositorySheet(sheetId);
  const panel = document.getElementById('repositoryDetailPanel');
  if (!sheet || !panel) return;
  activeRepositorySheetId = sheetId;
  const parsedSheets = parseRepositorySheet(sheet);
  document.getElementById('repoDetailTitle').textContent = sheet.name;
  document.getElementById('repoDetailMeta').textContent = `Version ${sheet.version || 1} - Modified ${formatDateTime(sheet.modifiedDate)} by ${sheet.modifiedBy}`;
  const thumbs = document.getElementById('sheetThumbnailGrid');
  const tableWrap = document.getElementById('sheetTableWrap');
  if (thumbs) {
    thumbs.innerHTML = parsedSheets.map((item, idx) => `
      <button type="button" class="sheet-thumb ${idx === 0 ? 'active' : ''}" data-sheet-index="${idx}">
        <strong>${escapeHtml(item.name)}</strong>
        <span>${(item.rows || []).length} rows</span>
        <div>${buildPreviewTable(item.rows, 4)}</div>
      </button>
    `).join('');
  }
  function renderSheet(index) {
    const selected = parsedSheets[index] || parsedSheets[0] || { name: 'Sheet', rows: [] };
    if (tableWrap) {
      tableWrap.innerHTML = `<div class="sheet-table-heading">${escapeHtml(selected.name)} - Test Cases</div>${buildPreviewTable(selected.rows, 200)}`;
    }
    thumbs?.querySelectorAll('.sheet-thumb').forEach(btn => btn.classList.toggle('active', Number(btn.dataset.sheetIndex) === index));
  }
  thumbs?.querySelectorAll('.sheet-thumb').forEach(btn => btn.addEventListener('click', () => renderSheet(Number(btn.dataset.sheetIndex))));
  renderSheet(0);
  panel.style.display = 'block';
  renderRepository();
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  addActivity('Viewed', getActiveProject(), `Viewed repository sheet ${sheet.name}`);
  renderActivities();
}

function toggleRepositorySheet(sheetId) {
  const panel = document.getElementById('repositoryDetailPanel');
  if (activeRepositorySheetId === sheetId && panel && panel.style.display !== 'none') {
    closeRepositoryDetail();
    document.getElementById('repositoryPanel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  openRepositorySheet(sheetId);
}

function downloadRepositorySheet(sheetId) {
  const sheet = findRepositorySheet(sheetId);
  if (!sheet || !sheet.content) return;
  const a = document.createElement('a');
  a.href = sheet.content;
  a.download = sheet.name;
  a.click();
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Unable to read file'));
    reader.readAsDataURL(file);
  });
}

async function storeRepositoryFile(file, replaceSheetId, authorizedUser) {
  const project = getActiveProject();
  if (!project || !file) return;
  const extension = (file.name.split('.').pop() || '').toLowerCase();
  if (!SUPPORTED_REPOSITORY_EXTENSIONS.includes(extension)) {
    alert('Only .xlsx, .xls, and .csv test case sheets are supported.');
    return;
  }

  const now = new Date().toISOString();
  const user = authorizedUser?.name || getCurrentUserName();
  let content = '';
  try {
    content = await fileToDataUrl(file);
  } catch (err) {
    alert('Unable to read the selected file. Please try again.');
    return;
  }

  const sheets = getProjectSheets(project);
  const existing = replaceSheetId ? sheets.find(sheet => sheet.id === replaceSheetId) : null;
  if (existing) {
    existing.name = file.name;
    existing.extension = extension;
    existing.modifiedDate = now;
    existing.modifiedBy = user;
    existing.size = file.size;
    existing.sizeLabel = formatBytes(file.size);
    existing.version = (existing.version || 1) + 1;
    existing.content = content;
    addActivity('Updated', project, `Updated test case sheet ${file.name}`, user);
  } else {
    sheets.unshift({
      id: `sheet-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: file.name,
      extension,
      createdDate: now,
      createdBy: user,
      modifiedDate: now,
      modifiedBy: user,
      size: file.size,
      sizeLabel: formatBytes(file.size),
      version: 1,
      content
    });
    addActivity('Uploaded', project, `Uploaded test case sheet ${file.name}`, user);
  }

  try {
    saveProjects();
  } catch (err) {
    if (existing) {
      existing.content = '';
    } else {
      sheets[0].content = '';
    }
    saveProjects();
    alert('File metadata was stored, but the full file content was too large for browser storage.');
  }
  renderRepository();
  renderTraceabilityMatrix();
  renderQualityInsights();
  renderActivities();
}

function deleteRepositorySheet(sheetId, authorizedUser) {
  const project = getActiveProject();
  if (!project) return;
  const sheets = getProjectSheets(project);
  const sheet = sheets.find(item => item.id === sheetId);
  if (!sheet) return;
  if (!confirm(`Delete "${sheet.name}" from this project repository?`)) return;
  project.testCaseSheets = sheets.filter(item => item.id !== sheetId);
  addActivity('Deleted', project, `Deleted test case sheet ${sheet.name}`, authorizedUser?.name);
  saveProjects();
  renderRepository();
  renderActivities();
}

async function editRepositorySheet(sheetId) {
  const authUser = await requestRepositoryAuth('Edit');
  if (!authUser) return;
  const input = document.getElementById('repoUpdateInput');
  input.dataset.sheetId = sheetId;
  input.dataset.authorizedUser = authUser.name;
  input.click();
}

async function protectedDeleteRepositorySheet(sheetId) {
  const authUser = await requestRepositoryAuth('Delete');
  if (!authUser) return;
  deleteRepositorySheet(sheetId, authUser);
}

function drawRing(canvas, pct, color) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  const center = size / 2;
  const radius = center - 12;
  ctx.clearRect(0, 0, size, size);
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.28)';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(center, center, radius, -Math.PI / 2, -Math.PI / 2 + (pct / 100) * Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.stroke();
}

function animateValue(el, target) {
  let current = 0;
  const step = Math.max(1, Math.ceil(target / 40));
  const timer = setInterval(() => {
    current = Math.min(target, current + step);
    el.textContent = current;
    if (current >= target) clearInterval(timer);
  }, 16);
}

function renderAnalytics() {
  const project = getActiveProject();
  const grid = document.getElementById('analyticsGrid');
  if (!grid) return;
  grid.style.display = projectRepositoryOpen ? 'none' : 'grid';
  const metrics = project ? project.metrics : { prd: 0, tc: 0, automation: 0, gap: 0 };
  const cards = [
    ['PRD Coverage', 'Requirement extraction rate', metrics.prd, '#3b82f6'],
    ['Test Coverage', 'Execution-ready cases mapped', metrics.tc, '#8b5cf6'],
    ['Automation Coverage', 'Scripts vs test cases ratio', metrics.automation, '#10b981'],
    ['Gap Score', 'Identified coverage gaps', metrics.gap, '#ef4444']
  ];
  grid.innerHTML = cards.map((card, idx) => `
    <article class="analytics-card" style="--metric-color:${card[3]}">
      <div class="metric-topline"></div>
      <div class="metric-ring">
        <canvas width="120" height="120" data-ring="${idx}"></canvas>
        <div><strong data-count="${card[2]}">0</strong><span>%</span></div>
      </div>
      <h3>${card[0]}</h3>
      <p>${card[1]}</p>
    </article>
  `).join('');
  grid.querySelectorAll('canvas[data-ring]').forEach((canvas, idx) => drawRing(canvas, cards[idx][2], cards[idx][3]));
  grid.querySelectorAll('[data-count]').forEach(el => animateValue(el, Number(el.dataset.count || 0)));
}

function getRepositoryTestCaseCount(project) {
  const sheets = getProjectSheets(project);
  if (!sheets.length) return 0;
  return sheets.reduce((total, sheet) => {
    try {
      const parsed = parseRepositorySheet(sheet);
      const rows = parsed.reduce((sum, item) => sum + Math.max(0, (item.rows || []).length - 1), 0);
      return total + rows;
    } catch (err) {
      return total + Math.max(1, sheet.version || 1);
    }
  }, 0);
}

function buildRequirementTraceability(project) {
  if (!project) return [];
  const moduleNames = (project.modules || []).map(module => module.name);
  const baseRequirements = [
    `${project.coreProduct} user login and authentication`,
    'Password reset and recovery workflow',
    'Role-based authorization for protected actions',
    'Session timeout and token expiry handling',
    'Input validation, mandatory fields, and boundary rules',
    'Audit trail, reports, and export readiness',
    'External API integration error handling',
    'Accessibility and responsive user experience'
  ];
  const typeRequirements = {
    'Web App': ['Browser compatibility across supported viewports', 'Secure file upload and document processing'],
    'Mobile App': ['Offline behavior and mobile network recovery', 'Device permission and biometric authentication'],
    'API System': ['API contract validation and schema compatibility', 'Rate limiting and payload security'],
    'AI Product': ['Model response explainability and prompt guardrails', 'AI output quality review and fallback handling'],
    'Cloud Platform': ['Horizontal scaling and environment resilience', 'Cloud access policy and tenant isolation'],
    'Enterprise System': ['Workflow approvals and maker-checker controls', 'Data processing accuracy and reconciliation']
  };
  const summaries = [...baseRequirements, ...(typeRequirements[project.type] || typeRequirements['Enterprise System'])];
  const repositoryCases = getRepositoryTestCaseCount(project);
  const metricSeed = Math.max(0, project.metrics?.tc || 0);
  return summaries.slice(0, 10).map((summary, idx) => {
    const module = moduleNames[idx % Math.max(1, moduleNames.length)] || project.coreProduct;
    const generatedBase = repositoryCases ? Math.floor(repositoryCases / summaries.length) : Math.floor(metricSeed / 12);
    const variance = metricFromSeed(`${project.id}-${summary}`, 0, 7);
    const shouldMiss = (!repositoryCases && idx % 5 === 1) || ((project.metrics?.gap || 0) > 10 && idx % 6 === 2);
    const linkedCount = shouldMiss ? 0 : Math.max(0, generatedBase + variance - (idx % 4 === 1 ? 2 : 0));
    const status = linkedCount === 0 ? 'Not Covered' : linkedCount < 5 ? 'Partially Covered' : 'Covered';
    return {
      id: `REQ-${String(idx + 1).padStart(3, '0')}`,
      summary,
      module,
      linkedCount,
      status,
      lastUpdated: project.modifiedAt || project.createdAt,
      testCases: Array.from({ length: Math.min(linkedCount, 8) }, (_, caseIdx) => ({
        id: `TC-${String(idx + 1).padStart(3, '0')}-${String(caseIdx + 1).padStart(2, '0')}`,
        title: `${summary} - scenario ${caseIdx + 1}`
      }))
    };
  });
}

function getCoverageStatusClass(status) {
  if (status === 'Covered') return 'good';
  if (status === 'Partially Covered') return 'warning';
  return 'critical';
}

function renderTraceabilityMatrix() {
  const project = getActiveProject();
  const metricsEl = document.getElementById('traceabilityMetrics');
  const body = document.getElementById('traceabilityBody');
  const filterWrap = document.getElementById('traceabilityFilters');
  if (!metricsEl || !body || !filterWrap) return;
  const requirements = buildRequirementTraceability(project);
  const query = (document.getElementById('traceabilitySearch')?.value || '').toLowerCase().trim();
  const filtered = requirements.filter(req => {
    const statusMatch = traceabilityFilter === 'all' || req.status === traceabilityFilter;
    const searchMatch = !query || [req.id, req.summary, req.module, req.status].join(' ').toLowerCase().includes(query);
    return statusMatch && searchMatch;
  });
  const total = requirements.length;
  const covered = requirements.filter(req => req.status === 'Covered').length;
  const uncovered = requirements.filter(req => req.status === 'Not Covered').length;
  const coveragePct = total ? Math.round((covered / total) * 100) : 0;
  const summaryCards = [
    ['Total Requirements', total, 'neutral'],
    ['Covered Requirements', covered, 'good'],
    ['Uncovered Requirements', uncovered, 'critical'],
    ['Coverage Percentage', `${coveragePct}%`, coveragePct >= 80 ? 'good' : coveragePct >= 55 ? 'warning' : 'critical']
  ];
  metricsEl.innerHTML = summaryCards.map(card => `
    <div class="trace-metric ${card[2]}">
      <span>${card[0]}</span>
      <strong>${card[1]}</strong>
    </div>
  `).join('');
  filterWrap.querySelectorAll('[data-trace-filter]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.traceFilter === traceabilityFilter);
  });
  body.innerHTML = filtered.length ? filtered.map(req => {
    const statusClass = getCoverageStatusClass(req.status);
    const linkedCases = req.testCases.length ? req.testCases.map(testCase => `
      <span class="linked-test-case"><b>${escapeHtml(testCase.id)}</b>${escapeHtml(testCase.title)}</span>
    `).join('') : '<span class="linked-test-case missing"><b>No linked cases</b>Generate negative, boundary, and happy-path tests for this requirement.</span>';
    return `
      <tr class="trace-row ${statusClass}" data-req-toggle="${req.id}">
        <td><span class="req-id">${escapeHtml(req.id)}</span></td>
        <td>
          <strong>${escapeHtml(req.summary)}</strong>
          <small>${escapeHtml(req.module)}</small>
        </td>
        <td>${req.linkedCount}</td>
        <td><span class="status-badge ${statusClass}">${req.status === 'Not Covered' ? 'Missing' : escapeHtml(req.status)}</span></td>
        <td>${escapeHtml(formatDateTime(req.lastUpdated))}</td>
      </tr>
      <tr class="trace-detail-row" data-req-detail="${req.id}" hidden>
        <td colspan="5">
          <div class="trace-detail-box">
            <strong>Linked Test Cases</strong>
            <div>${linkedCases}</div>
          </div>
        </td>
      </tr>
    `;
  }).join('') : '<tr><td colspan="5"><div class="soft-empty">No requirements match the selected search or coverage filter.</div></td></tr>';
  body.querySelectorAll('[data-req-toggle]').forEach(row => {
    row.addEventListener('click', () => {
      const detail = body.querySelector(`[data-req-detail="${row.dataset.reqToggle}"]`);
      if (!detail) return;
      detail.hidden = !detail.hidden;
      row.classList.toggle('expanded', !detail.hidden);
    });
  });
}

function buildQualityInsights(project) {
  const requirements = buildRequirementTraceability(project);
  const metrics = project?.metrics || { prd: 0, tc: 0, automation: 0, gap: 0 };
  const ambiguousTerms = ['Fast', 'Secure', 'Efficient', 'Quickly'];
  const ambiguous = ambiguousTerms.map((term, idx) => ({
    term,
    recommendation: `Replace "${term.toLowerCase()}" with measurable acceptance criteria, threshold, owner, and validation method.`,
    level: idx < 2 ? 'warning' : 'neutral'
  }));
  const missingCategories = [
    ['Negative Testing', requirements.some(req => req.status === 'Not Covered') ? 42 : 18],
    ['Boundary Testing', Math.max(12, 100 - metrics.prd)],
    ['Error Handling', Math.max(10, metrics.gap + 12)],
    ['Security Testing', project?.type === 'Enterprise System' || project?.type === 'Web App' ? 36 : 22],
    ['Accessibility Testing', 28],
    ['Performance Testing', Math.max(16, 100 - metrics.automation)]
  ];
  const recommendations = [
    'OTP expiry validation missing',
    'Session timeout scenarios not generated',
    'Maximum field length validations missing',
    'Role-based access tests missing'
  ];
  const riskFactors = [
    ['Authentication', 'High Risk', project?.type === 'Web App' || project?.type === 'Enterprise System'],
    ['Payments', 'Medium Risk', /pay|bank|finance|yono|secure/i.test(`${project?.name || ''} ${project?.coreProduct || ''}`)],
    ['Authorization', 'High Risk', true],
    ['Data Processing', 'Medium Risk', metrics.gap > 10],
    ['External API Integrations', project?.type === 'API System' ? 'High Risk' : 'Low Risk', true]
  ].filter(item => item[2]).map(item => ({ name: item[0], level: item[1] }));
  const requirementCompleteness = metrics.prd;
  const coverageCompleteness = metrics.tc;
  const scenarioDiversity = Math.min(100, Math.round((metrics.automation + coverageCompleteness) / 2));
  const ambiguityScore = Math.max(0, 100 - ambiguous.length * 9);
  const score = Math.round((requirementCompleteness + coverageCompleteness + scenarioDiversity + ambiguityScore) / 4);
  return { ambiguous, missingCategories, recommendations, riskFactors, score };
}

function renderQualityInsights() {
  const project = getActiveProject();
  const panel = document.getElementById('qualityInsightsPanel');
  if (!panel) return;
  if (!project) {
    panel.innerHTML = '<div class="soft-empty">Select or create a project to view AI quality insights.</div>';
    return;
  }
  const insights = buildQualityInsights(project);
  const scoreClass = insights.score >= 80 ? 'good' : insights.score >= 60 ? 'warning' : 'critical';
  panel.innerHTML = `
    <div class="quality-score-card ${scoreClass}">
      <div class="quality-ring" style="--score:${insights.score * 3.6}deg">
        <div><strong>${insights.score}</strong><span>AI Quality Score</span></div>
      </div>
      <div>
        <h3>${insights.score >= 80 ? 'Strong QA readiness' : insights.score >= 60 ? 'Needs targeted improvement' : 'Coverage attention required'}</h3>
        <p>Improve score by reducing ambiguity, closing uncovered requirements, and adding wider scenario diversity.</p>
      </div>
    </div>
    <div class="insight-section">
      <h3>Ambiguous Requirements</h3>
      ${insights.ambiguous.map(item => `
        <div class="insight-item ${item.level}">
          <span>${escapeHtml(item.term)}</span>
          <p>${escapeHtml(item.recommendation)}</p>
        </div>
      `).join('')}
    </div>
    <div class="insight-section">
      <h3>Missing Test Scenarios</h3>
      ${insights.missingCategories.map(item => `
        <div class="scenario-gap">
          <div><span>${escapeHtml(item[0])}</span><b>${item[1]}%</b></div>
          <div class="insight-progress ${item[1] > 35 ? 'critical' : item[1] > 22 ? 'warning' : 'good'}"><i style="width:${item[1]}%"></i></div>
        </div>
      `).join('')}
    </div>
    <div class="insight-section">
      <h3>AI Recommendations</h3>
      <div class="recommendation-list">
        ${insights.recommendations.map(item => `<span>${escapeHtml(item)}</span>`).join('')}
      </div>
    </div>
    <div class="insight-section">
      <h3>Risk Analysis</h3>
      <div class="risk-grid">
        ${insights.riskFactors.map(item => `<span class="risk-pill ${item.level.toLowerCase().replace(/\s+/g, '-')}"><b>${escapeHtml(item.level)}</b>${escapeHtml(item.name)}</span>`).join('')}
      </div>
    </div>
  `;
}

function renderEnterpriseProjectIntelligence() {
  const grid = document.getElementById('enterpriseProjectIntelGrid');
  if (!grid) return;
  if (typeof EnterpriseQAEngine === 'undefined') {
    grid.innerHTML = '<div class="soft-empty">Enterprise intelligence engine is not available.</div>';
    return;
  }

  const project = getActiveProject();
  const latestOutput = EnterpriseQAEngine.readLastOutputText();
  const projectSource = project ? [
    project.name,
    project.coreProduct,
    project.type,
    project.manager,
    ...(project.modules || []).map(module => `${module.name} ${module.status} ${module.pct}%`)
  ].join('\n') : '';
  const source = latestOutput || projectSource;
  if (!source) {
    grid.innerHTML = '<div class="soft-empty">Analyze a PRD or create a project to populate enterprise requirement intelligence.</div>';
    return;
  }

  const intel = EnterpriseQAEngine.analyzeRequirement(source);
  const topRisk = intel.risks.sort((a, b) => b.score - a.score)[0];
  const apiLabel = intel.api.mode ? `${intel.api.endpoints.length} endpoint(s)` : 'No API mode';
  const cards = [
    ['Requirement Type', intel.requirementType, 'Classification', 'blue'],
    ['Quality Score', `${intel.scores.requirementQualityScore}%`, 'Requirement quality', intel.scores.requirementQualityScore >= 75 ? 'good' : 'warning'],
    ['Ambiguity Score', `${intel.scores.ambiguityScore}%`, `${intel.ambiguity.items.length} unclear signal(s)`, intel.scores.ambiguityScore >= 50 ? 'critical' : 'good'],
    ['Risk Score', `${intel.scores.riskScore}%`, topRisk ? `${topRisk.level} ${topRisk.name}` : 'Low risk', intel.scores.riskScore >= 70 ? 'critical' : 'warning'],
    ['API Intelligence', apiLabel, intel.api.modeLabel, intel.api.mode ? 'teal' : 'gray'],
    ['Defect Prediction', `${intel.defectPrediction.score}%`, intel.defectPrediction.likelyFailureAreas[0] || 'Stable', intel.defectPrediction.score >= 70 ? 'critical' : 'warning'],
    ['Impact Analysis', `${intel.impact.impactedModules.length} module(s)`, intel.impact.report, 'blue'],
    ['Coverage Confidence', `${intel.scores.coverageConfidenceScore}%`, intel.coverage[0]?.recommendation || 'Maintain coverage', intel.scores.coverageConfidenceScore >= 75 ? 'good' : 'warning']
  ];

  grid.innerHTML = cards.map(card => `
    <article class="enterprise-project-intel-card ${card[3]}">
      <span>${escapeHtml(card[0])}</span>
      <strong>${escapeHtml(card[1])}</strong>
      <small>${escapeHtml(card[2])}</small>
    </article>
  `).join('');
}

function groupDateLabel(timestamp) {
  const date = new Date(timestamp);
  const today = new Date();
  const diff = Math.floor((today.setHours(0,0,0,0) - new Date(date).setHours(0,0,0,0)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return 'This Week';
  return 'Older';
}

function renderActivities() {
  const projectFilter = document.getElementById('activityProjectFilter');
  const typeFilter = document.getElementById('activityTypeFilter');
  const timeline = document.getElementById('activityTimeline');
  if (!timeline || !projectFilter || !typeFilter) return;
  const previousProjectFilter = projectFilter.value || 'all';

  const active = getActiveProject();
  projectFilter.innerHTML = '<option value="all">All projects</option>' + projects.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
  projectFilter.value = projects.some(project => project.id === previousProjectFilter) ? previousProjectFilter : 'all';

  let activities = getActivities();
  if (!activities.length && active) {
    ['Uploaded PRD source', 'Coverage Modified', 'Team Changed'].forEach((action, idx) => {
      activities.push({
        id: Date.now() + idx,
        type: idx === 0 ? 'Uploaded' : action,
        projectId: active.id,
        projectName: active.name,
        user: idx === 2 ? active.manager : 'QA Architect',
        action,
        timestamp: new Date(Date.now() - idx * 86400000).toISOString()
      });
    });
  }

  const selectedProject = projectFilter.value || 'all';
  const selectedType = typeFilter.value || 'all';
  const filtered = activities.filter(a => (selectedProject === 'all' || a.projectId === selectedProject) && (selectedType === 'all' || a.type === selectedType));
  const groups = filtered.reduce((acc, activity) => {
    const label = groupDateLabel(activity.timestamp);
    acc[label] = acc[label] || [];
    acc[label].push(activity);
    return acc;
  }, {});

  timeline.innerHTML = Object.keys(groups).length ? Object.entries(groups).map(([label, rows]) => `
    <div class="activity-group">
      <h3>${label}</h3>
      ${rows.map(activity => `
        <div class="activity-item">
          <div class="activity-avatar">${escapeHtml(activity.user.slice(0, 2).toUpperCase())}</div>
          <div class="activity-body">
            <strong>${escapeHtml(activity.user)}</strong>
            <span>${escapeHtml(activity.action)} in <b>${escapeHtml(activity.projectName)}</b></span>
            <small>${new Date(activity.timestamp).toLocaleString()}</small>
          </div>
          <div class="activity-badge">${escapeHtml(activity.type)}</div>
        </div>
      `).join('')}
    </div>
  `).join('') : '<div class="soft-empty">No activities match the selected filters.</div>';
}

function renderProjectPageMode() {
  const selector = document.querySelector('.project-selector-panel');
  const analytics = document.getElementById('analyticsGrid');
  const enterpriseIntel = document.getElementById('enterpriseProjectIntelPanel');
  const twoCol = document.querySelector('.analysis-two-col');
  const activity = document.querySelector('.activity-panel');
  const detail = document.getElementById('repositoryDetailPanel');

  if (selector) selector.style.display = projectRepositoryOpen ? 'none' : 'block';
  if (analytics) analytics.style.display = projectRepositoryOpen ? 'none' : 'grid';
  if (enterpriseIntel) enterpriseIntel.style.display = projectRepositoryOpen ? 'none' : 'block';
  if (twoCol) twoCol.style.display = projectRepositoryOpen ? 'none' : 'grid';
  if (activity) activity.style.display = projectRepositoryOpen ? 'none' : 'block';
  if (detail && !projectRepositoryOpen) detail.style.display = 'none';
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderAll() {
  renderProjectPageMode();
  renderProjects();
  renderActiveProject();
  renderRepository();
  renderAnalytics();
  renderTraceabilityMatrix();
  renderQualityInsights();
  renderEnterpriseProjectIntelligence();
  renderActivities();
}

function openProjectModal(projectId) {
  const project = projectId ? projects.find(item => item.id === projectId) : null;
  editingProjectId = project ? project.id : null;
  const modal = document.getElementById('projectModal');
  const form = document.getElementById('projectForm');
  const heading = modal?.querySelector('.project-modal-header h2');
  const eyebrow = modal?.querySelector('.analysis-eyebrow');
  const submitLabel = document.getElementById('projectSubmitLabel');
  if (heading) heading.textContent = project ? 'Edit Project' : 'Add Project';
  if (eyebrow) eyebrow.textContent = project ? 'Manage Workspace' : 'New Workspace';
  if (submitLabel) submitLabel.textContent = project ? 'Save Changes' : 'Create Project';
  if (form) {
    form.reset();
    form.projectName.value = project?.name || '';
    form.coreProduct.value = project?.coreProduct || '';
    form.projectType.value = project?.type || 'Web App';
    form.projectManager.value = project?.manager || '';
    form.developers.value = project?.developers || '';
    form.testEngineers.value = project?.testEngineers || '';
  }
  if (modal) modal.style.display = 'flex';
}

function closeProjectModal() {
  const modal = document.getElementById('projectModal');
  if (modal) modal.style.display = 'none';
  editingProjectId = null;
}

function fillProjectFilterForm() {
  Object.entries(projectFilters).forEach(([key, value]) => {
    const input = document.querySelector(`#projectFilterForm [name="${key}"]`);
    if (input?.classList.contains('native-date-input')) setProjectDateField(key, value);
    else if (input) input.value = value || '';
  });
}

function openProjectFilterModal() {
  fillProjectFilterForm();
  const modal = document.getElementById('projectFilterModal');
  if (modal) modal.style.display = 'flex';
  setTimeout(() => document.getElementById('filterProjectName')?.focus(), 50);
}

function closeProjectFilterModal() {
  const modal = document.getElementById('projectFilterModal');
  if (modal) modal.style.display = 'none';
}

function resetProjectFilters() {
  projectFilters = { ...PROJECT_FILTER_DEFAULTS };
  fillProjectFilterForm();
  renderProjects();
}

function applyProjectFiltersFromForm(formEl) {
  if (!syncAllProjectDateFields()) return;
  if (!validateProjectDateRange('createdFrom', 'createdTo', 'Created Date Range')) return;
  if (!validateProjectDateRange('modifiedFrom', 'modifiedTo', 'Modified Date Range')) return;
  const form = new FormData(formEl);
  projectFilters = {
    projectName: String(form.get('projectName') || '').trim(),
    coreProduct: String(form.get('coreProduct') || '').trim(),
    projectType: String(form.get('projectType') || '').trim(),
    projectManager: String(form.get('projectManager') || '').trim(),
    developers: String(form.get('developers') || '').trim(),
    testEngineers: String(form.get('testEngineers') || '').trim(),
    createdFrom: String(form.get('createdFrom') || ''),
    createdTo: String(form.get('createdTo') || ''),
    modifiedFrom: String(form.get('modifiedFrom') || ''),
    modifiedTo: String(form.get('modifiedTo') || '')
  };
  closeProjectFilterModal();
  renderProjects();
}

async function editProject(projectId) {
  const authUser = await requestRepositoryAuth('Edit Project');
  if (!authUser) return;
  openProjectModal(projectId);
}

async function deleteProject(projectId) {
  const project = projects.find(item => item.id === projectId);
  if (!project) return;
  const authUser = await requestRepositoryAuth('Delete Project');
  if (!authUser) return;
  if (!confirm(`Delete project "${project.name}" and its repository sheets?`)) return;
  projects = projects.filter(item => item.id !== projectId);
  if (activeProjectId === projectId) {
    activeProjectId = projects[0]?.id || null;
    if (activeProjectId) localStorage.setItem(ANALYSIS_ACTIVE_KEY, activeProjectId);
    else localStorage.removeItem(ANALYSIS_ACTIVE_KEY);
  }
  activeRepositorySheetId = null;
  addActivity('Deleted', project, `Deleted project repository ${project.name}`, authUser.name);
  saveProjects();
  closeRepositoryDetail();
  renderAll();
}

function initAnalysisPage() {
  projects = getStoredProjects();
  ensureProjectMetadata();
  activeProjectId = localStorage.getItem(ANALYSIS_ACTIVE_KEY) || (projects[0] && projects[0].id);
  if (projects.length) writeJson(ANALYSIS_PROJECTS_KEY, projects);

  document.getElementById('openProjectModalBtn')?.addEventListener('click', () => openProjectModal());
  document.getElementById('emptyAddProjectBtn')?.addEventListener('click', () => openProjectModal());
  document.getElementById('projectBackBtn')?.addEventListener('click', closeProjectRepository);
  setupProjectDateFields();
  document.getElementById('openProjectFilterBtn')?.addEventListener('click', openProjectFilterModal);
  document.getElementById('closeProjectFilterBtn')?.addEventListener('click', closeProjectFilterModal);
  document.getElementById('cancelProjectFilterBtn')?.addEventListener('click', closeProjectFilterModal);
  document.getElementById('resetProjectFilterBtn')?.addEventListener('click', resetProjectFilters);
  document.getElementById('projectFilterModal')?.addEventListener('click', event => {
    if (event.target.id === 'projectFilterModal') closeProjectFilterModal();
  });
  document.getElementById('projectFilterForm')?.addEventListener('submit', event => {
    event.preventDefault();
    applyProjectFiltersFromForm(event.currentTarget);
  });
  document.getElementById('closeProjectModalBtn')?.addEventListener('click', closeProjectModal);
  document.getElementById('cancelProjectBtn')?.addEventListener('click', closeProjectModal);
  document.getElementById('projectModal')?.addEventListener('click', event => {
    if (event.target.id === 'projectModal') closeProjectModal();
  });
  document.getElementById('activityProjectFilter')?.addEventListener('change', renderActivities);
  document.getElementById('activityTypeFilter')?.addEventListener('change', renderActivities);
  document.getElementById('traceabilitySearch')?.addEventListener('input', renderTraceabilityMatrix);
  document.getElementById('traceabilityFilters')?.addEventListener('click', event => {
    const button = event.target.closest('[data-trace-filter]');
    if (!button) return;
    traceabilityFilter = button.dataset.traceFilter || 'all';
    renderTraceabilityMatrix();
  });
  document.getElementById('repoSearch')?.addEventListener('input', renderRepository);
  document.getElementById('repoSort')?.addEventListener('change', renderRepository);
  document.getElementById('repoUploadInput')?.addEventListener('change', event => {
    const file = event.target.files && event.target.files[0];
    storeRepositoryFile(file);
    event.target.value = '';
  });
  document.getElementById('repoUpdateInput')?.addEventListener('change', event => {
    const file = event.target.files && event.target.files[0];
    const sheetId = event.target.dataset.sheetId;
    const authorizedUser = event.target.dataset.authorizedUser ? { name: event.target.dataset.authorizedUser } : null;
    storeRepositoryFile(file, sheetId, authorizedUser);
    event.target.value = '';
    delete event.target.dataset.sheetId;
    delete event.target.dataset.authorizedUser;
  });
  document.getElementById('repositoryTableBody')?.addEventListener('click', event => {
    const actionButton = event.target.closest('button');
    const viewBtn = event.target.closest('[data-repo-view]');
    const downloadBtn = event.target.closest('[data-repo-download]');
    const updateBtn = event.target.closest('[data-repo-update]');
    const deleteBtn = event.target.closest('[data-repo-delete]');
    const row = event.target.closest('[data-repo-open]');
    if (viewBtn) toggleRepositorySheet(viewBtn.dataset.repoView);
    else if (downloadBtn) downloadRepositorySheet(downloadBtn.dataset.repoDownload);
    if (updateBtn) {
      editRepositorySheet(updateBtn.dataset.repoUpdate);
    }
    if (deleteBtn) protectedDeleteRepositorySheet(deleteBtn.dataset.repoDelete);
    if (row && !actionButton) toggleRepositorySheet(row.dataset.repoOpen);
  });
  document.getElementById('repoBackBtn')?.addEventListener('click', () => {
    closeRepositoryDetail();
    document.getElementById('repositoryPanel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  document.getElementById('repoDetailDownloadBtn')?.addEventListener('click', () => {
    if (activeRepositorySheetId) downloadRepositorySheet(activeRepositorySheetId);
  });
  document.getElementById('closeRepoAuthBtn')?.addEventListener('click', () => closeRepositoryAuth(null));
  document.getElementById('cancelRepoAuthBtn')?.addEventListener('click', () => closeRepositoryAuth(null));
  document.getElementById('repoAuthModal')?.addEventListener('click', event => {
    if (event.target.id === 'repoAuthModal') closeRepositoryAuth(null);
  });
  document.getElementById('repoAuthForm')?.addEventListener('submit', event => {
    event.preventDefault();
    const login = document.getElementById('repoAuthLogin')?.value.trim() || '';
    const password = document.getElementById('repoAuthPassword')?.value || '';
    const user = validateRepoCredentials(login, password);
    const error = document.getElementById('repoAuthError');
    if (!user) {
      if (error) error.style.display = 'block';
      return;
    }
    closeRepositoryAuth(user);
  });
  document.getElementById('projectForm')?.addEventListener('submit', event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      projectName: form.get('projectName'),
      coreProduct: form.get('coreProduct'),
      projectType: form.get('projectType'),
      projectManager: form.get('projectManager'),
      developers: form.get('developers'),
      testEngineers: form.get('testEngineers')
    };
    if (editingProjectId) {
      const project = projects.find(item => item.id === editingProjectId);
      if (project) {
        project.name = payload.projectName;
        project.coreProduct = payload.coreProduct;
        project.type = payload.projectType;
        project.manager = payload.projectManager;
        project.developers = payload.developers;
        project.testEngineers = payload.testEngineers;
        project.modifiedAt = new Date().toISOString();
        activeProjectId = project.id;
        projectRepositoryOpen = true;
        localStorage.setItem(ANALYSIS_ACTIVE_KEY, project.id);
        addActivity('Updated', project, `Updated project repository ${project.name}`);
      }
    } else {
      const project = createProject(payload);
      projects = getStoredProjects();
      activeProjectId = project.id;
      projectRepositoryOpen = true;
      localStorage.setItem(ANALYSIS_ACTIVE_KEY, project.id);
    }
    saveProjects();
    event.currentTarget.reset();
    closeProjectModal();
    renderAll();
  });

  document.getElementById('projectCarousel')?.addEventListener('click', event => {
    const openBtn = event.target.closest('[data-project-open]');
    const editBtn = event.target.closest('[data-project-edit]');
    const deleteBtn = event.target.closest('[data-project-delete]');
    if (openBtn) setActiveProject(openBtn.dataset.projectOpen);
    if (editBtn) editProject(editBtn.dataset.projectEdit);
    if (deleteBtn) deleteProject(deleteBtn.dataset.projectDelete);
  });

  renderAll();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAnalysisPage);
} else {
  initAnalysisPage();
}
