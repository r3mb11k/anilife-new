// new file
// Header profile dropdown menu
// Creates a minimal dropdown (Login, Settings) attached to #profileButton.
// Closes when clicking outside or on scroll.

document.addEventListener('DOMContentLoaded', () => {
  const profileBtn = document.getElementById('profileButton');
  if (!profileBtn) return;

  // Create menu element
  const menu = document.createElement('div');
  menu.className = 'profile-menu hidden';
  menu.innerHTML = `
    <ul class="profile-menu-list">
      <li><a href="#" id="loginLink" class="menu-link"><span class="menu-icon"><img src="/images/logout.png" alt="Login" class="menu-icon-img"></span><span class="menu-label">Войти</span></a></li>
    </ul>
  `;
  document.body.appendChild(menu);

  const showMenu = () => {
    // Position menu under button
    const rect = profileBtn.getBoundingClientRect();
    menu.style.top = `${rect.bottom + 12}px`;
    menu.style.right = `${window.innerWidth - rect.right - 16}px`;
    // make visible first
    menu.classList.remove('hidden');
    // reset animation so it can replay
    menu.classList.remove('fade-slide-in');
    void menu.offsetWidth; // reflow
    menu.classList.add('fade-slide-in');
  };

  const hideMenu = () => {
    menu.classList.add('hidden');
    menu.classList.remove('fade-slide-in');
  };

  profileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (menu.classList.contains('hidden')) {
      showMenu();
    } else {
      hideMenu();
    }
  });

  // Outside click closes
  document.addEventListener('click', hideMenu);

  // Reposition menu while scrolling or resizing so it sticks near the button
  const repositionMenu = () => {
    if (menu.classList.contains('hidden')) return;
    const rect = profileBtn.getBoundingClientRect();
    menu.style.top = `${rect.bottom + 12}px`;
    menu.style.right = `${window.innerWidth - rect.right - 16}px`;
  };
  window.addEventListener('scroll', repositionMenu, { passive: true });
  window.addEventListener('resize', repositionMenu);

  // ---------------------- LOGIN MODAL SECTION ----------------------
  // Supabase lazy init (one time for whole site)
  let supabase = null;
  async function getSupabase() {
    if (supabase) return supabase;
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');

    let url = window.SUPABASE_URL;
    let anon = window.SUPABASE_ANON_KEY;
    if (!url || !anon) {
      try {
        const resp = await fetch('/.netlify/functions/supabase_config');
        if (resp.ok) {
          const json = await resp.json();
          url = json.url;
          anon = json.anon;
          window.SUPABASE_URL = url; // cache
          window.SUPABASE_ANON_KEY = anon;
        } else {
          console.error('Failed to load Supabase config');
        }
      } catch (e) { console.error(e); }
    }
    if (!url || !anon) throw new Error('Supabase env vars are missing');
    supabase = createClient(url, anon);
    return supabase;
  }

  const createLoginModal = (() => {
    let created = false;
    return () => {
      if (created) return;
      created = true;
      const overlay = document.createElement('div');
      overlay.id = 'login-modal-overlay';
      overlay.className = 'login-modal-overlay hidden';
      overlay.innerHTML = `
        <div class="login-modal-content fade-slide-in" id="login-modal-content">
          <button class="modal-close-btn" id="login-modal-close">✕</button>
          <div class="auth-tabs">
            <button class="auth-tab active" data-tab="login">Вход</button>
            <button class="auth-tab" data-tab="signup">Регистрация</button>
          </div>
          <div class="auth-tab-content" data-tab="login">
            <form class="auth-form" id="login-form" autocomplete="on">
              <label for="login-email">E-mail</label>
              <input type="email" id="login-email" placeholder="you@example.com" required>
              <label for="login-password">Пароль</label>
              <input type="password" id="login-password" placeholder="••••••••" required>
              <button type="submit" class="login-submit-btn">Войти</button>
              <p class="auth-error" id="login-error"></p>
            </form>
          </div>
          <div class="auth-tab-content hidden" data-tab="signup">
            <form class="auth-form" id="signup-form" autocomplete="on">
              <label for="signup-email">E-mail</label>
              <input type="email" id="signup-email" placeholder="you@example.com" required>
              <label for="signup-password">Пароль</label>
              <input type="password" id="signup-password" placeholder="минимум 6 символов" required>
              <button type="submit" class="login-submit-btn">Создать аккаунт</button>
              <p class="auth-error" id="signup-error"></p>
            </form>
          </div>
        </div>`;
      document.body.appendChild(overlay);

      const contentBox = overlay.querySelector('#login-modal-content');
      const close = () => {
        overlay.classList.add('hidden');
        contentBox.classList.remove('fade-slide-in');
      };
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') close();
      });
      overlay.querySelector('#login-modal-close').addEventListener('click', close);

      // Tab switching
      const tabs = overlay.querySelectorAll('.auth-tab');
      const tabContents = overlay.querySelectorAll('.auth-tab-content');
      tabs.forEach(btn => {
        btn.addEventListener('click', () => {
          tabs.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const wanted = btn.dataset.tab;
          tabContents.forEach(tc => {
            if (tc.dataset.tab === wanted) tc.classList.remove('hidden');
            else tc.classList.add('hidden');
          });
        });
      });

      // --- FORM HANDLERS ---
      overlay.querySelector('#login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        const errBox = document.getElementById('login-error');
        errBox.textContent = '';
        const btn = e.target.querySelector('button');
        btn.disabled = true;
        const supa = await getSupabase();
        const { error } = await supa.auth.signInWithPassword({ email, password });
        btn.disabled = false;
        if (error) {
          errBox.textContent = error.message;
        } else {
          close();
          // Optionally refresh UI or navigate
          location.reload();
        }
      });

      overlay.querySelector('#signup-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value;
        const errBox = document.getElementById('signup-error');
        errBox.textContent = '';
        const btn = e.target.querySelector('button');
        btn.disabled = true;
        const supa = await getSupabase();
        const { error } = await supa.auth.signUp({ email, password });
        btn.disabled = false;
        if (error) {
          errBox.textContent = error.message;
        } else {
          errBox.style.color = '#4ADE80';
          errBox.textContent = 'Письмо с подтверждением отправлено';
        }
      });
    };
  })();

  const openLoginModal = () => {
    createLoginModal();
    const overlay = document.getElementById('login-modal-overlay');
    const contentBox = document.getElementById('login-modal-content');
    if (!overlay || !contentBox) return;
    overlay.classList.remove('hidden');
    // restart animation
    contentBox.classList.remove('fade-slide-in');
    void contentBox.offsetWidth;
    contentBox.classList.add('fade-slide-in');
  };

  // Attach click listener to login menu item (delegated after creation)
  menu.addEventListener('click', (e) => {
    const target = e.target.closest('#loginLink');
    if (target) {
      e.preventDefault();
      hideMenu();
      openLoginModal();
    }
  });

  // ensure auth helper loaded (adds buildMenuForAuth etc.)
  if (!window.__authHelperLoaded) {
    import('/js/auth.js').catch(console.error);
    window.__authHelperLoaded = true;
  }
}); 