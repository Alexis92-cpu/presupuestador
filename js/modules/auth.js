
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
            store.set('session', { loggedIn: true, user: 'Admin', role: 'admin' });
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
                    user: foundUser.fullname, 
                    role: foundUser.role 
                });
                UI.showToast(`Bienvenido, ${foundUser.fullname}`, 'success');
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
            const session = store.get('session');
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
        store.remove('session');
        UI.showToast('Sesión cerrada', 'info');
        
        const loginView = document.getElementById('login-view');
        const dashboardView = document.getElementById('dashboard-view');

        dashboardView.classList.add('view-exit-active');
        dashboardView.style.pointerEvents = 'none';

        setTimeout(() => {
            dashboardView.classList.remove('active', 'view-exit-active', 'split-layout');
            dashboardView.style.display = 'none';
            
            loginView.classList.add('active', 'view-enter-active');
            loginView.style.display = 'flex'; 
            loginView.style.pointerEvents = 'all';

            // Reset inputs
            document.getElementById('username').value = '';
            document.getElementById('password').value = '';
            
            setTimeout(() => {
                loginView.classList.remove('view-enter-active');
            }, 600);
        }, 600);
    },

    checkSession() {
        const session = store.get('session');
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
