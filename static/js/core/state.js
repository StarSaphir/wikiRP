// core/state.js - Gestion centralisée de l'état de l'application

export class State {
    constructor(initialState = {}) {
        this.components = initialState.components || [];
        this.selectedComponent = initialState.selectedComponent || null;
        this.gridSize = initialState.gridSize || 10;
        this.snapEnabled = initialState.snapEnabled !== undefined ? initialState.snapEnabled : true;
        this.moveMode = initialState.moveMode || false;
        this.isEditingText = initialState.isEditingText || false;
        
        // 🔧 FIX: Calculer le compteur basé sur les IDs existants pour éviter les doublons
        this.componentCounter = this.calculateMaxCounter();
        
        this.listeners = new Map();
        
        // Mode verrouillé pour l'édition
        this.editorLocked = false;
        this.lockedComponentId = null;
        
        // 🔧 FIX: Set pour tracker les IDs utilisés
        this.usedIds = new Set(this.components.map(c => c.id));
        
        console.log(`📊 State initialisé: ${this.components.length} composants, counter: ${this.componentCounter}`);
        console.log('📋 IDs existants:', Array.from(this.usedIds));
    }

    /**
     * 🔧 FIX: Calcule le compteur maximum à partir des IDs existants
     */
    calculateMaxCounter() {
        let maxCounter = 0;
        
        this.components.forEach(comp => {
            if (comp.id && comp.id.startsWith('comp-')) {
                const num = parseInt(comp.id.replace('comp-', ''));
                if (!isNaN(num) && num > maxCounter) {
                    maxCounter = num;
                }
            }
        });
        
        return maxCounter;
    }

    /**
     * 🔧 FIX: Génère un ID unique garanti
     */
    generateUniqueId() {
        let attempts = 0;
        let newId;
        
        do {
            this.componentCounter++;
            newId = `comp-${this.componentCounter}`;
            attempts++;
            
            // Sécurité: éviter boucle infinie
            if (attempts > 10000) {
                console.error('❌ Impossible de générer un ID unique après 10000 tentatives');
                newId = `comp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                break;
            }
        } while (this.usedIds.has(newId));
        
        this.usedIds.add(newId);
        console.log(`✅ Nouvel ID généré: ${newId} (tentatives: ${attempts})`);
        
        return newId;
    }

    // Gestion des événements
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => callback(data));
        }
    }

    // Getters
    getComponents() {
        return [...this.components];
    }

    getComponent(id) {
        return this.components.find(c => c.id === id);
    }

    getSelectedComponent() {
        return this.selectedComponent;
    }

    getGridSize() {
        return this.gridSize;
    }

    isSnapEnabled() {
        return this.snapEnabled;
    }

    isMoveMode() {
        return this.moveMode;
    }

    isEditingTextMode() {
        return this.isEditingText;
    }

    // Gestion du mode verrouillé
    isEditorLocked() {
        return this.editorLocked;
    }

    lockEditor(componentId) {
        this.editorLocked = true;
        this.lockedComponentId = componentId;
        this.isEditingText = true;
        this.currentEditingTextId = componentId;
        this.emit('editorLocked', componentId);
        console.log('🔒 Éditeur verrouillé pour', componentId);
    }

    unlockEditor() {
        console.log('🔓 Éditeur déverrouillé');
        this.editorLocked = false;
        this.lockedComponentId = null;
        this.isEditingText = false;
        this.currentEditingTextId = null;
        this.emit('editorUnlocked');
    }

    // Setters
    setSelectedComponent(id) {
        // Bloquer si éditeur verrouillé
        if (this.editorLocked && id !== this.lockedComponentId && id !== null) {
            console.warn('⚠️ Sélection bloquée: éditeur verrouillé');
            return;
        }
        
        this.selectedComponent = id;
        this.emit('selectionChange', id);
    }

    setGridSize(size) {
        this.gridSize = parseInt(size);
        this.emit('gridSizeChange', this.gridSize);
    }

    toggleSnap() {
        this.snapEnabled = !this.snapEnabled;
        this.emit('snapToggle', this.snapEnabled);
    }

    setMoveMode(enabled) {
        this.moveMode = enabled;
        this.emit('moveModeChange', this.moveMode);
    }

    setEditingText(editing) {
        this.isEditingText = editing;
        this.emit('editingTextChange', this.isEditingText);
    }

    // Opérations sur les composants
    addComponent(type, x = 50, y = 50) {
        const component = this.createComponent(type, x, y);
        
        // 🔧 FIX: Vérifier que l'ID n'existe pas déjà
        if (this.getComponent(component.id)) {
            console.error(`❌ ID en conflit détecté: ${component.id}`);
            component.id = this.generateUniqueId();
            console.log(`✅ ID régénéré: ${component.id}`);
        }
        
        this.components.push(component);
        this.emit('componentAdded', component);
        
        console.log(`➕ Composant ajouté: ${component.id} (${type}) à (${x}, ${y})`);
        
        return component;
    }

    createComponent(type, x, y) {
        const defaultSizes = {
            text: { w: 300, h: 200 },
            image: { w: 300, h: 200 },
            gallery: { w: 560, h: 315 },
            video: { w: 560, h: 315 },
            youtube: { w: 560, h: 315 },
            shape: { w: 300, h: 200 },
            table: { w: 400, h: 250 },
            separator: { w: 800, h: 2 }
        };

        const size = defaultSizes[type] || { w: 300, h: 200 };

        // 🔧 FIX: Utiliser generateUniqueId() au lieu de ++this.componentCounter
        const newId = this.generateUniqueId();

        return {
            id: newId,
            type: type,
            x: x,
            y: y,
            w: size.w,
            h: size.h,
            z: this.components.length,
            content: '',
            custom_css: '',
            custom_js: '',
            ...(type === 'gallery' && { images: [] }),
            ...(type === 'shape' && { bg_color: '#333333' }),
            ...(type === 'table' && { 
                content: `
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
                `
            })
        };
    }

    updateComponent(id, updates) {
        const index = this.components.findIndex(c => c.id === id);
        if (index !== -1) {
            // 🔧 FIX: Mettre à jour l'objet existant (pas créer un nouveau)
            Object.assign(this.components[index], updates);
            
            console.log(`📝 Composant ${id} mis à jour:`, {
                type: this.components[index].type,
                hasContent: !!this.components[index].content,
                contentLength: this.components[index].content?.length || 0,
                updates: Object.keys(updates)
            });
            
            this.emit('componentUpdated', { id, updates });
        } else {
            console.warn(`⚠️ Tentative de mise à jour d'un composant inexistant: ${id}`);
        }
    }

    removeComponent(id) {
        const initialLength = this.components.length;
        this.components = this.components.filter(c => c.id !== id);
        
        // 🔧 FIX: Retirer l'ID du set
        this.usedIds.delete(id);
        
        if (this.selectedComponent === id) {
            this.selectedComponent = null;
        }
        
        if (this.components.length < initialLength) {
            console.log(`🗑️ Composant supprimé: ${id}`);
            this.emit('componentRemoved', id);
        } else {
            console.warn(`⚠️ Tentative de suppression d'un composant inexistant: ${id}`);
        }
    }

    changeZIndex(id, delta) {
        const component = this.getComponent(id);
        if (component) {
            component.z = (component.z || 0) + delta;
            this.emit('zIndexChanged', { id, z: component.z });
        }
    }

    // Utilitaires
    getMaxBottom() {
        let maxBottom = 0;
        this.components.forEach(comp => {
            const bottom = comp.y + comp.h;
            if (bottom > maxBottom) maxBottom = bottom;
        });
        return maxBottom;
    }

    getSortedByZIndex() {
        return [...this.components].sort((a, b) => (a.z || 0) - (b.z || 0));
    }

    getSortedByZIndexDesc() {
        return [...this.components].sort((a, b) => (b.z || 0) - (a.z || 0));
    }

    // Snap to grid
    snapToGrid(value) {
        if (this.snapEnabled) {
            return Math.round(value / this.gridSize) * this.gridSize;
        }
        return value;
    }

    // Export/Import
    exportState() {
        return {
            components: this.components,
            gridSize: this.gridSize,
            snapEnabled: this.snapEnabled
        };
    }

    importState(state) {
        this.components = state.components || [];
        this.gridSize = state.gridSize || 10;
        this.snapEnabled = state.snapEnabled !== undefined ? state.snapEnabled : true;
        
        // 🔧 FIX: Recalculer le compteur et les IDs utilisés
        this.componentCounter = this.calculateMaxCounter();
        this.usedIds = new Set(this.components.map(c => c.id));
        
        console.log(`📥 State importé: ${this.components.length} composants`);
        console.log(`📊 Counter: ${this.componentCounter}, IDs: ${this.usedIds.size}`);
        
        this.emit('stateImported', state);
    }

    /**
     * 🔧 FIX: Fonction de diagnostic pour détecter les doublons
     */
    diagnoseState() {
        console.log('\n🔍 DIAGNOSTIC DU STATE');
        console.log('='.repeat(50));
        
        console.log(`\n📊 Statistiques:`);
        console.log(`  - Composants: ${this.components.length}`);
        console.log(`  - Counter: ${this.componentCounter}`);
        console.log(`  - IDs utilisés: ${this.usedIds.size}`);
        
        // Vérifier les doublons
        const ids = this.components.map(c => c.id);
        const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
        
        if (duplicates.length > 0) {
            console.error(`\n❌ DOUBLONS DÉTECTÉS:`);
            duplicates.forEach(id => {
                const dupes = this.components.filter(c => c.id === id);
                console.error(`  - ID "${id}" utilisé ${dupes.length} fois`);
                dupes.forEach((c, i) => {
                    console.error(`    ${i + 1}. Type: ${c.type}, Position: (${c.x}, ${c.y})`);
                });
            });
        } else {
            console.log(`\n✅ Aucun doublon détecté`);
        }
        
        // Vérifier la cohérence du counter
        const maxId = Math.max(...ids.map(id => {
            const num = parseInt(id.replace('comp-', ''));
            return isNaN(num) ? 0 : num;
        }));
        
        if (this.componentCounter < maxId) {
            console.warn(`\n⚠️ INCOHÉRENCE: Counter (${this.componentCounter}) < Max ID (${maxId})`);
        }
        
        // Afficher tous les composants
        console.log(`\n📋 Liste des composants:`);
        this.components.forEach((c, i) => {
            console.log(`  ${i + 1}. ${c.id} (${c.type}) - Z:${c.z || 0}`);
        });
        
        console.log('\n' + '='.repeat(50) + '\n');
    }

    /**
     * 🔧 FIX: Fonction de réparation des IDs en doublon
     */
    repairDuplicateIds() {
        const ids = this.components.map(c => c.id);
        const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
        
        if (duplicates.length === 0) {
            console.log('✅ Aucun doublon à réparer');
            return false;
        }
        
        console.log(`🔧 Réparation de ${duplicates.length} doublons...`);
        
        const seen = new Set();
        let repaired = 0;
        
        this.components.forEach(comp => {
            if (seen.has(comp.id)) {
                const oldId = comp.id;
                comp.id = this.generateUniqueId();
                console.log(`  ✅ ${oldId} → ${comp.id}`);
                repaired++;
            } else {
                seen.add(comp.id);
            }
        });
        
        console.log(`✅ ${repaired} composants réparés`);
        return true;
    }
}