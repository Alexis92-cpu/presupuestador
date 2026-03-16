


const Clients = {
    list: [],

    async init() {
        this.setupListeners();
        await this.loadClients();
    },

    async loadClients() {
        try {
            this.list = await DB.get('clients');
            this.renderTable();
        } catch (error) {
            UI.showToast('Error cargando clientes', 'error');
            console.error(error);
        }
    },

    setupListeners() {
        const btnAdd = document.getElementById('btn-add-client');
        const searchInput = document.getElementById('client-search');
        const form = document.getElementById('client-form');

        if (btnAdd) btnAdd.addEventListener('click', () => this.openModalForAdd());
        
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.filterList(e.target.value));
        }

        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.saveClientFromForm();
            });
        }
    },

    openModalForAdd() {
        const form = document.getElementById('client-form');
        if (form) form.reset();
        document.getElementById('client-id').value = '';
        document.getElementById('client-modal-title').textContent = 'Agregar Cliente';
        UI.openModal('client-modal');
    },

    openModalForEdit(id) {
        const client = this.list.find(c => c.id == id);
        if (!client) return;

        const form = document.getElementById('client-form');
        if (form) form.reset();

        document.getElementById('client-id').value = client.id;
        document.getElementById('cli-name').value = client.name;
        document.getElementById('cli-phone').value = client.phone || '';
        document.getElementById('cli-email').value = client.email || '';

        document.getElementById('client-modal-title').textContent = 'Editar Cliente';
        UI.openModal('client-modal');
    },

    async saveClientFromForm() {
        const idInput = document.getElementById('client-id').value;
        const payload = {
            name: document.getElementById('cli-name').value,
            phone: document.getElementById('cli-phone').value,
            email: document.getElementById('cli-email').value
        };

        const btn = document.querySelector('#client-form button[type="submit"]');
        btn.disabled = true;
        btn.innerHTML = 'Guardando...';

        try {
            if (idInput) {
                await DB.update('clients', idInput, payload);
                UI.showToast('Cliente actualizado.', 'success');
            } else {
                await DB.insert('clients', payload);
                UI.showToast('Cliente creado exitosamente.', 'success');
            }
            await this.loadClients();
            UI.closeModal('client-modal');
        } catch (error) {
            UI.showToast('Error al guardar', 'error');
            console.error(error);
        } finally {
            btn.disabled = false;
            btn.innerHTML = 'Guardar Cliente';
        }
    },

    async deleteClient(id) {
        if (!confirm('¿Estás seguro de eliminar este cliente?')) return;
        
        try {
            await DB.remove('clients', id);
            await this.loadClients();
            UI.showToast('Cliente eliminado.', 'info');
        } catch (error) {
            UI.showToast('Error al eliminar', 'error');
        }
    },

    filterList(query) {
        const tbody = document.getElementById('clients-list');
        if (!query) {
            this.renderTable(this.list);
            return;
        }

        const lowerQuery = query.toLowerCase();
        const filtered = this.list.filter(c => 
            c.name.toLowerCase().includes(lowerQuery) || 
            (c.email && c.email.toLowerCase().includes(lowerQuery))
        );
        this.renderTable(filtered);
    },

    renderTable(data = this.list) {
        const tbody = document.getElementById('clients-list');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Aún no hay clientes</td></tr>`;
            return;
        }

        data.forEach(c => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${c.name}</strong></td>
                <td>${c.phone || '-'}</td>
                <td><a href="mailto:${c.email}">${c.email || '-'}</a></td>
                <td>
                    <button class="icon-btn edit-client-btn" data-id="${c.id}" title="Editar">
                        <i class='bx bx-edit-alt'></i>
                    </button>
                    <button class="icon-btn delete-client-btn" data-id="${c.id}" title="Eliminar">
                        <i class='bx bx-trash'></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        document.querySelectorAll('.edit-client-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.openModalForEdit(e.currentTarget.dataset.id));
        });

        document.querySelectorAll('.delete-client-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.deleteClient(e.currentTarget.dataset.id));
        });
    }
};
