// UI Interaction Utilities
const UI = {
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let icon = 'bx-info-circle';
        if (type === 'success') icon = 'bx-check-circle';
        if (type === 'error') icon = 'bx-x-circle';

        toast.innerHTML = `<i class='bx ${icon}'></i> <span>${message}</span>`;
        container.appendChild(toast);

        // Animate up
        setTimeout(() => toast.classList.add('show'), 10);

        // Remove after delay
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('hidden');
    },

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('hidden');
    },

    closeAllModals() {
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.classList.add('hidden');
        });
    },

    switchView(viewId) {
        document.querySelectorAll('.view-section').forEach(view => {
            view.classList.remove('active');
        });
        const target = document.getElementById(viewId);
        if (target) target.classList.add('active');
    },

    switchPage(pageId) {
        // Persist current page for refresh
        store.set('current_page', pageId);

        document.querySelectorAll('.page-content').forEach(page => {
            page.classList.remove('active');
        });
        const target = document.getElementById(`page-${pageId}`);
        if (target) target.classList.add('active');

        // Update nav
        document.querySelectorAll('.nav-item[data-target]').forEach(nav => {
            nav.classList.remove('active');
            if (nav.dataset.target === pageId) nav.classList.add('active');
        });

        // Update title
        const titleSpan = document.getElementById('page-title');
        const titles = {
            'products': 'Gestión de Productos',
            'clients': 'Gestión de Clientes',
            'budgets': 'Presupuestos',
            'users': 'Gestión de Usuarios'
        };
        if (titleSpan && titles[pageId]) titleSpan.textContent = titles[pageId];
        
        // Close sidebar on mobile
        document.querySelector('.sidebar')?.classList.remove('open');

        // Logic-specific refreshes
        if (pageId === 'products') Products.init();
        if (pageId === 'clients') Clients.init();
        if (pageId === 'users') Users.init();
        if (pageId === 'budgets') Budgets.init();
    },

    formatCurrency(amount, currency = 'USD') {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: currency
        }).format(amount);
    }
};

// Global Listeners for closing modals
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') UI.closeAllModals();
});

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        UI.closeAllModals();
    }
});
