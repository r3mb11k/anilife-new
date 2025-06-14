/**
 * Poster & Banner helper using Kitsu REST API as primary source
 * and Shikimori images as ultimate fallback (handled by caller).
 *
 * Exposes two global async functions:
 *   fetchKitsuPoster(anime)  -> Promise<string|null>
 *   fetchKitsuBanner(anime)  -> Promise<string|null>
 *
 * Both functions accept the original Shikimori anime object and attempt
 * to resolve a corresponding image URL on Kitsu by searching with the
 * Russian or Romaji title.
 */

// --- Internal constants & caches ------------------------------------------------
const __TTL = 24 * 60 * 60 * 1000; // 24 hours
const __rawCache = new Map();      // title -> { data, ts }

// Concurrency limiter so we do not spam Kitsu (limit ~8 parallel)
const __MAX_PARALLEL = 8;
let __inflight = 0;
const __queue = [];

// --- Helper: persistent localStorage cache -------------------------------------
function __lsRead(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { value, ts } = JSON.parse(raw);
    return Date.now() - ts < __TTL ? value : null;
  } catch { return null; }
}

function __lsWrite(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify({ value, ts: Date.now() }));
  } catch { /* quota errors are ignored */ }
}

// --- Helper: concurrency-aware queue -------------------------------------------
function __enqueue(task) {
  return new Promise(resolve => {
    __queue.push({ task, resolve });
    __dequeue();
  });
}

function __dequeue() {
  if (__inflight >= __MAX_PARALLEL || __queue.length === 0) return;
  const { task, resolve } = __queue.shift();
  __inflight++;
  task()
    .then(resolve)
    .catch(() => resolve(null))
    .finally(() => {
      __inflight--;
      __dequeue();
    });
}

// --- Core: fetch raw Kitsu data for a title ------------------------------------
async function __fetchKitsuData(title) {
  const url = `https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(title)}&page[limit]=1`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const resp = await fetch(url, {
      headers: { Accept: 'application/vnd.api+json' },
      signal: controller.signal
    });
    if (!resp.ok) return null;
    const json = await resp.json();
    return json.data?.[0]?.attributes || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function __getKitsuData(title) {
  // Memory-level cache first
  const cached = __rawCache.get(title);
  if (cached && Date.now() - cached.ts < __TTL) {
    return cached.data;
  }

  // Persistent cache (localStorage)
  const persisted = __lsRead(`kitsuData_${title}`);
  if (persisted) {
    __rawCache.set(title, { data: persisted, ts: Date.now() });
    return persisted;
  }

  // Remote fetch (queued)
  const data = await __enqueue(() => __fetchKitsuData(title));
  if (data) {
    __rawCache.set(title, { data, ts: Date.now() });
    __lsWrite(`kitsuData_${title}`, data);
  }
  return data;
}

// --- Public helpers -------------------------------------------------------------
async function fetchKitsuPoster(anime) {
  const title = anime?.name || anime?.russian;
  if (!title) return null;
  const data = await __getKitsuData(title);
  return data?.posterImage?.large || data?.posterImage?.medium || null;
}

async function fetchKitsuBanner(anime) {
  const title = anime?.name || anime?.russian;
  if (!title) return null;
  const data = await __getKitsuData(title);
  return data?.coverImage?.large || data?.coverImage?.original || null;
}

// Expose globally so that other inline scripts can use them
window.fetchKitsuPoster = fetchKitsuPoster;
window.fetchKitsuBanner = fetchKitsuBanner; 