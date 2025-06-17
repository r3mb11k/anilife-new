// plan-modal.js
// Модальное окно «Добавить в список» для страницы деталей аниме
// Требует, чтобы на странице присутствовала кнопка .add-to-plan-btn
// и глобально был доступен window.supabaseClient (подгружается auth.js).

(function () {
  const STATUS_MAP = {
    watching: 'Смотрю',
    planned: 'Запланировано',
    dropped: 'Брошено',
    completed: 'Просмотрено',
    favorite: 'Любимое'
  };
  const STATUS_KEYS = Object.keys(STATUS_MAP);

  const btn = document.querySelector('.add-to-plan-btn');
  if (!btn) return;

  const defaultBtnHTML = btn.innerHTML; // сохранено, чтобы можно было вернуть

  // ---------- create dropdown menu ----------
  const menu = document.createElement('div');
  menu.className = 'plan-menu hidden fade-slide-in';
  const ul = document.createElement('ul');
  ul.className = 'plan-list-options';
  menu.appendChild(ul);
  document.body.appendChild(menu);

  STATUS_KEYS.forEach(key => {
    const li = document.createElement('li');
    li.className = 'plan-option-item';
    li.dataset.status = key;
    li.textContent = STATUS_MAP[key];
    ul.appendChild(li);
  });

  // --- пункт «Удалить из списка» ---
  const liRemove = document.createElement('li');
  liRemove.className = 'plan-option-item remove-item';
  liRemove.dataset.action = 'delete';
  liRemove.textContent = 'Удалить из списка';
  ul.appendChild(liRemove);

  // ---------- helpers ----------
  let outsideClickListener;
  const positionMenu = () => {
    if (menu.classList.contains('hidden')) return;
    const rect = btn.getBoundingClientRect();
    menu.style.top = `${rect.bottom + 8}px`;
    menu.style.left = `${rect.left}px`;
    menu.style.width = `${rect.width}px`;
  };

  const showMenu = () => {
    menu.classList.remove('hidden');
    positionMenu();
    // restart animation
    menu.classList.remove('fade-slide-in');
    void menu.offsetWidth;
    menu.classList.add('fade-slide-in');

    // Add listener to close on outside click (like header-menu)
    outsideClickListener = (event) => {
      if (!menu.contains(event.target) && !btn.contains(event.target)) {
        hideMenu();
      }
    };
    setTimeout(() => document.addEventListener('click', outsideClickListener), 0);
  };

  const hideMenu = () => {
    if (menu.classList.contains('hidden')) return;
    menu.classList.add('hidden');
    if (outsideClickListener) {
      document.removeEventListener('click', outsideClickListener);
      outsideClickListener = null;
    }
  };

  // Esc key close (kept global)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideMenu();
  });

  // Keep menu attached to button on scroll/resize
  window.addEventListener('scroll', positionMenu, true);
  window.addEventListener('resize', positionMenu);

  // Wait for supabase
  async function getSupa() {
    if (window.supabaseClient) return window.supabaseClient;
    // fallback – create client directly (rare)
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
    const cfg = await fetch('https://anilife-fun.netlify.app/.netlify/functions/supabase_config').then(r => r.json());
    return createClient(cfg.url, cfg.anon);
  }

  // Fetch current status for this anime & user
  async function refreshButtonLabel() {
    const supa = await getSupa();
    const { data: { session } } = await supa.auth.getSession();
    if (!session?.user || !window.currentAnimeId) return;
    const { data, error } = await supa
      .from('anime_lists')
      .select('status')
      .eq('anime_id', window.currentAnimeId)
      .single();
    if (error || !data) {
      btn.innerHTML = defaultBtnHTML;
      return;
    }
    if (data && STATUS_MAP[data.status]) {
      btn.innerHTML = STATUS_MAP[data.status];
    }
  }

  // initial label check
  setTimeout(refreshButtonLabel, 600);

  // btn click toggles menu
  btn.addEventListener('click', async () => {
    const supa = await getSupa();
    const { data: { session } } = await supa.auth.getSession();
    if (!session?.user) {
      alert('Войдите, чтобы добавлять аниме в списки.');
      return;
    }
    if (menu.classList.contains('hidden')) showMenu();
    else hideMenu();
  });

  // Handle option click
  ul.addEventListener('click', async (e) => {
    const item = e.target.closest('.plan-option-item');
    if (!item) return;
    const isDelete = item.dataset.action === 'delete';
    const status = item.dataset.status;
    const supa = await getSupa();
    const { data: { session } } = await supa.auth.getSession();
    if (!window.currentAnimeId || !session?.user) return;

    if (isDelete) {
      const { error } = await supa
        .from('anime_lists')
        .delete()
        .eq('user_id', session.user.id)
        .eq('anime_id', window.currentAnimeId);
      if (error) {
        console.error('Failed to delete list item', error);
        alert('Не удалось удалить :(');
        return;
      }
      btn.innerHTML = defaultBtnHTML;
    } else {
      const payload = { user_id: session.user.id, anime_id: window.currentAnimeId, status };
      const { error } = await supa
        .from('anime_lists')
        .upsert(payload, { onConflict: 'user_id,anime_id' });
      if (error) {
        console.error('Failed to save list status', error);
        alert('Ошибка сохранения :(');
        return;
      }
      btn.innerHTML = STATUS_MAP[status];
    }

    hideMenu();
  });
})(); 