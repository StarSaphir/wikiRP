// ui/toolbar.js - Gestion de la barre d'outils gauche

export class Toolbar {
    constructor(state, callbacks) {
        this.state = state;
        this.callbacks = callbacks;
        this.currentTab = 'add';
        
        this.init();
    }

    init() {
        this.setupTabs();
        this.setupToolButtons();
        this.setupActions();
        this.setupDragAndDrop();
    }

    /**
     * Gestion des onglets (Ajouter / Liste)
     */
    setupTabs() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchTab(btn.dataset.tab);
            });
        });
    }

    switchTab(tabName) {
        // Mettre à jour l'état
        this.currentTab = tabName;

        // Mettre à jour les classes actives
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `tab-${tabName}`);
        });
    }

    /**
     * Configuration des boutons d'ajout de composants
     */
    setupToolButtons() {
        const toolButtons = document.querySelectorAll('.tool-btn');
        
        toolButtons.forEach(btn => {
            const type = btn.dataset.type;
            
            // Click simple = ajouter en haut à gauche
            btn.addEventListener('click', () => {
                if (this.callbacks.onAddComponent) {
                    this.callbacks.onAddComponent(type, 50, 50);
                }
            });

            // Rendre draggable
            btn.setAttribute('draggable', 'true');
        });
    }

    /**
     * Configuration du drag & drop
     */
    setupDragAndDrop() {
        const toolButtons = document.querySelectorAll('.tool-btn');
        
        toolButtons.forEach(btn => {
            btn.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('componentType', btn.dataset.type);
                e.dataTransfer.effectAllowed = 'copy';
                btn.classList.add('dragging');
            });

            btn.addEventListener('dragend', () => {
                btn.classList.remove('dragging');
            });
        });
    }

    /**
     * Configuration des actions (Sauvegarder, Copier, etc.)
     */
    setupActions() {
        // Bouton Sauvegarder
        const saveBtn = document.getElementById('save-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                if (this.callbacks.onSave) {
                    this.callbacks.onSave();
                }
            });
        }

        // Bouton Copier Page
        const copyPageBtn = document.getElementById('copy-page-btn');
        if (copyPageBtn) {
            copyPageBtn.addEventListener('click', () => {
                if (this.callbacks.onCopyPage) {
                    this.callbacks.onCopyPage();
                }
            });
        }

        // Toggle Grille
        const gridToggleBtn = document.getElementById('grid-toggle');
        if (gridToggleBtn) {
            gridToggleBtn.addEventListener('click', () => {
                if (this.callbacks.onToggleGrid) {
                    this.callbacks.onToggleGrid();
                }
            });
        }

        // Taille de grille
        const gridSizeInput = document.getElementById('grid-size');
        if (gridSizeInput) {
            gridSizeInput.addEventListener('change', (e) => {
                if (this.callbacks.onGridSizeChange) {
                    this.callbacks.onGridSizeChange(parseInt(e.target.value));
                }
            });
        }

        // Modes de souris (Normal / Déplacement)
        const normalBtn = document.getElementById('mode-normal');
        const moveBtn = document.getElementById('mode-move');

        if (normalBtn && moveBtn) {
            normalBtn.addEventListener('click', () => {
                this.setMode('normal');
                if (this.callbacks.onModeChange) {
                    this.callbacks.onModeChange('normal');
                }
            });

            moveBtn.addEventListener('click', () => {
                this.setMode('move');
                if (this.callbacks.onModeChange) {
                    this.callbacks.onModeChange('move');
                }
            });
        }
    }

    /**
     * Changer le mode de souris
     */
    setMode(mode) {
        const normalBtn = document.getElementById('mode-normal');
        const moveBtn = document.getElementById('mode-move');

        if (normalBtn && moveBtn) {
            normalBtn.classList.toggle('active', mode === 'normal');
            moveBtn.classList.toggle('active', mode === 'move');
        }
    }

    /**
     * Mettre à jour le texte du bouton grille
     */
    updateGridButton() {
        const gridToggleBtn = document.getElementById('grid-toggle');
        if (gridToggleBtn) {
            const isEnabled = this.state.isSnapEnabled();
            gridToggleBtn.textContent = `🔲 Grille (${isEnabled ? 'ON' : 'OFF'})`;
        }
    }

    /**
     * Afficher la modale de copie de page
     */
    async showCopyModal() {
        const modal = document.getElementById('copy-modal');
        const select = document.getElementById('source-page-select');
        
        if (!modal || !select) {
            console.error('Modale de copie non trouvée');
            return;
        }

        try {
            // Charger la liste des pages
            const response = await fetch('/api/pages');
            const pages = await response.json();
            
            // Filtrer la page actuelle
            const currentSlug = window.SLUG || '';
            const otherPages = pages.filter(p => p.slug !== currentSlug);

            if (otherPages.length === 0) {
                alert('Aucune autre page disponible pour copier le layout');
                return;
            }

            // Remplir le select
            select.innerHTML = otherPages
                .map(p => `<option value="${p.slug}">${p.title}</option>`)
                .join('');

            // Afficher la modale
            modal.style.display = 'flex';

            // Gestionnaire de confirmation
            const confirmBtn = document.getElementById('confirm-copy-btn');
            const cancelBtn = modal.querySelector('.cancel-btn');

            const confirmHandler = async () => {
                const sourceSlug = select.value;
                
                try {
                    const response = await fetch(`/api/pages/${currentSlug}/copy`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ source_slug: sourceSlug })
                    });

                    if (response.ok) {
                        alert('✅ Layout copié avec succès !');
                        location.reload();
                    } else {
                        alert('❌ Erreur lors de la copie');
                    }
                } catch (error) {
                    console.error('Erreur:', error);
                    alert('❌ Erreur réseau');
                }

                cleanup();
            };

            const cancelHandler = () => {
                cleanup();
            };

            const cleanup = () => {
                modal.style.display = 'none';
                confirmBtn.removeEventListener('click', confirmHandler);
                cancelBtn.removeEventListener('click', cancelHandler);
            };

            confirmBtn.addEventListener('click', confirmHandler);
            cancelBtn.addEventListener('click', cancelHandler);

        } catch (error) {
            console.error('Erreur lors du chargement des pages:', error);
            alert('❌ Impossible de charger la liste des pages');
        }
    }

    /**
     * Ajouter un badge de notification sur un bouton
     */
    addBadge(buttonId, count) {
        const button = document.getElementById(buttonId);
        if (!button) return;

        let badge = button.querySelector('.badge');
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'badge';
            badge.style.cssText = `
                position: absolute;
                top: -5px;
                right: -5px;
                background: #ff4a4a;
                color: white;
                border-radius: 10px;
                padding: 2px 6px;
                font-size: 10px;
                font-weight: bold;
            `;
            button.style.position = 'relative';
            button.appendChild(badge);
        }

        badge.textContent = count;
        badge.style.display = count > 0 ? 'block' : 'none';
    }

    /**
     * Activer/désactiver un bouton
     */
    setButtonEnabled(buttonId, enabled) {
        const button = document.getElementById(buttonId);
        if (!button) return;

        button.disabled = !enabled;
        button.style.opacity = enabled ? '1' : '0.5';
        button.style.cursor = enabled ? 'pointer' : 'not-allowed';
    }

    /**
     * Afficher un loader sur un bouton
     */
    setButtonLoading(buttonId, loading) {
        const button = document.getElementById(buttonId);
        if (!button) return;

        if (loading) {
            button.dataset.originalText = button.textContent;
            button.textContent = '⏳ Chargement...';
            button.disabled = true;
        } else {
            button.textContent = button.dataset.originalText || button.textContent;
            button.disabled = false;
        }
    }

    /**
     * Mettre à jour le compteur de composants dans l'onglet Liste
     */
    updateComponentCount(count) {
        const listTab = document.querySelector('.tab-btn[data-tab="list"]');
        if (!listTab) return;

        const badge = listTab.querySelector('.count-badge') || this.createCountBadge();
        badge.textContent = count;
        
        if (!listTab.querySelector('.count-badge')) {
            listTab.appendChild(badge);
        }
    }

    createCountBadge() {
        const badge = document.createElement('span');
        badge.className = 'count-badge';
        badge.style.cssText = `
            margin-left: 5px;
            background: #4a9eff;
            color: white;
            border-radius: 10px;
            padding: 2px 8px;
            font-size: 11px;
            font-weight: bold;
        `;
        return badge;
    }

    /**
     * Réinitialiser la toolbar
     */
    reset() {
        this.switchTab('add');
        this.setMode('normal');
        this.updateGridButton();
    }

    /**
     * Afficher un message temporaire dans la toolbar
     */
    showMessage(message, type = 'info', duration = 3000) {
        const messageEl = document.createElement('div');
        messageEl.className = 'toolbar-message';
        messageEl.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 270px;
            background: ${type === 'error' ? '#ff4a4a' : type === 'success' ? '#5cb85c' : '#4a9eff'};
            color: white;
            padding: 12px 20px;
            border-radius: 5px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
        `;
        messageEl.textContent = message;

        document.body.appendChild(messageEl);

        setTimeout(() => {
            messageEl.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                messageEl.remove();
            }, 300);
        }, duration);
    }

    /**
     * Mettre à jour l'état de sauvegarde
     */
    setSaveState(state) {
        const saveBtn = document.getElementById('save-btn');
        if (!saveBtn) return;

        const icons = {
            saved: '✅',
            saving: '⏳',
            unsaved: '💾',
            error: '❌'
        };

        const originalText = saveBtn.textContent.replace(/[✅⏳💾❌]\s*/, '');
        saveBtn.textContent = `${icons[state] || icons.unsaved} ${originalText}`;
        
        if (state === 'saving') {
            saveBtn.disabled = true;
        } else {
            saveBtn.disabled = false;
        }
    }
}