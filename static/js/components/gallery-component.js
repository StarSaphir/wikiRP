// components/gallery-component.js - Composant galerie d'images

import { BaseComponent } from './base-component.js';
import { showGalleryModal } from '../modals/gallery-modal.js';

export class GalleryComponent extends BaseComponent {
    render(component) {
        const images = component.images || [];
        
        if (images.length === 0) {
            return `
                <div class="gallery-editor" style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 100%; background: #2a2a2a; border: 2px dashed #666; border-radius: 5px; color: #666; text-align: center; padding: 20px;">
                    <div style="font-size: 48px; margin-bottom: 10px;">🎞️</div>
                    <p style="font-size: 14px; margin-bottom: 15px;">Aucune image dans la galerie</p>
                    <button class="gallery-manage-btn" style="padding: 10px 20px; background: #4a9eff; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px;">
                        📷 Gérer les images (0)
                    </button>
                </div>
            `;
        }

        return `
            <div class="gallery-editor" style="width: 100%; height: 100%; position: relative;">
                <img src="${images[0]}" style="width: 100%; height: 100%; object-fit: cover;" />
                <button class="gallery-manage-btn" style="position: absolute; top: 10px; right: 10px; padding: 8px 15px; background: rgba(74, 158, 255, 0.9); color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 13px; font-weight: bold; box-shadow: 0 2px 10px rgba(0,0,0,0.3); z-index: 10;">
                    📷 Gérer (${images.length})
                </button>
            </div>
        `;
    }

    handleEdit(element, component) {
        this.openGalleryManager(element, component);
    }

    postRender(element, component) {
        // Attacher l'événement au bouton de gestion
        const manageBtn = element.querySelector('.gallery-manage-btn');
        if (manageBtn) {
            manageBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openGalleryManager(element, component);
            });
        }
    }

    openGalleryManager(element, component) {
        showGalleryModal(component, (updatedImages) => {
            console.log('🔄 Mise à jour galerie:', updatedImages.length, 'images');
            
            // 🔧 FIX: S'assurer qu'il n'y a pas de doublons
            const uniqueImages = [...new Set(updatedImages)];
            component.images = uniqueImages;
            
            // Re-render le composant
            const content = element.querySelector('.gallery-editor');
            if (content) {
                content.outerHTML = this.render(component);
                
                // Ré-attacher les événements
                this.postRender(element, component);
            }
            
            // Émettre l'événement de mise à jour
            this.state.emit('componentContentUpdated', {
                id: component.id,
                images: uniqueImages
            });
            
            console.log('✅ Galerie mise à jour avec', uniqueImages.length, 'images uniques');
        });
    }

    getPropertyFields(component) {
        const baseFields = super.getPropertyFields(component);
        const images = component.images || [];
        
        return [
            ...baseFields,
            {
                label: 'Nombre d\'images',
                type: 'text',
                key: 'image_count',
                value: images.length.toString(),
                readonly: true
            },
            {
                label: 'Transition',
                type: 'select',
                key: 'transition',
                value: component.transition || 'fade',
                options: [
                    { value: 'fade', label: 'Fondu' },
                    { value: 'slide', label: 'Glissement' },
                    { value: 'none', label: 'Aucune' }
                ]
            },
            {
                label: 'Délai automatique (ms)',
                type: 'number',
                key: 'autoplay_delay',
                value: component.autoplay_delay || 0,
                min: 0,
                step: 1000,
                placeholder: '0 = désactivé'
            }
        ];
    }

    getDefaultProperties() {
        return {
            w: 560,
            h: 315,
            images: [],
            transition: 'fade',
            autoplay_delay: 0
        };
    }
}