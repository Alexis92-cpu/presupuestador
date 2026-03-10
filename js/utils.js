/* ===================================================
   utils.js – Funciones auxiliares y formateadores
   =================================================== */
'use strict';

var Utils = (function () {

    function fmt(n, d = 2) {
        if (isNaN(n) || n === null) return '0.00';
        return Number(n).toLocaleString('es-AR', { minimumFractionDigits: d, maximumFractionDigits: d });
    }

    function fmtARS(n) {
        return '$ ' + fmt(n);
    }

    function fmtUSD(n) {
        return 'U$S ' + fmt(n);
    }

    function toUSD(ars, rate) {
        if (!ars || !rate || rate <= 0) return 0;
        return ars / rate;
    }

    function toARS(usd, rate) {
        if (!usd || !rate) return 0;
        return usd * rate;
    }

    function formatDate(iso) {
        if (!iso) return '—';
        var d = new Date(iso);
        if (isNaN(d.getTime())) return iso;
        return d.toLocaleDateString('es-AR');
    }

    function addDays(iso, days) {
        var d = new Date(iso);
        d.setDate(d.getDate() + (parseInt(days) || 15));
        return d.toISOString().split('T')[0];
    }

    return {
        fmt: fmt,
        fmtARS: fmtARS,
        fmtUSD: fmtUSD,
        toUSD: toUSD,
        toARS: toARS,
        formatDate: formatDate,
        addDays: addDays
    };

})();
