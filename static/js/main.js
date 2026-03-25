// main.js - Point d'entrée principal de l'éditeur
// FIXES:
//   - Autosave localStorage toutes les 30s
//   - Protection beforeunload contre fermeture accidentelle
//   - Indicateur visuel d'état de sauvegarde

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

// ── Autosave ────────────────────────────────────────────────────────────────
const AUTOSAVE_KEY = `autosave_${SLUG}`;
const AUTOSAVE_INTERVAL = 30000; // 30 secondes
let hasUnsavedChanges = false;
let autosaveTimer = null;

/**
 * Sauvegarde locale dans localStorage (protection anti-crash/fermeture)
 */
function autosaveToLocalStorage() {
    try {
        const components = state.getComponents();
        const data = {
            components,
            savedAt: new Date().toISOString(),
            slug: SLUG
        };
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data));
        console.log(`💾 Autosave: ${components.length} composants sauvegardés localement`);
    } catch (e) {
        console.warn('⚠️ Autosave localStorage échoué:', e);
    }
}

/**
 * Démarre le timer d'autosave
 */
function startAutosave() {
    stopAutosave();
    autosaveTimer = setInterval(() => {
        if (hasUnsavedChanges) {
            autosaveToLocalStorage();
        }
    }, AUTOSAVE_INTERVAL);
}

/**
 * Arrête le timer d'autosave
 */
function stopAutosave() {
    if (autosaveTimer) {
        clearInterval(autosaveTimer);
        autosaveTimer = null;
    }
}

/**
 * Marque l'état comme "modifié" et met à jour l'UI
 */
function markUnsaved() {
    hasUnsavedChanges = true;
    updateSaveIndicator('unsaved');
}

/**
 * Marque l'état comme "sauvegardé"
 */
function markSaved() {
    hasUnsavedChanges = false;
    // Nettoyer l'autosave localStorage une fois sauvé sur le serveur
    try { localStorage.removeItem(AUTOSAVE_KEY); } catch (e) {}
    updateSaveIndicator('saved');
}

/**
 * Met à jour l'indicateur visuel dans le titre de la page
 */
function updateSaveIndicator(state) {
    const indicators = { saved: '✅', saving: '⏳', unsaved: '●', error: '❌' };
    const titles = { saved: 'Sauvegardé', saving: 'Sauvegarde...', unsaved: 'Modifications non sauvegardées', error: 'Erreur de sauvegarde' };
    
    document.title = state === 'saved'
        ? `${SLUG} - Éditeur`
        : `${indicators[state]} ${SLUG} - Éditeur`;

    const saveBtn = document.getElementById('save-btn');
    if (saveBtn) {
        const icon = indicators[state] || '💾';
        saveBtn.title = titles[state] || '';
        // Remplacer seulement l'icône, pas tout le texte
        saveBtn.textContent = saveBtn.textContent.replace(/^[✅⏳●❌]\s*/, '');
        saveBtn.textContent = `${icon} ${saveBtn.textContent.trim()}`;
    }
}

/**
 * Vérifie si une autosave locale existe et propose de la restaurer
 */
function checkLocalAutosave() {
    try {
        const saved = localStorage.getItem(AUTOSAVE_KEY);
        if (!saved) return;

        const data = JSON.parse(saved);
        if (!data.savedAt || !data.components) return;

        const savedAt = new Date(data.savedAt);
        const now = new Date();
        const diffMinutes = (now - savedAt) / 60000;

        // Ne proposer que si la sauvegarde date de moins de 24h
        if (diffMinutes > 1440) {
            localStorage.removeItem(AUTOSAVE_KEY);
            return;
        }

        const timeStr = savedAt.toLocaleTimeString('fr-FR');
        const restore = confirm(
            `Une sauvegarde automatique a été trouvée (${timeStr}, ${data.components.length} composants).\n\n` +
            `Voulez-vous restaurer cette version ?\n` +
            `(Cliquez "Annuler" pour conserver la version du serveur)`
        );

        if (restore) {
            state.importState({ components: data.components });
            canvas.renderAll();
            componentsList.update();
            console.log(`✅ Autosave restaurée: ${data.components.length} composants`);
            markUnsaved();
        } else {
            localStorage.removeItem(AUTOSAVE_KEY);
        }
    } catch (e) {
        console.warn('⚠️ Erreur lecture autosave:', e);
    }
}

// ── Initialisation ──────────────────────────────────────────────────────────

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

        // ── Autosave setup ──────────────────────────────────────────────
        // Vérifier si une autosave locale existe
        checkLocalAutosave();

        // Démarrer l'autosave
        startAutosave();

        // Écouter tous les changements d'état pour marquer "non sauvegardé"
        state.on('componentAdded', markUnsaved);
        state.on('componentRemoved', markUnsaved);
        state.on('componentUpdated', markUnsaved);

        // Protection contre la fermeture accidentelle
        window.addEventListener('beforeunload', (e) => {
            if (hasUnsavedChanges) {
                // Sauvegarder en localStorage avant de quitter
                autosaveToLocalStorage();
                // Afficher le dialogue natif du navigateur
                e.preventDefault();
                e.returnValue = 'Des modifications non sauvegardées seront perdues. Quitter quand même ?';
                return e.returnValue;
            }
        });

        // Indicateur initial
        updateSaveIndicator('saved');

        console.log('✅ Éditeur initialisé avec succès');
        console.log(`💾 Autosave activé (${AUTOSAVE_INTERVAL / 1000}s) — clé: ${AUTOSAVE_KEY}`);
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation:', error);
        alert('Erreur lors du chargement de l\'éditeur. Veuillez recharger la page.');
    }
}

// ── Gestionnaires d'événements ───────────────────────────────────────────────

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
    updateSaveIndicator('saving');
    try {
        // Récupérer les composants à jour depuis le state
        const components = state.getComponents();

        const canvasElement = document.getElementById('canvas-inner') || document.getElementById('canvas');
        
        // ⚠️ CRITIQUE : Fallback = 1400px (largeur canonique définie dans editor.css)
        const canvasWidth = canvasElement ? canvasElement.offsetWidth : 1400;
        const canvasHeight = canvasElement ? canvasElement.offsetHeight : 1080;
        
        console.log('💾 Sauvegarde de', components.length, 'composants');
        console.log(`📐 Taille du canvas: ${canvasWidth}x${canvasHeight}`);
        
        if (canvasWidth < 1300 || canvasWidth > 1500) {
            console.warn(`⚠️ Canvas width inhabituel: ${canvasWidth}px (attendu: ~1400px)`);
            console.warn('→ Vérifier que editor.css .canvas-inner { width: 1400px }');
        }
        
        await API.savePage(SLUG, components, canvasWidth, canvasHeight);
        
        markSaved();
        alert('✅ Sauvegardé avec succès !');
    } catch (error) {
        console.error('Erreur lors de la sauvegarde:', error);
        updateSaveIndicator('error');
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

// ── Démarrage ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);

// Export pour débogage
if (typeof window !== 'undefined') {
    window.ArchitectEditor = {
        state,
        canvas,
        toolbar,
        propertiesPanel,
        componentsList,
        // Exposer les fonctions autosave pour debug
        autosave: {
            save: autosaveToLocalStorage,
            clear: () => localStorage.removeItem(AUTOSAVE_KEY),
            check: () => {
                const raw = localStorage.getItem(AUTOSAVE_KEY);
                return raw ? JSON.parse(raw) : null;
            }
        }
    };
}

// ── Gestion des tags ─────────────────────────────────────────────────────────
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