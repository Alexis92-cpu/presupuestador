
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
            const debouncedSearch = UI.debounce((val) => this.filterList(val), 300);
            searchInput.addEventListener('input', (e) => debouncedSearch(e.target.value));
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

    openFile(id) {
        const item = this.list.find(i => i.id == id);
        if (!item || !item.file_data) {
            UI.showToast('No hay datos de archivo para mostrar.', 'warning');
            return;
        }

        try {
            // Convert Base64 to Blob to open in new tab (bypassing most block policies)
            const parts = item.file_data.split(';');
            const contentType = parts[0].split(':')[1];
            const base64Data = parts[1].split(',')[1];

            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: contentType });

            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
            
            // Clean up memory after a reasonable delay
            setTimeout(() => URL.revokeObjectURL(url), 30000);
        } catch (error) {
            console.error('Error opening file:', error);
            UI.showToast('Error al abrir el archivo.', 'error');
        }
    },

    getFileIcon(fileName) {
        const ext = fileName.split('.').pop().toLowerCase();
        if (['pdf'].includes(ext)) return 'bxs-file-pdf text-danger';
        if (['xlsx', 'xls', 'csv'].includes(ext)) return 'bxs-file-export text-success';
        if (['doc', 'docx'].includes(ext)) return 'bxs-file-doc text-accent';
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'bxs-file-image text-warning';
        return 'bx-file text-muted';
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

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No hay listas de precios disponibles</td></tr>`;
            return;
        }

        const fragment = document.createDocumentFragment();
        data.forEach(item => {
            const tr = document.createElement('tr');
            const iconClass = this.getFileIcon(item.file_name);

            tr.innerHTML = `
                <td data-label="Proveedor"><strong>${item.provider_name}</strong></td>
                <td data-label="Archivo">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <i class='bx ${iconClass}' style="font-size:1.4rem;"></i>
                        <span>${item.file_name}</span>
                    </div>
                </td>
                <td data-label="Fecha Subida">${new Date(item.date).toLocaleDateString()}</td>
                <td data-label="Acciones">
                    <div class="table-actions">
                        <button class="btn btn-ghost btn-sm view-plist-btn" data-id="${item.id}"><i class='bx bx-show'></i> Ver</button>
                        <button class="icon-btn delete-plist-btn" data-id="${item.id}"><i class='bx bx-trash'></i></button>
                    </div>
                </td>
            `;
            fragment.appendChild(tr);
        });

        tbody.innerHTML = '';
        tbody.appendChild(fragment);

        tbody.querySelectorAll('.view-plist-btn').forEach(btn => {
            btn.onclick = () => this.openFile(btn.dataset.id);
        });

        tbody.querySelectorAll('.delete-plist-btn').forEach(btn => {
            btn.onclick = () => this.deletePriceList(btn.dataset.id);
        });
    }
};
