
const Auth = {
    init() {
        const form = document.getElementById('login-form');
        const logoutBtn = document.getElementById('logout-btn');

        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }

        this.checkSession();
    },

    async handleLogin() {
        const usernameInput = document.getElementById('username')?.value;
        const passwordInput = document.getElementById('password')?.value;

        // Validar contra hardcoded admin (respaldo)
        if (usernameInput === 'admin' && passwordInput === 'admin123') {
            store.set('session', { loggedIn: true, user: 'Admin', role: 'admin' }, false);
            UI.showToast('Bienvenido, Admin', 'success');
            this.transitionToApp();
            return;
        }

        // Validar contra Base de Datos
        try {
            const users = await DB.get('users');
            const foundUser = users.find(u => u.username === usernameInput && u.password === passwordInput);
            
            if (foundUser) {
                store.set('session', { 
                    loggedIn: true, 
                    user: foundUser.fullname || foundUser.name || foundUser.username, 
                    role: foundUser.role 
                }, false);
                UI.showToast(`Bienvenido, ${foundUser.fullname || foundUser.name || foundUser.username}`, 'success');
                this.transitionToApp();
            } else {
                UI.showToast('Credenciales incorrectas', 'error');
            }
        } catch (error) {
            console.error("Auth: Error during login:", error);
            UI.showToast('Error de conexión al validar usuario', 'error');
        }
    },

    transitionToApp() {
        const loginView = document.getElementById('login-view');
        const dashboardView = document.getElementById('dashboard-view');

        // Add exit animation and block interaction
        loginView.classList.add('view-exit-active');
        loginView.style.pointerEvents = 'none';
        
        // Prepare dashboard but keep it waiting for transition
        dashboardView.classList.remove('hidden');
        dashboardView.classList.add('view-enter-active');
        dashboardView.style.display = 'flex'; 

        setTimeout(() => {
            // Completely hide login
            loginView.classList.remove('active', 'view-exit-active');
            loginView.style.display = 'none';
            loginView.style.visibility = 'hidden';
            loginView.style.zIndex = '-10';
            
            // Switch to dashboard fully
            dashboardView.classList.add('active');
            dashboardView.classList.remove('view-enter-active');
            dashboardView.style.pointerEvents = 'all';

            // Update user info
            const session = store.get('session', null, false);
            if (session) {
                const userDisplay = document.querySelector('.username-display');
                const avatarDisplay = document.querySelector('.avatar');
                if (userDisplay) userDisplay.textContent = session.user;
                if (avatarDisplay) avatarDisplay.textContent = session.user.substring(0, 2).toUpperCase();
            }

            // Initialize app default state
            const lastPage = store.get('current_page') || 'budgets';
            UI.switchPage(lastPage);
        }, 600);
    },

    logout() {
        store.remove('session', false);
        UI.showToast('Sesión cerrada correctamente', 'info');
        
        const loginView = document.getElementById('login-view');
        const dashboardView = document.getElementById('dashboard-view');

        // Immediate switch
        dashboardView.classList.remove('active', 'split-layout');
        dashboardView.style.display = 'none';
        dashboardView.style.pointerEvents = 'none';

        loginView.classList.add('active');
        loginView.style.display = 'flex'; 
        loginView.style.pointerEvents = 'all';
        loginView.style.visibility = 'visible';
        loginView.style.zIndex = '100';

        // Reset inputs
        const userInp = document.getElementById('username');
        const passInp = document.getElementById('password');
        if (userInp) userInp.value = '';
        if (passInp) passInp.value = '';
    },

    checkSession() {
        const session = store.get('session', null, false);
        const loginView = document.getElementById('login-view');
        const dashboardView = document.getElementById('dashboard-view');

        if (session && session.loggedIn) {
            loginView.classList.remove('active');
            loginView.style.display = 'none';
            dashboardView.classList.remove('hidden');
            dashboardView.classList.add('active');
            dashboardView.style.display = 'flex';

            // Update user info
            const userDisplay = document.querySelector('.username-display');
            const avatarDisplay = document.querySelector('.avatar');
            if (userDisplay) userDisplay.textContent = session.user;
            if (avatarDisplay) avatarDisplay.textContent = session.user.substring(0, 2).toUpperCase();

            // Restore last page or default to budgets
            const lastPage = store.get('current_page') || 'budgets';
            UI.switchPage(lastPage);
        } else {
            dashboardView.classList.remove('active');
            dashboardView.style.display = 'none';
            loginView.classList.add('active');
            loginView.style.display = 'flex';
        }
    }
};
