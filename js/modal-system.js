/* ===================================================
   modal-system.js – Gestión Proactiva de Modales (v5.6)
   =================================================== */
'use strict';

var ModalSystem = (function () {
    var _stack = [];
    var _lastAction = 0;

    function open(id) {
        if (!id) return;
        var el = document.getElementById(id);
        if (!el) return;

        el.classList.remove('hidden');
        el.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';

        if (_stack.indexOf(id) === -1) _stack.push(id);
        _lastAction = Date.now();
    }

    function close(id) {
        if (!id) return;
        var el = document.getElementById(id);
        if (!el) return;

        el.classList.add('hidden');
        el.setAttribute('aria-hidden', 'true');

        var idx = _stack.indexOf(id);
        if (idx !== -1) _stack.splice(idx, 1);

        if (_stack.length === 0) {
            document.body.style.overflow = '';
        }
        _lastAction = Date.now();
    }

    function closeAll() {
        var copy = _stack.slice();
        copy.forEach(function (id) { close(id); });
    }

    /**
     * Transición segura entre modales (v5.6)
     * Usa un timeout para evitar el bubbling del click actual.
     */
    function switchTo(fromId, toId) {
        close(fromId);
        setTimeout(function () {
            open(toId);
        }, 150); // Delay preventivo para evitar el "click-through"
    }

    function init() {
        document.addEventListener('click', function (e) {
            // 1. Delegación para botones de cierre [data-modal-close]
            var closeBtn = e.target.closest('[data-modal-close]');
            if (closeBtn) {
                var mid = closeBtn.getAttribute('data-modal-close');
                close(mid);
                return;
            }

            // 2. Click en overlay (fondo)
            if (e.target.classList.contains('modal-overlay')) {
                // Evitar clicks accidentales durante transiciones rápidas
                var delta = Date.now() - _lastAction;
                if (delta < 500) return; // Aumentado a 500ms
                close(e.target.id);
            }
        });

        // Escape
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && _stack.length > 0) {
                close(_stack[_stack.length - 1]);
            }
        });

        console.log('ModalSystem v6.0.01 Ready.');
    }

    return { open: open, close: close, closeAll: closeAll, switchTo: switchTo, init: init };
})();
