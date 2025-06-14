document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('anime-grid');
    const preloader = document.getElementById('preloader');
    let currentPage = 1;
    let isLoading = false; // Флаг для предотвращения одновременной загрузки нескольких страниц

    // Функция для создания карточки аниме
    function createAnimeCard(anime) {
        const titleForSlug = anime.name || anime.russian || 'no-title';
        const displayTitle = anime.russian || anime.name || 'Без названия';
        const animeId = anime.id;
        if (!animeId) return null;

        const slug = titleForSlug.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-');
        
        const card = document.createElement('a');
        card.href = `/anime/${animeId}-${slug}`;
        card.className = 'anime-card'; // Используем тот же класс, что и на главной
        card.dataset.animeId = animeId;

        const isOngoing = anime.status === 'ongoing';
        let statusText = '';
        if (isOngoing) statusText = 'Онгоинг';
        else if (anime.status === 'released') statusText = 'Вышло';
        else if (anime.status === 'anons') statusText = 'Анонс';

        const infoParts = [];
        if (anime.kind !== 'movie') {
            const episodesCount = isOngoing ? anime.episodesAired : anime.episodes;
            infoParts.push(`${episodesCount || '?'} эп.`);
        }
        if (statusText) {
            infoParts.push(statusText);
        }
        if (anime.airedOn?.year) {
            infoParts.push(anime.airedOn.year);
        }

        const infoHtml = infoParts.map(part => `<span class="info-item">${part}</span>`).join('');

        card.innerHTML = `
            <div class="card-poster-wrapper">
                <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="${displayTitle}" class="card-poster" loading="lazy">
                <div class="card-overlay">
                    <div class="card-info">${infoHtml}</div>
                </div>
            </div>
            <div class="card-title">${displayTitle}</div>
        `;

        // Асинхронная загрузка постера
        loadPosterForCard(card.querySelector('.card-poster'), anime);

        return card;
    }

    // Асинхронная загрузка постера для одной карточки
    async function loadPosterForCard(imgElement, anime) {
        try {
            const kitsuPosterUrl = await fetchKitsuPoster(anime);
            if (kitsuPosterUrl) {
                imgElement.src = kitsuPosterUrl;
            } else {
                const shikimoriPoster = anime.poster?.mainUrl ? `https://shikimori.one${anime.poster.mainUrl}` : null;
                imgElement.src = shikimoriPoster || 'https://shikimori.one/assets/globals/missing_original.jpg';
            }
        } catch (error) {
            console.error(`Failed to load poster for ${anime.name}`, error);
            const shikimoriPoster = anime.poster?.mainUrl ? `https://shikimori.one${anime.poster.mainUrl}` : null;
            imgElement.src = shikimoriPoster || 'https://shikimori.one/assets/globals/missing_original.jpg'; // Заглушка при ошибке
        }
    }

    // Функция загрузки аниме
    async function loadAnime(page) {
        if (isLoading) return;
        isLoading = true;
        preloader.style.display = 'flex';

        try {
            const animeList = await fetchFromApi('catalog', { page: page, limit: 48 });
            if (animeList && animeList.length > 0) {
                animeList.forEach(anime => {
                    const card = createAnimeCard(anime);
                    if (card) grid.appendChild(card);
                });
                currentPage++;
            } else {
                // Если данных больше нет, можно остановить дальнейшие запросы
                window.removeEventListener('scroll', handleScroll);
                console.log('Все аниме загружены.');
            }
        } catch (error) {
            console.error('Ошибка загрузки каталога:', error);
            // Можно показать сообщение об ошибке
        } finally {
            isLoading = false;
            preloader.style.display = 'none';
        }
    }

    // Обработчик скролла для "бесконечной" прокрутки
    function handleScroll() {
        // Загружаем следующую страницу, когда пользователь почти доскроллил до конца
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
            loadAnime(currentPage);
        }
    }

    // Первоначальная загрузка
    loadAnime(currentPage);

    // Вешаем обработчик скролла
    window.addEventListener('scroll', handleScroll);
});

// We need a function to populate the grid, similar to script.js but adapted for the catalog
async function populateGrid(animeList, grid) {
    grid.innerHTML = ''; // Clear previous results or preloader

    const createSlug = (text) => {
        if (!text) return '';
        const translitMap = {
            'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'zh',
            'з':'z','и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o',
            'п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'kh','ц':'ts',
            'ч':'ch','ш':'sh','щ':'shch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya'
        };
        let slug = text.toLowerCase();
        let transliteratedSlug = '';
        for (let i = 0; i < slug.length; i++) {
            transliteratedSlug += translitMap[slug[i]] || slug[i];
        }
        return transliteratedSlug
            .replace(/[^a-z0-9\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');
    };

    animeList.forEach(anime => {
        const titleForSlug = anime.name || anime.russian || 'no-title';
        const displayTitle = anime.russian || anime.name || 'Без названия';
        const animeId = anime.id;

        let posterUrl = 'https://shikimori.one/assets/globals/missing_original.jpg';
        if (anime.poster) {
            const rawPosterUrl = anime.poster.mainUrl || anime.poster.originalUrl;
            posterUrl = rawPosterUrl.startsWith('http') 
                ? rawPosterUrl 
                : `https://shikimori.one${rawPosterUrl}`;
        }
        
        if (!animeId) return;

        const slug = createSlug(titleForSlug);
        const animeCard = document.createElement('a');
        animeCard.href = `/anime/${animeId}-${slug}`;
        animeCard.className = 'anime-card';
        
    });
}