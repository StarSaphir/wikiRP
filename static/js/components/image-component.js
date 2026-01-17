// components/image-component.js - Composant image

import { BaseComponent } from './base-component.js';
import { showImageModal } from '../modals/image-modal.js';

export class ImageComponent extends BaseComponent {
    render(component) {
        const imagePath = component.image_path || '';
        
        if (!imagePath) {
            return `
                <div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; background: #2a2a2a; border: 2px dashed #666; border-radius: 5px; color: #666; text-align: center; padding: 20px;">
                    <div>
                        <div style="font-size: 48px; margin-bottom: 10px;">🖼️</div>
                        <p style="font-size: 14px;">Aucune image</p>
                        <p style="font-size: 12px; margin-top: 5px;">Double-cliquez pour ajouter</p>
                    </div>
                </div>
            `;
        }

        return `<img src="${imagePath}" alt="Image" style="width: 100%; height: 100%; object-fit: contain;" />`;
    }

    handleEdit(element, component) {
        showImageModal(component, (newImagePath) => {
            component.image_path = newImagePath;
            
            // Mettre à jour l'affichage
            element.querySelector('img, div').outerHTML = this.render(component);
            
            // Émettre l'événement de mise à jour
            this.state.emit('componentContentUpdated', {
                id: component.id,
                image_path: newImagePath
            });
        });
    }

    postRender(element, component) {
        // Gestion du lazy loading si nécessaire
        const img = element.querySelector('img');
        if (img && component.image_path) {
            img.addEventListener('error', () => {
                console.error(`Erreur de chargement de l'image: ${component.image_path}`);
                img.style.background = '#2a2a2a';
                img.alt = 'Erreur de chargement';
            });

            img.addEventListener('load', () => {
                console.log(`Image chargée: ${component.image_path}`);
            });
        }
    }

    getPropertyFields(component) {
        const baseFields = super.getPropertyFields(component);
        
        return [
            ...baseFields,
            {
                label: 'Chemin de l\'image',
                type: 'text',
                key: 'image_path',
                value: component.image_path || '',
                readonly: true
            },
            {
                label: 'Mode d\'affichage',
                type: 'select',
                key: 'object_fit',
                value: component.object_fit || 'contain',
                options: [
                    { value: 'contain', label: 'Contenir' },
                    { value: 'cover', label: 'Couvrir' },
                    { value: 'fill', label: 'Remplir' },
                    { value: 'none', label: 'Taille originale' },
                    { value: 'scale-down', label: 'Réduire si nécessaire' }
                ]
            }
        ];
    }

    getDefaultProperties() {
        return {
            w: 400,
            h: 300,
            object_fit: 'contain'
        };
    }
}