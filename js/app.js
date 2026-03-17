








document.addEventListener('DOMContentLoaded', async () => {
    
    // 1. Initialize Animation Immediately
    BackgroundAnimation.init();

    // 2. Setup CORE UI Listeners (Must happen BEFORE awaits to ensure responsiveness)
    const closeButtons = document.querySelectorAll('.close-modal');
    closeButtons.forEach(btn => btn.addEventListener('click', () => UI.closeAllModals()));

    const navItems = document.querySelectorAll('.nav-item[data-target]');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const target = e.currentTarget.dataset.target;
            UI.switchPage(target);
        });
    });

    const menuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.querySelector('.sidebar');
    if (menuBtn && sidebar) {
        menuBtn.addEventListener('click', (e) => {
             e.stopPropagation();
             sidebar.classList.toggle('open');
             document.body.style.overflow = sidebar.classList.contains('open') ? 'hidden' : '';
        });

        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
                if (!sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
                    sidebar.classList.remove('open');
                    document.body.style.overflow = '';
                }
            }
        });
    }

    // 3. Initialize Modules with Error Capturing
    try {
        console.log("App: Initializing modules...");
        await Auth.init();
        await Exchange.init();
        await Products.init();
        await Clients.init();
        await Users.init();
        await Budgets.init();
        console.log("App: All modules initialized.");
    } catch (err) {
        console.error("App: Fatal error during module initialization:", err);
        UI.showToast("Error de conexión. Trabajando en modo local.", "warning");
    }

    // Default Page
    UI.switchPage(store.get('current_page') || 'budgets');

    // 4. Hide Loader
    setTimeout(() => {
        document.getElementById('initial-loader')?.classList.add('fade-out');
    }, 500);
});
