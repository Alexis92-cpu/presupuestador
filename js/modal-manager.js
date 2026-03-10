/* ===================================================
   modal-manager.js – Gestión centralizada de modales (v5.3)
   =================================================== */
'use strict';

var ModalManager = (function () {

    var _openStack = [];
    var _lastOpenTime = 0; // Para evitar "ghost clicks" en transiciones

    function open(modalId) {
        var overlay = document.getElementById(modalId);
        if (!overlay) return;

        overlay.classList.remove('hidden');
        overlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';

        if (_openStack.indexOf(modalId) === -1) {
            _openStack.push(modalId);
        }

        _lastOpenTime = Date.now(); // Marca el tiempo de apertura

        var firstFocusable = overlay.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (firstFocusable) {
            requestAnimationFrame(function () {
                firstFocusable.focus();
            });
        }
    }

    function close(modalId) {
        var overlay = document.getElementById(modalId);
        if (!overlay) return;

        overlay.classList.add('hidden');
        overlay.setAttribute('aria-hidden', 'true');

        var idx = _openStack.indexOf(modalId);
        if (idx !== -1) _openStack.splice(idx, 1);

        if (_openStack.length === 0) {
            document.body.style.overflow = '';
        }
    }

    /**
     * Cierra todos y abre uno nuevo
     */
    function switchTo(modalId) {
        var stackCopy = _openStack.slice();
        stackCopy.forEach(function (id) {
            close(id);
        });
        // Pequeño delay para que el navegador procese el render antes de abrir el nuevo
        setTimeout(function () {
            open(modalId);
        }, 10);
    }

    function init() {
        // 1. Delegación para cerrar al clickear overlay
        document.addEventListener('click', function (e) {
            if (e.target.classList && e.target.classList.contains('modal-overlay')) {
                // Evitar cerrar si el modal se acaba de abrir (previene ghost clicks en transiciones)
                if (Date.now() - _lastOpenTime < 300) return;

                close(e.target.id);
            }
        });

        // 2. Delegación para botones de cierre con data-modal-close
        document.addEventListener('click', function (e) {
            var btn = e.target.closest('[data-modal-close]');
            if (btn) {
                var targetId = btn.getAttribute('data-modal-close');
                close(targetId);
            }
        });

        // 3. Escape key
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && _openStack.length > 0) {
                close(_openStack[_openStack.length - 1]);
            }
        });

        console.log('ModalManager v5.3 inic.');
    }

    return {
        open: open,
        close: close,
        switchTo: switchTo,
        init: init
    };

})();
