/**
 * AniLIFE | Anime Details Page Script
 * 
 * New version with GraphQL support, tab navigation, and asynchronous poster fallback for instant UI response.
 */

document.addEventListener('DOMContentLoaded', () => {
    if (typeof fetchFromApi === 'undefined') {
        console.error("Critical Error: js/api.js is not loaded!");
        showError("Page loading error. API is not available.");
        return;
    }

    const path = window.location.pathname; //  /anime/53447-tu-bian-yingxiong-x
    const idWithSlug = path.split('/').pop(); // "53447-tu-bian-yingxiong-x"

    if (!idWithSlug) {
        showError("Anime ID not found in URL path.");
        return;
    }

    // Извлекаем только числовой ID из начала строки
    const animeId = idWithSlug.match(/^\d+/)?.[0];

    if (!animeId) {
        showError("Invalid Anime ID format in URL.");
        return;
    }

    loadAnimeDetails(animeId);
});

// Глобальный флаг, чтобы предотвратить многократные вызовы
let isDetailsLoading = false;

/**
 * Loads and displays detailed information about the anime.
 * The text content is displayed immediately, while the poster is loaded asynchronously.
 * @param {string} animeId - The Shikimori ID of the anime.
 */
async function loadAnimeDetails(animeId) {
    if (isDetailsLoading) {
        console.warn('Anime details are already loading. Duplicate call prevented.');
        return;
    }
    isDetailsLoading = true;

    const preloader = document.getElementById('preloader');
    const content = document.getElementById('anime-content');

    preloader.style.display = 'flex';
    content.style.display = 'none';

    try {
        const anime = await fetchFromApi('get_details', { id: animeId });
        
        if (!anime) throw new Error("Could not find information for the specified ID.");
        
        // Заполняем страницу основными данными.
        populateDetailsAndLoadPoster(anime);

        // Загружаем связанные и похожие аниме (асинхронно, не блокируя UI).
        loadRelatedAnime(anime);
        loadSimilarAnime(anime);

    } catch (error) {
        console.error("Error loading anime details:", error);
        showError(error.message || "An error occurred while loading data.");
    } finally {
        preloader.style.display = 'none';
        content.style.display = 'block';
        // Сбрасываем флаг в случае ошибки, чтобы можно было попробовать еще раз (например, кнопкой)
        // isDetailsLoading = false; // Пока оставим true, чтобы избежать повторных вызовов при сбоях
    }
}

/**
 * Преобразует тип аниме в читаемый формат
 * @param {string} kind - Тип аниме из API
 * @returns {string} - Русское название типа
 */
function getAnimeTypeText(kind) {
    const typeMap = {
        tv: 'ТВ Сериал',
        movie: 'Фильм',
        ova: 'OVA',
        ona: 'ONA',
        special: 'Спешл',
        music: 'Музыкальное видео',
        tv_13: 'ТВ (13 эп.)',
        tv_24: 'ТВ (24 эп.)',
        tv_48: 'ТВ (48+ эп.)'
    };
    
    return typeMap[kind] || kind;
}

/**
 * Преобразует статус аниме в читаемый формат на русском
 * @param {string} status - Статус аниме из API
 * @returns {string} - Русское название статуса
 */
function getAnimeStatusText(status) {
    const statusMap = {
        anons: 'Анонс',
        ongoing: 'Онгоинг',
        released: 'Вышло',
        paused: 'Приостановлено',
        discontinued: 'Прекращено'
    };
    
    return statusMap[status] || status;
}

/**
 * Определяет сезон по месяцу
 * @param {number} month - Номер месяца (0-11)
 * @returns {string} - Название сезона
 */
function getSeason(month) {
    if (month >= 2 && month <= 4) return 'Весна';
    if (month >= 5 && month <= 7) return 'Лето';
    if (month >= 8 && month <= 10) return 'Осень';
    return 'Зима';
}

/**
 * Форматирует дату выхода аниме
 * @param {string} startDate - Дата начала показа
 * @param {string} endDate - Дата окончания показа
 * @param {string} status - Статус аниме
 * @returns {string} - Отформатированная строка даты
 */
function formatAiringDates(startDate, endDate, status) {
    // Месяцы на русском
    const months = [
        'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
        'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];
    
    // Форматирование одной даты
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        
        const date = new Date(dateStr);
        return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    };
    
    // Начальная дата
    const formattedStart = formatDate(startDate);
    
    if (!formattedStart) return 'Неизвестно';
    
    // Если аниме онгоинг, то показываем только дату начала
    if (status === 'ongoing') {
        return `с ${formattedStart}`;
    }
    
    // Если есть конечная дата, то показываем период
    if (endDate) {
        const formattedEnd = formatDate(endDate);
        return `с ${formattedStart} по ${formattedEnd}`;
    }
    
    // Иначе только начальная дата
    return `с ${formattedStart}`;
}

/**
 * Возвращает описание возрастного рейтинга
 * @param {string} rating - Код рейтинга
 * @returns {string} - Читаемое описание рейтинга
 */
function getAgeRatingText(rating) {
    // Преобразуем рейтинги в короткий формат, без описания
    const ratingMap = {
        g: 'G',
        pg: 'PG',
        pg_13: 'PG-13',
        r: 'R',
        r_plus: 'R+',
        rx: 'Rx'
    };
    
    return ratingMap[rating] || rating || 'Не указан';
}

// Глобальные переменные для хранения текущего состояния плеера
let currentPlayerState = {
    shikimoriId: null,
    translationId: null,
    episode: 1,
    linkBase: null,
};

let allTranslations = [];
let currentSortOrder = 'default';

let episodesSwiper = null; // Глобальная переменная для Swiper

/**
 * Populates the DOM with text data instantly and handles poster loading asynchronously.
 * @param {object} anime - The anime object from GraphQL.
 */
async function populateDetailsAndLoadPoster(anime) {
    console.log('Данные аниме:', anime); // Для отладки
    const playerWrapper = document.getElementById('anime-player');
    
    // --- 1. POPULATE TEXT CONTENT IMMEDIATELY ---
    document.title = `${anime.russian || anime.name} | AniLIFE`;
    
    // Название и заголовки
    document.getElementById('anime-title').textContent = anime.russian || anime.name;
    document.getElementById('anime-title-orig').textContent = anime.name || '';
    
    const descriptionContainer = document.getElementById('anime-description');
    let descriptionHTML = anime.descriptionHtml || '';
    // Проверяем, есть ли осмысленный текст внутри descriptionHtml
    const tmp = document.createElement('div');
    tmp.innerHTML = descriptionHTML;
    const plainText = tmp.textContent.trim();
    if (!plainText) {
        descriptionHTML = 'Описание пока отсутствует, но оно появится здесь, как только станет доступно.';
    }
    descriptionContainer.innerHTML = descriptionHTML;
    
    // Рейтинг
    const ratingElement = document.getElementById('shikimori-rating');
    if (ratingElement) {
        const ratingValue = ratingElement.querySelector('.rating-value');
        if (ratingValue && anime.score) {
            ratingValue.textContent = anime.score;
        } else if (ratingValue) {
            ratingValue.textContent = '?';
        }
    }
    
    // Информация о следующем эпизоде (для онгоингов)
    const nextEpisodeContainer = document.getElementById('next-episode-container');
    const nextEpisodeDetails = document.getElementById('next-episode-details');
    const mainContentGrid = document.querySelector('.anime-main-content');
    
    if (nextEpisodeContainer && nextEpisodeDetails && mainContentGrid) {
        // ОТЛАДКА - Вывод информации о следующем эпизоде
        console.log('Статус аниме:', anime.status);
        console.log('Информация о следующем эпизоде (nextEpisodeAt):', anime.nextEpisodeAt || 'отсутствует');
        
        // Проверяем есть ли в объекте anime данные о следующем эпизоде
        if (anime.status === 'ongoing') {
            // Проверяем, есть ли nextEpisodeAt (прямая дата из API Shikimori)
            if (anime.nextEpisodeAt) {
                const airDate = new Date(anime.nextEpisodeAt);
                const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
                const dayName = days[airDate.getDay()];
                
                const timeStr = airDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                const dateStr = airDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
                
                // Используем episodesAired + 1 как номер следующего эпизода
                const nextEpisodeNumber = (anime.episodesAired || 0) + 1;
                
                nextEpisodeDetails.innerHTML = `Эпизод ${nextEpisodeNumber} выходит ${dateStr} в ${timeStr} (${dayName})`;
                nextEpisodeContainer.style.display = 'block';
                mainContentGrid.classList.remove('nextep-is-hidden');
            } 
            // Проверяем, есть ли устаревший формат nextEpisodeInfo
            else if (anime.nextEpisodeInfo && anime.nextEpisodeInfo.airingAt && anime.nextEpisodeInfo.episodeNumber) {
                const { airingAt, episodeNumber } = anime.nextEpisodeInfo;
                const airDate = new Date(airingAt * 1000); // Преобразуем UNIX timestamp в JS Date
                const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
                const dayName = days[airDate.getDay()];
                
                const timeStr = airDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                const dateStr = airDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
                
                nextEpisodeDetails.innerHTML = `Эпизод ${episodeNumber} выходит ${dateStr} в ${timeStr} (${dayName})`;
                nextEpisodeContainer.style.display = 'block';
                mainContentGrid.classList.remove('nextep-is-hidden');
            } else {
                // Если нет данных о следующем эпизоде, но аниме онгоинг - показываем заглушку
                nextEpisodeDetails.innerHTML = 'Информация о следующем эпизоде появится позже';
                nextEpisodeContainer.style.display = 'block';
                mainContentGrid.classList.remove('nextep-is-hidden');
            }
        } else {
            nextEpisodeContainer.style.display = 'none';
            mainContentGrid.classList.add('nextep-is-hidden');
        }
    }
    
    // Информация об аниме
    // Сезон (Зима, Весна, Лето, Осень + Год)
    let seasonText = '?';
    if (anime.airedOn?.date) {
        const airedDate = new Date(anime.airedOn.date);
        const season = getSeason(airedDate.getMonth());
        const year = airedDate.getFullYear();
        seasonText = `${season} ${year}`;
    }
    document.getElementById('anime-year').textContent = seasonText;
    
    // Тип аниме
    document.getElementById('anime-type').textContent = getAnimeTypeText(anime.kind) || '?';
    
    // Эпизоды (проверка на наличие эпизодов)
    const episodesAired = anime.episodesAired || 0;
    const totalEpisodes = anime.episodes || '?';
    document.getElementById('anime-episodes').textContent = 
        anime.kind === 'movie' ? 'Фильм' : `${episodesAired} / ${totalEpisodes}`;
    
    // Статус на русском
    document.getElementById('anime-status').textContent = getAnimeStatusText(anime.status) || '?';
    
    // Студия
    document.getElementById('anime-studio').textContent = anime.studios?.length ? anime.studios[0].name : '?';
    
    // ОТЛАДКА - Вывод информации о возрастном рейтинге
    console.log('Возрастной рейтинг (из API):', anime.rating);
    console.log('Преобразованный рейтинг:', getAgeRatingText(anime.rating));
    
    // Возрастной рейтинг (исправлен)
    const ageRatingElement = document.getElementById('anime-age-rating');
    if (ageRatingElement) {
        // Проверяем наличие данных о рейтинге
        const ratingText = getAgeRatingText(anime.rating);
        ageRatingElement.textContent = ratingText;
        
        // Принудительно устанавливаем PG-13 если рейтинг не указан, для тестирования
        if (!anime.rating) {
            console.log('Рейтинг отсутствует, установлен тестовый PG-13');
            ageRatingElement.textContent = getAgeRatingText('pg_13');
        }
    }
    
    // Длительность с пробелом
    document.getElementById('anime-duration').textContent = anime.duration ? `${anime.duration} мин.` : '?';
    
    // Даты выпуска
    document.getElementById('anime-airing-dates').textContent = formatAiringDates(anime.airedOn?.date, anime.releasedOn?.date, anime.status);
    
    // Жанры
    const genresElement = document.getElementById('anime-genres');
    if (genresElement && anime.genres?.length > 0) {
        genresElement.textContent = anime.genres.map(g => g.russian).join(', ');
    } else if (genresElement) {
        genresElement.textContent = 'Жанры не указаны';
    }

    // --- Инициализация плеера и его элементов управления ---
    initializePlayer(anime);
    
    // --- 2. ЗАГРУЖАЕМ ПОСТЕР ПОСЛЕ ВСЕХ ТЕКСТОВЫХ ДАННЫХ ---
    loadPoster(anime);
    
    // --- 3. ЗАГРУЗКА СВЯЗАННЫХ И ПОХОЖИХ АНИМЕ ---
    const relatedGrid = document.getElementById('related-anime-list');
    if (relatedGrid) {
        relatedGrid.innerHTML = '<p class="placeholder-text">Функционал в разработке.</p>';
    }
    
    const similarGrid = document.getElementById('similar-anime-list');
    if (similarGrid) {
        similarGrid.innerHTML = '<p class="placeholder-text">Функционал в разработке.</p>';
    }

    // ------------- Скрыть плеер, если аниме ещё не вышло -------------
    if (anime.status === 'anons') {
        const playerSection = document.querySelector('.player-section');
        if (playerSection) {
            playerSection.style.display = 'none';
        }
    }

    // ------------- Баннер с безопасным fallback -------------
    const bannerElement = document.getElementById('anime-banner');
    if (bannerElement) {
        // прозрачная заглушка (избегаем «битых» иконок)
        bannerElement.src =
            'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

        // функция-цепочка, которая подставит первый доступный вариант
        const setBannerFallback = () => {
            const candidates = [];
            // Безопасно добавляем кандидатов
            if (anime.screenshots?.length > 0 && anime.screenshots[0].originalUrl)
                candidates.push(createFullUrl(anime.screenshots[0].originalUrl));
            if (anime.poster?.originalUrl)
                candidates.push(createFullUrl(anime.poster.originalUrl));
            
            // Если кандидатов нет, используем дефолтный
            const finalSrc = candidates.find(src => src) || 'https://shikimori.one/assets/globals/missing_original.jpg';
            
            if (bannerElement.src !== finalSrc) {
                bannerElement.src = finalSrc;
            }
        };

        // если любая ошибка загрузки изображения – пробуем следующий вариант
        bannerElement.addEventListener('error', setBannerFallback, { once: true });

        fetchKitsuBanner(anime)
            .then(url => {
                if (url) {
                    bannerElement.src = url;
                } else {
                    bannerFallback();
                }
            })
            .catch(err => {
                console.warn('Kitsu banner fetch failed:', err);
                bannerFallback();
            });
    }

    // Если плеера нет, показываем сообщение
    if (!anime.playerInfo?.defaultLink) {
        playerWrapper.innerHTML = `<div class="player-placeholder">Плеер не найден</div>`;
    } else {
        // Если это фильм, скрываем панель эпизодов и выходим
        if (anime.kind === 'movie') {
            const episodesContainer = document.querySelector('.episodes-container');
            if (episodesContainer) {
                episodesContainer.style.display = 'none';
            }
        } else {
            // Для сериалов отображаем эпизоды
            populateEpisodes(anime);
        }
    }
}

/**
 * Renders the translation lists based on the current sort order.
 * @param {string} sortOrder - The sorting criteria ('default', 'name_asc', 'name_desc').
 */
function renderTranslations(sortOrder) {
    currentSortOrder = sortOrder;

    const voiceoversList = document.getElementById('voiceovers-list');
    const subtitlesList = document.getElementById('subtitles-list');

    voiceoversList.innerHTML = '';
    subtitlesList.innerHTML = '';

    let voiceovers = allTranslations.filter(t => t.type === 'voice');
    let subtitles = allTranslations.filter(t => t.type === 'subtitles');
    
    let isFirstVoiceover = true;

    const createItem = (translation) => {
        const item = document.createElement('div');
        item.className = 'translation-item';
        item.textContent = translation.title;
        item.dataset.translationId = translation.id;
        item.dataset.translationLink = translation.link;
        
        if (isFirstVoiceover && translation.type === 'voice') {
            item.classList.add('active');
            currentPlayerState.translationId = translation.id;
            currentPlayerState.linkBase = translation.link;
            updatePlayerIframe();
            isFirstVoiceover = false;
        }

        item.addEventListener('click', () => {
            document.querySelectorAll('.translation-item').forEach(el => el.classList.remove('active'));
            item.classList.add('active');
            currentPlayerState.translationId = translation.id;
            currentPlayerState.linkBase = translation.link;
            updatePlayerIframe();
        });
        return item;
    };

    if (voiceovers.length > 0) {
        voiceovers.forEach(tr => voiceoversList.appendChild(createItem(tr)));
    } else {
        voiceoversList.innerHTML='<div class="translation-item-placeholder">Нет доступных озвучек.</div>';
    }

    if (subtitles.length > 0) {
        subtitles.forEach(tr => subtitlesList.appendChild(createItem(tr)));
    } else {
        subtitlesList.innerHTML='<div class="translation-item-placeholder">Нет доступных субтитров.</div>';
    }
    
    document.getElementById('voiceovers-count').textContent = voiceovers.length || '';
    document.getElementById('subtitles-count').textContent = subtitles.length || '';
}

/**
 * Инициализирует плеер и все его элементы управления.
 * @param {object} anime - The anime object from GraphQL.
 */
function initializePlayer(anime) {
    const playerArea = document.querySelector('.player-area');
    const iframeEl = document.querySelector('#anime-player iframe');

    // 1. Если с сервера пришла явная ошибка
    if (anime.playerInfoError) {
        console.warn('playerInfoError:', anime.playerInfoError);
    }

    // 2. Если у нас нет подробной информации о переводах — просто показать базовый плеер Kodik без UI
    if (!anime.playerInfo || !anime.playerInfo.translations) {
        if (iframeEl) {
            const fallbackUrl = `https://kodik.info/find-player?shikimoriID=${anime.id}`;
            iframeEl.src = fallbackUrl;
        }
        // Скрываем боковую панель и панель эпизодов, оставляем только плеер
        const sidebar = document.querySelector('.player-sidebar');
        const episodesContainer = document.querySelector('.episodes-container');
        if (sidebar) sidebar.style.display = 'none';
        if (episodesContainer) episodesContainer.style.display = 'none';
        // Убираем сообщение об ошибке, если было
        const errorMsg = playerArea.querySelector('.error-message-box');
        if (errorMsg) errorMsg.remove();
        return; // Дальнейшая инициализация не нужна
    }

    // 3. Полноценная инициализация с UI (как было)
    currentPlayerState.shikimoriId = anime.id;
    allTranslations = anime.playerInfo.translations;
    renderTranslations('default');
    populateEpisodes(anime);
    setupTranslationTabs();
    updatePlayerIframe();
}

/**
 * Заполняет список эпизодов.
 * @param {object} anime - The anime object from GraphQL.
 */
function populateEpisodes(anime) {
    const episodesPanel = document.getElementById('episodes-list');
    const episodesContainer = document.querySelector('.episodes-container');
    const episodesPanelWrapper = document.querySelector('.episodes-panel-wrapper');

    if (!episodesPanel || !episodesContainer || !episodesPanelWrapper) {
        console.error("Episode panel, container, or wrapper not found!");
        return;
    }

    episodesPanel.innerHTML = '';

    const totalEpisodes = anime.episodes || 1;

    for (let i = 1; i <= totalEpisodes; i++) {
        const button = document.createElement('button');
        button.className = 'episode-btn';
        button.textContent = `${i} эпизод`;
        button.dataset.episodeNumber = i;
        
        if (i === 1) {
            button.classList.add('active');
            currentPlayerState.episode = 1;
        }

        button.addEventListener('click', () => {
            document.querySelectorAll('.episode-btn').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            currentPlayerState.episode = i;
            updatePlayerIframe();
        });

        episodesPanel.appendChild(button);
    }

    if (window.enableDragScroll) {
        enableDragScroll(episodesPanel, {
            statefulContainer: episodesPanelWrapper,
            fadeClassPrefix: 'drag-has',
            prevEl: '.episodes-container .prev-arrow',
            nextEl: '.episodes-container .next-arrow'
        });
    } else {
        console.error('enableDragScroll function not found. Did you forget to include drag-scroll.js?');
    }

    // Настраиваем поиск по эпизодам (иконка + input)
    setupEpisodeSearch(totalEpisodes, episodesPanel);
}

/**
 * Настройка поиска эпизода по номеру. По клику по иконке раскрывается поле ввода.
 * По Enter (или вводу) происходит скролл к нужному эпизоду и его выделение.
 * @param {number} totalEpisodes
 * @param {HTMLElement} episodesPanel
 */
function setupEpisodeSearch(totalEpisodes, episodesPanel) {
    const wrapper = document.getElementById('episodes-search-wrapper');
    const input = document.getElementById('episode-search');
    const closeBtn = wrapper.querySelector('.close-search-btn');

    if (!wrapper || !input || !closeBtn) {
        console.error("Episode search components not found!");
        return;
    }

    const expand = () => {
        if (wrapper.classList.contains('expanded')) return;
        wrapper.classList.add('expanded');
        input.focus();
    };

    const collapse = () => {
        if (!wrapper.classList.contains('expanded')) return;
        wrapper.classList.remove('expanded');
        input.value = '';
        input.blur();
    };

    wrapper.addEventListener('click', () => {
        if (!wrapper.classList.contains('expanded')) {
            expand();
        }
    });

    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        collapse();
    });

    function handleSearch() {
        const num = parseInt(input.value, 10);
        if (isNaN(num) || num < 1 || num > totalEpisodes) {
            // Если ввод невалидный, ничего не делаем, не очищаем поле
            return;
        }
        const btn = episodesPanel.querySelector(`.episode-btn[data-episode-number="${num}"]`);
        if (btn) {
            btn.click();
            btn.scrollIntoView({ behavior: 'smooth', inline: 'center' });
        }
        // НЕ закрываем окно поиска после успешного Enter
    }

    let searchTimeout;
    input.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            handleSearch();
        }, 400); // Debounce search
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            collapse();
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            clearTimeout(searchTimeout); // Cancel any pending search
            handleSearch(); // Trigger search immediately
        }
    });
}

/**
 * Обновляет URL в iframe плеера на основе текущего состояния.
 */
function updatePlayerIframe() {
    const iframe = document.querySelector('#anime-player iframe');
    if (!iframe || !currentPlayerState.linkBase) return;

    let url = currentPlayerState.linkBase;
    const params = [];

    // Правильная комбинация для скрытия UI плеера Kodik
    params.push('hide_selectors=true');
    params.push('only_episode=true'); // Дополнительный параметр для чистоты
    
    if (currentPlayerState.episode) {
        params.push(`episode=${currentPlayerState.episode}`);
    }
    
    // Этот параметр убираем, так как он не работает
    // params.push('hide_share=true');

    url += (url.includes('?') ? '&' : '?') + params.join('&');
    iframe.src = url;
}

/**
 * Устанавливает обработчики для переключения табов Озвучка/Субтитры.
 */
function setupTranslationTabs() {
    const tabButtons = document.querySelectorAll('.translations-header .tab-btn');
    const tabLists = document.querySelectorAll('.translations-list');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Управление активным состоянием кнопок
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Показ/скрытие списков
            const targetListId = button.dataset.tab;
            tabLists.forEach(list => {
                if (list.id === targetListId) {
                    list.classList.add('active');
                } else {
                    list.classList.remove('active');
                }
            });
        });
    });
}

// Создаем полный URL для изображения
const createFullUrl = (path) => path ? (path.startsWith('http') ? path : `https://shikimori.one${path}`) : null;

/**
 * Асинхронно загружает постер для страницы деталей, выбирая лучший источник.
 * @param {object} anime - Объект аниме с данными.
 */
async function loadPoster(anime) {
    const posterElement = document.getElementById('anime-poster');
    const bannerElement = document.getElementById('anime-banner');
    if (!posterElement || !bannerElement) return;

    // --- POSTER --- (Kitsu → Shikимори → заглушка)
    const shikimoriPoster = createFullUrl(anime.poster?.originalUrl);
    fetchKitsuPoster(anime)
        .then(url => {
            if (url) {
                posterElement.src = url;
            } else {
                posterElement.src = shikimoriPoster || '/images/missing_poster.jpg';
            }
        })
        .catch(err => {
            console.warn('Kitsu poster failed:', err);
            posterElement.src = shikimoriPoster || '/images/missing_poster.jpg';
        });

    // --- BANNER ---
    const bannerFallback = () => {
        const candidates = [];
        if (anime.screenshots?.[0]?.originalUrl) candidates.push(createFullUrl(anime.screenshots[0].originalUrl));
        if (anime.poster?.originalUrl) candidates.push(createFullUrl(anime.poster.originalUrl));
        bannerElement.src = candidates.find(src => src) || 'https://shikimori.one/assets/globals/missing_original.jpg';
    };

    fetchKitsuBanner(anime)
        .then(url => {
            if (url) {
                bannerElement.src = url;
            } else {
                bannerFallback();
            }
        })
        .catch(err => {
            console.warn('Kitsu banner fetch failed:', err);
            bannerFallback();
        });

    // --- Player / Episodes block ---
    if (!anime.playerInfo?.defaultLink) {
        posterElement.innerHTML = `<div class="player-placeholder">Плеер не найден</div>`;
    } else {
        if (anime.kind === 'movie') {
            const episodesContainer = document.querySelector('.episodes-container');
            if (episodesContainer) {
                episodesContainer.style.display = 'none';
            }
        } else {
            populateEpisodes(anime);
        }
    }
}

// --- Helper: генерация «slug» на основе названия (упрощённая транслитерация) ---
function createSlug(text) {
    if (!text) return '';
    const translit = {
        'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'zh','з':'z','и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'kh','ц':'ts','ч':'ch','ш':'sh','щ':'shch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya'
    };
    return text.toLowerCase().split('').map(ch=>translit[ch]||ch).join('')
        .replace(/[^a-z0-9\s-]/g,'')
        .trim()
        .replace(/\s+/g,'-')
        .replace(/-+/g,'-');
}

/**
 * Создаёт элемент карточки аниме в стиле главных каруселей.
 * @param {object} animeData - Объект аниме из Shikimori REST.
 * @param {string} [relationLabel] - Дополнительная подпись (тип связи).
 * @returns {HTMLElement} - Готовый DOM-элемент.
 */
function createSmallAnimeCard(animeData, relationLabel = '') {
    const titleForSlug = animeData.name || animeData.russian || 'no-title';
    const displayTitle = animeData.russian || animeData.name || 'Без названия';
    const animeId = animeData.id;
    const slug = createSlug(titleForSlug);

    const isOngoing = animeData.status === 'ongoing';
    let statusText = '';
    if (isOngoing) {
        statusText = 'Онгоинг';
    } else if (animeData.status === 'released') {
        statusText = 'Вышло';
    } else if (animeData.status === 'anons') {
        statusText = 'Анонс';
    }

    // --- Info line similar to main cards ---
    let infoHtml = '';
    if (animeData.kind === 'movie') {
        const parts = [];
        if (statusText) {
            const statusClass = animeData.status === 'anons' ? 'anons' : '';
            parts.push(`<span class="info-item ${statusClass}">${statusText}</span>`);
        }
        if (animeData.aired_on && animeData.aired_on.length >= 4) {
            parts.push(`<span class="info-item">${animeData.aired_on.slice(0,4)}</span>`);
        }
        infoHtml = parts.join('');
    } else {
        const episodesCount = isOngoing ? animeData.episodes_aired : animeData.episodes;
        const episodesText = `${episodesCount || '?'} эп`;

        const parts = [];
        parts.push(`<span class="info-item">${episodesText}</span>`);

        if (statusText) {
            const statusClass = animeData.status === 'anons' ? 'anons' : (isOngoing ? 'ongoing' : '');
            parts.push(`<span class="info-item ${statusClass}">${statusText}</span>`);
        }
        if (animeData.aired_on && animeData.aired_on.length >= 4) {
            parts.push(`<span class="info-item">${animeData.aired_on.slice(0,4)}</span>`);
        }
        infoHtml = parts.join('');
    }
    
    // Убираем relationHtml, чтобы тип связи не отображался
    const relationHtml = '';

    const card = document.createElement('a');
    card.href = `/anime/${animeId}-${slug}`;
    card.className = 'anime-card';
    card.dataset.animeId = animeId;

    card.innerHTML = `
        <div class="card-poster-wrapper">
            <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="${displayTitle}" class="card-poster" loading="lazy" onerror="this.onerror=null;this.src='https://shikimori.one/assets/globals/missing_original.jpg';">
            <div class="card-overlay">
                <div class="card-info">${relationHtml}${infoHtml}</div>
            </div>
        </div>
        <div class="card-title">${displayTitle}</div>
    `;

    // --- Постер (Kitsu -> Shikimori -> заглушка)
    const shikimoriBase = 'https://shikimori.one';
    const fallbackPoster = `${shikimoriBase}/assets/globals/missing_original.jpg`;
    let shikimoriPoster = fallbackPoster;
    if (animeData.image?.original) {
        shikimoriPoster = `${shikimoriBase}${animeData.image.original}`;
    } else if (animeData.poster?.mainUrl) {
        shikimoriPoster = animeData.poster.mainUrl.startsWith('http') ? animeData.poster.mainUrl : `${shikimoriBase}${animeData.poster.mainUrl}`;
    }

    const imgEl = card.querySelector('.card-poster');
    fetchKitsuPoster(animeData)
        .then(url => {
            if (url) {
                imgEl.src = url;
            } else {
                imgEl.src = shikimoriPoster;
            }
        })
        .catch(() => { imgEl.src = shikimoriPoster; });

    return card;
}

async function loadRelatedAnime(anime) {
    const container = document.getElementById('related-anime-list');
    const sectionBlock = container?.closest('.related-anime');
    if (!container || !sectionBlock) return;

    container.innerHTML = '';
    const rawRelated = await (typeof getRelatedAnime === 'function' ? getRelatedAnime(anime.id) : fetchFromApi('get_related', { id: anime.id }));

    // Добавляем фильтр по типу контента
    const allowedKinds = new Set(['tv', 'movie', 'ova', 'ona']);
    const relatedData = (rawRelated || [])
        .filter(rel => rel.anime && allowedKinds.has(rel.anime.kind));

    if (relatedData.length === 0) {
        sectionBlock.style.display = 'none'; // Скрываем всю секцию, если ничего не найдено
        return;
    }
    
    container.classList.add('anime-grid');

    relatedData.forEach(rel => {
        const card = createSmallAnimeCard(rel.anime, rel.relation_russian);
        container.appendChild(card);
    });

    if (typeof enableDragScroll === 'function') {
        initSectionCarousel(sectionBlock.querySelector('.carousel-container'));
    }
}

async function loadSimilarAnime(anime) {
    const container = document.getElementById('similar-anime-list');
    const sectionBlock = container?.closest('.similar-anime');
    if (!container || !sectionBlock) return;

    container.innerHTML = '';
    const rawSimilar = await (typeof getSimilarAnime === 'function' ? getSimilarAnime(anime.id) : fetchFromApi('get_similar', { id: anime.id }));

    const allowedKinds = new Set(['tv', 'movie', 'ova', 'ona', 'special', 'tv_special']);
    const similarData = (rawSimilar || []).filter(sim => allowedKinds.has(sim.kind));

    if (similarData.length === 0) {
        sectionBlock.style.display = 'none';
        return;
    }

    container.classList.add('anime-grid');

    similarData.forEach(sim => {
        const card = createSmallAnimeCard(sim);
        container.appendChild(card);
    });

    if (typeof enableDragScroll === 'function') {
        initSectionCarousel(sectionBlock.querySelector('.carousel-container'));
    }
}

// Инициализация drag-scroll и стрелок для одной секции
function initSectionCarousel(container) {
    if (!container) return;
    const grid = container.querySelector('.anime-grid');
    if (!grid) return;
    const prevArrow = container.querySelector('.prev-arrow');
    const nextArrow = container.querySelector('.next-arrow');
    // генерируем уникальные id, чтобы не конфликтовало с другими каруселями
    const uniq = Math.random().toString(36).slice(2);
    if (prevArrow) prevArrow.id = `rel-prev-${uniq}`;
    if (nextArrow) nextArrow.id = `rel-next-${uniq}`;

    enableDragScroll(grid, {
        statefulContainer: container,
        fadeClassPrefix: 'drag-has',
        prevEl: prevArrow ? `#${prevArrow.id}` : null,
        nextEl: nextArrow ? `#${nextArrow.id}` : null
    });
}

function showError(message) {
    document.getElementById('preloader').style.display = 'none';
    const content = document.getElementById('anime-content');
        content.style.display = 'block';
    content.innerHTML = `
        <div class="error-container">
            <h1>Произошла ошибка</h1>
            <p>${message}</p>
            <a href="/" class="button">Вернуться на главную</a>
        </div>
    `;
}

function syncSidebarHeight() {
  const playerWrapper = document.querySelector('.player-wrapper');
  const sidebar = document.querySelector('.player-sidebar');
  if (playerWrapper && sidebar) {
    sidebar.style.height = playerWrapper.offsetHeight + 'px';
  }
}

window.addEventListener('resize', syncSidebarHeight);

// Вызов после инициализации плеера
initializePlayer = (function(original){
  return function(...args){
    const res = original.apply(this,args);
    setTimeout(syncSidebarHeight,0);
    return res;
  }
})(initializePlayer); 