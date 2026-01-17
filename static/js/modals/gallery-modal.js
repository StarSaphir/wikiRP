// modals/gallery-modal.js - Modale de gestion de galerie d'images

export function showGalleryModal(component, onGalleryUpdated) {
    const modal = document.getElementById('gallery-modal');
    if (!modal) {
        console.error('Modale galerie non trouvée dans le DOM');
        return;
    }

    const filesInput = document.getElementById('gallery-files');
    const uploadBtn = document.getElementById('upload-gallery-btn');
    const cancelBtn = modal.querySelector('.cancel-btn');

    // Images actuelles de la galerie
    let currentImages = [...(component.images || [])];

    // Réinitialiser le formulaire
    if (filesInput) filesInput.value = '';

    // 🔧 DÉCLARER LES FONCTIONS D'ABORD (avant de les utiliser)
    
    // Gestionnaire de sauvegarde (fermeture)
    const handleSave = () => {
        console.log('💾 Sauvegarde galerie:', currentImages.length, 'images');
        console.log('📋 Liste des images:', currentImages);
        
        // 🔧 DEBUG: Vérifier les doublons
        const uniqueImages = [...new Set(currentImages)];
        if (uniqueImages.length !== currentImages.length) {
            console.warn('⚠️ Doublons détectés! Nettoyage...');
            currentImages = uniqueImages;
        }
        
        if (onGalleryUpdated) {
            onGalleryUpdated(currentImages);
        }
        cleanup();
    };

    // Gestionnaire d'annulation
    const handleCancel = () => {
        const originalLength = component.images?.length || 0;
        const hasChanges = currentImages.length !== originalLength;
        
        if (hasChanges) {
            if (!confirm('Des modifications ont été apportées. Annuler quand même ?')) {
                return;
            }
        }
        cleanup();
    };

    // Nettoyage
    const cleanup = () => {
        modal.style.display = 'none';
        if (filesInput) filesInput.value = '';
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Ajouter des images';
        uploadBtn.removeEventListener('click', handleUpload);
        cancelBtn.removeEventListener('click', handleCancel);
        
        // Nettoyer le conteneur d'images
        const container = modal.querySelector('.gallery-images-container');
        if (container && container.parentNode) {
            container.remove();
        }
    };

    // Gestionnaire d'upload
    const handleUpload = async () => {
        const files = filesInput.files;
        
        if (!files || files.length === 0) {
            alert('⚠️ Veuillez sélectionner au moins une image');
            return;
        }

        // 🔧 DEBUG: Afficher le nombre de fichiers sélectionnés
        console.log('📁 Fichiers sélectionnés:', files.length);

        // Vérifier les types et tailles
        for (let file of files) {
            if (!file.type.startsWith('image/')) {
                alert(`⚠️ ${file.name} n'est pas une image`);
                return;
            }
            if (file.size > 10 * 1024 * 1024) {
                alert(`⚠️ ${file.name} est trop volumineuse (max 10MB)`);
                return;
            }
        }

        try {
            uploadBtn.disabled = true;
            uploadBtn.textContent = '⏳ Upload en cours...';

            const slug = window.SLUG || '';
            const uploadedPaths = [];

            // 🔧 FIX: Convertir FileList en Array pour éviter les problèmes
            const filesArray = Array.from(files);
            console.log('📤 Upload de', filesArray.length, 'fichier(s)...');

            // Upload chaque fichier
            for (let i = 0; i < filesArray.length; i++) {
                const file = filesArray[i];
                
                uploadBtn.textContent = `⏳ Upload ${i + 1}/${filesArray.length}...`;
                console.log(`📤 Upload fichier ${i + 1}:`, file.name);

                const formData = new FormData();
                formData.append('file', file);

                const response = await fetch(`/api/upload/${slug}`, {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`❌ Erreur upload ${file.name}:`, errorText);
                    throw new Error(`Erreur lors de l'upload de ${file.name}`);
                }

                const data = await response.json();
                console.log(`✅ Fichier ${i + 1} uploadé:`, data.path);
                
                if (data.path) {
                    uploadedPaths.push(data.path);
                }
            }

            console.log('✅ Tous les fichiers uploadés:', uploadedPaths.length);

            // 🔧 FIX: Ajouter tous les fichiers d'un coup, en vérifiant les doublons
            uploadedPaths.forEach(path => {
                if (!currentImages.includes(path)) {
                    currentImages.push(path);
                    console.log('➕ Ajout image:', path);
                } else {
                    console.warn('⚠️ Image déjà présente, ignorée:', path);
                }
            });

            console.log('📋 Total images après ajout:', currentImages.length);

            // Réinitialiser l'input APRÈS avoir tout uploadé
            filesInput.value = '';

            // Rafraîchir l'affichage
            renderGalleryImages(currentImages, modal, handleSave);

            // Feedback
            const addedCount = uploadedPaths.length;
            uploadBtn.textContent = `✅ ${addedCount} image(s) ajoutée(s)`;
            setTimeout(() => {
                uploadBtn.textContent = 'Ajouter des images';
            }, 2000);

        } catch (error) {
            console.error('❌ Erreur lors de l\'upload:', error);
            alert('❌ Erreur lors de l\'upload: ' + error.message);
            uploadBtn.textContent = 'Ajouter des images';
        } finally {
            uploadBtn.disabled = false;
        }
    };

    // Afficher la modale
    modal.style.display = 'flex';

    // Afficher les images existantes
    renderGalleryImages(currentImages, modal, handleSave);

    // Attacher les événements
    uploadBtn.addEventListener('click', handleUpload);
    cancelBtn.addEventListener('click', handleCancel);

    // Preview des fichiers sélectionnés
    if (filesInput) {
        filesInput.addEventListener('change', () => {
            if (filesInput.files.length > 0) {
                showFilePreview(filesInput.files, modal);
            }
        });
    }

    // Fonction pour supprimer une image
    window.removeGalleryImage = (index) => {
        if (confirm('Supprimer cette image ?')) {
            currentImages.splice(index, 1);
            renderGalleryImages(currentImages, modal, handleSave);
        }
    };

    // Fonction pour réorganiser (monter/descendre)
    window.moveGalleryImage = (index, direction) => {
        const newIndex = index + direction;
        if (newIndex >= 0 && newIndex < currentImages.length) {
            [currentImages[index], currentImages[newIndex]] = 
            [currentImages[newIndex], currentImages[index]];
            renderGalleryImages(currentImages, modal, handleSave);
        }
    };

    // Fermeture au clic en dehors
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            handleSave();
        }
    });
}

/**
 * Afficher les images de la galerie
 */
function renderGalleryImages(images, modal, handleSave) {
    let container = modal.querySelector('.gallery-images-container');
    
    // Créer ou vider le conteneur proprement
    if (!container) {
        container = document.createElement('div');
        container.className = 'gallery-images-container';
        container.style.cssText = `
            max-height: 300px;
            overflow-y: auto;
            margin: 15px 0;
            padding: 10px;
            background: #1a1a1a;
            border-radius: 5px;
        `;
        
        const modalContent = modal.querySelector('.modal-content');
        const filesInput = modal.querySelector('#gallery-files');
        
        // Insérer AVANT l'input de fichier
        if (filesInput && modalContent) {
            modalContent.insertBefore(container, filesInput);
        } else {
            // Fallback: ajouter à la fin
            modalContent.appendChild(container);
        }
    } else {
        // Vider le conteneur existant
        container.innerHTML = '';
    }

    if (images.length === 0) {
        container.innerHTML = `
            <p style="color: #666; text-align: center; padding: 20px;">
                Aucune image dans la galerie<br>
                <span style="font-size: 12px;">Ajoutez des images ci-dessous</span>
            </p>
        `;
        return;
    }

    // Header avec bouton Terminer
    const header = document.createElement('div');
    header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;';
    header.innerHTML = `
        <strong style="color: #4a9eff; font-size: 14px;">${images.length} image(s)</strong>
        <div style="display: flex; gap: 8px;">
            <button class="debug-gallery-btn" style="
                padding: 6px 12px;
                background: #f0ad4e;
                border: none;
                color: white;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                font-weight: bold;
            ">🔍 Debug</button>
            <button class="save-gallery-btn" style="
                padding: 6px 12px;
                background: #5cb85c;
                border: none;
                color: white;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                font-weight: bold;
            ">✓ Terminer</button>
        </div>
    `;
    container.appendChild(header);

    // Attacher l'événement au bouton Debug
    const debugBtn = header.querySelector('.debug-gallery-btn');
    if (debugBtn) {
        debugBtn.addEventListener('click', () => {
            console.log('🔍 DEBUG Galerie:');
            console.log('- Nombre total:', images.length);
            console.log('- Images:', images);
            console.log('- Doublons?', images.length !== new Set(images).size);
            alert(`Debug:\n${images.length} images\n\n${images.join('\n')}`);
        });
    }

    // Attacher l'événement au bouton Terminer
    const saveBtn = header.querySelector('.save-gallery-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            handleSave();
        });
    }

    // Liste des images
    images.forEach((imagePath, index) => {
        const imageItem = document.createElement('div');
        imageItem.style.cssText = `
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 10px;
            padding: 10px;
            background: #2a2a2a;
            border-radius: 5px;
            border: 2px solid #333;
            transition: border-color 0.2s;
        `;

        imageItem.innerHTML = `
            <img src="${imagePath}" style="
                width: 80px;
                height: 80px;
                object-fit: cover;
                border-radius: 4px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            " />
            <div style="flex: 1; min-width: 0;">
                <div style="color: #e0e0e0; font-size: 12px; font-weight: bold; margin-bottom: 5px;">
                    Image ${index + 1}
                </div>
                <div style="color: #666; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${imagePath.split('/').pop()}
                </div>
            </div>
            <div style="display: flex; flex-direction: column; gap: 5px;">
                <button onclick="moveGalleryImage(${index}, -1)" ${index === 0 ? 'disabled' : ''} style="
                    padding: 4px 8px;
                    background: #4a9eff;
                    border: none;
                    color: white;
                    border-radius: 3px;
                    cursor: pointer;
                    font-size: 12px;
                    ${index === 0 ? 'opacity: 0.3; cursor: not-allowed;' : ''}
                " title="Monter">▲</button>
                <button onclick="moveGalleryImage(${index}, 1)" ${index === images.length - 1 ? 'disabled' : ''} style="
                    padding: 4px 8px;
                    background: #4a9eff;
                    border: none;
                    color: white;
                    border-radius: 3px;
                    cursor: pointer;
                    font-size: 12px;
                    ${index === images.length - 1 ? 'opacity: 0.3; cursor: not-allowed;' : ''}
                " title="Descendre">▼</button>
            </div>
            <button onclick="removeGalleryImage(${index})" style="
                padding: 6px 10px;
                background: #d9534f;
                border: none;
                color: white;
                border-radius: 3px;
                cursor: pointer;
                font-size: 12px;
            ">🗑️</button>
        `;

        container.appendChild(imageItem);

        // Effet hover
        imageItem.addEventListener('mouseenter', () => {
            imageItem.style.borderColor = '#4a9eff';
        });
        imageItem.addEventListener('mouseleave', () => {
            imageItem.style.borderColor = '#333';
        });
    });
}

/**
 * Afficher un aperçu des fichiers à uploader
 */
function showFilePreview(files, modal) {
    let previewContainer = modal.querySelector('.files-preview');
    
    if (!previewContainer) {
        previewContainer = document.createElement('div');
        previewContainer.className = 'files-preview';
        previewContainer.style.cssText = `
            margin: 10px 0;
            padding: 10px;
            background: #1a1a1a;
            border-radius: 5px;
        `;
        
        const uploadBtn = modal.querySelector('#upload-gallery-btn');
        if (uploadBtn && uploadBtn.parentElement) {
            uploadBtn.parentElement.insertBefore(previewContainer, uploadBtn);
        }
    }

    previewContainer.innerHTML = `
        <p style="color: #4a9eff; font-size: 13px; margin-bottom: 8px;">
            ${files.length} fichier(s) sélectionné(s):
        </p>
    `;

    Array.from(files).forEach(file => {
        const fileInfo = document.createElement('div');
        fileInfo.style.cssText = `
            color: #999;
            font-size: 11px;
            padding: 4px 0;
        `;
        fileInfo.textContent = `• ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
        previewContainer.appendChild(fileInfo);
    });
}

/**
 * Créer la modale de galerie si elle n'existe pas
 */
export function createGalleryModal() {
    if (document.getElementById('gallery-modal')) {
        return;
    }

    const modal = document.createElement('div');
    modal.id = 'gallery-modal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="min-width: 500px; max-width: 600px;">
            <h3 style="color: #4a9eff; margin-bottom: 20px;">🎞️ Gestion de la Galerie</h3>
            
            <input type="file" id="gallery-files" accept="image/*" multiple style="
                width: 100%;
                padding: 10px;
                margin-bottom: 10px;
                background: #333;
                border: 1px solid #444;
                color: #e0e0e0;
                border-radius: 5px;
                cursor: pointer;
            ">
            <p style="color: #666; font-size: 12px; margin-bottom: 15px;">
                💡 Vous pouvez sélectionner plusieurs images à la fois<br>
                Formats acceptés: JPG, PNG, GIF, WebP • Max 10MB par image
            </p>
            
            <div style="display: flex; gap: 10px;">
                <button id="upload-gallery-btn" style="
                    flex: 1;
                    padding: 10px 20px;
                    background: #4a9eff;
                    border: none;
                    color: white;
                    border-radius: 5px;
                    cursor: pointer;
                    font-weight: bold;
                ">Ajouter des images</button>
                <button class="cancel-btn" style="
                    padding: 10px 20px;
                    background: #666;
                    border: none;
                    color: white;
                    border-radius: 5px;
                    cursor: pointer;
                ">Fermer</button>
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
        createGalleryModal();
    });
}