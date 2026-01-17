// ui/components-list.js - Liste des composants dans l'onglet

export class ComponentsList {
    constructor(state, options) {
        this.state = state;
        this.listElement = options.listElement;
        this.onComponentSelect = options.onComponentSelect;

        this.sortBy = 'z-index'; // 'z-index', 'type', 'position'
        this.sortOrder = 'desc'; // 'asc', 'desc'

        this.init();
    }

    init() {
        this.setupStateListeners();
        this.update();
    }

    /**
     * Écouter les changements d'état
     */
    setupStateListeners() {
        this.state.on('componentAdded', () => this.update());
        this.state.on('componentRemoved', () => this.update());
        this.state.on('componentUpdated', () => this.update());
        this.state.on('selectionChange', () => this.update());
        this.state.on('zIndexChanged', () => this.update());
    }

    /**
     * Mettre à jour la liste
     */
    update() {
        if (!this.listElement) return;

        const components = this.getSortedComponents();
        const selectedId = this.state.getSelectedComponent();

        if (components.length === 0) {
            this.showEmptyState();
            return;
        }

        let html = this.renderHeader(components.length);
        html += '<div class="components-items">';

        components.forEach((comp, index) => {
            html += this.renderComponentItem(comp, index, selectedId);
        });

        html += '</div>';

        this.listElement.innerHTML = html;
        this.attachEvents();
    }

    /**
     * Afficher l'état vide
     */
    showEmptyState() {
        this.listElement.innerHTML = `
            <div style="color: #666; padding: 20px; text-align: center;">
                <p style="font-size: 14px; margin-bottom: 10px;">Aucun composant</p>
                <p style="font-size: 12px;">Ajoutez des composants depuis l'onglet "Ajouter"</p>
            </div>
        `;
    }

    /**
     * Rendre l'en-tête avec options de tri
     */
    renderHeader(count) {
        return `
            <div class="list-header" style="margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #333;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <strong style="color: #4a9eff; font-size: 14px;">${count} composant${count > 1 ? 's' : ''}</strong>
                    <button id="refresh-list-btn" style="background: none; border: none; color: #999; cursor: pointer; font-size: 16px;" title="Rafraîchir">
                        🔄
                    </button>
                </div>
                <div style="display: flex; gap: 5px;">
                    <select id="sort-by" style="flex: 1; padding: 5px; background: #333; border: 1px solid #444; color: #e0e0e0; border-radius: 3px; font-size: 11px; cursor: pointer;">
                        <option value="z-index" ${this.sortBy === 'z-index' ? 'selected' : ''}>Par Z-Index</option>
                        <option value="type" ${this.sortBy === 'type' ? 'selected' : ''}>Par Type</option>
                        <option value="position" ${this.sortBy === 'position' ? 'selected' : ''}>Par Position</option>
                    </select>
                    <button id="sort-order-btn" style="padding: 5px 10px; background: #333; border: 1px solid #444; color: #e0e0e0; border-radius: 3px; font-size: 11px; cursor: pointer;" title="${this.sortOrder === 'desc' ? 'Décroissant' : 'Croissant'}">
                        ${this.sortOrder === 'desc' ? '↓' : '↑'}
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Rendre un élément de composant
     */
    renderComponentItem(comp, index, selectedId) {
        const isSelected = comp.id === selectedId;
        const icon = this.getComponentIcon(comp.type);
        const typeLabel = this.getComponentTypeLabel(comp.type);

        return `
            <div class="component-item ${isSelected ? 'selected' : ''}" 
                 data-component-id="${comp.id}"
                 style="
                     padding: 10px;
                     background: ${isSelected ? '#4a9eff' : '#333'};
                     border: 1px solid ${isSelected ? '#4a9eff' : '#444'};
                     border-radius: 5px;
                     margin-bottom: 8px;
                     cursor: pointer;
                     transition: all 0.2s;
                 "
                 onmouseover="this.style.background='${isSelected ? '#4a9eff' : '#404040'}'"
                 onmouseout="this.style.background='${isSelected ? '#4a9eff' : '#333'}'"
            >
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="flex: 1;">
                        <div class="component-item-name" style="font-size: 13px; font-weight: bold; color: ${isSelected ? 'white' : '#e0e0e0'}; margin-bottom: 3px;">
                            ${icon} ${typeLabel}
                        </div>
                        <div class="component-item-type" style="font-size: 11px; color: ${isSelected ? 'rgba(255,255,255,0.8)' : '#999'};">
                            ${comp.x}, ${comp.y} • ${comp.w}×${comp.h}
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 3px;">
                        <span style="font-size: 11px; color: ${isSelected ? 'rgba(255,255,255,0.8)' : '#666'};">Z: ${comp.z || 0}</span>
                        <span style="font-size: 10px; color: ${isSelected ? 'rgba(255,255,255,0.6)' : '#555'};">#${index + 1}</span>
                    </div>
                </div>
                <div class="component-item-actions" style="margin-top: 8px; padding-top: 8px; border-top: 1px solid ${isSelected ? 'rgba(255,255,255,0.3)' : '#444'}; display: flex; gap: 5px;">
                    <button class="item-action-btn scroll-to-btn" data-component-id="${comp.id}" style="flex: 1; padding: 4px 8px; background: ${isSelected ? 'rgba(255,255,255,0.2)' : '#2a2a2a'}; border: none; color: ${isSelected ? 'white' : '#e0e0e0'}; border-radius: 3px; font-size: 10px; cursor: pointer;" title="Centrer">
                        🎯 Voir
                    </button>
                    <button class="item-action-btn duplicate-btn" data-component-id="${comp.id}" style="flex: 1; padding: 4px 8px; background: ${isSelected ? 'rgba(255,255,255,0.2)' : '#2a2a2a'}; border: none; color: ${isSelected ? 'white' : '#e0e0e0'}; border-radius: 3px; font-size: 10px; cursor: pointer;" title="Dupliquer">
                        📋
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Attacher les événements
     */
    attachEvents() {
        // Clic sur un composant
        const items = this.listElement.querySelectorAll('.component-item');
        items.forEach(item => {
            item.addEventListener('click', (e) => {
                // Ne pas déclencher si on clique sur un bouton d'action
                if (e.target.classList.contains('item-action-btn')) return;

                const componentId = item.dataset.componentId;
                if (this.onComponentSelect) {
                    this.onComponentSelect(componentId);
                }
            });
        });

        // Boutons de scroll
        const scrollBtns = this.listElement.querySelectorAll('.scroll-to-btn');
        scrollBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const componentId = btn.dataset.componentId;
                this.scrollToComponent(componentId);
            });
        });

        // Boutons de duplication
        const duplicateBtns = this.listElement.querySelectorAll('.duplicate-btn');
        duplicateBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const componentId = btn.dataset.componentId;
                this.duplicateComponent(componentId);
            });
        });

        // Select de tri
        const sortBySelect = this.listElement.querySelector('#sort-by');
        if (sortBySelect) {
            sortBySelect.addEventListener('change', (e) => {
                this.sortBy = e.target.value;
                this.update();
            });
        }

        // Bouton ordre de tri
        const sortOrderBtn = this.listElement.querySelector('#sort-order-btn');
        if (sortOrderBtn) {
            sortOrderBtn.addEventListener('click', () => {
                this.sortOrder = this.sortOrder === 'desc' ? 'asc' : 'desc';
                this.update();
            });
        }

        // Bouton rafraîchir
        const refreshBtn = this.listElement.querySelector('#refresh-list-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.update();
            });
        }
    }

    /**
     * Scroller vers un composant sur le canvas
     */
    scrollToComponent(componentId) {
        const element = document.getElementById(componentId);
        if (element) {
            element.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });

            // Flash pour attirer l'attention
            element.style.animation = 'flash 0.5s';
            setTimeout(() => {
                element.style.animation = '';
            }, 500);
        }
    }

    /**
     * Dupliquer un composant
     */
    duplicateComponent(componentId) {
        const component = this.state.getComponent(componentId);
        if (!component) return;

        const newComponent = {
            ...component,
            id: `comp-${Date.now()}`,
            x: component.x + 20,
            y: component.y + 20,
            z: (component.z || 0) + 1
        };

        this.state.components.push(newComponent);
        this.state.emit('componentAdded', newComponent);

        // Sélectionner le nouveau composant
        if (this.onComponentSelect) {
            this.onComponentSelect(newComponent.id);
        }
    }

    /**
     * Obtenir les composants triés
     */
    getSortedComponents() {
        const components = [...this.state.getComponents()];

        components.sort((a, b) => {
            let valueA, valueB;

            switch (this.sortBy) {
                case 'z-index':
                    valueA = a.z || 0;
                    valueB = b.z || 0;
                    break;

                case 'type':
                    valueA = a.type;
                    valueB = b.type;
                    break;

                case 'position':
                    valueA = a.y * 10000 + a.x;
                    valueB = b.y * 10000 + b.x;
                    break;

                default:
                    return 0;
            }

            if (this.sortOrder === 'desc') {
                return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
            } else {
                return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
            }
        });

        return components;
    }

    /**
     * Icône selon le type
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
     * Label selon le type
     */
    getComponentTypeLabel(type) {
        const labels = {
            text: 'Texte',
            image: 'Image',
            gallery: 'Galerie',
            video: 'Vidéo',
            youtube: 'YouTube',
            shape: 'Forme',
            table: 'Tableau',
            separator: 'Séparateur'
        };

        return labels[type] || type;
    }

    /**
     * Filtrer les composants (pour recherche future)
     */
    filter(searchTerm) {
        const components = this.state.getComponents();
        return components.filter(comp => {
            const searchLower = searchTerm.toLowerCase();
            return (
                comp.type.toLowerCase().includes(searchLower) ||
                comp.id.toLowerCase().includes(searchLower) ||
                (comp.content && comp.content.toLowerCase().includes(searchLower))
            );
        });
    }

    /**
     * Exporter la liste en JSON
     */
    exportList() {
        const components = this.getSortedComponents();
        const data = components.map((comp, index) => ({
            index: index + 1,
            type: comp.type,
            id: comp.id,
            position: { x: comp.x, y: comp.y },
            size: { w: comp.w, h: comp.h },
            zIndex: comp.z || 0
        }));

        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'components-list.json';
        a.click();
        
        URL.revokeObjectURL(url);
    }
}