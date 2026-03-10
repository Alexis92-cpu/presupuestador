/* ===================================================
   modal-system.js – Gestión Proactiva de Modales (v5.5)
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

    function init() {
        // Escucha global de clicks para delegación
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
                if (Date.now() - _lastAction < 400) return;
                close(e.target.id);
            }
        });

        // Escape
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && _stack.length > 0) {
                close(_stack[_stack.length - 1]);
            }
        });

        console.log('ModalSystem v5.5 Ready.');
    }

    return { open: open, close: close, closeAll: closeAll, init: init };
})();
