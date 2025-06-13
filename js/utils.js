/**
 * Получает постер с Kitsu для одного аниме.
 * @param {object} anime - Объект аниме.
 * @returns {Promise<string|null>} - URL постера или null.
 */
async function fetchKitsuPoster(anime) {
    // Ищем по наиболее точному названию: сначала английское, потом ромадзи, потом русское
    const titleToSearch = anime.name || anime.russian;
    if (!titleToSearch) return null;

    try {
        const response = await fetch(`https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(titleToSearch)}&page[limit]=1`);
        if (!response.ok) return null;

        const kitsuData = await response.json();
        // Берем самый первый результат, он обычно самый релевантный
        return kitsuData.data[0]?.attributes?.posterImage?.medium || null;
    } catch (error) {
        console.error(`Ошибка при запросе постера с Kitsu для "${titleToSearch}":`, error);
        return null;
    }
}

// --- Расширенная версия fetchKitsuPoster с кэшем и ограничением одновременных запросов ---
const __kitsuPosterCache = new Map();
const __kitsuFetchQueue = [];
let __kitsuActiveRequests = 0;
const __KITSU_MAX_CONCURRENT = 8;

/**
 * Внутренняя функция, которая делает фактический запрос к Kitsu API.
 * @param {string} titleToSearch
 * @returns {Promise<string|null>}
 */
async function __doKitsuFetch(titleToSearch) {
    const url = `https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(titleToSearch)}&page[limit]=1`;
    try {
        const response = await fetch(url, {
            headers: {
                'Accept': 'application/vnd.api+json'
            }
        });
        if (!response.ok) return null;
        const kitsuData = await response.json();
        return kitsuData.data?.[0]?.attributes?.posterImage?.medium || null;
    } catch (error) {
        console.error(`Ошибка при запросе постера с Kitsu для "${titleToSearch}":`, error);
        return null;
    }
}

/**
 * Обрабатывает очередь запросов, поддерживая максимум __KITSU_MAX_CONCURRENT одновременно.
 */
function __processKitsuQueue() {
    if (__kitsuActiveRequests >= __KITSU_MAX_CONCURRENT || __kitsuFetchQueue.length === 0) return;
    const { titleToSearch, resolve } = __kitsuFetchQueue.shift();
    __kitsuActiveRequests++;
    __doKitsuFetch(titleToSearch)
        .then(result => {
            __kitsuPosterCache.set(titleToSearch, result);
            resolve(result);
        })
        .finally(() => {
            __kitsuActiveRequests--;
            // Запускаем обработку следующего элемента очереди
            __processKitsuQueue();
        });
}

/**
 * Получает постер с Kitsu для одного аниме.
 * Использует кэш и ограничивает количество одновременных сетевых запросов.
 * @param {object} anime - Объект аниме.
 * @returns {Promise<string|null>} - URL постера или null.
 */
async function fetchKitsuPoster(anime) {
    const titleToSearch = anime?.name || anime?.russian;
    if (!titleToSearch) return null;

    // Если уже есть в кэше – возвращаем сразу
    if (__kitsuPosterCache.has(titleToSearch)) {
        return __kitsuPosterCache.get(titleToSearch);
    }

    // Создаём Promise и ставим запрос в очередь
    return new Promise((resolve) => {
        __kitsuFetchQueue.push({ titleToSearch, resolve });
        __processKitsuQueue();
    });
}

// --- Persistent cache в localStorage (TTL 24 ч) ---
function __getPersistedPoster(title) {
    try {
        const raw = localStorage.getItem(`kitsuPoster_${title}`);
        if (!raw) return null;
        const { url, ts } = JSON.parse(raw);
        // истекает через 24ч
        const isFresh = Date.now() - ts < 24 * 60 * 60 * 1000;
        return isFresh ? url : null;
    } catch { return null; }
}

function __persistPoster(title, url) {
    try {
        localStorage.setItem(`kitsuPoster_${title}`, JSON.stringify({ url, ts: Date.now() }));
    } catch { /* ignore quota errors */ }
} 