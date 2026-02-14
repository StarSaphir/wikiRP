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
        console.log('🔧 Init responsive avec groupes et compensation');
        
        this.originalLayout = this.deepClone(components);
        this.currentBreakpoint = this.detectBreakpoint();
        
        const availableWidth = this.getAvailableWidth();
        const ratio = this.getScalingRatio(availableWidth);
        
        // 📱 Debugging mobile
        console.log('📱 Device info:', {
            screenWidth: window.innerWidth,
            screenHeight: window.innerHeight,
            devicePixelRatio: window.devicePixelRatio,
            userAgent: navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'
        });
        
        console.log('📊 Responsive config:', {
            editorCanvasWidth: this.config.editorCanvasWidth,
            breakpoint: this.currentBreakpoint,
            availableWidth: availableWidth,
            ratio: `${(ratio * 100).toFixed(1)}%`,
            contentMarginLeft: this.config.contentMarginLeft,
            contentPadding: this.config.contentPadding
        });
        
        const responsiveComponents = this.applyResponsive(components, availableWidth);
        this.setupResizeListener();
        
        console.log(`✅ ${responsiveComponents.length} composants traités`);
        
        return responsiveComponents;
    }
    
    detectBreakpoint() {      
        const canvas = document.querySelector('.canvas-container');
        const width = canvas ? canvas.offsetWidth : window.innerWidth;
       
        if (width <= this.config.breakpoints.mobile) return 'mobile';
        if (width <= this.config.breakpoints.tablet) return 'tablet';
        if (width <= this.config.breakpoints.desktop) return 'desktop';
        return 'wide';
    }
    
    getAvailableWidth() {
        const screenWidth = window.innerWidth;
        const bp = this.currentBreakpoint;
        
        if (bp === 'mobile') {
            // Sur mobile, la sidebar est cachée et le .content prend toute
            // la largeur moins le padding. Le canvas-container a width: 100%
            // en CSS mobile, donc utilisons sa largeur réelle.
            const canvas = document.querySelector('.canvas-container');
            if (canvas) {
                const canvasWidth = canvas.offsetWidth;
                console.log(`📱 Mobile: canvas offsetWidth = ${canvasWidth}px`);
                return canvasWidth;
            }
            // Fallback si le canvas n'existe pas encore
            return screenWidth - (this.config.contentPadding * 2);
        }
        
        // Desktop/tablet : largeur brute = écran - sidebar - padding
        const raw = screenWidth - this.config.contentMarginLeft - (this.config.contentPadding * 2);
        
        // ✅ Le canvas est limité à editorCanvasWidth (max-width: 1400px).
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
     * 
     * Cas typique d'un groupe superposé :
     *   - 1 shape (fond coloré)
     *   - 1 image (logo/illustration)
     *   - 1 texte (description)
     * 
     * Le texte peut grandir après scaling (wrapping). Dans ce cas :
     *   - Les shapes qui "contiennent" le texte (≥ 80% de recouvrement
     *     vertical et horizontal) doivent grandir avec lui.
     *   - Les images gardent leur ratio mais se repositionnent.
     *   - Tous les membres conservent leurs positions RELATIVES
     *     au sein du groupe.
     */
    processGroup(group, ratio, availableWidth, offsetY) {
        const components = group.components;
        const result = [];
        
        if (components.length === 1) {
            // Groupe simple (1 composant)
            const comp = this.scaleComponent(components[0], ratio, availableWidth);
            comp.y = (components[0].y * ratio) + offsetY;
            
            let growth = 0;
            if (comp.type === 'text' || comp.type === 'table') {
                growth = this.adjustTextHeight(comp); // supprime _scaledH
            } else {
                delete comp._scaledH; // nettoyer pour les shapes, images, etc.
            }
            
            result.push(comp);
            return { components: result, totalGrowth: growth };
        }
        
        // ── Groupe superposé (infobox : shape + image + texte) ──────────
        console.log(`  ✨ Traitement groupe: ${components.length} composants`);
        
        const refY = Math.min(...components.map(c => c.y));
        const groupOrigH = Math.max(...components.map(c => c.y + c.h)) - refY;
        
        // Étape 1 : scaler tous les composants
        const scaled = components.map(comp => {
            const s = this.scaleComponent(comp, ratio, availableWidth);
            const relativeY = comp.y - refY;
            s.y = (refY * ratio) + (relativeY * ratio) + offsetY;
            s._origRelY  = relativeY;           // position relative originale (avant scale)
            s._savedScaledH = s._scaledH;       // copie avant que adjustTextHeight la supprime
            return s;
        });
        
        // Étape 2 : mesurer la croissance des textes/tableaux
        let maxTextGrowth = 0;
        for (let comp of scaled) {
            if (comp.type === 'text' || comp.type === 'table') {
                const growth = this.adjustTextHeight(comp); // supprime _scaledH sur ce comp
                if (growth > maxTextGrowth) maxTextGrowth = growth;
            }
        }
        
        // Étape 3 : si des textes ont grandi, adapter les shapes conteneurs
        if (maxTextGrowth > 0) {
            const groupW = Math.max(...scaled.map(s => s.x + s.w)) -
                           Math.min(...scaled.map(s => s.x));
            
            for (let comp of scaled) {
                if (comp.type === 'text' || comp.type === 'table') continue;
                
                // Un composant "conteneur" est une shape qui occupe ≥ 60% de la
                // largeur du groupe, OU une image qui sert de fond (relY < 10% du groupe).
                const coverageX = groupW > 0 ? comp.w / groupW : 0;
                const relYRatio = groupOrigH > 0 ? comp._origRelY / groupOrigH : 0;
                
                const isContainer = (comp.type === 'shape') ||
                                    (comp.type === 'image' && coverageX >= 0.6 && relYRatio < 0.1);
                
                if (isContainer) {
                    const baseH = comp._savedScaledH || comp.h;
                    comp.h = Math.max(comp.h, baseH + maxTextGrowth);
                    console.log(`    📦 ${comp.id} (${comp.type}) étendu à ${comp.h.toFixed(0)}px`);
                }
            }
        }
        
        // Nettoyer les propriétés temporaires et pousser dans result
        for (let comp of scaled) {
            delete comp._origRelY;
            delete comp._savedScaledH;
            delete comp._scaledH; // au cas où (non-texte sans adjustTextHeight)
            result.push(comp);
        }
        
        return {
            components: result,
            totalGrowth: maxTextGrowth
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
     * → Le double requestAnimationFrame + setTimeout(100) dans l'init()
     *   protège normalement contre ça.
     * 
     * ⚠️ Ne pas mettre un plafond de croissance trop bas (ex: 3×) :
     * un texte compressé à 50% de largeur peut légitimement nécessiter
     * 4× ou plus sa hauteur scalée. On détecte le CSS mal chargé
     * autrement (via la font-size effective).
     */
    adjustTextHeight(comp) {
        const element = document.getElementById(comp.id);
        if (!element) return 0;
        
        const content = element.querySelector('.text-content') || element;
        
        // ✅ Détecter si le CSS est bien chargé en vérifiant la font-size
        // réelle (shared-components.css définit 15px ; le navigateur sans
        // CSS donne ~16px mais avec une line-height différente qui gonfle
        // les mesures). On mesure avant de toucher le DOM.
        const computedFS = parseFloat(window.getComputedStyle(content).fontSize) || 0;
        const cssIsReady = computedFS > 0 && computedFS <= 40; // sanity check
        
        if (!cssIsReady) {
            console.warn(`⚠️ ${comp.id}: CSS potentiellement non chargé (fontSize=${computedFS}px), skip adjustTextHeight`);
            delete comp._scaledH;
            return 0;
        }
        
        // Sauvegarder les styles courants
        const oldW = element.style.width;
        const oldH = element.style.height;
        const oldOverflow = content.style.overflowY;
        const oldVis    = element.style.visibility;
        
        // Rendre invisible (pas hidden : on veut que le layout soit calculé)
        // puis appliquer la largeur cible pour mesurer le wrapping réel
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
        
        // ✅ Pas de plafond arbitraire : on accepte la mesure réelle.
        // Le seul garde-fou est un ratio absurde (> 10×) qui trahit
        // une mesure aberrante (ex: CSS chargé mais composant caché/off-screen).
        const ABERRANT_RATIO = 10;
        if (measured > scaledH * ABERRANT_RATIO && scaledH > 30) {
            console.warn(`⚠️ ${comp.id}: mesure aberrante (${measured}px vs scaledH=${scaledH.toFixed(0)}px), ignorée`);
            comp.h = Math.max(minH, scaledH);
            delete comp._scaledH;
            return 0;
        }
        
        comp.h = Math.max(minH, measured + 6); // +6px de marge de confort
        
        const growth = comp.h - scaledH;
        
        if (growth > 5) {
            console.log(`    📏 ${comp.id}: +${growth.toFixed(0)}px (mesuré: ${measured}px, scalé: ${scaledH.toFixed(0)}px)`);
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
            
            // Transition ciblée : éviter d'animer 'all' pour ne pas
            // créer d'effets indésirables sur les shapes étendues.
            el.style.transition = 'left 0.3s ease, top 0.3s ease, width 0.3s ease, height 0.3s ease';
            el.style.left   = `${comp.x}px`;
            el.style.top    = `${comp.y}px`;
            el.style.width  = `${comp.w}px`;
            el.style.height = `${comp.h}px`;
            
            if (comp.type === 'text' || comp.type === 'table') {
                this.setTextStyle(el);
                // S'assurer que le texte est scrollable s'il déborde encore
                const content = el.querySelector('.text-content');
                if (content) content.style.overflowY = 'auto';
            }
        });
        
        this.setCanvasHeight(components);
    }
    
    setTextStyle(element) {
        const content = element.querySelector('.text-content');
        if (!content) return;
        
        const ratio = this.getScalingRatio(this.getAvailableWidth());
        const bp = this.currentBreakpoint;
        
        // N'écraser la font-size que si l'écran est plus petit que le canvas
        // (ratio < 1). Si ratio >= 1, laisser shared-components.css gérer (15px).
        // Cela évite que le JS écrase le CSS sur des écrans normaux.
        if (ratio < 1) {
            let size = 15; // valeur de base de shared-components.css
            if (bp === 'mobile') size = 13;
            else if (bp === 'tablet') size = 14;
            
            // Réduire proportionnellement, minimum 11px pour la lisibilité
            size = Math.max(11, size * ratio);
            content.style.fontSize = `${size.toFixed(1)}px`;
        } else {
            // Retirer le style inline pour laisser le CSS prendre le dessus
            content.style.fontSize = '';
        }
        
        content.style.lineHeight   = '1.6';
        content.style.padding      = '12px';
        content.style.overflowY    = 'auto';
        content.style.boxSizing    = 'border-box';
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
        // ✅ NOUVEAU FIX MOBILE : Attendre que le canvas ait sa vraie largeur
        // avant d'initialiser le responsive.
        //
        // Problème : Sur mobile, les media queries CSS peuvent prendre du temps
        // à s'appliquer. Si on mesure le canvas trop tôt, on obtient sa largeur
        // desktop (1400px) au lieu de sa largeur mobile (~350px).
        //
        // Solution : Polling jusqu'à ce que le canvas ait une largeur < 800px
        // (ce qui indique que le CSS mobile est appliqué) OU timeout après 2s.
        
        function waitForCanvasResize(callback, attempts = 0) {
            const canvas = document.querySelector('.canvas-container');
            
            if (!canvas) {
                console.warn('⚠️ Canvas container non trouvé, retry...');
                if (attempts < 20) {
                    setTimeout(() => waitForCanvasResize(callback, attempts + 1), 50);
                } else {
                    console.error('❌ Canvas container non trouvé après 1s');
                }
                return;
            }
            
            const canvasWidth = canvas.offsetWidth;
            const screenWidth = window.innerWidth;
            const isMobile = screenWidth <= 768;
            
            // Sur mobile, attendre que le canvas soit < 800px (CSS media query appliqué)
            // Sur desktop, le canvas peut rester à 1400px, c'est normal
            const canvasReadyForMobile = !isMobile || canvasWidth < 800;
            
            console.log(`📱 Vérification canvas: width=${canvasWidth}px, screen=${screenWidth}px, ready=${canvasReadyForMobile}`);
            
            if (canvasReadyForMobile || attempts >= 40) {
                if (attempts >= 40) {
                    console.warn(`⚠️ Timeout: canvas width=${canvasWidth}px après 2s`);
                }
                callback();
            } else {
                // Retry après 50ms
                setTimeout(() => waitForCanvasResize(callback, attempts + 1), 50);
            }
        }
        
        function initResponsive() {
            // Double requestAnimationFrame pour garantir que le CSS est appliqué
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    const comps = Array.from(document.querySelectorAll('.component')).map(el => {
                        const tc = Array.from(el.classList).find(c => c.startsWith('component-'));
                        const type = tc ? tc.replace('component-', '') : 'unknown';
                        
                        // ✅ CRITIQUE: Lire depuis data-original-* au lieu de style inline
                        // Les styles inline contiennent les valeurs de l'éditeur (1400px),
                        // mais on veut les valeurs ORIGINALES pour recalculer le ratio mobile.
                        return {
                            id: el.id,
                            type: type,
                            x: parseFloat(el.dataset.originalX || el.style.left) || 0,
                            y: parseFloat(el.dataset.originalY || el.style.top) || 0,
                            w: parseFloat(el.dataset.originalW || el.style.width) || 300,
                            h: parseFloat(el.dataset.originalH || el.style.height) || 200,
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
                });
            });
        }
        
        // Lancer l'init seulement quand le canvas a la bonne taille
        waitForCanvasResize(initResponsive);
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ResponsiveLayout;
}