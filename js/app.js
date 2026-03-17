








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
    console.log("App: Initializing modules...");
    const initModules = [
        { name: 'Auth', fn: () => Auth.init() },
        { name: 'Exchange', fn: () => Exchange.init() },
        { name: 'Products', fn: () => Products.init() },
        { name: 'Clients', fn: () => Clients.init() },
        { name: 'Users', fn: () => Users.init() },
        { name: 'Budgets', fn: () => Budgets.init() }
    ];

    if (typeof PriceLists !== 'undefined') {
        initModules.push({ name: 'PriceLists', fn: () => PriceLists.init() });
    }

    let connectionError = false;
    for (const mod of initModules) {
        try {
            await mod.fn();
        } catch (err) {
            console.error(`App: Error initializing ${mod.name}:`, err);
            connectionError = true;
        }
    }

    if (connectionError) {
        UI.showToast("Modo Offline: Algunos datos se guardarán solo localmente.", "warning");
    } else {
        console.log("App: All modules initialized successfully.");
    }

    // Default Page
    UI.switchPage(store.get('current_page') || 'budgets');
});
