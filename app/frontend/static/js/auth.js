function showAlert(message, type = 'error') {
    const el = document.getElementById('auth-alert');
    el.textContent = message;
    el.className = `auth-alert show ${type}`;
}

function hideAlert() {
    const el = document.getElementById('auth-alert');
    el.className = 'auth-alert';
}

function setLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    btn.classList.toggle('loading', loading);
    btn.disabled = loading;
}

function switchTab(tab) {
    hideAlert();
    document.getElementById('tab-login').classList.toggle('active', tab === 'login');
    document.getElementById('tab-register').classList.toggle('active', tab === 'register');
    document.getElementById('panel-login').classList.toggle('active', tab === 'login');
    document.getElementById('panel-register').classList.toggle('active', tab === 'register');
    document.querySelector('.auth-form-header h2').textContent =
        tab === 'login' ? 'Welcome back' : 'Create your account';
}

function saveSession(token, user) {
    localStorage.setItem('ft_token', token);
    localStorage.setItem('ft_user', JSON.stringify(user));
}

/* ── Auth calls ── */

async function handleLogin() {
    hideAlert();
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    console.log(password);

    if (!email || !password) { showAlert('Please fill in all fields.'); return; }

    setLoading('login-btn', true);
    try {
        const res  = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) { showAlert(data.error || 'Login failed.'); return; }

        saveSession(data.token, data.user);
        window.location.href = '/dashboard';
    } catch (e) {
        showAlert('Network error. Please try again.');
    } finally {
        setLoading('login-btn', false);
    }
}

async function handleRegister() {
    hideAlert();
    const username = document.getElementById('reg-username').value.trim();
    const email    = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;

    if (!username || !email || !password) { showAlert('Please fill in all fields.'); return; }
    if (password.length < 8) { showAlert('Password must be at least 8 characters.'); return; }

    setLoading('register-btn', true);
    try {
        const res  = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        const data = await res.json();
        if (!res.ok) { showAlert(data.error || 'Registration failed.'); return; }

        saveSession(data.token, data.user);
        window.location.href = '/dashboard';
    } catch (e) {
        showAlert('Network error. Please try again.');
    } finally {
        setLoading('register-btn', false);
    }
}

/* ── Enter key support ── */
document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    if (document.getElementById('panel-login').classList.contains('active')) handleLogin();
    else handleRegister();
});

/* ── Redirect if already logged in ── */
if (localStorage.getItem('ft_token')) {
    window.location.href = '/dashboard';
}