// core/canvas.js - Gestion du canvas et des interactions

import { TextComponent } from '../components/text-component.js';
import { ImageComponent } from '../components/image-component.js';
import { GalleryComponent } from '../components/gallery-component.js';
import { VideoComponent } from '../components/video-component.js';
import { YoutubeComponent } from '../components/youtube-component.js';
import { ShapeComponent } from '../components/shape-component.js';
import { TableComponent } from '../components/table-component.js';
import { SeparatorComponent } from '../components/separator-component.js';

export class Canvas {
    constructor(state, options) {
        this.state = state;
        this.canvasElement = options.canvasElement;
        this.onComponentSelect = options.onComponentSelect;
        this.onComponentUpdate = options.onComponentUpdate;
        this.onComponentDelete = options.onComponentDelete;

        this.componentRenderers = new Map();
        this.setupComponentRenderers();
        this.setupDropZone();
    }

    setupComponentRenderers() {
        this.componentRenderers.set('text', new TextComponent(this.state));
        this.componentRenderers.set('image', new ImageComponent(this.state));
        this.componentRenderers.set('gallery', new GalleryComponent(this.state));
        this.componentRenderers.set('video', new VideoComponent(this.state));
        this.componentRenderers.set('youtube', new YoutubeComponent(this.state));
        this.componentRenderers.set('shape', new ShapeComponent(this.state));
        this.componentRenderers.set('table', new TableComponent(this.state));
        this.componentRenderers.set('separator', new SeparatorComponent(this.state));
    }

    setupDropZone() {
        this.canvasElement.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });

        this.canvasElement.addEventListener('drop', (e) => {
            e.preventDefault();
            const type = e.dataTransfer.getData('componentType');
            if (type) {
                const rect = this.canvasElement.getBoundingClientRect();
                const x = e.clientX - rect.left + this.canvasElement.scrollLeft;
                const y = e.clientY - rect.top + this.canvasElement.scrollTop;
                this.onComponentUpdate(null, { type, x, y });
            }
        });
    }

    renderAll() {
        this.canvasElement.innerHTML = '';
        this.state.getSortedByZIndex().forEach(comp => {
            this.renderComponent(comp);
        });
        this.adjustHeight();
    }

    showEditingModeWarning() {
        // Vérifier si un warning existe déjà 
        if (document.querySelector('.editing-mode-warning')) {
            return;
        }
        
        const warning = document.createElement('div');
        warning.className = 'editing-mode-warning';
        warning.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #f44336, #e91e63);
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 100000;
            box-shadow: 0 4px 15px rgba(244,67,54,0.4);
            animation: slideInRight 0.3s ease-out;
            min-width: 300px;
        `;
        
        warning.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="font-size: 24px;">⚠️</div>
                <div>
                    <strong style="display: block; font-size: 14px;">Mode édition actif</strong>
                    <p style="font-size: 12px; margin-top: 4px; opacity: 0.9;">
                        Terminez l'édition avant de continuer
                    </p>
                </div>
            </div>
        `;
        
        // Ajouter l'animation
        if (!document.querySelector('#editing-warning-animations')) {
            const style = document.createElement('style');
            style.id = 'editing-warning-animations';
            style.textContent = `
                @keyframes slideInRight {
                    from {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes slideOutRight {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                }
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); box-shadow: 0 0 20px rgba(40,167,69,0.6); }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(warning);
        
        // Faire clignoter le bouton "Terminer l'édition"
        const finishBtn = document.getElementById('finish-edit-btn') || document.getElementById('finish-table-edit-btn');
        if (finishBtn) {
            finishBtn.style.animation = 'pulse 0.5s ease-in-out 3';
            
            const propsPanel = document.getElementById('properties-panel');
            if (propsPanel) {
                finishBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
        
        // Auto-suppression après 3 secondes
        setTimeout(() => {
            warning.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => warning.remove(), 300);
        }, 3000);
    }

    renderComponent(component) {
        const renderer = this.componentRenderers.get(component.type);
        if (!renderer) {
            console.error(`Renderer non trouvé pour le type: ${component.type}`);
            return;
        }

        const element = this.createComponentElement(component);
        const content = renderer.render(component);
        element.innerHTML = content;

        // Ajouter les contrôles
        element.appendChild(this.createControls());

        // Ajouter au canvas
        this.canvasElement.appendChild(element);

        // Rendre interactif
        this.makeInteractive(element, component);

        // Appeler le hook post-render si disponible
        if (renderer.postRender) {
            renderer.postRender(element, component);
        }

        this.updateControlsPosition(element, component.y);
    }

    createComponentElement(component) {
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

    createControls() {
        const controls = document.createElement('div');
        controls.className = 'component-controls';
        controls.innerHTML = `
            <button class="ctrl-btn move" title="Déplacer">✋</button>
            <button class="ctrl-btn z-up" title="Monter">▲</button>
            <button class="ctrl-btn z-down" title="Descendre">▼</button>
            <button class="ctrl-btn delete" title="Supprimer">🗑️</button>
        `;

        // Gestionnaires d'événements
        controls.querySelector('.z-up').addEventListener('click', (e) => {
            e.stopPropagation();
            const id = e.target.closest('.component').id;
            this.state.changeZIndex(id, 1);
            this.updateZIndex(id);
        });

        controls.querySelector('.z-down').addEventListener('click', (e) => {
            e.stopPropagation();
            const id = e.target.closest('.component').id;
            this.state.changeZIndex(id, -1);
            this.updateZIndex(id);
        });

        controls.querySelector('.delete').addEventListener('click', (e) => {
            e.stopPropagation();
            const id = e.target.closest('.component').id;
            this.onComponentDelete(id);
        });

        return controls;
    }

    makeInteractive(element, component) {
        // Désactiver la sélection de texte SAUF pour le composant en édition
        element.style.userSelect = 'none';
        element.style.webkitUserSelect = 'none';
        
        let isDragging = false;

        const interactable = interact(element)
            .draggable({
                inertia: false,
                modifiers: [
                    interact.modifiers.restrictRect({
                        restriction: 'parent',
                        endOnly: true
                    })
                ],
                autoScroll: true,
                listeners: {
                    start: (e) => {
                        // 🔧 FIX: Bloquer UNIQUEMENT le drag si on édite UN AUTRE composant
                        if (this.state.isEditingTextMode() && this.state.currentEditingTextId !== element.id) {
                            this.showEditingModeWarning();
                            return false;
                        }
                        
                        // Si on édite CE composant, ne pas permettre le drag non plus
                        if (this.state.isEditingTextMode() && this.state.currentEditingTextId === element.id) {
                            return false;
                        }
                        
                        isDragging = true;
                        element.classList.add('is-dragging');
                        this.onComponentSelect(element.id);
                    },
                    move: (e) => {
                        if (this.state.isEditingTextMode()) return;

                        let x = (parseFloat(element.style.left) || component.x) + e.dx;
                        let y = (parseFloat(element.style.top) || component.y) + e.dy;

                        if (this.state.isSnapEnabled()) {
                            x = this.state.snapToGrid(x);
                            y = this.state.snapToGrid(y);
                        }

                        x = Math.max(0, x);
                        y = Math.max(0, y);

                        component.x = x;
                        component.y = y;

                        element.style.left = x + 'px';
                        element.style.top = y + 'px';

                        this.updateControlsPosition(element, y);
                    },
                    end: () => {
                        setTimeout(() => {
                            isDragging = false;
                            element.classList.remove('is-dragging');
                        }, 50);
                        
                        this.onComponentUpdate(component.id, {
                            x: component.x,
                            y: component.y
                        });
                        this.adjustHeight();
                    }
                }
            })
            .resizable({
                edges: { left: true, right: true, bottom: true, top: true },
                modifiers: [
                    interact.modifiers.restrictSize({
                        min: { width: 50, height: 30 }
                    })
                ],
                inertia: false,
                listeners: {
                    start: (e) => {
                        // 🔧 FIX: Bloquer UNIQUEMENT le resize
                        if (this.state.isEditingTextMode() || this.state.isMoveMode()) {
                            if (this.state.isEditingTextMode()) {
                                this.showEditingModeWarning();
                            }
                            return false;
                        }
                    },
                    move: (e) => {
                        let x = component.x + e.deltaRect.left;
                        let y = component.y + e.deltaRect.top;
                        let w = e.rect.width;
                        let h = e.rect.height;

                        if (this.state.isSnapEnabled()) {
                            x = this.state.snapToGrid(x);
                            y = this.state.snapToGrid(y);
                            w = this.state.snapToGrid(w);
                            h = this.state.snapToGrid(h);
                        }

                        x = Math.max(0, x);
                        y = Math.max(0, y);
                        w = Math.max(50, w);
                        h = Math.max(30, h);

                        component.x = x;
                        component.y = y;
                        component.w = w;
                        component.h = h;

                        element.style.left = x + 'px';
                        element.style.top = y + 'px';
                        element.style.width = w + 'px';
                        element.style.height = h + 'px';
                    },
                    end: (e) => {
                        this.onComponentUpdate(component.id, {
                            x: component.x,
                            y: component.y,
                            w: component.w,
                            h: component.h
                        });
                        this.adjustHeight();
                    }
                }
            });

        element.interactInstance = interactable;

        // 🔧 FIX: Click pour sélection - NE PAS bloquer en mode édition
        element.addEventListener('click', (e) => {
            // Si on clique sur un bouton de contrôle, ne rien faire
            if (e.target.classList.contains('ctrl-btn')) {
                return;
            }

            // Si c'est un drag, ne pas sélectionner
            if (isDragging) {
                return;
            }

            // 🔧 NOUVEAU: Autoriser les clics même en mode édition
            // On bloque seulement la sélection d'un AUTRE composant
            if (this.state.isEditingTextMode()) {
                if (this.state.currentEditingTextId === element.id) {
                    // C'est le composant en cours d'édition, laisser passer
                    e.stopPropagation();
                    return;
                }
                // C'est un autre composant, afficher le warning mais NE PAS bloquer
                this.showEditingModeWarning();
                e.stopPropagation();
                return;
            }

            // Sinon, sélection normale
            this.onComponentSelect(element.id);
        });

        // 🔧 FIX: Double-click pour édition - bloquer seulement si AUTRE composant
        element.addEventListener('dblclick', (e) => {
            if (e.target.classList.contains('ctrl-btn')) return;

            // Si on est déjà en mode édition
            if (this.state.isEditingTextMode()) {
                if (this.state.currentEditingTextId === element.id) {
                    // Double-clic sur le même composant, ne rien faire
                    return;
                }
                // Double-clic sur un autre composant, bloquer
                this.showEditingModeWarning();
                return;
            }

            // Lancer l'édition
            const renderer = this.componentRenderers.get(component.type);
            if (renderer && renderer.handleEdit) {
                renderer.handleEdit(element, component);
            }
        });
    }

    updateComponent(componentId) {
        const element = document.getElementById(componentId);
        if (!element) return;

        const component = this.state.getComponent(componentId);
        if (!component) return;

        element.style.left = component.x + 'px';
        element.style.top = component.y + 'px';
        element.style.width = component.w + 'px';
        element.style.height = component.h + 'px';
        element.style.zIndex = component.z || 0;

        this.adjustHeight();
    }

    updateZIndex(componentId) {
        const element = document.getElementById(componentId);
        const component = this.state.getComponent(componentId);
        if (element && component) {
            element.style.zIndex = component.z;
        }
    }

    removeComponent(componentId) {
        const element = document.getElementById(componentId);
        if (element) {
            element.remove();
        }
        this.adjustHeight();
    }

    updateSelection() {
        document.querySelectorAll('.component').forEach(el => {
            el.classList.remove('selected');
        });

        const selectedId = this.state.getSelectedComponent();
        if (selectedId) {
            const element = document.getElementById(selectedId);
            if (element) {
                element.classList.add('selected');
            }
        }
    }

    updateInteractionMode() {
        const moveMode = this.state.isMoveMode();
        document.querySelectorAll('.component').forEach(el => {
            if (el.interactInstance) {
                el.interactInstance.resizable({ enabled: !moveMode });
            }
        });
    }

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

    adjustHeight() {
        const maxBottom = this.state.getMaxBottom();
        this.canvasElement.style.minHeight = (maxBottom + 300) + 'px';
    }
}