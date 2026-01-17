// modals/link-modal.js - Modale d'ajout de lien (externe ou interne)

let cachedPages = null;

/**
 * Afficher la modale de lien pour Quill
 */
export async function showPageLinkModal(quill) {
    const modal = document.getElementById('link-modal');
    if (!modal) {
        console.error('Modale de lien non trouvée dans le DOM');
        return;
    }

    // Vérifier qu'il y a une sélection
    const selection = quill.getSelection();
    if (!selection || selection.length === 0) {
        alert('⚠️ Veuillez d\'abord SÉLECTIONNER du texte avant d\'ajouter un lien');
        return;
    }

    const searchInput = document.getElementById('link-url');
    const resultsContainer = document.getElementById('page-search-results');
    const addExternalBtn = document.getElementById('add-link-btn');
    const cancelBtn = modal.querySelector('.cancel-btn');

    // Réinitialiser
    if (searchInput) searchInput.value = '';

    // Charger les pages si pas déjà fait
    if (!cachedPages) {
        try {
            const response = await fetch('/api/pages');
            cachedPages = await response.json();
        } catch (error) {
            console.error('Erreur lors du chargement des pages:', error);
            cachedPages = [];
        }
    }

    // Afficher la modale
    modal.style.display = 'flex';

    // Focus sur l'input
    setTimeout(() => searchInput?.focus(), 100);

    // Afficher toutes les pages par défaut
    displayPageResults('', resultsContainer, quill, modal, selection);

    // Recherche en temps réel
    const handleSearch = () => {
        const term = searchInput.value.toLowerCase();
        displayPageResults(term, resultsContainer, quill, modal, selection);
    };

    searchInput.addEventListener('input', handleSearch);

    // Ajout de lien externe
    const handleAddExternal = () => {
        const url = searchInput.value.trim();
        
        if (!url) {
            alert('⚠️ Veuillez entrer une URL');
            return;
        }

        // Vérifier que c'est une URL valide
        if (!isValidUrl(url)) {
            if (!confirm('⚠️ L\'URL ne semble pas valide.\n\nContinuer quand même ?')) {
                return;
            }
        }

        // Appliquer le lien
        quill.formatText(selection.index, selection.length, 'link', url);
        cleanup();
    };

    // Gestionnaire d'annulation
    const handleCancel = () => {
        cleanup();
    };

    // Nettoyage
    const cleanup = () => {
        modal.style.display = 'none';
        searchInput.value = '';
        resultsContainer.innerHTML = '';
        searchInput.removeEventListener('input', handleSearch);
        addExternalBtn.removeEventListener('click', handleAddExternal);
        cancelBtn.removeEventListener('click', handleCancel);
    };

    // Attacher les événements
    addExternalBtn.addEventListener('click', handleAddExternal);
    cancelBtn.addEventListener('click', handleCancel);

    // Entrée = recherche ou ajout externe
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const term = searchInput.value.toLowerCase();
            const matches = cachedPages.filter(p => 
                p.title.toLowerCase().includes(term) || 
                p.slug.toLowerCase().includes(term)
            );

            if (matches.length === 1) {
                // Si une seule correspondance, l'ajouter directement
                const linkUrl = `../${matches[0].slug}/`;
                quill.formatText(selection.index, selection.length, 'link', linkUrl);
                cleanup();
            } else if (isValidUrl(term)) {
                // Si c'est une URL, l'ajouter comme lien externe
                handleAddExternal();
            }
        }
    });

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
 * Afficher les résultats de recherche de pages
 */
function displayPageResults(term, resultsContainer, quill, modal, selection) {
    resultsContainer.innerHTML = '';
    
    let matches = cachedPages || [];
    
    if (term.length > 0) {
        matches = matches.filter(p => 
            p.title.toLowerCase().includes(term) || 
            p.slug.toLowerCase().includes(term)
        );
    }

    if (matches.length === 0) {
        resultsContainer.innerHTML = `
            <div class="page-result" style="
                padding: 20px;
                text-align: center;
                color: #666;
                background: #2a2a2a;
                border-radius: 5px;
            ">
                ${term ? 'Aucune page trouvée' : 'Aucune page disponible'}
                <br><br>
                <small>Utilisez le champ ci-dessus pour ajouter un lien externe</small>
            </div>
        `;
        return;
    }

    matches.forEach(page => {
        const result = document.createElement('div');
        result.className = 'page-result';
        result.style.cssText = `
            padding: 12px;
            background: #2a2a2a;
            margin: 8px 0;
            border-radius: 5px;
            cursor: pointer;
            transition: all 0.2s;
            border: 2px solid transparent;
        `;

        result.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong style="color: #4a9eff; font-size: 14px;">${highlightMatch(page.title, term)}</strong>
                    <br>
                    <small style="font-size: 11px; color: #666;">${page.slug}</small>
                </div>
                <div style="color: #4a9eff; font-size: 20px;">→</div>
            </div>
        `;

        result.addEventListener('mouseenter', () => {
            result.style.background = '#333';
            result.style.borderColor = '#4a9eff';
        });

        result.addEventListener('mouseleave', () => {
            result.style.background = '#2a2a2a';
            result.style.borderColor = 'transparent';
        });

        result.addEventListener('click', () => {
            const linkUrl = `../${page.slug}/`;
            quill.formatText(selection.index, selection.length, 'link', linkUrl);
            modal.style.display = 'none';
        });

        resultsContainer.appendChild(result);
    });
}

/**
 * Surligner les correspondances dans le texte
 */
function highlightMatch(text, term) {
    if (!term) return text;
    
    const regex = new RegExp(`(${term})`, 'gi');
    return text.replace(regex, '<span style="background: rgba(74, 158, 255, 0.3);">$1</span>');
}

/**
 * Vérifier si une chaîne est une URL valide
 */
function isValidUrl(string) {
    try {
        // Essayer de créer une URL
        new URL(string);
        return true;
    } catch (_) {
        // Vérifier les patterns courants
        const urlPattern = /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
        return urlPattern.test(string);
    }
}

/**
 * Créer la modale de lien si elle n'existe pas
 */
export function createLinkModal() {
    if (document.getElementById('link-modal')) {
        return; // Déjà créée
    }

    const modal = document.createElement('div');
    modal.id = 'link-modal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="min-width: 500px;">
            <h3 style="color: #4a9eff; margin-bottom: 15px;">🔗 Ajouter un Lien</h3>
            
            <p style="color: #999; font-size: 13px; margin-bottom: 15px;">
                💡 Sélectionnez du texte dans l'éditeur, puis choisissez une page ci-dessous
            </p>
            
            <input 
                type="text" 
                id="link-url" 
                placeholder="🔍 Rechercher une page par titre ou slug..."
                style="
                    width: 100%;
                    padding: 10px;
                    margin-bottom: 15px;
                    background: #333;
                    border: 1px solid #444;
                    color: #e0e0e0;
                    border-radius: 5px;
                    font-size: 14px;
                "
            >
            
            <div id="page-search-results" style="
                max-height: 300px;
                overflow-y: auto;
                margin-bottom: 15px;
            "></div>
            
            <div style="border-top: 1px solid #444; padding-top: 15px; margin-top: 10px;">
                <p style="color: #999; font-size: 12px; margin-bottom: 10px;">
                    Ou entrez une URL externe:
                </p>
                <div style="display: flex; gap: 10px;">
                    <button id="add-link-btn" style="
                        flex: 1;
                        padding: 10px 20px;
                        background: #4a9eff;
                        border: none;
                        color: white;
                        border-radius: 5px;
                        cursor: pointer;
                        font-weight: bold;
                    ">🔗 Ajouter un lien externe</button>
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
        </div>
    `;

    document.body.appendChild(modal);
}

/**
 * Rafraîchir le cache des pages
 */
export async function refreshPagesCache() {
    try {
        const response = await fetch('/api/pages');
        cachedPages = await response.json();
        return cachedPages;
    } catch (error) {
        console.error('Erreur lors du rafraîchissement du cache:', error);
        return cachedPages || [];
    }
}

/**
 * Initialiser la modale au chargement
 */
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        createLinkModal();
    });
}