// responsive-layout.js - Gestion par groupes avec compensation

class ResponsiveLayout {
    constructor(options = {}) {
        this.config = {
            // ⚠️ Largeur canonique : doit correspondre à .canvas-inner (editor.css)
            // et .canvas-container (viewer.css) — actuellement 1400px.
            editorCanvasWidth: options.editorCanvasWidth || 1400,
            editorCanvasHeight: options.editorCanvasHeight || 1080,
            
            contentMarginLeft: options.contentMarginLeft || 280,
            contentPadding: options.contentPadding || 40,
            
            breakpoints: {
                mobile: 768,
                tablet: 1024,
                desktop: 1440
            },
            
            minSizes: {
                text: { w: 200, h: 40 },
                image: { w: 100, h: 80 },
                gallery: { w: 200, h: 150 },
                video: { w: 250, h: 150 },
                youtube: { w: 250, h: 150 },
                shape: { w: 80, h: 40 },
                table: { w: 200, h: 100 },
                separator: { w: 80, h: 2 }
            },
            
            overlapThreshold: 0.05, // 5% = superposition
            
            ...options
        };
        
        this.originalLayout = null;
        this.currentBreakpoint = this.detectBreakpoint();
    }
    
    init(components) {
        console.log('🔧 Init avec groupes et compensation');
        
        this.originalLayout = this.deepClone(components);
        this.currentBreakpoint = this.detectBreakpoint();
        
        const availableWidth = this.getAvailableWidth();
        
        console.log(`📐 ${this.config.editorCanvasWidth}px → ${availableWidth}px`);
        
        const responsiveComponents = this.applyResponsive(components, availableWidth);
        this.setupResizeListener();
        
        console.log(`✅ ${responsiveComponents.length} composants`);
        
        return responsiveComponents;
    }
    
    detectBreakpoint() {
        const width = window.innerWidth;
        if (width <= this.config.breakpoints.mobile) return 'mobile';
        if (width <= this.config.breakpoints.tablet) return 'tablet';
        if (width <= this.config.breakpoints.desktop) return 'desktop';
        return 'wide';
    }
    
    getAvailableWidth() {
        const screenWidth = window.innerWidth;
        const bp = this.currentBreakpoint;
        
        if (bp === 'mobile') {
            return screenWidth - (this.config.contentPadding * 2);
        }
        
        // Largeur brute disponible = écran - sidebar - padding
        const raw = screenWidth - this.config.contentMarginLeft - (this.config.contentPadding * 2);
        
        // ✅ FIX : Le canvas est limité à editorCanvasWidth (max-width).
        // Si l'écran est plus grand que le canvas, la largeur disponible est
        // exactement editorCanvasWidth — pas plus. Sans ce cap, le ratio
        // dépasse 1.0 et les composants sont agrandis hors de la page.
        return Math.min(raw, this.config.editorCanvasWidth);
    }
    
    getScalingRatio(availableWidth) {
        let ratio = availableWidth / this.config.editorCanvasWidth;
        
        const bp = this.currentBreakpoint;
        if (bp === 'mobile') ratio = Math.min(ratio, 0.6);
        else if (bp === 'tablet') ratio = Math.min(ratio, 0.8);
        
        return Math.max(ratio, 0.3);
    }
    
    applyResponsive(components, availableWidth) {
        const ratio = this.getScalingRatio(availableWidth);
        
        console.log(`📐 Ratio: ${(ratio * 100).toFixed(1)}%`);
        
        let adjusted = this.deepClone(components);
        
        // 1. Créer les groupes de composants superposés
        const groups = this.buildGroups(adjusted);
        console.log(`📦 ${groups.length} groupes`);
        
        // 2. Trier par Y minimum du groupe
        groups.sort((a, b) => a.minY - b.minY);
        
        // 3. Traiter chaque groupe
        let result = [];
        let cumulativeOffset = 0;
        
        for (let group of groups) {
            const processed = this.processGroup(group, ratio, availableWidth, cumulativeOffset);
            result = result.concat(processed.components);
            
            // Ajouter la croissance du groupe à l'offset
            cumulativeOffset += processed.totalGrowth;
            
            if (processed.totalGrowth > 0) {
                console.log(`🔽 Groupe ${group.id}: +${processed.totalGrowth.toFixed(0)}px ajouté à l'offset (total: ${cumulativeOffset.toFixed(0)}px)`);
            }
        }
        
        return result;
    }
    
    /**
     * 🎯 Construit des groupes de composants superposés
     */
    buildGroups(components) {
        const groups = [];
        const assigned = new Set();
        let groupId = 0;
        
        components.sort((a, b) => a.y - b.y);
        
        for (let comp of components) {
            if (assigned.has(comp.id)) continue;
            
            const group = {
                id: `group-${groupId++}`,
                components: [comp],
                minY: comp.y,
                maxY: comp.y + comp.h
            };
            assigned.add(comp.id);
            
            // Expansion du groupe : chercher tous les composants qui chevauchent
            let changed = true;
            while (changed) {
                changed = false;
                
                for (let other of components) {
                    if (assigned.has(other.id)) continue;
                    
                    // Vérifier si other chevauche UN membre du groupe
                    for (let member of group.components) {
                        if (this.doOverlap(member, other)) {
                            const ratio = this.getOverlapRatio(member, other);
                            
                            if (ratio > this.config.overlapThreshold) {
                                group.components.push(other);
                                group.minY = Math.min(group.minY, other.y);
                                group.maxY = Math.max(group.maxY, other.y + other.h);
                                assigned.add(other.id);
                                changed = true;
                                break;
                            }
                        }
                    }
                }
            }
            
            if (group.components.length > 1) {
                console.log(`  📦 ${group.id}: ${group.components.map(c => c.id).join(', ')}`);
            }
            
            groups.push(group);
        }
        
        return groups;
    }
    
    /**
     * 🎯 Traite un groupe entier
     */
    processGroup(group, ratio, availableWidth, offsetY) {
        const components = group.components;
        const result = [];
        let maxGrowth = 0;
        
        if (components.length === 1) {
            // Groupe simple (1 composant)
            const comp = this.scaleComponent(components[0], ratio, availableWidth);
            
            // Appliquer l'offset cumulé
            comp.y = (components[0].y * ratio) + offsetY;
            
            if (comp.type === 'text' || comp.type === 'table') {
                const growth = this.adjustTextHeight(comp);
                maxGrowth = growth;
            }
            
            result.push(comp);
        } else {
            // Groupe superposé (infobox)
            console.log(`  ✨ Traitement groupe: ${components.length} composants`);
            
            // Point de référence du groupe
            const refY = Math.min(...components.map(c => c.y));
            
            // Scaler chaque composant en préservant les positions RELATIVES
            for (let comp of components) {
                const scaled = this.scaleComponent(comp, ratio, availableWidth);
                
                // 🎯 CLEF : Position relative au groupe préservée
                const relativeY = comp.y - refY;
                scaled.y = (refY * ratio) + (relativeY * ratio) + offsetY;
                
                // Ajuster hauteur des textes
                if (comp.type === 'text' || comp.type === 'table') {
                    const growth = this.adjustTextHeight(scaled);
                    maxGrowth = Math.max(maxGrowth, growth);
                }
                
                result.push(scaled);
            }
        }
        
        return {
            components: result,
            totalGrowth: maxGrowth
        };
    }
    
    scaleComponent(component, ratio, availableWidth) {
        const minSize = this.config.minSizes[component.type] || { w: 100, h: 100 };
        const scaled = { ...component };
        
        scaled.x = component.x * ratio;
        scaled.w = Math.max(minSize.w, component.w * ratio);
        scaled.h = Math.max(minSize.h, component.h * ratio);
        
        if (scaled.x + scaled.w > availableWidth) {
            scaled.w = Math.max(minSize.w, availableWidth - scaled.x - 10);
        }
        
        scaled._scaledH = scaled.h;
        
        return scaled;
    }
    
    /**
     * Ajuste la hauteur d'un texte et retourne la croissance.
     * 
     * ⚠️ ATTENTION — Timing CSS :
     * Cette méthode mesure le scrollHeight de l'élément DOM.
     * Elle doit être appelée APRÈS que les feuilles de style partagées
     * (shared-components.css) soient appliquées par le navigateur.
     * Si appelée trop tôt (avant le premier repaint), le navigateur
     * utilise ses styles par défaut et retourne un scrollHeight erroné
     * (souvent 2-3x trop grand), créant des espaces vides géants.
     * → Le setTimeout(200) dans l'init() de la page protège contre ça.
     */
    adjustTextHeight(comp) {
        const element = document.getElementById(comp.id);
        if (!element) return 0;
        
        const content = element.querySelector('.text-content') || element;
        
        // Sauvegarder les styles courants
        const oldW = element.style.width;
        const oldH = element.style.height;
        const oldOverflow = content.style.overflowY;
        
        // Appliquer la largeur cible pour mesurer le wrapping réel du texte
        element.style.width = `${comp.w}px`;
        element.style.height = 'auto';
        content.style.overflowY = 'visible';
        
        // Forcer le reflow
        void element.offsetHeight;
        
        const measured = content.scrollHeight;
        
        // Restaurer
        element.style.width = oldW;
        element.style.height = oldH;
        content.style.overflowY = oldOverflow;
        
        const minH = this.config.minSizes[comp.type]?.h || 40;
        const scaledH = comp._scaledH;
        
        // ✅ FIX : Plafonner la hauteur mesurée.
        // Si le CSS n'est pas encore rendu au moment de la mesure, scrollHeight
        // peut être fantaisiste (ex: 1200px pour 3 lignes de texte).
        // On refuse d'accepter une hauteur > 3× la hauteur scalée sauf si la
        // hauteur scalée est très petite (composant volontairement petit).
        const MAX_GROWTH_RATIO = 3.0;
        const cappedH = scaledH > 60
            ? Math.min(measured, scaledH * MAX_GROWTH_RATIO)
            : measured;
        
        comp.h = Math.max(minH, cappedH + 3);
        
        const growth = comp.h - scaledH;
        
        if (growth > 5) {
            console.log(`    📏 ${comp.id}: +${growth.toFixed(0)}px (mesuré: ${measured}px, capé: ${cappedH.toFixed(0)}px)`);
        }
        
        delete comp._scaledH;
        
        return Math.max(0, growth);
    }
    
    doOverlap(c1, c2) {
        return !(
            c1.x + c1.w <= c2.x ||
            c2.x + c2.w <= c1.x ||
            c1.y + c1.h <= c2.y ||
            c2.y + c2.h <= c1.y
        );
    }
    
    getOverlapRatio(c1, c2) {
        const x1 = Math.max(c1.x, c2.x);
        const y1 = Math.max(c1.y, c2.y);
        const x2 = Math.min(c1.x + c1.w, c2.x + c2.w);
        const y2 = Math.min(c1.y + c1.h, c2.y + c2.h);
        
        const overlapArea = (x2 - x1) * (y2 - y1);
        const area1 = c1.w * c1.h;
        const area2 = c2.w * c2.h;
        const minArea = Math.min(area1, area2);
        
        return overlapArea / minArea;
    }
    
    applyToDOM(components) {
        components.forEach(comp => {
            const el = document.getElementById(comp.id);
            if (!el) return;
            
            el.style.transition = 'all 0.3s ease';
            el.style.left = `${comp.x}px`;
            el.style.top = `${comp.y}px`;
            el.style.width = `${comp.w}px`;
            el.style.height = `${comp.h}px`;
            
            if (comp.type === 'text' || comp.type === 'table') {
                this.setTextStyle(el);
            }
        });
        
        this.setCanvasHeight(components);
    }
    
    setTextStyle(element) {
        const content = element.querySelector('.text-content');
        if (!content) return;
        
        const ratio = this.getScalingRatio(this.getAvailableWidth());
        const bp = this.currentBreakpoint;
        
        let size = 15;
        if (bp === 'mobile') size = 13;
        else if (bp === 'tablet') size = 14;
        
        size = Math.max(11, size * Math.min(ratio, 1));
        
        content.style.fontSize = `${size}px`;
        content.style.lineHeight = '1.6';
        content.style.padding = '12px';
        content.style.overflowY = 'auto';
        content.style.boxSizing = 'border-box';
    }
    
    setCanvasHeight(components) {
        const canvas = document.querySelector('.canvas-container');
        if (!canvas) return;
        
        let max = 0;
        components.forEach(c => {
            const bottom = c.y + c.h;
            if (bottom > max) max = bottom;
        });
        
        canvas.style.minHeight = `${max + 100}px`;
    }
    
    setupResizeListener() {
        let timer;
        
        window.addEventListener('resize', () => {
            clearTimeout(timer);
            
            timer = setTimeout(() => {
                const newBp = this.detectBreakpoint();
                
                if (newBp !== this.currentBreakpoint) {
                    console.log(`🔄 ${this.currentBreakpoint} → ${newBp}`);
                    this.currentBreakpoint = newBp;
                    
                    if (this.originalLayout) {
                        const w = this.getAvailableWidth();
                        const resp = this.applyResponsive(this.originalLayout, w);
                        this.applyToDOM(resp);
                    }
                }
            }, 250);
        });
    }
    
    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }
    
    showDebugOverlay() {
        document.getElementById('responsive-debug-overlay')?.remove();
        
        const div = document.createElement('div');
        div.id = 'responsive-debug-overlay';
        div.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 300px;
            background: rgba(0,0,0,0.95);
            color: #0f0;
            padding: 15px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 12px;
            z-index: 100000;
            max-width: 400px;
            box-shadow: 0 4px 15px rgba(0,255,0,0.5);
            border: 2px solid #0f0;
        `;
        
        const w = this.getAvailableWidth();
        const r = this.getScalingRatio(w);
        
        const comps = document.querySelectorAll('.component');
        let overflow = 0;
        
        comps.forEach(el => {
            if (el.dataset.type === 'text') {
                const txt = el.querySelector('.text-content');
                if (txt && txt.scrollHeight > txt.clientHeight + 5) {
                    overflow++;
                    console.warn(`⚠️ Overflow: ${el.id}`);
                }
            }
        });
        
        div.innerHTML = `
            <strong style="color:#0ff;font-size:14px;">📊 DEBUG GROUPES</strong><br>
            <div style="margin-top:10px;padding-top:10px;border-top:1px solid #0f0;">
                BP: <span style="color:#ff0;">${this.currentBreakpoint}</span><br>
                Ratio: <span style="color:#ff0;">${(r*100).toFixed(0)}%</span><br>
                Seuil overlap: <span style="color:#ff0;">${(this.config.overlapThreshold*100).toFixed(0)}%</span><br>
                Canvas: <span style="color:#ff0;">${this.config.editorCanvasWidth}px</span><br>
                Dispo: <span style="color:#ff0;">${w}px</span><br>
                Comps: <span style="color:#ff0;">${this.originalLayout?.length || 0}</span><br>
                <strong style="color:${overflow>0?'#f00':'#0f0'}">Overflow: ${overflow}</strong>
            </div>
            <div style="margin-top:10px;font-size:10px;color:#999;">
                Les groupes superposés gardent<br>
                leurs positions relatives intactes
            </div>
            <div style="margin-top:10px;">
                <button onclick="window.responsiveLayout.hideDebugOverlay()" style="
                    background:#f00;color:white;border:none;padding:8px 15px;
                    border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;
                ">✖</button>
            </div>
        `;
        
        document.body.appendChild(div);
    }
    
    hideDebugOverlay() {
        document.getElementById('responsive-debug-overlay')?.remove();
    }
    
    reset() {
        if (!this.originalLayout) return;
        this.applyToDOM(this.originalLayout);
    }
}

// INIT
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        // ✅ FIX : On attend que les feuilles de style (shared-components.css,
        // viewer.css) soient appliquées ET que le navigateur ait fait son premier
        // rendu avant de mesurer les heights. requestAnimationFrame() garantit
        // qu'on est dans le cycle de rendu suivant, après l'application du CSS.
        //
        // Pourquoi deux rAF ?
        // - 1er rAF : CSS appliqué, mais le layout peut ne pas être calculé.
        // - 2ème rAF : Layout calculé et stable, mesures fiables.
        //
        // Le setTimeout(100) ajoute une marge supplémentaire pour les CSS externes
        // (CDN Quill, etc.) qui peuvent charger légèrement après DOMContentLoaded.
        
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                setTimeout(() => {
                    const comps = Array.from(document.querySelectorAll('.component')).map(el => {
                        const tc = Array.from(el.classList).find(c => c.startsWith('component-'));
                        const type = tc ? tc.replace('component-', '') : 'unknown';
                        
                        return {
                            id: el.id,
                            type: type,
                            x: parseFloat(el.style.left) || 0,
                            y: parseFloat(el.style.top) || 0,
                            w: parseFloat(el.style.width) || 300,
                            h: parseFloat(el.style.height) || 200,
                            z: parseInt(el.style.zIndex) || 0
                        };
                    });
                    
                    if (comps.length > 0) {
                        const cw = parseInt(document.querySelector('meta[name="editor-canvas-width"]')?.content) || 1400;
                        
                        console.log(`📦 ${comps.length} composants | Canvas éditeur: ${cw}px`);
                        
                        window.responsiveLayout = new ResponsiveLayout({
                            editorCanvasWidth: cw
                        });
                        
                        const resp = window.responsiveLayout.init(comps);
                        window.responsiveLayout.applyToDOM(resp);
                        
                        console.log('✅ Responsive initialisé');
                    }
                }, 100);
            });
        });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ResponsiveLayout;
}