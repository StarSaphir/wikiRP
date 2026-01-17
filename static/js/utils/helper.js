// utils/helpers.js - Fonctions utilitaires diverses

/**
 * Générer un ID unique
 * @param {string} prefix - Préfixe optionnel
 * @returns {string}
 */
export function generateId(prefix = 'id') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Slugifier un texte (transformer en slug URL-friendly)
 * @param {string} text - Texte à slugifier
 * @returns {string}
 */
export function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')           // Espaces -> tirets
        .replace(/[^\w\-]+/g, '')       // Supprimer non-alphanumériques
        .replace(/\-\-+/g, '-')         // Tirets multiples -> tiret simple
        .replace(/^-+/, '')             // Supprimer tirets début
        .replace(/-+$/, '');            // Supprimer tirets fin
}

/**
 * Debounce - Exécute une fonction après un délai sans nouvelle invocation
 * @param {Function} func - Fonction à debouncer
 * @param {number} wait - Délai en ms
 * @returns {Function}
 */
export function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle - Limite le nombre d'exécutions par intervalle de temps
 * @param {Function} func - Fonction à throttler
 * @param {number} limit - Intervalle min en ms
 * @returns {Function}
 */
export function throttle(func, limit = 300) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Deep clone d'un objet
 * @param {any} obj - Objet à cloner
 * @returns {any}
 */
export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (obj instanceof Object) {
        const clonedObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
}

/**
 * Formater un nombre d'octets en chaîne lisible
 * @param {number} bytes - Nombre d'octets
 * @param {number} decimals - Nombre de décimales
 * @returns {string}
 */
export function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Formater une durée en ms en chaîne lisible
 * @param {number} ms - Durée en millisecondes
 * @returns {string}
 */
export function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    } else {
        return `${seconds}s`;
    }
}

/**
 * Capitaliser la première lettre
 * @param {string} str - Chaîne à capitaliser
 * @returns {string}
 */
export function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Tronquer un texte
 * @param {string} text - Texte à tronquer
 * @param {number} maxLength - Longueur max
 * @param {string} suffix - Suffixe (ex: '...')
 * @returns {string}
 */
export function truncate(text, maxLength = 50, suffix = '...') {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Vérifier si une valeur est vide
 * @param {any} value - Valeur à vérifier
 * @returns {boolean}
 */
export function isEmpty(value) {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
}

/**
 * Obtenir une valeur profonde dans un objet
 * @param {Object} obj - Objet source
 * @param {string} path - Chemin (ex: 'user.address.city')
 * @param {any} defaultValue - Valeur par défaut
 * @returns {any}
 */
export function getNestedValue(obj, path, defaultValue = undefined) {
    const keys = path.split('.');
    let result = obj;

    for (const key of keys) {
        if (result === null || result === undefined) {
            return defaultValue;
        }
        result = result[key];
    }

    return result !== undefined ? result : defaultValue;
}

/**
 * Définir une valeur profonde dans un objet
 * @param {Object} obj - Objet cible
 * @param {string} path - Chemin
 * @param {any} value - Valeur à définir
 */
export function setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let current = obj;

    for (const key of keys) {
        if (!(key in current) || typeof current[key] !== 'object') {
            current[key] = {};
        }
        current = current[key];
    }

    current[lastKey] = value;
}

/**
 * Comparer deux objets en profondeur
 * @param {any} obj1 - Premier objet
 * @param {any} obj2 - Deuxième objet
 * @returns {boolean}
 */
export function deepEqual(obj1, obj2) {
    if (obj1 === obj2) return true;

    if (typeof obj1 !== 'object' || typeof obj2 !== 'object' || 
        obj1 === null || obj2 === null) {
        return false;
    }

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) return false;

    for (const key of keys1) {
        if (!keys2.includes(key) || !deepEqual(obj1[key], obj2[key])) {
            return false;
        }
    }

    return true;
}

/**
 * Générer une couleur aléatoire
 * @returns {string} - Couleur hex
 */
export function randomColor() {
    return '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
}

/**
 * Interpoler une couleur entre deux couleurs
 * @param {string} color1 - Couleur de départ (hex)
 * @param {string} color2 - Couleur d'arrivée (hex)
 * @param {number} factor - Facteur (0-1)
 * @returns {string}
 */
export function interpolateColor(color1, color2, factor) {
    const c1 = parseInt(color1.slice(1), 16);
    const c2 = parseInt(color2.slice(1), 16);

    const r1 = (c1 >> 16) & 0xff;
    const g1 = (c1 >> 8) & 0xff;
    const b1 = c1 & 0xff;

    const r2 = (c2 >> 16) & 0xff;
    const g2 = (c2 >> 8) & 0xff;
    const b2 = c2 & 0xff;

    const r = Math.round(r1 + (r2 - r1) * factor);
    const g = Math.round(g1 + (g2 - g1) * factor);
    const b = Math.round(b1 + (b2 - b1) * factor);

    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

/**
 * Télécharger un fichier côté client
 * @param {string} content - Contenu du fichier
 * @param {string} filename - Nom du fichier
 * @param {string} mimeType - Type MIME
 */
export function downloadFile(content, filename, mimeType = 'text/plain') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Copier du texte dans le presse-papiers
 * @param {string} text - Texte à copier
 * @returns {Promise<boolean>}
 */
export async function copyToClipboard(text) {
    try {
        if (navigator.clipboard) {
            await navigator.clipboard.writeText(text);
            return true;
        } else {
            // Fallback pour anciens navigateurs
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            const success = document.execCommand('copy');
            document.body.removeChild(textarea);
            return success;
        }
    } catch (error) {
        console.error('Erreur lors de la copie:', error);
        return false;
    }
}

/**
 * Attendre un certain temps
 * @param {number} ms - Durée en millisecondes
 * @returns {Promise}
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Exécuter une fonction avec un timeout
 * @param {Function} func - Fonction à exécuter
 * @param {number} timeout - Timeout en ms
 * @returns {Promise}
 */
export function withTimeout(func, timeout = 5000) {
    return Promise.race([
        func(),
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), timeout)
        )
    ]);
}

/**
 * Vérifier si un élément est visible dans le viewport
 * @param {HTMLElement} element - Élément à vérifier
 * @returns {boolean}
 */
export function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

/**
 * Scroller vers un élément avec animation
 * @param {HTMLElement|string} element - Élément ou sélecteur
 * @param {Object} options - Options de scroll
 */
export function scrollToElement(element, options = {}) {
    const el = typeof element === 'string' ? document.querySelector(element) : element;
    if (!el) return;

    const defaultOptions = {
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
        ...options
    };

    el.scrollIntoView(defaultOptions);
}

/**
 * Obtenir les dimensions d'un élément
 * @param {HTMLElement} element - Élément
 * @returns {Object}
 */
export function getElementDimensions(element) {
    const rect = element.getBoundingClientRect();
    return {
        width: rect.width,
        height: rect.height,
        top: rect.top,
        left: rect.left,
        right: rect.right,
        bottom: rect.bottom
    };
}

/**
 * Générer un tableau de nombres
 * @param {number} start - Début
 * @param {number} end - Fin (exclus)
 * @param {number} step - Pas
 * @returns {Array<number>}
 */
export function range(start, end, step = 1) {
    const result = [];
    for (let i = start; i < end; i += step) {
        result.push(i);
    }
    return result;
}

/**
 * Mélanger un tableau (shuffle)
 * @param {Array} array - Tableau à mélanger
 * @returns {Array}
 */
export function shuffle(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

/**
 * Grouper un tableau par clé
 * @param {Array} array - Tableau source
 * @param {string|Function} key - Clé ou fonction
 * @returns {Object}
 */
export function groupBy(array, key) {
    return array.reduce((result, item) => {
        const groupKey = typeof key === 'function' ? key(item) : item[key];
        if (!result[groupKey]) {
            result[groupKey] = [];
        }
        result[groupKey].push(item);
        return result;
    }, {});
}

/**
 * Supprimer les doublons d'un tableau
 * @param {Array} array - Tableau source
 * @param {string|Function} key - Clé pour comparaison (optionnel)
 * @returns {Array}
 */
export function unique(array, key) {
    if (!key) {
        return [...new Set(array)];
    }

    const seen = new Set();
    return array.filter(item => {
        const k = typeof key === 'function' ? key(item) : item[key];
        if (seen.has(k)) {
            return false;
        }
        seen.add(k);
        return true;
    });
}

/**
 * Parser une query string
 * @param {string} queryString - Query string (avec ou sans ?)
 * @returns {Object}
 */
export function parseQueryString(queryString) {
    const params = new URLSearchParams(queryString.replace(/^\?/, ''));
    const result = {};
    for (const [key, value] of params) {
        result[key] = value;
    }
    return result;
}

/**
 * Construire une query string
 * @param {Object} params - Paramètres
 * @returns {string}
 */
export function buildQueryString(params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value !== null && value !== undefined) {
            searchParams.append(key, value);
        }
    }
    return searchParams.toString();
}

/**
 * Valider une adresse email
 * @param {string} email - Email à valider
 * @returns {boolean}
 */
export function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

/**
 * Valider une URL
 * @param {string} url - URL à valider
 * @returns {boolean}
 */
export function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * Obtenir une valeur aléatoire dans un tableau
 * @param {Array} array - Tableau source
 * @returns {any}
 */
export function randomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
}

/**
 * Créer un élément DOM avec attributs et style
 * @param {string} tag - Tag HTML
 * @param {Object} options - Options (className, style, attributes, children)
 * @returns {HTMLElement}
 */
export function createElement(tag, options = {}) {
    const element = document.createElement(tag);

    if (options.className) {
        element.className = options.className;
    }

    if (options.id) {
        element.id = options.id;
    }

    if (options.style) {
        Object.assign(element.style, options.style);
    }

    if (options.attributes) {
        for (const [key, value] of Object.entries(options.attributes)) {
            element.setAttribute(key, value);
        }
    }

    if (options.innerHTML) {
        element.innerHTML = options.innerHTML;
    }

    if (options.textContent) {
        element.textContent = options.textContent;
    }

    if (options.children) {
        options.children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else {
                element.appendChild(child);
            }
        });
    }

    if (options.events) {
        for (const [event, handler] of Object.entries(options.events)) {
            element.addEventListener(event, handler);
        }
    }

    return element;
}

/**
 * Logger amélioré avec timestamp
 */
export const logger = {
    log: (...args) => console.log(`[${new Date().toISOString()}]`, ...args),
    error: (...args) => console.error(`[${new Date().toISOString()}] ERROR:`, ...args),
    warn: (...args) => console.warn(`[${new Date().toISOString()}] WARN:`, ...args),
    info: (...args) => console.info(`[${new Date().toISOString()}] INFO:`, ...args),
    debug: (...args) => console.debug(`[${new Date().toISOString()}] DEBUG:`, ...args)
};