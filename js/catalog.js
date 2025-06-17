document.addEventListener('DOMContentLoaded', () => {
    const API_BASE = '/.netlify/functions/anime';

    // Читаем ?genre=<id> из URL, если есть
    const urlParams = new URLSearchParams(window.location.search);
    const preselectedGenreId = urlParams.get('genre');

    // State
    let currentPage = 1;
    let isLoading = false;
    let currentFilters = {
        order: 'popularity',
        genres: [],
        age_ratings: [],
        types: [],
        statuses: [],
    };

    // DOM Elements
    const animeGrid = document.getElementById('anime-grid');
    const preloader = document.getElementById('preloader');
    const applyFiltersBtn = document.getElementById('apply-filters-btn');
    const resetFiltersBtn = document.getElementById('reset-filters-btn');
    const sortSelect = document.getElementById('sort-by');
    
    // Custom Select Logic
    document.querySelectorAll('.custom-select').forEach(setupCustomSelect);

    function setupCustomSelect(select) {
        const header = select.querySelector('.select-header');
        const dropdown = select.querySelector('.select-dropdown');

        const toggleDropdown = (shouldOpen) => {
            if (shouldOpen) {
                select.classList.add('open');
                // restart animation on every open
                dropdown.classList.remove('fade-slide-in');
                void dropdown.offsetWidth; // reflow
                dropdown.classList.add('fade-slide-in');
            } else {
                select.classList.remove('open');
                dropdown.classList.remove('fade-slide-in');
            }
        };

        header.addEventListener('click', (e) => {
            // Не закрывать дропдаун при клике на удаление тега
            if (e.target.classList.contains('remove')) {
                return;
            }
            const willOpen = !select.classList.contains('open');
            toggleDropdown(willOpen);
        });

        // Эта логика только для селекта сортировки
        if (select.id.includes('sort-by')) { 
            dropdown.querySelectorAll('.option').forEach(option => {
                option.addEventListener('click', () => {
                    const span = header.querySelector('span');
                    if (span) {
                       span.textContent = option.textContent;
                    }
                    select.dataset.value = option.dataset.value;
                    select.classList.remove('open');
                    applyFilters();
                });
            });
        }
    }
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        document.querySelectorAll('.custom-select').forEach(select => {
            if (!select.contains(e.target)) {
                // close dropdown and reset animation
                select.classList.remove('open');
                const dropdown = select.querySelector('.select-dropdown');
                if (dropdown) dropdown.classList.remove('fade-slide-in');
            }
        });
    });

    async function fetchAnime(filters, page = 1) {
        if (isLoading) return;
        isLoading = true;
        showLoader();
        try {
            const params = new URLSearchParams({
                action: 'get_list',
                limit: 28,
                page: page,
                order: filters.order,
            });

            if (filters.genres.length) params.set('genre', filters.genres.join(','));
            if (filters.statuses.length) params.set('status', filters.statuses.join(','));
            if (filters.types.length) params.set('kind', filters.types.join(','));
            if (filters.age_ratings.length) params.set('rating', filters.age_ratings.join(','));
            
            const response = await fetch(`${API_BASE}?${params.toString()}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            renderAnime(data, page); 

            if (data && data.length > 0) {
                currentPage++;
            }

        } catch (error) {
            console.error('Failed to fetch anime:', error);
            if (page === 1) {
                animeGrid.innerHTML = '<p class="error-message">Не удалось загрузить аниме. Попробуйте позже.</p>';
            }
        } finally {
            hideLoader();
            isLoading = false;
        }
    }

    function renderAnime(animeList, page) {
        if (page === 1) {
            animeGrid.innerHTML = ''; 
        }

        if ((!animeList || animeList.length === 0) && page === 1) {
            animeGrid.innerHTML = '<p>По вашему запросу ничего не найдено.</p>';
            return;
        }

        animeList.forEach(anime => {
            if (anime.rating === 'rx') return; // пропускаем хентай
            const card = createAnimeCard(anime);
            if(card) {
                animeGrid.appendChild(card);
            }
        });
    }

    function gatherFilters() {
        const newFilters = { ...currentFilters };

        // Gather genre values (from custom select)
        const genreSelect = document.getElementById('genres-filter');
        const checkedGenres = Array.from(genreSelect.querySelectorAll('.select-dropdown input:checked'));
        newFilters.genres = checkedGenres.map(cb => cb.value);

        // визуально обновляем чипы
        updateSelectedGenreTags(checkedGenres);

        // Собираем значения чекбоксов
        newFilters.types = getCheckedValues('type');
        newFilters.statuses = getCheckedValues('status');
        newFilters.age_ratings = getCheckedValues('age_rating');

        newFilters.order = sortSelect.dataset.value || 'popularity';

        return newFilters;
    }

    // Обновляем список выбранных жанров в header селекта
    function updateSelectedGenreTags(checkedInputs) {
        const genreSelect = document.getElementById('genres-filter');
        const tagsContainer = genreSelect.querySelector('.selected-tags');
        tagsContainer.innerHTML = '';

        if (!checkedInputs.length) {
            tagsContainer.innerHTML = '<span class="placeholder">Любые</span>';
            return;
        }

        checkedInputs.forEach(cb => {
            const labelText = cb.nextElementSibling.textContent.trim();
            const tag = document.createElement('span');
            tag.classList.add('tag');
            tag.textContent = labelText;

            const remove = document.createElement('span');
            remove.classList.add('remove');
            remove.textContent = '×';
            remove.addEventListener('click', (e) => {
                e.stopPropagation();
                cb.checked = false;
                // обновляем визуал и фильтры после снятия чекбокса
                updateSelectedGenreTags(Array.from(genreSelect.querySelectorAll('.select-dropdown input:checked')));
            });

            tag.appendChild(remove);
            tagsContainer.appendChild(tag);
        });
    }

    function getCheckedValues(name) {
        return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(cb => cb.value);
    }

    function applyFilters() {
        currentFilters = gatherFilters();
        currentPage = 1;
        animeGrid.innerHTML = ''; 
        fetchAnime(currentFilters, currentPage);
    }

    function resetFilters() {
        // Reset form elements
        document.querySelectorAll('#filters-sidebar input[type="text"], #filters-sidebar input[type="number"]').forEach(input => input.value = '');
        document.querySelectorAll('#filters-sidebar input[type="checkbox"]').forEach(cb => cb.checked = false);
        
        // Reset custom selects
        const genreSelect = document.getElementById('genres-filter');
        // У жанров нет span, там другая логика с тегами
        updateSelectedGenreTags([]);
        
        const sortSelectHeader = sortSelect.querySelector('.select-header span');
        if (sortSelectHeader) { // Проверяем, существует ли span
            sortSelectHeader.textContent = 'По популярности';
        }
        sortSelect.dataset.value = 'popularity';

        applyFilters();
    }
    
    async function loadGenres() {
        try {
            const response = await fetch(`${API_BASE}?action=get_genres`);
            let genres = await response.json();

            // Убираем непопулярные/второстепенные жанры (та же логика, что и на главной)
            const excludedNames = new Set([
                'Додзинси',
                'Shounen Ai','Shoujo Ai','Shounen-ai','Shoujo-ai',
                'Сёнен-ай','Сёдзё-ай',
                'Детское','Kids',
                'Машины','Cars',
                'Полиция','Police',
                'Работа','Work',
                'Самураи','Samurai',
                'Сёдзе','Сёдзё','Shoujo',
                'Смена пола','Gender Bender',
                'Эротика','Erotica',
                'Триллер','Thriller'
            ].map(s=>s.toLowerCase()));

            genres = genres.filter(g => {
                const nameRu = (g.russian || '').toLowerCase();
                const nameEn = (g.name || '').toLowerCase();
                return !excludedNames.has(nameRu) && !excludedNames.has(nameEn);
            });

            // Удаляем дубликаты по имени (берём с минимальным id)
            const byName = new Map();
            genres.forEach(g => {
                const key = (g.russian || g.name || '').trim().toLowerCase();
                if (!key) return;
                if (!byName.has(key) || g.id < byName.get(key).id) {
                    byName.set(key, g);
                }
            });
            genres = Array.from(byName.values());

            // Сортировка по русскому названию, fallback к латинице
            genres = genres.sort((a,b)=>{
                const aName = (a.russian || a.name || '').toLowerCase();
                const bName = (b.russian || b.name || '').toLowerCase();
                return aName.localeCompare(bName, 'ru');
            });

            const dropdown = document.querySelector('#genres-filter .select-dropdown');
            genres.forEach(genre => {
                const item = document.createElement('div');
                item.classList.add('checkbox-item');
                item.innerHTML = `
                    <input type="checkbox" id="genre-${genre.id}" name="genre" value="${genre.id}">
                    <label for="genre-${genre.id}">${genre.russian}</label>
                `;
                const inputEl = item.querySelector('input');

                // при изменении чекбокса обновляем теги
                inputEl.addEventListener('change', () => {
                    const checkedGenres = Array.from(dropdown.querySelectorAll('input:checked'));
                    updateSelectedGenreTags(checkedGenres);
                });

                // кликабельной делаем всю строку
                item.addEventListener('click', (e) => {
                    if (e.target.tagName !== 'INPUT') {
                        inputEl.checked = !inputEl.checked;
                        inputEl.dispatchEvent(new Event('change'));
                    }
                });
                dropdown.appendChild(item);

                // авто-выбор, если жанр пришёл в URL
                if (preselectedGenreId && String(genre.id) === preselectedGenreId) {
                    inputEl.checked = true;
                }
            });
        } catch (error) {
            console.error('Failed to load genres:', error);
        }
    }

    // Initial Load
    applyFiltersBtn.addEventListener('click', applyFilters);
    resetFiltersBtn.addEventListener('click', resetFilters);
    
    // Кнопка очистки всех жанров
    const clearTagsBtn = document.querySelector('#genres-filter .clear-tags');
    clearTagsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const dropdown = document.querySelector('#genres-filter .select-dropdown');
        dropdown.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        updateSelectedGenreTags([]);
    });
    
    // --- ЛОГИКА БЕСКОНЕЧНОЙ ПРОКРУТКИ ---
    function handleScroll() {
        if (!isLoading && (window.innerHeight + window.scrollY) >= document.body.offsetHeight - 600) {
            fetchAnime(currentFilters, currentPage);
        }
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Utility Functions (should be in utils.js, but here for simplicity)
    const showLoader = () => {};
    const hideLoader = () => {};

    function debounce(fn, delay) {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => fn(...args), delay);
        };
    }
    
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
            .replace(/[^a-z0-9\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');
    };

    function createAnimeCard(anime) {
        const displayTitle = anime.russian || anime.name || 'Без названия';
        const titleForSlug = anime.name || anime.russian || 'no-title';
        const animeId = anime.id;
        if (!animeId) return null;
        
        const card = document.createElement('a');
        // Формируем slug, как на главной странице, для ЧПУ-ссылки
        const slug = createSlug(titleForSlug);
        card.href = `/anime/${animeId}-${slug}`;
        card.className = 'anime-card';
        card.dataset.animeId = animeId;

        const isOngoing = anime.status === 'ongoing';
        let statusText = '';
        if (isOngoing) statusText = 'Онгоинг';
        else if (anime.status === 'released') statusText = 'Вышло';
        else if (anime.status === 'anons') statusText = 'Анонс';

        const infoParts = [];
        if (anime.kind !== 'movie') {
            const episodesCount = isOngoing ? anime.episodesAired : anime.episodes;
            infoParts.push(`<span class="info-item">${episodesCount || '?'} эп.</span>`);
        }
        if (statusText) {
            const statusClass = anime.status === 'anons' ? 'anons' : (isOngoing ? 'ongoing' : '');
            infoParts.push(`<span class="info-item ${statusClass}">${statusText}</span>`);
        }
        if (anime.airedOn?.year) infoParts.push(`<span class="info-item">${anime.airedOn.year}</span>`);

        const infoHtml = infoParts.join('');

        card.innerHTML = `
            <div class="card-poster-wrapper">
                <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="${displayTitle}" class="card-poster" loading="lazy">
                <div class="card-overlay">
                    <div class="card-info">${infoHtml}</div>
                </div>
            </div>
            <div class="card-title">${displayTitle}</div>
        `;
        loadPosterForCard(card, anime);

        return card;
    }

    async function loadPosterForCard(animeCard, anime) {
        // Используем только Shikimori
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

        // Только Shikimori
        imgElement.src = shikimoriPosterUrl;
    }

    loadGenres().then(() => {
        if (preselectedGenreId) {
            // Обновляем теги и применяем фильтр сразу
            const dropdown = document.querySelector('#genres-filter .select-dropdown');
            const checked = Array.from(dropdown.querySelectorAll('input:checked'));
            updateSelectedGenreTags(checked);
            applyFilters();
        } else {
            fetchAnime(currentFilters, currentPage);
        }
    });
});