// utils/debug.js - Utilitaires de debug pour le système responsive

/**
 * Classe d'utilitaires de debug
 */
class ResponsiveDebugUtils {
    constructor() {
        this.overlaysActive = new Set();
        this.setupGlobalCommands();
    }
    
    /**
     * Setup des commandes globales
     */
    setupGlobalCommands() {
        if (typeof window !== 'undefined') {
            window.ResponsiveDebug = {
                // Afficher les contours
                showBorders: () => this.showComponentBorders(),
                hideBorders: () => this.hideComponentBorders(),
                
                // Afficher les coordonnées
                showCoords: () => this.showComponentCoords(),
                hideCoords: () => this.hideComponentCoords(),
                
                // Afficher les infos de texte
                showTextInfo: () => this.showTextInfo(),
                hideTextInfo: () => this.hideTextInfo(),
                
                // Tout afficher
                showAll: () => {
                    this.showComponentBorders();
                    this.showComponentCoords();
                    this.showTextInfo();
                },
                
                // Tout cacher
                hideAll: () => {
                    this.hideComponentBorders();
                    this.hideComponentCoords();
                    this.hideTextInfo();
                },
                
                // Overlay principal
                showOverlay: () => window.responsiveLayout?.showDebugOverlay(),
                hideOverlay: () => window.responsiveLayout?.hideDebugOverlay(),
                
                // Rapport complet
                report: () => this.generateReport(),
                
                // Vérifier la taille du canvas
                checkCanvasSize: () => this.checkCanvasSize()
            };
            
            console.log('🛠️ Debug utils chargés. Commandes disponibles:');
            console.log('  ResponsiveDebug.showBorders()');
            console.log('  ResponsiveDebug.showCoords()');
            console.log('  ResponsiveDebug.showTextInfo()');
            console.log('  ResponsiveDebug.showAll()');
            console.log('  ResponsiveDebug.hideAll()');
            console.log('  ResponsiveDebug.report()');
            console.log('  ResponsiveDebug.checkCanvasSize()');
        }
    }
    
    /**
     * ✅ Vérifier la taille du canvas (NOUVEAU)
     */
    checkCanvasSize() {
        const meta = {
            width: document.querySelector('meta[name="editor-canvas-width"]')?.content,
            height: document.querySelector('meta[name="editor-canvas-height"]')?.content
        };
        
        const canvas = document.querySelector('.canvas-container');
        const actual = canvas ? {
            width: canvas.offsetWidth,
            height: canvas.offsetHeight
        } : null;
        
        console.group('📐 Vérification taille canvas');
        console.log('Meta tags:', meta);
        console.log('Canvas actuel:', actual);
        
        if (meta.width && parseInt(meta.width) < 1900) {
            console.warn('⚠️ PROBLÈME: Canvas éditeur trop petit!');
            console.warn(`   Valeur actuelle: ${meta.width}px`);
            console.warn(`   Valeur attendue: ~1920px`);
            console.warn('   → La taille du canvas n\'a pas été sauvegardée correctement');
        }
        
        console.groupEnd();
        
        return { meta, actual };
    }
    
    /**
     * Afficher les contours des composants
     */
    showComponentBorders() {
        if (this.overlaysActive.has('borders')) return;
        
        const style = document.createElement('style');
        style.id = 'debug-borders';
        style.textContent = `
            .component {
                outline: 2px solid rgba(255, 0, 0, 0.5) !important;
                outline-offset: -2px;
            }
            
            .component::before {
                content: attr(id) " (" attr(data-type) ")";
                position: absolute;
                top: 0;
                left: 0;
                background: rgba(255, 0, 0, 0.8);
                color: white;
                padding: 2px 6px;
                font-size: 10px;
                font-family: monospace;
                z-index: 100000;
                pointer-events: none;
            }
            
            .component-text {
                outline-color: rgba(0, 255, 0, 0.5) !important;
            }
            
            .component-text::before {
                background: rgba(0, 255, 0, 0.8) !important;
            }
        `;
        
        document.head.appendChild(style);
        this.overlaysActive.add('borders');
        
        console.log('✅ Contours affichés (rouge = général, vert = texte)');
    }
    
    hideComponentBorders() {
        document.getElementById('debug-borders')?.remove();
        this.overlaysActive.delete('borders');
        console.log('❌ Contours masqués');
    }
    
    /**
     * Afficher les coordonnées des composants
     */
    showComponentCoords() {
        if (this.overlaysActive.has('coords')) return;
        
        document.querySelectorAll('.component').forEach(el => {
            const coords = document.createElement('div');
            coords.className = 'debug-coords';
            coords.style.cssText = `
                position: absolute;
                bottom: 0;
                right: 0;
                background: rgba(0, 0, 255, 0.8);
                color: white;
                padding: 4px 8px;
                font-size: 10px;
                font-family: monospace;
                z-index: 100000;
                pointer-events: none;
                border-radius: 3px 0 0 0;
            `;
            
            const x = parseFloat(el.style.left) || 0;
            const y = parseFloat(el.style.top) || 0;
            const w = parseFloat(el.style.width) || 0;
            const h = parseFloat(el.style.height) || 0;
            
            coords.textContent = `X:${x.toFixed(0)} Y:${y.toFixed(0)} W:${w.toFixed(0)} H:${h.toFixed(0)}`;
            el.appendChild(coords);
        });
        
        this.overlaysActive.add('coords');
        console.log('✅ Coordonnées affichées');
    }
    
    hideComponentCoords() {
        document.querySelectorAll('.debug-coords').forEach(el => el.remove());
        this.overlaysActive.delete('coords');
        console.log('❌ Coordonnées masquées');
    }
    
    /**
     * Afficher les infos de texte
     */
    showTextInfo() {
        if (this.overlaysActive.has('textinfo')) return;
        
        document.querySelectorAll('.component-text').forEach(el => {
            const textContent = el.querySelector('.text-content');
            if (!textContent) return;
            
            const info = document.createElement('div');
            info.className = 'debug-textinfo';
            info.style.cssText = `
                position: absolute;
                top: 0;
                right: 0;
                background: rgba(255, 165, 0, 0.9);
                color: white;
                padding: 4px 8px;
                font-size: 10px;
                font-family: monospace;
                z-index: 100001;
                pointer-events: none;
                max-width: 200px;
                border-radius: 0 0 0 3px;
            `;
            
            const fontSize = window.getComputedStyle(textContent).fontSize;
            const lineHeight = window.getComputedStyle(textContent).lineHeight;
            const textLength = textContent.textContent.length;
            const scrollHeight = textContent.scrollHeight;
            const clientHeight = textContent.clientHeight;
            const overflow = scrollHeight > clientHeight;
            
            info.innerHTML = `
                Font: ${fontSize}<br>
                Line: ${lineHeight}<br>
                Chars: ${textLength}<br>
                ${overflow ? '<strong style="color:#ff0;">⚠️ OVERFLOW!</strong>' : '✓ OK'}
            `;
            
            el.appendChild(info);
        });
        
        this.overlaysActive.add('textinfo');
        console.log('✅ Infos texte affichées');
    }
    
    hideTextInfo() {
        document.querySelectorAll('.debug-textinfo').forEach(el => el.remove());
        this.overlaysActive.delete('textinfo');
        console.log('❌ Infos texte masquées');
    }
    
    /**
     * Générer un rapport complet
     */
    generateReport() {
        const components = Array.from(document.querySelectorAll('.component'));
        const info = window.responsiveLayout?.getDebugInfo();
        
        console.group('📊 RAPPORT RESPONSIVE COMPLET');
        
        // Infos générales
        console.log('📐 Configuration:');
        console.table(info);
        
        // Vérification canvas
        const canvasCheck = this.checkCanvasSize();
        
        // Infos par composant
        console.log('\n📦 Composants:');
        const componentData = components.map(el => {
            const type = el.dataset.type;
            const x = parseFloat(el.style.left) || 0;
            const y = parseFloat(el.style.top) || 0;
            const w = parseFloat(el.style.width) || 0;
            const h = parseFloat(el.style.height) || 0;
            
            // Calculer si le texte overflow
            let overflow = false;
            if (type === 'text') {
                const textContent = el.querySelector('.text-content');
                if (textContent) {
                    overflow = textContent.scrollHeight > textContent.clientHeight;
                }
            }
            
            return {
                id: el.id,
                type,
                x: x.toFixed(0),
                y: y.toFixed(0),
                w: w.toFixed(0),
                h: h.toFixed(0),
                overflow: overflow ? '⚠️' : '✓'
            };
        });
        
        console.table(componentData);
        
        // Problèmes détectés
        const problems = [];
        
        if (canvasCheck.meta.width && parseInt(canvasCheck.meta.width) < 1900) {
            problems.push('Canvas éditeur trop petit (< 1900px)');
        }
        
        const overflowCount = componentData.filter(c => c.overflow === '⚠️').length;
        if (overflowCount > 0) {
            problems.push(`${overflowCount} composant(s) texte en overflow`);
        }
        
        if (info && info.ratio > 1.1) {
            problems.push('Ratio > 110% : écran plus grand que l\'éditeur (pas normal)');
        }
        
        if (problems.length > 0) {
            console.warn('\n⚠️ PROBLÈMES DÉTECTÉS:');
            problems.forEach((p, i) => console.warn(`  ${i + 1}. ${p}`));
        } else {
            console.log('\n✅ Aucun problème détecté');
        }
        
        console.groupEnd();
        
        return {
            info,
            components: componentData,
            problems
        };
    }
}

// Initialisation automatique
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        window.debugUtils = new ResponsiveDebugUtils();
    });
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ResponsiveDebugUtils;
}