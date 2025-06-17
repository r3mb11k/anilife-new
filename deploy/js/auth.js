// simple auth helper to keep header in sync with Supabase session
import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm').then(async ({ createClient }) => {
  const cfgResp = await fetch('/.netlify/functions/supabase_config');
  if (!cfgResp.ok) return console.error('Supabase config missing');
  const { url, anon } = await cfgResp.json();
  const supa = createClient(url, anon);
  window.supabaseClient = supa;

  const profileBtn = document.getElementById('profileButton');
  const buildMenuForAuth = (user) => {
    const menu = document.querySelector('.profile-menu');
    if (!menu) return;
    const versionBlock = `<div class="menu-version">v1.0.0</div>`;
    if (user) {
      let profileId = window.__numericProfileId;
      if (!profileId) {
        // async fetch numeric id using existing supabase client
        (async () => {
          try {
            const { data, error } = await supa.from('profiles').select('id').eq('user_id', user.id).single();
            if (!error && data) {
              window.__numericProfileId = data.id;
              // update existing link without rebuilding whole menu
              const linkEl = document.getElementById('profileNav');
              if (linkEl) linkEl.href = `/user/${data.id}`;
            }
          } catch (err) {
            console.error('Failed to fetch numeric profile id:', err);
          }
        })();
      }
      profileId = profileId || null; // if null we link to classic profile page
      const profileLink = profileId ? `/user/${profileId}` : '/profile.html';
      menu.innerHTML = `
        <ul class="profile-menu-list">
          <li><a href="${profileLink}" class="menu-link" id="profileNav"><span class="menu-icon"><img src="/images/user.png" alt="User" class="menu-icon-img"></span><span class="menu-label">Профиль</span></a></li>
          <li class="menu-divider"></li>
          <li><a href="#" id="settingsLink" class="menu-link"><span class="menu-icon"><img src="/images/settings.png" alt="Settings" class="menu-icon-img"></span><span class="menu-label">Настройки</span></a></li>
          <li><button id="logoutBtn" class="menu-item-btn logout-btn"><span class="menu-icon"><img src="/images/logout.png" alt="Logout" class="menu-icon-img"></span><span class="menu-label">Выйти</span></button></li>
        </ul>` + versionBlock;
      menu.style.width = '200px';
    } else {
      menu.innerHTML = `
        <ul class="profile-menu-list">
          <li><a href="#" id="loginLink" class="menu-link"><span class="menu-icon"><img src="/images/logout.png" alt="Login" class="menu-icon-img"></span><span class="menu-label">Войти</span></a></li>
        </ul>` + versionBlock;
      menu.style.width = '180px';
    }
  };

  const { data: { session } } = await supa.auth.getSession();
  buildMenuForAuth(session?.user);
  ensureProfileRow(session?.user);

  supa.auth.onAuthStateChange((_event, sess) => {
    buildMenuForAuth(sess?.user);
    ensureProfileRow(sess?.user);
  });

  document.body.addEventListener('click', async (e) => {
    const logoutEl = e.target.closest('#logoutBtn');
    if (logoutEl) {
      await supa.auth.signOut();
    }
  });

  // ensure profile row exists and link updated
  async function ensureProfileRow(user) {
    if (!user) return;
    if (window.__numericProfileId) return;
    try {
      // try fetch
      const { data, error } = await supa.from('profiles').select('id').eq('user_id', user.id).single();
      if (data && !error) {
        window.__numericProfileId = data.id;
        const link = document.getElementById('profileNav');
        if (link) link.href = `/user/${data.id}`;
        return;
      }
    } catch (e) { /* ignore */ }

    // if not exists → create
    const nickname = (user.email || 'user').split('@')[0];
    const { data: inserted } = await supa.from('profiles')
      .insert({ user_id: user.id, nickname })
      .select('id')
      .single();
    if (inserted?.id) {
      window.__numericProfileId = inserted.id;
      const link = document.getElementById('profileNav');
      if (link) link.href = `/user/${inserted.id}`;
    }
  }
}); 