// main.js - Point d'entrée principal de l'éditeur

import { State } from './core/state.js';
import { Canvas } from './core/canvas.js';
import { Toolbar } from './ui/toolbar.js';
import { PropertiesPanel } from './ui/properties-panel.js';
import { ComponentsList } from './ui/components-list.js';
import { setupKeyboardShortcuts } from './utils/keyboard.js';
import { API } from './api/client.js';

// État global de l'application
const state = new State({
    components: INITIAL_LAYOUT || [],
    selectedComponent: null,
    gridSize: 10,
    snapEnabled: true,
    moveMode: false,
    isEditingText: false
});

// Instances des modules principaux
let canvas;
let toolbar;
let propertiesPanel;
let componentsList;

// Initialisation
async function init() {
    try {
        // Initialiser le canvas
        canvas = new Canvas(state, {
            canvasElement: document.getElementById('canvas-inner') || document.getElementById('canvas'),
            onComponentSelect: handleComponentSelect,
            onComponentUpdate: handleComponentUpdate,
            onComponentDelete: handleComponentDelete
        });

        // Initialiser la toolbar
        toolbar = new Toolbar(state, {
            onAddComponent: handleAddComponent,
            onSave: handleSave,
            onCopyPage: handleCopyPage,
            onToggleGrid: handleToggleGrid,
            onGridSizeChange: handleGridSizeChange,
            onModeChange: handleModeChange
        });

        // Initialiser le panneau de propriétés
        propertiesPanel = new PropertiesPanel(state, {
            panelElement: document.getElementById('properties-panel'),
            contentElement: document.getElementById('properties-content'),
            onApplyProperties: handleApplyProperties,
            onClose: handleCloseProperties
        });

        // Initialiser la liste des composants
        componentsList = new ComponentsList(state, {
            listElement: document.getElementById('components-list'),
            onComponentSelect: handleComponentSelect
        });

        // Configurer les raccourcis clavier
        setupKeyboardShortcuts(state, {
            onDelete: handleComponentDelete,
            onMove: handleComponentMove
        });

        // Charger les pages disponibles
        await API.loadPages();

        // Rendre les composants initiaux
        canvas.renderAll();
        componentsList.update();

        // Configurer le bouton de prévisualisation
        const previewBtn = document.getElementById('preview-btn');
        if (previewBtn) {
            previewBtn.addEventListener('click', () => {
                window.open(`/pages/${SLUG}/`, '_blank');
            });
        }

        console.log('✅ Éditeur initialisé avec succès');
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation:', error);
        alert('Erreur lors du chargement de l\'éditeur. Veuillez recharger la page.');
    }
}

// Gestionnaires d'événements
function handleComponentSelect(componentId) {
    state.setSelectedComponent(componentId);
    propertiesPanel.show(componentId);
    componentsList.update();
    canvas.updateSelection();
}

function handleComponentUpdate(componentId, updates) {
    console.log('🔄 Mise à jour composant:', componentId, updates);
    state.updateComponent(componentId, updates);
    canvas.updateComponent(componentId);
    componentsList.update();
}

function handleComponentDelete(componentId) {
    if (confirm('Supprimer ce composant ?')) {
        state.removeComponent(componentId);
        canvas.removeComponent(componentId);
        componentsList.update();
        propertiesPanel.hide();
    }
}

function handleComponentMove(direction, step) {
    const componentId = state.getSelectedComponent();
    if (!componentId) return;

    const component = state.getComponent(componentId);
    const updates = { ...component };

    switch(direction) {
        case 'up': updates.y = Math.max(0, component.y - step); break;
        case 'down': updates.y = component.y + step; break;
        case 'left': updates.x = Math.max(0, component.x - step); break;
        case 'right': updates.x = component.x + step; break;
    }

    handleComponentUpdate(componentId, updates);
}

function handleAddComponent(type, x, y) {
    const component = state.addComponent(type, x, y);
    canvas.renderComponent(component);
    componentsList.update();
    handleComponentSelect(component.id);
}

async function handleSave() {
    try {
        // 🔧 FIX: Récupérer les composants à jour depuis le state
        const components = state.getComponents();

        const canvasElement = document.getElementById('canvas-inner') || document.getElementById('canvas');
        
        // ⚠️ CRITIQUE : Fallback = 1400px (largeur canonique définie dans editor.css)
        // NE JAMAIS utiliser 1920px sinon le mobile sera cassé (ratio faux)
        const canvasWidth = canvasElement ? canvasElement.offsetWidth : 1400;
        const canvasHeight = canvasElement ? canvasElement.offsetHeight : 1080;
        
        console.log('💾 Sauvegarde de', components.length, 'composants');
        console.log(`📐 Taille du canvas: ${canvasWidth}x${canvasHeight}`);
        
        // ⚠️ Warning si canvas width incohérent
        if (canvasWidth < 1300 || canvasWidth > 1500) {
            console.warn(`⚠️ Canvas width inhabituel: ${canvasWidth}px (attendu: ~1400px)`);
            console.warn('→ Vérifier que editor.css .canvas-inner { width: 1400px }');
        }
        
        console.log('📊 Contenu des composants:', components.map(c => ({
            id: c.id,
            type: c.type,
            hasContent: !!c.content,
            contentLength: c.content ? c.content.length : 0
        })));
        
        await API.savePage(SLUG, components, canvasWidth, canvasHeight);
        alert('✅ Sauvegardé avec succès !');
    } catch (error) {
        console.error('Erreur lors de la sauvegarde:', error);
        alert('❌ Erreur lors de la sauvegarde');
    }
}

function handleCopyPage() {
    toolbar.showCopyModal();
}

function handleToggleGrid() {
    state.toggleSnap();
    toolbar.updateGridButton();
}

function handleGridSizeChange(size) {
    state.setGridSize(size);
}

function handleModeChange(mode) {
    state.setMoveMode(mode === 'move');
    canvas.updateInteractionMode();
}

function handleApplyProperties(componentId, properties) {
    handleComponentUpdate(componentId, properties);
}

function handleCloseProperties() {
    state.setSelectedComponent(null);
    propertiesPanel.hide();
    canvas.updateSelection();
}

// Démarrage de l'application
document.addEventListener('DOMContentLoaded', init);

// Export pour débogage
if (typeof window !== 'undefined') {
    window.ArchitectEditor = {
        state,
        canvas,
        toolbar,
        propertiesPanel,
        componentsList
    };
}

document.getElementById('edit-tags-btn')?.addEventListener('click', async () => {
    const response = await fetch(`/api/pages/${SLUG}`);
    const page = await response.json();
    
    const tags = prompt(
        'Tags (séparés par des virgules):',
        (page.tags || []).join(', ')
    );
    
    if (tags !== null) {
        const tagList = tags.split(',').map(t => t.trim()).filter(t => t);
        
        await fetch(`/api/pages/${SLUG}/tags`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tags: tagList })
        });
        
        alert('✅ Tags sauvegardés !');
    }
});