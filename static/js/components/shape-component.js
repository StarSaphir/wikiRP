// components/shape-component.js - Composant forme géométrique

import { BaseComponent } from './base-component.js';

export class ShapeComponent extends BaseComponent {
    render(component) {
        const bgColor = component.bg_color || '#333333';
        const borderRadius = component.border_radius || 0;
        const borderWidth = component.border_width || 0;
        const borderColor = component.border_color || '#666666';
        const opacity = component.opacity !== undefined ? component.opacity : 1;

        return `
            <div class="shape-fill" style="
                background: ${bgColor};
                width: 100%;
                height: 100%;
                border-radius: ${borderRadius}px;
                border: ${borderWidth}px solid ${borderColor};
                opacity: ${opacity};
                transition: all 0.3s ease;
            "></div>
        `;
    }

    handleEdit(element, component) {
        // Afficher directement le panneau de propriétés pour éditer la couleur
        const event = new CustomEvent('showProperties', {
            detail: { componentId: component.id }
        });
        document.dispatchEvent(event);
    }

    postRender(element, component) {
        const shape = element.querySelector('.shape-fill');
        if (!shape) return;

        // Effet hover pour feedback visuel
        shape.addEventListener('mouseenter', () => {
            if (!this.state.isEditingTextMode()) {
                shape.style.transform = 'scale(1.02)';
            }
        });

        shape.addEventListener('mouseleave', () => {
            shape.style.transform = 'scale(1)';
        });
    }

    getPropertyFields(component) {
        const baseFields = super.getPropertyFields(component);
        
        return [
            ...baseFields,
            {
                type: 'separator',
                label: 'Apparence'
            },
            {
                label: 'Couleur de fond',
                type: 'color',
                key: 'bg_color',
                value: component.bg_color || '#333333'
            },
            {
                label: 'Opacité',
                type: 'range',
                key: 'opacity',
                value: component.opacity !== undefined ? component.opacity : 1,
                min: 0,
                max: 1,
                step: 0.1
            },
            {
                type: 'separator',
                label: 'Bordure'
            },
            {
                label: 'Épaisseur bordure (px)',
                type: 'number',
                key: 'border_width',
                value: component.border_width || 0,
                min: 0,
                max: 50
            },
            {
                label: 'Couleur bordure',
                type: 'color',
                key: 'border_color',
                value: component.border_color || '#666666'
            },
            {
                label: 'Arrondi (px)',
                type: 'number',
                key: 'border_radius',
                value: component.border_radius || 0,
                min: 0,
                max: 500
            }
        ];
    }

    getDefaultProperties() {
        return {
            w: 300,
            h: 200,
            bg_color: '#333333',
            border_radius: 0,
            border_width: 0,
            border_color: '#666666',
            opacity: 1
        };
    }

    /**
     * Applique les changements de propriétés en temps réel
     * @param {HTMLElement} element - Élément du composant
     * @param {Object} component - Données du composant
     * @param {string} property - Propriété modifiée
     * @param {*} value - Nouvelle valeur
     */
    updateProperty(element, component, property, value) {
        const shape = element.querySelector('.shape-fill');
        if (!shape) return;

        const styleMap = {
            bg_color: 'background',
            border_radius: (val) => `${val}px`,
            border_width: (val) => {
                shape.style.borderWidth = `${val}px`;
            },
            border_color: 'borderColor',
            opacity: 'opacity'
        };

        if (property in styleMap) {
            const mapping = styleMap[property];
            
            if (typeof mapping === 'function') {
                mapping(value);
            } else if (property === 'border_radius') {
                shape.style.borderRadius = `${value}px`;
            } else if (property === 'border_width') {
                shape.style.borderWidth = `${value}px`;
            } else {
                shape.style[mapping] = value;
            }
        }
    }
}