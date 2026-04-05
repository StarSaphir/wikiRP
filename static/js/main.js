// main.js - Point d'entrée principal de l'éditeur

import { State } from './core/state.js';
import { Canvas } from './core/canvas.js';
import { Toolbar } from './ui/toolbar.js';
import { PropertiesPanel } from './ui/properties-panel.js';
import { ComponentsList } from './ui/components-list.js';
import { setupKeyboardShortcuts } from './utils/keyboard.js';
import { API } from './api/client.js';
import { MobileEditor } from './utils/mobile-editor.js';

const state = new State({
    components: INITIAL_LAYOUT || [],
    selectedComponent: null,
    gridSize: 10,
    snapEnabled: true,
    moveMode: false,
    isEditingText: false
});

let canvas;
let toolbar;
let propertiesPanel;
let componentsList;
let mobileEditor;

// ── Autosave ──────────────────────────────────────────────────────────────────

const AUTOSAVE_KEY      = `autosave_${SLUG}`;
const AUTOSAVE_INTERVAL = 30000;
let hasUnsavedChanges   = false;

function autosaveLocal() {
    try {
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({
            components: state.getComponents(),
            savedAt:    new Date().toISOString()
        }));
    } catch (e) {}
}

function startAutosave() {
    setInterval(() => { if (hasUnsavedChanges) autosaveLocal(); }, AUTOSAVE_INTERVAL);
}

function markUnsaved() {
    hasUnsavedChanges = true;
    document.title    = `● ${SLUG} - Éditeur`;
}

function markSaved() {
    hasUnsavedChanges = false;
    document.title    = `${SLUG} - Éditeur`;
    try { localStorage.removeItem(AUTOSAVE_KEY); } catch (e) {}
}

function checkLocalAutosave() {
    try {
        const raw = localStorage.getItem(AUTOSAVE_KEY);
        if (!raw) return;
        const data   = JSON.parse(raw);
        const ageMin = (Date.now() - new Date(data.savedAt)) / 60000;
        if (ageMin > 1440 || !data.components) { localStorage.removeItem(AUTOSAVE_KEY); return; }

        const ok = confirm(
            `Autosave trouvée (${new Date(data.savedAt).toLocaleTimeString('fr-FR')}, `+
            `${data.components.length} composants).\nRestaurer ?`
        );
        if (ok) {
            state.importState({ components: data.components });
            canvas.renderAll();
            componentsList.update();
            markUnsaved();
        } else {
            localStorage.removeItem(AUTOSAVE_KEY);
        }
    } catch (e) {}
}

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
    try {
        canvas = new Canvas(state, {
            canvasElement:     document.getElementById('canvas-inner') || document.getElementById('canvas'),
            onComponentSelect: handleComponentSelect,
            onComponentUpdate: handleComponentUpdate,
            onComponentDelete: handleComponentDelete
        });

        toolbar = new Toolbar(state, {
            onAddComponent:   handleAddComponent,
            onSave:           handleSave,
            onCopyPage:       handleCopyPage,
            onToggleGrid:     handleToggleGrid,
            onGridSizeChange: handleGridSizeChange,
            onModeChange:     handleModeChange
        });

        propertiesPanel = new PropertiesPanel(state, {
            panelElement:      document.getElementById('properties-panel'),
            contentElement:    document.getElementById('properties-content'),
            onApplyProperties: handleApplyProperties,
            onClose:           handleCloseProperties
        });

        componentsList = new ComponentsList(state, {
            listElement:       document.getElementById('components-list'),
            onComponentSelect: handleComponentSelect
        });

        setupKeyboardShortcuts(state, {
            onDelete: handleComponentDelete,
            onMove:   handleComponentMove
        });

        await API.loadPages();
        canvas.renderAll();
        componentsList.update();

        // ── MobileEditor ──────────────────────────────────────────────────────
        mobileEditor = new MobileEditor(state, canvas, {
            onSave: async (mode, components) => {
                if (mode === 'mobile') await saveMobileLayout(components);
            },
            onModeChange: () => componentsList.update()
        });
        injectMobileButton();

        // ── Preview ───────────────────────────────────────────────────────────
        document.getElementById('preview-btn')?.addEventListener('click', () => {
            window.open(`/pages/${SLUG}/`, '_blank');
        });

        // ── Autosave ──────────────────────────────────────────────────────────
        checkLocalAutosave();
        startAutosave();

        state.on('componentAdded',   markUnsaved);
        state.on('componentRemoved', markUnsaved);
        state.on('componentUpdated', markUnsaved);

        window.addEventListener('beforeunload', (e) => {
            if (hasUnsavedChanges || (mobileEditor && mobileEditor.active)) {
                autosaveLocal();
                e.preventDefault();
                e.returnValue = 'Modifications non sauvegardées. Quitter quand même ?';
                return e.returnValue;
            }
        });

        console.log('✅ Éditeur initialisé');
    } catch (error) {
        console.error('❌ Erreur initialisation:', error);
        alert('Erreur lors du chargement de l\'éditeur. Veuillez recharger la page.');
    }
}

// ── Bouton mobile ─────────────────────────────────────────────────────────────

function injectMobileButton() {
    const saveBtn = document.getElementById('save-btn');
    if (!saveBtn) return;

    const btn = document.createElement('button');
    btn.id        = 'mobile-design-btn';
    btn.title     = 'Passer en mode design mobile';
    btn.innerHTML = '<span class="btn-label">📱 Design mobile</span>';
    btn.style.cssText = [
        'display:block', 'width:100%', 'margin-top:8px', 'padding:10px',
        'background:#2a2a2a', 'border:1px solid #444', 'color:#e0e0e0',
        'border-radius:5px', 'cursor:pointer', 'font-size:13px', 'font-weight:bold',
        'text-align:left', 'transition:background 0.2s,border-color 0.2s'
    ].join(';');

    btn.addEventListener('mouseenter', () => { if (!btn.classList.contains('active')) btn.style.background = '#333'; });
    btn.addEventListener('mouseleave', () => { if (!btn.classList.contains('active')) btn.style.background = '#2a2a2a'; });

    btn.addEventListener('click', async () => {
        if (state.isEditingTextMode()) {
            alert('Terminez l\'édition en cours avant de changer de mode.');
            return;
        }
        await mobileEditor.toggle(state.getComponents());
    });

    saveBtn.parentNode.insertBefore(btn, saveBtn.nextSibling);
}

// ── Sauvegarde mobile ─────────────────────────────────────────────────────────

async function saveMobileLayout(components) {
    const res = await fetch(`/api/pages/${SLUG}/layout-mobile`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ layout: components })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    console.log(`✅ Layout mobile sauvegardé (${components.length} composants)`);
}

// ── Gestionnaires ─────────────────────────────────────────────────────────────

function handleComponentSelect(componentId) {
    state.setSelectedComponent(componentId);
    propertiesPanel.show(componentId);
    componentsList.update();
    canvas.updateSelection();
}

function handleComponentUpdate(componentId, updates) {
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
    const id   = state.getSelectedComponent();
    if (!id) return;
    const comp = state.getComponent(id);
    const upd  = { ...comp };
    if (direction === 'up')    upd.y = Math.max(0, comp.y - step);
    if (direction === 'down')  upd.y = comp.y + step;
    if (direction === 'left')  upd.x = Math.max(0, comp.x - step);
    if (direction === 'right') upd.x = comp.x + step;
    handleComponentUpdate(id, upd);
}

function handleAddComponent(type, x, y) {
    const component = state.addComponent(type, x, y);
    // Composant ajouté en mode mobile → marqué mobile_only
    if (mobileEditor && mobileEditor.active) {
        state.updateComponent(component.id, { mobile_only: true });
    }
    canvas.renderComponent(component);
    componentsList.update();
    handleComponentSelect(component.id);
}

async function handleSave() {
    // En mode mobile : sauvegarder le layout mobile uniquement
    if (mobileEditor && mobileEditor.active) {
        try {
            await saveMobileLayout(state.getComponents());
            alert('✅ Layout mobile sauvegardé !');
        } catch (e) {
            alert('❌ Erreur lors de la sauvegarde du layout mobile.');
        }
        return;
    }

    // Sauvegarde desktop
    try {
        const components  = state.getComponents();
        const canvasEl    = document.getElementById('canvas-inner') || document.getElementById('canvas');
        const canvasWidth = canvasEl ? canvasEl.offsetWidth : 1400;
        const canvasHeight = canvasEl ? canvasEl.offsetHeight : 1080;
        await API.savePage(SLUG, components, canvasWidth, canvasHeight);
        markSaved();
        alert('✅ Sauvegardé avec succès !');
    } catch (error) {
        console.error('Erreur sauvegarde:', error);
        alert('❌ Erreur lors de la sauvegarde');
    }
}

function handleCopyPage()             { toolbar.showCopyModal(); }
function handleToggleGrid()           { state.toggleSnap(); toolbar.updateGridButton(); }
function handleGridSizeChange(size)   { state.setGridSize(size); }
function handleModeChange(mode)       { state.setMoveMode(mode === 'move'); canvas.updateInteractionMode(); }
function handleApplyProperties(id, p) { handleComponentUpdate(id, p); }
function handleCloseProperties()      { state.setSelectedComponent(null); propertiesPanel.hide(); canvas.updateSelection(); }

// ── Démarrage ─────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', init);

if (typeof window !== 'undefined') {
    window.ArchitectEditor = { state, canvas: () => canvas, mobileEditor: () => mobileEditor };
}

document.getElementById('edit-tags-btn')?.addEventListener('click', async () => {
    const response = await fetch(`/api/pages/${SLUG}`);
    const page     = await response.json();
    const tags     = prompt('Tags (séparés par des virgules):', (page.tags || []).join(', '));
    if (tags !== null) {
        const tagList = tags.split(',').map(t => t.trim()).filter(t => t);
        await fetch(`/api/pages/${SLUG}/tags`, {
            method:  'PUT',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ tags: tagList })
        });
        alert('✅ Tags sauvegardés !');
    }
});