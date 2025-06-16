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
      <li><a href="/login.html"><span class="menu-icon">↪</span><span class="menu-label">Войти</span></a></li>
      <li><a href="/settings.html"><span class="menu-icon">⚙</span><span class="menu-label">Настройки</span></a></li>
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
}); 