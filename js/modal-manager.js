/* ===================================================
   modal-manager.js – Gestión centralizada de modales
   Responsabilidad Única: abrir, cerrar, manejar eventos
   =================================================== */
'use strict';

var ModalManager = (function () {

    // Pila de modales abiertos (para manejar múltiples modales)
    var _openStack = [];

    /**
     * Abre un modal por su ID
     * @param {string} modalId - ID del elemento modal-overlay
     */
    function open(modalId) {
        var overlay = document.getElementById(modalId);
        if (!overlay) {
            console.error('ModalManager: No se encontró el modal con id "' + modalId + '"');
            return;
        }

        overlay.classList.remove('hidden');
        overlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';

        // Añadir a la pila
        if (_openStack.indexOf(modalId) === -1) {
            _openStack.push(modalId);
        }

        // Focus trap: enfocar el primer elemento del modal
        var firstFocusable = overlay.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (firstFocusable) {
            requestAnimationFrame(function () {
                firstFocusable.focus();
            });
        }

        console.log('Modal abierto:', modalId);
    }

    /**
     * Cierra un modal por su ID
     * @param {string} modalId - ID del elemento modal-overlay
     */
    function close(modalId) {
        var overlay = document.getElementById(modalId);
        if (!overlay) return;

        overlay.classList.add('hidden');
        overlay.setAttribute('aria-hidden', 'true');

        // Remover de la pila
        var idx = _openStack.indexOf(modalId);
        if (idx !== -1) _openStack.splice(idx, 1);

        // Solo restaurar overflow si no hay más modales abiertos
        if (_openStack.length === 0) {
            document.body.style.overflow = '';
        }

        console.log('Modal cerrado:', modalId);
    }

    /**
     * Cierra todos los modales abiertos
     */
    function closeAll() {
        // Copiar array para evitar mutación durante iteración
        var toClose = _openStack.slice();
        toClose.forEach(function (id) {
            close(id);
        });
    }

    /**
     * Transición: cierra un modal y abre otro
     * @param {string} closeId - Modal a cerrar
     * @param {string} openId - Modal a abrir
     */
    function transition(closeId, openId) {
        var overlayClose = document.getElementById(closeId);
        if (overlayClose) {
            overlayClose.classList.add('hidden');
            overlayClose.setAttribute('aria-hidden', 'true');
            var idx = _openStack.indexOf(closeId);
            if (idx !== -1) _openStack.splice(idx, 1);
        }
        // Abrir inmediatamente el siguiente (sin setTimeout)
        open(openId);
    }

    /**
     * Inicializar event listeners globales
     */
    function init() {
        // Cerrar al clickear overlay (delegación de eventos)
        document.addEventListener('click', function (e) {
            if (e.target.classList && e.target.classList.contains('modal-overlay') && !e.target.classList.contains('hidden')) {
                close(e.target.id);
            }
        });

        // Cerrar con Escape
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && _openStack.length > 0) {
                var lastModal = _openStack[_openStack.length - 1];
                close(lastModal);
            }
        });

        // Configurar atributos ARIA iniciales
        var overlays = document.querySelectorAll('.modal-overlay');
        overlays.forEach(function (overlay) {
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            if (overlay.classList.contains('hidden')) {
                overlay.setAttribute('aria-hidden', 'true');
            }
        });

        console.log('ModalManager inicializado ✓');
    }

    // API pública
    return {
        open: open,
        close: close,
        closeAll: closeAll,
        transition: transition,
        init: init
    };

})();
