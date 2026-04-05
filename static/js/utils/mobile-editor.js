// utils/mobile-editor.js - Mode design mobile dans l'éditeur
//
// Comportement :
//   - Bascule le canvas à 390px (iPhone 14) avec un encadré visuel
//   - Copie automatique du layout desktop comme point de départ
//     (composants copiés, repositionnés en colonne selon leur ordre Y+X)
//   - Le layout mobile est sauvegardé séparément (layout-mobile.json)
//   - Composants ajoutés en mode mobile : marqués mobile_only=true
//     → générés avec class="mobile-only" → display:none sur desktop
//   - Dans le viewer : écran < 768px → layout mobile si défini, sinon fallback desktop

export const MOBILE_CANVAS_WIDTH = 390;
export const MOBILE_BREAKPOINT   = 768;

export class MobileEditor {
    constructor(state, canvasModule, options = {}) {
        this.state        = state;
        this.canvas       = canvasModule;
        this.onSave       = options.onSave       || (() => {});
        this.onModeChange = options.onModeChange || (() => {});

        this.isMobileMode    = false;
        this.desktopSnapshot = null;
        this.desktopWidth    = 1400;

        this._injectStyles();
    }

    get active() { return this.isMobileMode; }

    async toggle(currentComponents) {
        if (this.isMobileMode) {
            await this._switchToDesktop(currentComponents);
        } else {
            await this._switchToMobile(currentComponents);
        }
    }

    // ── Switch desktop → mobile ───────────────────────────────────────────────

    async _switchToMobile(desktopComponents) {
        this.desktopSnapshot = JSON.parse(JSON.stringify(desktopComponents));
        const canvasEl = this._canvasEl();
        this.desktopWidth = canvasEl ? canvasEl.offsetWidth : 1400;

        const existing = await this._fetchMobileLayout();

        let mobileComponents;
        if (existing && existing.length > 0) {
            mobileComponents = existing;
            console.log(`📱 Layout mobile existant chargé (${existing.length} composants)`);
        } else {
            mobileComponents = this._buildInitialMobileLayout(desktopComponents);
            console.log(`📱 Layout mobile initialisé depuis desktop (${mobileComponents.length} composants)`);
        }

        this._applyCanvasStyle(MOBILE_CANVAS_WIDTH);
        document.body.classList.add('mobile-design-mode');

        this.state.importState({ components: mobileComponents });
        this.canvas.renderAll();

        this.isMobileMode = true;
        this.onModeChange('mobile');
        this._updateBanner('mobile');
        this._updateButton(true);
    }

    // ── Switch mobile → desktop ───────────────────────────────────────────────

    async _switchToDesktop(mobileComponents) {
        await this.onSave('mobile', mobileComponents);

        this._applyCanvasStyle(this.desktopWidth);
        document.body.classList.remove('mobile-design-mode');

        this.state.importState({ components: this.desktopSnapshot });
        this.canvas.renderAll();

        this.isMobileMode = false;
        this.onModeChange('desktop');
        this._updateBanner('desktop');
        this._updateButton(false);
    }

    // ── Construction du layout mobile initial ─────────────────────────────────

    _buildInitialMobileLayout(components) {
        if (!components.length) return [];

        const CANVAS_W  = MOBILE_CANVAS_WIDTH;
        const CONTENT_W = CANVAS_W - 20;
        const MARGIN_X  = 10;
        const GAP       = 14;
        const wRatio    = CONTENT_W / this.desktopWidth;

        const sorted = [...components].sort((a, b) => {
            const yDiff = a.y - b.y;
            return Math.abs(yDiff) > 30 ? yDiff : a.x - b.x;
        });

        const rows   = this._groupIntoRows(sorted);
        const result = [];
        let curY     = MARGIN_X;

        for (const row of rows) {
            if (row.length === 1) {
                const comp = row[0];
                const newH = this._scaleHeight(comp, wRatio);
                result.push({ ...comp, x: MARGIN_X, y: curY, w: CONTENT_W, h: newH });
                curY += newH + GAP;

            } else if (row.length === 2) {
                const halfW = Math.floor((CONTENT_W - GAP) / 2);
                let maxH = 0;
                row.forEach((comp, i) => {
                    const newH = this._scaleHeight(comp, wRatio);
                    result.push({ ...comp, x: MARGIN_X + i * (halfW + GAP), y: curY, w: halfW, h: newH });
                    maxH = Math.max(maxH, newH);
                });
                curY += maxH + GAP;

            } else {
                // 3+ composants superposés → trier par Z et empiler
                const byZ = [...row].sort((a, b) => (a.z || 0) - (b.z || 0));
                for (const comp of byZ) {
                    const newH = this._scaleHeight(comp, wRatio);
                    result.push({ ...comp, x: MARGIN_X, y: curY, w: CONTENT_W, h: newH });
                    curY += newH + GAP;
                }
            }
        }

        return result;
    }

    _groupIntoRows(sortedComponents) {
        const rows     = [];
        const assigned = new Set();

        for (const comp of sortedComponents) {
            if (assigned.has(comp.id)) continue;
            const row = [comp];
            assigned.add(comp.id);

            for (const other of sortedComponents) {
                if (assigned.has(other.id)) continue;
                if (this._yOverlapRatio(comp, other) > 0.4) {
                    row.push(other);
                    assigned.add(other.id);
                }
            }
            rows.push(row);
        }
        return rows;
    }

    _yOverlapRatio(a, b) {
        const top    = Math.max(a.y, b.y);
        const bottom = Math.min(a.y + a.h, b.y + b.h);
        if (bottom <= top) return 0;
        return (bottom - top) / Math.min(a.h, b.h);
    }

    _scaleHeight(comp, wRatio) {
        const factors = { text: 1.5, table: 1.3, image: 1.0, gallery: 1.0, video: 1.0, youtube: 1.0, shape: 1.0, separator: 1.0 };
        const mins    = { text: 60,  table: 80,  image: 80,  gallery: 150, video: 150, youtube: 150, shape: 30, separator: 4 };
        return Math.max(mins[comp.type] ?? 40, Math.round(comp.h * wRatio * (factors[comp.type] ?? 1.0)));
    }

    // ── Serveur ───────────────────────────────────────────────────────────────

    async _fetchMobileLayout() {
        try {
            const res = await fetch(`/api/pages/${window.SLUG}/layout-mobile`);
            if (!res.ok) return null;
            const data = await res.json();
            return Array.isArray(data) ? data : null;
        } catch (e) {
            console.warn('⚠️ Chargement layout mobile échoué:', e);
            return null;
        }
    }

    // ── DOM helpers ───────────────────────────────────────────────────────────

    _canvasEl() {
        return document.getElementById('canvas-inner') || document.getElementById('canvas');
    }

    _applyCanvasStyle(width) {
        const el = this._canvasEl();
        if (!el) return;

        if (width === MOBILE_CANVAS_WIDTH) {
            el.style.width        = `${width}px`;
            el.style.maxWidth     = `${width}px`;
            el.style.margin       = '0 auto';
            el.style.border       = '2px solid #4a9eff';
            el.style.borderRadius = '20px';
            el.style.boxShadow    = '0 0 0 10px rgba(74,158,255,0.12), 0 12px 40px rgba(0,0,0,0.5)';
        } else {
            el.style.width        = '';
            el.style.maxWidth     = '';
            el.style.margin       = '';
            el.style.border       = '';
            el.style.borderRadius = '';
            el.style.boxShadow    = '';
        }
    }

    _updateButton(active) {
        const btn = document.getElementById('mobile-design-btn');
        if (!btn) return;
        btn.classList.toggle('active', active);
        btn.title = active ? 'Quitter le mode mobile (sauvegarde auto)' : 'Passer en mode design mobile';
        const label = btn.querySelector('.btn-label');
        if (label) label.textContent = active ? '🖥️ Mode desktop' : '📱 Design mobile';
    }

    _updateBanner(mode) {
        let banner = document.getElementById('mobile-editor-banner');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'mobile-editor-banner';
            Object.assign(banner.style, {
                position: 'fixed', bottom: '20px', left: '50%',
                transform: 'translateX(-50%)', zIndex: '50000',
                padding: '10px 22px', borderRadius: '20px',
                fontSize: '13px', fontWeight: 'bold',
                pointerEvents: 'none', letterSpacing: '0.4px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                transition: 'opacity 0.3s'
            });
            document.body.appendChild(banner);
        }

        if (mode === 'mobile') {
            banner.textContent      = '📱 Mode design mobile — canvas 390px (iPhone 14)';
            banner.style.background = '#4a9eff';
            banner.style.color      = 'white';
            banner.style.opacity    = '1';
        } else {
            banner.style.opacity = '0';
            setTimeout(() => { if (banner) banner.textContent = ''; }, 320);
        }
    }

    _injectStyles() {
        if (document.getElementById('mobile-editor-styles')) return;
        const style = document.createElement('style');
        style.id = 'mobile-editor-styles';
        style.textContent = `
            body.mobile-design-mode .canvas-scroll,
            body.mobile-design-mode .editor-canvas-wrapper,
            body.mobile-design-mode #canvas-wrapper {
                background-image: repeating-linear-gradient(
                    -45deg,
                    transparent, transparent 10px,
                    rgba(74,158,255,0.05) 10px, rgba(74,158,255,0.05) 20px
                );
            }
            #mobile-design-btn.active {
                background: #4a9eff !important;
                color: white !important;
                border-color: #4a9eff !important;
            }
            #mobile-design-btn.active:hover { background: #3a8eff !important; }
        `;
        document.head.appendChild(style);
    }
}