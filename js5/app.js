const kindMap = {
    tv: 'TV сериал',
    movie: 'Фильм',
    ona: 'ONA'
};

const statusMap = {
    ongoing: 'Онгоиг',
    released: 'Вышедшее'
};
document.addEventListener('DOMContentLoaded', function() {
    // initMainAnime();
    // initTrendingAnime(); // Commented out
    // initNewAnime(); // Commented out
    // initPopularAnime(); // Commented out
    // setupEventListeners(); // Assuming this is still needed for search or other general UI

    if (document.getElementById('popular-anime')) {
        displayProcessedAnimeSection(
            '#popular-anime .datafetcher-anime-grid',
            { limit: 6, order: 'ranked' },
            "Не удалось загрузить популярные аниме."
        );
    }

    if (document.getElementById('popular-movies')) { // Corrected ID usage
        displayProcessedAnimeSection(
            '#popular-movies .datafetcher-anime-grid', // Ensure this matches the actual HTML
            { limit: 6, kind: 'movie', order: 'popularity' },
            "Не удалось загрузить популярные фильмы."
        );
    }

    if (document.getElementById('ongoing-anime')) {
        displayProcessedAnimeSection(
            '#ongoing-anime .datafetcher-anime-grid',
            { limit: 6, status: 'ongoing', order: 'popularity' },
            "Не удалось загрузить онгоинги."
        );
    }
});

function calculateOptimalCount() {
    const screenWidth = window.innerWidth;
    const baseWidth = 1920; // Базовая ширина (FullHD)
    const baseCount = 9; // Базовое количество элементов для FullHD
    
    // Рассчитываем пропорциональное количество элементов
    let optimalCount = Math.floor((screenWidth / baseWidth) * baseCount);
    
    // Устанавливаем минимальное и максимальное значения
    optimalCount = Math.max(4, Math.min(15, optimalCount));
    
    return optimalCount;
}

// async function initMainAnime() {
//     const mainAnimeContainer = document.getElementById('main-anime');
//     let displayed = 0;
//     try {
//         const response = await fetch('https://shikimori.one/api/animes?limit=50&order=popularity');
//         const animeList = await response.json();

//         for (const anime of animeList) {
//             const animeData = {
//                 title: anime.russian,
//                 image: `https://shikimori.one${anime.image.original}`,
//                 rating: anime.score,
//                 episode: anime.episodes,
//                 episodes_aired: anime.episodes_aired ?? anime.episodes,
//                 type: kindMap[anime.kind] || anime.kind,
//                 isNew: anime.aired_on && new Date(anime.aired_on) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // меньше 30 дней назад
//                 id: anime.id
//             };
            
//             if(anime.score == 0.0)
//             {
//                 console.log(anime.score)
//                 continue;
                
//             }
            
//             if(anime.episodes == 0)
//             {   
//                 console.log(anime.episodes)
//                 continue;
//             }

//             const resp = await fetch(`https://shikimori.one/api/animes/${anime.id}`);
//             const fanime = await resp.json();

//             if(fanime.description == null)
//             {
//                 console.log(fanime.description)
//                 continue;
//             }
            
//             console.log(anime.image)
//             mainAnimeContainer.appendChild(createMainAnimeCard(animeData,fanime));
//             displayed++;

//             if (displayed == 1) break; 
//         }
//     } catch (error) {
//         console.error('Ошибка при загрузке трендового аниме:', error);
//     }

//     // mainAnimeContainer.appendChild(createMainAnimeCard(anime));
// }

async function initTrendingAnime() {
    const trendingAnimeContainer = document.getElementById('trending-anime');
    let displayed = 0;
    const maxDisplay = calculateOptimalCount();
    try {
        const response = await fetch('https://shikimori.one/api/animes?status=latest&limit=20&order=popularity&rating=g%2Cpg%2Cpg_13%2Cr%2Cr_plus&censored=true');
        const animeList = await response.json();

        for (const anime of animeList) {

            const animeData = {
                title: anime.russian,
                image: `https://shikimori.one${anime.image.original}`,
                rating: anime.score,
                episode: anime.episodes,
                episodes_aired: anime.episodes_aired ?? anime.episodes,
                type: kindMap[anime.kind] || anime.kind,
                isNew: anime.aired_on && new Date(anime.aired_on) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // меньше 30 дней назад
                id: anime.id,
                status: anime.status
            };
            
            if(anime.score == 0.0)
            {
                continue;
            }
            
            if(anime.episodes == 0)
            {
                continue;
            }
            if(anime.episodes_aired == 0)
            {
                continue;
            }
            if(anime.episodes_aired != anime.episodes)
            {
                    continue;
            }
            if(anime.image.original.includes("missing_original")) {
                continue;
            }

            
            trendingAnimeContainer.appendChild(createAnimeCard(animeData));
            displayed++;

            if (displayed == maxDisplay) break; 
        }
    } catch (error) {
        console.error('Ошибка при загрузке трендового аниме:', error);
    }



    // trendingAnimeContainer.appendChild(createAnimeCard(anime));
}

async function initNewAnime() {
    const latestEpisodesContainer = document.getElementById('latest-episodes');
    

    const daysAgo = 90;
    
    const minDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    
    const today = new Date();
    
    const limit = 50;
    
    const maxPages = 1000000000000;
    
    let displayed = 0;
    const maxDisplay = calculateOptimalCount();
    

    try {
        for (let page = 1; page <= maxPages; page++) {
            

            const response = await fetch(`https://shikimori.one/api/animes?status=ongoing&order=aired_on&limit=${limit}&page=${page}&rating=g%2Cpg%2Cpg_13%2Cr%2Cr_plus&censored=true`);
            
            const animeList = await response.json();

            

            for (const anime of animeList) {
                

                const airedOn = anime.aired_on ? new Date(anime.aired_on) : null;
                

                if (!airedOn || airedOn < minDate || airedOn > today) {
                    
                    continue;
                }

                if (
                    anime.score === 0.0 ||
                    anime.episodes === 0 ||
                    anime.episodes_aired === 0 ||
                    anime.image.original.includes("missing_original")
                ) {
                    
                    continue;
                }

                const animeData = {
                    title: anime.russian,
                    image: `https://shikimori.one${anime.image.original}`,
                    rating: anime.score,
                    episode: anime.episodes,
                    episodes_aired: anime.episodes_aired ?? anime.episodes,
                    type: kindMap[anime.kind] || anime.kind,
                    isNew: airedOn > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // меньше 30 дней назад
                    id: anime.id,
                    status: anime.status
                };
                

                latestEpisodesContainer.appendChild(createAnimeCard(animeData));
                

                displayed++;
                

                if (displayed >= maxDisplay) break;
                
            }

            if (displayed >= maxDisplay) break;
            
        }
    } catch (error) {
        console.error('Ошибка при загрузке трендового аниме:', error);
        
    }
}

async function initPopularAnime() {
    const popularAnimeContainer = document.getElementById('popular-anime');
    

    const daysAgo = 90;
    
    const minDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    
    const today = new Date();
    
    const limit = 50;
    
    const maxPages = 1000000000000;
    
    let displayed = 0;
    const maxDisplay = calculateOptimalCount();
    

    try {
        for (let page = 1; page <= maxPages; page++) {
            

            const response = await fetch(`https://shikimori.one/api/animes?season=2025&order=popularity&status=released&limit=${limit}&page=${page}&rating=g%2Cpg%2Cpg_13%2Cr%2Cr_plus&censored=true`);
            
            const animeList = await response.json();

            console.log(animeList)

            

            for (const anime of animeList) {
                

                const airedOn = anime.aired_on ? new Date(anime.aired_on) : null;

                if (
                    anime.score === 0.0 ||
                    anime.episodes === 0 ||
                    anime.episodes_aired === 0 ||
                    anime.image.original.includes("missing_original")
                ) {
                    
                    continue;
                }

                const animeData = {
                    title: anime.russian,
                    image: `https://shikimori.one${anime.image.original}`,
                    rating: anime.score,
                    episode: anime.episodes,
                    episodes_aired: anime.episodes_aired ?? anime.episodes,
                    type: kindMap[anime.kind] || anime.kind,
                    isNew: airedOn > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // меньше 30 дней назад
                    id: anime.id,
                    status: anime.status
                };
                popularAnimeContainer.appendChild(createAnimeCard(animeData));
                

                displayed++;
                

                if (displayed >= maxDisplay) break;
                
            }

            if (displayed >= maxDisplay) break;
            
        }
    } catch (error) {
        console.error('Ошибка при загрузке трендового аниме:', error);
        
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

// function createMainAnimeCard(anime, fanime) {
//     const card = document.createElement('div');
//     card.className = 'hero-content';

//     card.innerHTML = `
//         <h1>${anime.title}</h1>
//         <p>${(fanime.description || 'Нет описания').slice(0, 300).replace(/([.!?…]{1,3})(?!.*[.!?…]{1,3}).*$/, '$1') + (/([.!?…]{1,3})$/.test(RegExp.$1 || '') ? '' : '...')}</p>
//         <div class="hero-buttons">
//             <button class="watch-now-btn"><i class="fas fa-play"></i> Смотреть</button>
//             <button class="more-info-btn"><i class="fas fa-info-circle"></i> Подробнее</button>
//         </div>
//         <div class="hero-meta">
//             <span class="quality">HD</span>
//             <span class="separator">•</span>
//             <span class="type"><i class="fas fa-star"></i> ${anime.rating}</span>
//             <span class="separator">•</span>
//             <span class="episodes">${anime.episodes_aired === anime.episode ? anime.episode : `${anime.episodes_aired}/${anime.episode}`} Episodes</span>
//             <span class="separator">•</span>
//             <span class="type">${anime.type}</span>
//             <span class="separator">•</span>
//             <span class="type">${statusMap[fanime.status] || fanime.status}</span>
            
//         </div>

//     `;

//     const mainAnimeContainer = document.getElementById('main-anime');
//     mainAnimeContainer.style.backgroundImage = `url('${anime.image}')`;



//     return card;

// }

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
        // Перезагружаем контент с новым количеством элементов
        // Здесь должна быть ваша логика обновления контента
        location.reload(); // Временное решение, лучше реализовать динамическое обновление
    }
});

/**
 * Загружает и отображает секцию аниме, используя fetchProcessedAnimeList из dataFetcher.js.
 * @param {string} containerSelector - CSS-селектор для контейнера, куда будут добавлены карточки.
 * @param {object} fetchParams - Параметры для window.animeDataFetcher.fetchProcessedAnimeList.
 * @param {string} fallbackMessage - Сообщение об ошибке, если данные не загружены.
 */
async function displayProcessedAnimeSection(containerSelector, fetchParams, fallbackMessage = "Не удалось загрузить данные.") {
    const container = document.querySelector(containerSelector);
    if (!container) {
        console.warn('Контейнер не найден:', containerSelector); // Changed to warn
        return;
    }

    const loadingMessageElement = container.querySelector('.df-loading-message, .loading-message'); // Ищем старое или новое сообщение о загрузке
    if (loadingMessageElement) {
         // Можно оставить сообщение о загрузке или заменить его, если это необходимо
    } else {
        container.innerHTML = '<div class="df-loading-message">Загрузка...</div>'; // Стандартное сообщение
    }

    try {
        if (!window.animeDataFetcher || typeof window.animeDataFetcher.fetchProcessedAnimeList !== 'function') {
            console.error('Ошибка: animeDataFetcher или fetchProcessedAnimeList не доступны.');
            container.innerHTML = '<div class="df-error-message">Ошибка: Модуль загрузки данных не найден.</div>';
            return;
        }

        const animeList = await window.animeDataFetcher.fetchProcessedAnimeList(fetchParams);

        if (animeList && animeList.length > 0) {
            container.innerHTML = ''; // Очищаем сообщение о загрузке/старые карточки
            animeList.forEach(anime => {
                // Используем функцию createDataFetcherAnimeCard для создания карточки
                // Это новая функция, которую мы определим ниже, чтобы не конфликтовать с существующей createAnimeCard
                const animeCardElement = createDataFetcherAnimeCard(anime);
                container.appendChild(animeCardElement);
            });
        } else {
            container.innerHTML = `<div class="df-error-message">${fallbackMessage} Список пуст.</div>`;
        }
    } catch (error) {
        console.error(`Ошибка загрузки аниме для ${containerSelector}:`, error);
        container.innerHTML = `<div class="df-error-message">Ошибка загрузки: ${error.message}</div>`;
    }
}

/**
 * Создает HTML-элемент карточки аниме для данных, полученных через dataFetcher.
 * @param {object} anime - Объект аниме с полями (id, russianName, name, finalPoster, kind, score и т.д.).
 * @returns {HTMLElement} - Корневой DOM-элемент карточки.
 */
function createDataFetcherAnimeCard(anime) {
    const displayName = anime.russianName || anime.name;
    const card = document.createElement('div');
    card.className = 'df-anime-card';

    const detailPageUrl = `anime.html?id=${anime.id}`;
    
    let formattedKind = anime.kind ? anime.kind.replace('_', ' ').toUpperCase() : '';
    const kindDisplayMap = {
        'TV': 'TV Сериал',
        'MOVIE': 'Фильм',
        'OVA': 'OVA',
        'ONA': 'ONA',
        'SPECIAL': 'Спешл',
        'MUSIC': 'Клип'
    };
    formattedKind = kindDisplayMap[formattedKind] || formattedKind;

    card.innerHTML = `
        <a href="${detailPageUrl}">
            <div class="df-anime-poster">
                <img src="${anime.finalPoster}" alt="Постер ${displayName}" onerror="this.onerror=null;this.src='https://via.placeholder.com/200x300/1a1a1a/ffffff?text=Error';">
                <div class="df-info-overlay">
                    ${formattedKind ? `<span class="df-kind">${formattedKind}</span>` : ''}
                    ${anime.score ? `<span class="df-score"><i class="fas fa-star"></i>${anime.score}</span>` : ''}
                </div>
            </div>
            <div class="df-anime-card-title" title="${displayName}">${displayName}</div>
        </a>
    `;
    return card;
}