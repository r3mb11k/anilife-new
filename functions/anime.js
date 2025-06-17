const fetch = require('node-fetch');

// --- In-memory cache for GraphQL queries (alive while Lambda stays warm) ---
const QUERY_CACHE = new Map(); // key => { data, expiry }
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const SHIKIMORI_GRAPHQL_URL = 'https://shikimori.one/api/graphql';
const USER_AGENT = 'AniLIFE Project (for educational purposes)';

/**
 * Выполняет запрос к GraphQL API Шикимори.
 * @param {string} query - GraphQL-запрос.
 * @param {object} variables - Переменные для запроса.
 * @returns {Promise<any>} - Данные от API.
 */
async function fetchFromShikimoriGraphQL(query, variables = {}) {
    // Генерируем ключ для кеша, включая переменные
    const cacheKey = JSON.stringify({ query, variables });

    // ---- Try cache first ----
    const cached = QUERY_CACHE.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
        console.log('[Cache] HIT for', cacheKey);
        return cached.data;
    }
    
    console.log('[GraphQL] Sending query. Variables:', JSON.stringify(variables));

    const response = await fetch(SHIKIMORI_GRAPHQL_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': USER_AGENT,
        },
        body: JSON.stringify({ query, variables }), // Отправляем и запрос, и переменные
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Shikimori GraphQL API responded with ${response.status}. Body: ${errorBody}`);
        throw new Error(`Shikimori GraphQL request failed with status ${response.status}`);
    }

    const json = await response.json();
    if (json.errors) {
        console.error('GraphQL Errors:', json.errors);
        throw new Error(`GraphQL query failed: ${json.errors.map(e => e.message).join(', ')}`);
    }

    // ---- Store in cache ----
    QUERY_CACHE.set(cacheKey, { data: json.data, expiry: Date.now() + CACHE_TTL_MS });

    return json.data;
}

// --- ШАБЛОНЫ ЗАПРОСОВ ---

// Универсальный запрос для списков аниме
const GET_ANIMES_QUERY = `
query GetAnimes(
    $limit: Int, 
    $page: Int, 
    $order: OrderEnum, 
    $kind: AnimeKindString, 
    $status: AnimeStatusString, 
    $genre: String, 
    $search: String,
    $ids: String,
    $rating: RatingString
) {
  animes(
      limit: $limit, 
      page: $page, 
      order: $order, 
      kind: $kind, 
      status: $status, 
      genre: $genre,
      search: $search,
      ids: $ids,
      rating: $rating
    ) {
    id
    name
    russian
    franchise
    score
    kind
    status
    episodes
    episodesAired
    airedOn { year }
    rating
    poster { mainUrl, originalUrl }
    genres { name russian }
  }
}
`;

// Запрос для детальной страницы аниме
const GET_ANIME_DETAILS_QUERY = `
query GetAnimeDetails($ids: String!) {
    animes(ids: $ids) {
        id
        russian
        name
        score
        kind
        status
        episodes
        episodesAired
        duration
        descriptionHtml
        airedOn { date }
        releasedOn { date }
        rating
        nextEpisodeAt
        poster { mainUrl, originalUrl }
        genres { russian }
        studios { name }
        videos { id, url, name, kind, playerUrl }
        screenshots { originalUrl }
    }
}
`;

const MAIN_PAGE_ANIME_QUERY = `
    query GetMainPageData($seasonalSeason: SeasonString) {
        seasonal: animes(limit: 20, season: $seasonalSeason, kind: "tv", order: popularity) { ...animeFields }
        top: animes(limit: 20, page: 1, order: ranked, kind: "tv") { ...animeFields }
        movies: animes(limit: 20, page: 1, order: popularity, kind: "movie") { ...animeFields }
        anons: animes(limit: 20, page: 1, order: popularity, status: "anons") { ...animeFields }
    }

    fragment animeFields on Anime {
        id
        name
        russian
        franchise
        score
        kind
        status
        episodes
        episodesAired
        airedOn { year }
        rating
        poster { mainUrl, originalUrl }
    }
`;

/**
 * Определяет текущий аниме-сезон в формате YYYY_season (например, "2024_summer").
 * @returns {string}
 */
function getCurrentAnimeSeason() {
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // getMonth() is 0-indexed

    // Shikimori GraphQL SeasonString format: "spring_2025", "winter_2025", etc.
    if (month >= 1 && month <= 3) return `winter_${year}`;
    if (month >= 4 && month <= 6) return `spring_${year}`;
    if (month >= 7 && month <= 9) return `summer_${year}`;
    return `autumn_${year}`; // 10–12
}

exports.handler = async (event) => {
    const { queryStringParameters } = event;
    const { action, id, order, limit, query: searchQuery, page, kind, status, genre, rating } = queryStringParameters;

    if (!action) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing action parameter' }) };
    }

    try {
        let data;
        let variables = {}; // shared GraphQL variables object
        
        switch (action) {
            case 'get_list':
                variables = {
                    limit: parseInt(limit) || 28,
                    page: parseInt(page) || 1,
                    order: order || 'popularity'
                };

                if (searchQuery) variables.search = searchQuery;

                // --- Обработка фильтров ---
                // Всегда преобразуем параметры в массив, если они существуют
                let postFilterKinds = null;
                let postFilterRatings = null;
                if (kind) {
                    if (Array.isArray(kind)) {
                        if (kind.length === 1) {
                            variables.kind = kind[0];
                        } else {
                            postFilterKinds = kind.map(k => k.trim());
                        }
                    } else if (kind.includes(',')) {
                        // Несколько значений, оставляем для пост-фильтрации, GraphQL не поддерживает массив для kind
                        postFilterKinds = kind.split(',').map(k => k.trim());
                    } else {
                        variables.kind = kind; // одиночное значение строкой
                    }
                }

                if (status) {
                    if (Array.isArray(status)) {
                        variables.status = status;
                    } else if (status.includes(',')) {
                        variables.status = status.split(',');
                    } else {
                        variables.status = status;
                    }
                }

                if (rating) {
                    if (Array.isArray(rating)) {
                        if (rating.length === 1) {
                            variables.rating = rating[0];
                        } else {
                            postFilterRatings = rating.map(r => r.trim());
                        }
                    } else if (rating.includes(',')) {
                        postFilterRatings = rating.split(',').map(r => r.trim());
                    } else {
                        variables.rating = rating;
                    }
                }

                if (genre) {
                    // Жанры должны быть строкой с ID через запятую, а не массивом
                    variables.genre = genre;
                }
                
                // Специальная логика для главной страницы
                if (order === 'ranked_movies') {
                    variables.order = 'popularity';
                    variables.kind = 'movie';
                } else if (order === 'ranked') {
                    // Cохраняем 'kind' если он был выбран в фильтрах
                    variables.kind = variables.kind || 'tv';
                }
                
                // 5. Обрабатываем `score` (минимальная оценка)
                if (queryStringParameters.score) {
                    variables.score = parseInt(queryStringParameters.score, 10);
                }
                
                data = (await fetchFromShikimoriGraphQL(GET_ANIMES_QUERY, variables)).animes;

                // --- После получения данных применяем пост-фильтрацию по нескольким типам/kind ---
                if (postFilterKinds && Array.isArray(postFilterKinds) && postFilterKinds.length > 0) {
                    data = data.filter(a => postFilterKinds.includes(a.kind));
                }
                if (postFilterRatings && Array.isArray(postFilterRatings) && postFilterRatings.length > 0) {
                    data = data.filter(a => postFilterRatings.includes(a.rating));
                }
                break;
            
            case 'get_genres':
                 const genreResponse = await fetch('https://shikimori.one/api/genres', {
                    headers: { 'User-Agent': USER_AGENT }
                });
                if (!genreResponse.ok) {
                    throw new Error(`Failed to fetch genres: ${genreResponse.statusText}`);
                }
                const allGenres = await genreResponse.json();
                // Фильтруем жанры: берём только с entry_type === 'Anime'
                const animeGenres = allGenres.filter(g => g.entry_type === 'Anime');
                // Убираем возможные дубликаты и 18+ жанры (хентай/яой/юри)
                const forbidden = new Set(['Hentai','Хентай','Yaoi','Яой','Yuri','Юри']);
                const unique = [];
                const seen = new Set();
                for (const g of animeGenres) {
                    if (forbidden.has(g.russian) || forbidden.has(g.name)) continue;
                    if (!seen.has(g.name)) {
                        unique.push(g);
                        seen.add(g.name);
                    }
                }
                data = unique;
                break;

            case 'get_seasonal':
                let seasonalVars = {
                    limit: parseInt(limit) || 20,
                    season: getCurrentAnimeSeason(),
                    kind: 'tv',
                    order: 'popularity'
                };
                data = (await fetchFromShikimoriGraphQL(GET_ANIMES_QUERY, seasonalVars)).animes;
                break;
            
            case 'get_details':
                if (!id) {
                    return { statusCode: 400, body: JSON.stringify({ error: 'Missing id parameter' }) };
                }
                const detailsResponse = await fetchFromShikimoriGraphQL(GET_ANIME_DETAILS_QUERY, { ids: id });
                data = detailsResponse.animes[0];

                if (!data) {
                    throw new Error(`No details found for Shikimori ID: ${id}`);
                }

                // Гарантируем, что объект poster существует, чтобы избежать ошибок на фронтенде.
                if (!data.poster) {
                    data.poster = {};
                }
                
                // Проверяем наличие KODIK_API_TOKEN
                if (!process.env.KODIK_API_TOKEN) {
                    console.warn('[get_details] KODIK_API_TOKEN is not set in the environment.');
                    data.playerInfoError = 'KODIK_API_TOKEN is not configured on the server.';
                } else {
                    // Получаем дополнительную информацию от Kodik (озвучки, субтитры и т.д.)
                    console.log(`[get_details] Getting player data from Kodik for Shikimori ID: ${id}`);
                    try {
                        const kodikApiUrl = new URL(`https://kodikapi.com/search`);
                        kodikApiUrl.searchParams.append('token', process.env.KODIK_API_TOKEN);
                        kodikApiUrl.searchParams.append('shikimori_id', id);
                        kodikApiUrl.searchParams.append('with_episodes', 'true');
                        kodikApiUrl.searchParams.append('with_material_data', 'true');

                        const kodikResponse = await fetch(kodikApiUrl.toString(), { method: 'POST' });

                        if (!kodikResponse.ok) {
                            throw new Error(`Kodik API request failed with status ${kodikResponse.status}`);
                        }

                        const kodikData = await kodikResponse.json();
                        
                        if (kodikData.results?.length > 0) {
                            const translationsProcessed = kodikData.results.map(r => ({
                                id: r.translation?.id || null,
                                title: r.translation?.title || 'Unknown',
                                type: r.translation?.type || 'voice',
                                link: r.link,
                                episodes: r.episodes,
                                episodes_count: r.episodes_count || (r.episodes ? r.episodes.length : null)
                            }));
                            
                            const firstResult = kodikData.results[0];
                            data.playerInfo = {
                                translations: translationsProcessed,
                                defaultLink: firstResult.link,
                                totalEpisodes: firstResult.episodes_count || (firstResult.episodes ? firstResult.episodes.length : 0),
                                episodes: firstResult.episodes || {}
                            };
                        } else {
                            data.playerInfoError = "Плеер не найден на Kodik.";
                        }
                    } catch (kodikError) {
                        console.error(`[get_details] Failed to get player data from Kodik: ${kodikError.message}`);
                        data.playerInfoError = `Не удалось загрузить плеер: ${kodikError.message}`;
                    }
                }
                
                break;
            
            case 'search':
                if (!searchQuery) throw new Error("Query is required for search");
                variables.search = searchQuery;
                variables.limit = 20; // Ограничение на количество результатов поиска

                // --- Фильтрация 18+ контента ---
                // 1. Допустимые рейтинги ("rx" будет отфильтрован после запроса)
                const allowedRatings = ['g','pg','pg_13','r','r_plus'];

                // 2. Исключаем по ID жанров (Yaoi, Yuri, Hentai, etc.)
                // IDs: 33-yaoi, 34-yuri, 12-hentai, 26-shoujo_ai, 28-shounen_ai, 539-erotica
                const forbiddenGenreIds = ['!33', '!34', '!12', '!26', '!28'];
                variables.genre = forbiddenGenreIds.join(',');

                data = (await fetchFromShikimoriGraphQL(GET_ANIMES_QUERY, variables)).animes.filter(a => allowedRatings.includes(a.rating));
                break;
            
            case 'get_related':
                if (!id) throw new Error("Anime ID is required for get_related");
                {
                    const url = `https://shikimori.one/api/animes/${id}/related`;
                    const resp = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
                    if (!resp.ok) {
                        throw new Error(`Shikimori REST request failed with status ${resp.status}`);
                    }
                    data = await resp.json();

                    // ---- ДОБОР ПОЛНОРАЗМЕРНЫХ ПОСТЕРОВ ЧЕРЕЗ GraphQL ----
                    const ids = data.map(r => r.anime?.id).filter(Boolean);
                    if (ids.length > 0) {
                        const idsString = ids.join(',');
                        const postersResp = await fetchFromShikimoriGraphQL(GET_ANIMES_QUERY, { ids: idsString });
                        const posterMap = new Map();
                        const adultGenreNames = new Set(['hentai', 'yaoi', 'yuri', 'хентай', 'яой', 'юри', 'сёнен-ай', 'shounen-ai', 'сёдзё-ай', 'shoujo-ai']);
                        const adultRatings = new Set(['rx']);
                        const blockedIds = new Set();
                        
                        if (postersResp.animes) {
                            postersResp.animes.forEach(a => {
                                posterMap.set(a.id, a.poster?.originalUrl || a.poster?.mainUrl || null);

                                const isAdultRating = adultRatings.has((a.rating || '').toLowerCase());
                                const hasAdultGenre = Array.isArray(a.genres) && a.genres.some(g => 
                                    adultGenreNames.has((g.name || '').toLowerCase()) || 
                                    adultGenreNames.has((g.russian || '').toLowerCase())
                                );

                                if (isAdultRating || hasAdultGenre) {
                                    blockedIds.add(String(a.id));
                                }
                            });
                        }

                        // Фильтруем `data` (результат related) и обогащаем постерами
                        data = data
                            .filter(rel => rel.anime && !blockedIds.has(String(rel.anime.id)))
                            .map(rel => {
                                const poster = posterMap.get(rel.anime.id);
                                if (poster) {
                                    const posterPath = poster.startsWith('http') ? new URL(poster).pathname : poster;
                                    rel.anime.image = { ...rel.anime.image, original: posterPath };
                                }
                                return rel;
                            });
                    }
                }
                break;

            case 'get_similar':
                if (!id) throw new Error("Anime ID is required for get_similar");
                {
                    const url = `https://shikimori.one/api/animes/${id}/similar`;
                    const resp = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
                    if (!resp.ok) {
                        throw new Error(`Shikimori REST request failed with status ${resp.status}`);
                    }
                    data = (await resp.json()).slice(0, 20); // limit to 20 for speed

                    // --- Fetch posters for these IDs via GraphQL (benefits from cache) ---
                    const ids = data.map(a => a.id).filter(Boolean);
                    if (ids.length > 0) {
                        const idsString = ids.join(',');
                        const postersResp = await fetchFromShikimoriGraphQL(GET_ANIMES_QUERY, { ids: idsString });
                        const posterMap = new Map();
                        const adultGenreNames = new Set(['hentai', 'yaoi', 'yuri', 'хентай', 'яой', 'юри', 'сёнен-ай', 'shounen-ai', 'сёдзё-ай', 'shoujo-ai']);
                        const adultRatings = new Set(['rx']);
                        const blockedIds = new Set();
                        
                        if (postersResp.animes) {
                            postersResp.animes.forEach(a => {
                                posterMap.set(a.id, a.poster?.originalUrl || a.poster?.mainUrl || null);

                                const isAdultRating = adultRatings.has((a.rating || '').toLowerCase());
                                const hasAdultGenre = Array.isArray(a.genres) && a.genres.some(g => 
                                    adultGenreNames.has((g.name || '').toLowerCase()) || 
                                    adultGenreNames.has((g.russian || '').toLowerCase())
                                );

                                if (isAdultRating || hasAdultGenre) {
                                    blockedIds.add(String(a.id));
                                }
                            });
                        }

                        // Фильтруем `data` (результат similar) и обогащаем постерами
                        data = data
                            .filter(anime => !blockedIds.has(String(anime.id)))
                            .map(anime => {
                                const poster = posterMap.get(anime.id);
                                if (poster) {
                                    // Убедимся, что image.original без хоста
                                    const posterPath = poster.startsWith('http') ? new URL(poster).pathname : poster;
                                    anime.image = { ...anime.image, original: posterPath };
                                }
                                return anime;
                            });
                    }
                }
                break;
            
            case 'catalog':
                variables.page = parseInt(page) || 1;
                variables.limit = 48;
                variables.order = order || 'popularity';
                if (kind) variables.kind = kind;
                if (status) variables.status = status;
                if (genre) variables.genre = genre;
                data = (await fetchFromShikimoriGraphQL(GET_ANIMES_QUERY, variables)).animes;
                break;

            case 'get_main_page_data':
                const mainPageCacheKey = 'main_page_data';
                const cachedMain = QUERY_CACHE.get(mainPageCacheKey);
                if (cachedMain && cachedMain.expiry > Date.now()) {
                    console.log('[Cache] HIT for main page data');
                    data = cachedMain.data;
                } else {
                    console.log('[Cache] MISS for main page data');
                    try {
                        const [animeData, genresDataRaw] = await Promise.all([
                            fetchFromShikimoriGraphQL(MAIN_PAGE_ANIME_QUERY, { seasonalSeason: getCurrentAnimeSeason() }),
                            fetch('https://shikimori.one/api/genres', { headers: { 'User-Agent': USER_AGENT } }).then(r => r.json())
                        ]);

                        // Фильтруем 18+ жанры
                        const adultGenres = new Set(['Hentai', 'Yaoi', 'Yuri']);
                        const genresData = genresDataRaw.filter(g => !adultGenres.has(g.name));

                        const deduplicate = (list) => {
                            const seen = new Set();
                            return (Array.isArray(list)?list:[]).filter(a => {
                                if (!a.franchise) return true;
                                if (seen.has(a.franchise)) return false;
                                seen.add(a.franchise);
                                return true;
                            });
                        };

                        data = {
                            seasonal: deduplicate(animeData.seasonal),
                            top: deduplicate(animeData.top),
                            movies: deduplicate(animeData.movies),
                            anons: deduplicate(animeData.anons),
                            genres: genresData
                        };

                        QUERY_CACHE.set(mainPageCacheKey, { data, expiry: Date.now() + CACHE_TTL_MS });
                    } catch (err) {
                        console.error('[main_page_data] failed:', err.message);
                        if (cachedMain) {
                            console.log('Serving stale cached main page data');
                            data = cachedMain.data;
                        } else {
                            data = { error: 'rate_limited' };
                        }
                    }
                }
                break;

            default:
                throw new Error(`Invalid action: ${action}`);
        }

        // --- ЛОГИКА ДЕДУПЛИКАЦИИ ---
        // Если это запрос для списков на главной (не поиск), применяем фильтрацию по франшизе
        if (action === 'get_list' && Array.isArray(data)) {
            const seenFranchises = new Set();
            const deduplicatedData = [];
            for (const anime of data) {
                if (anime.franchise) {
                    if (!seenFranchises.has(anime.franchise)) {
                        seenFranchises.add(anime.franchise);
                        deduplicatedData.push(anime);
                    }
                } else {
                    // Если у аниме нет франшизы, просто добавляем его
                    deduplicatedData.push(anime);
                }
            }
            data = deduplicatedData;
        }
        // --- КОНЕЦ ЛОГИКИ ДЕДУПЛИКАЦИИ ---

        // --- ФИНАЛЬНАЯ САНИТИЗАЦИЯ ПЕРЕД ОТПРАВКОЙ ---
        // Эта проверка гарантирует, что НИКАКОЙ нежелательный контент не просочится,
        // даже если логика выше дала сбой.
        if (data && (action === 'get_related' || action === 'get_similar')) {
            const adultGenreNames = new Set(['hentai', 'yaoi', 'yuri', 'хентай', 'яой', 'юри', 'сёнен-ай', 'shounen-ai', 'сёдзё-ай', 'shoujo-ai']);
            const isRx = (item) => item.rating === 'rx' || (item.anime && item.anime.rating === 'rx');
            
            const hasAdultGenre = (item) => {
                const genres = item.genres || (item.anime && item.anime.genres) || [];
                return genres.some(g => adultGenreNames.has((g.name || '').toLowerCase()) || adultGenreNames.has((g.russian || '').toLowerCase()));
            };

            if (Array.isArray(data)) {
                data = data.filter(item => !isRx(item) && !hasAdultGenre(item));
            }
        }

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        };
    } catch (error) {
        console.error('Error in handler:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error' })
        };
    }
}; 