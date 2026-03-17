
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

        if (itemSearch) {
            itemSearch.addEventListener('input', (e) => this.searchProducts(e.target.value));
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

    openEditor() {
        this.currentItems = [];
        this.selectedProduct = null;
        
        const form = document.getElementById('budget-form-main');
        if (form) form.reset();

        document.getElementById('budget-number').value = this.generateBudgetNumber();
        document.getElementById('budget-date-today').value = new Date().toLocaleDateString();
        
        this.populateClientsSelect();
        this.renderItemsList();
        this.calculateTotals();
        
        document.getElementById('item-config-panel').classList.add('hidden');
        UI.openModal('budget-editor-modal');
    },

    generateBudgetNumber() {
        const count = this.list.length + 1;
        return `PR-${count.toString().padStart(5, '0')}`;
    },

    populateClientsSelect() {
        const select = document.getElementById('budget-client-select');
        if (!select) return;
        
        const currentValue = select.value;
        select.innerHTML = '<option value="">-- Seleccionar --</option>';
        
        const clients = (typeof Clients !== 'undefined' && Clients.list) ? Clients.list : [];
        
        clients.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.name;
            select.appendChild(opt);
        });

        if (currentValue) select.value = currentValue;
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

    addItemToList() {
        if (!this.selectedProduct) return;

        const qty = parseInt(document.getElementById('item-qty').value) || 1;
        const iva = parseFloat(document.getElementById('item-iva').value) || 0;
        const profit = parseFloat(document.getElementById('item-profit').value) || 0;

        // Total price calculation: Cost * (1 + profit%)
        const costUsd = parseFloat(this.selectedProduct.price_usd) || 0;
        const profitAmount = costUsd * (profit / 100);
        const pricePerUnitUsd = costUsd + profitAmount;
        
        this.currentItems.push({
            id: Date.now(),
            productId: this.selectedProduct.id,
            name: this.selectedProduct.name,
            costUsd: costUsd,
            price_usd: pricePerUnitUsd,
            quantity: qty,
            ivaPercent: iva,
            subtotalUsd: pricePerUnitUsd * qty
        });

        this.renderItemsList();
        this.calculateTotals();
        
        // Reset item selector
        this.selectedProduct = null;
        document.getElementById('budget-item-search').value = '';
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
        const clientSelect = document.getElementById('budget-client-select');
        const clientId = clientSelect.value;
        const clientName = clientSelect.options[clientSelect.selectedIndex]?.text;

        if (!clientId) {
            UI.showToast('Por favor, selecciona un cliente.', 'error');
            return;
        }

        if (this.currentItems.length === 0) {
            UI.showToast('Agrega al menos un producto al presupuesto.', 'error');
            return;
        }

        const btnSave = document.querySelector('#budget-form-main button[type="submit"]');
        if (btnSave) btnSave.disabled = true;

        const newBudget = {
            number: document.getElementById('budget-number').value,
            date: new Date().toISOString(),
            clientId,
            clientName,
            validity: document.getElementById('budget-validity').value,
            observations: document.getElementById('budget-observations').value,
            items: [...this.currentItems],
            totalUsd: this.totals.usd,
            totalArs: this.totals.ars,
            rate: Exchange.rate
        };

        try {
            const saved = await DB.insert('budgets', newBudget);
            await this.loadBudgets();
            this.renderGrid();
            UI.closeModal('budget-editor-modal');
            UI.showToast('Presupuesto guardado con éxito.', 'success');
            
            // Open preview automatically
            this.openPreview(saved.id);
        } catch (error) {
            console.error('Budgets: Error saving:', error);
            UI.showToast('Error al guardar presupuesto', 'error');
        } finally {
            if (btnSave) btnSave.disabled = false;
        }
    },

    renderGrid() {
        const grid = document.getElementById('budgets-grid');
        if (!grid) return;

        if (this.list.length === 0) {
            grid.innerHTML = `<div class="empty-state text-center text-muted"><i class='bx bx-file' style='font-size: 3rem;'></i><p>No hay presupuestos disponibles.</p></div>`;
            return;
        }

        grid.innerHTML = '';
        this.list.forEach(b => {
            const card = document.createElement('div');
            card.className = 'budget-card glass-panel';
            card.innerHTML = `
                <div class="budget-card-header">
                    <span class="budget-num">${b.number}</span>
                    <span class="budget-date">${new Date(b.date).toLocaleDateString()}</span>
                </div>
                <div class="budget-card-body">
                    <h3 class="client-name">${b.clientName}</h3>
                    <div class="budget-totals">
                        <div class="total-main">${UI.formatCurrency(b.totalArs, 'ARS')}</div>
                        <div class="total-sub">${UI.formatCurrency(b.totalUsd, 'USD')}</div>
                    </div>
                </div>
                <div class="budget-card-footer">
                    <button class="btn btn-ghost btn-sm" onclick="Budgets.openPreview('${b.id}')"><i class='bx bx-show'></i> Ver</button>
                    <button class="icon-btn danger" onclick="Budgets.deleteBudget('${b.id}')"><i class='bx bx-trash'></i></button>
                </div>
            `;
            grid.appendChild(card);
        });
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
                <p><strong>Cliente:</strong> ${b.clientName}</p>
                <p><strong>Validez:</strong> ${b.validity} días</p>
            </div>

            <table class="budget-pdf-table">
                <thead>
                    <tr>
                        <th>Descripción</th>
                        <th>Cant.</th>
                        <th>Precio (USD)</th>
                        <th>Subtotal (USD)</th>
                    </tr>
                </thead>
                <tbody>
                    ${b.items.map(item => `
                        <tr>
                            <td>${item.name}</td>
                            <td>${item.quantity}</td>
                            <td>${UI.formatCurrency(item.price_usd, 'USD')}</td>
                            <td>${UI.formatCurrency(item.subtotalUsd, 'USD')}</td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="3" style="text-align: right"><strong>TOTAL USD</strong></td>
                        <td><strong>${UI.formatCurrency(b.totalUsd, 'USD')}</strong></td>
                    </tr>
                    <tr class="highlight">
                        <td colspan="3" style="text-align: right"><strong>TOTAL ARS</strong></td>
                        <td><strong>${UI.formatCurrency(b.totalArs, 'ARS')}</strong></td>
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
