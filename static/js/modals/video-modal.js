// modals/video-modal.js - Modale d'upload de vidéo

export function showVideoModal(component, onVideoUploaded) {
    const modal = document.getElementById('video-modal');
    if (!modal) {
        console.error('Modale vidéo non trouvée dans le DOM');
        return;
    }

    const fileInput = document.getElementById('video-file');
    const uploadBtn = document.getElementById('upload-video-btn');
    const cancelBtn = modal.querySelector('.cancel-btn');

    // Réinitialiser le formulaire
    if (fileInput) fileInput.value = '';

    // Afficher la modale
    modal.style.display = 'flex';

    // Gestionnaire d'upload
    const handleUpload = async () => {
        const file = fileInput.files[0];
        
        if (!file) {
            alert('⚠️ Veuillez sélectionner une vidéo');
            return;
        }

        // Vérifier le type de fichier
        if (!file.type.startsWith('video/')) {
            alert('⚠️ Le fichier doit être une vidéo (MP4, WebM, OGG, etc.)');
            return;
        }

        // Vérifier la taille (max 50MB)
        const maxSize = 50 * 1024 * 1024; // 50MB
        if (file.size > maxSize) {
            alert('⚠️ La vidéo est trop volumineuse (max 50MB)');
            return;
        }

        try {
            // Afficher un loader avec progression
            uploadBtn.disabled = true;
            const originalText = uploadBtn.textContent;

            // Créer le FormData
            const formData = new FormData();
            formData.append('file', file);

            // Upload avec suivi de progression
            const slug = window.SLUG || '';
            
            const xhr = new XMLHttpRequest();
            
            // Progression de l'upload
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percent = Math.round((e.loaded / e.total) * 100);
                    uploadBtn.textContent = `⏳ Upload: ${percent}%`;
                }
            });

            // Promesse pour gérer la réponse
            const uploadPromise = new Promise((resolve, reject) => {
                xhr.addEventListener('load', () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve(JSON.parse(xhr.responseText));
                    } else {
                        reject(new Error(`Erreur HTTP: ${xhr.status}`));
                    }
                });

                xhr.addEventListener('error', () => {
                    reject(new Error('Erreur réseau'));
                });

                xhr.addEventListener('abort', () => {
                    reject(new Error('Upload annulé'));
                });
            });

            xhr.open('POST', `/api/upload-video/${slug}`);
            xhr.send(formData);

            const data = await uploadPromise;

            if (data.path) {
                // Succès
                uploadBtn.textContent = '✅ Upload terminé !';
                
                setTimeout(() => {
                    if (onVideoUploaded) {
                        onVideoUploaded(data.path);
                    }
                    cleanup();
                }, 1000);
            } else {
                throw new Error('Pas de chemin de vidéo dans la réponse');
            }

        } catch (error) {
            console.error('Erreur lors de l\'upload:', error);
            alert('❌ Erreur lors de l\'upload de la vidéo: ' + error.message);
            
            // Réactiver le bouton
            uploadBtn.disabled = false;
            uploadBtn.textContent = 'Uploader';
        }
    };

    // Gestionnaire d'annulation
    const handleCancel = () => {
        cleanup();
    };

    // Nettoyage
    const cleanup = () => {
        modal.style.display = 'none';
        if (fileInput) fileInput.value = '';
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Uploader';
        uploadBtn.removeEventListener('click', handleUpload);
        cancelBtn.removeEventListener('click', handleCancel);
        
        // Retirer le preview si existant
        const preview = modal.querySelector('.video-preview');
        if (preview) preview.remove();
    };

    // Attacher les événements
    uploadBtn.addEventListener('click', handleUpload);
    cancelBtn.addEventListener('click', handleCancel);

    // Preview au changement de fichier
    if (fileInput) {
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                showPreview(fileInput.files[0], modal);
            }
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
 * Afficher un aperçu de la vidéo sélectionnée
 */
function showPreview(file, modal) {
    const existingPreview = modal.querySelector('.video-preview');
    if (existingPreview) {
        existingPreview.remove();
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.createElement('div');
        preview.className = 'video-preview';
        preview.style.cssText = `
            margin: 15px 0;
            text-align: center;
            padding: 10px;
            background: #1a1a1a;
            border-radius: 5px;
        `;

        const video = document.createElement('video');
        video.src = e.target.result;
        video.controls = true;
        video.style.cssText = `
            max-width: 100%;
            max-height: 200px;
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.5);
        `;

        const info = document.createElement('p');
        info.style.cssText = `
            color: #999;
            font-size: 12px;
            margin-top: 10px;
        `;
        info.textContent = `${file.name} - ${(file.size / (1024 * 1024)).toFixed(2)} MB`;

        preview.appendChild(video);
        preview.appendChild(info);

        const modalContent = modal.querySelector('.modal-content');
        const uploadBtn = modal.querySelector('#upload-video-btn');
        modalContent.insertBefore(preview, uploadBtn);

        // Charger les métadonnées pour afficher la durée
        video.addEventListener('loadedmetadata', () => {
            const duration = Math.round(video.duration);
            const minutes = Math.floor(duration / 60);
            const seconds = duration % 60;
            info.textContent += ` - Durée: ${minutes}:${seconds.toString().padStart(2, '0')}`;
        });
    };

    reader.readAsDataURL(file);
}

/**
 * Créer la modale de vidéo si elle n'existe pas
 */
export function createVideoModal() {
    if (document.getElementById('video-modal')) {
        return; // Déjà créée
    }

    const modal = document.createElement('div');
    modal.id = 'video-modal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3 style="color: #4a9eff; margin-bottom: 20px;">🎬 Ajouter une Vidéo</h3>
            <input type="file" id="video-file" accept="video/*" style="
                width: 100%;
                padding: 10px;
                margin-bottom: 15px;
                background: #333;
                border: 1px solid #444;
                color: #e0e0e0;
                border-radius: 5px;
                cursor: pointer;
            ">
            <p style="color: #666; font-size: 12px; margin-bottom: 15px;">
                Formats acceptés: MP4, WebM, OGG<br>
                Taille maximum: 50MB<br>
                <strong style="color: #ff9800;">⚠️ Pour des vidéos plus volumineuses, utilisez YouTube</strong>
            </p>
            <div style="display: flex; gap: 10px;">
                <button id="upload-video-btn" style="
                    flex: 1;
                    padding: 10px 20px;
                    background: #4a9eff;
                    border: none;
                    color: white;
                    border-radius: 5px;
                    cursor: pointer;
                    font-weight: bold;
                ">Uploader</button>
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
        createVideoModal();
    });
}