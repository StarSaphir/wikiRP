// modals/image-modal.js - Modale d'upload d'image

export function showImageModal(component, onImageUploaded) {
    const modal = document.getElementById('image-modal');
    if (!modal) {
        console.error('Modale image non trouvée dans le DOM');
        return;
    }

    const fileInput = document.getElementById('image-file');
    const uploadBtn = document.getElementById('upload-image-btn');
    const cancelBtn = modal.querySelector('.cancel-btn');

    // Réinitialiser le formulaire
    if (fileInput) fileInput.value = '';

    // Afficher la modale
    modal.style.display = 'flex';

    // Gestionnaire d'upload
    const handleUpload = async () => {
        const file = fileInput.files[0];
        
        if (!file) {
            alert('⚠️ Veuillez sélectionner une image');
            return;
        }

        // Vérifier le type de fichier
        if (!file.type.startsWith('image/')) {
            alert('⚠️ Le fichier doit être une image (JPG, PNG, GIF, etc.)');
            return;
        }

        // Vérifier la taille (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            alert('⚠️ L\'image est trop volumineuse (max 10MB)');
            return;
        }

        try {
            // Afficher un loader
            uploadBtn.disabled = true;
            uploadBtn.textContent = '⏳ Upload en cours...';

            // Créer le FormData
            const formData = new FormData();
            formData.append('file', file);

            // Upload via API
            const slug = window.SLUG || '';
            const response = await fetch(`/api/upload/${slug}`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }

            const data = await response.json();

            if (data.path) {
                // Succès
                if (onImageUploaded) {
                    onImageUploaded(data.path);
                }
                cleanup();
            } else {
                throw new Error('Pas de chemin d\'image dans la réponse');
            }

        } catch (error) {
            console.error('Erreur lors de l\'upload:', error);
            alert('❌ Erreur lors de l\'upload de l\'image: ' + error.message);
            
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
    };

    // Attacher les événements
    uploadBtn.addEventListener('click', handleUpload);
    cancelBtn.addEventListener('click', handleCancel);

    // Upload au changement de fichier (optionnel)
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
 * Afficher un aperçu de l'image sélectionnée
 */
function showPreview(file, modal) {
    const existingPreview = modal.querySelector('.image-preview');
    if (existingPreview) {
        existingPreview.remove();
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.createElement('div');
        preview.className = 'image-preview';
        preview.style.cssText = `
            margin: 15px 0;
            text-align: center;
            padding: 10px;
            background: #1a1a1a;
            border-radius: 5px;
        `;

        const img = document.createElement('img');
        img.src = e.target.result;
        img.style.cssText = `
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
        info.textContent = `${file.name} - ${(file.size / 1024).toFixed(2)} KB`;

        preview.appendChild(img);
        preview.appendChild(info);

        const modalContent = modal.querySelector('.modal-content');
        const uploadBtn = modal.querySelector('#upload-image-btn');
        modalContent.insertBefore(preview, uploadBtn);
    };

    reader.readAsDataURL(file);
}

/**
 * Créer la modale d'image si elle n'existe pas
 */
export function createImageModal() {
    if (document.getElementById('image-modal')) {
        return; // Déjà créée
    }

    const modal = document.createElement('div');
    modal.id = 'image-modal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3 style="color: #4a9eff; margin-bottom: 20px;">🖼️ Ajouter une Image</h3>
            <input type="file" id="image-file" accept="image/*" style="
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
                Formats acceptés: JPG, PNG, GIF, SVG, WebP<br>
                Taille maximum: 10MB
            </p>
            <div style="display: flex; gap: 10px;">
                <button id="upload-image-btn" style="
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
        createImageModal();
    });
}