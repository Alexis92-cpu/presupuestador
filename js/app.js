








document.addEventListener('DOMContentLoaded', async () => {
    
    // Initialize Core Modules
    BackgroundAnimation.init();
    await Auth.init();
    await Exchange.init();
    await Products.init();
    await Clients.init();
    await Users.init();
    await Budgets.init();

    // ----------------------------------------------------
    // Application Navigation / Layout Logic setup 
    // ----------------------------------------------------

    // Close Modals global buttons
    const closeButtons = document.querySelectorAll('.close-modal');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => UI.closeAllModals());
    });

    // Sidebar navigation
    const navItems = document.querySelectorAll('.nav-item[data-target]');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const target = e.currentTarget.dataset.target;
            UI.switchPage(target);
        });
    });

    // Mobile specific menu toggle
    const menuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.querySelector('.sidebar');

    if (menuBtn && sidebar) {
        menuBtn.addEventListener('click', () => {
             sidebar.classList.toggle('open');
        });

        // Close when clicking outside of sidebar
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                if (!sidebar.contains(e.target) && !menuBtn.contains(e.target) && sidebar.classList.contains('open')) {
                    sidebar.classList.remove('open');
                }
            }
        });
    }

    // Default Page selection if logged in
    UI.switchPage('budgets');

});
