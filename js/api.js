/* ===================================================
   api.js – Capa de datos y sincronización Supabase
   =================================================== */
'use strict';

var API = (function () {
    const URL = "https://wrvjdyvwaejuguedqwsa.supabase.co";
    const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndydmpkeXZ3YWVqdWd1ZWRxd3NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MTEwNzksImV4cCI6MjA4ODQ4NzA3OX0.irf_mFgAaAoNWachMKpwf5WWUHSVMIf3_j5LA5O9lSI";
    var _client = null;

    function getClient() {
        if (!_client && window.supabase) {
            try {
                _client = window.supabase.createClient(URL, KEY);
            } catch (e) {
                console.error("API error:", e);
            }
        }
        return _client;
    }

    async function upload(db) {
        const client = getClient();
        if (!client || !db.usuarios) return false;
        try {
            db.lastUpdate = Date.now();
            await client.from('app_data').upsert({ id: 'main_config', data: db });
            return true;
        } catch (e) {
            console.error("Upload error:", e);
            return false;
        }
    }

    async function download() {
        const client = getClient();
        if (!client) return null;
        try {
            const { data, error } = await client
                .from('app_data')
                .select('data')
                .eq('id', 'main_config')
                .single();
            if (error && error.code !== 'PGRST116') throw error;
            return data ? data.data : null;
        } catch (e) {
            console.error("Download error:", e);
            return null;
        }
    }

    return {
        upload: upload,
        download: download,
        getClient: getClient
    };
})();
