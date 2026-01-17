// modals/external-link-modal.js - Modale pour liens externes

/**
 * Affiche une modale pour insérer un lien externe
 * @param {Quill} quill - Instance Quill
 */
export function showExternalLinkModal(quill) {
    // Vérifier s'il y a une sélection
    const range = quill.getSelection();
    if (!range) {
        alert('Veuillez sélectionner du texte avant d\'insérer un lien');
        return;
    }

    const selectedText = quill.getText(range.index, range.length);
    
    // Créer la modale
    const modal = createLinkModal(selectedText, (url, text) => {
        if (!url) {
            alert('Veuillez entrer une URL');
            return;
        }

        // Ajouter https:// si pas de protocole
        if (!url.match(/^https?:\/\//i)) {
            url = 'https://' + url;
        }

        // Insérer le lien
        if (selectedText) {
            // Remplacer la sélection par un lien
            quill.deleteText(range.index, range.length);
            quill.insertText(range.index, text || selectedText, 'link', url);
        } else {
            // Insérer nouveau texte + lien
            quill.insertText(range.index, text || url, 'link', url);
        }

        // Déplacer le curseur après le lien
        quill.setSelection(range.index + (text || selectedText || url).length);
    });

    document.body.appendChild(modal);
}

/**
 * Crée l'élément DOM de la modale
 */
function createLinkModal(selectedText, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'link-modal-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.2s ease-out;
    `;

    const modal = document.createElement('div');
    modal.className = 'link-modal';
    modal.style.cssText = `
        background: #1e1e1e;
        border: 2px solid #4a9eff;
        border-radius: 10px;
        padding: 30px;
        width: 90%;
        max-width: 500px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        animation: slideIn 0.3s ease-out;
    `;

    modal.innerHTML = `
        <h3 style="color: #4a9eff; margin-bottom: 25px; font-size: 20px; display: flex; align-items: center; gap: 10px;">
            🔗 Insérer un lien externe
        </h3>
        
        <div style="margin-bottom: 20px;">
            <label style="display: block; color: #999; font-size: 12px; margin-bottom: 8px; text-transform: uppercase; font-weight: bold;">
                Texte du lien
            </label>
            <input 
                type="text" 
                id="link-text-input" 
                value="${selectedText || ''}"
                placeholder="Ex: Visitez notre site"
                style="width: 100%; padding: 12px; background: #2a2a2a; border: 2px solid #333; color: #e0e0e0; border-radius: 5px; font-size: 14px; outline: none; transition: border-color 0.3s;"
            />
        </div>
        
        <div style="margin-bottom: 25px;">
            <label style="display: block; color: #999; font-size: 12px; margin-bottom: 8px; text-transform: uppercase; font-weight: bold;">
                URL de destination
            </label>
            <input 
                type="text" 
                id="link-url-input" 
                placeholder="Ex: https://example.com ou example.com"
                style="width: 100%; padding: 12px; background: #2a2a2a; border: 2px solid #333; color: #e0e0e0; border-radius: 5px; font-size: 14px; outline: none; transition: border-color 0.3s;"
            />
            <div style="color: #666; font-size: 11px; margin-top: 5px;">
                💡 Le https:// sera ajouté automatiquement si nécessaire
            </div>
        </div>
        
        <div style="background: #252525; padding: 15px; border-radius: 5px; margin-bottom: 25px;">
            <h4 style="color: #4a9eff; font-size: 13px; margin-bottom: 10px;">📋 Exemples d'URLs</h4>
            <ul style="color: #999; font-size: 12px; line-height: 1.8; padding-left: 20px;">
                <li>Site web : <code style="background: #1a1a1a; padding: 2px 6px; border-radius: 3px;">example.com</code></li>
                <li>Article : <code style="background: #1a1a1a; padding: 2px 6px; border-radius: 3px;">blog.com/article</code></li>
                <li>Email : <code style="background: #1a1a1a; padding: 2px 6px; border-radius: 3px;">mailto:contact@example.com</code></li>
            </ul>
        </div>
        
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
            <button 
                id="cancel-link-btn" 
                style="padding: 12px 24px; background: #444; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; transition: background 0.3s;"
            >
                ✕ Annuler
            </button>
            <button 
                id="confirm-link-btn" 
                style="padding: 12px 24px; background: #4a9eff; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 14px; box-shadow: 0 2px 8px rgba(74, 158, 255, 0.3); transition: all 0.3s;"
            >
                ✓ Insérer le lien
            </button>
        </div>
    `;

    overlay.appendChild(modal);

    // Focus sur URL
    setTimeout(() => {
        const urlInput = modal.querySelector('#link-url-input');
        urlInput.focus();
    }, 100);

    // Styles au focus
    const inputs = modal.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('focus', () => {
            input.style.borderColor = '#4a9eff';
        });
        input.addEventListener('blur', () => {
            input.style.borderColor = '#333';
        });
    });

    // Hover sur boutons
    const confirmBtn = modal.querySelector('#confirm-link-btn');
    const cancelBtn = modal.querySelector('#cancel-link-btn');

    confirmBtn.addEventListener('mouseenter', () => {
        confirmBtn.style.background = '#5ab0ff';
        confirmBtn.style.transform = 'translateY(-2px)';
        confirmBtn.style.boxShadow = '0 4px 12px rgba(74, 158, 255, 0.4)';
    });
    confirmBtn.addEventListener('mouseleave', () => {
        confirmBtn.style.background = '#4a9eff';
        confirmBtn.style.transform = 'translateY(0)';
        confirmBtn.style.boxShadow = '0 2px 8px rgba(74, 158, 255, 0.3)';
    });

    cancelBtn.addEventListener('mouseenter', () => {
        cancelBtn.style.background = '#555';
    });
    cancelBtn.addEventListener('mouseleave', () => {
        cancelBtn.style.background = '#444';
    });

    // Gestionnaires
    const cleanup = () => {
        overlay.style.animation = 'fadeOut 0.2s ease-out';
        setTimeout(() => overlay.remove(), 200);
    };

    confirmBtn.addEventListener('click', () => {
        const url = modal.querySelector('#link-url-input').value.trim();
        const text = modal.querySelector('#link-text-input').value.trim();
        
        onConfirm(url, text);
        cleanup();
    });

    cancelBtn.addEventListener('click', cleanup);

    // Fermeture au clic sur overlay
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            cleanup();
        }
    });

    // Entrée pour confirmer
    modal.querySelector('#link-url-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            confirmBtn.click();
        }
        if (e.key === 'Escape') {
            cancelBtn.click();
        }
    });

    modal.querySelector('#link-text-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            modal.querySelector('#link-url-input').focus();
        }
        if (e.key === 'Escape') {
            cancelBtn.click();
        }
    });

    // Animations CSS
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
        @keyframes slideIn {
            from { transform: translateY(-30px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);

    return overlay;
}