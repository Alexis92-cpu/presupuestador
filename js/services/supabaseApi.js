// MOCK DB for Supabase. 
// Para funcionar REALMENTE con Supabase vía Web, es necesario crear un proyecto en supabase.com
// e insertar la URL y KEY pública aquí. Para no romper la app si el usuario no tiene credenciales todavía
// vamos a usar LocalStorage como "Fallback", simulando el comportamiento Asíncrono de Supabase.

const SUPABASE_URL = 'https://wrvjdyvwaejuguedqwsa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndydmpkeXZ3YWVqdWd1ZWRxd3NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MTEwNzksImV4cCI6MjA4ODQ4NzA3OX0.irf_mFgAaAoNWachMKpwf5WWUHSVMIf3_j5LA5O9lSI';

let supabaseClient = null;

// Check if Supabase library is loaded and URL is provided
if (SUPABASE_URL && SUPABASE_URL !== 'TU_SUPABASE_URL_AQUI' && typeof window.supabase !== 'undefined') {
    // Pro-Tip: Supabase Anon Keys typically start with 'eyJ...'
    if (!SUPABASE_ANON_KEY.startsWith('eyJ')) {
        console.warn("ADVERTENCIA: Tu SUPABASE_ANON_KEY parece ser incorrecta (debería empezar con 'eyJ'). Revisa tu panel de Supabase.");
    }
    
    try {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log("Supabase Client Initialized successfully");
    } catch (e) {
        console.error("Failed to initialize Supabase client:", e);
    }
} else {
    console.warn("Supabase library not found or URL not configured. Using LocalStorage fallback.");
}

// Emulate async Supabase behaviour using local storage as fallback if no credentials are provided.
const DB = {
    
    async get(table) {
        let results = [];
        const localResults = await this.localGet(table);
        
        if (supabaseClient) {
            try {
                const { data, error } = await supabaseClient.from(table).select('*');
                if (!error && data) {
                    results = data;
                } else if (error) {
                    console.warn(`Supabase get error in "${table}", using local only:`, error);
                }
            } catch (err) {
                console.error(`Supabase connection error in "${table}":`, err);
            }
        }

        // Merge results: Combine Supabase data with Local data, avoiding duplicates by 'id'
        const merged = [...results];
        localResults.forEach(item => {
            if (!merged.find(m => m.id === item.id)) {
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
            }, 100);
        });
    },

    async insert(table, payload) {
        if (supabaseClient) {
            try {
                const { data, error } = await supabaseClient.from(table).insert([payload]).select();
                if (error) throw error;
                return data[0];
            } catch (error) {
                console.error(`DB: Error en insert Supabase para "${table}", fallback local:`, error);
                return this.localInsert(table, payload);
            }
        }
        return this.localInsert(table, payload);
    },

    localInsert(table, payload) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const list = JSON.parse(localStorage.getItem(`netpoint_${table}`) || '[]');
                payload.id = payload.id || Date.now().toString();
                list.push(payload);
                localStorage.setItem(`netpoint_${table}`, JSON.stringify(list));
                resolve(payload);
            }, 100);
        });
    },

    async update(table, id, payload) {
        if (supabaseClient) {
            try {
                const { data, error } = await supabaseClient.from(table).update(payload).eq('id', id).select();
                if (error) throw error;
                return data[0];
            } catch (error) {
                console.error(`DB: Error en update Supabase para "${table}", fallback local:`, error);
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
            }, 100);
        });
    },

    async remove(table, id) {
        if (supabaseClient) {
            const { error } = await supabaseClient.from(table).delete().eq('id', id);
            if (error) {
                console.error(`DB: Error removing from ${table}:`, error);
                throw error;
            }
            return true;
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
            }, 100);
        });
    }
};
