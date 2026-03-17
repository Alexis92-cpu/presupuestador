
const Products = {
    list: [],
    originalList: [],

    initialized: false,
    async init() {
        await this.loadProducts();
        if (this.list.length === 0) {
            await this.seedData();
        }
        if (!this.initialized) {
            this.setupListeners();
            this.initialized = true;
        }
        this.renderTable();
    },

    async seedData() {
        const seed = [
            { name: 'Cámara Domo IP 2MP Hikvision', category: 'Seguridad', price_usd: 45 },
            { name: 'NVR 8 Canales 4K Dahua', category: 'Seguridad', price_usd: 120 },
            { name: 'Router WiFi 6 AX1800 TP-Link', category: 'Redes', price_usd: 85 },
            { name: 'Switch 24 Puertos Gigabit Hikvision', category: 'Redes', price_usd: 110 },
            { name: 'Disco Rígido 1TB WD Purple', category: 'Seguridad', price_usd: 65 },
            { name: 'Servicio Técnico Especializado (Hora)', category: 'Servicios', price_usd: 25 },
            { name: 'Desarrollo App Móvil (Módulo Mini)', category: 'Servicios', price_usd: 500 }
        ];
        
        for (const item of seed) {
            await DB.insert('products', item);
        }
        await this.loadProducts();
    },

    async loadProducts() {
        try {
            this.list = await DB.get('products');
            this.originalList = [...this.list];
            this.renderTable();
            console.log("Products: List loaded successfully", this.list.length, "items");
        } catch (error) {
            console.error('Error loading products:', error);
            UI.showToast('Error cargando catálogo', 'error');
            this.list = [];
        }
    },

    async quickAdd(name, price_usd = 0) {
        try {
            const newItem = await DB.insert('products', { name, price_usd, category: 'General' });
            await this.loadProducts();
            return newItem;
        } catch (error) {
            console.error("Error en quickAdd product:", error);
            throw error;
        }
    },

    setupListeners() {
        const btnAdd = document.getElementById('btn-add-product');
        const form = document.getElementById('product-form');
        const searchInput = document.getElementById('product-search');

        if (btnAdd) {
            btnAdd.addEventListener('click', () => {
                this.openModalForAdd();
            });
        }

        // Convert amounts automatically based on rate
        const inputUsd = document.getElementById('prod-price-usd');
        const inputArs = document.getElementById('prod-price-ars');

        if(inputUsd && inputArs) {
            inputUsd.addEventListener('input', (e) => {
                const usdVal = parseFloat(e.target.value);
                if (!isNaN(usdVal)) {
                    inputArs.value = (usdVal * Exchange.rate).toFixed(2);
                } else {
                    inputArs.value = '';
                }
            });

            inputArs.addEventListener('input', (e) => {
                const arsVal = parseFloat(e.target.value);
                if (!isNaN(arsVal)) {
                    inputUsd.value = (arsVal / Exchange.rate).toFixed(2);
                } else {
                    inputUsd.value = '';
                }
            });
        }

        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.saveProductFromForm();
            });
        }

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterList(e.target.value);
            });
        }

        // Listen to rate updates
        document.addEventListener('tasaCambioActualizada', (e) => {
            this.renderTable();
        });
    },

    openModalForAdd() {
        const form = document.getElementById('product-form');
        if (form) form.reset();
        
        document.getElementById('product-id').value = '';
        document.getElementById('product-modal-title').textContent = 'Agregar Producto';
        
        UI.openModal('product-modal');
    },

    openModalForEdit(id) {
        const product = this.list.find(p => p.id == id);
        if (!product) return;

        const form = document.getElementById('product-form');
        if (form) form.reset();

        document.getElementById('product-id').value = product.id;
        document.getElementById('prod-name').value = product.name;
        document.getElementById('prod-category').value = product.category;
        document.getElementById('prod-price-usd').value = product.price_usd;
        // recalculate ars for display
        document.getElementById('prod-price-ars').value = (product.price_usd * Exchange.rate).toFixed(2);

        document.getElementById('product-modal-title').textContent = 'Editar Producto';

        UI.openModal('product-modal');
    },

    async saveProductFromForm() {
        const idInput = document.getElementById('product-id').value;
        const nombre = document.getElementById('prod-name').value;
        const categoria = document.getElementById('prod-category').value;
        const price_usd = parseFloat(document.getElementById('prod-price-usd').value);

        if (!nombre || isNaN(price_usd)) {
            UI.showToast('Verifica los valores obligatorios.', 'error');
            return;
        }

        const payload = {
            name: nombre,
            category: categoria || 'General',
            price_usd: price_usd
        };

        const btn = document.querySelector('#product-form button[type="submit"]');
        if (btn) btn.disabled = true;

        try {
            console.log("Products: Saving...", payload);
            if (idInput) {
                await DB.update('products', idInput, payload);
                UI.showToast('Producto actualizado.', 'success');
            } else {
                await DB.insert('products', payload);
                UI.showToast('Producto creado exitosamente.', 'success');
            }

            await this.loadProducts();
            this.renderTable();
            UI.closeModal('product-modal');
        } catch (error) {
            console.error("Products: Error saving:", error);
            UI.showToast('Error al guardar producto', 'error');
        } finally {
            if (btn) btn.disabled = false;
        }
    },

    async deleteProduct(id) {
        if (!confirm('¿Estás seguro de eliminar este producto?')) return;
        
        try {
            await DB.remove('products', id);
            await this.loadProducts();
            this.renderTable();
            UI.showToast('Producto eliminado.', 'info');
        } catch (error) {
            UI.showToast('Error al eliminar', 'error');
        }
    },

    filterList(query) {
        if (!query) {
            this.list = [...this.originalList];
        } else {
            const lowerQuery = query.toLowerCase();
            this.list = this.originalList.filter(p => 
                p.name.toLowerCase().includes(lowerQuery) || 
                p.category.toLowerCase().includes(lowerQuery)
            );
        }
        this.renderTable();
    },

    renderTable() {
        const tbody = document.getElementById('products-list');
        if (!tbody) return;

        console.log("Products: Rendering table with", this.list.length, "items");
        tbody.innerHTML = '';

        if (this.list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No hay productos disponibles</td></tr>`;
            return;
        }

        this.list.forEach(p => {
            const tr = document.createElement('tr');
            const priceArs = p.price_usd * Exchange.rate;
            
            tr.innerHTML = `
                <td data-label="Nombre"><strong>${p.name}</strong></td>
                <td data-label="Categoría"><span class="badge border text-muted">${p.category}</span></td>
                <td data-label="Precio (USD)" class="price-usd">${UI.formatCurrency(p.price_usd, 'USD')}</td>
                <td data-label="Precio (ARS)">${UI.formatCurrency(priceArs, 'ARS')}</td>
                <td data-label="Acciones">
                    <button class="icon-btn edit-btn" data-id="${p.id}">
                        <i class='bx bx-edit-alt'></i>
                    </button>
                    <button class="icon-btn delete-btn" data-id="${p.id}">
                        <i class='bx bx-trash'></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.openModalForEdit(e.currentTarget.dataset.id));
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.deleteProduct(e.currentTarget.dataset.id));
        });
    }
};
