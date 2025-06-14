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
    anons: 'Анонсированное'
};

const orderMap = {
    popularity: 'Популярное'
};

let currentFilters = {
    kind: '',
    status: '',
    score: '',
    genres: [],
    themes: []
};

document.addEventListener('DOMContentLoaded', function() {
    initAnime();
    setupEventListeners();
    initFilterToggle();
    initCustomSelects();
});

let validAnimeShuffled = [];
let displayedAnime = new Set();
let currentIndex = 0;
let loadedAnimeIds = new Set();
let usedPages = new Set();

function initFilterToggle() {
    const toggleBtn = document.querySelector('.toggle-filters-btn');
    const filtersContainer = document.querySelector('.filters-container');
    
    filtersContainer.classList.add('hidden');
    
    toggleBtn.addEventListener('click', () => {
        filtersContainer.classList.toggle('hidden');
        toggleBtn.classList.toggle('active');
    });

    document.getElementById('apply-filters').addEventListener('click', applyFilters);
    document.getElementById('reset-filters').addEventListener('click', resetFilters);
}

async function applyFilters() {
    const genreCheckboxes = document.querySelectorAll('input[name="genre"]:checked');
    const themeCheckboxes = document.querySelectorAll('input[name="theme"]:checked');
    
    const selectedGenres = Array.from(genreCheckboxes).map(checkbox => checkbox.value);
    const selectedThemes = Array.from(themeCheckboxes).map(checkbox => checkbox.value);
    
    currentFilters = {
        kind: document.getElementById('kind-filter').value,
        status: document.getElementById('status-filter').value,
        score: document.getElementById('score-filter').value,
        genres: selectedGenres,
        themes: selectedThemes
    };

    validAnimeShuffled = [];
    currentIndex = 0;
    loadedAnimeIds.clear();
    usedPages.clear();
    
    document.getElementById('next-random-anime').disabled = false;
    
    const animeContainer = document.getElementById('anime-card');
    animeContainer.innerHTML = '';
    
    await loadRandomPage();
    
    if (validAnimeShuffled.length > 0) {
        displayNextAnime();
    } else {
        animeContainer.innerHTML = '<div class="no-results"><h3>Аниме с заданными фильтрами не найдено</h3></div>';
        document.getElementById('next-random-anime').disabled = true;
    }

    const filtersContainer = document.querySelector('.filters-container');
    const toggleBtn = document.querySelector('.toggle-filters-btn');
    filtersContainer.classList.add('hidden');
    toggleBtn.classList.remove('active'); 
}

async function loadRandomPage() {
    let page;

    const filtersAreActive = currentFilters.kind !== '' || 
                            currentFilters.status !== '' || 
                            currentFilters.score !== '' || 
                            (currentFilters.genres && currentFilters.genres.length > 0) || 
                            (currentFilters.themes && currentFilters.themes.length > 0);

    if (filtersAreActive) {
        page = Math.max(...usedPages, 0) + 1;
    } else {
        if (usedPages.size >= 100) {
            return;
        }
        do {
            page = Math.floor(Math.random() * 100) + 1;
        } while (usedPages.has(page));
    }

    usedPages.add(page);

    try {
        const apiParams = new URLSearchParams();
        apiParams.append('limit', '50');
        apiParams.append('page', page.toString());
        apiParams.append('order', 'popularity');
        apiParams.append('rating', 'g,pg,pg_13,r,r_plus');

        if (currentFilters.kind) apiParams.append('kind', currentFilters.kind);
        if (currentFilters.status) apiParams.append('status', currentFilters.status);
        if (currentFilters.score) apiParams.append('score', currentFilters.score);

        const genres = [];
        if (currentFilters.genres) genres.push(...currentFilters.genres);
        if (currentFilters.themes) genres.push(...currentFilters.themes);
        if (genres.length > 0) {
            apiParams.append('genre', genres.join(','));
        }

        const apiUrl = `https://shikimori.one/api/animes?${apiParams.toString()}&censored=true`;
        console.log('Запрос к API:', apiUrl);

        const response = await fetch(apiUrl);
        const animeList = await response.json();
        console.log('Получено аниме:', animeList.length);

        if (!animeList || animeList.length === 0) {
            console.log('Получен пустой список аниме от API');
            return;
        }

        const newValidAnime = animeList.filter(anime => {
            if (anime.score == 0.0 || anime.episodes == 0 || 
                (anime.episodes_aired ?? anime.episodes) == 0 ) {
                return false;
            }
            return true;
        });
        console.log('Отфильтровано валидных аниме:', newValidAnime.length);

        const promises = newValidAnime.map(async anime => {
            const animeId = anime.id;
            if (!loadedAnimeIds.has(animeId)) {
                let imageUrl = `https://shikimori.one${anime.image.original}`;
                if (anime.image.original.includes("missing_original")){
                    const url = `https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(anime.name)}`;
    
                    const response = await fetch(url);
                    const data = await response.json();
                    imageUrl = data.data[0]?.attributes?.posterImage?.small;
                }    
                return {
                    title: anime.russian || anime.name,
                    image: imageUrl,
                    rating: anime.score,
                    episode: anime.episodes,
                    episodes_aired: anime.episodes_aired ?? anime.episodes,
                    type: kindMap[anime.kind] || anime.kind,
                    isNew: anime.aired_on && new Date(anime.aired_on) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    status: anime.status,
                    id: animeId
                };
            }
            return null;
        });

        const mappedAnime = (await Promise.all(promises)).filter(anime => anime !== null);

        console.log('После маппинга и фильтрации:', mappedAnime.length);

        if (mappedAnime.length > 0) {
            mappedAnime.forEach(anime => loadedAnimeIds.add(anime.id));
            
            validAnimeShuffled = [...validAnimeShuffled, ...mappedAnime];
            console.log('Всего аниме в списке:', validAnimeShuffled.length);
            for (let i = validAnimeShuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [validAnimeShuffled[i], validAnimeShuffled[j]] = [validAnimeShuffled[j], validAnimeShuffled[i]];
            }
            currentIndex = 0;
        }

    } catch (error) {
        console.error('Ошибка при загрузке страницы:', error);
    }
}

async function initAnime() {
    const animeContainer = document.getElementById('anime-card');
    animeContainer.innerHTML = '';
    
    document.getElementById('next-random-anime').disabled = false;
    
    await loadRandomPage();
    if (validAnimeShuffled.length > 0) {
        displayNextAnime();
    } else {
        animeContainer.innerHTML = '<div class="no-results"><h3>Аниме с заданными фильтрами не найдено</h3></div>';
        document.getElementById('next-random-anime').disabled = true;
    }
}

function displayNextAnime() {
    const animeContainer = document.getElementById('anime-card');
    animeContainer.innerHTML = '';

    if (validAnimeShuffled.length === 0 || currentIndex >= validAnimeShuffled.length) {
        loadRandomPage().then(() => {
            if (validAnimeShuffled.length > 0) {
                displayNextAnime();
            } else {
                animeContainer.innerHTML = '<div class="no-results"><h3>Аниме с заданными фильтрами не найдено</h3></div>';
                document.getElementById('next-random-anime').disabled = true;
            }
        });
        return;
    }

    const animeToShow = validAnimeShuffled[currentIndex];
    animeContainer.appendChild(createAnimeCard(animeToShow));
    
    validAnimeShuffled.splice(currentIndex, 1);
    
    if (validAnimeShuffled.length < 10) {
        loadRandomPage();
    }
}

function setupEventListeners() {
    const searchInput = document.querySelector('.search-container input');
    const searchButton = document.querySelector('.search-container button');
    const nextButton = document.getElementById('next-random-anime');

    searchButton.addEventListener('click', () => {
        performSearch(searchInput.value);
    });

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            performSearch(searchInput.value);
        }
    });

    nextButton.addEventListener('click', () => {
        displayNextAnime();
    });
}

function createAnimeCard(anime) {
    console.log(anime);
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
        await getAnime(anime.id);
    });

    return card;
}

async function getAnime(anime_id) {
    const resp = await fetch(`https://shikimori.one/api/animes/${anime_id}`);
    const fanime = await resp.json();
    if (!fanime) return;

    const folder = String(fanime.id);

    await fetch('/create-anime', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ anime: fanime, folder })
    })
    .then(response => response.json())
    .then(data => {
    })
    .catch(error => {
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

        let searchResultsContainer = document.querySelector('.search-results-container');

        const response = await fetch(`https://shikimori.one/api/animes?search=${encodeURIComponent(query)}&limit=20&order=popularity&rating=g%2Cpg%2Cpg_13%2Cr%2Cr_plus&censored=true`);
        const results = await response.json();

        const mainContainer = document.querySelector('main');

        mainContainer.innerHTML = '';

        const container = document.createElement('selection');
        container.className = 'anime-grid';
        mainContainer.appendChild(container);

        for (const anime of results) {
            let imageUrl = `https://shikimori.one${anime.image.original}`;
            if (anime.image.original.includes("missing_original")){
                const url = `https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(anime.name)}`;

                const response = await fetch(url);
                const data = await response.json();
                imageUrl = data.data[0]?.attributes?.posterImage?.small;
            }
            const card = createAnimeCard({
                id: anime.id,
                title: anime.russian || anime.name,
                image: imageUrl,
                rating: anime.score,
                episodes_aired: anime.episodes_aired ?? anime.episodes,
                episode: anime.episodes,
                type: kindMap[anime.kind] || anime.kind,
                isNew: new Date(anime.aired_on) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
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
        alert('Произошла ошибка при поиске. Пожалуйста, попробуйте позже.');
    }
}

async function resetFilters() {
    document.getElementById('kind-filter').value = '';
    document.getElementById('status-filter').value = '';
    document.getElementById('score-filter').value = '';
    
    document.querySelectorAll('input[name="genre"]').forEach(checkbox => checkbox.checked = false);
    document.querySelectorAll('input[name="theme"]').forEach(checkbox => checkbox.checked = false);

    currentFilters = {
        kind: '',
        status: '',
        score: '',
        genres: [],
        themes: []
    };

    validAnimeShuffled = [];
    currentIndex = 0;
    loadedAnimeIds.clear();
    usedPages.clear();
    displayedAnime.clear();
    
    document.getElementById('next-random-anime').disabled = false;
    
    initAnime();

    const filtersContainer = document.querySelector('.filters-container');
    const toggleBtn = document.querySelector('.toggle-filters-btn');
    filtersContainer.classList.add('hidden');
    toggleBtn.classList.remove('active');
}

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