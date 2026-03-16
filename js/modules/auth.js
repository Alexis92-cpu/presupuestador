
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

    handleLogin() {
        const user = document.getElementById('username')?.value;
        const pass = document.getElementById('password')?.value;

        if (user === 'admin' && pass === 'admin123') {
            store.set('session', { loggedIn: true, user: 'Admin' });
            UI.showToast('Bienvenido, Admin', 'success');
            
            this.transitionToApp();
        } else {
            UI.showToast('Credenciales incorrectas', 'error');
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
            
            // Switch to dashboard fully
            dashboardView.classList.add('active');
            dashboardView.classList.remove('view-enter-active');

            // Initialize app default state
            UI.switchPage('budgets');
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
            UI.switchPage('budgets');
        } else {
            dashboardView.classList.remove('active');
            dashboardView.style.display = 'none';
            loginView.classList.add('active');
            loginView.style.display = 'flex';
        }
    }
};
