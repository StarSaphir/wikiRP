// components/table-component.js - Composant tableau avec édition Quill-style et sauvegarde auto

import { BaseComponent } from './base-component.js';
import { showPageLinkModal } from '../modals/link-modal.js';
import { showExternalLinkModal } from '../modals/external-link-modal.js';

export class TableComponent extends BaseComponent {
    constructor(state) {
        super(state);
        this.instances = new Map();
        this.editingCell = null;
        this.autoSaveTimeout = null;
    }

    render(component) {
        const content = component.content || this.getDefaultTableHTML();
        
        return `
            <div class="table-content" id="table-${component.id}" style="
                width: 100%;
                height: 100%;
                overflow: auto;
                padding: 10px;
            ">
                ${content}
            </div>
        `;
    }

    getDefaultTableHTML() {
        return `
            <table style="width: 100%; border-collapse: collapse; background: #252525;">
                <thead>
                    <tr>
                        <th style="padding: 12px; text-align: left; border: 1px solid #333; background: #333; color: #4a9eff;">Colonne 1</th>
                        <th style="padding: 12px; text-align: left; border: 1px solid #333; background: #333; color: #4a9eff;">Colonne 2</th>
                        <th style="padding: 12px; text-align: left; border: 1px solid #333; background: #333; color: #4a9eff;">Colonne 3</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="padding: 12px; border: 1px solid #333;">Données</td>
                        <td style="padding: 12px; border: 1px solid #333;">Données</td>
                        <td style="padding: 12px; border: 1px solid #333;">Données</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; border: 1px solid #333;">Données</td>
                        <td style="padding: 12px; border: 1px solid #333;">Données</td>
                        <td style="padding: 12px; border: 1px solid #333;">Données</td>
                    </tr>
                </tbody>
            </table>
        `;
    }

    handleEdit(element, component) {
        this.initTableEditor(element, component);
    }

    initTableEditor(element, component) {
        const tableEl = element.querySelector(`#table-${component.id}`);
        
        if (this.instances.has(component.id)) return;

        this.state.lockEditor(component.id);
        
        if (element.interactInstance) {
            element.interactInstance.draggable(false).resizable(false);
        }

        const originalContent = component.content || tableEl.innerHTML;
        this.showTableEditor(component, tableEl, element, originalContent);
    }

    showTableEditor(component, tableEl, element, originalContent) {
        const propsPanel = document.getElementById('properties-panel');
        const propsContent = document.getElementById('properties-content');

        propsPanel.classList.add('active');
        propsPanel.dataset.editingMode = 'true';
        propsPanel.dataset.editingComponentId = component.id;
        
        propsContent.innerHTML = `
            <div class="table-editor-panel">
                <div style="background: #4a9eff; color: white; padding: 10px; border-radius: 5px; margin-bottom: 20px; text-align: center;">
                    <strong>🔒 MODE ÉDITION VERROUILLÉ</strong>
                    <p style="font-size: 12px; margin-top: 5px;">Éditez les cellules - Sauvegarde automatique activée</p>
                </div>
                
                <h3 style="color: #4a9eff; margin-bottom: 20px;">📊 Édition de tableau</h3>
                
                <!-- Section Style de texte -->
                <div class="toolbar-section" style="background: #252525; padding: 15px; border-radius: 5px; margin-bottom: 15px;">
                    <h4 style="color: #999; font-size: 11px; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.5px;">📝 Style de texte</h4>
                    
                    <div style="margin-bottom: 12px;">
                        <label style="display: block; color: #999; font-size: 11px; margin-bottom: 6px;">Format</label>
                        <div style="display: flex; gap: 6px;">
                            <button class="cell-format-btn" data-command="bold" title="Gras" style="flex: 1; padding: 8px; background: #333; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; transition: all 0.2s;">
                                <strong>B</strong>
                            </button>
                            <button class="cell-format-btn" data-command="italic" title="Italique" style="flex: 1; padding: 8px; background: #333; color: white; border: none; border-radius: 4px; cursor: pointer; font-style: italic; transition: all 0.2s;">
                                <em>I</em>
                            </button>
                            <button class="cell-format-btn" data-command="underline" title="Souligné" style="flex: 1; padding: 8px; background: #333; color: white; border: none; border-radius: 4px; cursor: pointer; text-decoration: underline; transition: all 0.2s;">
                                <u>U</u>
                            </button>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 12px;">
                        <label style="display: block; color: #999; font-size: 11px; margin-bottom: 6px;">Couleur du texte</label>
                        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                            <button class="cell-color-btn" data-color="#e0e0e0" style="width: 30px; height: 30px; background: #e0e0e0; border: 2px solid #333; border-radius: 4px; cursor: pointer; transition: all 0.2s;" title="Blanc"></button>
                            <button class="cell-color-btn" data-color="#4a9eff" style="width: 30px; height: 30px; background: #4a9eff; border: 2px solid #333; border-radius: 4px; cursor: pointer; transition: all 0.2s;" title="Bleu"></button>
                            <button class="cell-color-btn" data-color="#5cb85c" style="width: 30px; height: 30px; background: #5cb85c; border: 2px solid #333; border-radius: 4px; cursor: pointer; transition: all 0.2s;" title="Vert"></button>
                            <button class="cell-color-btn" data-color="#f0ad4e" style="width: 30px; height: 30px; background: #f0ad4e; border: 2px solid #333; border-radius: 4px; cursor: pointer; transition: all 0.2s;" title="Orange"></button>
                            <button class="cell-color-btn" data-color="#d9534f" style="width: 30px; height: 30px; background: #d9534f; border: 2px solid #333; border-radius: 4px; cursor: pointer; transition: all 0.2s;" title="Rouge"></button>
                            <button class="cell-color-btn" data-color="#999" style="width: 30px; height: 30px; background: #999; border: 2px solid #333; border-radius: 4px; cursor: pointer; transition: all 0.2s;" title="Gris"></button>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 12px;">
                        <label style="display: block; color: #999; font-size: 11px; margin-bottom: 6px;">Alignement</label>
                        <div style="display: flex; gap: 6px;">
                            <button class="cell-align-btn" data-align="left" title="Gauche" style="flex: 1; padding: 8px; background: #333; color: white; border: none; border-radius: 4px; cursor: pointer; transition: all 0.2s;">
                                ⬅
                            </button>
                            <button class="cell-align-btn" data-align="center" title="Centre" style="flex: 1; padding: 8px; background: #333; color: white; border: none; border-radius: 4px; cursor: pointer; transition: all 0.2s;">
                                ↔
                            </button>
                            <button class="cell-align-btn" data-align="right" title="Droite" style="flex: 1; padding: 8px; background: #333; color: white; border: none; border-radius: 4px; cursor: pointer; transition: all 0.2s;">
                                ➡
                            </button>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 12px;">
                        <label style="display: block; color: #999; font-size: 11px; margin-bottom: 6px;">Liens</label>
                        <div style="display: flex; gap: 6px;">
                            <button class="cell-link-external" title="Lien externe" style="flex: 1; padding: 8px 12px; background: #4a9eff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; transition: all 0.2s; font-weight: 500;">
                                🔗 Externe
                            </button>
                            <button class="cell-link-page" title="Lien page interne" style="flex: 1; padding: 8px 12px; background: #5cb85c; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; transition: all 0.2s; font-weight: 500;">
                                📄 Interne
                            </button>
                        </div>
                    </div>
                    
                    <button class="cell-clear-btn" style="width: 100%; padding: 8px; background: #d9534f; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; transition: all 0.2s;">
                        🧹 Supprimer mise en forme
                    </button>
                </div>
                
                <!-- Section Structure du tableau -->
                <div class="toolbar-section" style="background: #252525; padding: 15px; border-radius: 5px; margin-bottom: 15px;">
                    <h4 style="color: #999; font-size: 11px; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.5px;">🔧 Structure du tableau</h4>
                    <div style="display: grid; gap: 8px;">
                        <button id="add-row-btn" class="table-action-btn" style="width: 100%; padding: 10px; background: #5cb85c; border: none; color: white; border-radius: 4px; cursor: pointer; font-size: 12px; transition: all 0.2s; font-weight: 500;">
                            ➕ Ajouter une ligne
                        </button>
                        <button id="add-col-btn" class="table-action-btn" style="width: 100%; padding: 10px; background: #5cb85c; border: none; color: white; border-radius: 4px; cursor: pointer; font-size: 12px; transition: all 0.2s; font-weight: 500;">
                            ➕ Ajouter une colonne
                        </button>
                        <button id="remove-row-btn" class="table-action-btn" style="width: 100%; padding: 10px; background: #d9534f; border: none; color: white; border-radius: 4px; cursor: pointer; font-size: 12px; transition: all 0.2s; font-weight: 500;">
                            ➖ Supprimer dernière ligne
                        </button>
                        <button id="remove-col-btn" class="table-action-btn" style="width: 100%; padding: 10px; background: #d9534f; border: none; color: white; border-radius: 4px; cursor: pointer; font-size: 12px; transition: all 0.2s; font-weight: 500;">
                            ➖ Supprimer dernière colonne
                        </button>
                    </div>
                </div>
                
                <!-- Instructions -->
                <div style="background: #1e1e1e; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                    <h4 style="color: #4a9eff; font-size: 13px; margin-bottom: 10px;">💡 Instructions</h4>
                    <ul style="color: #999; font-size: 12px; line-height: 1.8; padding-left: 20px; margin: 0;">
                        <li>Cliquez sur une cellule pour l'éditer</li>
                        <li>Utilisez les boutons pour formater le texte</li>
                        <li>Les modifications sont sauvegardées automatiquement</li>
                        <li>Entrée = cellule suivante • Tab = navigation</li>
                    </ul>
                </div>
                
                <!-- Indicateur de sauvegarde -->
                <div id="save-indicator" style="background: #252525; padding: 10px; border-radius: 5px; margin-bottom: 15px; text-align: center; color: #999; font-size: 12px;">
                    💾 Prêt à sauvegarder
                </div>
                
                <!-- Bouton Terminer -->
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #333;">
                    <button id="finish-table-edit-btn" class="finish-editing-btn" style="width: 100%; padding: 15px; background: #28a745; color: white; border: none; border-radius: 5px; font-weight: bold; cursor: pointer; font-size: 16px; box-shadow: 0 2px 8px rgba(40,167,69,0.3); transition: all 0.3s;">
                        ✓ TERMINER L'ÉDITION
                    </button>
                    <p style="color: #666; font-size: 12px; margin-top: 10px; text-align: center;">
                        Ferme l'éditeur et retour au mode normal
                    </p>
                </div>
            </div>
        `;

        // Rendre cellules éditables et stocker la référence
        this.makeCellsEditable(tableEl, component);
        this.instances.set(component.id, { tableEl, component, element });

        // Attacher gestionnaires de formatage
        this.attachFormattingHandlers(component, tableEl);

        // Attacher gestionnaires de liens
        this.attachLinkHandlers(component, tableEl);

        // Fonction de sauvegarde automatique
        const autoSave = () => {
            const currentContent = tableEl.innerHTML;
            component.content = currentContent;
            
            console.log('💾 Sauvegarde auto tableau:', component.id);
            
            this.updateSaveIndicator('saved');
            
            this.state.emit('componentContentUpdated', {
                id: component.id,
                content: component.content
            });
        };

        // Stocker la fonction autoSave pour y accéder partout
        this.currentAutoSave = autoSave;

        // Fonction de finalisation
        const finishEditing = () => {
            console.log('✅ Finalisation édition tableau...');
            
            // Sauvegarde finale
            component.content = tableEl.innerHTML;
            
            this.removeCellEditing(tableEl);
            this.instances.delete(component.id);
            this.currentAutoSave = null;
            
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
            
            propsPanel.classList.remove('active');
            element.classList.remove('selected');
            this.state.selectedComponent = null;
            
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
        const finishBtn = document.getElementById('finish-table-edit-btn');
        if (finishBtn) {
            finishBtn.addEventListener('click', (e) => {
                e.preventDefault();
                finishEditing();
            });

            finishBtn.addEventListener('mouseenter', () => {
                finishBtn.style.background = '#34ce57';
                finishBtn.style.transform = 'translateY(-2px)';
                finishBtn.style.boxShadow = '0 4px 12px rgba(40,167,69,0.4)';
            });
            finishBtn.addEventListener('mouseleave', () => {
                finishBtn.style.background = '#28a745';
                finishBtn.style.transform = 'translateY(0)';
                finishBtn.style.boxShadow = '0 2px 8px rgba(40,167,69,0.3)';
            });
        }

        // Actions tableau avec sauvegarde auto
        this.attachTableActions(tableEl, autoSave);
        
        // Hover sur tous les boutons
        this.attachButtonHoverEffects();
    }

    attachFormattingHandlers(component, tableEl) {
        // Boutons de formatage
        document.querySelectorAll('.cell-format-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const command = btn.dataset.command;
                document.execCommand(command, false, null);
                this.scheduleAutoSave();
            });
        });

        // Boutons de couleur
        document.querySelectorAll('.cell-color-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const color = btn.dataset.color;
                document.execCommand('foreColor', false, color);
                this.scheduleAutoSave();
            });
        });

        // Boutons d'alignement
        document.querySelectorAll('.cell-align-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const align = btn.dataset.align;
                if (this.editingCell) {
                    this.editingCell.style.textAlign = align;
                    this.scheduleAutoSave();
                }
            });
        });

        // Bouton de suppression de formatage
        const clearBtn = document.querySelector('.cell-clear-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (this.editingCell) {
                    document.execCommand('removeFormat', false, null);
                    this.editingCell.style.textAlign = '';
                    this.editingCell.style.color = '';
                    this.scheduleAutoSave();
                }
            });
        }
    }

    attachLinkHandlers(component, tableEl) {
        // Créer un objet similaire à Quill pour les modales
        const pseudoQuill = {
            getSelection: () => {
                const selection = window.getSelection();
                if (!selection || selection.rangeCount === 0) return null;
                
                const range = selection.getRangeAt(0);
                return {
                    index: 0,
                    length: range.toString().length
                };
            },
            getText: (index, length) => {
                const selection = window.getSelection();
                if (!selection || selection.rangeCount === 0) return '';
                return selection.toString();
            },
            insertText: (index, text, formats) => {
                // Insérer du texte avec formatage
                const selection = window.getSelection();
                if (!selection || selection.rangeCount === 0) return;
                
                const range = selection.getRangeAt(0);
                range.deleteContents();
                
                if (formats && formats.link) {
                    const link = document.createElement('a');
                    link.href = formats.link;
                    link.textContent = text;
                    link.style.color = '#4a9eff';
                    link.style.textDecoration = 'none';
                    link.style.borderBottom = '1px solid transparent';
                    range.insertNode(link);
                } else {
                    const textNode = document.createTextNode(text);
                    range.insertNode(textNode);
                }
                
                this.scheduleAutoSave();
            },
            format: (name, value) => {
                if (name === 'link') {
                    if (value) {
                        document.execCommand('createLink', false, value);
                        // Styler le lien créé
                        const selection = window.getSelection();
                        if (selection && selection.anchorNode) {
                            const parent = selection.anchorNode.parentElement;
                            if (parent && parent.tagName === 'A') {
                                parent.style.color = '#4a9eff';
                                parent.style.textDecoration = 'none';
                                parent.style.borderBottom = '1px solid transparent';
                            }
                        }
                    } else {
                        document.execCommand('unlink', false, null);
                    }
                    this.scheduleAutoSave();
                }
            }
        };

        // Bouton lien externe
        const linkExternalBtn = document.querySelector('.cell-link-external');
        if (linkExternalBtn) {
            linkExternalBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (!this.editingCell) {
                    alert('Veuillez d\'abord sélectionner une cellule');
                    return;
                }
                showExternalLinkModal(pseudoQuill);
            });

            linkExternalBtn.addEventListener('mouseenter', () => {
                linkExternalBtn.style.background = '#5ab0ff';
            });
            linkExternalBtn.addEventListener('mouseleave', () => {
                linkExternalBtn.style.background = '#4a9eff';
            });
        }

        // Bouton lien page interne
        const linkPageBtn = document.querySelector('.cell-link-page');
        if (linkPageBtn) {
            linkPageBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (!this.editingCell) {
                    alert('Veuillez d\'abord sélectionner une cellule');
                    return;
                }
                showPageLinkModal(pseudoQuill);
            });

            linkPageBtn.addEventListener('mouseenter', () => {
                linkPageBtn.style.background = '#6fc87c';
            });
            linkPageBtn.addEventListener('mouseleave', () => {
                linkPageBtn.style.background = '#5cb85c';
            });
        }
    }

    attachTableActions(tableEl, autoSave) {
        document.getElementById('add-row-btn')?.addEventListener('click', () => {
            const tbody = tableEl.querySelector('table tbody');
            if (tbody) {
                const newRow = tbody.insertRow();
                const colCount = tbody.rows[0]?.cells.length || 3;
                for (let i = 0; i < colCount; i++) {
                    const cell = newRow.insertCell();
                    cell.style.cssText = 'padding: 12px; border: 1px solid #333;';
                    cell.textContent = 'Nouvelle';
                    cell.setAttribute('contenteditable', 'true');
                    this.attachCellListeners(cell, autoSave);
                }
                autoSave();
            }
        });

        document.getElementById('add-col-btn')?.addEventListener('click', () => {
            const table = tableEl.querySelector('table');
            if (table) {
                const headerRow = table.querySelector('thead tr');
                if (headerRow) {
                    const th = document.createElement('th');
                    th.style.cssText = 'padding: 12px; text-align: left; border: 1px solid #333; background: #333; color: #4a9eff;';
                    th.textContent = 'Nouvelle';
                    th.setAttribute('contenteditable', 'true');
                    headerRow.appendChild(th);
                    this.attachCellListeners(th, autoSave);
                }
                
                table.querySelectorAll('tbody tr').forEach(row => {
                    const td = document.createElement('td');
                    td.style.cssText = 'padding: 12px; border: 1px solid #333;';
                    td.textContent = 'Nouvelle';
                    td.setAttribute('contenteditable', 'true');
                    row.appendChild(td);
                    this.attachCellListeners(td, autoSave);
                });
                autoSave();
            }
        });

        document.getElementById('remove-row-btn')?.addEventListener('click', () => {
            const tbody = tableEl.querySelector('table tbody');
            if (tbody && tbody.rows.length > 1) {
                tbody.deleteRow(-1);
                autoSave();
            }
        });

        document.getElementById('remove-col-btn')?.addEventListener('click', () => {
            const table = tableEl.querySelector('table');
            if (table) {
                const headerRow = table.querySelector('thead tr');
                if (headerRow && headerRow.cells.length > 1) {
                    headerRow.deleteCell(-1);
                }
                
                table.querySelectorAll('tbody tr').forEach(row => {
                    if (row.cells.length > 1) {
                        row.deleteCell(-1);
                    }
                });
                autoSave();
            }
        });
    }

    makeCellsEditable(tableEl, component) {
        const cells = tableEl.querySelectorAll('th, td');
        cells.forEach(cell => {
            cell.setAttribute('contenteditable', 'true');
            cell.style.cursor = 'text';
            cell.style.outline = 'none';
            
            const autoSave = () => {
                component.content = tableEl.innerHTML;
                console.log('💾 Auto-save déclenché depuis cellule');
                this.updateSaveIndicator('saved');
                this.state.emit('componentContentUpdated', {
                    id: component.id,
                    content: component.content
                });
            };
            
            this.attachCellListeners(cell, autoSave);
        });
    }

    attachCellListeners(cell, autoSave) {
        cell.addEventListener('focus', () => {
            cell.style.background = '#3a3a3a';
            cell.style.boxShadow = 'inset 0 0 0 2px #4a9eff';
            this.editingCell = cell;
            this.updateSaveIndicator('editing');
        });

        cell.addEventListener('blur', () => {
            cell.style.background = cell.tagName === 'TH' ? '#333' : '';
            cell.style.boxShadow = '';
            
            const wasEditing = this.editingCell === cell;
            this.editingCell = null;
            
            // ✅ SAUVEGARDE AUTOMATIQUE lors de la désélection
            if (wasEditing && autoSave) {
                console.log('📝 Blur détecté, sauvegarde...');
                this.scheduleAutoSave();
            }
        });

        cell.addEventListener('input', () => {
            this.updateSaveIndicator('editing');
            this.scheduleAutoSave();
        });

        cell.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                cell.blur();
                const nextCell = this.getNextCell(cell);
                if (nextCell) setTimeout(() => nextCell.focus(), 10);
            }
            
            if (e.key === 'Tab') {
                e.preventDefault();
                const nextCell = e.shiftKey ? this.getPrevCell(cell) : this.getNextCell(cell);
                if (nextCell) nextCell.focus();
            }
        });
    }

    scheduleAutoSave() {
        clearTimeout(this.autoSaveTimeout);
        this.updateSaveIndicator('saving');
        
        this.autoSaveTimeout = setTimeout(() => {
            if (this.currentAutoSave) {
                console.log('⏰ Auto-save timeout exécuté');
                this.currentAutoSave();
            } else {
                console.warn('⚠️ currentAutoSave non défini');
            }
        }, 800);
    }

    updateSaveIndicator(status) {
        const indicator = document.getElementById('save-indicator');
        if (!indicator) return;

        const statusConfig = {
            editing: { icon: '✏️', text: 'Modification en cours...', color: '#f0ad4e' },
            saving: { icon: '⏳', text: 'Sauvegarde...', color: '#4a9eff' },
            saved: { icon: '✅', text: 'Sauvegardé automatiquement', color: '#5cb85c' }
        };

        const config = statusConfig[status] || statusConfig.editing;
        indicator.style.background = config.color;
        indicator.style.color = 'white';
        indicator.textContent = `${config.icon} ${config.text}`;
    }

    attachButtonHoverEffects() {
        // Boutons de formatage
        document.querySelectorAll('.cell-format-btn, .cell-align-btn').forEach(btn => {
            btn.addEventListener('mouseenter', () => {
                btn.style.background = '#4a9eff';
                btn.style.transform = 'translateY(-2px)';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.background = '#333';
                btn.style.transform = 'translateY(0)';
            });
        });

        // Boutons de couleur
        document.querySelectorAll('.cell-color-btn').forEach(btn => {
            btn.addEventListener('mouseenter', () => {
                btn.style.transform = 'scale(1.15)';
                btn.style.borderColor = '#4a9eff';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.transform = 'scale(1)';
                btn.style.borderColor = '#333';
            });
        });

        // Bouton clear
        const clearBtn = document.querySelector('.cell-clear-btn');
        if (clearBtn) {
            clearBtn.addEventListener('mouseenter', () => {
                clearBtn.style.background = '#e74c3c';
                clearBtn.style.transform = 'translateY(-2px)';
            });
            clearBtn.addEventListener('mouseleave', () => {
                clearBtn.style.background = '#d9534f';
                clearBtn.style.transform = 'translateY(0)';
            });
        }

        // Boutons d'action tableau
        document.querySelectorAll('.table-action-btn').forEach(btn => {
            btn.addEventListener('mouseenter', () => {
                btn.style.transform = 'translateY(-2px)';
                btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.transform = 'translateY(0)';
                btn.style.boxShadow = 'none';
            });
        });
    }

    getNextCell(currentCell) {
        const table = currentCell.closest('table');
        if (!table) return null;
        const cells = Array.from(table.querySelectorAll('th, td'));
        const currentIndex = cells.indexOf(currentCell);
        return cells[currentIndex + 1] || null;
    }

    getPrevCell(currentCell) {
        const table = currentCell.closest('table');
        if (!table) return null;
        const cells = Array.from(table.querySelectorAll('th, td'));
        const currentIndex = cells.indexOf(currentCell);
        return cells[currentIndex - 1] || null;
    }

    removeCellEditing(tableEl) {
        const cells = tableEl.querySelectorAll('th, td');
        cells.forEach(cell => {
            cell.removeAttribute('contenteditable');
            cell.style.cursor = '';
            cell.style.boxShadow = '';
            if (cell.tagName === 'TH') {
                cell.style.background = '#333';
            } else {
                cell.style.background = '';
            }
        });
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
                label: 'HTML du tableau',
                type: 'textarea',
                key: 'content',
                value: component.content || '',
                rows: 8,
                placeholder: 'Double-cliquez pour éditer'
            }
        ];
    }

    getDefaultProperties() {
        return {
            w: 600,
            h: 300,
            content: this.getDefaultTableHTML()
        };
    }

    onCleanup(componentId) {
        if (this.instances.has(componentId)) {
            this.instances.delete(componentId);
        }
        clearTimeout(this.autoSaveTimeout);
        this.currentAutoSave = null;
        this.editingCell = null;
    }
}