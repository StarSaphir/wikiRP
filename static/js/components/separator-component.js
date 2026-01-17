// components/separator-component.js - Composant séparateur/ligne horizontale

import { BaseComponent } from './base-component.js';

export class SeparatorComponent extends BaseComponent {
    render(component) {
        const style = component.separator_style || 'solid';
        const color = component.separator_color || '#666666';
        const thickness = component.separator_thickness || 2;
        const width = component.separator_width || 100;
        const margin = component.separator_margin || 0;

        return `
            <hr style="
                border: none;
                border-top: ${thickness}px ${style} ${color};
                width: ${width}%;
                margin: ${margin}px auto;
                opacity: ${component.opacity !== undefined ? component.opacity : 1};
            " />
        `;
    }

    handleEdit(element, component) {
        // Afficher directement le panneau de propriétés
        const event = new CustomEvent('showProperties', {
            detail: { componentId: component.id }
        });
        document.dispatchEvent(event);
    }

    postRender(element, component) {
        const hr = element.querySelector('hr');
        if (!hr) return;

        // Effet hover pour feedback visuel
        element.addEventListener('mouseenter', () => {
            if (!this.state.isEditingTextMode()) {
                hr.style.transform = 'scaleX(1.02)';
                hr.style.transition = 'transform 0.2s ease';
            }
        });

        element.addEventListener('mouseleave', () => {
            hr.style.transform = 'scaleX(1)';
        });
    }

    getPropertyFields(component) {
        const baseFields = super.getPropertyFields(component);
        
        // Filtrer pour enlever la hauteur car non pertinente pour un séparateur
        const filteredBaseFields = baseFields.filter(field => 
            field.key !== 'h' && field.key !== 'custom_js'
        );
        
        return [
            ...filteredBaseFields,
            {
                type: 'separator',
                label: 'Style du séparateur'
            },
            {
                label: 'Style de ligne',
                type: 'select',
                key: 'separator_style',
                value: component.separator_style || 'solid',
                options: [
                    { value: 'solid', label: 'Solide' },
                    { value: 'dashed', label: 'Tirets' },
                    { value: 'dotted', label: 'Points' },
                    { value: 'double', label: 'Double' },
                    { value: 'groove', label: 'Rainure' },
                    { value: 'ridge', label: 'Crête' }
                ]
            },
            {
                label: 'Couleur',
                type: 'color',
                key: 'separator_color',
                value: component.separator_color || '#666666'
            },
            {
                label: 'Épaisseur (px)',
                type: 'number',
                key: 'separator_thickness',
                value: component.separator_thickness || 2,
                min: 1,
                max: 20
            },
            {
                label: 'Largeur (%)',
                type: 'range',
                key: 'separator_width',
                value: component.separator_width || 100,
                min: 10,
                max: 100,
                step: 5
            },
            {
                label: 'Marge verticale (px)',
                type: 'number',
                key: 'separator_margin',
                value: component.separator_margin || 0,
                min: 0,
                max: 100
            },
            {
                label: 'Opacité',
                type: 'range',
                key: 'opacity',
                value: component.opacity !== undefined ? component.opacity : 1,
                min: 0,
                max: 1,
                step: 0.1
            }
        ];
    }

    getDefaultProperties() {
        return {
            w: 800,
            h: 2,
            separator_style: 'solid',
            separator_color: '#666666',
            separator_thickness: 2,
            separator_width: 100,
            separator_margin: 0,
            opacity: 1
        };
    }

    /**
     * Le séparateur ne devrait pas être redimensionnable en hauteur
     * On override la méthode makeInteractive pour désactiver le resize vertical
     */
    makeInteractive(element, component, callbacks) {
        let isDragging = false;

        const interactable = interact(element)
            .draggable({
                enabled: true,
                listeners: {
                    start: (e) => {
                        if (this.state.isEditingTextMode()) return false;
                        isDragging = true;
                        element.classList.add('is-dragging');
                    },
                    move: (e) => {
                        if (this.state.isEditingTextMode()) return;

                        let x = component.x + e.dx;
                        let y = component.y + e.dy;

                        x = this.state.snapToGrid(x);
                        y = this.state.snapToGrid(y);

                        component.x = Math.max(0, x);
                        component.y = Math.max(0, y);

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
                        }, 50);
                    }
                }
            })
            .resizable({
                // Seulement resize horizontal pour le séparateur
                edges: { left: true, right: true, bottom: false, top: false },
                enabled: !this.state.isMoveMode(),
                listeners: {
                    move: (e) => {
                        if (this.state.isEditingTextMode() || this.state.isMoveMode()) return;

                        let x = component.x + e.deltaRect.left;
                        let w = e.rect.width;

                        x = this.state.snapToGrid(x);
                        w = this.state.snapToGrid(w);

                        component.x = Math.max(0, x);
                        component.w = Math.max(50, w);

                        element.style.left = x + 'px';
                        element.style.width = w + 'px';

                        if (callbacks.onResizeMove) {
                            callbacks.onResizeMove(component.id, { x, w });
                        }
                    }
                }
            });

        element.interactInstance = interactable;

        // Click pour sélection
        element.addEventListener('click', (e) => {
            if (this.state.isEditingTextMode()) {
                e.stopPropagation();
                return;
            }

            if (!isDragging && callbacks.onSelect) {
                callbacks.onSelect(component.id);
            }
        });

        // Double-click pour édition
        element.addEventListener('dblclick', (e) => {
            this.handleEdit(element, component);
        });
    }

    /**
     * Applique les changements de propriétés en temps réel
     */
    updateProperty(element, component, property, value) {
        const hr = element.querySelector('hr');
        if (!hr) return;

        const updateMap = {
            separator_style: () => hr.style.borderTopStyle = value,
            separator_color: () => hr.style.borderTopColor = value,
            separator_thickness: () => hr.style.borderTopWidth = `${value}px`,
            separator_width: () => hr.style.width = `${value}%`,
            separator_margin: () => hr.style.margin = `${value}px auto`,
            opacity: () => hr.style.opacity = value
        };

        if (updateMap[property]) {
            updateMap[property]();
        }
    }
}