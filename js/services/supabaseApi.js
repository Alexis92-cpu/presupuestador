// MOCK/REAL DB Service for Supabase with LocalStorage Fallback.
const SUPABASE_URL = 'https://wrvjdyvwaejuguedqwsa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndydmpkeXZ3YWVqdWd1ZWRxd3NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MTEwNzksImV4cCI6MjA4ODQ4NzA3OX0.irf_mFgAaAoNWachMKpwf5WWUHSVMIf3_j5LA5O9lSI';

let supabaseClient = null;

// Initialización segura
try {
    if (SUPABASE_URL && SUPABASE_URL !== 'TU_SUPABASE_URL_AQUI' && typeof window.supabase !== 'undefined') {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log("Supabase: Cliente inicializado correctamente.");
    } else {
        console.warn("Supabase: Librería no encontrada o URL no configurada. Usando LocalStorage.");
    }
} catch (e) {
    console.error("Supabase: Error fatal en inicialización:", e);
}

const DB = {
    async get(table) {
        let results = [];
        const localResults = await this.localGet(table);
        
        if (supabaseClient) {
            try {
                const { data, error } = await supabaseClient.from(table).select('*');
                if (error) {
                    console.error(`Supabase: Error leyendo "${table}":`, error.message);
                    if (error.code === 'PGRST204') {
                        console.error("Tip: Es probable que la tabla o columnas no existan en Supabase.");
                    }
                } else if (data) {
                    results = data;
                }
            } catch (err) {
                console.error(`Supabase: Error de conexión en "${table}":`, err);
            }
        }

        // Unión de datos: Preferimos Supabase, agregamos locales si no existen (comparación flexible de ID)
        const merged = [...results];
        localResults.forEach(item => {
            // Usamos == para permitir comparación entre IDs de tipo string y number indistintamente
            if (!merged.find(m => m.id == item.id)) {
                merged.push(item);
            }
        });

        return merged;
    },

    localGet(table) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const data = localStorage.getItem(`netpoint_${table}`) || '[]';
                resolve(JSON.parse(data));
            }, 50);
        });
    },

    async insert(table, payload) {
        if (supabaseClient) {
            try {
                // Notar: insert() en v2 no devuelve datos por defecto a menos que se use .select()
                const { data, error } = await supabaseClient.from(table).insert([payload]).select();
                if (error) throw error;
                
                // Si data está vacío (común con RLS sin política de SELECT), retornamos el payload original + id
                if (!data || data.length === 0) {
                   console.warn("Supabase: Insert exitoso pero no se retornaron datos. Posible falta de política SELECT.");
                   return { id: payload.id || Date.now().toString(), ...payload };
                }
                return data[0];
            } catch (error) {
                console.error(`DB: Error en insert Supabase ("${table}"):`, error.message || error);
                return this.localInsert(table, payload);
            }
        }
        return this.localInsert(table, payload);
    },

    localInsert(table, payload) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const list = JSON.parse(localStorage.getItem(`netpoint_${table}`) || '[]');
                const newId = payload.id || Date.now().toString();
                const newItem = { ...payload, id: newId };
                list.push(newItem);
                localStorage.setItem(`netpoint_${table}`, JSON.stringify(list));
                resolve(newItem);
            }, 50);
        });
    },

    async update(table, id, payload) {
        if (supabaseClient) {
            try {
                const { data, error } = await supabaseClient.from(table).update(payload).eq('id', id).select();
                if (error) throw error;
                
                if (!data || data.length === 0) {
                    return { id, ...payload };
                }
                return data[0];
            } catch (error) {
                console.error(`DB: Error en update Supabase ("${table}"):`, error.message || error);
                return this.localUpdate(table, id, payload);
            }
        }
        return this.localUpdate(table, id, payload);
    },

    localUpdate(table, id, payload) {
        return new Promise((resolve) => {
            setTimeout(() => {
                let list = JSON.parse(localStorage.getItem(`netpoint_${table}`) || '[]');
                list = list.map(item => item.id == id ? { ...item, ...payload } : item);
                localStorage.setItem(`netpoint_${table}`, JSON.stringify(list));
                resolve({ id, ...payload });
            }, 50);
        });
    },

    async remove(table, id) {
        if (supabaseClient) {
            try {
                const { error } = await supabaseClient.from(table).delete().eq('id', id);
                if (error) throw error;
                return true;
            } catch (error) {
                console.error(`DB: Error en remove Supabase ("${table}"):`, error.message || error);
                return this.localRemove(table, id);
            }
        }
        return this.localRemove(table, id);
    },

    localRemove(table, id) {
        return new Promise((resolve) => {
            setTimeout(() => {
                let list = JSON.parse(localStorage.getItem(`netpoint_${table}`) || '[]');
                list = list.filter(item => item.id != id);
                localStorage.setItem(`netpoint_${table}`, JSON.stringify(list));
                resolve(true);
            }, 50);
        });
    }
};

// Exponer globalmente para otros scripts
window.DB = DB;
