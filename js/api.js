/**
 * Базовый URL для нашего Netlify API.
 * В локальной среде это может быть http://localhost:8888/.netlify/functions/
 * В продакшене это будет /netlify/functions/
 */
const API_BASE_URL = '/.netlify/functions/anime';

/**
 * Основная функция для взаимодействия с нашим бэкенд-API.
 * @param {string} action - Действие, которое нужно выполнить (например, 'get_list').
 * @param {Object} params - Дополнительные параметры для запроса (например, { order: 'popular' }).
 * @returns {Promise<any>} - Данные от API.
 */
async function fetchFromApi(action, params = {}) {
    // Добавляем действие в параметры
    params.action = action;
    
    // Преобразуем объект параметров в строку запроса (например, "action=get_list&order=popular")
    const queryString = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}?${queryString}`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            // Если ответ не успешный, пытаемся прочитать тело ошибки
            const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
            console.error(`API Error (${response.status}):`, errorData);
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        return await response.json();

    } catch (error) {
        console.error('Failed to fetch from API:', error);
        // Возвращаем пустой массив или объект, чтобы приложение не падало
        return []; 
    }
}

async function getKitsuData(animeObject, imageType) {
    const title = animeObject.name || animeObject.russian;
    const year = animeObject.airedOn?.year;

    if (!title) return null;

    try {
        const url = `https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(title)}`;
        const response = await fetch(url);

        if (!response.ok) {
            console.error(`Kitsu API error (${response.status}): ${response.statusText}`);
            return null;
        }

        const data = await response.json();

        if (!data.data || data.data.length === 0) {
            return null;
        }

        // Ищем наиболее подходящий результат
        let bestMatch = data.data[0];
        if (year) {
            const perfectMatch = data.data.find(item =>
                item.attributes.startDate && new Date(item.attributes.startDate).getFullYear() === year
            );
            if (perfectMatch) {
                bestMatch = perfectMatch;
            }
        }
        
        // imageType может быть 'posterImage' или 'coverImage'
        return bestMatch.attributes?.[imageType]?.original || null;

    } catch (error) {
        console.error(`Ошибка получения данных с Kitsu для "${title}":`, error);
        return null;
    }
}

/**
 * Получает URL баннера аниме из Kitsu API, сверяя год.
 * @param {object} animeObject - Объект аниме с Shikimori (включая name, russian, airedOn).
 * @returns {Promise<string|null>} - URL баннера или null.
 */
async function getKitsuBanner(animeObject) {
    return getKitsuData(animeObject, 'coverImage');
}

/**
 * Получает URL постера аниме из Kitsu API, сверяя год.
 * @param {object} animeObject - Объект аниме с Shikimori (включая name, russian, airedOn).
 * @returns {Promise<string|null>} - URL постера или null.
 */
async function getKitsuPoster(animeObject) {
    return getKitsuData(animeObject, 'posterImage');
}

/**
 * Получить список связанных тайтлов.
 * @param {string|number} animeId - Shikimori ID текущего тайтла.
 * @returns {Promise<any[]>}
 */
async function getRelatedAnime(animeId) {
    return fetchFromApi('get_related', { id: animeId });
}

/**
 * Получить список похожих тайтлов.
 * @param {string|number} animeId - Shikimori ID текущего тайтла.
 * @returns {Promise<any[]>}
 */
async function getSimilarAnime(animeId) {
    return fetchFromApi('get_similar', { id: animeId });
} 