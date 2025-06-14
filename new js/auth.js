function getCodeFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    console.log(urlParams)
    return urlParams.get('RC');
}
document.addEventListener('DOMContentLoaded', function() {
    const userActions = document.getElementById('userActions');
    
    console.log("1")
    const code = getCodeFromUrl();
    console.log("2")
    console.log(code)
    console.log("3")
    if (code) {
        console.log("4")
        localStorage.setItem('registrationCode', code);
        console.log("5")
        console.log(localStorage.getItem('registrationCode'))
        console.log("6")
    }
    console.log("7")

    function updateUserInterface() {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user') || '{}');

        if (token && user) {
            // Если пользователь авторизован
            userActions.innerHTML = `
                <div class="user-menu">
                    <a class="profile-menu" href ="/profile/profile.html">
                        <img src="${user.avatar}" alt="Аватар пользователя" width="37" height="37" style="border-radius: 50%;">
                        <span class="username">${user.username}</span>
                    </a>
                    <button onclick="logout()" class="logout-btn">Выйти</button>
                </div>
            `;
        } else {
            // Если пользователь не авторизован
            userActions.innerHTML = `
                <div class="user-actions">
                    <a href="/login/login.html" class="login-btn">Войти</a>
                    <a href="/login/register.html" class="register-btn">Регистрация</a>
                </div>
            `;
        }
    }

    // Функция выхода
    window.logout = async function() {
        try {
            const token = localStorage.getItem('token');
            console.log(token);
            const response = await fetch('https://aniscope.ru/auth/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                // Успешный выход
                localStorage.removeItem('token'); // Удаляем токен
                localStorage.removeItem('user'); // Удаляем информацию о пользователе
                window.location.href = '/login/login.html'; // Перенаправляем на страницу входа
            } else {
                localStorage.removeItem('token'); // Удаляем токен
                localStorage.removeItem('user'); // Удаляем информацию о пользователе
                window.location.href = '/login/login.html'; // Перенаправляем на страницу входа
            }
        } catch (error) {
            console.error('Ошибка при выходе:', error);
        }
    }

    // Обновляем интерфейс при загрузке страницы
    updateUserInterface();
});

function updateLogo() {
    const logo = document.querySelector('.logo a img');
    if (window.innerWidth > 500) {
      logo.src = "/images/logo1.png";
      logo.width = "150";
    } else {
      logo.src = "/images/favicon.png";
      logo.width = "50";
    }
  }
  
  // Срабатывает при загрузке и при изменении размера окна
  window.addEventListener('load', updateLogo);
  window.addEventListener('resize', updateLogo);