/**
 * AniLIFE | script.js
 * 
 * Этот файл отвечает за всю интерактивность главной страницы:
 * 1. Плавная прокрутка каруселей перетаскиванием (drag-to-scroll).
 * 2. Динамическая загрузка данных об аниме с нашего собственного бэкенда.
 * 3. Отображение скелетонов во время загрузки.
 * 4. Управление видимостью стрелок навигации и градиентов по краям.
 */

// --- 1. ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ СТРАНИЦЫ ---
document.addEventListener('DOMContentLoaded', () => {
    // Настраиваем все карусели на странице
    setupCarousels();
    // Загружаем контент для всех секций
    loadAllSections();
});


// --- 2. ЗАГРУЗКА ДАННЫХ ---

/**
 * Загружает и обрабатывает данные для конкретной секции аниме.
 * @param {string} sectionId - ID HTML-элемента секции (например, 'popular-anime').
 * @param {object} options - Параметры для API запроса.
 */
async function fetchAndProcessAnime(sectionId, options = {}) {
    const section = document.getElementById(sectionId);
    if (!section) {
        console.error(`Секция с ID "${sectionId}" не найдена.`);
        return;
    }
    const grid = section.querySelector('.anime-grid');
    // Извлекаем action и остальные параметры
    const { action = 'get_list', ...apiParams } = options;

    showSkeletons(grid, apiParams.limit || 20);

    try {
        // Запрашиваем данные у нашего нового бэкенда, передавая action и остальные параметры
        const animeList = await fetchFromApi(action, apiParams);

        if (!animeList || animeList.length === 0) {
            throw new Error('Ничего не найдено');
        }
        
        // Отображаем полученные данные
        await populateCarousel(animeList, grid);
        
        // HACK: Manually trigger a scroll event after a short delay
        // to ensure the drag-scroll utility updates the arrow/gradient visibility.
        setTimeout(() => grid.dispatchEvent(new Event('scroll')), 150);

    } catch (error) {
        console.error(`Ошибка загрузки секции ${sectionId}:`, error);
        displayErrorMessage(grid, error.message);
    } finally {
        hideSkeletons(grid);
    }
}

/**
 * Определяет название текущего сезона на русском для заголовка.
 * @returns {{season: string, year: number}}
 */
function getCurrentSeasonTitle() {
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // getMonth() is 0-indexed

    if (month >= 1 && month <= 3) return { season: 'Зима', year };
    if (month >= 4 && month <= 6) return { season: 'Весна', year };
    if (month >= 7 && month <= 9) return { season: 'Лето', year };
    return { season: 'Осень', year };
}

/**
 * Загружает все секции на главной странице.
 */
function loadAllSections() {
    // Загрузка сезонного аниме с динамическим заголовком
    const seasonalSection = document.getElementById('seasonal-anime');
    if (seasonalSection) {
        const titleElement = seasonalSection.querySelector('.section-title');
        const { season, year } = getCurrentSeasonTitle();
        if (titleElement) {
            titleElement.textContent = `${season} ${year}`;
        }
        // Используем новую action 'get_seasonal'
        fetchAndProcessAnime('seasonal-anime', { action: 'get_seasonal', limit: 20 });
    }

    // Загрузка популярных сериалов
    fetchAndProcessAnime('popular-anime', { action: 'get_list', order: 'ranked', limit: 20 });
    
    // Загрузка популярных фильмов
    fetchAndProcessAnime('popular-movies', { action: 'get_list', order: 'popularity', kind: 'movie', limit: 20 });

    // Загрузка анонсированных тайтлов (статус anons)
    fetchAndProcessAnime('upcoming-anime', { action: 'get_list', order: 'popularity', status: 'anons', limit: 20 });
}


// --- 3. ОТОБРАЖЕНИЕ ДАННЫХ ---

/**
 * Отображает карточки аниме в указанном контейнере.
 * @param {Array} animeList - Массив объектов с данными об аниме.
 * @param {HTMLElement} grid - Контейнер, в который нужно добавить карточки.
 */
async function populateCarousel(animeList, grid) {
    grid.innerHTML = ''; // Очищаем от скелетонов

    // Helper-функция для создания "slug" с транслитерацией
    const createSlug = (text) => {
        if (!text) return '';

        const translitMap = {
            'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh',
            'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
            'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts',
            'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
        };

        let slug = text.toLowerCase();
        let transliteratedSlug = '';
        for (let i = 0; i < slug.length; i++) {
            transliteratedSlug += translitMap[slug[i]] || slug[i];
        }
        
        return transliteratedSlug
            .replace(/[^a-z0-9\s-]/g, '') // убираем все, кроме латинских букв, цифр, пробелов и дефисов
            .trim()
            .replace(/\s+/g, '-') // заменяем пробелы на дефисы
            .replace(/-+/g, '-'); // убираем двойные дефисы
    };

    for (const anime of animeList) {
        if (anime.rating === 'rx') continue; // не показываем хентай
        const titleForSlug = anime.name || anime.russian || 'no-title';
        const displayTitle = anime.russian || anime.name || 'Без названия';
        const animeId = anime.id;
        if (!animeId) continue; // Пропускаем аниме без ID

        // --- Создание и вставка карточки с плейсхолдером ---
        const slug = createSlug(titleForSlug);
        const animeCard = document.createElement('a');
        animeCard.href = `/anime/${animeId}-${slug}`;
        animeCard.className = 'anime-card';
        animeCard.dataset.animeId = animeId;

        const isOngoing = anime.status === 'ongoing';
        let statusText = '';
        if (isOngoing) {
            statusText = 'Онгоинг';
        } else if (anime.status === 'released') {
            statusText = 'Вышло';
        } else if (anime.status === 'anons') {
            statusText = 'Анонс';
        }

        let infoHtml = '';
        if (anime.kind === 'movie') {
            const parts = [];
            if (statusText) {
                const statusClass = anime.status === 'anons' ? 'anons' : '';
                parts.push(`<span class="info-item ${statusClass}">${statusText}</span>`);
            }
            if (anime.airedOn?.year) {
                parts.push(`<span class="info-item">${anime.airedOn.year}</span>`);
            }
            infoHtml = parts.join('');
        } else {
            const episodesCount = isOngoing ? anime.episodesAired : anime.episodes;
            const episodesText = `${episodesCount || '?'} эп`;
            
            const parts = [];
            parts.push(`<span class="info-item">${episodesText}</span>`);

            if (statusText) {
                const statusClass = anime.status === 'anons' ? 'anons' : (isOngoing ? 'ongoing' : '');
                parts.push(`<span class="info-item ${statusClass}">${statusText}</span>`);
            }
            if (anime.airedOn?.year) {
                parts.push(`<span class="info-item">${anime.airedOn.year}</span>`);
            }
            
            infoHtml = parts.join('');
        }
        
        animeCard.innerHTML = `
            <div class="card-poster-wrapper">
                <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="${displayTitle}" class="card-poster" loading="lazy" onerror="this.onerror=null;this.src='https://shikimori.one/assets/globals/missing_original.jpg';">
                <div class="card-overlay">
                    <div class="card-info">
                        ${infoHtml}
                    </div>
                </div>
            </div>
            <div class="card-title">${displayTitle}</div>
        `;
        grid.appendChild(animeCard);
        
        // --- Асинхронно загружаем постер для этой карточки ---
        loadPosterForCard(animeCard, anime);
    }
}

/**
 * Асинхронно загружает постер для одной карточки аниме.
 * @param {HTMLElement} animeCard - Элемент карточки <a>.
 * @param {object} anime - Объект аниме.
 */
async function loadPosterForCard(animeCard, anime) {
    const shikimoriBaseUrl = 'https://shikimori.one';
    const fallbackPoster = `${shikimoriBaseUrl}/assets/globals/missing_original.jpg`;
    let shikimoriPosterUrl = fallbackPoster;
    if (anime.poster?.mainUrl) {
        shikimoriPosterUrl = anime.poster.mainUrl.startsWith('http') 
            ? anime.poster.mainUrl 
            : `${shikimoriBaseUrl}${anime.poster.mainUrl}`;
    }

    const imgElement = animeCard.querySelector('.card-poster');
    if (!imgElement) return;

    // Сначала пытаемся получить постер с Kitsu
    fetchKitsuPoster(anime)
        .then(url => {
            if (url) {
                imgElement.src = url; // Kitsu нашли -> ставим
            } else {
                imgElement.src = shikimoriPosterUrl; // fallback
            }
        })
        .catch(err => {
            console.warn('Kitsu poster fetch failed:', err);
            imgElement.src = shikimoriPosterUrl;
        });
}

/**
 * Показывает скелетоны (плейсхолдеры) в контейнере.
 * @param {HTMLElement} grid - Контейнер для скелетонов.
 * @param {number} count - Количество скелетонов для отображения.
 */
function showSkeletons(grid, count) {
    grid.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton-card';
        skeleton.innerHTML = `
            <div class="skeleton-poster"></div>
            <div class="skeleton-title"></div>
        `;
        grid.appendChild(skeleton);
    }
}

/**
 * Прячет скелетоны. Обычно вызывается после того, как реальные данные загружены.
 * @param {HTMLElement} grid - Контейнер, из которого нужно удалить скелетоны.
 */
function hideSkeletons(grid) {
    // Просто очищаем содержимое, так как processAnimeData заменит его
}

/**
 * Показывает сообщение об ошибке в контейнере.
 * @param {HTMLElement} grid - Контейнер для сообщения.
 * @param {string} message - Текст ошибки.
 */
function displayErrorMessage(grid, message) {
    grid.innerHTML = `<div class="error-message">${message}</div>`;
}


// --- 4. ЛОГИКА КАРУСЕЛИ (REFACTORED for drag-scroll.js) ---

/**
 * Настраивает все карусели на странице, используя enableDragScroll.
 */
function setupCarousels() {
    const carouselContainers = document.querySelectorAll('.carousel-container');
    
    carouselContainers.forEach((container, index) => {
        const carousel = container.querySelector('.anime-grid');
        
        // Assign unique IDs to arrows for precise selection
        const prevArrow = container.querySelector('.prev-arrow');
        const nextArrow = container.querySelector('.next-arrow');
        const prevId = `prev-arrow-${index}`;
        const nextId = `next-arrow-${index}`;
        if (prevArrow) prevArrow.id = prevId;
        if (nextArrow) nextArrow.id = nextId;

        if (carousel && typeof enableDragScroll === 'function') {
            enableDragScroll(carousel, {
                statefulContainer: container, // The main container now holds the state
                fadeClassPrefix: 'drag-has',
                prevEl: `#${prevId}`, // Pass selector string
                nextEl: `#${nextId}`  // Pass selector string
            });
        } else {
            console.error('Could not initialize carousel. Required elements or enableDragScroll function not found.', { container });
        }
    });
}

function createAnimeCard(anime) {
    const card = document.createElement('a');
    card.href = `anime.html?id=${anime.shikimori_id}`;
    card.className = 'anime-card';
    card.dataset.id = anime.shikimori_id;
    
    card.innerHTML = `
    <img src="${anime.poster_url || ''}" alt="${anime.name_russian}" class="card-poster">
    <div class="card-title">${anime.name_russian || 'Название...'}</div>
`;
    return card;
}

function displayAnimeList(animeData, gridId) {
    const animeGrid = document.getElementById(gridId);
    if (!animeGrid) {
        console.error(`Контейнер с ID "${gridId}" не найден.`);
        return;
    }

    animeGrid.innerHTML = ''; 

    if (!animeData || animeData.length === 0) {
        animeGrid.innerHTML = '<p class="error-message">Ничего не найдено.</p>';
        return;
    }

    animeData.forEach(anime => {
        const card = createAnimeCard(anime);
        animeGrid.appendChild(card);
    });

    // Больше не нужно ничего исправлять на клиенте
    // fixPostersFromKitsu(animeData, gridId);
}
