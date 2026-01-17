// ui/properties-panel.js - Panneau de propriétés à droite

export class PropertiesPanel {
    constructor(state, options) {
        this.state = state;
        this.panelElement = options.panelElement;
        this.contentElement = options.contentElement;
        this.onApplyProperties = options.onApplyProperties;
        this.onClose = options.onClose;

        this.currentComponentId = null;
        this.liveUpdate = false; // Mise à jour en temps réel

        this.init();
    }

    init() {
        this.setupCloseButton();
        this.setupStateListeners();
        
        // 🔧 FIX: Ne PAS bloquer la propagation globalement
        // On laisse les événements se propager normalement
        // Les boutons gèrent leur propre stopPropagation si nécessaire
    }

    /**
     * Configuration du bouton de fermeture
     */
    setupCloseButton() {
        const closeBtn = document.getElementById('close-props');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hide();
                if (this.onClose) {
                    this.onClose();
                }
            });
        }
    }

    /**
     * Écouter les changements d'état
     */
    setupStateListeners() {
        this.state.on('selectionChange', (componentId) => {
            // 🔧 NOUVEAU: Ne rien faire si l'éditeur est verrouillé
            if (this.state.isEditorLocked()) {
                return;
            }
            
            if (componentId) {
                this.show(componentId);
            } else {
                this.hide();
            }
        });

        this.state.on('componentUpdated', ({ id }) => {
            if (id === this.currentComponentId && !this.state.isEditorLocked()) {
                this.show(id);
            }
        });
        
        // 🔧 NOUVEAU: Quand on déverrouille, ré-afficher les propriétés normales
        this.state.on('editorUnlocked', () => {
            // Le composant reste sélectionné, on affiche juste ses propriétés normales
            const selectedId = this.state.getSelectedComponent();
            if (selectedId) {
                this.show(selectedId);
            } else {
                this.hide();
            }
        });
    }

    /**
     * Afficher le panneau pour un composant
     */
    show(componentId) {
        this.currentComponentId = componentId;
        const component = this.state.getComponent(componentId);

        if (!component) {
            this.showNoSelection();
            return;
        }

        this.panelElement.classList.add('active');
        this.renderProperties(component);
    }

    /**
     * Cacher le panneau
     */
    hide() {
        this.currentComponentId = null;
        this.panelElement.classList.remove('active');
    }

    /**
     * Afficher le message "aucune sélection"
     */
    showNoSelection() {
        this.contentElement.innerHTML = `
            <div class="no-selection">
                <p style="color: #666; text-align: center; padding: 20px;">
                    Sélectionnez un composant pour voir ses propriétés
                </p>
            </div>
        `;
    }

    /**
     * Rendre les propriétés d'un composant
     */
    renderProperties(component) {
        // Récupérer les champs de propriétés depuis le composant
        const fields = this.getComponentPropertyFields(component);

        let html = `
            <div class="properties-form">
                <div class="component-info" style="margin-bottom: 20px; padding: 15px; background: #2a2a2a; border-radius: 5px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <strong style="color: #4a9eff; font-size: 16px;">${this.getComponentIcon(component.type)} ${component.type}</strong>
                        <span style="color: #666; font-size: 12px;">${component.id}</span>
                    </div>
                </div>
        `;

        // Générer les champs
        fields.forEach(field => {
            if (field.type === 'separator') {
                html += this.renderSeparator(field);
            } else {
                html += this.renderField(field, component);
            }
        });

        html += `
                <div class="properties-actions" style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #333;">
                    <button id="apply-props" style="width: 100%; padding: 12px; background: #4a9eff; border: none; color: white; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 14px; margin-bottom: 10px;">
                        ✓ Appliquer les modifications
                    </button>
                    <label style="display: flex; align-items: center; gap: 8px; color: #999; font-size: 13px; cursor: pointer;">
                        <input type="checkbox" id="live-update-toggle" ${this.liveUpdate ? 'checked' : ''}>
                        <span>Mise à jour en temps réel</span>
                    </label>
                </div>
            </div>
        `;

        this.contentElement.innerHTML = html;

        // Attacher les événements
        this.attachFieldEvents(component);
        this.attachApplyButton();
        this.attachLiveUpdateToggle();
    }

    /**
     * Récupérer les champs de propriétés via le canvas
     */
    getComponentPropertyFields(component) {
        // Les champs sont définis dans chaque classe de composant
        // On utilise une interface standard
        const baseFields = [
            {
                label: 'Position X',
                type: 'number',
                key: 'x',
                value: component.x
            },
            {
                label: 'Position Y',
                type: 'number',
                key: 'y',
                value: component.y
            },
            {
                label: 'Largeur',
                type: 'number',
                key: 'w',
                value: component.w
            },
            {
                label: 'Hauteur',
                type: 'number',
                key: 'h',
                value: component.h
            },
            {
                label: 'Z-Index',
                type: 'number',
                key: 'z',
                value: component.z || 0
            },
            {
                type: 'separator',
                label: 'Personnalisation'
            },
            {
                label: 'CSS Personnalisé',
                type: 'textarea',
                key: 'custom_css',
                value: component.custom_css || '',
                rows: 3
            },
            {
                label: 'JS Personnalisé',
                type: 'textarea',
                key: 'custom_js',
                value: component.custom_js || '',
                rows: 3
            }
        ];

        return baseFields;
    }

    /**
     * Rendre un séparateur
     */
    renderSeparator(field) {
        return `
            <div class="prop-separator" style="margin: 20px 0 15px; padding-top: 15px; border-top: 1px solid #333;">
                <strong style="color: #4a9eff; font-size: 13px; text-transform: uppercase;">${field.label}</strong>
            </div>
        `;
    }

    /**
     * Rendre un champ selon son type
     */
    renderField(field, component) {
        const fieldId = `prop-${field.key}`;

        let html = `
            <div class="prop-group" style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-size: 13px; color: #999;">
                    ${field.label}
        `;

        switch (field.type) {
            case 'text':
            case 'number':
                html += `</label>
                    <input 
                        type="${field.type}" 
                        id="${fieldId}" 
                        value="${field.value || ''}"
                        ${field.readonly ? 'readonly' : ''}
                        ${field.placeholder ? `placeholder="${field.placeholder}"` : ''}
                        ${field.min !== undefined ? `min="${field.min}"` : ''}
                        ${field.max !== undefined ? `max="${field.max}"` : ''}
                        ${field.step !== undefined ? `step="${field.step}"` : ''}
                        style="width: 100%; padding: 8px; background: #333; border: 1px solid #444; color: #e0e0e0; border-radius: 3px; font-family: inherit;"
                    />
                `;
                break;

            case 'color':
                html += `</label>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <input 
                            type="color" 
                            id="${fieldId}" 
                            value="${field.value || '#000000'}"
                            style="width: 60px; height: 40px; padding: 2px; background: #333; border: 1px solid #444; border-radius: 3px; cursor: pointer;"
                        />
                        <input 
                            type="text" 
                            id="${fieldId}-text" 
                            value="${field.value || '#000000'}"
                            style="flex: 1; padding: 8px; background: #333; border: 1px solid #444; color: #e0e0e0; border-radius: 3px; font-family: monospace; font-size: 12px;"
                        />
                    </div>
                `;
                break;

            case 'checkbox':
                html += `
                        <input 
                            type="checkbox" 
                            id="${fieldId}" 
                            ${field.value ? 'checked' : ''}
                            style="margin-left: 10px;"
                        />
                    </label>
                `;
                break;

            case 'select':
                html += `</label>
                    <select 
                        id="${fieldId}" 
                        style="width: 100%; padding: 8px; background: #333; border: 1px solid #444; color: #e0e0e0; border-radius: 3px; cursor: pointer;"
                    >
                        ${field.options.map(opt => 
                            `<option value="${opt.value}" ${opt.value === field.value ? 'selected' : ''}>${opt.label}</option>`
                        ).join('')}
                    </select>
                `;
                break;

            case 'range':
                html += `</label>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <input 
                            type="range" 
                            id="${fieldId}" 
                            value="${field.value}"
                            min="${field.min || 0}"
                            max="${field.max || 100}"
                            step="${field.step || 1}"
                            style="flex: 1;"
                        />
                        <span id="${fieldId}-value" style="min-width: 50px; text-align: right; color: #4a9eff; font-weight: bold; font-size: 13px;">
                            ${field.value}
                        </span>
                    </div>
                `;
                break;

            case 'textarea':
                html += `</label>
                    <textarea 
                        id="${fieldId}" 
                        rows="${field.rows || 3}"
                        ${field.readonly ? 'readonly' : ''}
                        style="width: 100%; padding: 8px; background: #333; border: 1px solid #444; color: #e0e0e0; border-radius: 3px; font-family: 'Courier New', monospace; font-size: 12px; resize: vertical;"
                    >${field.value || ''}</textarea>
                `;
                break;
        }

        html += `</div>`;
        return html;
    }

    /**
     * Attacher les événements aux champs
     */
    attachFieldEvents(component) {
        // Synchronisation color + text
        const colorInputs = this.contentElement.querySelectorAll('input[type="color"]');
        colorInputs.forEach(colorInput => {
            const textInput = this.contentElement.querySelector(`#${colorInput.id}-text`);
            if (textInput) {
                colorInput.addEventListener('input', (e) => {
                    textInput.value = e.target.value;
                    if (this.liveUpdate) {
                        this.applyChanges(component);
                    }
                });

                textInput.addEventListener('input', (e) => {
                    if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                        colorInput.value = e.target.value;
                        if (this.liveUpdate) {
                            this.applyChanges(component);
                        }
                    }
                });
            }
        });

        // Affichage valeur pour les ranges
        const rangeInputs = this.contentElement.querySelectorAll('input[type="range"]');
        rangeInputs.forEach(range => {
            const valueSpan = this.contentElement.querySelector(`#${range.id}-value`);
            if (valueSpan) {
                range.addEventListener('input', (e) => {
                    valueSpan.textContent = e.target.value;
                    if (this.liveUpdate) {
                        this.applyChanges(component);
                    }
                });
            }
        });

        // Mise à jour en temps réel pour les autres champs
        if (this.liveUpdate) {
            const allInputs = this.contentElement.querySelectorAll('input, select, textarea');
            allInputs.forEach(input => {
                input.addEventListener('input', () => {
                    this.applyChanges(component);
                });
            });
        }
    }

    /**
     * Attacher le bouton Appliquer
     */
    attachApplyButton() {
        const applyBtn = this.contentElement.querySelector('#apply-props');
        if (applyBtn) {
            applyBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // 🔧 FIX: Empêcher propagation
                const component = this.state.getComponent(this.currentComponentId);
                if (component) {
                    this.applyChanges(component);
                }
            });
        }
    }

    /**
     * Attacher le toggle de mise à jour en temps réel
     */
    attachLiveUpdateToggle() {
        const toggle = this.contentElement.querySelector('#live-update-toggle');
        if (toggle) {
            toggle.addEventListener('change', (e) => {
                e.stopPropagation(); // 🔧 FIX: Empêcher propagation
                this.liveUpdate = e.target.checked;
                
                // Réattacher les événements si activé
                if (this.liveUpdate) {
                    const component = this.state.getComponent(this.currentComponentId);
                    if (component) {
                        this.attachFieldEvents(component);
                    }
                }
            });
        }
    }

    /**
     * Appliquer les changements
     */
    applyChanges(component) {
        const updates = {};

        // Récupérer toutes les valeurs des champs
        const inputs = this.contentElement.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            if (input.id.startsWith('prop-') && !input.id.endsWith('-text') && !input.id.endsWith('-value')) {
                const key = input.id.replace('prop-', '');
                
                if (input.type === 'checkbox') {
                    updates[key] = input.checked;
                } else if (input.type === 'number') {
                    updates[key] = parseFloat(input.value) || 0;
                } else {
                    updates[key] = input.value;
                }
            }
        });

        // Appliquer via le callback
        if (this.onApplyProperties) {
            this.onApplyProperties(component.id, updates);
        }

        // Afficher un feedback
        if (!this.liveUpdate) {
            this.showFeedback('✓ Propriétés appliquées', 'success');
        }
    }

    /**
     * Afficher un feedback temporaire
     */
    showFeedback(message, type = 'success') {
        const applyBtn = this.contentElement.querySelector('#apply-props');
        if (!applyBtn) return;

        const originalText = applyBtn.textContent;
        applyBtn.textContent = message;
        applyBtn.style.background = type === 'success' ? '#5cb85c' : '#ff4a4a';

        setTimeout(() => {
            applyBtn.textContent = originalText;
            applyBtn.style.background = '#4a9eff';
        }, 1500);
    }

    /**
     * Icône selon le type de composant
     */
    getComponentIcon(type) {
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

        return icons[type] || '📄';
    }

    /**
     * Afficher un contenu personnalisé (pour éditeurs spéciaux)
     */
    showCustomContent(html) {
        this.panelElement.classList.add('active');
        this.contentElement.innerHTML = html;
    }
}