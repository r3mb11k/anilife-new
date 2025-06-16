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

// --- Kitsu disabled: always return null
async function getKitsuBanner() {
    return null;
}

// --- Kitsu disabled: always return null
async function getKitsuPoster() {
    return null;
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