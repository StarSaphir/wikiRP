// components/video-component.js - Composant vidéo locale

import { BaseComponent } from './base-component.js';
import { showVideoModal } from '../modals/video-modal.js';

export class VideoComponent extends BaseComponent {
    render(component) {
        const videoPath = component.video_path || '';
        
        if (!videoPath) {
            return `
                <div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; background: #2a2a2a; border: 2px dashed #666; border-radius: 5px; color: #666; text-align: center; padding: 20px;">
                    <div>
                        <div style="font-size: 48px; margin-bottom: 10px;">🎬</div>
                        <p style="font-size: 14px;">Aucune vidéo</p>
                        <p style="font-size: 12px; margin-top: 5px;">Double-cliquez pour ajouter</p>
                    </div>
                </div>
            `;
        }

        const controls = component.show_controls !== false ? 'controls' : '';
        const autoplay = component.autoplay ? 'autoplay' : '';
        const loop = component.loop ? 'loop' : '';
        const muted = component.muted ? 'muted' : '';

        return `
            <video 
                src="${videoPath}" 
                ${controls}
                ${autoplay}
                ${loop}
                ${muted}
                style="width: 100%; height: 100%; object-fit: contain; background: #000;"
            >
                Votre navigateur ne supporte pas la balise vidéo.
            </video>
        `;
    }

    handleEdit(element, component) {
        showVideoModal(component, (newVideoPath) => {
            component.video_path = newVideoPath;
            
            // Mettre à jour l'affichage
            const content = element.querySelector('video, div');
            if (content) {
                content.outerHTML = this.render(component);
                this.postRender(element, component);
            }
            
            // Émettre l'événement de mise à jour
            this.state.emit('componentContentUpdated', {
                id: component.id,
                video_path: newVideoPath
            });
        });
    }

    postRender(element, component) {
        const video = element.querySelector('video');
        if (!video) return;

        // Gestion des erreurs de chargement
        video.addEventListener('error', (e) => {
            console.error(`Erreur de chargement de la vidéo: ${component.video_path}`, e);
            element.querySelector('video').outerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; background: #2a2a2a; border: 2px solid #ff4a4a; border-radius: 5px; color: #ff4a4a; text-align: center; padding: 20px;">
                    <div>
                        <div style="font-size: 48px; margin-bottom: 10px;">⚠️</div>
                        <p style="font-size: 14px;">Erreur de chargement</p>
                        <p style="font-size: 12px; margin-top: 5px;">${component.video_path}</p>
                    </div>
                </div>
            `;
        });

        // Log quand la vidéo est chargée
        video.addEventListener('loadedmetadata', () => {
            console.log(`Vidéo chargée: ${component.video_path} (${video.duration}s)`);
        });

        // Pause automatique quand on sort du composant en édition
        if (this.state.isEditingTextMode()) {
            video.pause();
        }
    }

    getPropertyFields(component) {
        const baseFields = super.getPropertyFields(component);
        
        return [
            ...baseFields,
            {
                label: 'Chemin de la vidéo',
                type: 'text',
                key: 'video_path',
                value: component.video_path || '',
                readonly: true
            },
            {
                label: 'Afficher les contrôles',
                type: 'checkbox',
                key: 'show_controls',
                value: component.show_controls !== false
            },
            {
                label: 'Lecture automatique',
                type: 'checkbox',
                key: 'autoplay',
                value: component.autoplay || false
            },
            {
                label: 'Boucle',
                type: 'checkbox',
                key: 'loop',
                value: component.loop || false
            },
            {
                label: 'Muet',
                type: 'checkbox',
                key: 'muted',
                value: component.muted || false
            }
        ];
    }

    getDefaultProperties() {
        return {
            w: 560,
            h: 315,
            show_controls: true,
            autoplay: false,
            loop: false,
            muted: false
        };
    }

    onCleanup(componentId) {
        // Arrêter la lecture de la vidéo si elle existe
        const element = document.getElementById(componentId);
        if (element) {
            const video = element.querySelector('video');
            if (video) {
                video.pause();
                video.src = '';
            }
        }
    }
}