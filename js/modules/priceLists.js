
const PriceLists = {
    list: [],

    initialized: false,
    async init() {
        if (!this.initialized) {
            this.setupListeners();
            this.initialized = true;
        }
        await this.loadPriceLists();
    },

    async loadPriceLists() {
        try {
            this.list = await DB.get('price_lists');
            this.renderTable();
        } catch (error) {
            console.error('Error loading price lists:', error);
            this.list = [];
        }
    },

    setupListeners() {
        const btnAdd = document.getElementById('btn-add-price-list');
        const form = document.getElementById('price-list-form');
        const searchInput = document.getElementById('price-list-search');

        if (btnAdd) {
            btnAdd.addEventListener('click', () => {
                const modalForm = document.getElementById('price-list-form');
                if (modalForm) modalForm.reset();
                UI.openModal('price-list-modal');
            });
        }

        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.savePriceList();
            });
        }

        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.filterList(e.target.value));
        }
    },

    async savePriceList() {
        const provider = document.getElementById('plist-provider').value;
        const fileLink = document.getElementById('plist-file-link').value;

        if (!provider || !fileLink) {
            UI.showToast('Completa todos los campos.', 'warning');
            return;
        }

        const payload = {
            provider_name: provider,
            file_name: fileLink,
            date: new Date().toISOString()
        };

        const btn = document.querySelector('#price-list-form button[type="submit"]');
        if (btn) btn.disabled = true;

        try {
            await DB.insert('price_lists', payload);
            UI.showToast('Lista de precios guardada.', 'success');
            await this.loadPriceLists();
            UI.closeModal('price-list-modal');
        } catch (error) {
            UI.showToast('Error al guardar lista', 'error');
        } finally {
            if (btn) btn.disabled = false;
        }
    },

    async deletePriceList(id) {
        if (!confirm('¿Eliminar esta lista de precios?')) return;
        try {
            await DB.remove('price_lists', id);
            await this.loadPriceLists();
            UI.showToast('Lista eliminada.', 'info');
        } catch (error) {
            UI.showToast('Error al eliminar', 'error');
        }
    },

    filterList(query) {
        if (!query) {
            this.renderTable(this.list);
            return;
        }
        const lowerQuery = query.toLowerCase();
        const filtered = this.list.filter(item => 
            item.provider_name.toLowerCase().includes(lowerQuery) || 
            item.file_name.toLowerCase().includes(lowerQuery)
        );
        this.renderTable(filtered);
    },

    renderTable(data = this.list) {
        const tbody = document.getElementById('price-lists-tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No hay listas de precios disponibles</td></tr>`;
            return;
        }

        data.forEach(item => {
            const tr = document.createElement('tr');
            
            // If it looks like a URL, make it a link
            let fileDisplay = item.file_name;
            if (item.file_name.startsWith('http')) {
                fileDisplay = `<a href="${item.file_name}" target="_blank" class="text-accent"><i class='bx bx-link-external'></i> Ver Archivo</a>`;
            } else {
                fileDisplay = `<span class="text-muted"><i class='bx bx-file'></i> ${item.file_name}</span>`;
            }

            tr.innerHTML = `
                <td data-label="Proveedor"><strong>${item.provider_name}</strong></td>
                <td data-label="Archivo / Link">${fileDisplay}</td>
                <td data-label="Fecha Subida">${new Date(item.date).toLocaleDateString()}</td>
                <td data-label="Acciones">
                    <button class="icon-btn delete-plist-btn" data-id="${item.id}" title="Eliminar">
                        <i class='bx bx-trash'></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        document.querySelectorAll('.delete-plist-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.deletePriceList(e.currentTarget.dataset.id));
        });
    }
};
