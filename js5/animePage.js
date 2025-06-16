document.addEventListener('DOMContentLoaded', async () => {
    const animeDetailContainer = document.getElementById('anime-detail-content');
    const animeDetailTemplate = document.getElementById('anime-detail-template');

    const urlParams = new URLSearchParams(window.location.search);
    const animeId = urlParams.get('id');

    if (!animeId) {
        animeDetailContainer.innerHTML = '<div class="adh-error-fullpage">Ошибка: ID аниме не указан в URL.</div>';
        document.title = "Ошибка - AniLife";
        return;
    }

    if (!window.animeDataFetcher || !window.animeDataFetcher.getShikimoriAnimeDetails) {
        animeDetailContainer.innerHTML = '<div class="adh-error-fullpage">Ошибка: Модуль загрузки данных (dataFetcher.js) не найден.</div>';
        document.title = "Ошибка загрузки - AniLife";
        console.error("animeDataFetcher or getShikimoriAnimeDetails is not available.");
        return;
    }

    if (animeDetailTemplate) {
        animeDetailContainer.innerHTML = '<div class="adh-loading-fullpage">Загрузка данных об аниме...</div>';
    } else {
        animeDetailContainer.innerHTML = '<div class="adh-loading-fullpage">Загрузка... (шаблон не найден)</div>';
        console.error("Шаблон #anime-detail-template не найден!");
        // Можно остановить выполнение или попытаться создать структуру динамически, но это сложнее
    }

    try {
        const anime = await window.animeDataFetcher.getShikimoriAnimeDetails(animeId);

        if (!anime) {
            animeDetailContainer.innerHTML = '<div class="adh-error-fullpage">Не удалось загрузить информацию об аниме. Возможно, такого ID не существует.</div>';
            document.title = "Аниме не найдено - AniLife";
            return;
        }

        if (!animeDetailTemplate) {
             // Если шаблона нет, дальнейшее выполнение бессмысленно
            return;
        }

        const newContent = animeDetailTemplate.content.cloneNode(true);
        animeDetailContainer.innerHTML = ''; 
        animeDetailContainer.appendChild(newContent);
        
        document.title = `${anime.russian || anime.name} - AniLife`;

        // Безопасное получение элементов по ID
        const getEl = (id) => document.getElementById(id);

        const animeTitleEl = getEl('anime-title');
        if (animeTitleEl) animeTitleEl.textContent = anime.russian || anime.name;
        
        const originalTitleEl = getEl('anime-original-title');
        if (originalTitleEl) {
            if (anime.name && anime.name.toLowerCase() !== (anime.russian || '').toLowerCase()) {
                originalTitleEl.textContent = anime.name;
            } else {
                originalTitleEl.style.display = 'none';
            }
        }

        const animeRatingEl = getEl('anime-rating');
        if (animeRatingEl) animeRatingEl.innerHTML = `<i class="fas fa-star"></i> ${anime.score || 'N/A'}`;
        
        const statusBadgeEl = getEl('anime-status-badge');
        if (statusBadgeEl) {
            statusBadgeEl.textContent = formatStatus(anime.status);
            statusBadgeEl.className = `status ${anime.status}`;
        }

        const posterElement = getEl('anime-poster');
        if (posterElement) {
            let finalPosterUrl = anime.image?.original ? `https://shikimori.one${anime.image.original}` : 'https://via.placeholder.com/225x320?text=Нет+постера';
            if (window.animeDataFetcher.getKitsuPoster) {
                const kitsuPoster = await window.animeDataFetcher.getKitsuPoster(anime.name);
                if (kitsuPoster) finalPosterUrl = kitsuPoster;
            }
            posterElement.src = finalPosterUrl;
            posterElement.alt = `Постер для ${anime.russian || anime.name}`;

            const heroBackgroundElement = document.querySelector('.adh-hero-background');
            if (heroBackgroundElement) {
                if (anime.screenshots && anime.screenshots.length > 0) {
                    heroBackgroundElement.style.backgroundImage = `url('https://shikimori.one${anime.screenshots[0].original}')`;
                } else {
                     heroBackgroundElement.style.backgroundImage = `url('${finalPosterUrl}')`;
                }
            }
        }
        
        // Детали в sidebar
        const detailTypeEl = getEl('detail-type');
        if (detailTypeEl) detailTypeEl.textContent = formatKind(anime.kind);

        const detailEpisodesEl = getEl('detail-episodes');
        if (detailEpisodesEl) detailEpisodesEl.textContent = `${anime.episodes_aired} / ${anime.episodes || '?'}`;

        const detailStatusEl = getEl('detail-status');
        if (detailStatusEl) detailStatusEl.textContent = formatStatus(anime.status);

        const detailSeasonEl = getEl('detail-season');
        if (detailSeasonEl) detailSeasonEl.textContent = anime.season ? formatSeason(anime.season) : (anime.aired_on ? new Date(anime.aired_on).getFullYear().toString() : 'N/A');
        
        const detailYearEl = getEl('detail-year');
        if (detailYearEl) detailYearEl.textContent = anime.aired_on ? new Date(anime.aired_on).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';
        
        const studiosContainerEl = getEl('detail-studios');
        if (studiosContainerEl) {
            studiosContainerEl.textContent = (anime.studios && anime.studios.length > 0) ? anime.studios.map(s => s.name).join(', ') : 'N/A';
        }

        const genresContainerEl = getEl('detail-genres');
        if (genresContainerEl) {
            genresContainerEl.innerHTML = (anime.genres && anime.genres.length > 0) ? anime.genres.map(g => `<a href="#" class="adh-genre-tag">${g.russian || g.name}</a>`).join(' ') : 'N/A';
        }

        const detailDurationEl = getEl('detail-duration');
        if (detailDurationEl) detailDurationEl.textContent = anime.duration ? `${anime.duration} мин.` : 'N/A';

        const detailAgeRatingEl = getEl('detail-age-rating');
        if (detailAgeRatingEl) detailAgeRatingEl.textContent = anime.rating ? anime.rating.toUpperCase().replace('_PLUS', '+').replace('NONE', 'Без рейтинга').replace('G','0+').replace('PG','6+').replace('PG_13','13+').replace('R','17+').replace('R_PLUS','18+') : 'N/A';

        const descriptionContainerEl = getEl('anime-description-content');
        if (descriptionContainerEl) descriptionContainerEl.innerHTML = anime.description_html || '<p>Описание отсутствует.</p>';

        const trailerContainerEl = getEl('anime-trailer-container');
        if (trailerContainerEl) {
            if (anime.videos && anime.videos.length > 0) {
                const trailer = anime.videos.find(v => v.kind === 'pv' || v.kind === 'trailer' || v.kind === 'op' || v.kind === 'ed');
                if (trailer && (trailer.url || trailer.player_url)) {
                    const trailerButton = document.createElement('a');
                    trailerButton.className = 'btn btn-trailer adh-btn';
                    trailerButton.href = trailer.url || trailer.player_url;
                    trailerButton.target = '_blank';
                    trailerButton.innerHTML = `<i class="fas fa-video"></i> Смотреть ${trailer.kind === 'pv' || trailer.kind === 'trailer' ? 'трейлер' : trailer.kind.toUpperCase()}`;
                    trailerContainerEl.innerHTML = ''; // Очищаем перед добавлением
                    trailerContainerEl.appendChild(trailerButton);
                } else {
                    trailerContainerEl.innerHTML = '';
                }
            } else {
                trailerContainerEl.innerHTML = '';
            }
        }
        
        setupPageNavigation();
        if (anime.related) loadRelatedAnime(animeId, anime.related);
        if (anime.roles) loadCharacters(animeId, anime.roles); // Shikimori использует 'roles' для персонажей в основном объекте
        if (anime.screenshots) loadScreenshots(animeId, anime.screenshots);

    } catch (error) {
        console.error("Ошибка при загрузке и отображении деталей аниме:", error);
        animeDetailContainer.innerHTML = `<div class="adh-error-fullpage">Произошла ошибка: ${error.message}</div>`;
        document.title = "Ошибка - AniLife";
    }
});

function formatStatus(status) {
    const statusMap = { 'anons': 'Анонс', 'ongoing': 'Онгоинг', 'released': 'Вышло' };
    return statusMap[status] || status;
}

function formatKind(kind) {
    const kindMap = { 'tv': 'TV Сериал', 'movie': 'Фильм', 'ova': 'OVA', 'ona': 'ONA', 'special': 'Спешл', 'music': 'Клип' };
    return kindMap[kind] || kind;
}

function formatSeason(seasonString) {
    if (!seasonString) return 'N/A';
    const parts = seasonString.split('_');
    if (parts.length === 2) {
        const seasonName = { 'winter': 'Зима', 'spring': 'Весна', 'summer': 'Лето', 'fall': 'Осень' }[parts[0]];
        return `${seasonName || parts[0]} ${parts[1]}`;
    }
    return seasonString.replace('_',' ');
}

function setupPageNavigation() {
    const navLinks = document.querySelectorAll('.adh-page-navigation a');
    const sections = document.querySelectorAll('main.anime-details-page > section[id]');

    navLinks.forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            const targetId = this.getAttribute('href').substring(1);
            sections.forEach(section => {
                if (section.id === targetId) {
                    section.style.display = '';
                    // section.scrollIntoView({ behavior: 'smooth', block: 'start' }); // Плавный скролл может быть нежелателен при быстрой навигации
                } else {
                    if (section.id && document.querySelector(`.adh-page-navigation a[href="#${section.id}"]`)) {
                         section.style.display = 'none';
                    }
                }
            });
        });
    });
    const defaultActiveLink = document.querySelector('.adh-page-navigation a[href="#overview"]');
    if (defaultActiveLink) defaultActiveLink.click();
    else if (navLinks.length > 0) navLinks[0].click();
}

async function loadRelatedAnime(animeId, relatedData) {
    const container = document.getElementById('related-anime-grid');
    const section = document.getElementById('relations');
    if (!container || !section) return;
    if (!relatedData || relatedData.length === 0) { section.style.display = 'none'; return; }
    
    section.style.display = '';
    container.innerHTML = '<div class="df-loading-message">Загрузка связанных аниме...</div>';
    const relatedAnimeEntries = relatedData.filter(r => r.anime);
    if (relatedAnimeEntries.length === 0) { container.innerHTML = '<p>Нет информации о связанных аниме.</p>'; return; }
            
    try {
        const processedRelated = await Promise.all(relatedAnimeEntries.map(async (entry) => {
            if (!entry.anime) return null;
            const detailedRelAnime = await window.animeDataFetcher.getShikimoriAnimeDetails(entry.anime.id);
            if (!detailedRelAnime) return null;
            const kitsuPoster = await window.animeDataFetcher.getKitsuPoster(detailedRelAnime.name);
            const shikimoriPoster = detailedRelAnime.image?.original ? `https://shikimori.one${detailedRelAnime.image.original}` : null;
            return { ...detailedRelAnime, relation_type: entry.relation_russian || entry.relation, finalPoster: kitsuPoster || shikimoriPoster || 'https://via.placeholder.com/160x225?text=N/A' };
        }));
        
        const validProcessedRelated = processedRelated.filter(Boolean);
        if (validProcessedRelated.length > 0) {
            container.innerHTML = '';
            validProcessedRelated.forEach(anime => {
                const displayName = anime.russian || anime.name;
                const card = document.createElement('div');
                card.className = 'df-anime-card';
                const detailPageUrl = `anime.html?id=${anime.id}`;
                card.innerHTML = `
                    <a href="${detailPageUrl}">
                        <div class="df-anime-poster">
                            <img src="${anime.finalPoster}" alt="${displayName}" onerror="this.onerror=null;this.src='https://via.placeholder.com/160x225?text=Error';">
                            <div class="df-info-overlay">
                                <span class="df-kind">${formatKind(anime.kind)}</span>
                                ${anime.score ? `<span class="df-score"><i class="fas fa-star"></i>${anime.score}</span>` : ''}
                            </div>
                        </div>
                        <div class="df-anime-card-title" title="${displayName}">${displayName} (${anime.relation_type || 'Связь'})</div>
                    </a>`;
                container.appendChild(card);
            });
        } else { container.innerHTML = '<p>Связанные аниме не найдены.</p>'; }
    } catch (error) {
         console.error("Ошибка загрузки связанных аниме:", error);
         container.innerHTML = '<p>Не удалось загрузить связанные аниме.</p>';
    }
}

async function loadCharacters(animeId, characterRolesData) {
    const container = document.getElementById('characters-grid');
    const section = document.getElementById('characters');
    if (!container || !section) return;
    if (!characterRolesData || characterRolesData.length === 0) { section.style.display = 'none'; return; }
    
    section.style.display = '';
    container.innerHTML = '<div class="df-loading-message">Загрузка персонажей...</div>';
    const mainCharacters = characterRolesData.filter(role => role.roles && role.roles.includes('Main'));
    if (mainCharacters.length === 0) { container.innerHTML = '<p>Основные персонажи не найдены.</p>'; return; }

    container.innerHTML = '';
    mainCharacters.forEach(role => {
        if (!role.character) return;
        const char = role.character;
        const charCard = document.createElement('div');
        charCard.className = 'adh-character-card';
        charCard.innerHTML = `
            <a href="#" class="adh-character-link"> <!-- Можно добавить ссылку на страницу персонажа, если есть -->
                <img src="https://shikimori.one${char.image.original}" alt="${char.russian || char.name}"  onerror="this.onerror=null;this.src='https://via.placeholder.com/100x150?text=Error';">
                <div class="adh-character-name">${char.russian || char.name}</div>
            </a>
            <div class="adh-character-role">(${role.roles.filter(r => r !== 'Main').join(', ') || 'Главный'})</div>`;
        container.appendChild(charCard);
    });
    // TODO: Добавить стили для .adh-character-card, .adh-character-link, .adh-character-name, .adh-character-role в CSS
}
        
async function loadScreenshots(animeId, screenshotsData) {
    const container = document.getElementById('anime-screenshots-grid');
    const section = document.getElementById('screenshots');
    if (!container || !section) return;
    if (!screenshotsData || screenshotsData.length === 0) { section.style.display = 'none'; return; }
    
    section.style.display = '';
    container.innerHTML = '';
    screenshotsData.forEach(ss => {
        const img = document.createElement('img');
        img.src = `https://shikimori.one${ss.original}`;
        img.alt = `Кадр из аниме`;
        img.className = 'adh-screenshot-item';
        container.appendChild(img);
    });
     // TODO: Добавить стили для .adh-screenshot-item в CSS
}

console.log('animePage.js loaded'); 