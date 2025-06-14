const kindMap = {
    tv: 'TV сериал',
    movie: 'Фильм',
    ona: 'ONA',
    ova: 'OVA',
    special: 'Спешл',
    tv_special: 'Спешл'
};

const statusMap = {
    ongoing: 'Онгоинг',
    released: 'Вышедшее',
    anons: 'Анонсированое'
};

const orderMap = { 
    popularity: 'Популярное',
    ranked: 'По рейтингу',
    aired_on: 'По дате выхода'
};

const seasonMap = {
    summer_2025: 'Лето 2025',
    spring_2025: 'Весна 2025',
    winter_2025: 'Зима 2025',
    fall_2024: 'Осень 2024',
    '2025': '2025 год',
    '2024': '2024 год',
    '2022_2023': '2022-2023',
    '2017_2021': '2017-2021',
    '2010_2016': '2010-2016',
    '2000_2010': '2000-2010',
    '199x': '1990-е годы',
    '198x': '1980-е годы',
    older: 'Более старые'
};

const genreMap = {
    '5-Avant-Garde': 'Авангард',
    '543-Gourmet': 'Гурман',
    '8-Drama': 'Драма',
    '4-Comedy': 'Комедия',
    '36-Slice-of-Life': 'Повседневность',
    '2-Adventure': 'Приключения',
    '22-Romance': 'Романтика',
    '37-Supernatural': 'Сверхъестественное',
    '30-Sports': 'Спорт',
    '7-Mystery': 'Тайна',
    '117-Suspense': 'Триллер',
    '14-Horror': 'Ужасы',
    '24-Sci-Fi': 'Фантастика',
    '10-Fantasy': 'Фэнтези',
    '1-Action': 'Экшен',
    '9-Ecchi': 'Этти',
    '27-Shounen':'Сёнен',
    '25-Shoujo':'Сёдзё',
    '42-Seinen':'Сэйнэн',
    '43-Josei':'Дзёсей'
};

const themeMap = {
    '197-Urban-Fantasy': 'Городское фэнтези',
    '198-Villainess': 'Злодейка',
    '119-CGDCT': 'CGDCT',
    '143-Anthropomorphic': 'Антропоморфизм',
    '17-Martial-Arts': 'Боевые искусства',
    '32-Vampire': 'Вампиры',
    '104-Adult-Cast': 'Взрослые персонажи',
    '103-Video-Game': 'Видеоигры',
    '38-Military': 'Военное',
    '141-Survival': 'Выживание',
    '35-Harem': 'Гарем',
    '3-Racing': 'Гонки',
    '112-Gag-Humor': 'Гэг-юмор',
    '39-Detective': 'Детектив',
    '105-Gore': 'Жестокость',
    '134-Childcare': 'Забота о детях',
    '146-High-Stakes-Game': 'Игра с высокими ставками',
    '145-Idols-(Female)': 'Идолы (Жен.)',
    '150-Idols-(Male)': 'Идолы (Муж.)',
    '108-Visual-Arts': 'Изобразительное искусство',
    '142-Performing-Arts': 'Исполнительское искусство',
    '13-Historical': 'Исторический',
    '130-Isekai': 'Исэкай',
    '140-Iyashikei': 'Иясикэй',
    '102-Team-Sports': 'Командный спорт',
    '29-Space': 'Космос',
    '144-Crossdressing': 'Кроссдрессинг',
    '137-Otaku-Culture': 'Культура отаку',
    '107-Love-Polygon': 'Любовный многоугольник',
    '135-Magical-Sex-Shift': 'Магическая смена пола',
    '124-Mahou-Shoujo': 'Махо-сёдзё',
    '147-Medical': 'Медицина',
    '18-Mecha': 'Меха',
    '6-Mythology': 'Мифология',
    '19-Music': 'Музыка',
    '149-Educational': 'Образовательное',
    '138-Organized-Crime': 'Организованная преступность',
    '20-Parody': 'Пародия',
    '148-Pets': 'Питомцы',
    '40-Psychological': 'Психологическое',
    '111-Time-Travel': 'Путешествие во времени',
    '139-Workplace': 'Работа',
    '125-Reverse-Harem': 'Реверс-гарем',
    '106-Reincarnation': 'Реинкарнация',
    '151-Love-Status-Quo': 'Романтический подтекст',
    '21-Samurai': 'Самураи',
    '118-Combat-Sports': 'Спортивные единоборства',
    '11-Strategy-Game': 'Стратегические игры',
    '31-Super-Power': 'Супер сила',
    '114-Award-Winning': 'Удостоено наград',
    '131-Delinquents': 'Хулиганы',
    '23-School': 'Школа',
    '136-Showbiz': 'Шоу-бизнес'
};

// Добавляем кэш для изображений
const imageCache = new Map();

// Функция для пакетной загрузки изображений с Anilist
async function batchLoadKitsuImages(animeList) {
    const missingImages = animeList.filter(anime => anime.image.original.includes("missing_original"));
    const promises = [];

    const query = `query ($search: String) { Media(search: $search, type: ANIME) { coverImage { medium } } }`;

    for (let i = 0; i < missingImages.length; i += 20) {
        const batch = missingImages.slice(i, i + 20);
        const batchPromises = batch.map(async (anime) => {
            if (imageCache.has(anime.name)) {
                return { name: anime.name, imageUrl: imageCache.get(anime.name) };
            }

            try {
                const response = await fetch('https://graphql.anilist.co', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ query, variables: { search: anime.name } })
                });
                const json = await response.json();
                const imageUrl = json.data?.Media?.coverImage?.medium || null;
                if (imageUrl) {
                    imageCache.set(anime.name, imageUrl);
                }
                return { name: anime.name, imageUrl };
            } catch (error) {
                console.error(`Error loading image for ${anime.name}:`, error);
                return { name: anime.name, imageUrl: null };
            }
        });
        promises.push(...batchPromises);
    }

    const results = await Promise.all(promises);
    return Object.fromEntries(results.map(r => [r.name, r.imageUrl]));
}

document.addEventListener('DOMContentLoaded', function() {
    initAnime(); 
    setupEventListeners();
    setActiveOnLoad();
    initFilters();
    initFilterToggle();
    initCustomSelects();
});

function initFilters() {
    const params = new URLSearchParams(window.location.search);
    
    if (params.get('kind')) {
        document.getElementById('kind-filter').value = params.get('kind');
    }
    if (params.get('status')) {
        document.getElementById('status-filter').value = params.get('status');
    }
    if (params.get('season')) {
        document.getElementById('season-filter').value = params.get('season');
    }
    if (params.get('score')) {
        document.getElementById('score-filter').value = params.get('score');
    }
    if (params.get('order')) {
        document.getElementById('order-filter').value = params.get('order');
    }
    
    // Получаем все параметры genre
    const genres = params.getAll('genre');
    if (genres.length > 0) {
        // Проверяем каждый параметр genre
        genres.forEach(genre => {
            const genreCheckbox = document.querySelector(`input[name="genre"][value="${genre}"]`);
            const themeCheckbox = document.querySelector(`input[name="theme"][value="${genre}"]`);
            
            if (genreCheckbox) {
                genreCheckbox.checked = true;
            }
            if (themeCheckbox) {
                themeCheckbox.checked = true;
            }
        });
        
        // Обновляем текст в заголовках селектов
        const genreSelect = document.querySelector('.custom-select:has(input[name="genre"])');
        const themeSelect = document.querySelector('.custom-select:has(input[name="theme"])');
        if (genreSelect) updateHeaderText(genreSelect);
        if (themeSelect) updateHeaderText(themeSelect);
    }

    document.getElementById('apply-filters').addEventListener('click', applyFilters);
    document.getElementById('reset-filters').addEventListener('click', resetFilters);
}

function resetFilters() {
    document.getElementById('kind-filter').value = '';
    document.getElementById('status-filter').value = '';
    document.getElementById('season-filter').value = '';
    document.getElementById('score-filter').value = '';
    document.getElementById('order-filter').value = 'popularity';
    
    // Сбрасываем все чекбоксы
    document.querySelectorAll('input[name="genre"]').forEach(checkbox => checkbox.checked = false);
    document.querySelectorAll('input[name="theme"]').forEach(checkbox => checkbox.checked = false);
    
    // Обновляем текст в заголовках селектов
    const genreSelect = document.querySelector('.custom-select:has(input[name="genre"])');
    const themeSelect = document.querySelector('.custom-select:has(input[name="theme"])');
    if (genreSelect) updateHeaderText(genreSelect);
    if (themeSelect) updateHeaderText(themeSelect);

    applyFilters();
}

function applyFilters() {
    const kind = document.getElementById('kind-filter').value;
    const status = document.getElementById('status-filter').value;
    const season = document.getElementById('season-filter').value;
    const score = document.getElementById('score-filter').value;
    const order = document.getElementById('order-filter').value;
    
    // Получаем выбранные жанры и темы
    const selectedGenres = Array.from(document.querySelectorAll('input[name="genre"]:checked')).map(cb => cb.value);
    const selectedThemes = Array.from(document.querySelectorAll('input[name="theme"]:checked')).map(cb => cb.value);

    const params = new URLSearchParams();
    
    if (kind) params.append('kind', kind);
    if (status) params.append('status', status);
    if (season) params.append('season', season);
    if (score) params.append('score', score);
    if (order) params.append('order', order);
    
    // Добавляем выбранные жанры и темы
    selectedGenres.forEach(genre => params.append('genre', genre));
    selectedThemes.forEach(theme => params.append('genre', theme));

    // Закрываем фильтры перед обновлением страницы
    const filtersContainer = document.querySelector('.filters-container');
    const toggleBtn = document.querySelector('.toggle-filters-btn');
    filtersContainer.classList.add('hidden');
    toggleBtn.classList.remove('active');

    window.location.search = params.toString();
}

function calculateOptimalCount() {
    const screenWidth = window.innerWidth;
    const baseWidth = 1920;
    const baseCount = 90;
    
    let optimalCount = Math.floor((screenWidth / baseWidth) * baseCount);
    optimalCount = Math.max(3, Math.min(150, optimalCount));
    
    return optimalCount;
}

function setActiveOnLoad() {
    const params = new URLSearchParams(window.location.search);
    const navLinks = document.querySelectorAll('.main-nav a');
    
    navLinks.forEach(link => {
        const linkParams = new URLSearchParams(link.search);
        if (linkParams.get('order') === params.get('order') && 
            linkParams.get('status') === params.get('status')) {
            link.classList.add('active');
        } else {
            // link.classList.remove('active');
        }
    });
}

let currentPage = 1;
let isLoading = false;

async function initAnime() {
    const animeContainer = document.getElementById('anime-card');
    const sectionHeader = document.getElementById('section-header');
    let displayed = 0;
    const maxDisplay = calculateOptimalCount();

    const params = new URLSearchParams(window.location.search);
    const headerText = [];

    headerText.push(orderMap[params.get('order')] || 'Популярное');
    headerText.push('аниме');

    if (sectionHeader) {
        sectionHeader.innerHTML = `<h2>${headerText.join(' ')}</h2>`;
    }

    await loadMoreAnime();
}

async function loadMoreAnime() {
    if (isLoading) return;
    isLoading = true;

    const animeContainer = document.getElementById('anime-card');
    const maxDisplay = calculateOptimalCount();
    const params = new URLSearchParams(window.location.search);

    try {
        // Создаем новый URLSearchParams для API запроса
        const apiParams = new URLSearchParams();
        
        // Добавляем базовые параметры
        apiParams.append('limit', '50');
        apiParams.append('page', currentPage.toString());
        apiParams.append('rating', 'g,pg,pg_13,r,r_plus');
        
        // Копируем параметры из URL страницы
        for (const [key, value] of params.entries()) {
            if (key !== 'genre') { // Пропускаем genre, обработаем отдельно
                apiParams.append(key, value);
            }
        }
        
        // Обрабатываем жанры и темы
        const genres = params.getAll('genre');
        if (genres.length > 0) {
            apiParams.append('genre', genres.join(','));
        }

        if (params.get('score')) {
            apiParams.append('score', params.get('score'));
        }

        const apiUrl = `https://shikimori.one/api/animes?${apiParams.toString()}&censored=true`;
        console.log('Загрузка аниме с URL:', apiUrl);
        
        const response = await fetch(apiUrl);
        const animeList = await response.json();
        console.log('Получено аниме:', animeList.length);

        // Если список пустой, удаляем кнопку "Загрузить ещё" и выходим
        if (!animeList || animeList.length === 0) {
            console.log('Список аниме пуст');
            const existingLoadMore = document.querySelector('.load-more-container');
            if (existingLoadMore) {
                existingLoadMore.remove();
            }
            isLoading = false;
            return;
        }

        // Загружаем все недостающие изображения пакетно
        const kitsuImages = await batchLoadKitsuImages(animeList);

        let displayed = 0;

        // Удаляем существующую кнопку "Загрузить ещё", если она есть
        const existingLoadMore = document.querySelector('.load-more-container');
        if (existingLoadMore) {
            existingLoadMore.remove();
        }

        // Предварительная загрузка изображений
        const preloadImages = animeList.slice(0, maxDisplay).map(anime => {
            const imageUrl = anime.image.original.includes("missing_original") 
                ? kitsuImages[anime.name] 
                : `https://shikimori.one${anime.image.original}`;
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => resolve();
                img.onerror = () => resolve();
                img.src = imageUrl;
            });
        });

        // Ждем загрузки первой партии изображений
        await Promise.all(preloadImages);

        for (const anime of animeList) {
            let imageUrl = anime.image.original.includes("missing_original")
                ? kitsuImages[anime.name]
                : `https://shikimori.one${anime.image.original}`;

            if (!imageUrl) {
                imageUrl = '/images/no-image.jpg';
            }
            
            const animeData = {
                title: anime.russian || anime.name,
                image: imageUrl,
                rating: anime.score,
                episode: anime.episodes,
                episodes_aired: anime.episodes_aired ?? anime.episodes,
                type: kindMap[anime.kind] || anime.kind,
                isNew: anime.aired_on && new Date(anime.aired_on) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                id: anime.id,
                status: anime.status
            };
            
            animeContainer.appendChild(createAnimeCard(animeData));
            displayed++;

            if (displayed >= maxDisplay) break;
        }

        console.log('Отображено аниме:', displayed);
        console.log('Всего аниме в списке:', animeList.length);

        // Добавляем кнопку "Загрузить ещё" если есть ещё аниме для загрузки
        if (animeList.length >= 50) { // Если получили максимальное количество результатов, значит есть ещё
            const loadMoreContainer = document.createElement('div');
            loadMoreContainer.className = 'load-more-container';
            
            const loadMoreBtn = document.createElement('button');
            loadMoreBtn.className = 'load-more-btn';
            loadMoreBtn.textContent = 'Загрузить ещё';
            loadMoreBtn.addEventListener('click', () => {
                currentPage++;
                loadMoreAnime();
            });
            
            loadMoreContainer.appendChild(loadMoreBtn);
            animeContainer.parentElement.appendChild(loadMoreContainer);
            console.log('Добавлена кнопка "Загрузить ещё"');
        } else {
            console.log('Нет дополнительных аниме для загрузки');
        }

    } catch (error) {
        console.error('Ошибка при загрузке аниме:', error);
    } finally {
        isLoading = false;
    }
}

function setupEventListeners() {

    const searchInput = document.querySelector('.search-container input');
    const searchButton = document.querySelector('.search-container button');

    searchButton.addEventListener('click', () => {
        performSearch(searchInput.value);
    });

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            performSearch(searchInput.value);
        }
    });
}

function createAnimeCard(anime) {
    const card = document.createElement('div');
    card.className = 'anime-card';

    card.innerHTML = `
        <div class="anime-card-image">
            <img src="${anime.image}" alt="${anime.title}">
            <div class="anime-card-overlay">
                <div class="play-button">
                    <i class="fas fa-play"></i>
                </div>
            </div>
            <div class="anime-card-rating">
                <i class="fas fa-star"></i> ${anime.rating}
            </div>
            ${anime.isNew ? '<div class="anime-card-type">NEW</div>' : ''}
        </div>
        <div class="anime-card-info">
            <h3 class="anime-card-title">${anime.title}</h3>
            <div class="anime-card-meta">
                <span>EP ${anime.status === "released" ? anime.episode : `${anime.episodes_aired}/${anime.episode}`}</span>
                <span>${anime.type}</span>
            </div>
        </div>
    `;

    card.addEventListener('click', async () => {
        console.log(`Clicked on ${anime.title}`);
        await getAnime(anime.id)
    });

    return card;
}

async function getAnime(anime_id) {
    const resp = await fetch(`https://shikimori.one/api/animes/${anime_id}`);
    const fanime = await resp.json();
    if (!fanime) return;
    console.log(fanime);

    const folder = fanime.id;

    await fetch('https://aniscope.ru/create-anime', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ anime: fanime, folder })
    });

    window.location.href = `/animes/anime/${folder}/index.html`;
}
function sanitizeFileName(name) {
    return name.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, '-').toLowerCase();
}
async function performSearch(query) {
    if (!query.trim()) return;

    try {
        const navLinks = document.querySelectorAll('.main-nav a');
        navLinks.forEach(link => link.classList.remove('active'));

        const response = await fetch(`https://shikimori.one/api/animes?search=${encodeURIComponent(query)}&limit=20&order=popularity&rating=g%2Cpg%2Cpg_13%2Cr%2Cr_plus&censored=true`);
        const results = await response.json();

        // Загружаем все недостающие изображения пакетно
        const kitsuImages = await batchLoadKitsuImages(results);

        const mainContainer = document.querySelector('main');
        mainContainer.innerHTML = '';

        const container = document.createElement('selection');
        container.className = 'anime-grid';
        mainContainer.appendChild(container);

        // Предварительная загрузка изображений
        const preloadImages = results.map(anime => {
            const imageUrl = anime.image.original.includes("missing_original")
                ? kitsuImages[anime.name]
                : `https://shikimori.one${anime.image.original}`;
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => resolve();
                img.src = imageUrl;
            });
        });

        // Ждем загрузки изображений
        await Promise.all(preloadImages);

        for (const anime of results) {
            let imageUrl = anime.image.original.includes("missing_original")
                ? kitsuImages[anime.name]
                : `https://shikimori.one${anime.image.original}`;

            if (!imageUrl) {
                imageUrl = 'path/to/placeholder-image.jpg'; // Добавьте путь к плейсхолдеру
            }

            const card = createAnimeCard({
                id: anime.id,
                title: anime.russian || anime.name,
                image: imageUrl,
                rating: anime.score,
                episodes_aired: anime.episodes_aired ?? anime.episodes,
                episode: anime.episodes,
                type: kindMap[anime.kind] || anime.kind,
                isNew: new Date(anime.aired_on) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                status: anime.status
            });
            container.appendChild(card);
        }

        if (results.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <h3>Ничего не найдено по запросу "${query}"</h3>
                </div>
            `;
        }

    } catch (error) {
        console.error('Ошибка при поиске:', error);
        alert('Произошла ошибка при поиске. Пожалуйста, попробуйте позже.');
    }
}

function handleUserAuth() {
    const signInBtn = document.querySelector('.sign-in-btn');

    signInBtn.addEventListener('click', () => {
        console.log('Sign in button clicked');
        alert('Sign in functionality would be implemented here');
    });
}
window.addEventListener('resize', () => {
    const newMaxDisplay = calculateOptimalCount();
    if (newMaxDisplay !== maxDisplay) {
        location.reload(); 
    }
});

function initFilterToggle() {
    const toggleBtn = document.querySelector('.toggle-filters-btn');
    const filtersContainer = document.querySelector('.filters-container');
    
    // По умолчанию фильтры скрыты
    filtersContainer.classList.add('hidden');
    
    toggleBtn.addEventListener('click', () => {
        filtersContainer.classList.toggle('hidden');
        toggleBtn.classList.toggle('active');
    });
}

// Добавляем функции для работы с кастомными селектами
function initCustomSelects() {
    const customSelects = document.querySelectorAll('.custom-select');
    
    customSelects.forEach(select => {
        const header = select.querySelector('.select-header');
        const options = select.querySelector('.select-options');
        const checkboxes = select.querySelectorAll('input[type="checkbox"]');
        const headerText = header.querySelector('span');
        
        header.addEventListener('click', () => {
            const isActive = header.classList.contains('active');
            
            // Закрываем все открытые селекты
            document.querySelectorAll('.select-header.active').forEach(activeHeader => {
                if (activeHeader !== header) {
                    activeHeader.classList.remove('active');
                    activeHeader.nextElementSibling.classList.remove('active');
                }
            });
            
            header.classList.toggle('active');
            options.classList.toggle('active');
        });
        
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                updateHeaderText(select);
            });
        });
        
        // Закрываем выпадающий список при клике вне его
        document.addEventListener('click', (e) => {
            if (!select.contains(e.target)) {
                header.classList.remove('active');
                options.classList.remove('active');
            }
        });
    });
}

function updateHeaderText(select) {
    const header = select.querySelector('.select-header span');
    const checkboxes = select.querySelectorAll('input[type="checkbox"]:checked');
    const isGenre = select.querySelector('input[name="genre"]') !== null;
    
    if (checkboxes.length === 0) {
        header.textContent = isGenre ? 'Выберите жанры' : 'Выберите темы';
    } else {
        header.textContent = `Выбрано: ${checkboxes.length}`;
    }
}