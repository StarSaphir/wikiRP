// modals/copy-modal.js - Modale de copie de layout d'une autre page

export async function showCopyModal(currentSlug, onCopySuccess) {
    const modal = document.getElementById('copy-modal');
    if (!modal) {
        console.error('Modale de copie non trouvée dans le DOM');
        return;
    }

    const select = document.getElementById('source-page-select');
    const confirmBtn = document.getElementById('confirm-copy-btn');
    const cancelBtn = modal.querySelector('.cancel-btn');

    try {
        // Charger la liste des pages
        const response = await fetch('/api/pages');
        const pages = await response.json();
        
        // Filtrer la page actuelle
        const otherPages = pages.filter(p => p.slug !== currentSlug);

        if (otherPages.length === 0) {
            alert('📭 Aucune autre page disponible pour copier le layout');
            return;
        }

        // Remplir le select avec preview
        select.innerHTML = '';
        
        // Option par défaut
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '-- Sélectionnez une page source --';
        defaultOption.disabled = true;
        defaultOption.selected = true;
        select.appendChild(defaultOption);

        // Ajouter les pages
        otherPages.forEach(page => {
            const option = document.createElement('option');
            option.value = page.slug;
            option.textContent = `${page.title} (${page.slug})`;
            select.appendChild(option);
        });

        // Afficher la modale
        modal.style.display = 'flex';

        // Preview de la page sélectionnée
        select.addEventListener('change', () => {
            showPagePreview(select.value, pages, modal);
        });

        // Gestionnaire de confirmation
        const handleConfirm = async () => {
            const sourceSlug = select.value;
            
            if (!sourceSlug) {
                alert('⚠️ Veuillez sélectionner une page source');
                return;
            }

            // Confirmation
            const sourcePage = otherPages.find(p => p.slug === sourceSlug);
            const confirmation = confirm(
                `⚠️ ATTENTION\n\n` +
                `Cette action va remplacer TOUT le contenu actuel par le layout de "${sourcePage.title}".\n\n` +
                `Cette opération est IRRÉVERSIBLE.\n\n` +
                `Continuer ?`
            );

            if (!confirmation) return;

            try {
                confirmBtn.disabled = true;
                confirmBtn.textContent = '⏳ Copie en cours...';

                const response = await fetch(`/api/pages/${currentSlug}/copy`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ source_slug: sourceSlug })
                });

                if (!response.ok) {
                    throw new Error(`Erreur HTTP: ${response.status}`);
                }

                // Succès
                confirmBtn.textContent = '✅ Copie réussie !';
                
                setTimeout(() => {
                    if (onCopySuccess) {
                        onCopySuccess(sourceSlug);
                    } else {
                        // Par défaut, recharger la page
                        location.reload();
                    }
                }, 1000);

            } catch (error) {
                console.error('Erreur lors de la copie:', error);
                alert('❌ Erreur lors de la copie du layout: ' + error.message);
                
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Copier le layout';
            }
        };

        // Gestionnaire d'annulation
        const handleCancel = () => {
            cleanup();
        };

        // Nettoyage
        const cleanup = () => {
            modal.style.display = 'none';
            select.value = '';
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Copier le layout';
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
            
            // Retirer le preview
            const preview = modal.querySelector('.page-preview');
            if (preview) preview.remove();
        };

        // Attacher les événements
        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);

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

    } catch (error) {
        console.error('Erreur lors du chargement des pages:', error);
        alert('❌ Impossible de charger la liste des pages');
    }
}

/**
 * Afficher un aperçu de la page source
 */
async function showPagePreview(slug, allPages, modal) {
    let previewContainer = modal.querySelector('.page-preview');
    
    if (!previewContainer) {
        previewContainer = document.createElement('div');
        previewContainer.className = 'page-preview';
        previewContainer.style.cssText = `
            margin: 15px 0;
            padding: 15px;
            background: #1a1a1a;
            border-radius: 5px;
            border: 2px solid #4a9eff;
        `;
        
        const select = modal.querySelector('#source-page-select');
        select.parentElement.insertBefore(previewContainer, select.nextSibling);
    }

    if (!slug) {
        previewContainer.remove();
        return;
    }

    // Afficher un loader
    previewContainer.innerHTML = `
        <div style="text-align: center; color: #999; padding: 20px;">
            ⏳ Chargement de l'aperçu...
        </div>
    `;

    try {
        // Charger le layout de la page source
        const response = await fetch(`/api/pages/${slug}/layout`);
        
        if (!response.ok) {
            throw new Error('Impossible de charger le layout');
        }

        const layout = await response.json();
        const page = allPages.find(p => p.slug === slug);

        // Afficher les informations
        previewContainer.innerHTML = `
            <div style="margin-bottom: 10px;">
                <strong style="color: #4a9eff; font-size: 14px;">📄 ${page.title}</strong>
            </div>
            <div style="color: #999; font-size: 12px; margin-bottom: 10px;">
                <strong>${layout.length || 0}</strong> composant(s) dans cette page
            </div>
        `;

        if (layout.length > 0) {
            // Compter les types
            const typeCounts = {};
            layout.forEach(comp => {
                typeCounts[comp.type] = (typeCounts[comp.type] || 0) + 1;
            });

            const typesList = document.createElement('div');
            typesList.style.cssText = `
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 5px;
                margin-top: 10px;
            `;

            const icons = {
                text: '📝',
                image: '🖼️',
                gallery: '🎞️',
                video: '🎬',
                youtube: '📺',
                shape: '⬛',
                table: '📊',
                separator: '➖'
            };

            Object.entries(typeCounts).forEach(([type, count]) => {
                const typeItem = document.createElement('div');
                typeItem.style.cssText = `
                    padding: 5px 10px;
                    background: #2a2a2a;
                    border-radius: 3px;
                    font-size: 11px;
                    color: #e0e0e0;
                `;
                typeItem.textContent = `${icons[type] || '📄'} ${type}: ${count}`;
                typesList.appendChild(typeItem);
            });

            previewContainer.appendChild(typesList);

            // Lien pour prévisualiser
            const previewLink = document.createElement('a');
            previewLink.href = `/pages/${slug}/`;
            previewLink.target = '_blank';
            previewLink.style.cssText = `
                display: inline-block;
                margin-top: 10px;
                padding: 6px 12px;
                background: #4a9eff;
                color: white;
                text-decoration: none;
                border-radius: 4px;
                font-size: 12px;
                font-weight: bold;
            `;
            previewLink.textContent = '👁️ Prévisualiser cette page';
            previewContainer.appendChild(previewLink);
        }

    } catch (error) {
        console.error('Erreur lors du chargement de l\'aperçu:', error);
        previewContainer.innerHTML = `
            <div style="color: #ff4a4a; font-size: 12px; text-align: center;">
                ⚠️ Impossible de charger l'aperçu
            </div>
        `;
    }
}

/**
 * Créer la modale de copie si elle n'existe pas
 */
export function createCopyModal() {
    if (document.getElementById('copy-modal')) {
        return; // Déjà créée
    }

    const modal = document.createElement('div');
    modal.id = 'copy-modal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="min-width: 500px;">
            <h3 style="color: #4a9eff; margin-bottom: 15px;">📋 Copier le Layout d'une Page</h3>
            
            <p style="color: #ff9800; background: rgba(255, 152, 0, 0.1); padding: 10px; border-radius: 5px; font-size: 13px; margin-bottom: 15px;">
                ⚠️ <strong>Attention:</strong> Cette action remplacera TOUT le contenu actuel de cette page.
            </p>
            
            <label style="display: block; margin-bottom: 5px; color: #999; font-size: 13px;">
                Sélectionnez la page source:
            </label>
            <select id="source-page-select" style="
                width: 100%;
                padding: 10px;
                margin-bottom: 15px;
                background: #333;
                border: 1px solid #444;
                color: #e0e0e0;
                border-radius: 5px;
                font-size: 14px;
                cursor: pointer;
            ">
            </select>
            
            <div style="display: flex; gap: 10px;">
                <button id="confirm-copy-btn" style="
                    flex: 1;
                    padding: 10px 20px;
                    background: #4a9eff;
                    border: none;
                    color: white;
                    border-radius: 5px;
                    cursor: pointer;
                    font-weight: bold;
                ">Copier le layout</button>
                <button class="cancel-btn" style="
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
        createCopyModal();
    });
}