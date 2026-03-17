
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
            if (error.code === 'PGRST204' || error.message?.includes('not find')) {
                UI.showToast('Tabla no creada. Ejecuta el script SQL.', 'warning');
            }
            this.list = [];
            this.renderTable();
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
        const fileInput = document.getElementById('plist-file-input');
        
        if (!provider || !fileInput.files[0]) {
            UI.showToast('Completa todos los campos y selecciona un archivo.', 'warning');
            return;
        }

        const btn = document.querySelector('#price-list-form button[type="submit"]');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Guardando...';
        }

        try {
            const file = fileInput.files[0];
            const base64 = await this.fileToBase64(file);

            const payload = {
                provider_name: provider,
                file_name: file.name,
                file_data: base64, // Storing as base64 for now
                date: new Date().toISOString()
            };

            await DB.insert('price_lists', payload);
            UI.showToast('Lista de precios guardada correctamente.', 'success');
            await this.loadPriceLists();
            UI.closeModal('price-list-modal');
        } catch (error) {
            console.error(error);
            UI.showToast('Error al procesar el archivo o guardar.', 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = 'Guardar Lista';
            }
        }
    },

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
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
            
            // Generate a download link if data is present
            let fileDisplay = "";
            if (item.file_data) {
                fileDisplay = `<a href="${item.file_data}" download="${item.file_name}" class="text-accent" style="text-decoration:none;">
                    <i class='bx bxs-file-doc'></i> ${item.file_name} <small>(Descargar)</small>
                </a>`;
            } else {
                fileDisplay = `<span class="text-muted"><i class='bx bx-file'></i> ${item.file_name}</span>`;
            }

            tr.innerHTML = `
                <td data-label="Proveedor"><strong>${item.provider_name}</strong></td>
                <td data-label="Archivo">${fileDisplay}</td>
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

