/* ===================================================
   card-actions.js – Delegación de eventos para tarjetas
   Responsabilidad Única: manejar clicks en cards
   =================================================== */
'use strict';

(function () {

    /**
     * Delegación de eventos global para botones de acción en tarjetas.
     * Usa data-attributes en vez de onclick inline para evitar
     * problemas de propagación y compatibilidad.
     */
    document.addEventListener('click', function (e) {
        // Buscar el botón más cercano con data-action
        var btn = e.target.closest('[data-action]');
        if (!btn) return;

        // Detener propagación para que no se active el click de la tarjeta
        e.stopPropagation();
        e.preventDefault();

        var action = btn.getAttribute('data-action');
        var id = parseInt(btn.getAttribute('data-id'), 10);

        if (!action || isNaN(id)) return;

        switch (action) {
            case 'edit':
                if (typeof openEditPresupuesto === 'function') {
                    openEditPresupuesto(id);
                }
                break;

            case 'preview':
                if (typeof previewPresupuesto === 'function') {
                    previewPresupuesto(id);
                }
                break;

            case 'delete':
                if (typeof deletePresupuesto === 'function') {
                    deletePresupuesto(id);
                }
                break;

            default:
                console.warn('CardActions: acción desconocida:', action);
        }
    });

    console.log('CardActions (delegación) inicializado ✓');
})();
