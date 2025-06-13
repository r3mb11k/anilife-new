document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('anime-grid');
    const paginationContainer = document.getElementById('pagination-container');
    const preloader = document.getElementById('preloader');

    let currentPage = 1;
    let currentFilters = {}; // Placeholder for filter logic

    async function loadCatalog(page = 1, filters = {}) {
        showPreloader();
        try {
            const params = {
                action: 'get_catalog', // New API action
                page,
                limit: 24, // A good number for a grid view
                ...filters
            };
            const animeList = await fetchFromApi(params.action, params);
            
            if (!animeList || animeList.length === 0) {
                grid.innerHTML = '<p>Ничего не найдено.</p>';
                updatePagination(false); // Hide pagination if no results
                return;
            }

            await populateGrid(animeList, grid);
            updatePagination(animeList.length === params.limit);

        } catch (error) {
            console.error('Ошибка загрузки каталога:', error);
            grid.innerHTML = `<p class="error-message">Не удалось загрузить каталог. ${error.message}</p>`;
        } finally {
            hidePreloader();
        }
    }
    
    function showPreloader() {
        preloader.style.display = 'flex';
        grid.style.display = 'none';
        paginationContainer.style.display = 'none';
    }

    function hidePreloader() {
        preloader.style.display = 'none';
        grid.style.display = 'grid'; // Use grid for catalog layout
        paginationContainer.style.display = 'flex';
    }

    function updatePagination(hasNextPage) {
        paginationContainer.innerHTML = '';
        
        const prevButton = document.createElement('button');
        prevButton.textContent = 'Назад';
        prevButton.disabled = currentPage === 1;
        prevButton.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                loadCatalog(currentPage, currentFilters);
            }
        });

        const pageDisplay = document.createElement('span');
        pageDisplay.textContent = `Страница ${currentPage}`;
        pageDisplay.style.margin = '0 1rem';

        const nextButton = document.createElement('button');
        nextButton.textContent = 'Вперед';
        nextButton.disabled = !hasNextPage;
        nextButton.addEventListener('click', () => {
            currentPage++;
            loadCatalog(currentPage, currentFilters);
        });

        paginationContainer.appendChild(prevButton);
        paginationContainer.appendChild(pageDisplay);
        paginationContainer.appendChild(nextButton);
    }
    
    // Initial load
    loadCatalog(currentPage, currentFilters);
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
        
        animeCard.innerHTML = `
            <div class="card-poster-wrapper">
                <img src="${posterUrl}" alt="${displayTitle}" class="card-poster" loading="lazy" onerror="this.onerror=null;this.src='https://shikimori.one/assets/globals/missing_original.jpg';">
                <div class="card-overlay">
                    <div class="card-info">
                        <span class="info-item">${anime.kind?.toUpperCase() || ''}</span>
                        <span class="info-item">${anime.status?.replace('released', 'FINISHED').toUpperCase() || ''}</span>
                        <span class="info-item">EP ${anime.episodes || '?'}</span>
                    </div>
                </div>
            </div>
            <div class="card-title">${displayTitle}</div>
        `;
        grid.appendChild(animeCard);
    });
} 