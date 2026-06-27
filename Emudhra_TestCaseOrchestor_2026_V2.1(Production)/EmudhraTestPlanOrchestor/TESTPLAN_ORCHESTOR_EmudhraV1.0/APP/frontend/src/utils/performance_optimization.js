/**
 * PERFORMANCE OPTIMIZATION MODULE
 * Fixes critical bottlenecks to speed up the application
 */

// ===== 1. REQUEST TIMEOUT & RETRY LOGIC =====
const withTimeout = async (fn, timeoutMs = 60000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const result = await fn(controller.signal);
    clearTimeout(timeoutId);
    return result;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw err;
  }
};

// Retry logic with exponential backoff
const withRetry = async (fn, maxRetries = 3, baseDelay = 1000) => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxRetries - 1) throw err;
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`⏳ Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// ===== 2. DEBOUNCING FOR INPUT HANDLERS =====
const debounce = (func, delay = 300) => {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
};

const throttle = (func, delay = 300) => {
  let lastCall = 0;
  return function(...args) {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      return func.apply(this, args);
    }
  };
};

// ===== 3. CACHING LAYER =====
class CacheManager {
  constructor(ttl = 5 * 60 * 1000) { // 5 min default TTL
    this.cache = new Map();
    this.ttl = ttl;
  }

  set(key, value, ttl = this.ttl) {
    const expiresAt = Date.now() + ttl;
    this.cache.set(key, { value, expiresAt });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }
}

const apiKeyCache = new CacheManager(24 * 60 * 60 * 1000); // 24h for API keys
const modelListCache = new CacheManager(60 * 60 * 1000); // 1h for model lists
const responseCache = new CacheManager(5 * 60 * 1000); // 5m for responses

// ===== 4. DOM QUERY OPTIMIZATION =====
const DOMCache = {
  cache: new Map(),
  
  get(selector, useCache = true) {
    if (useCache && this.cache.has(selector)) {
      return this.cache.get(selector);
    }
    const element = document.querySelector(selector);
    if (element && useCache) {
      this.cache.set(selector, element);
    }
    return element;
  },

  getAll(selector, useCache = true) {
    const cacheKey = `${selector}::all`;
    if (useCache && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    const elements = document.querySelectorAll(selector);
    if (useCache) {
      this.cache.set(cacheKey, elements);
    }
    return elements;
  },

  invalidate() {
    this.cache.clear();
  }
};

// ===== 5. VIRTUAL SCROLLING FOR LISTS =====
class VirtualScroller {
  constructor(container, itemHeight, renderItem, totalItems) {
    this.container = container;
    this.itemHeight = itemHeight;
    this.renderItem = renderItem;
    this.totalItems = totalItems;
    this.visibleRange = { start: 0, end: 0 };
    
    this.container.addEventListener('scroll', throttle(() => this.onScroll(), 100));
  }

  onScroll() {
    const scrollTop = this.container.scrollTop;
    const containerHeight = this.container.clientHeight;
    
    this.visibleRange.start = Math.floor(scrollTop / this.itemHeight);
    this.visibleRange.end = Math.ceil((scrollTop + containerHeight) / this.itemHeight);
    
    this.render();
  }

  render() {
    const fragment = document.createDocumentFragment();
    
    for (let i = this.visibleRange.start; i < this.visibleRange.end && i < this.totalItems; i++) {
      const item = this.renderItem(i);
      fragment.appendChild(item);
    }
    
    this.container.innerHTML = '';
    this.container.appendChild(fragment);
  }

  setTotalItems(count) {
    this.totalItems = count;
    this.container.style.height = (count * this.itemHeight) + 'px';
  }
}

// ===== 6. WEB WORKER FILE PARSER =====
// Create a Web Worker for heavy file parsing
const createFileParserWorker = () => {
  const workerCode = `
    self.onmessage = function(e) {
      const { file, type } = e.data;
      
      try {
        if (type === 'json') {
          const parsed = JSON.parse(file);
          self.postMessage({ success: true, data: parsed });
        } else if (type === 'csv') {
          const lines = file.split('\\n');
          const headers = lines[0].split(',');
          const data = lines.slice(1).map(line => {
            const values = line.split(',');
            const obj = {};
            headers.forEach((h, i) => obj[h] = values[i]);
            return obj;
          });
          self.postMessage({ success: true, data });
        } else {
          self.postMessage({ success: false, error: 'Unsupported type' });
        }
      } catch (err) {
        self.postMessage({ success: false, error: err.message });
      }
    };
  `;
  
  const blob = new Blob([workerCode], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
};

// ===== 7. STREAMING RESPONSE PARSER =====
const parseStreamingResponse = (fullResponse) => {
  const sections = {
    testPlan: '',
    scenarios: '',
    testCases: '',
    automation: ''
  };

  const testPlanMatch = fullResponse.match(/\[TEST_PLAN_START\]([\s\S]*?)\[TEST_PLAN_END\]/);
  const scenariosMatch = fullResponse.match(/\[SCENARIOS_START\]([\s\S]*?)\[SCENARIOS_END\]/);
  const testCasesMatch = fullResponse.match(/\[TEST_CASES_START\]([\s\S]*?)\[TEST_CASES_END\]/);
  const automationMatch = fullResponse.match(/\[AUTOMATION_START\]([\s\S]*?)\[AUTOMATION_END\]/);

  if (testPlanMatch) sections.testPlan = testPlanMatch[1].trim();
  if (scenariosMatch) sections.scenarios = scenariosMatch[1].trim();
  if (testCasesMatch) sections.testCases = testCasesMatch[1].trim();
  if (automationMatch) sections.automation = automationMatch[1].trim();

  return sections;
};

// ===== 8. GPU-ACCELERATED ANIMATIONS =====
const optimizeAnimation = (element) => {
  element.style.willChange = 'transform, opacity';
  element.style.transform = 'translate3d(0, 0, 0)'; // GPU hint
  
  return () => {
    element.style.willChange = 'auto';
  };
};

// ===== 9. REQUEST RATE LIMITER =====
class RateLimiter {
  constructor(maxRequests = 5, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  async acquire() {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.acquire(); // Retry after wait
    }
    
    this.requests.push(now);
    return true;
  }
}

const apiLimiter = new RateLimiter(5, 60000); // 5 requests per minute

// ===== 10. BATCH DOM UPDATES =====
const batchDOMUpdates = (updates) => {
  requestAnimationFrame(() => {
    updates.forEach(({ element, property, value }) => {
      element.style[property] = value;
    });
  });
};

// ===== EXPORT ALL OPTIMIZATIONS =====
window.PerformanceOptimizations = {
  withTimeout,
  withRetry,
  debounce,
  throttle,
  CacheManager,
  DOMCache,
  VirtualScroller,
  createFileParserWorker,
  parseStreamingResponse,
  optimizeAnimation,
  RateLimiter,
  apiLimiter,
  batchDOMUpdates,
  apiKeyCache,
  modelListCache,
  responseCache
};

console.log('✅ Performance Optimization Module Loaded');
