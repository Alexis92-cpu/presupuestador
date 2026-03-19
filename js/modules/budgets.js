
const Budgets = {
    list: [],
    currentItems: [], // Items being added to the current budget
    selectedProduct: null,
    totals: { usd: 0, ars: 0 },

    initialized: false,
    async init() {
        await this.loadBudgets();
        if (!this.initialized) {
            this.setupListeners();
            this.initialized = true;
        }
        this.renderGrid();
    },

    async loadBudgets() {
        try {
            this.list = await DB.get('budgets');
        } catch (error) {
            console.error('Error loading budgets:', error);
            this.list = [];
        }
    },

    setupListeners() {
        const btnNew = document.getElementById('btn-new-budget');
        const btnClose = document.querySelectorAll('.close-budget-modal');
        const btnAddItem = document.getElementById('btn-add-item-to-list');
        const itemSearch = document.getElementById('budget-item-search');
        const globalIvaToggle = document.getElementById('global-iva-toggle');
        const budgetForm = document.getElementById('budget-form-main');

        if (btnNew) {
            btnNew.addEventListener('click', () => this.openEditor());
        }

        btnClose.forEach(btn => btn.addEventListener('click', () => UI.closeModal('budget-editor-modal')));

        const debouncedItemSearch = UI.debounce((val) => this.searchProducts(val), 300);
        if (itemSearch) {
            itemSearch.addEventListener('input', (e) => debouncedItemSearch(e.target.value));
        }

        const clientSearch = document.getElementById('budget-client-search');
        const debouncedClientSearch = UI.debounce((val) => this.searchClients(val), 300);
        if (clientSearch) {
            clientSearch.addEventListener('input', (e) => debouncedClientSearch(e.target.value));
        }

        if (btnAddItem) {
            btnAddItem.addEventListener('click', () => this.addItemToList());
        }

        if (globalIvaToggle) {
            globalIvaToggle.addEventListener('change', () => this.calculateTotals());
        }

        if (budgetForm) {
            budgetForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.saveBudget();
            });
        }

        // Filters
        const searchMain = document.getElementById('budget-main-search');
        const statusFilter = document.getElementById('budget-status-filter');

        if (searchMain) {
            const debouncedMainSearch = UI.debounce((val) => {
                this.renderGrid(val, statusFilter.value);
            }, 300);
            searchMain.addEventListener('input', (e) => debouncedMainSearch(e.target.value));
        }

        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => this.renderGrid(searchMain.value, e.target.value));
        }

        // Preview actions
        const btnPrint = document.getElementById('btn-print-doc');
        const btnExport = document.getElementById('btn-export-pdf');
        const closePreview = document.querySelector('.close-preview-modal');

        if (btnPrint) btnPrint.addEventListener('click', () => window.print());
        if (btnExport) btnExport.addEventListener('click', () => this.exportPDF());
        if (closePreview) closePreview.addEventListener('click', () => UI.closeModal('budget-preview-modal'));
        
        // Listen for rate changes to recalculate grid and totals if necessary
        document.addEventListener('tasaCambioActualizada', () => {
            this.renderGrid();
            if (!document.getElementById('budget-editor-modal').classList.contains('hidden')) {
                this.calculateTotals();
            }
        });
    },

    openEditor(id = null) {
        this.currentItems = [];
        this.selectedProduct = null;
        
        const form = document.getElementById('budget-form-main');
        if (form) form.reset();

        document.getElementById('edit-budget-id').value = '';
        document.getElementById('budget-status').value = 'Borrador';
        document.getElementById('item-config-panel').classList.add('hidden');

        if (id) {
            // Edit mode
            const b = this.list.find(item => item.id == id);
            if (!b) return;

            document.getElementById('edit-budget-id').value = b.id;
            document.getElementById('budget-number').value = b.number;
            document.getElementById('budget-status').value = b.status || 'Borrador';
            document.getElementById('budget-date-today').value = new Date(b.date).toLocaleDateString();
            document.getElementById('budget-validity').value = b.validity;
            document.getElementById('budget-observations').value = b.observations;
            
            this.currentItems = [...b.items];
            document.getElementById('budget-client-id').value = b.client_id || b.clientId || '';
            document.getElementById('budget-client-search').value = b.client_name || b.clientName || '';
        } else {
            // New mode
            document.getElementById('budget-number').value = this.generateBudgetNumber();
            document.getElementById('budget-date-today').value = new Date().toLocaleDateString();
            document.getElementById('budget-client-id').value = '';
            document.getElementById('budget-client-search').value = '';
        }
        
        this.renderItemsList();
        this.calculateTotals();
        UI.openModal('budget-editor-modal');
    },

    generateBudgetNumber() {
        const count = this.list.length + 1;
        return `PR-${count.toString().padStart(5, '0')}`;
    },

    searchClients(query) {
        const popover = document.getElementById('client-search-popover');
        if (!query || query.length < 1) {
            popover.classList.add('hidden');
            return;
        }

        const clients = (typeof Clients !== 'undefined' && Clients.list) ? Clients.list : [];
        const matches = clients.filter(c => c.name.toLowerCase().includes(query.toLowerCase()));
        
        if (matches.length > 0) {
            popover.innerHTML = '';
            matches.forEach(c => {
                const div = document.createElement('div');
                div.className = 'search-item';
                div.innerHTML = `<span>${c.name}</span> <small>Cliente</small>`;
                div.onclick = () => this.selectClient(c);
                popover.appendChild(div);
            });
            popover.classList.remove('hidden');
        } else {
            popover.innerHTML = `<div class="search-item text-muted">No encontrado (se agregará al guardar)</div>`;
            popover.classList.remove('hidden');
        }
    },

    selectClient(client) {
        document.getElementById('budget-client-id').value = client.id;
        document.getElementById('budget-client-search').value = client.name;
        document.getElementById('client-search-popover').classList.add('hidden');
    },

    searchProducts(query) {
        const popover = document.getElementById('search-results-popover');
        if (!query || query.length < 2) {
            popover.classList.add('hidden');
            return;
        }

        const matches = Products.list.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));
        
        if (matches.length > 0) {
            popover.innerHTML = '';
            matches.forEach(p => {
                const div = document.createElement('div');
                div.className = 'search-item';
                div.innerHTML = `<span>${p.name}</span> <small>${UI.formatCurrency(p.price_usd, 'USD')}</small>`;
                div.onclick = () => this.selectProduct(p);
                popover.appendChild(div);
            });
            popover.classList.remove('hidden');
        } else {
            popover.classList.add('hidden');
        }
    },

    selectProduct(product) {
        this.selectedProduct = product;
        document.getElementById('budget-item-search').value = product.name;
        document.getElementById('search-results-popover').classList.add('hidden');
        
        // Ensure inputs are reset
        document.getElementById('item-qty').value = 1;
        document.getElementById('item-profit').value = 20;
        
        document.getElementById('item-config-panel').classList.remove('hidden');
    },

    async addItemToList() {
        let productToAdd = this.selectedProduct;
        const typedName = document.getElementById('budget-item-search').value.trim();

        if (!productToAdd && typedName) {
            // Check if it already exists exactly
            const existing = Products.list.find(p => p.name.toLowerCase() === typedName.toLowerCase());
            if (existing) {
                productToAdd = existing;
            } else {
                if (confirm(`El producto "${typedName}" no existe. ¿Quieres agregarlo al catálogo?`)) {
                    try {
                        productToAdd = await Products.quickAdd(typedName);
                        UI.showToast(`Producto "${typedName}" agregado al catálogo.`, 'success');
                    } catch (e) {
                        UI.showToast('Error al agregar producto rápido', 'error');
                        return;
                    }
                } else {
                    return;
                }
            }
        }

        if (!productToAdd) return;

        const qty = parseInt(document.getElementById('item-qty').value) || 1;
        const iva = parseFloat(document.getElementById('item-iva').value) || 0;
        const profit = parseFloat(document.getElementById('item-profit').value) || 0;
        const discount = parseFloat(document.getElementById('item-discount').value) || 0;

        // Price calculation: Cost * (1 + profit%) * (1 - discount%)
        const costUsd = parseFloat(productToAdd.price_usd) || 0;
        const priceAfterProfit = costUsd * (1 + (profit / 100));
        const finalPricePerUnit = priceAfterProfit * (1 - (discount / 100));
        
        this.currentItems.push({
            id: Date.now(),
            productId: productToAdd.id,
            name: productToAdd.name,
            costUsd: costUsd,
            profitPercent: profit,
            discountPercent: discount,
            price_usd: finalPricePerUnit,
            quantity: qty,
            ivaPercent: iva,
            subtotalUsd: finalPricePerUnit * qty
        });

        this.renderItemsList();
        this.calculateTotals();
        
        // Reset item selector
        this.selectedProduct = null;
        document.getElementById('budget-item-search').value = '';
        document.getElementById('item-discount').value = 0;
        document.getElementById('item-config-panel').classList.add('hidden');
    },

    renderItemsList() {
        const tbody = document.getElementById('budget-items-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        this.currentItems.forEach((item, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td data-label="Cant.">${item.quantity}</td>
                <td data-label="Descripción">${item.name}</td>
                <td data-label="Costo (USD)">${UI.formatCurrency(item.costUsd, 'USD')}</td>
                <td data-label="Venta (USD)">${UI.formatCurrency(item.price_usd, 'USD')}</td>
                <td data-label="Desc.">${item.discountPercent}%</td>
                <td data-label="IVA">${item.ivaPercent}%</td>
                <td data-label="Subtotal (USD)">${UI.formatCurrency(item.subtotalUsd, 'USD')}</td>
                <td data-label="Acción"><button type="button" class="icon-btn danger" onclick="Budgets.removeItem(${index})"><i class='bx bx-trash'></i></button></td>
            `;
            tbody.appendChild(tr);
        });
    },

    removeItem(index) {
        this.currentItems.splice(index, 1);
        this.renderItemsList();
        this.calculateTotals();
    },

    calculateTotals() {
        let totalUsd = 0;
        const includeGlobalIva = document.getElementById('global-iva-toggle').checked;

        this.currentItems.forEach(item => {
            let itemTotal = item.subtotalUsd;
            if (includeGlobalIva) {
                itemTotal += (item.subtotalUsd * (item.ivaPercent / 100));
            }
            totalUsd += itemTotal;
        });

        const totalArs = totalUsd * Exchange.rate;
        
        this.totals = { usd: totalUsd, ars: totalArs };

        document.getElementById('final-total-usd').textContent = UI.formatCurrency(totalUsd, 'USD');
        document.getElementById('final-total-ars').textContent = UI.formatCurrency(totalArs, 'ARS');
    },

    async saveBudget() {
        const btnSave = document.querySelector('#budget-form-main button[type="submit"]');
        if (btnSave) btnSave.disabled = true;

        const budgetId = document.getElementById('edit-budget-id').value;
        const clientNameInput = document.getElementById('budget-client-search').value.trim();
        let clientId = document.getElementById('budget-client-id').value;
        let clientName = clientNameInput;

        if (!clientId && clientNameInput) {
            // Search if it exists exactly
            const existing = Clients.list.find(c => c.name.toLowerCase() === clientNameInput.toLowerCase());
            if (existing) {
                clientId = existing.id;
                clientName = existing.name;
            } else {
                if (confirm(`El cliente "${clientNameInput}" no existe. ¿Quieres agregarlo a la lista de clientes?`)) {
                    try {
                        const newClient = await Clients.quickAdd(clientNameInput);
                        clientId = newClient.id;
                        clientName = newClient.name;
                        UI.showToast(`Cliente registrado con éxito.`, 'success');
                    } catch (e) {
                        UI.showToast('Error registrando cliente rápido.', 'error');
                        if (btnSave) btnSave.disabled = false;
                        return;
                    }
                } else {
                    if (btnSave) btnSave.disabled = false;
                    return;
                }
            }
        }

        if (!clientId) {
            UI.showToast('Por favor, selecciona o registra un cliente.', 'error');
            if (btnSave) btnSave.disabled = false;
            return;
        }

        if (this.currentItems.length === 0) {
            UI.showToast('Agrega al menos un producto al presupuesto.', 'error');
            if (btnSave) btnSave.disabled = false;
            return;
        }

        // Recuperar fecha original si es edición, sino usar hoy
        let originalDate = new Date().toISOString();
        if (budgetId) {
            const found = this.list.find(b => b.id == budgetId);
            if (found && found.date) originalDate = found.date;
        }

        const budgetData = {
            number: document.getElementById('budget-number').value || 'S/N',
            date: originalDate,
            client_id: clientId,
            client_name: clientName,
            status: document.getElementById('budget-status').value || 'Borrador',
            validity: document.getElementById('budget-validity').value || 7,
            observations: document.getElementById('budget-observations').value || '',
            items: [...this.currentItems],
            total_usd: this.totals.usd || 0,
            total_ars: this.totals.ars || 0,
            rate: Exchange.rate || 0
        };

        console.log('Intentando guardar presupuesto:', budgetData);

        try {
            if (budgetId) {
                await DB.update('budgets', budgetId, budgetData);
                UI.showToast('Presupuesto actualizado.', 'success');
            } else {
                const saved = await DB.insert('budgets', budgetData);
                UI.showToast('Presupuesto creado con éxito.', 'success');
                // Open preview automatically for new ones
                this.openPreview(saved.id);
            }
            
            await this.loadBudgets();
            this.renderGrid();
            UI.closeModal('budget-editor-modal');
        } catch (error) {
            console.error('Budgets: Error saving:', error);
            UI.showToast('Error al guardar presupuesto', 'error');
        } finally {
            if (btnSave) btnSave.disabled = false;
        }
    },

    renderGrid(query = '', status = 'all') {
        const grid = document.getElementById('budgets-grid');
        if (!grid) return;

        let filtered = [...this.list];
        if (query) {
            const q = query.toLowerCase();
            filtered = filtered.filter(b => 
                (b.client_name || b.clientName || '').toLowerCase().includes(q) || 
                (b.number || '').toLowerCase().includes(q)
            );
        }

        if (status !== 'all') {
            filtered = filtered.filter(b => b.status === status);
        }

        if (filtered.length === 0) {
            grid.innerHTML = `<div class="empty-state text-center text-muted"><i class='bx bx-search' style='font-size: 3rem;'></i><p>No se encontraron presupuestos.</p></div>`;
            return;
        }

        const fragment = document.createDocumentFragment();
        filtered.forEach(b => {
            const card = document.createElement('div');
            card.className = 'budget-card glass-panel';
            const statusClass = (b.status || 'Borrador').toLowerCase();
            
            card.innerHTML = `
                <div class="budget-card-header">
                    <span class="budget-num">${b.number}</span>
                    <span class="status-badge ${statusClass}">${b.status || 'Borrador'}</span>
                </div>
                <div class="budget-card-body">
                    <span class="budget-date">${new Date(b.date).toLocaleDateString()}</span>
                    <h3 class="client-name">${b.client_name || b.clientName}</h3>
                    <div class="budget-totals">
                        <div class="total-main">${UI.formatCurrency(b.total_ars || b.totalArs, 'ARS')}</div>
                        <div class="total-sub">${UI.formatCurrency(b.total_usd || b.totalUsd, 'USD')}</div>
                    </div>
                </div>
                <div class="budget-card-footer">
                    <div class="footer-actions">
                        <button class="btn btn-ghost btn-sm btn-preview" data-id="${b.id}"><i class='bx bx-show'></i></button>
                        <button class="btn btn-ghost btn-sm btn-edit" data-id="${b.id}"><i class='bx bx-edit-alt'></i></button>
                    </div>
                    <button class="icon-btn danger micro btn-delete" data-id="${b.id}"><i class='bx bx-trash'></i></button>
                </div>
            `;
            fragment.appendChild(card);
        });

        grid.innerHTML = '';
        grid.appendChild(fragment);

        grid.querySelectorAll('.btn-preview').forEach(btn => btn.onclick = () => this.openPreview(btn.dataset.id));
        grid.querySelectorAll('.btn-edit').forEach(btn => btn.onclick = () => this.openEditor(btn.dataset.id));
        grid.querySelectorAll('.btn-delete').forEach(btn => btn.onclick = () => this.deleteBudget(btn.dataset.id));
    },

    async deleteBudget(id) {
        if (!confirm('¿Eliminar este presupuesto?')) return;
        try {
            await DB.remove('budgets', id);
            await this.loadBudgets();
            this.renderGrid();
            UI.showToast('Presupuesto eliminado.', 'info');
        } catch (error) {
            UI.showToast('Error al eliminar', 'error');
        }
    },

    openPreview(id) {
        const b = this.list.find(item => item.id == id);
        if (!b) return;

        const container = document.getElementById('printable-budget');
        container.innerHTML = `
            <div class="budget-pdf-header">
                <div class="comp-logo"><img src="logo.png"></div>
                <div class="comp-details">
                    <h2 class="comp-name">NETPOINT SOLUTIONS</h2>
                    <p>Seguridad Electrónica & Redes</p>
                    <p>Presupuesto N°: <strong>${b.number}</strong></p>
                    <p>Fecha: ${new Date(b.date).toLocaleDateString()}</p>
                </div>
            </div>

            <div class="budget-pdf-subtitle">
                <h2>${b.observations || 'Presupuesto de Equipamiento'}</h2>
            </div>
            
            <div class="budget-pdf-client">
                <p><strong>Cliente:</strong> ${b.client_name || b.clientName}</p>
                <p><strong>Validez:</strong> ${b.validity} días</p>
            </div>

            <table class="budget-pdf-table">
                <thead>
                    <tr>
                        <th>Descripción</th>
                        <th>Cant.</th>
                        <th>Precio (USD)</th>
                        <th>Desc.</th>
                        <th>Subtotal (USD)</th>
                    </tr>
                </thead>
                <tbody>
                    ${b.items.map(item => `
                        <tr>
                            <td>${item.name}</td>
                            <td>${item.quantity}</td>
                            <td>${UI.formatCurrency(item.price_usd, 'USD')}</td>
                            <td>${item.discountPercent > 0 ? `<small style="color:var(--danger)">-${item.discountPercent}%</small>` : ''}</td>
                            <td>${UI.formatCurrency(item.subtotalUsd, 'USD')}</td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="4" style="text-align: right"><strong>TOTAL USD</strong></td>
                        <td><strong>${UI.formatCurrency(b.total_usd || b.totalUsd, 'USD')}</strong></td>
                    </tr>
                    <tr class="highlight">
                        <td colspan="4" style="text-align: right"><strong>TOTAL ARS</strong></td>
                        <td><strong>${UI.formatCurrency(b.total_ars || b.totalArs, 'ARS')}</strong></td>
                    </tr>
                </tfoot>
            </table>

            <div class="budget-pdf-footer">
                <p>Tipo de cambio aplicado: 1 USD = ${UI.formatCurrency(b.rate, 'ARS')}</p>
                <small>* Precios sujetos a variaciones cambiarias sin previo aviso.</small>
            </div>
        `;

        UI.openModal('budget-preview-modal');
    },

    exportPDF() {
        const element = document.getElementById('printable-budget');
        const opt = {
            margin: 10,
            filename: `Presupuesto_${new Date().getTime()}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(element).save();
    }
};
