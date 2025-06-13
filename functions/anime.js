const fetch = require('node-fetch');
const { getAniboomDescription } = require('./aniboom_bridge');

const SHIKIMORI_GRAPHQL_URL = 'https://shikimori.one/api/graphql';
const USER_AGENT = 'AniLIFE Project (for educational purposes)';

/**
 * Строит строку аргументов для GraphQL запроса динамически и ЯВНО.
 * @param {object} variables - Объект с переменными запроса.
 * @returns {string} - Отформатированная строка аргументов.
 */
function buildGraphQLArgs(variables) {
    const args = [];
    // Явное определение, какие ключи являются enum (без кавычек), а какие - числами
    const enumKeys = ['order'];
    const numericKeys = ['limit'];

    for (const key in variables) {
        const value = variables[key];
        if (value === undefined || value === null) continue;

        if (numericKeys.includes(key)) {
            args.push(`${key}: ${value}`); // Числа без кавычек
        } else if (enumKeys.includes(key)) {
            args.push(`${key}: ${value}`); // Enum без кавычек
        } else {
            // Все остальные параметры (status, kind, ids, search) - это строки, они должны быть в кавычках
            args.push(`${key}: "${value}"`);
        }
    }
    return args.join(', ');
}

/**
 * Выполняет запрос к GraphQL API Шикимори.
 * @param {string} queryTemplate - Шаблон GraphQL-запроса с плейсхолдером {{args}}.
 * @param {object} variables - Переменные для запроса.
 * @returns {Promise<any>} - Данные от API.
 */
async function fetchFromShikimoriGraphQL(queryTemplate, variables) {
    const argsString = buildGraphQLArgs(variables);
    const query = queryTemplate.replace('{{args}}', argsString);
    
    console.log('[GraphQL] Sending query:', query);
    
    const response = await fetch(SHIKIMORI_GRAPHQL_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': USER_AGENT,
        },
        body: JSON.stringify({ query }), // Передаем только query, без variables
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

    return json.data;
}

// --- ШАБЛОНЫ ЗАПРОСОВ ---
// Используем плейсхолдер {{args}} для динамической подстановки

const GET_ANIMES_QUERY_TEMPLATE = `
query GetAnimes {
  animes({{args}}) {
    id
    name
    russian
    franchise
    score
    kind
    status
    episodes
    episodesAired
    airedOn {
      year
    }
    poster {
      mainUrl
      originalUrl
    }
  }
}
`;

const GET_ANIME_DETAILS_QUERY_TEMPLATE = `
query GetAnimeDetails {
    animes({{args}}) {
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
        airedOn {
            date
        }
        releasedOn {
            date
        }
        rating
        nextEpisodeAt
        poster {
            mainUrl
            originalUrl
        }
        genres {
            russian
        }
        studios {
            name
        }
        videos {
            id
            url
            name
            kind
            playerUrl
        }
        screenshots {
           originalUrl
        }
    }
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
    const { action, id, order, limit, query: searchQuery, page, kind, status, genre } = queryStringParameters;

    try {
        let data;
        let variables = {
            limit: parseInt(limit) || 20,
        };

        switch (action) {
            case 'get_list':
                // Устанавливаем базовые переменные из queryString
                variables = {
                    limit: parseInt(limit) || 20,
                    order: order || 'popularity' // order обязателен для get_list
                };

                // Обрабатываем kind и status как строковые значения
                if (kind) {
                    variables.kind = kind.toLowerCase();
                }
                if (status) {
                    variables.status = status.toLowerCase();
                }

                // Обработка прежних специальных псевдо-значений order
                if (order === 'ranked_movies') {
                    variables.order = 'popularity';
                    variables.kind = 'movie';
                }
                if (order === 'ranked') {
                    variables.kind = 'tv';
                }
                
                data = (await fetchFromShikimoriGraphQL(GET_ANIMES_QUERY_TEMPLATE, variables)).animes;
                break;
            
            case 'get_seasonal':
                variables.season = getCurrentAnimeSeason();
                variables.kind = 'tv'; // Сезонное аниме — только сериалы
                variables.order = 'popularity';
                data = (await fetchFromShikimoriGraphQL(GET_ANIMES_QUERY_TEMPLATE, variables)).animes;
                break;
            
            case 'get_details':
                if (!id) throw new Error("Anime ID is required for get_details");
                const detailsResponse = await fetchFromShikimoriGraphQL(GET_ANIME_DETAILS_QUERY_TEMPLATE, { ids: id });
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
                        // Формируем URL с параметрами в query string
                        const kodikApiUrl = new URL(`https://kodikapi.com/search`);
                        kodikApiUrl.searchParams.append('token', process.env.KODIK_API_TOKEN);
                        kodikApiUrl.searchParams.append('shikimori_id', id);
                        kodikApiUrl.searchParams.append('with_episodes', 'true');
                        kodikApiUrl.searchParams.append('with_material_data', 'true');

                        // Отправляем POST-запрос с пустым телом
                        const kodikResponse = await fetch(kodikApiUrl.toString(), {
                            method: 'POST'
                        });

                        if (kodikResponse.ok) {
                            const kodikData = await kodikResponse.json();
                            if (kodikData.results?.length > 0) {
                                // Собираем список переводов с прямыми ссылками
                                const translationsProcessed = kodikData.results.map(r => ({
                                    id: r.translation?.id || null,
                                    title: r.translation?.title || 'Unknown',
                                    type: r.translation?.type || 'voice',
                                    link: r.link,
                                    episodes_count: r.episodes ? r.episodes.length : (r.episodes_count || null)
                                }));
                                // Используем первый результат как базовый
                                const first = translationsProcessed[0];
                                data.playerInfo = {
                                    translations: translationsProcessed,
                                    defaultLink: first.link,
                                    defaultTranslationId: first.id,
                                    episodes: first.episodes_count
                                };
                            } else {
                                console.log(`[get_details] Kodik search was successful but no player data found for ID ${id}.`);
                                data.playerInfoError = 'Player not found on Kodik.';
                            }
                        } else {
                            console.warn(`[get_details] Kodik API request failed for ID ${id} with status: ${kodikResponse.status}`);
                            data.playerInfoError = `Kodik API request failed with status: ${kodikResponse.status}`;
                        }
                    } catch (e) {
                        console.error(`[get_details] Error fetching from Kodik for ID ${id}:`, e);
                        data.playerInfoError = 'An error occurred while fetching data from Kodik.';
                    }
                }

                // Если у Шикимори нет описания, пытаемся получить его с Aniboom (AnimeGO)
                
                // --- ОТЛАДКА ---
                console.log(`[get_details] Проверка описания для '${data.russian}'. descriptionHtml:`, JSON.stringify(data.descriptionHtml));
                // --- КОНЕЦ ОТЛАДКИ ---

                // Улучшенная проверка: удаляем HTML-теги и проверяем, остался ли текст.
                const plainTextDescription = data.descriptionHtml ? data.descriptionHtml.replace(/<[^>]*>/g, '').trim() : '';

                if (!plainTextDescription || data.descriptionHtml.includes('[description')) {
                    try {
                        const russianTitle = data.russian;
                        const originalTitle = data.name;
                        
                        console.log(`[get_details] Description for '${russianTitle}' is empty. Fetching from Aniboom.`);
                        
                        // Передаем оба названия в мост
                        const aniboomDescription = await getAniboomDescription(russianTitle, originalTitle);

                        if (aniboomDescription) {
                            console.log(`[get_details] Found description on Aniboom.`);
                            data.descriptionHtml = aniboomDescription;
                        } else {
                             console.log(`[get_details] Description not found on Aniboom for '${russianTitle}' or '${originalTitle}'.`);
                        }
                    } catch (e) {
                        // Логируем ошибку, но не прерываем выполнение, 
                        // чтобы пользователь получил остальные данные.
                        console.error(`[get_details] Failed to get description from Aniboom bridge:`, e.message);
                    }
                }
                break;
            
            case 'search':
                if (!searchQuery) throw new Error("Query is required for search");
                variables.search = searchQuery;
                variables.limit = 20; // Ограничение на количество результатов поиска
                data = (await fetchFromShikimoriGraphQL(GET_ANIMES_QUERY_TEMPLATE, variables)).animes;
                break;
            
            case 'get_related':
                if (!id) throw new Error("Anime ID is required for get_related");
                {
                    const url = `https://shikimori.one/api/animes/${id}/related`;
                    const resp = await fetch(url, {
                        headers: { 'User-Agent': USER_AGENT }
                    });
                    if (!resp.ok) {
                        throw new Error(`Shikimori REST request failed with status ${resp.status}`);
                    }
                    data = await resp.json();
                }
                break;

            case 'get_similar':
                if (!id) throw new Error("Anime ID is required for get_similar");
                {
                    const url = `https://shikimori.one/api/animes/${id}/similar`;
                    const resp = await fetch(url, {
                        headers: { 'User-Agent': USER_AGENT }
                    });
                    if (!resp.ok) {
                        throw new Error(`Shikimori REST request failed with status ${resp.status}`);
                    }
                    data = await resp.json();
                }
                break;
            
            case 'catalog':
                variables.page = parseInt(page) || 1;
                variables.limit = 48;
                variables.order = order || 'popularity';
                if (kind) variables.kind = kind;
                if (status) variables.status = status;
                if (genre) variables.genre = genre;
                data = (await fetchFromShikimoriGraphQL(GET_ANIMES_QUERY_TEMPLATE, variables)).animes;
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

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        };
    } catch (error) {
        console.error('Error in Netlify function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
}; 