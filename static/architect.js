let components = INITIAL_LAYOUT || [];
let selectedComponent = null;
let gridSize = 10;
let snapEnabled = true;
let componentCounter = components.length;
let quillInstances = {};
let isEditingText = false;
let moveMode = false; // Mode déplacement

const canvas = document.getElementById('canvas-inner') || document.getElementById('canvas');
const propsPanel = document.getElementById('properties-panel');
const propsContent = document.getElementById('properties-content');

// Initialisation
function init() {
    components.forEach(comp => renderComponent(comp));
    setupToolbar();
    setupInteractions();
    loadPages();
    adjustCanvasHeight();
    updateComponentsList();
}

// Rendu d'un composant sur le canvas
function renderComponent(comp) {
    const el = document.createElement('div');
    el.className = 'component';
    el.id = comp.id;
    el.dataset.type = comp.type;
    el.style.left = comp.x + 'px';
    el.style.top = comp.y + 'px';
    el.style.width = comp.w + 'px';
    el.style.height = comp.h + 'px';
    el.style.zIndex = comp.z || 0;
    
    if (comp.custom_css) {
        el.style.cssText += comp.custom_css;
    }
    
    // Contenu selon le type
    switch(comp.type) {
        case 'text':
            el.innerHTML = `<div class="text-content" id="text-${comp.id}">${comp.content || 'Double-cliquez pour éditer'}</div>`;
            break;
        case 'image':
            el.innerHTML = `<img src="${comp.image_path || ''}" alt="Image">`;
            break;
        case 'gallery':
            const images = comp.images || [];
            el.innerHTML = `
                <div class="gallery-editor">
                    <button class="gallery-manage-btn">📷 Gérer les images (${images.length})</button>
                    ${images.length > 0 ? `<img src="${images[0]}" style="width:100%; height:100%; object-fit:cover;">` : '<p style="text-align:center; color:#666;">Aucune image</p>'}
                </div>
            `;
            break;
        case 'video':
            el.innerHTML = comp.video_path ? 
                `<video src="${comp.video_path}" controls style="width:100%; height:100%;"></video>` :
                '<p style="text-align:center; color:#666;">Aucune vidéo</p>';
            break;
        case 'youtube':
            const videoId = comp.youtube_id || '';
            el.innerHTML = videoId ? 
                `<iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="width:100%; height:100%;"></iframe>` :
                '<p style="text-align:center; color:#666;">Aucune vidéo YouTube</p>';
            break;
        case 'shape':
            el.innerHTML = `<div class="shape-fill" style="background:${comp.bg_color || '#333'};width:100%;height:100%;"></div>`;
            break;
        case 'table':
            el.innerHTML = `<div class="table-wrapper" contenteditable="true">${comp.content || '<table border="1" style="width:100%; border-collapse:collapse;"><tr><th>Colonne 1</th><th>Colonne 2</th></tr><tr><td>Données</td><td>Données</td></tr></table>'}</div>`;
            break;
        case 'separator':
            el.innerHTML = '<hr>';
            break;
    }
    
    // Contrôles
    const controls = document.createElement('div');
    controls.className = 'component-controls';
    controls.innerHTML = `
        <button class="ctrl-btn move" title="Déplacer">✋</button>
        <button class="ctrl-btn z-up" title="Monter">▲</button>
        <button class="ctrl-btn z-down" title="Descendre">▼</button>
        <button class="ctrl-btn delete" title="Supprimer">🗑️</button>
    `;
    el.appendChild(controls);
    
    canvas.appendChild(el);
    makeInteractive(el);
    updateControlsPosition(el, comp.y);
    updateComponentsList();
}

function adjustCanvasHeight() {
    const canvasInner = document.getElementById('canvas-inner') || document.getElementById('canvas');
    if (!canvasInner) return;
    
    let maxY = 0;
    
    components.forEach(comp => {
        const bottom = comp.y + comp.h;
        if (bottom > maxY) maxY = bottom;
    });
    
    canvasInner.style.minHeight = (maxY + 300) + 'px';
}

function updateControlsPosition(el, y) {
    const controls = el.querySelector('.component-controls');
    if (!controls) return;
    
    if (y < 50) {
        controls.style.top = 'auto';
        controls.style.bottom = '-40px';
    } else {
        controls.style.top = '-40px';
        controls.style.bottom = 'auto';
    }
}

// Rendre un élément déplaçable et redimensionnable
function makeInteractive(el) {
    let isDragging = false;
    
    const interactable = interact(el)
        .draggable({
            listeners: {
                start(e) {
                    if (isEditingText) {
                        console.log('Drag bloqué : édition en cours');
                        return false;
                    }
                    isDragging = true;
                    el.classList.add('is-dragging');
                },
                move(e) {
                    if (isEditingText) return;
                    
                    const comp = getComponentById(e.target.id);
                    if (!comp) return;
                    
                    let x = comp.x + e.dx;
                    let y = comp.y + e.dy;
                    
                    if (snapEnabled) {
                        x = Math.round(x / gridSize) * gridSize;
                        y = Math.round(y / gridSize) * gridSize;
                    }
                    
                    comp.x = Math.max(0, x);
                    comp.y = Math.max(0, y);
                    e.target.style.left = comp.x + 'px';
                    e.target.style.top = comp.y + 'px';
                    
                    updateControlsPosition(e.target, comp.y);
                    adjustCanvasHeight();
                },
                end(e) {
                    setTimeout(() => { 
                        isDragging = false;
                        el.classList.remove('is-dragging');
                    }, 50);
                }
            }
        })
        .resizable({
            edges: { left: true, right: true, bottom: true, top: true },
            enabled: !moveMode, // Désactiver resize en mode déplacement
            listeners: {
                start(e) {
                    if (isEditingText || moveMode) return false;
                },
                move(e) {
                    if (isEditingText || moveMode) return;
                    
                    const comp = getComponentById(e.target.id);
                    if (!comp) return;
                    
                    let x = comp.x + e.deltaRect.left;
                    let y = comp.y + e.deltaRect.top;
                    let w = e.rect.width;
                    let h = e.rect.height;
                    
                    if (snapEnabled) {
                        x = Math.round(x / gridSize) * gridSize;
                        y = Math.round(y / gridSize) * gridSize;
                        w = Math.round(w / gridSize) * gridSize;
                        h = Math.round(h / gridSize) * gridSize;
                    }
                    
                    comp.x = Math.max(0, x);
                    comp.y = Math.max(0, y);
                    comp.w = Math.max(50, w);
                    comp.h = Math.max(30, h);
                    
                    e.target.style.left = comp.x + 'px';
                    e.target.style.top = comp.y + 'px';
                    e.target.style.width = comp.w + 'px';
                    e.target.style.height = comp.h + 'px';
                    
                    adjustCanvasHeight();
                }
            }
        });
    
    // Stocker la référence interact pour pouvoir la modifier
    el.interactInstance = interactable;
    
    el.addEventListener('click', (e) => {
        // Ne pas sélectionner si on est en mode édition
        if (isEditingText) {
            e.stopPropagation();
            return;
        }
        
        if (!e.target.classList.contains('ctrl-btn') && !isDragging) {
            selectComponent(el.id);
        }
    });
    
    // Double-clic pour édition texte
    el.addEventListener('dblclick', (e) => {
        if (e.target.classList.contains('ctrl-btn')) return;
        
        const comp = getComponentById(el.id);
        if (comp.type === 'text') {
            initQuillEditor(comp.id);
        } else if (comp.type === 'table') {
            initTableEditor(comp.id);
        } else if (comp.type === 'image') {
            showImageReplaceModal(comp.id);
        } else if (comp.type === 'video') {
            showVideoManager(comp.id);
        } else if (comp.type === 'gallery') {
            showGalleryManager(comp.id);
        }
    });
    
    // Gestionnaire pour le bouton de gestion de galerie
    const compData = getComponentById(el.id);
    if (compData && compData.type === 'gallery') {
        setTimeout(() => {
            const manageBtn = el.querySelector('.gallery-manage-btn');
            if (manageBtn) {
                manageBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    showGalleryManager(compData.id);
                });
            }
        }, 100);
    }
    
    // Contrôles
    el.querySelector('.z-up').addEventListener('click', (e) => {
        e.stopPropagation();
        changeZIndex(el.id, 1);
    });
    el.querySelector('.z-down').addEventListener('click', (e) => {
        e.stopPropagation();
        changeZIndex(el.id, -1);
    });
    el.querySelector('.delete').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteComponent(el.id);
    });
}

// Initialiser l'éditeur Quill pour le texte riche
function initQuillEditor(compId) {
    const comp = getComponentById(compId);
    const textEl = document.getElementById(`text-${compId}`);
    const componentEl = document.getElementById(compId);
    
    if (quillInstances[compId]) return;
    
    isEditingText = true;
    interact(componentEl).draggable(false).resizable(false);
    
    // Sauvegarder le contenu original
    const originalContent = comp.content || '';
    
    // Afficher le panneau propriétés avec la toolbar Quill
    propsPanel.classList.add('active');
    propsContent.innerHTML = `
        <div class="text-editor-panel">
            <h3 style="color: #4a9eff; margin-bottom: 20px;">📝 Édition de texte</h3>
            
            <div class="quill-toolbar-panel" id="toolbar-${compId}">
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
                        <button class="ql-link" title="Lien externe">🔗 Externe</button>
                        <button class="ql-link-page" title="Lien page interne">📄 Interne</button>
                    </div>
                </div>
                
                <div class="toolbar-section">
                    <button class="ql-clean" style="width: 100%; background: #d9534f;">Supprimer mise en forme</button>
                </div>
            </div>
            
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #333;">
                <button id="finish-edit-btn" style="width: 100%; padding: 12px; background: #4a9eff; color: white; border: none; border-radius: 5px; font-weight: bold; cursor: pointer; font-size: 14px;">
                    ✓ Terminer l'édition
                </button>
                <p style="color: #666; font-size: 12px; margin-top: 10px; text-align: center;">
                    Cliquez pour sauvegarder et revenir aux propriétés
                </p>
            </div>
        </div>
    `;
    
    // Initialiser Quill
    const quill = new Quill(textEl, {
        theme: 'snow',
        modules: { 
            toolbar: `#toolbar-${compId}`
        }
    });
    
    // Restaurer le contenu
    if (originalContent) {
        quill.root.innerHTML = originalContent;
    }
    
    quillInstances[compId] = quill;
    
    const finishEditing = () => {
        // Sauvegarder le contenu
        comp.content = quill.root.innerHTML;
        console.log('Contenu sauvegardé:', comp.content);
        
        // Restaurer le contenu dans le div original
        textEl.innerHTML = comp.content;
        
        // Nettoyer
        delete quillInstances[compId];
        isEditingText = false;
        interact(componentEl).draggable(true).resizable(true);
        
        // Revenir aux propriétés normales
        showProperties(compId);
    };
    
    // Bouton Terminer
    document.getElementById('finish-edit-btn').addEventListener('click', finishEditing);
    
    // Bouton lien page personnalisé
    const linkPageBtn = propsContent.querySelector('.ql-link-page');
    if (linkPageBtn) {
        linkPageBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showPageLinkModal(quill);
        });
    }
    
    // Bouton clean personnalisé (car Quill écrase le texte)
    const cleanBtn = propsContent.querySelector('.custom-clean-btn');
    if (cleanBtn) {
        cleanBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const selection = quill.getSelection();
            if (selection) {
                quill.removeFormat(selection.index, selection.length);
            }
        });
    }
    
    // Menu contextuel (clic droit)
    textEl.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const selection = quill.getSelection();
        if (selection && selection.length > 0) {
            showContextMenu(e.pageX, e.pageY, quill);
        }
    });
}

// Menu contextuel
function showContextMenu(x, y, quill) {
    // Supprimer l'ancien menu s'il existe
    const oldMenu = document.querySelector('.context-menu');
    if (oldMenu) oldMenu.remove();
    
    const contextMenu = document.createElement('div');
    contextMenu.className = 'context-menu';
    contextMenu.innerHTML = `
        <button data-action="bold"><strong>B</strong> Gras</button>
        <button data-action="italic"><em>I</em> Italique</button>
        <button data-action="underline"><u>U</u> Souligné</button>
        <hr style="margin: 5px 0; border-color: #444;">
        <button data-action="link">🔗 Lien externe</button>
        <button data-action="link-page">📄 Lien vers page</button>
    `;
    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
    document.body.appendChild(contextMenu);
    
    contextMenu.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            const selection = quill.getSelection();
            if (!selection) return;
            
            switch(action) {
                case 'bold':
                    quill.format('bold', true);
                    break;
                case 'italic':
                    quill.format('italic', true);
                    break;
                case 'underline':
                    quill.format('underline', true);
                    break;
                case 'link':
                    const url = prompt('Entrez l\'URL:');
                    if (url) quill.format('link', url);
                    break;
                case 'link-page':
                    showPageLinkModal(quill);
                    break;
            }
            contextMenu.remove();
        });
    });
    
    // Fermer le menu au clic ailleurs
    setTimeout(() => {
        const closeMenu = () => {
            contextMenu.remove();
            document.removeEventListener('click', closeMenu);
        };
        document.addEventListener('click', closeMenu);
    }, 100);
}

// Toolbar - Ajout de composants
function setupToolbar() {
    // Gestion des onglets
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
        });
    });
    
    // Drag & Drop des composants
    document.querySelectorAll('.tool-btn').forEach(btn => {
        // Clic simple = ajouter en haut à gauche
        btn.addEventListener('click', () => {
            const type = btn.dataset.type;
            addComponent(type, 50, 50);
        });
        
        // Drag start
        btn.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('componentType', btn.dataset.type);
            e.dataTransfer.effectAllowed = 'copy';
        });
    });
    
    // Drop sur le canvas
    const canvasEl = document.getElementById('canvas');
    canvasEl.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    });
    
    canvasEl.addEventListener('drop', (e) => {
        e.preventDefault();
        const type = e.dataTransfer.getData('componentType');
        if (type) {
            const rect = canvasEl.getBoundingClientRect();
            const x = e.clientX - rect.left + canvasEl.scrollLeft;
            const y = e.clientY - rect.top + canvasEl.scrollTop;
            addComponent(type, x, y);
        }
    });
    
    document.getElementById('save-btn').addEventListener('click', saveLayout);
    document.getElementById('copy-page-btn').addEventListener('click', showCopyModal);
    document.getElementById('grid-toggle').addEventListener('click', toggleGrid);
    document.getElementById('grid-size').addEventListener('change', (e) => {
        gridSize = parseInt(e.target.value);
    });
    
    document.getElementById('close-props').addEventListener('click', () => {
        propsPanel.classList.remove('active');
        if (selectedComponent) {
            document.getElementById(selectedComponent).classList.remove('selected');
            selectedComponent = null;
        }
    });
}

function addComponent(type, x = 50, y = 50) {
    const comp = {
        id: `comp-${++componentCounter}`,
        type: type,
        x: x,
        y: y,
        w: type === 'separator' ? 800 : (type === 'youtube' || type === 'video' || type === 'gallery') ? 560 : 300,
        h: type === 'separator' ? 2 : (type === 'youtube' || type === 'video' || type === 'gallery') ? 315 : 200,
        z: components.length,
        content: '',
        custom_css: '',
        custom_js: ''
    };
    
    if (type === 'image') {
        showImageModal(comp);
    } else if (type === 'video') {
        showVideoModal(comp);
    } else if (type === 'youtube') {
        showYoutubeModal(comp);
    } else if (type === 'gallery') {
        comp.images = [];
        components.push(comp);
        renderComponent(comp);
        adjustCanvasHeight();
        updateComponentsList();
    } else {
        components.push(comp);
        renderComponent(comp);
        adjustCanvasHeight();
        updateComponentsList();
    }
}

// Liste des composants
function updateComponentsList() {
    const list = document.getElementById('components-list');
    if (!list) return;
    
    list.innerHTML = '';
    
    if (components.length === 0) {
        list.innerHTML = '<p style="color: #666; padding: 10px; text-align: center;">Aucun composant</p>';
        return;
    }
    
    // Trier par z-index
    const sorted = [...components].sort((a, b) => (b.z || 0) - (a.z || 0));
    
    sorted.forEach((comp, index) => {
        const item = document.createElement('div');
        item.className = 'component-item';
        if (selectedComponent === comp.id) {
            item.classList.add('selected');
        }
        
        const typeIcons = {
            text: '📝',
            image: '🖼️',
            shape: '⬛',
            table: '📊',
            separator: '➖'
        };
        
        item.innerHTML = `
            <div>
                <div class="component-item-name">${typeIcons[comp.type] || '📄'} ${comp.type}</div>
                <div class="component-item-type">Position: ${comp.x}, ${comp.y}</div>
            </div>
            <div style="font-size: 12px; color: #999;">${index + 1}</div>
        `;
        
        item.addEventListener('click', () => {
            selectComponent(comp.id);
            // Scroll vers le composant
            const el = document.getElementById(comp.id);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
        
        list.appendChild(item);
    });
}

function selectComponent(id) {
    if (selectedComponent) {
        const prev = document.getElementById(selectedComponent);
        if (prev) prev.classList.remove('selected');
    }
    
    selectedComponent = id;
    const el = document.getElementById(id);
    el.classList.add('selected');
    showProperties(id);
    updateComponentsList();
}

function showProperties(id) {
    const comp = getComponentById(id);
    propsPanel.classList.add('active');
    
    propsContent.innerHTML = `
        <div class="prop-group">
            <label>Position X: <input type="number" id="prop-x" value="${comp.x}"></label>
            <label>Position Y: <input type="number" id="prop-y" value="${comp.y}"></label>
        </div>
        <div class="prop-group">
            <label>Largeur: <input type="number" id="prop-w" value="${comp.w}"></label>
            <label>Hauteur: <input type="number" id="prop-h" value="${comp.h}"></label>
        </div>
        <div class="prop-group">
            <label>Z-Index: <input type="number" id="prop-z" value="${comp.z || 0}"></label>
        </div>
        ${comp.type === 'shape' ? `
            <div class="prop-group">
                <label>Couleur: <input type="color" id="prop-color" value="${comp.bg_color || '#333333'}"></label>
            </div>
        ` : ''}
        <div class="prop-group">
            <label>CSS Personnalisé:</label>
            <textarea id="prop-css" rows="3">${comp.custom_css || ''}</textarea>
        </div>
        <div class="prop-group">
            <label>JS Personnalisé:</label>
            <textarea id="prop-js" rows="3">${comp.custom_js || ''}</textarea>
        </div>
        <button id="apply-props">Appliquer</button>
    `;
    
    document.getElementById('apply-props').addEventListener('click', () => applyProperties(id));
}

function applyProperties(id) {
    const comp = getComponentById(id);
    const el = document.getElementById(id);
    
    comp.x = parseInt(document.getElementById('prop-x').value);
    comp.y = parseInt(document.getElementById('prop-y').value);
    comp.w = parseInt(document.getElementById('prop-w').value);
    comp.h = parseInt(document.getElementById('prop-h').value);
    comp.z = parseInt(document.getElementById('prop-z').value);
    comp.custom_css = document.getElementById('prop-css').value;
    comp.custom_js = document.getElementById('prop-js').value;
    
    if (comp.type === 'shape') {
        comp.bg_color = document.getElementById('prop-color').value;
        el.querySelector('.shape-fill').style.background = comp.bg_color;
    }
    
    el.style.left = comp.x + 'px';
    el.style.top = comp.y + 'px';
    el.style.width = comp.w + 'px';
    el.style.height = comp.h + 'px';
    el.style.zIndex = comp.z;
    
    adjustCanvasHeight();
}

function changeZIndex(id, delta) {
    const comp = getComponentById(id);
    comp.z = (comp.z || 0) + delta;
    document.getElementById(id).style.zIndex = comp.z;
}

function deleteComponent(id) {
    if (confirm('Supprimer ce composant ?')) {
        components = components.filter(c => c.id !== id);
        document.getElementById(id).remove();
        if (selectedComponent === id) {
            propsPanel.classList.remove('active');
            selectedComponent = null;
        }
        adjustCanvasHeight();
        updateComponentsList();
    }
}

function getComponentById(id) {
    return components.find(c => c.id === id);
}

// Modal pour lien vers page
function showPageLinkModal(quill) {
    const modal = document.getElementById('link-modal');
    const input = document.getElementById('link-url');
    const results = document.getElementById('page-search-results');
    
    const selection = quill.getSelection();
    if (!selection || selection.length === 0) {
        alert('⚠️ Veuillez d\'abord SÉLECTIONNER du texte avant d\'ajouter un lien');
        return;
    }
    
    modal.style.display = 'flex';
    input.value = '';
    displayPageResults('', results, quill, modal, selection);
    
    input.addEventListener('input', (e) => {
        displayPageResults(e.target.value.toLowerCase(), results, quill, modal, selection);
    });
    
    document.getElementById('add-link-btn').onclick = () => {
        const url = input.value;
        if (url && selection) {
            quill.formatText(selection.index, selection.length, 'link', url);
        }
        modal.style.display = 'none';
    };
    
    modal.querySelector('.cancel-btn').onclick = () => modal.style.display = 'none';
}

function displayPageResults(term, resultsContainer, quill, modal, selection) {
    resultsContainer.innerHTML = '';
    
    let matches = allPages;
    if (term.length > 0) {
        matches = allPages.filter(p => 
            p.title.toLowerCase().includes(term) || 
            p.slug.toLowerCase().includes(term)
        );
    }
    
    if (matches.length === 0) {
        resultsContainer.innerHTML = '<div class="page-result">Aucune page trouvée</div>';
        return;
    }
    
    matches.forEach(page => {
        const div = document.createElement('div');
        div.className = 'page-result';
        div.innerHTML = `<strong>${page.title}</strong><br><small style="color: #666;">${page.slug}</small>`;
        div.onclick = () => {
            const linkUrl = `../${page.slug}/`;
            quill.formatText(selection.index, selection.length, 'link', linkUrl);
            modal.style.display = 'none';
        };
        resultsContainer.appendChild(div);
    });
}

function toggleGrid() {
    snapEnabled = !snapEnabled;
    document.getElementById('grid-toggle').textContent = `🔲 Grille (${snapEnabled ? 'ON' : 'OFF'})`;
}

// Upload d'image
function showImageModal(comp) {
    const modal = document.getElementById('image-modal');
    modal.style.display = 'flex';
    
    document.getElementById('upload-image-btn').onclick = async () => {
        const file = document.getElementById('image-file').files[0];
        if (!file) return alert('Sélectionnez une image');
        
        const formData = new FormData();
        formData.append('file', file);
        
        const res = await fetch(`/api/upload/${SLUG}`, {
            method: 'POST',
            body: formData
        });
        
        const data = await res.json();
        comp.image_path = data.path;
        components.push(comp);
        renderComponent(comp);
        adjustCanvasHeight();
        modal.style.display = 'none';
    };
    
    modal.querySelector('.cancel-btn').onclick = () => modal.style.display = 'none';
}

// Upload de vidéo
function showVideoModal(comp) {
    const modal = document.getElementById('video-modal');
    modal.style.display = 'flex';
    
    document.getElementById('upload-video-btn').onclick = async () => {
        const file = document.getElementById('video-file').files[0];
        if (!file) return alert('Sélectionnez une vidéo');
        
        const formData = new FormData();
        formData.append('file', file);
        
        const res = await fetch(`/api/upload-video/${SLUG}`, {
            method: 'POST',
            body: formData
        });
        
        const data = await res.json();
        comp.video_path = data.path;
        components.push(comp);
        renderComponent(comp);
        adjustCanvasHeight();
        modal.style.display = 'none';
    };
    
    modal.querySelector('.cancel-btn').onclick = () => modal.style.display = 'none';
}

// YouTube
function showYoutubeModal(comp) {
    const modal = document.getElementById('youtube-modal');
    modal.style.display = 'flex';
    
    document.getElementById('add-youtube-btn').onclick = () => {
        const url = document.getElementById('youtube-url').value;
        if (!url) return alert('Entrez une URL YouTube');
        
        // Extraire l'ID de la vidéo
        const videoId = extractYoutubeId(url);
        if (!videoId) return alert('URL YouTube invalide');
        
        comp.youtube_id = videoId;
        components.push(comp);
        renderComponent(comp);
        adjustCanvasHeight();
        modal.style.display = 'none';
    };
    
    modal.querySelector('.cancel-btn').onclick = () => modal.style.display = 'none';
}

function extractYoutubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

// Galerie
function showGalleryManagerModal(compId) {
    const comp = getComponentById(compId);
    const modal = document.getElementById('gallery-modal');
    modal.style.display = 'flex';
    
    document.getElementById('upload-gallery-btn').onclick = async () => {
        const files = document.getElementById('gallery-files').files;
        if (!files.length) return alert('Sélectionnez au moins une image');
        
        const uploadedPaths = [];
        
        for (let file of files) {
            const formData = new FormData();
            formData.append('file', file);
            
            const res = await fetch(`/api/upload/${SLUG}`, {
                method: 'POST',
                body: formData
            });
            
            const data = await res.json();
            uploadedPaths.push(data.path);
        }
        
        comp.images = comp.images || [];
        comp.images.push(...uploadedPaths);
        
        // Re-render le composant
        const el = document.getElementById(compId);
        el.querySelector('.gallery-editor').innerHTML = `
            <button class="gallery-manage-btn">📷 Gérer les images (${comp.images.length})</button>
            ${comp.images.length > 0 ? `<img src="${comp.images[0]}" style="width:100%; height:100%; object-fit:cover;">` : '<p style="text-align:center; color:#666;">Aucune image</p>'}
        `;
        
        // Ré-attacher l'événement
        el.querySelector('.gallery-manage-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            showGalleryManagerModal(compId);
        });
        
        modal.style.display = 'none';
    };
    
    modal.querySelector('.cancel-btn').onclick = () => modal.style.display = 'none';
}

// Sauvegarde
async function saveLayout() {
    const res = await fetch(`/api/pages/${SLUG}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layout: components })
    });
    
    if (res.ok) {
        alert('✅ Sauvegardé avec succès !');
    }
}

// Copy Page
let allPages = [];

async function loadPages() {
    const res = await fetch('/api/pages');
    allPages = await res.json();
}

function showCopyModal() {
    const modal = document.getElementById('copy-modal');
    const select = document.getElementById('source-page-select');
    
    select.innerHTML = allPages
        .filter(p => p.slug !== SLUG)
        .map(p => `<option value="${p.slug}">${p.title}</option>`)
        .join('');
    
    modal.style.display = 'flex';
    
    document.getElementById('confirm-copy-btn').onclick = async () => {
        const source = select.value;
        const res = await fetch(`/api/pages/${SLUG}/copy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source_slug: source })
        });
        
        if (res.ok) location.reload();
    };
    
    modal.querySelector('.cancel-btn').onclick = () => modal.style.display = 'none';
}

function setupInteractions() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Delete' && selectedComponent && !isEditingText) {
            deleteComponent(selectedComponent);
        }
        
        // Déplacement aux flèches
        if (selectedComponent && !isEditingText && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
            const comp = getComponentById(selectedComponent);
            const el = document.getElementById(selectedComponent);
            if (!comp || !el) return;
            
            const step = e.shiftKey ? gridSize : 1;
            
            switch(e.key) {
                case 'ArrowUp': comp.y = Math.max(0, comp.y - step); break;
                case 'ArrowDown': comp.y += step; break;
                case 'ArrowLeft': comp.x = Math.max(0, comp.x - step); break;
                case 'ArrowRight': comp.x += step; break;
            }
            
            el.style.left = comp.x + 'px';
            el.style.top = comp.y + 'px';
            updateControlsPosition(el, comp.y);
            adjustCanvasHeight();
        }
    });
    
    const previewBtn = document.getElementById('preview-btn');
    if (previewBtn) {
        previewBtn.addEventListener('click', () => {
            window.open(`/pages/${SLUG}/`, '_blank');
        });
    }
    
    // Modes de souris
    const normalBtn = document.getElementById('mode-normal');
    const moveBtn = document.getElementById('mode-move');
    
    if (normalBtn && moveBtn) {
        normalBtn.addEventListener('click', () => {
            moveMode = false;
            normalBtn.classList.add('active');
            moveBtn.classList.remove('active');
            // Réactiver le resize
            document.querySelectorAll('.component').forEach(el => {
                if (el.interactInstance) {
                    el.interactInstance.resizable({ enabled: true });
                }
            });
        });
        
        moveBtn.addEventListener('click', () => {
            moveMode = true;
            moveBtn.classList.add('active');
            normalBtn.classList.remove('active');
            // Désactiver le resize
            document.querySelectorAll('.component').forEach(el => {
                if (el.interactInstance) {
                    el.interactInstance.resizable({ enabled: false });
                }
            });
        });
    }
}

// Gestionnaires pour les nouveaux composants
function showImageReplaceModal(compId) {
    const comp = getComponentById(compId);
    const modal = document.getElementById('image-modal');
    modal.style.display = 'flex';
    
    document.getElementById('upload-image-btn').onclick = async () => {
        const file = document.getElementById('image-file').files[0];
        if (!file) return alert('Sélectionnez une image');
        
        const formData = new FormData();
        formData.append('file', file);
        
        const res = await fetch(`/api/upload/${SLUG}`, {
            method: 'POST',
            body: formData
        });
        
        const data = await res.json();
        comp.image_path = data.path;
        
        const el = document.getElementById(compId);
        el.querySelector('img').src = data.path;
        
        modal.style.display = 'none';
    };
    
    modal.querySelector('.cancel-btn').onclick = () => modal.style.display = 'none';
}

function showVideoManager(compId) {
    const comp = getComponentById(compId);
    
    propsPanel.classList.add('active');
    propsContent.innerHTML = `
        <div class="media-manager">
            <h3 style="color: #4a9eff; margin-bottom: 20px;">🎬 Gestion Vidéo</h3>
            
            <div style="margin-bottom: 20px;">
                ${comp.video_path ? `
                    <video src="${comp.video_path}" controls style="width:100%; max-height:200px; margin-bottom:15px;"></video>
                    <p style="color: #666; font-size: 12px;">Vidéo actuelle</p>
                ` : '<p style="color: #666;">Aucune vidéo</p>'}
            </div>
            
            <input type="file" id="replace-video" accept="video/*" style="margin-bottom:15px;">
            <button id="upload-new-video" class="action-btn">Remplacer la vidéo</button>
        </div>
    `;
    
    document.getElementById('upload-new-video').onclick = async () => {
        const file = document.getElementById('replace-video').files[0];
        if (!file) return alert('Sélectionnez une vidéo');
        
        const formData = new FormData();
        formData.append('file', file);
        
        const res = await fetch(`/api/upload-video/${SLUG}`, {
            method: 'POST',
            body: formData
        });
        
        const data = await res.json();
        comp.video_path = data.path;
        
        const el = document.getElementById(compId);
        el.innerHTML = `<video src="${data.path}" controls style="width:100%; height:100%;"></video>`;
        
        showVideoManager(compId);
    };
}

function showGalleryManager(compId) {
    const comp = getComponentById(compId);
    comp.images = comp.images || [];
    
    propsPanel.classList.add('active');
    propsContent.innerHTML = `
        <div class="media-manager">
            <h3 style="color: #4a9eff; margin-bottom: 20px;">🎞️ Gestion Galerie</h3>
            
            <div id="gallery-preview" style="margin-bottom:20px;">
                ${comp.images.length === 0 ? '<p style="color: #666;">Aucune image</p>' : ''}
            </div>
            
            <input type="file" id="add-gallery-images" accept="image/*" multiple style="margin-bottom:15px;">
            <button id="upload-gallery-images" class="action-btn">Ajouter des images</button>
        </div>
    `;
    
    const preview = document.getElementById('gallery-preview');
    comp.images.forEach((img, idx) => {
        const imgDiv = document.createElement('div');
        imgDiv.style.cssText = 'display:flex; align-items:center; gap:10px; margin-bottom:10px; padding:10px; background:#333; border-radius:5px;';
        imgDiv.innerHTML = `
            <img src="${img}" style="width:80px; height:80px; object-fit:cover; border-radius:3px;">
            <span style="flex:1; font-size:12px; color:#999;">Image ${idx + 1}</span>
            <button class="delete-gallery-img" data-index="${idx}" style="padding:5px 10px; background:#d9534f; border:none; color:white; border-radius:3px; cursor:pointer;">Supprimer</button>
        `;
        preview.appendChild(imgDiv);
    });
    
    preview.querySelectorAll('.delete-gallery-img').forEach(btn => {
        btn.addEventListener('click', () => {
            const index = parseInt(btn.dataset.index);
            comp.images.splice(index, 1);
            const el = document.getElementById(compId);
            el.querySelector('.gallery-editor').innerHTML = `
                <button class="gallery-manage-btn">📷 Gérer les images (${comp.images.length})</button>
                ${comp.images.length > 0 ? `<img src="${comp.images[0]}" style="width:100%; height:100%; object-fit:cover;">` : '<p style="text-align:center; color:#666;">Aucune image</p>'}
            `;
            showGalleryManager(compId);
        });
    });
    
    document.getElementById('upload-gallery-images').onclick = async () => {
        const files = document.getElementById('add-gallery-images').files;
        if (!files.length) return alert('Sélectionnez au moins une image');
        
        for (let file of files) {
            const formData = new FormData();
            formData.append('file', file);
            
            const res = await fetch(`/api/upload/${SLUG}`, { method: 'POST', body: formData });
            const data = await res.json();
            comp.images.push(data.path);
        }
        
        const el = document.getElementById(compId);
        el.querySelector('.gallery-editor').innerHTML = `
            <button class="gallery-manage-btn">📷 Gérer les images (${comp.images.length})</button>
            ${comp.images.length > 0 ? `<img src="${comp.images[0]}" style="width:100%; height:100%; object-fit:cover;">` : '<p style="text-align:center; color:#666;">Aucune image</p>'}
        `;
        
        showGalleryManager(compId);
    };
}

function initTableEditor(compId) {
    // À implémenter : éditeur de tableau avec toolbar
    alert('Éditeur de tableau à venir dans la prochaine version');
}

init();