const statusMap = {
    watched: 'Просмотрено', 
    planToWatch: 'В планах', 
    onHold: 'Отложено', 
    reWatching: 'Пересматриваю',
    dropped: 'Брошено', 
    watching: 'Смотрю' 
}

const kindMap = {
    tv: 'TV сериал',
    movie: 'Фильм',
    ona: 'ONA',
    ova: 'OVA',
    special: 'Спешл',
    tv_special: 'Спешл'
};

const months = [
    "января", "февраля", "марта", "апреля", "мая", "июня",
    "июля", "августа", "сентября", "октября", "ноября", "декабря"
  ];


const bannedAnimeIds = [
    1535, // Тетрадь смерти
    22319, 27899, 36511, 30458, 31297, 37799, // Токийский гуль
    14833, 17743, // Князь тьмы и герой
    7088, 8465, // Князь тьмы с задней парты
    10465, 10845, // Клинок Маню
    6987, 8577, // Аки и Сора
    38656, 41194, // Игры Дарвина
    39017, 40894, 42562, 44204, // Ложные выводы
    29095, 31368, 17729, 29101, 31324, 29093, // Натюрморт в серых тонах
    34542, // Инуяшики
    226, 376, // Эльфийская песнь
    35868,42392,51119 // Грисайя
];

const boughtAnimeIds = [
    23755, 30347, 31722, 36923, 34577, 41491, 39701, 35946, 45567, 50315, 46420, 38198, 35417, 41059, 31722, 35418, 51794, 53911, 58511, 53165, // Семь смертных грехов
    16498, 18397, 23775, 23777, 19285, 19391, 25777, 25781, 39477, 40028, 36106, 35760, 35122, 49627, 49739, 48583, 51535, 38524, 36702, 39478, // Атака титанов
    37430, 39607, 59493, 49318, 41487, 38793, 39551, 49877, 53580, 59970, 45753, 54565, 59971, 41488, 57434, 58592, 54050, 49891, 53913, 56948, // О моём перерождении в слизь
    21, // Ван-Пис
    431, // Ходячий замок
    199, // Унесённые призраками
    523, // Мой сосед Тоторо
    49596, 54865, // Синяя тюрьма: Блю Лок
    36699, // Как поживаете?
    28805, // Ученик чудовища
    164, // Принцесса Мононоке
    38826, // Дитя погоды
    1689, // Пять сантиметров в секунду
    16782, // Сад изящных слов
    512, // Ведьмина служба доставки
    22535, // Паразит: Учение о жизни
    37520, // Дороро
    37521, // Сага о Винланде
    48316, // Восхождение в тени!
    59144, // Худшая работа «оценщика» оказалась самой сильной
    51335, 51836, 52684// Трон, отмеченный богом
];


document.addEventListener('DOMContentLoaded', function() {
    // Инициализация динамического заполнения деталей аниме
    initAnimeDetails();
    initAnimeStatus();
    // initAnime();
    initRelatedAnime();
    initStatusBtn();
    initBlockedAnime();
    initWatchBtn();
    // initСomments();
    setupEventListeners();
    

});

async function initStatusBtn() {
    document.getElementById('addAnimeBtn').addEventListener('mouseover', function() {
        document.getElementById('addAnimeMenu').style.display = 'block';
    });
    
    document.getElementById('addAnimeBtn').addEventListener('mouseout', function() {
        setTimeout(() => {
            document.getElementById('addAnimeMenu').style.display = 'none';
        }, 5000); 
    });

    document.getElementById('addAnimeMenu').addEventListener('mouseover', function() {
        document.getElementById('addAnimeMenu').style.display = 'block';
    });
    document.querySelectorAll('.add-anime-menu button').forEach(item => {
        item.addEventListener('click', async function(event)  {
            event.preventDefault();
            const status = this.getAttribute('data-status');
            const anime_id = window.location.pathname.split('/').slice(-2, -1)[0];
            console.log(anime_id)
            const response = await fetch('/auth/anime-list', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ animeId: anime_id, status })
            });
            if(response.ok)
            {   
                let statusElement
                if( document.querySelector('.anime-status')){
                    statusElement = document.querySelector('.anime-status');
                }
                else {
                    statusElement = document.createElement('div');
                    statusElement.className = 'anime-status';
                }
                document.getElementById('addAnimeMenu').style.display = 'none';
                statusElement.innerHTML = `<p id="animeStatus" >${statusMap[status]}</p>`


                const addAnimeDiv = document.querySelector('.add-anime');

                addAnimeDiv.insertAdjacentElement('afterend', statusElement);
    
            }

        });
    });
}

async function initAnimeStatus() {
    const anime_id = window.location.pathname.split('/').slice(-2, -1)[0];
    const response = await fetch('/auth/anime-status', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ animeId: anime_id })
    });
    if(response.ok)
    {   
        console.log(response)
        const statusData = await response.json();
        console.log(statusData)
        const status = statusData.status;
        console.log(status)
        let statusElement
        if( document.querySelector('.anime-status')){
            statusElement = document.querySelector('.anime-status');
        }
        else {
            statusElement = document.createElement('div');
            statusElement.className = 'anime-status';
        }
        document.getElementById('addAnimeMenu').style.display = 'none';
        statusElement.innerHTML = `<p id="animeStatus" >${statusMap[status]}</p>`


        const addAnimeDiv = document.querySelector('.add-anime');

        addAnimeDiv.insertAdjacentElement('afterend', statusElement);

    }

}

async function initWatchBtn() {
    const Btn = document.getElementById('animeBtn');
    Btn.addEventListener('click', () => {
        const playerContainer = document.getElementById('player-container'); 
        playerContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
}

async function initAnimeContainer() {
    initAnime();
    const playerContainer = document.getElementById('bannerya'); 
    playerContainer.classList.remove('hide');
    playerContainer.classList.add('banner');
}


async function isUserInRussia() {
    try {
        const response = await fetch('https://api.country.is');
        const data = await response.json();
        console.log(data.country); // 'RU' и т.д.
        return data.country;
    } catch (error) {
        console.error('Ошибка при получении информации о местоположении:', error);
        return false; 
    }
}

async function initBlockedAnime() {
    const anime_id = window.location.pathname.split('/').slice(-2, -1)[0];
    console.log(anime_id);
    const country = await isUserInRussia();
    console.log(country);
    if (country == 'RU') {
        if (bannedAnimeIds.includes(parseInt(anime_id))) {
            console.log("заблокировано");
            const animeBtn = document.getElementById('animeBtn');
            animeBtn.innerHTML = `Просмотр недоступен.`;
            return;
        } else if (boughtAnimeIds.includes(parseInt(anime_id))) {
            console.log("выкупленно");
            const animeBtn = document.getElementById('animeBtn');
            animeBtn.innerHTML = `Просмотр недоступен.`;
            return;
        }
        // initWatchBtn();   
        initAnimeContainer();     
    } else {
        // initWatchBtn();
        initAnimeContainer(); 
    }
}


async function initRelatedAnime() {
    const anime_id = window.location.pathname.split('/').slice(-2, -1)[0];
    const url = `https://shikimori.one/api/animes/${anime_id}/related`;

    const response = await fetch(url);
    const related = await response.json();
    let n = 0;
    for (const relate of related) {
        if(relate.anime != null){
            console.log("аниме");
            n +=1;
            console.log(n);
        }
    };
    console.log(related.length);
    if(related.length > 0){
        console.log(n);
        if(n != 0){
            console.log(related);
            console.log(related.length);
            const playerContainer = document.getElementById('bannerya');

            const relatedElement = document.createElement('div');
            relatedElement.className = 'related-anime';
            const animeGrid = document.createElement('div');
            animeGrid.className = 'anime-grid-related';

            for (const relate of related) {
                if (relate.anime != null) {
                    const anime = relate.anime;
                    console.log(anime);
                    let date = new Date(anime.aired_on);

                    const day = date.getDate();
                    const month = months[date.getMonth()];
                    const year = date.getFullYear();
                    const anime_aired_on = `${day} ${month} ${year}`;

                    const card = document.createElement('div'); 
                    card.className = 'anime-card-related'; 
                    let imageUrl = `https://shikimori.one${anime.image.original}`;
                    if (anime.image.original.includes("missing_original")){
                        const url = `https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(anime.name)}`;
        
                        const response = await fetch(url);
                        const data = await response.json();
                        imageUrl = data.data[0]?.attributes?.posterImage?.small;
                    }
                    console.log(anime);
                    card.innerHTML = `
                        <div class="anime-card-related-image">
                            <img src="${imageUrl}" alt="${anime.title}">
                            <div class="anime-card-related-overlay">
                                <div class="play-button">
                                    <i class="fas fa-play"></i>
                                </div>
                            </div>
                            <div class="anime-card-related-rating">
                                <i class="fas fa-star"></i> ${anime.score}
                            </div>
                            ${(new Date(anime.aired_on) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) ? '<div class="anime-card-related-type">NEW</div>' : ''}
                        </div>
                        <div class="anime-card-related-info">
                            <div class="status-info">${relate.relation_russian}</div>
                            <h3 class="anime-card-related-title">${anime.russian}</h3>
                            <div class="anime-card-related-meta">
                                <span class="kind-info">${kindMap[anime.kind] || anime.kind}</span>
                                <span class="inter">·</span>
                                <span class="episode-info">EP ${anime.status === "released" ? anime.episodes : `${anime.episodes_aired}/${anime.episodes}`}</span>
                                <span class="inter">·</span>
                                <span class="date-info">${anime_aired_on}</span>
                            </div>
                        </div>
                    `;
                    card.addEventListener('click', async () => {
                        console.log(`Clicked on ${anime.name}`);
                        console.log(anime.id);
                        await getAnime(anime.id);
                    });
                    animeGrid.appendChild(card);
                }
            }
            relatedElement.innerHTML += `<h2>Связанное</h2>`;
            relatedElement.appendChild(animeGrid);
            playerContainer.parentNode.insertBefore(relatedElement, playerContainer);     
        }
    }
}

async function initAnime() {
    const anime_id = window.location.pathname.split('/').slice(-2, -1)[0];
    const response = await fetch(`https://kodikapi.com/search?token=ac62ed690e6577541d26ca2f256015e6&shikimori_id=${anime_id}&not_blocked_for_me=true&not_blocked_in=RU`);
    const kodik = await response.json();
    const result = kodik.results[0];
    console.log(kodik);
    const link = result.link;

    console.log(link)

    const iframe = document.createElement('iframe');
    iframe.id = 'kodik-player';
    iframe.src = link + '?season=1&episode=1';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.allow = 'autoplay *; fullscreen *';

    const playerContainer = document.getElementById('player-container');
    console.log(playerContainer);
    playerContainer.innerHTML = '';
    playerContainer.appendChild(iframe);

    playerContainer.classList.add('player-container');
    // playerContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

    const folder = String(fanime.id);

    console.log(folder)

    await fetch('https://aniscope.ru/create-anime', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ anime: fanime, folder })
    })
    .then(response => response.json())
    .then(data => {
      console.log('Успешно:', data);
    })
    .catch(error => {
      console.error('Ошибка fetch:', error);
    });

    window.location.href = `/animes/anime/${folder}/index.html`;
}

async function initСomments() {
    const lastElement = document.querySelector('.anime-stats');
    const commentsElement = document.createElement('div');
    commentsElement.className = 'comments'
    commentsElement.innerHTML = 'AAA'



    lastElement.insertAdjacentElement('afterend', commentsElement);
}

async function performSearch(query) {
    if (!query.trim()) return;

    try {
        const navLinks = document.querySelectorAll('.main-nav a');
        navLinks.forEach(link => link.classList.remove('active'));

        let searchResultsContainer = document.querySelector('.search-results-container');

        const response = await fetch(`https://shikimori.one/api/animes?search=${encodeURIComponent(query)}&limit=20&order=popularity&censored=true`);
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
        console.error('Ошибка при поиске:', error);
        alert('Произошла ошибка при поиске. Пожалуйста, попробуйте позже.');
    }
}

// Добавляем функцию для загрузки и отображения деталей аниме
async function initAnimeDetails() {
    const params = new URLSearchParams(window.location.search);
    const anime_id = params.get('id');
    if (!anime_id) return;
    try {
        const response = await fetch(`https://shikimori.one/api/animes/${anime_id}`);
        if (!response.ok) throw new Error('Не удалось загрузить данные аниме');
        const anime = await response.json();
        // Обновляем заголовок страницы
        document.title = `${anime.russian || anime.name} - AniLife`;
        // Бэкграунд
        const heroBg = document.querySelector('.hero-background');
        if (heroBg) heroBg.style.backgroundImage = `url('https://shikimori.one${anime.image.original}')`;
        // Постер
        const posterImg = document.querySelector('.hero-poster img');
        if (posterImg) posterImg.src = `https://shikimori.one${anime.image.x96 || anime.image.preview || anime.image.original}`;
        // Названия
        const titleEl = document.querySelector('.hero-info h1');
        if (titleEl) titleEl.textContent = anime.russian || anime.name;
        const origEl = document.querySelector('.hero-info .original-title');
        if (origEl) origEl.textContent = anime.name;
        // Рейтинг
        const ratingEl = document.querySelector('.meta-info .rating');
        if (ratingEl) ratingEl.innerHTML = `<i class="fas fa-star"></i> ${anime.score || 'N/A'}`;
        // Статус
        const statusEl = document.querySelector('.meta-info .status');
        if (statusEl) {
            statusEl.textContent = anime.status.toUpperCase();
            if (anime.status === 'ongoing') statusEl.classList.add('releasing'); else statusEl.classList.remove('releasing');
        }
        // Детали в сайдбаре
        const sidebarUl = document.querySelector('.anime-details-sidebar ul');
        if (sidebarUl) {
            const about = anime;
            const aired = about.aired_on || 'N/A';
            const season = about.season ? about.season.replace('_', ' ').toUpperCase() : 'N/A';
            const genres = (anime.genres || []).map(g => g.russian || g.name).join(', ');
            const studios = (about.studios || []).map(s => s.name).join(', ');
            sidebarUl.innerHTML = `
                <li><strong>Airing:</strong> <span>EP ${about.episodes_aired || 0}/${about.episodes || 0}</span></li>
                <li><strong>Type:</strong> <span>${kindMap[about.kind] || about.kind}</span></li>
                <li><strong>Episodes:</strong> <span>${about.episodes || 'N/A'}</span></li>
                <li><strong>Genres:</strong> <span>${genres}</span></li>
                <li><strong>Aired:</strong> <span>${aired}</span></li>
                <li><strong>Status:</strong> <span>${about.status.toUpperCase()}</span></li>
                <li><strong>Season:</strong> <span>${season}</span></li>
                <li><strong>Studios:</strong> <span>${studios}</span></li>
                <li><strong>Source:</strong> <span>${about.source || 'N/A'}</span></li>
                <li><strong>Duration:</strong> <span>${about.duration ? about.duration + ' мин' : 'N/A'}</span></li>
                <li><strong>Popularity:</strong> <span>${about.favorites_count || 0} users</span></li>
            `;
        }
        // Описание
        const descParas = document.querySelectorAll('.anime-description p');
        if (descParas.length > 0) descParas[0].textContent = anime.description ? anime.description.replace(/<[^>]*>/g, '') : 'Нет описания';
        if (descParas.length > 1) descParas[1].textContent = `(Source: Shikimori)`;
    } catch (error) {
        console.error('Ошибка загрузки информации аниме:', error);
    }
}
 