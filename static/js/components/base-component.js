// components/base-component.js - Classe de base pour tous les composants

export class BaseComponent {
    constructor(state) {
        this.state = state;
        this.instances = new Map(); // Pour stocker les instances spécifiques (ex: Quill)
    }

    /**
     * Rendu HTML du composant (à surcharger)
     * @param {Object} component - Données du composant
     * @returns {string} - HTML du contenu
     */
    render(component) {
        throw new Error('render() doit être implémenté dans la classe enfant');
    }

    /**
     * Gestion de l'édition (optionnel)
     * @param {HTMLElement} element - Élément DOM du composant
     * @param {Object} component - Données du composant
     */
    handleEdit(element, component) {
        // Par défaut, ne fait rien
        console.log(`Édition non implémentée pour le type: ${component.type}`);
    }

    /**
     * Hook appelé après le rendu (optionnel)
     * Utile pour attacher des event listeners spécifiques
     * @param {HTMLElement} element - Élément DOM du composant
     * @param {Object} component - Données du composant
     */
    postRender(element, component) {
        // Par défaut, ne fait rien
    }

    /**
     * Crée l'élément DOM principal du composant
     * @param {Object} component - Données du composant
     * @returns {HTMLElement}
     */
    createElement(component) {
        const el = document.createElement('div');
        el.className = 'component';
        el.id = component.id;
        el.dataset.type = component.type;
        el.style.left = component.x + 'px';
        el.style.top = component.y + 'px';
        el.style.width = component.w + 'px';
        el.style.height = component.h + 'px';
        el.style.zIndex = component.z || 0;

        if (component.custom_css) {
            el.style.cssText += component.custom_css;
        }

        return el;
    }

    /**
     * Crée les contrôles du composant (déplacer, z-index, supprimer)
     * @returns {HTMLElement}
     */
    createControls() {
        const controls = document.createElement('div');
        controls.className = 'component-controls';
        controls.innerHTML = `
            <button class="ctrl-btn move" title="Déplacer">✋</button>
            <button class="ctrl-btn z-up" title="Monter">▲</button>
            <button class="ctrl-btn z-down" title="Descendre">▼</button>
            <button class="ctrl-btn delete" title="Supprimer">🗑️</button>
        `;
        return controls;
    }

    /**
     * Attache les gestionnaires d'événements des contrôles
     * @param {HTMLElement} element - Élément du composant
     * @param {Object} callbacks - Callbacks pour les actions
     */
    attachControlHandlers(element, callbacks) {
        const controls = element.querySelector('.component-controls');
        if (!controls) return;

        controls.querySelector('.z-up').addEventListener('click', (e) => {
            e.stopPropagation();
            if (callbacks.onZIndexChange) {
                callbacks.onZIndexChange(element.id, 1);
            }
        });

        controls.querySelector('.z-down').addEventListener('click', (e) => {
            e.stopPropagation();
            if (callbacks.onZIndexChange) {
                callbacks.onZIndexChange(element.id, -1);
            }
        });

        controls.querySelector('.delete').addEventListener('click', (e) => {
            e.stopPropagation();
            if (callbacks.onDelete) {
                callbacks.onDelete(element.id);
            }
        });
    }

    /**
     * Rend le composant interactif (drag & resize)
     * @param {HTMLElement} element - Élément du composant
     * @param {Object} component - Données du composant
     * @param {Object} callbacks - Callbacks pour les interactions
     */
    makeInteractive(element, component, callbacks) {
        let isDragging = false;

        const interactable = interact(element)
            .draggable({
                enabled: true,
                listeners: {
                    start: (e) => {
                        // 🔧 FIX: Bloquer drag uniquement si on édite UN AUTRE composant
                        if (this.state.isEditingTextMode() && this.state.currentEditingTextId !== component.id) {
                            return false;
                        }
                        
                        // Si on édite CE composant, ne pas permettre le drag non plus
                        if (this.state.isEditingTextMode() && this.state.currentEditingTextId === component.id) {
                            return false;
                        }
                        
                        isDragging = true;
                        element.classList.add('is-dragging');
                        
                        if (callbacks.onDragStart) {
                            callbacks.onDragStart(component.id);
                        }
                    },
                    move: (e) => {
                        if (this.state.isEditingTextMode()) return;

                        let x = component.x + e.dx;
                        let y = component.y + e.dy;

                        // Snap to grid
                        x = this.state.snapToGrid(x);
                        y = this.state.snapToGrid(y);

                        // Contraintes
                        x = Math.max(0, x);
                        y = Math.max(0, y);

                        // Mise à jour
                        component.x = x;
                        component.y = y;

                        element.style.left = x + 'px';
                        element.style.top = y + 'px';

                        if (callbacks.onDragMove) {
                            callbacks.onDragMove(component.id, { x, y });
                        }
                    },
                    end: (e) => {
                        setTimeout(() => {
                            isDragging = false;
                            element.classList.remove('is-dragging');
                            
                            if (callbacks.onDragEnd) {
                                callbacks.onDragEnd(component.id);
                            }
                        }, 50);
                    }
                }
            })
            .resizable({
                edges: { left: true, right: true, bottom: true, top: true },
                enabled: !this.state.isMoveMode(),
                listeners: {
                    start: (e) => {
                        // 🔧 FIX: Bloquer resize en mode édition
                        if (this.state.isEditingTextMode() || this.state.isMoveMode()) {
                            return false;
                        }
                        
                        if (callbacks.onResizeStart) {
                            callbacks.onResizeStart(component.id);
                        }
                    },
                    move: (e) => {
                        if (this.state.isEditingTextMode() || this.state.isMoveMode()) return;

                        let x = component.x + e.deltaRect.left;
                        let y = component.y + e.deltaRect.top;
                        let w = e.rect.width;
                        let h = e.rect.height;

                        // Snap to grid
                        x = this.state.snapToGrid(x);
                        y = this.state.snapToGrid(y);
                        w = this.state.snapToGrid(w);
                        h = this.state.snapToGrid(h);

                        // Contraintes
                        x = Math.max(0, x);
                        y = Math.max(0, y);
                        w = Math.max(50, w);
                        h = Math.max(30, h);

                        // Mise à jour
                        component.x = x;
                        component.y = y;
                        component.w = w;
                        component.h = h;

                        element.style.left = x + 'px';
                        element.style.top = y + 'px';
                        element.style.width = w + 'px';
                        element.style.height = h + 'px';

                        if (callbacks.onResizeMove) {
                            callbacks.onResizeMove(component.id, { x, y, w, h });
                        }
                    },
                    end: (e) => {
                        if (callbacks.onResizeEnd) {
                            callbacks.onResizeEnd(component.id);
                        }
                    }
                }
            });

        // Stocker la référence interact
        element.interactInstance = interactable;

        // 🔧 FIX: Click - NE PAS bloquer si c'est le composant en édition
        element.addEventListener('click', (e) => {
            // Autoriser les clics sur les boutons de contrôle
            if (e.target.classList.contains('ctrl-btn')) {
                return;
            }

            // Si c'est un drag, ne pas sélectionner
            if (isDragging) {
                return;
            }

            // 🔧 NOUVEAU: Autoriser les clics sur le composant en cours d'édition
            if (this.state.isEditingTextMode()) {
                if (this.state.currentEditingTextId === component.id) {
                    // C'est le composant en cours d'édition, laisser passer
                    return;
                }
                // C'est un autre composant, bloquer
                e.stopPropagation();
                return;
            }

            // Sinon, sélection normale
            if (callbacks.onSelect) {
                callbacks.onSelect(component.id);
            }
        });

        // 🔧 FIX: Double-click - autoriser sur le composant en édition
        element.addEventListener('dblclick', (e) => {
            if (e.target.classList.contains('ctrl-btn')) return;
            
            // Si on est déjà en mode édition
            if (this.state.isEditingTextMode()) {
                if (this.state.currentEditingTextId === component.id) {
                    // Double-clic sur le même composant, ne rien faire
                    return;
                }
                // Double-clic sur un autre composant, bloquer
                return;
            }
            
            this.handleEdit(element, component);
        });
    }

    /**
     * Met à jour la position des contrôles selon la position Y
     * @param {HTMLElement} element - Élément du composant
     * @param {number} y - Position Y du composant
     */
    updateControlsPosition(element, y) {
        const controls = element.querySelector('.component-controls');
        if (!controls) return;

        if (y < 50) {
            controls.style.top = 'auto';
            controls.style.bottom = '-40px';
        } else {
            controls.style.top = '-40px';
            controls.style.bottom = 'auto';
        }
    }

    /**
     * Met à jour le mode d'interaction (resize activé/désactivé)
     * @param {HTMLElement} element - Élément du composant
     * @param {boolean} moveMode - Mode déplacement uniquement
     */
    updateInteractionMode(element, moveMode) {
        if (element.interactInstance) {
            element.interactInstance.resizable({ enabled: !moveMode });
        }
    }

    /**
     * Nettoie les ressources du composant
     * @param {string} componentId - ID du composant
     */
    cleanup(componentId) {
        // Nettoyer les instances stockées
        if (this.instances.has(componentId)) {
            const instance = this.instances.get(componentId);
            
            // Si l'instance a une méthode destroy
            if (instance && typeof instance.destroy === 'function') {
                instance.destroy();
            }
            
            this.instances.delete(componentId);
        }

        // Hook pour nettoyage spécifique
        this.onCleanup(componentId);
    }

    /**
     * Hook de nettoyage spécifique (à surcharger si nécessaire)
     * @param {string} componentId - ID du composant
     */
    onCleanup(componentId) {
        // Par défaut, ne fait rien
    }

    /**
     * Valide les données du composant
     * @param {Object} component - Données du composant
     * @returns {boolean}
     */
    validate(component) {
        return !!(component.id && component.type && 
                  component.x !== undefined && 
                  component.y !== undefined && 
                  component.w && component.h);
    }

    /**
     * Retourne les propriétés par défaut pour ce type de composant
     * @returns {Object}
     */
    getDefaultProperties() {
        return {
            w: 300,
            h: 200
        };
    }

    /**
     * Retourne les champs de propriétés éditables
     * @param {Object} component - Données du composant
     * @returns {Array} - Tableau de définitions de champs
     */
    getPropertyFields(component) {
        return [
            {
                label: 'Position X',
                type: 'number',
                key: 'x',
                value: component.x
            },
            {
                label: 'Position Y',
                type: 'number',
                key: 'y',
                value: component.y
            },
            {
                label: 'Largeur',
                type: 'number',
                key: 'w',
                value: component.w
            },
            {
                label: 'Hauteur',
                type: 'number',
                key: 'h',
                value: component.h
            },
            {
                label: 'Z-Index',
                type: 'number',
                key: 'z',
                value: component.z || 0
            },
            {
                label: 'CSS Personnalisé',
                type: 'textarea',
                key: 'custom_css',
                value: component.custom_css || '',
                rows: 3
            },
            {
                label: 'JS Personnalisé',
                type: 'textarea',
                key: 'custom_js',
                value: component.custom_js || '',
                rows: 3
            }
        ];
    }
}