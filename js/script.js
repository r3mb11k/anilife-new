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

// Флаг, чтобы гарантировать однократную загрузку жанров
let genresLoaded = false;

/**
 * Загружает все секции на главной странице одним запросом.
 */
async function loadAllSections() {
    // Показываем скелетоны во всех секциях
    showSkeletons(document.querySelector('#seasonal-anime .anime-grid'), 20);
    showSkeletons(document.querySelector('#popular-anime .anime-grid'), 20);
    showSkeletons(document.querySelector('#popular-movies .anime-grid'), 20);
    showSkeletons(document.querySelector('#upcoming-anime .anime-grid'), 20);
    showSkeletons(document.querySelector('#genres-section .genre-grid'), 20);

    try {
        // Запрашиваем все данные одним махом
        const data = await fetchFromApi('get_main_page_data');

        // Динамически обновляем заголовок сезонного аниме
        const seasonalSection = document.getElementById('seasonal-anime');
        if (seasonalSection) {
            const titleElement = seasonalSection.querySelector('.section-title');
            const { season, year } = getCurrentSeasonTitle();
            if (titleElement) {
                titleElement.textContent = `${season} ${year}`;
            }
        }
        
        // Распределяем данные по секциям
        await populateCarousel(data.seasonal, document.querySelector('#seasonal-anime .anime-grid'));
        await populateCarousel(data.top, document.querySelector('#popular-anime .anime-grid'));
        await populateCarousel(data.movies, document.querySelector('#popular-movies .anime-grid'));
        await populateCarousel(data.anons, document.querySelector('#upcoming-anime .anime-grid'));
        
        // Отдельно обрабатываем жанры
        loadGenresSection(data.genres);

    } catch (error) {
        console.error('Ошибка загрузки данных для главной страницы:', error);
        // Можно показать ошибки во всех секциях
        displayErrorMessage(document.querySelector('#seasonal-anime .anime-grid'), 'Не удалось загрузить');
        displayErrorMessage(document.querySelector('#popular-anime .anime-grid'), 'Не удалось загрузить');
        displayErrorMessage(document.querySelector('#popular-movies .anime-grid'), 'Не удалось загрузить');
        displayErrorMessage(document.querySelector('#upcoming-anime .anime-grid'), 'Не удалось загрузить');
        displayErrorMessage(document.querySelector('#genres-section .genre-grid'), 'Не удалось загрузить');
    }
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

    // Загружаем постер только с Shikimori (fallback ниже)
    imgElement.src = shikimoriPosterUrl;
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
        const carousel = container.querySelector('.anime-grid') || container.querySelector('.genre-grid');
        
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

/** Загружает список жанров и рендерит их на главной. */
async function loadGenresSection(genres) {
    if (genresLoaded) {
      console.warn('Attempted to load genres multiple times. Aborting.');
      return;
    }
    const section = document.getElementById('genres-section');
    if (!section) return;
    const grid = section.querySelector('.genre-grid');
    if (!grid) return;

    // Do not proceed if there are no genres. This helps prevent accidental re-runs.
    if (!genres || genres.length === 0) {
        console.warn('loadGenresSection was called without genres or with an empty array.');
        return;
    }

    try {
        // FIX: The fallback fetch is removed. Data should only come from loadAllSections.
        // if (!genres) {
        //     genres = await fetchFromApi('get_genres');
        // }

        if (!Array.isArray(genres)) return;

        // Убираем непопулярные/второстепенные жанры
        const excludedNames = new Set([
            'Додзинси',
            'Shounen Ai', 'Shoujo Ai', 'Shounen-ai', 'Shoujo-ai',
            'Сёнен-ай', 'Сёдзё-ай',
            // --- additional exclusions requested ---
            'Детское', 'Kids',
            'Машины', 'Cars',
            'Полиция', 'Police',
            'Работа', 'Work',
            'Самураи', 'Samurai',
            'Сёдзе', 'Сёдзё', 'Shoujo',
            'Смена пола', 'Gender Bender',
            'Эротика', 'Erotica',
            'Триллер', 'Thriller'
        ].map(s => s.toLowerCase()));
        genres = genres.filter(g => {
            const nameRu = (g.russian || '').toLowerCase();
            const nameEn = (g.name || '').toLowerCase();
            return !excludedNames.has(nameRu) && !excludedNames.has(nameEn);
        });

        // FIX: Принудительно удаляем дубликаты по ИМЕНИ, выбирая жанр с наименьшим ID
        const byName = new Map();
        genres.forEach(g => {
            const nameKey = (g.russian || g.name || '').trim().toLowerCase();
            if (!nameKey) return;
            if (!byName.has(nameKey) || g.id < byName.get(nameKey).id) {
                byName.set(nameKey, g);
            }
        });
        const uniqueGenres = Array.from(byName.values());

        // Сортировка по алфавиту
        const sorted = uniqueGenres.sort((a, b) => {
            const aName = (a.russian || a.name || '').toLowerCase();
            const bName = (b.russian || b.name || '').toLowerCase();
            return aName.localeCompare(bName, 'ru');
        });
        
        const getGenreImageUrl = (genre) => {
            // FIX: Use the russian name, replace spaces with hyphens for the filename, and use .png extension
            const slug = (genre.russian || genre.name || 'unknown')
                .toLowerCase()
                .replace(/\s+/g, '-');
            const path = `/images/genres/${slug}.webp`;
            return encodeURI(path);
        };

        grid.innerHTML = ''; // Очищаем перед добавлением
        sorted.forEach(g => {
            const title = g.russian || g.name;
            const imgUrl = getGenreImageUrl(g);
            const card = document.createElement('a');
            card.href = `/catalog.html?genre=${g.id}`;
            // Используем те же классы, что и у аниме, для наследования логики и стилей
            card.className = 'anime-card genre-card';
            // Генерируем ту же структуру, что и у аниме-карточки
            card.innerHTML = `
                <div class="card-poster-wrapper">
                    <img src="${imgUrl}" alt="${title}" class="card-poster" draggable="false" loading="lazy" onerror="this.onerror=null;this.src='https://shikimori.one/assets/globals/missing_original.jpg';">
                </div>
                <div class="card-title">${title}</div>`;
            grid.appendChild(card);
        });

        genresLoaded = true; // Устанавливаем флаг после успешной загрузки

        // Re-initialise drag scroll for the newly added carousel
        if (typeof setupCarousels === 'function') {
            // Запускаем настройку каруселей ПОСЛЕ того, как все данные загружены и вставлены
            setTimeout(() => {
                setupCarousels();
                grid.dispatchEvent(new Event('scroll'));
            }, 100);
        }
    } catch (err) {
        console.error('Failed to load genres for main page', err);
        displayErrorMessage(grid, 'Не удалось загрузить жанры');
    }
}
