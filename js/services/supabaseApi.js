// MOCK DB for Supabase. 
// Para funcionar REALMENTE con Supabase vía Web, es necesario crear un proyecto en supabase.com
// e insertar la URL y KEY pública aquí. Para no romper la app si el usuario no tiene credenciales todavía
// vamos a usar LocalStorage como "Fallback", simulando el comportamiento Asíncrono de Supabase.

const SUPABASE_URL = 'https://wrvjdyvwaejuguedqwsa.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1b-kU32O9IMKtrZdyiHN8Q_gHIAo8wd';

let supabaseClient = null;

// Check if Supabase library is loaded and URL is provided
if (SUPABASE_URL && SUPABASE_URL !== 'TU_SUPABASE_URL_AQUI' && typeof window.supabase !== 'undefined') {
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
        if (supabaseClient) {
            try {
                const { data, error } = await supabaseClient.from(table).select('*');
                if (error) throw error;
                return data;
            } catch (err) {
                console.error(`DB: Error fetching from ${table}, using fallback:`, err);
                return this.localGet(table);
            }
        } else {
            return this.localGet(table);
        }
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
            } catch (err) {
                console.error(`DB: Error inserting into ${table}, using fallback:`, err);
                return this.localInsert(table, payload);
            }
        } else {
            return this.localInsert(table, payload);
        }
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
            } catch (err) {
                console.error(`DB: Error updating ${table}, using fallback:`, err);
                return this.localUpdate(table, id, payload);
            }
        } else {
            return this.localUpdate(table, id, payload);
        }
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
            try {
                const { error } = await supabaseClient.from(table).delete().eq('id', id);
                if (error) throw error;
                return true;
            } catch (err) {
                console.error(`DB: Error removing from ${table}, using fallback:`, err);
                return this.localRemove(table, id);
            }
        } else {
            return this.localRemove(table, id);
        }
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
