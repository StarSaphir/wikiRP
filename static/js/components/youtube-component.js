// components/youtube-component.js - Composant vidéo YouTube

import { BaseComponent } from './base-component.js';
import { showYoutubeModal } from '../modals/youtube-modal.js';

export class YoutubeComponent extends BaseComponent {
    render(component) {
        const videoId = component.youtube_id || '';
        
        if (!videoId) {
            return `
                <div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; background: #2a2a2a; border: 2px dashed #666; border-radius: 5px; color: #666; text-align: center; padding: 20px;">
                    <div>
                        <div style="font-size: 48px; margin-bottom: 10px;">📺</div>
                        <p style="font-size: 14px;">Aucune vidéo YouTube</p>
                        <p style="font-size: 12px; margin-top: 5px;">Double-cliquez pour ajouter</p>
                    </div>
                </div>
            `;
        }

        // Options YouTube
        const autoplay = component.autoplay ? '1' : '0';
        const loop = component.loop ? '1' : '0';
        const controls = component.show_controls !== false ? '1' : '0';
        const modestbranding = component.modest_branding ? '1' : '0';
        const rel = component.show_related ? '1' : '0';

        // Construire l'URL avec les paramètres
        const params = new URLSearchParams({
            autoplay,
            loop: loop === '1' ? '1' : '0',
            controls,
            modestbranding,
            rel,
            ...(loop === '1' && { playlist: videoId })
        });

        return `
            <iframe 
                src="https://www.youtube.com/embed/${videoId}?${params.toString()}"
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen
                style="width: 100%; height: 100%; border-radius: 5px;"
            ></iframe>
        `;
    }

    handleEdit(element, component) {
        showYoutubeModal(component, (newVideoId) => {
            component.youtube_id = newVideoId;
            
            // Mettre à jour l'affichage
            const content = element.querySelector('iframe, div');
            if (content) {
                content.outerHTML = this.render(component);
            }
            
            // Émettre l'événement de mise à jour
            this.state.emit('componentContentUpdated', {
                id: component.id,
                youtube_id: newVideoId
            });
        });
    }

    postRender(element, component) {
        const iframe = element.querySelector('iframe');
        if (!iframe) return;

        // Log pour debug
        console.log(`YouTube embed chargé: ${component.youtube_id}`);

        // Ajouter un indicateur visuel de chargement
        iframe.addEventListener('load', () => {
            console.log(`YouTube iframe ready: ${component.youtube_id}`);
        });
    }

    /**
     * Extrait l'ID YouTube de différents formats d'URL
     * @param {string} url - URL YouTube
     * @returns {string|null} - ID de la vidéo ou null
     */
    static extractYoutubeId(url) {
        if (!url) return null;

        // Différents patterns d'URL YouTube
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\?\/]+)/,
            /^([a-zA-Z0-9_-]{11})$/ // ID direct
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }

        return null;
    }

    /**
     * Génère une URL de miniature YouTube
     * @param {string} videoId - ID de la vidéo
     * @param {string} quality - Qualité (default, hq, mq, sd, maxres)
     * @returns {string} - URL de la miniature
     */
    static getThumbnailUrl(videoId, quality = 'hq') {
        const qualityMap = {
            default: 'default',
            mq: 'mqdefault',
            hq: 'hqdefault',
            sd: 'sddefault',
            maxres: 'maxresdefault'
        };

        const qualityStr = qualityMap[quality] || 'hqdefault';
        return `https://img.youtube.com/vi/${videoId}/${qualityStr}.jpg`;
    }

    getPropertyFields(component) {
        const baseFields = super.getPropertyFields(component);
        
        return [
            ...baseFields,
            {
                label: 'ID YouTube',
                type: 'text',
                key: 'youtube_id',
                value: component.youtube_id || '',
                placeholder: 'dQw4w9WgXcQ'
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
                label: 'Logo YouTube discret',
                type: 'checkbox',
                key: 'modest_branding',
                value: component.modest_branding || false
            },
            {
                label: 'Afficher vidéos similaires',
                type: 'checkbox',
                key: 'show_related',
                value: component.show_related || false
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
            modest_branding: false,
            show_related: false
        };
    }

    validate(component) {
        const baseValid = super.validate(component);
        if (!baseValid) return false;

        // Vérifier que l'ID YouTube est valide
        if (component.youtube_id) {
            return /^[a-zA-Z0-9_-]{11}$/.test(component.youtube_id);
        }

        return true;
    }
}