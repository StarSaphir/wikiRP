// modals/youtube-modal.js - Modale d'ajout de vidéo YouTube

export function showYoutubeModal(component, onYoutubeAdded) {
    const modal = document.getElementById('youtube-modal');
    if (!modal) {
        console.error('Modale YouTube non trouvée dans le DOM');
        return;
    }

    const urlInput = document.getElementById('youtube-url');
    const addBtn = document.getElementById('add-youtube-btn');
    const cancelBtn = modal.querySelector('.cancel-btn');

    // Réinitialiser le formulaire
    if (urlInput) urlInput.value = '';

    // Afficher la modale
    modal.style.display = 'flex';

    // Focus sur l'input
    setTimeout(() => urlInput?.focus(), 100);

    // Gestionnaire d'ajout
    const handleAdd = () => {
        const url = urlInput.value.trim();
        
        if (!url) {
            alert('⚠️ Veuillez entrer une URL YouTube');
            return;
        }

        // Extraire l'ID de la vidéo
        const videoId = extractYoutubeId(url);
        
        if (!videoId) {
            alert('⚠️ URL YouTube invalide\n\nExemples valides:\n' +
                  '• https://www.youtube.com/watch?v=dQw4w9WgXcQ\n' +
                  '• https://youtu.be/dQw4w9WgXcQ\n' +
                  '• dQw4w9WgXcQ (ID direct)');
            return;
        }

        // Vérifier que la vidéo existe (optionnel)
        checkVideoExists(videoId).then(exists => {
            if (exists) {
                if (onYoutubeAdded) {
                    onYoutubeAdded(videoId);
                }
                cleanup();
            } else {
                alert('⚠️ Impossible de trouver cette vidéo YouTube\n\nVérifiez que:\n' +
                      '• L\'URL est correcte\n' +
                      '• La vidéo n\'est pas privée\n' +
                      '• La vidéo n\'a pas été supprimée');
            }
        });
    };

    // Gestionnaire d'annulation
    const handleCancel = () => {
        cleanup();
    };

    // Nettoyage
    const cleanup = () => {
        modal.style.display = 'none';
        if (urlInput) urlInput.value = '';
        addBtn.removeEventListener('click', handleAdd);
        cancelBtn.removeEventListener('click', handleCancel);
        
        // Retirer le preview si existant
        const preview = modal.querySelector('.youtube-preview');
        if (preview) preview.remove();
    };

    // Attacher les événements
    addBtn.addEventListener('click', handleAdd);
    cancelBtn.addEventListener('click', handleCancel);

    // Entrée = Ajouter
    if (urlInput) {
        urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleAdd();
            }
        });

        // Preview en temps réel
        let previewTimeout;
        urlInput.addEventListener('input', () => {
            clearTimeout(previewTimeout);
            previewTimeout = setTimeout(() => {
                const url = urlInput.value.trim();
                const videoId = extractYoutubeId(url);
                if (videoId) {
                    showPreview(videoId, modal);
                } else {
                    const preview = modal.querySelector('.youtube-preview');
                    if (preview) preview.remove();
                }
            }, 500);
        });
    }

    // Fermeture au clic en dehors
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            cleanup();
        }
    });

    // Fermeture à la touche Échap
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            cleanup();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
}

/**
 * Extraire l'ID YouTube de différents formats d'URL
 */
function extractYoutubeId(url) {
    if (!url) return null;

    // Patterns d'URL YouTube
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\?\/]+)/,
        /^([a-zA-Z0-9_-]{11})$/ // ID direct (11 caractères)
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
 * Vérifier si une vidéo YouTube existe
 */
async function checkVideoExists(videoId) {
    try {
        // Essayer de charger la miniature
        const img = new Image();
        const promise = new Promise((resolve) => {
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            
            // Timeout après 5 secondes
            setTimeout(() => resolve(false), 5000);
        });

        img.src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
        
        return await promise;
    } catch (error) {
        console.error('Erreur lors de la vérification:', error);
        return true; // On laisse passer en cas d'erreur réseau
    }
}

/**
 * Afficher un aperçu de la vidéo YouTube
 */
function showPreview(videoId, modal) {
    const existingPreview = modal.querySelector('.youtube-preview');
    if (existingPreview) {
        existingPreview.remove();
    }

    const preview = document.createElement('div');
    preview.className = 'youtube-preview';
    preview.style.cssText = `
        margin: 15px 0;
        text-align: center;
        padding: 10px;
        background: #1a1a1a;
        border-radius: 5px;
    `;

    // Miniature YouTube
    const thumbnail = document.createElement('img');
    thumbnail.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    thumbnail.style.cssText = `
        max-width: 100%;
        border-radius: 5px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.5);
        cursor: pointer;
    `;

    // Overlay play button
    const playOverlay = document.createElement('div');
    playOverlay.style.cssText = `
        position: relative;
        display: inline-block;
    `;
    
    const playButton = document.createElement('div');
    playButton.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 68px;
        height: 48px;
        background: rgba(255, 0, 0, 0.8);
        border-radius: 12px;
        cursor: pointer;
        transition: background 0.3s;
    `;
    playButton.innerHTML = `
        <svg height="100%" version="1.1" viewBox="0 0 68 48" width="100%">
            <path d="M66.52,7.74c-0.78-2.93-2.49-5.41-5.42-6.19C55.79,.13,34,0,34,0S12.21,.13,6.9,1.55 C3.97,2.33,2.27,4.81,1.48,7.74C0.06,13.05,0,24,0,24s0.06,10.95,1.48,16.26c0.78,2.93,2.49,5.41,5.42,6.19 C12.21,47.87,34,48,34,48s21.79-0.13,27.1-1.55c2.93-0.78,4.64-3.26,5.42-6.19C67.94,34.95,68,24,68,24S67.94,13.05,66.52,7.74z" fill="#f00"></path>
            <path d="M 45,24 27,14 27,34" fill="#fff"></path>
        </svg>
    `;

    thumbnail.addEventListener('mouseenter', () => {
        playButton.style.background = 'rgba(255, 0, 0, 1)';
    });

    thumbnail.addEventListener('mouseleave', () => {
        playButton.style.background = 'rgba(255, 0, 0, 0.8)';
    });

    playOverlay.appendChild(thumbnail);
    playOverlay.appendChild(playButton);

    const info = document.createElement('p');
    info.style.cssText = `
        color: #999;
        font-size: 12px;
        margin-top: 10px;
    `;
    info.textContent = `ID: ${videoId}`;

    preview.appendChild(playOverlay);
    preview.appendChild(info);

    const modalContent = modal.querySelector('.modal-content');
    const addBtn = modal.querySelector('#add-youtube-btn');
    modalContent.insertBefore(preview, addBtn);

    // Clic sur la miniature pour ouvrir dans un nouvel onglet
    thumbnail.addEventListener('click', () => {
        window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
    });
}

/**
 * Créer la modale YouTube si elle n'existe pas
 */
export function createYoutubeModal() {
    if (document.getElementById('youtube-modal')) {
        return; // Déjà créée
    }

    const modal = document.createElement('div');
    modal.id = 'youtube-modal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3 style="color: #4a9eff; margin-bottom: 20px;">📺 Ajouter une Vidéo YouTube</h3>
            <input 
                type="text" 
                id="youtube-url" 
                placeholder="https://www.youtube.com/watch?v=..."
                style="
                    width: 100%;
                    padding: 10px;
                    margin-bottom: 10px;
                    background: #333;
                    border: 1px solid #444;
                    color: #e0e0e0;
                    border-radius: 5px;
                    font-size: 14px;
                "
            >
            <p style="color: #666; font-size: 12px; margin-bottom: 15px;">
                <strong>Exemples valides:</strong><br>
                • https://www.youtube.com/watch?v=dQw4w9WgXcQ<br>
                • https://youtu.be/dQw4w9WgXcQ<br>
                • dQw4w9WgXcQ (ID direct)
            </p>
            <div style="display: flex; gap: 10px;">
                <button id="add-youtube-btn" style="
                    flex: 1;
                    padding: 10px 20px;
                    background: #4a9eff;
                    border: none;
                    color: white;
                    border-radius: 5px;
                    cursor: pointer;
                    font-weight: bold;
                ">Ajouter</button>
                <button class="cancel-btn" style="
                    flex: 1;
                    padding: 10px 20px;
                    background: #666;
                    border: none;
                    color: white;
                    border-radius: 5px;
                    cursor: pointer;
                ">Annuler</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

/**
 * Initialiser la modale au chargement
 */
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        createYoutubeModal();
    });
}