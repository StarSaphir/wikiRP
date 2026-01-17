// api/client.js - Client API pour communiquer avec Flask

/**
 * Client API pour toutes les requêtes vers le backend Flask
 */
export class API {
    static baseUrl = '';
    static cachedPages = null;

    /**
     * Récupérer toutes les pages
     * @returns {Promise<Array>}
     */
    static async getPages() {
        try {
            const response = await fetch('/api/pages');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const pages = await response.json();
            this.cachedPages = pages; // Cache
            return pages;
        } catch (error) {
            console.error('Erreur lors du chargement des pages:', error);
            throw error;
        }
    }

    /**
     * Charger les pages (alias avec cache)
     * @returns {Promise<Array>}
     */
    static async loadPages() {
        if (this.cachedPages) {
            return this.cachedPages;
        }
        return await this.getPages();
    }

    /**
     * Rafraîchir le cache des pages
     * @returns {Promise<Array>}
     */
    static async refreshPages() {
        this.cachedPages = null;
        return await this.getPages();
    }

    /**
     * Récupérer une page spécifique
     * @param {string} slug - Slug de la page
     * @returns {Promise<Object>}
     */
    static async getPage(slug) {
        try {
            const response = await fetch(`/api/pages/${slug}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`Erreur lors du chargement de la page ${slug}:`, error);
            throw error;
        }
    }

    /**
     * Sauvegarder le layout d'une page
     * @param {string} slug - Slug de la page
     * @param {Array} layout - Layout (liste des composants)
     * @returns {Promise<Object>}
     */
    static async savePage(slug, layout) {
        try {
            const response = await fetch(`/api/pages/${slug}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ layout })
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.message || `HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Erreur lors de la sauvegarde:', error);
            throw error;
        }
    }

    /**
     * Créer une nouvelle page
     * @param {string} title - Titre de la page
     * @returns {Promise<Object>}
     */
    static async createPage(title) {
        try {
            const response = await fetch('/api/pages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ title })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            
            // Rafraîchir le cache
            await this.refreshPages();
            
            return data;
        } catch (error) {
            console.error('Erreur lors de la création de la page:', error);
            throw error;
        }
    }

    /**
     * Supprimer une page
     * @param {string} slug - Slug de la page
     * @returns {Promise<Object>}
     */
    static async deletePage(slug) {
        try {
            const response = await fetch(`/api/pages/${slug}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            // Rafraîchir le cache
            await this.refreshPages();

            return await response.json();
        } catch (error) {
            console.error('Erreur lors de la suppression:', error);
            throw error;
        }
    }

    /**
     * Copier le layout d'une page vers une autre
     * @param {string} targetSlug - Slug de la page destination
     * @param {string} sourceSlug - Slug de la page source
     * @returns {Promise<Object>}
     */
    static async copyPageLayout(targetSlug, sourceSlug) {
        try {
            const response = await fetch(`/api/pages/${targetSlug}/copy`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ source_slug: sourceSlug })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Erreur lors de la copie du layout:', error);
            throw error;
        }
    }

    /**
     * Changer la visibilité d'une page
     * @param {string} slug - Slug de la page
     * @param {boolean} hidden - Masquer ou non
     * @returns {Promise<Object>}
     */
    static async togglePageVisibility(slug, hidden) {
        try {
            const response = await fetch(`/api/pages/${slug}/visibility`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ hidden })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            // Rafraîchir le cache
            await this.refreshPages();

            return await response.json();
        } catch (error) {
            console.error('Erreur lors du changement de visibilité:', error);
            throw error;
        }
    }

    /**
     * Upload d'une image
     * @param {string} slug - Slug de la page
     * @param {File} file - Fichier image
     * @param {Function} onProgress - Callback de progression (optionnel)
     * @returns {Promise<Object>}
     */
    static async uploadImage(slug, file, onProgress) {
        return await this._uploadFile(`/api/upload/${slug}`, file, onProgress);
    }

    /**
     * Upload d'une vidéo
     * @param {string} slug - Slug de la page
     * @param {File} file - Fichier vidéo
     * @param {Function} onProgress - Callback de progression (optionnel)
     * @returns {Promise<Object>}
     */
    static async uploadVideo(slug, file, onProgress) {
        return await this._uploadFile(`/api/upload-video/${slug}`, file, onProgress);
    }

    /**
     * Méthode privée d'upload générique
     * @private
     */
    static async _uploadFile(url, file, onProgress) {
        return new Promise((resolve, reject) => {
            const formData = new FormData();
            formData.append('file', file);

            const xhr = new XMLHttpRequest();

            // Progression
            if (onProgress) {
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        const percent = Math.round((e.loaded / e.total) * 100);
                        onProgress(percent, e.loaded, e.total);
                    }
                });
            }

            // Succès
            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const data = JSON.parse(xhr.responseText);
                        resolve(data);
                    } catch (error) {
                        reject(new Error('Réponse JSON invalide'));
                    }
                } else {
                    reject(new Error(`HTTP ${xhr.status}`));
                }
            });

            // Erreur réseau
            xhr.addEventListener('error', () => {
                reject(new Error('Erreur réseau'));
            });

            // Annulation
            xhr.addEventListener('abort', () => {
                reject(new Error('Upload annulé'));
            });

            xhr.open('POST', url);
            xhr.send(formData);
        });
    }

    /**
     * Récupérer le layout d'une page
     * @param {string} slug - Slug de la page
     * @returns {Promise<Array>}
     */
    static async getPageLayout(slug) {
        try {
            const response = await fetch(`/api/pages/${slug}/layout`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`Erreur lors du chargement du layout de ${slug}:`, error);
            throw error;
        }
    }

    /**
     * Récupérer l'inventaire (inventory.json)
     * @returns {Promise<Array>}
     */
    static async getInventory() {
        try {
            const response = await fetch('/data/inventory.json');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Erreur lors du chargement de l\'inventaire:', error);
            throw error;
        }
    }

    /**
     * Exécuter une requête GET générique
     * @param {string} endpoint - Endpoint API
     * @returns {Promise<any>}
     */
    static async get(endpoint) {
        try {
            const response = await fetch(endpoint);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`Erreur GET ${endpoint}:`, error);
            throw error;
        }
    }

    /**
     * Exécuter une requête POST générique
     * @param {string} endpoint - Endpoint API
     * @param {Object} data - Données à envoyer
     * @returns {Promise<any>}
     */
    static async post(endpoint, data) {
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`Erreur POST ${endpoint}:`, error);
            throw error;
        }
    }

    /**
     * Exécuter une requête PUT générique
     * @param {string} endpoint - Endpoint API
     * @param {Object} data - Données à envoyer
     * @returns {Promise<any>}
     */
    static async put(endpoint, data) {
        try {
            const response = await fetch(endpoint, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`Erreur PUT ${endpoint}:`, error);
            throw error;
        }
    }

    /**
     * Exécuter une requête DELETE générique
     * @param {string} endpoint - Endpoint API
     * @returns {Promise<any>}
     */
    static async delete(endpoint) {
        try {
            const response = await fetch(endpoint, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`Erreur DELETE ${endpoint}:`, error);
            throw error;
        }
    }

    /**
     * Vérifier la connexion au serveur
     * @returns {Promise<boolean>}
     */
    static async checkConnection() {
        try {
            const response = await fetch('/api/pages', { method: 'HEAD' });
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    /**
     * Obtenir des statistiques sur les pages
     * @returns {Promise<Object>}
     */
    static async getStats() {
        try {
            const pages = await this.getPages();
            
            const stats = {
                totalPages: pages.length,
                visiblePages: pages.filter(p => !p.hidden_from_nav).length,
                hiddenPages: pages.filter(p => p.hidden_from_nav).length
            };

            return stats;
        } catch (error) {
            console.error('Erreur lors du calcul des stats:', error);
            throw error;
        }
    }

    /**
     * Rechercher des pages par titre ou slug
     * @param {string} query - Terme de recherche
     * @returns {Promise<Array>}
     */
    static async searchPages(query) {
        try {
            const pages = await this.loadPages();
            const lowerQuery = query.toLowerCase();

            return pages.filter(page => 
                page.title.toLowerCase().includes(lowerQuery) ||
                page.slug.toLowerCase().includes(lowerQuery)
            );
        } catch (error) {
            console.error('Erreur lors de la recherche:', error);
            throw error;
        }
    }

    /**
     * Batch d'opérations (pour sauvegardes multiples)
     * @param {Array<Function>} operations - Liste de fonctions async
     * @returns {Promise<Array>}
     */
    static async batch(operations) {
        try {
            return await Promise.all(operations.map(op => op()));
        } catch (error) {
            console.error('Erreur lors du batch:', error);
            throw error;
        }
    }

    /**
     * Retry automatique d'une requête
     * @param {Function} operation - Fonction à exécuter
     * @param {number} maxRetries - Nombre max de tentatives
     * @param {number} delay - Délai entre tentatives (ms)
     * @returns {Promise<any>}
     */
    static async retry(operation, maxRetries = 3, delay = 1000) {
        let lastError;

        for (let i = 0; i < maxRetries; i++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                console.warn(`Tentative ${i + 1}/${maxRetries} échouée:`, error.message);
                
                if (i < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        throw lastError;
    }
}