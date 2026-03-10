/* ===================================================
   compat.js – Soporte para navegadores antiguos
   =================================================== */
'use strict';

(function () {
    // Polyfill: Element.closest
    if (!Element.prototype.closest) {
        Element.prototype.closest = function (s) {
            var el = this;
            do {
                if (el.matches(s)) return el;
                el = el.parentElement || el.parentNode;
            } while (el !== null && el.nodeType === 1);
            return null;
        };
    }

    // Polyfill: Element.matches
    if (!Element.prototype.matches) {
        Element.prototype.matches =
            Element.prototype.msMatchesSelector ||
            Element.prototype.webkitMatchesSelector;
    }

    // Polyfill: NodeList.forEach
    if (!NodeList.prototype.forEach) {
        NodeList.prototype.forEach = Array.prototype.forEach;
    }

    // Polyfill: Array.from
    if (!Array.from) {
        Array.from = function (iterable) {
            return [].slice.call(iterable);
        };
    }

    // Polyfill: Object.assign
    if (typeof Object.assign !== 'function') {
        Object.assign = function (target) {
            if (target == null) throw new TypeError('Cannot convert undefined or null to object');
            target = Object(target);
            for (var i = 1; i < arguments.length; i++) {
                var source = arguments[i];
                if (source != null) {
                    for (var key in source) {
                        if (Object.prototype.hasOwnProperty.call(source, key)) {
                            target[key] = source[key];
                        }
                    }
                }
            }
            return target;
        };
    }

    // Polyfill: String.prototype.includes
    if (!String.prototype.includes) {
        String.prototype.includes = function (search, start) {
            return this.indexOf(search, start || 0) !== -1;
        };
    }

    // Polyfill: Array.prototype.find
    if (!Array.prototype.find) {
        Array.prototype.find = function (predicate) {
            for (var i = 0; i < this.length; i++) {
                if (predicate(this[i], i, this)) return this[i];
            }
            return undefined;
        };
    }

    // Polyfill: Array.prototype.findIndex
    if (!Array.prototype.findIndex) {
        Array.prototype.findIndex = function (predicate) {
            for (var i = 0; i < this.length; i++) {
                if (predicate(this[i], i, this)) return i;
            }
            return -1;
        };
    }

    // Polyfill: Promise (basic detection)
    if (typeof Promise === 'undefined') {
        console.warn('Este navegador no soporta Promise. Algunas funciones no estarán disponibles.');
    }

    // Feature detection logging
    var features = {
        flexbox: CSS.supports ? CSS.supports('display', 'flex') : true,
        grid: CSS.supports ? CSS.supports('display', 'grid') : false,
        backdropFilter: CSS.supports ? CSS.supports('backdrop-filter', 'blur(1px)') : false,
        cssVariables: CSS.supports ? CSS.supports('color', 'var(--test)') : false
    };

    window.__browserFeatures = features;
    console.log('Soporte del navegador:', features);
})();
