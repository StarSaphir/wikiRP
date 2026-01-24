// responsive-layout.js - Système responsive OPTIMISÉ avec préservation des superpositions

class ResponsiveLayout {
    constructor(options = {}) {
        this.config = {
            editorCanvasWidth: options.editorCanvasWidth || 1920,
            editorCanvasHeight: options.editorCanvasHeight || 1080,
            
            contentMarginLeft: options.contentMarginLeft || 280,
            contentPadding: options.contentPadding || 40,
            
            breakpoints: {
                mobile: 768,
                tablet: 1024,
                desktop: 1440
            },
            
            minSizes: {
                text: { w: 200, h: 80 },
                image: { w: 150, h: 100 },
                gallery: { w: 250, h: 200 },
                video: { w: 300, h: 200 },
                youtube: { w: 300, h: 200 },
                shape: { w: 100, h: 50 },
                table: { w: 250, h: 150 },
                separator: { w: 100, h: 2 }
            },
            
            // ✅ FACTEURS TRÈS AGRESSIFS pour le texte
            heightAdjustFactors: {
                text: 3.0,      // ×3 pour les textes
                table: 2.5,
                image: 1.0,
                gallery: 1.0,
                video: 0.8,
                youtube: 0.8,
                shape: 0.3,
                separator: 0
            },
            
            componentGap: 15,
            
            ...options
        };
        
        this.originalLayout = null;
        this.currentBreakpoint = this.detectBreakpoint();
    }
    
    init(components) {
        console.log('🔧 Initialisation du système responsive OPTIMISÉ');
        
        this.originalLayout = this.deepClone(components);
        this.currentBreakpoint = this.detectBreakpoint();
        
        const availableWidth = this.getAvailableWidth();
        
        console.log(`📐 Canvas éditeur: ${this.config.editorCanvasWidth}px`);
        console.log(`📐 Largeur disponible: ${availableWidth}px`);
        console.log(`📊 Breakpoint: ${this.currentBreakpoint}`);
        
        const responsiveComponents = this.applyResponsive(components, availableWidth);
        this.setupResizeListener();
        
        console.log(`✅ Responsive initialisé - ${responsiveComponents.length} composants`);
        
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
        const breakpoint = this.currentBreakpoint;
        
        if (breakpoint === 'mobile') {
            return screenWidth - (this.config.contentPadding * 2);
        }
        
        return screenWidth - this.config.contentMarginLeft - (this.config.contentPadding * 2);
    }
    
    getScalingRatio(availableWidth) {
        let ratio = availableWidth / this.config.editorCanvasWidth;
        
        const breakpoint = this.currentBreakpoint;
        if (breakpoint === 'mobile') ratio = Math.min(ratio, 0.6);
        else if (breakpoint === 'tablet') ratio = Math.min(ratio, 0.8);
        
        return Math.max(ratio, 0.3);
    }
    
    applyResponsive(components, availableWidth) {
        const ratio = this.getScalingRatio(availableWidth);
        
        console.log(`📐 Ratio de scaling: ${(ratio * 100).toFixed(1)}%`);
        
        let adjusted = this.deepClone(components);
        adjusted.sort((a, b) => a.y - b.y);
        
        // Phase 1 : Scaling avec ajustement hauteur
        adjusted = adjusted.map(comp => this.scaleComponent(comp, ratio, availableWidth));
        
        // Phase 2 : Redistribution SÉLECTIVE (pas toucher aux superpositions)
        adjusted = this.redistributeSelectively(adjusted);
        
        return adjusted;
    }
    
    scaleComponent(component, ratio, availableWidth) {
        const minSize = this.config.minSizes[component.type] || { w: 100, h: 100 };
        const scaled = { ...component };
        
        scaled.x = component.x * ratio;
        scaled.y = component.y * ratio;
        scaled.w = Math.max(minSize.w, component.w * ratio);
        scaled.h = Math.max(minSize.h, component.h * ratio);
        
        const originalScaledW = component.w * ratio;
        let widthWasReduced = false;
        
        // Réduction de largeur si débordement
        if (scaled.x + scaled.w > availableWidth) {
            const overflow = (scaled.x + scaled.w) - availableWidth;
            
            if (scaled.x > 20) {
                const shift = Math.min(overflow, scaled.x - 10);
                scaled.x -= shift;
            }
            
            if (scaled.x + scaled.w > availableWidth) {
                scaled.w = Math.max(minSize.w, availableWidth - scaled.x - 10);
                widthWasReduced = true;
            }
        }
        
        const widthCompressionRatio = scaled.w / originalScaledW;
        
        // ✅ AJUSTEMENT HAUTEUR TRÈS AGRESSIF pour le texte
        if (widthCompressionRatio < 0.98 || widthWasReduced) {
            const heightFactor = this.config.heightAdjustFactors[component.type] || 1.5;
            
            // Formule TRÈS agressive
            const compressionFactor = 1 / widthCompressionRatio;
            const heightMultiplier = 1 + ((compressionFactor - 1) * heightFactor);
            
            const baseHeight = component.h * ratio;
            const newHeight = baseHeight * heightMultiplier;
            const heightDelta = newHeight - baseHeight;
            
            scaled.h = newHeight;
            scaled._heightIncreased = heightDelta;
            
            console.log(`📏 ${component.id} (${component.type}): ${(widthCompressionRatio * 100).toFixed(0)}% → +${heightDelta.toFixed(0)}px`);
        } else {
            scaled._heightIncreased = 0;
        }
        
        scaled._originalY = component.y * ratio;
        scaled._originalBottom = (component.y + component.h) * ratio;
        
        return scaled;
    }
    
    /**
     * ✅ Redistribution SÉLECTIVE : préserve les superpositions
     */
    redistributeSelectively(components) {
        const adjusted = [];
        
        for (let i = 0; i < components.length; i++) {
            let current = { ...components[i] };
            let needsRepositioning = false;
            
            // Vérifier les collisions avec les composants déjà placés
            for (let j = 0; j < adjusted.length; j++) {
                const existing = adjusted[j];
                
                if (this.doOverlap(current, existing)) {
                    // ✅ CLEF : Vérifier si c'est une superposition INTENTIONNELLE
                    if (this.isIntentionalOverlap(current, existing)) {
                        console.log(`✨ Superposition préservée: ${current.id} ↔ ${existing.id}`);
                        // NE PAS décaler
                    } else {
                        // Collision accidentelle → décaler
                        const newY = existing.y + existing.h + this.config.componentGap;
                        console.log(`🔽 ${current.id} décalé de ${current.y.toFixed(0)} → ${newY.toFixed(0)}px`);
                        current.y = newY;
                        needsRepositioning = true;
                    }
                }
            }
            
            delete current._originalY;
            delete current._originalBottom;
            
            adjusted.push(current);
        }
        
        return adjusted;
    }
    
    doOverlap(comp1, comp2) {
        const tolerance = 3;
        return !(
            comp1.x + comp1.w < comp2.x + tolerance ||
            comp2.x + comp2.w < comp1.x + tolerance ||
            comp1.y + comp1.h < comp2.y + tolerance ||
            comp2.y + comp2.h < comp1.y + tolerance
        );
    }
    
    /**
     * ✅ Détection AMÉLIORÉE des superpositions intentionnelles
     */
    isIntentionalOverlap(comp1, comp2) {
        if (!this.doOverlap(comp1, comp2)) return false;
        
        const overlapX = Math.max(0, Math.min(comp1.x + comp1.w, comp2.x + comp2.w) - Math.max(comp1.x, comp2.x));
        const overlapY = Math.max(0, Math.min(comp1.y + comp1.h, comp2.y + comp2.h) - Math.max(comp1.y, comp2.y));
        const overlapArea = overlapX * overlapY;
        
        const area1 = comp1.w * comp1.h;
        const area2 = comp2.w * comp2.h;
        const minArea = Math.min(area1, area2);
        
        // ✅ Si > 15% de surface commune = intentionnel
        return overlapArea > minArea * 0.15;
    }
    
    applyToDOM(components) {
        components.forEach(comp => {
            const element = document.getElementById(comp.id);
            if (!element) {
                console.warn(`⚠️ ${comp.id} introuvable`);
                return;
            }
            
            element.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            element.style.left = `${comp.x}px`;
            element.style.top = `${comp.y}px`;
            element.style.width = `${comp.w}px`;
            element.style.height = `${comp.h}px`;
            
            if (comp.type === 'text') {
                this.adjustTextSize(element, comp);
            }
        });
        
        this.adjustCanvasHeight(components);
    }
    
    adjustTextSize(element, component) {
        const textContent = element.querySelector('.text-content');
        if (!textContent) return;
        
        const ratio = this.getScalingRatio(this.getAvailableWidth());
        const breakpoint = this.currentBreakpoint;
        
        let baseFontSize = 15;
        if (breakpoint === 'mobile') baseFontSize = 13;
        else if (breakpoint === 'tablet') baseFontSize = 14;
        
        const fontSize = Math.max(11, baseFontSize * Math.min(ratio, 1));
        
        textContent.style.fontSize = `${fontSize}px`;
        textContent.style.lineHeight = '1.6';
        textContent.style.overflowY = 'auto';
        textContent.style.padding = '12px';
    }
    
    adjustCanvasHeight(components) {
        const canvas = document.querySelector('.canvas-container');
        if (!canvas) return;
        
        let maxBottom = 0;
        components.forEach(comp => {
            const bottom = comp.y + comp.h;
            if (bottom > maxBottom) maxBottom = bottom;
        });
        
        canvas.style.minHeight = `${maxBottom + 100}px`;
    }
    
    setupResizeListener() {
        let resizeTimer;
        
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            
            resizeTimer = setTimeout(() => {
                const newBreakpoint = this.detectBreakpoint();
                
                if (newBreakpoint !== this.currentBreakpoint) {
                    console.log(`🔄 ${this.currentBreakpoint} → ${newBreakpoint}`);
                    this.currentBreakpoint = newBreakpoint;
                    
                    if (this.originalLayout) {
                        const availableWidth = this.getAvailableWidth();
                        const responsive = this.applyResponsive(this.originalLayout, availableWidth);
                        this.applyToDOM(responsive);
                    }
                }
            }, 250);
        });
    }
    
    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }
    
    getDebugInfo() {
        const availableWidth = this.getAvailableWidth();
        const ratio = this.getScalingRatio(availableWidth);
        
        return {
            breakpoint: this.currentBreakpoint,
            ratio: ratio,
            editorCanvasWidth: this.config.editorCanvasWidth,
            availableWidth: availableWidth,
            screenWidth: window.innerWidth,
            componentsCount: this.originalLayout?.length || 0
        };
    }
    
    showDebugOverlay() {
        document.getElementById('responsive-debug-overlay')?.remove();
        
        const overlay = document.createElement('div');
        overlay.id = 'responsive-debug-overlay';
        overlay.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 300px;
            background: rgba(0, 0, 0, 0.95);
            color: #0f0;
            padding: 15px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 12px;
            z-index: 100000;
            max-width: 400px;
            box-shadow: 0 4px 15px rgba(0, 255, 0, 0.5);
            border: 2px solid #0f0;
        `;
        
        const info = this.getDebugInfo();
        const components = document.querySelectorAll('.component');
        let heightIncreasedCount = 0;
        let totalHeightIncrease = 0;
        let overflowCount = 0;
        
        components.forEach(el => {
            const h = parseFloat(el.style.height);
            const id = el.id;
            const comp = this.originalLayout?.find(c => c.id === id);
            
            if (comp) {
                const originalH = comp.h * info.ratio;
                const delta = h - originalH;
                if (delta > 5) {
                    heightIncreasedCount++;
                    totalHeightIncrease += delta;
                }
            }
            
            // Détecter overflow
            if (el.dataset.type === 'text') {
                const textContent = el.querySelector('.text-content');
                if (textContent && textContent.scrollHeight > textContent.clientHeight + 5) {
                    overflowCount++;
                }
            }
        });
        
        overlay.innerHTML = `
            <strong style="color: #0ff; font-size: 14px;">📊 RESPONSIVE DEBUG</strong><br>
            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #0f0;">
                Breakpoint: <span style="color: #ff0;">${info.breakpoint}</span><br>
                Ratio: <span style="color: #ff0;">${(info.ratio * 100).toFixed(0)}%</span><br>
                Canvas éditeur: <span style="color: #ff0;">${info.editorCanvasWidth}px</span><br>
                Largeur dispo: <span style="color: #ff0;">${info.availableWidth}px</span><br>
            </div>
            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #0f0;">
                Composants: <span style="color: #ff0;">${info.componentsCount}</span><br>
                Hauteurs augmentées: <span style="color: ${heightIncreasedCount > 0 ? '#0f0' : '#666'}">${heightIncreasedCount}</span><br>
                Total ajouté: <span style="color: #0f0; font-weight: bold;">+${totalHeightIncrease.toFixed(0)}px</span><br>
                <strong style="color: ${overflowCount > 0 ? '#f00' : '#0f0'}">Textes en overflow: ${overflowCount}</strong><br>
            </div>
            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #0f0;">
                <button onclick="window.responsiveLayout.hideDebugOverlay()" style="
                    background: #f00;
                    color: white;
                    border: none;
                    padding: 8px 15px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                    font-weight: bold;
                ">✖ Fermer</button>
            </div>
        `;
        
        document.body.appendChild(overlay);
    }
    
    hideDebugOverlay() {
        document.getElementById('responsive-debug-overlay')?.remove();
    }
    
    reset() {
        if (!this.originalLayout) return;
        this.applyToDOM(this.originalLayout);
        console.log('🔄 Layout réinitialisé');
    }
}

// INITIALISATION AUTOMATIQUE
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            const components = Array.from(document.querySelectorAll('.component')).map(el => {
                const typeClass = Array.from(el.classList).find(cls => cls.startsWith('component-'));
                const type = typeClass ? typeClass.replace('component-', '') : 'unknown';
                
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
            
            if (components.length > 0) {
                const editorWidth = parseInt(document.querySelector('meta[name="editor-canvas-width"]')?.content) || 1920;
                const editorHeight = parseInt(document.querySelector('meta[name="editor-canvas-height"]')?.content) || 1080;
                
                console.log(`📦 ${components.length} composants | Canvas: ${editorWidth}×${editorHeight}px`);
                
                window.responsiveLayout = new ResponsiveLayout({
                    editorCanvasWidth: editorWidth,
                    editorCanvasHeight: editorHeight
                });
                
                const responsive = window.responsiveLayout.init(components);
                window.responsiveLayout.applyToDOM(responsive);
                
                console.log('✅ Responsive OPTIMISÉ activé');
                console.log('💡 Commandes: ResponsiveDebug.showAll() | ResponsiveDebug.report()');
            }
        }, 200);
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ResponsiveLayout;
}