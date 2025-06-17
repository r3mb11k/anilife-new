// new file
// Global search modal code for AniLIFE
// Adds live search to header <input id="searchInput"> with results modal.

(function () {
  const MIN_QUERY_LENGTH = 2;
  const DEBOUNCE_DELAY = 350;

  // Create overlay + content elements once
  const overlay = document.createElement('div');
  overlay.id = 'search-modal-overlay';
  overlay.className = 'search-modal-overlay hidden';
  overlay.innerHTML = `
    <div class="search-modal-content fade-slide-in" id="search-modal-content">
      <div class="search-results" id="search-results"></div>
    </div>
  `;
  document.body.appendChild(overlay);
  const contentBox = overlay.querySelector('#search-modal-content');

  const resultsContainer = overlay.querySelector('#search-results');

  // Close helpers
  const closeModal = () => {
    overlay.classList.add('hidden');
    // reset for next open
    overlay.querySelector('#search-modal-content').classList.remove('fade-slide-in');
  };
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // Debounce util
  function debounce(fn, delay) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), delay);
    };
  }

  async function performSearch(query) {
    query = query.trim();
    if (query.length < MIN_QUERY_LENGTH) {
      closeModal();
      return;
    }

    // show overlay immediately
    overlay.classList.remove('hidden');
    // position dropdown under entire search bar container for consistent width
    const bar = searchInput.parentElement || searchInput;
    const rect = bar.getBoundingClientRect();
    contentBox.style.top = `${rect.bottom + 12}px`;
    contentBox.style.left = `${rect.left}px`;
    contentBox.style.width = `${rect.width}px`;

    // restart animation
    contentBox.classList.remove('fade-slide-in');
    void contentBox.offsetWidth;
    contentBox.classList.add('fade-slide-in');

    // loader indicator
    resultsContainer.innerHTML = '<div class="search-loading">Ищем...</div>';

    const data = await fetchFromApi('search', { query });

    if (!Array.isArray(data) || data.length === 0) {
      resultsContainer.innerHTML = '<div class="search-empty">Ничего не найдено</div>';
      return;
    }

    const allowedKinds = new Set(['tv','movie','ova','ona']);
    const forbiddenGenres = new Set(['yaoi','юри','yuri','яой','hentai','хентай']);
    resultsContainer.innerHTML = '';
    data.filter(a => allowedKinds.has(a.kind)).forEach(anime => {
      if (anime.rating === 'rx') return;
      // filter by genres
      if (Array.isArray(anime.genres)) {
        const hasForbidden = anime.genres.some(g => forbiddenGenres.has((g.russian || g.name || '').toLowerCase()));
        if (hasForbidden) return;
      }
      const item = document.createElement('a');
      item.className = 'search-result-item';
      const displayTitle = anime.russian || anime.name || 'Без названия';
      const titleSlug = (anime.name || anime.russian || '').toLowerCase().replace(/\s+/g, '-');
      item.href = `/anime/${anime.id}-${titleSlug}`;

      const posterBase = 'https://shikimori.one';
      let posterUrl = `${posterBase}/assets/globals/missing_original.jpg`;
      if (anime.poster?.mainUrl) {
        posterUrl = anime.poster.mainUrl.startsWith('http') ? anime.poster.mainUrl : posterBase + anime.poster.mainUrl;
      }

      // status color
      let statusClass = '';
      if (anime.status === 'anons') statusClass = 'anons';
      else if (anime.status === 'ongoing') statusClass = 'ongoing';

      const episodesCount = anime.kind === 'movie' ? null : (anime.episodes || '?');
      const episodesText = anime.kind === 'movie' ? 'Фильм' : `${episodesCount} эпизодов`;
      const year = anime.airedOn?.year || '';
      const rating = anime.score ? anime.score.toFixed(1) : '—';

      item.innerHTML = `
        <img src="${posterUrl}" alt="${displayTitle}" class="result-poster" loading="lazy">
        <div class="result-info">
          <div class="result-title">${displayTitle}</div>
          <div class="result-meta episodes-line">${episodesText}</div>
          <div class="result-meta details-line">
            <span class="rating">★ ${rating}</span>
            ${year ? '<span class="dot">•</span>' + year : ''}
            <span class="dot">•</span>
            <span class="status ${statusClass}">${anime.status === 'anons' ? 'Анонс' : (anime.status === 'ongoing' ? 'Онгоинг' : 'Вышло')}</span>
          </div>
        </div>
      `;
      resultsContainer.appendChild(item);
    });
  }

  const searchInput = document.getElementById('searchInput');
  if (!searchInput) return;

  // On window resize/scroll adjust position if dropdown visible
  const reposition = () => {
    if (overlay.classList.contains('hidden')) return;
    const bar = searchInput.parentElement || searchInput;
    const rect = bar.getBoundingClientRect();
    contentBox.style.top = `${rect.bottom + 12}px`;
    contentBox.style.left = `${rect.left}px`;
    contentBox.style.width = `${rect.width}px`;
  };
  window.addEventListener('resize', reposition);
  window.addEventListener('scroll', reposition, { passive: true });

  // close when clicking outside modal
  document.addEventListener('click', (e) => {
    if (overlay.classList.contains('hidden')) return;
    if (!contentBox.contains(e.target) && e.target !== searchInput) {
      closeModal();
    }
  });

  const debouncedSearch = debounce(performSearch, DEBOUNCE_DELAY);
  searchInput.addEventListener('input', (e) => {
    debouncedSearch(e.target.value);
  });
})(); 