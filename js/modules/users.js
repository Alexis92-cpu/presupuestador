


const Users = {
    list: [],

    initialized: false,
    async init() {
        if (!this.initialized) {
            this.setupListeners();
            this.initialized = true;
        }
        await this.loadUsers();
    },

    async loadUsers() {
        try {
            this.list = await DB.get('users');
            this.renderTable();
        } catch (error) {
            UI.showToast('Error cargando usuarios', 'error');
        }
    },

    setupListeners() {
        const btnAdd = document.getElementById('btn-add-user');
        const form = document.getElementById('user-form');
        const searchInput = document.getElementById('user-search');

        if (btnAdd) btnAdd.addEventListener('click', () => this.openModalForAdd());
        
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                this.saveUserFromForm();
            });
        }

        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.filterList(e.target.value));
        }
    },

    openModalForAdd() {
        const form = document.getElementById('user-form');
        if (form) form.reset();
        document.getElementById('user-id').value = '';
        document.getElementById('usr-password').required = true;
        document.getElementById('user-modal-title').textContent = 'Agregar Usuario';
        UI.openModal('user-modal');
    },

    openModalForEdit(id) {
        const user = this.list.find(u => u.id == id);
        if (!user) return;

        const form = document.getElementById('user-form');
        if (form) form.reset();

        document.getElementById('user-id').value = user.id;
        document.getElementById('usr-fullname').value = user.fullname;
        document.getElementById('usr-username').value = user.username;
        document.getElementById('usr-role').value = user.role || 'user';
        
        // Disable required for password on edit mode
        document.getElementById('usr-password').required = false;

        document.getElementById('user-modal-title').textContent = 'Editar Usuario';
        UI.openModal('user-modal');
    },

    async saveUserFromForm() {
        const idInput = document.getElementById('user-id').value;
        const passwordInput = document.getElementById('usr-password').value;
        const payload = {
            fullname: document.getElementById('usr-fullname').value,
            username: document.getElementById('usr-username').value,
            role: document.getElementById('usr-role').value
        };

        if (passwordInput) {
            // Only update password if user typed a new one. In a real scenario it should be hashed.
            payload.password = passwordInput;
        }

        const btn = document.querySelector('#user-form button[type="submit"]');
        btn.disabled = true;
        btn.innerHTML = 'Guardando...';

        try {
            if (idInput) {
                await DB.update('users', idInput, payload);
                UI.showToast('Usuario actualizado.', 'success');
            } else {
                await DB.insert('users', payload);
                UI.showToast('Usuario creado exitosamente.', 'success');
            }
            await this.loadUsers();
            UI.closeModal('user-modal');
        } catch (error) {
            UI.showToast('Error al guardar', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = 'Guardar Usuario';
        }
    },

    async deleteUser(id) {
        if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
        
        try {
            await DB.remove('users', id);
            await this.loadUsers();
            UI.showToast('Usuario eliminado.', 'info');
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
        const filtered = this.list.filter(u => 
            u.fullname.toLowerCase().includes(lowerQuery) || 
            u.username.toLowerCase().includes(lowerQuery)
        );
        this.renderTable(filtered);
    },

    renderTable(data = this.list) {
        const tbody = document.getElementById('users-list');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Aún no hay usuarios</td></tr>`;
            return;
        }

        data.forEach(u => {
            const roleBadge = u.role === 'admin' 
                ? `<span style="color: var(--warning); font-weight: 500;">Administrador</span>` 
                : `<span class="text-muted">Vendedor</span>`;
                
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${u.fullname}</strong></td>
                <td>${u.username}</td>
                <td>${roleBadge}</td>
                <td>
                    <button class="icon-btn edit-user-btn" data-id="${u.id}" title="Editar">
                        <i class='bx bx-edit-alt'></i>
                    </button>
                    ${u.username !== 'admin' ? `
                    <button class="icon-btn delete-user-btn" data-id="${u.id}" title="Eliminar">
                        <i class='bx bx-trash'></i>
                    </button>
                    ` : ''}
                </td>
            `;
            tbody.appendChild(tr);
        });

        document.querySelectorAll('.edit-user-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.openModalForEdit(e.currentTarget.dataset.id));
        });

        document.querySelectorAll('.delete-user-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.deleteUser(e.currentTarget.dataset.id));
        });
    }
};
