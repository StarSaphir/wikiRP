// utils/keyboard.js - Gestion des raccourcis clavier avec désactivation en mode édition

export function setupKeyboardShortcuts(state, callbacks) {
    const shortcuts = new KeyboardShortcuts(state, callbacks);
    shortcuts.init();
    return shortcuts;
}

export class KeyboardShortcuts {
    constructor(state, callbacks) {
        this.state = state;
        this.callbacks = callbacks;
        this.isEnabled = true;
    }

    init() {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        console.log('⌨️ Raccourcis clavier activés');
    }

    handleKeyDown(e) {
        if (!this.isEnabled) return;

        // ✅ FIX CRITIQUE: Désactiver TOUS les raccourcis si l'éditeur est verrouillé
        if (this.state.isEditorLocked && this.state.isEditorLocked()) {
            // En mode édition (texte ou tableau), on laisse SEULEMENT passer Escape
            if (e.key === 'Escape') {
                // Laisser le composant gérer l'escape
                return;
            }
            // ✅ Bloquer TOUS les autres raccourcis
            return;
        }

        // Ne pas intercepter dans les inputs/textareas
        const isInputField = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);
        
        // Détecter si on est dans un contenteditable (cellules de tableau)
        const isContentEditable = e.target.isContentEditable;
        
        // ✅ Bloquer les raccourcis dans les champs éditables
        if (isContentEditable || isInputField) {
            // Autoriser SEULEMENT Ctrl+S pour sauvegarder
            const ctrl = e.ctrlKey || e.metaKey;
            if (ctrl && e.key === 's') {
                e.preventDefault();
                if (this.callbacks.onSave) {
                    this.callbacks.onSave();
                }
            }
            // Bloquer tout le reste
            return;
        }

        const ctrl = e.ctrlKey || e.metaKey;
        const shift = e.shiftKey;

        // ======= RACCOURCIS GLOBAUX =======

        // Ctrl/Cmd + S : Sauvegarder
        if (ctrl && e.key === 's') {
            e.preventDefault();
            if (this.callbacks.onSave) {
                this.callbacks.onSave();
            }
            return;
        }

        // Ctrl/Cmd + Z : Undo
        if (ctrl && e.key === 'z' && !shift) {
            e.preventDefault();
            if (this.callbacks.onUndo) {
                this.callbacks.onUndo();
            }
            return;
        }

        // Ctrl/Cmd + Shift + Z ou Ctrl/Cmd + Y : Redo
        if ((ctrl && shift && e.key === 'z') || (ctrl && e.key === 'y')) {
            e.preventDefault();
            if (this.callbacks.onRedo) {
                this.callbacks.onRedo();
            }
            return;
        }

        // Ctrl/Cmd + D : Dupliquer
        if (ctrl && e.key === 'd') {
            e.preventDefault();
            const selectedId = this.state.getSelectedComponent();
            if (selectedId && this.callbacks.onDuplicate) {
                this.callbacks.onDuplicate(selectedId);
            }
            return;
        }

        // Échap : Désélectionner
        if (e.key === 'Escape') {
            if (this.state.getSelectedComponent()) {
                e.preventDefault();
                this.state.setSelectedComponent(null);
            }
            return;
        }

        // ======= RACCOURCIS NÉCESSITANT UN COMPOSANT SÉLECTIONNÉ =======

        const selectedId = this.state.getSelectedComponent();
        if (!selectedId) return;

        // Supprimer : Delete ou Backspace
        if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault();
            if (this.callbacks.onDelete) {
                this.callbacks.onDelete(selectedId);
            }
            return;
        }

        // Flèches : Déplacer le composant
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
            
            const step = shift ? this.state.getGridSize() : 1;
            const direction = {
                'ArrowUp': 'up',
                'ArrowDown': 'down',
                'ArrowLeft': 'left',
                'ArrowRight': 'right'
            }[e.key];

            if (this.callbacks.onMove) {
                this.callbacks.onMove(direction, step);
            }
            return;
        }

        // Ctrl/Cmd + Flèches : Redimensionner
        if (ctrl && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
            
            const step = shift ? this.state.getGridSize() : 1;
            const direction = {
                'ArrowUp': 'shrink-height',
                'ArrowDown': 'grow-height',
                'ArrowLeft': 'shrink-width',
                'ArrowRight': 'grow-width'
            }[e.key];

            if (this.callbacks.onResize) {
                this.callbacks.onResize(direction, step);
            }
            return;
        }

        // [ et ] : Modifier Z-Index
        if (e.key === '[' || e.key === ']') {
            e.preventDefault();
            const delta = e.key === '[' ? -1 : 1;
            
            if (this.callbacks.onZIndexChange) {
                this.callbacks.onZIndexChange(selectedId, delta);
            }
            return;
        }

        // Ctrl/Cmd + G : Toggle Grille
        if (ctrl && e.key === 'g') {
            e.preventDefault();
            if (this.callbacks.onToggleGrid) {
                this.callbacks.onToggleGrid();
            }
            return;
        }

        // Ctrl/Cmd + E : Éditer le composant
        if (ctrl && e.key === 'e') {
            e.preventDefault();
            if (this.callbacks.onEdit) {
                this.callbacks.onEdit(selectedId);
            }
            return;
        }

        // Ctrl/Cmd + 1-9 : Sélectionner le Nième composant
        if (ctrl && /^[1-9]$/.test(e.key)) {
            e.preventDefault();
            const index = parseInt(e.key) - 1;
            const components = this.state.getComponents();
            
            if (components[index]) {
                this.state.setSelectedComponent(components[index].id);
            }
            return;
        }

        // Tab : Sélectionner le composant suivant
        if (e.key === 'Tab') {
            e.preventDefault();
            this.selectNextComponent(shift ? -1 : 1);
            return;
        }

        // H : Masquer/Afficher le composant
        if (e.key === 'h') {
            e.preventDefault();
            if (this.callbacks.onToggleVisibility) {
                this.callbacks.onToggleVisibility(selectedId);
            }
            return;
        }

        // L : Verrouiller/Déverrouiller
        if (e.key === 'l') {
            e.preventDefault();
            if (this.callbacks.onToggleLock) {
                this.callbacks.onToggleLock(selectedId);
            }
            return;
        }

        // ? : Afficher l'aide des raccourcis
        if (e.key === '?') {
            e.preventDefault();
            this.showHelp();
            return;
        }
    }

    selectNextComponent(direction = 1) {
        const components = this.state.getComponents();
        const currentId = this.state.getSelectedComponent();
        
        if (components.length === 0) return;

        let currentIndex = components.findIndex(c => c.id === currentId);
        
        if (currentIndex === -1) {
            currentIndex = 0;
        } else {
            currentIndex += direction;
            
            if (currentIndex >= components.length) currentIndex = 0;
            if (currentIndex < 0) currentIndex = components.length - 1;
        }

        this.state.setSelectedComponent(components[currentIndex].id);
    }

    showHelp() {
        const shortcuts = [
            { keys: 'Ctrl/Cmd + S', desc: 'Sauvegarder' },
            { keys: 'Ctrl/Cmd + Z', desc: 'Annuler' },
            { keys: 'Ctrl/Cmd + Shift + Z', desc: 'Rétablir' },
            { keys: 'Ctrl/Cmd + D', desc: 'Dupliquer le composant' },
            { keys: 'Ctrl/Cmd + E', desc: 'Éditer le composant' },
            { keys: 'Ctrl/Cmd + G', desc: 'Toggle grille' },
            { keys: 'Delete / Backspace', desc: 'Supprimer le composant' },
            { keys: 'Échap', desc: 'Désélectionner' },
            { keys: 'Flèches', desc: 'Déplacer (Shift = grille)' },
            { keys: 'Ctrl + Flèches', desc: 'Redimensionner' },
            { keys: '[ / ]', desc: 'Z-Index -/+' },
            { keys: 'Tab / Shift+Tab', desc: 'Composant suivant/précédent' },
            { keys: 'Ctrl + 1-9', desc: 'Sélectionner le Nième composant' },
            { keys: 'H', desc: 'Masquer/Afficher' },
            { keys: 'L', desc: 'Verrouiller/Déverrouiller' },
            { keys: '?', desc: 'Afficher cette aide' }
        ];

        let html = `
            <div style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: #2a2a2a;
                border: 2px solid #4a9eff;
                border-radius: 10px;
                padding: 30px;
                max-width: 600px;
                max-height: 80vh;
                overflow-y: auto;
                z-index: 100000;
                box-shadow: 0 10px 40px rgba(0,0,0,0.8);
            ">
                <h2 style="color: #4a9eff; margin-bottom: 20px; text-align: center;">
                    ⌨️ Raccourcis Clavier
                </h2>
                <div style="display: grid; gap: 10px;">
        `;

        shortcuts.forEach(s => {
            html += `
                <div style="
                    display: flex;
                    justify-content: space-between;
                    padding: 10px;
                    background: #1a1a1a;
                    border-radius: 5px;
                ">
                    <kbd style="
                        background: #333;
                        padding: 4px 8px;
                        border-radius: 3px;
                        font-family: monospace;
                        color: #4a9eff;
                        font-size: 13px;
                        font-weight: bold;
                    ">${s.keys}</kbd>
                    <span style="color: #e0e0e0; font-size: 14px;">${s.desc}</span>
                </div>
            `;
        });

        html += `
                </div>
                <button onclick="this.parentElement.remove()" style="
                    width: 100%;
                    margin-top: 20px;
                    padding: 10px;
                    background: #4a9eff;
                    border: none;
                    color: white;
                    border-radius: 5px;
                    cursor: pointer;
                    font-weight: bold;
                ">Fermer</button>
            </div>
        `;

        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            z-index: 99999;
        `;
        overlay.innerHTML = html;
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });

        document.body.appendChild(overlay);

        const closeOnEscape = (e) => {
            if (e.key === 'Escape') {
                overlay.remove();
                document.removeEventListener('keydown', closeOnEscape);
            }
        };
        document.addEventListener('keydown', closeOnEscape);
    }

    enable() {
        this.isEnabled = true;
    }

    disable() {
        this.isEnabled = false;
    }
}