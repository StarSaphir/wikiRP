// components/text-component.js - Composant de texte avec éditeur verrouillé et liens

import { BaseComponent } from './base-component.js';
import { showPageLinkModal } from '../modals/link-modal.js';
import { showExternalLinkModal } from '../modals/external-link-modal.js';

export class TextComponent extends BaseComponent {
    render(component) {
        const content = component.content || 'Double-cliquez pour éditer';
        
        return `
            <div class="text-content" id="text-${component.id}" style="
                width: 100%;
                height: 100%;
                overflow: auto;
                padding: 15px;
                color: #e0e0e0;
                line-height: 1.6;
            ">
                ${content}
            </div>
        `;
    }

    handleEdit(element, component) {
        this.initQuillEditor(element, component);
    }

    initQuillEditor(element, component) {
        const textEl = element.querySelector(`#text-${component.id}`);
        
        if (this.instances.has(component.id)) {
            return;
        }

        this.state.lockEditor(component.id);
        
        if (element.interactInstance) {
            element.interactInstance.draggable(false).resizable(false);
        }

        const originalContent = component.content || '';

        this.showEditorPanel(component, textEl, element, originalContent);
    }

    showEditorPanel(component, textEl, element, originalContent) {
        const propsPanel = document.getElementById('properties-panel');
        const propsContent = document.getElementById('properties-content');

        propsPanel.classList.add('active');
        propsPanel.dataset.editingMode = 'true';
        propsPanel.dataset.editingComponentId = component.id;
        
        propsContent.innerHTML = `
            <div class="text-editor-panel">
                <div style="background: #4a9eff; color: white; padding: 10px; border-radius: 5px; margin-bottom: 20px; text-align: center;">
                    <strong>🔒 MODE ÉDITION VERROUILLÉ</strong>
                    <p style="font-size: 12px; margin-top: 5px;">Cliquez sur "Terminer" pour sauvegarder et quitter</p>
                </div>
                
                <h3 style="color: #4a9eff; margin-bottom: 20px;">📝 Édition de texte</h3>
                
                <div class="quill-toolbar-panel" id="toolbar-${component.id}">
                    <div class="toolbar-section">
                        <label>Style</label>
                        <select class="ql-header">
                            <option value="1">Titre 1</option>
                            <option value="2">Titre 2</option>
                            <option value="3">Titre 3</option>
                            <option selected>Normal</option>
                        </select>
                    </div>
                    
                    <div class="toolbar-section">
                        <label>Format</label>
                        <div class="toolbar-buttons">
                            <button class="ql-bold" title="Gras"><strong>B</strong></button>
                            <button class="ql-italic" title="Italique"><em>I</em></button>
                            <button class="ql-underline" title="Souligné"><u>U</u></button>
                        </div>
                    </div>
                    
                    <div class="toolbar-section">
                        <label>Couleurs</label>
                        <div class="toolbar-buttons">
                            <select class="ql-color" title="Couleur texte"></select>
                            <select class="ql-background" title="Surlignage"></select>
                        </div>
                    </div>
                    
                    <div class="toolbar-section">
                        <label>Listes</label>
                        <div class="toolbar-buttons">
                            <button class="ql-list" value="ordered" title="Numérotée">1. 2. 3.</button>
                            <button class="ql-list" value="bullet" title="À puces">• • •</button>
                        </div>
                    </div>
                    
                    <div class="toolbar-section">
                        <label>Liens</label>
                        <div class="toolbar-buttons">
                            <button class="ql-link-external" title="Lien externe" style="padding: 8px 12px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; transition: all 0.3s;">
                                🔗 Externe
                            </button>
                            <button class="ql-link-page" title="Lien page interne" style="padding: 8px 12px; background: #5cb85c; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; transition: all 0.3s;">
                                📄 Interne
                            </button>
                        </div>
                    </div>
                    
                    <div class="toolbar-section">
                        <button class="ql-clean" style="width: 100%; background: #d9534f; color: white; padding: 8px; border: none; border-radius: 4px; cursor: pointer;">
                            🧹 Supprimer mise en forme
                        </button>
                    </div>
                </div>
                
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #333;">
                    <button id="finish-edit-btn" class="finish-editing-btn" style="width: 100%; padding: 15px; background: #28a745; color: white; border: none; border-radius: 5px; font-weight: bold; cursor: pointer; font-size: 16px; box-shadow: 0 2px 8px rgba(40,167,69,0.3); transition: all 0.3s;">
                        ✓ TERMINER L'ÉDITION
                    </button>
                    <p style="color: #666; font-size: 12px; margin-top: 10px; text-align: center;">
                        Sauvegarde et retour au mode normal
                    </p>
                </div>
            </div>
        `;

        // Initialiser Quill SANS le bouton link natif
        const quill = new Quill(textEl, {
            theme: 'snow',
            modules: { 
                toolbar: {
                    container: `#toolbar-${component.id}`,
                    handlers: {
                        // ✅ DÉSACTIVER le handler natif de Quill
                        link: function() {
                            // Ne rien faire, on utilise nos modales custom
                        }
                    }
                }
            }
        });

        // Restaurer le contenu
        if (originalContent) {
            quill.root.innerHTML = originalContent;
        }

        // Stocker l'instance
        this.instances.set(component.id, quill);

        // ✅ NOUVEAU: Gestionnaire lien externe
        const linkExternalBtn = propsContent.querySelector('.ql-link-external');
        if (linkExternalBtn) {
            linkExternalBtn.addEventListener('click', (e) => {
                e.preventDefault();
                showExternalLinkModal(quill);
            });

            // Hover
            linkExternalBtn.addEventListener('mouseenter', () => {
                linkExternalBtn.style.background = '#5ab0ff';
            });
            linkExternalBtn.addEventListener('mouseleave', () => {
                linkExternalBtn.style.background = '#4a9eff';
            });
        }

        // Gestionnaire lien page interne
        const linkPageBtn = propsContent.querySelector('.ql-link-page');
        if (linkPageBtn) {
            linkPageBtn.addEventListener('click', (e) => {
                e.preventDefault();
                showPageLinkModal(quill);
            });

            // Hover
            linkPageBtn.addEventListener('mouseenter', () => {
                linkPageBtn.style.background = '#6fc87c';
            });
            linkPageBtn.addEventListener('mouseleave', () => {
                linkPageBtn.style.background = '#5cb85c';
            });
        }

        // Fonction de finalisation
        const finishEditing = () => {
            console.log('✅ Finalisation édition texte...');
            
            component.content = quill.root.innerHTML;
            textEl.innerHTML = component.content;
            
            this.instances.delete(component.id);
            this.state.unlockEditor();
            
            delete propsPanel.dataset.editingMode;
            delete propsPanel.dataset.editingComponentId;
            
            if (element.interactInstance) {
                element.interactInstance.draggable(true).resizable(true);
            }
            
            this.state.emit('componentContentUpdated', {
                id: component.id,
                content: component.content
            });
            
            this.state.setSelectedComponent(component.id);
            
            document.removeEventListener('keydown', handleEscape);
        };

        // Gestion Escape
        const handleEscape = (e) => {
            if (e.key === 'Escape' && this.state.isEditorLocked()) {
                finishEditing();
            }
        };
        document.addEventListener('keydown', handleEscape);

        // Attacher bouton Terminer
        const finishBtn = document.getElementById('finish-edit-btn');
        if (finishBtn) {
            const newBtn = finishBtn.cloneNode(true);
            finishBtn.parentNode.replaceChild(newBtn, finishBtn);
            
            newBtn.addEventListener('click', (e) => {
                console.log('🖱️ Clic sur Terminer détecté !');
                e.preventDefault();
                finishEditing();
            }, { capture: true });

            // Hover
            newBtn.addEventListener('mouseenter', () => {
                newBtn.style.background = '#34ce57';
                newBtn.style.transform = 'translateY(-2px)';
                newBtn.style.boxShadow = '0 4px 12px rgba(40,167,69,0.4)';
            });
            newBtn.addEventListener('mouseleave', () => {
                newBtn.style.background = '#28a745';
                newBtn.style.transform = 'translateY(0)';
                newBtn.style.boxShadow = '0 2px 8px rgba(40,167,69,0.3)';
            });
        }
        
        setTimeout(() => quill.focus(), 100);
    }

    getPropertyFields(component) {
        const baseFields = super.getPropertyFields(component);
        
        return [
            ...baseFields,
            {
                type: 'separator',
                label: 'Contenu'
            },
            {
                label: 'Texte HTML',
                type: 'textarea',
                key: 'content',
                value: component.content || '',
                rows: 6,
                placeholder: 'Double-cliquez sur le composant pour éditer'
            }
        ];
    }

    getDefaultProperties() {
        return {
            w: 400,
            h: 250,
            content: '<p>Double-cliquez pour éditer</p>'
        };
    }

    onCleanup(componentId) {
        if (this.instances.has(componentId)) {
            const quill = this.instances.get(componentId);
            if (quill.container) {
                quill.container.innerHTML = '';
            }
            this.instances.delete(componentId);
        }
    }
}