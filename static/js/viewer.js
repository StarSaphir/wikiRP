// viewer.js - Script de consultation des pages wiki (refactorisé)

/**
 * État global du viewer
 */
const ViewerState = {
    currentNavMode: 'wiki', // 'wiki' ou 'page'
    pages: [],
    currentPage: null
};

/**
 * Classe principale du Viewer
 */
class WikiViewer {
    constructor() {
        this.state = ViewerState;
        this.init();
    }

    async init() {
        try {
            await this.loadNavigation();
            this.setupMobileWarning();
            this.setupEnhancements();
            this.setupAnimations();
            this.setupLazyLoading();
            this.setupSearch();
            this.setupThemeToggle();
            this.setupLinkPreviews();
            this.setupGalleries();
            
            console.log('✅ Wiki Viewer initialisé');
        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation:', error);
        }
    }

    /**
     * Chargement de la navigation depuis inventory.json
     */
    async loadNavigation() {
        try {
            const response = await fetch('../../data/inventory.json');
            const inventory = await response.json();
            this.state.pages = inventory;

            const navList = document.getElementById('nav-list');
            if (!navList) return;

            // Ajouter les boutons de navigation
            this.addNavigationControls();

            // Afficher la navigation wiki par défaut
            this.showWikiNav(inventory);

        } catch (error) {
            console.error('Erreur lors du chargement de la navigation:', error);
        }
    }

    /**
     * Ajouter les contrôles de navigation
     */
    addNavigationControls() {
        const sidebarHeader = document.querySelector('.sidebar-header');
        if (!sidebarHeader || document.getElementById('nav-toggle')) return;

        // Bouton retour à l'accueil
        const homeBtn = document.createElement('a');
        homeBtn.href = '../../wiki/';
        homeBtn.className = 'home-btn';
        homeBtn.innerHTML = '🏠 Retour à l\'accueil';
        sidebarHeader.appendChild(homeBtn);

        // Toggle Wiki / Sommaire
        const toggleContainer = document.createElement('div');
        toggleContainer.id = 'nav-toggle';
        toggleContainer.className = 'nav-toggle';
        toggleContainer.innerHTML = `
            <button class="nav-btn active" data-mode="wiki">🔗 Liens Wiki</button>
            <button class="nav-btn" data-mode="page">📄 Sommaire</button>
        `;
        sidebarHeader.appendChild(toggleContainer);

        // Événements des boutons
        toggleContainer.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchNavMode(btn.dataset.mode);
            });
        });
    }

    /**
     * Changer le mode de navigation
     */
    switchNavMode(mode) {
        this.state.currentNavMode = mode;

        // Mettre à jour les boutons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });

        // Afficher le contenu approprié
        if (mode === 'wiki') {
            this.showWikiNav(this.state.pages);
        } else {
            this.showPageNav();
        }
    }

    /**
     * Afficher la navigation Wiki (liste des pages)
     */
    showWikiNav(inventory) {
        const navList = document.getElementById('nav-list');
        navList.innerHTML = '';

        // Filtrer les pages cachées
        const visiblePages = inventory.filter(page => !page.hidden_from_nav);

        // Construire la liste des pages
        visiblePages.forEach(page => {
            const li = document.createElement('li');
            const a = document.createElement('a');

            a.href = `../${page.slug}/`;
            a.textContent = page.title;

            // Marquer la page actuelle
            if (window.location.pathname.includes(page.slug)) {
                a.classList.add('active');
                this.state.currentPage = page;
            }

            li.appendChild(a);
            navList.appendChild(li);
        });

        // Ajouter les liens trouvés dans la page actuelle
        this.addPageLinks(navList);
    }

    /**
     * Ajouter les liens internes de la page
     */
    addPageLinks(navList) {
        const pageLinks = document.querySelectorAll('.text-content a[href^="../"]');
        
        if (pageLinks.length === 0) return;

        // Séparateur
        const separator = document.createElement('li');
        separator.innerHTML = '<hr style="margin: 15px 0; border-color: #444;">';
        navList.appendChild(separator);

        // Titre de section
        const titleLi = document.createElement('li');
        titleLi.innerHTML = '<strong style="color: #4a9eff; font-size: 12px;">LIENS DANS CETTE PAGE</strong>';
        navList.appendChild(titleLi);

        // Liens uniques
        const addedLinks = new Set();
        pageLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (!addedLinks.has(href)) {
                addedLinks.add(href);

                const li = document.createElement('li');
                const a = document.createElement('a');
                a.href = href;
                a.textContent = '→ ' + link.textContent;
                a.style.fontSize = '13px';
                a.style.paddingLeft = '25px';

                li.appendChild(a);
                navList.appendChild(li);
            }
        });
    }

    /**
     * Afficher le sommaire de la page (titres H1, H2, H3)
     */
    showPageNav() {
        const navList = document.getElementById('nav-list');
        navList.innerHTML = '';

        // Extraire tous les titres de la page
        const headings = document.querySelectorAll('.text-content h1, .text-content h2, .text-content h3, .component-title h2');

        if (headings.length === 0) {
            navList.innerHTML = '<li style="color: #666; padding: 20px; text-align: center;">Aucun titre trouvé dans cette page</li>';
            return;
        }

        // Titre de section
        const titleLi = document.createElement('li');
        titleLi.innerHTML = '<strong style="color: #4a9eff; font-size: 12px;">SOMMAIRE DE LA PAGE</strong>';
        navList.appendChild(titleLi);

        // Liste des titres
        headings.forEach((heading, index) => {
            const li = document.createElement('li');
            const a = document.createElement('a');

            // Créer un ID si le titre n'en a pas
            if (!heading.id) {
                heading.id = `heading-${index}`;
            }

            a.href = `#${heading.id}`;
            a.textContent = heading.textContent;

            // Indentation selon le niveau
            const level = heading.tagName.toLowerCase();
            if (level === 'h2') a.style.paddingLeft = '15px';
            if (level === 'h3') a.style.paddingLeft = '30px';

            // Scroll smooth vers le titre
            a.addEventListener('click', (e) => {
                e.preventDefault();
                heading.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });

                // Highlight temporaire
                this.highlightElement(heading);
            });

            li.appendChild(a);
            navList.appendChild(li);
        });
    }

    /**
     * Surligner temporairement un élément
     */
    highlightElement(element) {
        const originalBg = element.style.background;
        element.style.background = 'rgba(74, 158, 255, 0.2)';
        element.style.transition = 'background 0.3s';

        setTimeout(() => {
            element.style.background = originalBg;
            setTimeout(() => {
                element.style.transition = '';
            }, 300);
        }, 1500);
    }

    /**
     * Détection mobile et affichage avertissement
     */
    setupMobileWarning() {
        const isMobile = window.innerWidth <= 768;
        const mobileWarning = document.getElementById('mobile-warning');

        if (isMobile && mobileWarning) {
            // Vérifier si l'utilisateur a déjà vu l'avertissement
            const hasSeenWarning = sessionStorage.getItem('mobile-warning-seen');

            if (!hasSeenWarning) {
                mobileWarning.style.display = 'flex';

                // Marquer comme vu
                const continueBtn = mobileWarning.querySelector('button');
                if (continueBtn) {
                    continueBtn.addEventListener('click', () => {
                        sessionStorage.setItem('mobile-warning-seen', 'true');
                        mobileWarning.style.display = 'none';
                    });
                }
            }
        }

        // Réafficher si on passe en mode mobile
        window.addEventListener('resize', () => {
            if (window.innerWidth <= 768 && !sessionStorage.getItem('mobile-warning-seen')) {
                if (mobileWarning) mobileWarning.style.display = 'flex';
            }
        });
    }

    /**
     * Amélioration des liens
     */
    setupEnhancements() {
        const links = document.querySelectorAll('.text-content a');

        links.forEach(link => {
            // Liens externes : target="_blank"
            if (link.hostname && link.hostname !== window.location.hostname) {
                link.setAttribute('target', '_blank');
                link.setAttribute('rel', 'noopener noreferrer');
            }

            // Effet hover
            link.addEventListener('mouseenter', () => {
                link.style.textDecoration = 'underline';
            });

            link.addEventListener('mouseleave', () => {
                link.style.textDecoration = 'none';
            });
        });
    }

    /**
     * Animations au scroll
     */
    setupAnimations() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        document.querySelectorAll('.component').forEach(component => {
            component.style.opacity = '0';
            component.style.transform = 'translateY(20px)';
            component.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
            observer.observe(component);
        });
    }

    /**
     * Lazy loading des images
     */
    setupLazyLoading() {
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        imageObserver.unobserve(img);
                    }
                }
            });
        }, {
            rootMargin: '50px'
        });

        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }

    /**
     * Recherche dans la sidebar
     */
    setupSearch() {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;

        // Créer l'input de recherche
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = '🔍 Rechercher une page...';
        searchInput.style.cssText = `
            width: 100%;
            padding: 10px;
            margin-bottom: 20px;
            background: #333;
            border: 1px solid #444;
            color: #e0e0e0;
            border-radius: 5px;
            font-size: 14px;
            transition: border-color 0.3s;
        `;

        searchInput.addEventListener('focus', () => {
            searchInput.style.borderColor = '#4a9eff';
        });

        searchInput.addEventListener('blur', () => {
            searchInput.style.borderColor = '#444';
        });

        sidebar.insertBefore(searchInput, sidebar.querySelector('.sidebar-nav'));

        // Filtrage en temps réel
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const links = document.querySelectorAll('.sidebar-nav a');

            links.forEach(link => {
                const text = link.textContent.toLowerCase();
                const li = link.parentElement;

                if (text.includes(searchTerm)) {
                    li.style.display = 'block';
                    
                    // Highlight du terme
                    if (searchTerm) {
                        const regex = new RegExp(`(${searchTerm})`, 'gi');
                        const originalText = link.textContent;
                        link.innerHTML = originalText.replace(regex, '<mark style="background: rgba(74, 158, 255, 0.3); padding: 2px 4px; border-radius: 2px;">$1</mark>');
                    } else {
                        link.textContent = link.textContent;
                    }
                } else {
                    li.style.display = 'none';
                }
            });

            // Message si aucun résultat
            const visibleLinks = Array.from(links).filter(link => 
                link.parentElement.style.display !== 'none'
            );

            let noResults = sidebar.querySelector('.no-results');
            if (visibleLinks.length === 0 && searchTerm) {
                if (!noResults) {
                    noResults = document.createElement('div');
                    noResults.className = 'no-results';
                    noResults.style.cssText = `
                        color: #666;
                        text-align: center;
                        padding: 20px;
                        font-size: 14px;
                    `;
                    noResults.textContent = 'Aucune page trouvée';
                    sidebar.querySelector('.sidebar-nav').appendChild(noResults);
                }
            } else if (noResults) {
                noResults.remove();
            }
        });
    }

    /**
     * Toggle thème clair/sombre
     */
    setupThemeToggle() {
        const themeToggle = document.createElement('button');
        themeToggle.innerHTML = '🌙';
        themeToggle.title = 'Changer de thème';
        themeToggle.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: #4a9eff;
            border: none;
            color: white;
            font-size: 24px;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 1000;
            transition: transform 0.2s, box-shadow 0.2s;
        `;

        themeToggle.addEventListener('mouseenter', () => {
            themeToggle.style.transform = 'scale(1.1)';
            themeToggle.style.boxShadow = '0 6px 16px rgba(0,0,0,0.4)';
        });

        themeToggle.addEventListener('mouseleave', () => {
            themeToggle.style.transform = 'scale(1)';
            themeToggle.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
        });

        document.body.appendChild(themeToggle);

        // Récupérer le thème sauvegardé
        const savedTheme = localStorage.getItem('wiki-theme');
        if (savedTheme === 'light') {
            document.body.classList.add('light-theme');
            themeToggle.innerHTML = '☀️';
        }

        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('light-theme');
            const isLight = document.body.classList.contains('light-theme');
            themeToggle.innerHTML = isLight ? '☀️' : '🌙';
            localStorage.setItem('wiki-theme', isLight ? 'light' : 'dark');
        });
    }

    /**
     * Preview des liens internes au hover
     */
    setupLinkPreviews() {
        const internalLinks = document.querySelectorAll('.text-content a[href^="../"]');

        internalLinks.forEach(link => {
            link.addEventListener('mouseenter', (e) => this.showLinkPreview(e, link));
            link.addEventListener('mouseleave', () => this.hideLinkPreview());
        });
    }

    /**
     * Afficher la preview d'un lien
     */
    async showLinkPreview(e, link) {
        const href = link.getAttribute('href');

        // Extraire le slug
        const match = href.match(/\.\.\/([^\/]+)\//);
        if (!match) return;

        const targetSlug = match[1];

        // Créer ou récupérer la preview
        let preview = document.getElementById('link-preview');
        if (!preview) {
            preview = document.createElement('div');
            preview.id = 'link-preview';
            preview.className = 'link-preview';
            document.body.appendChild(preview);
        }

        preview.innerHTML = '<div class="preview-loading">Chargement...</div>';
        preview.style.display = 'block';

        // Positionner la preview
        this.positionPreview(preview, link);

        try {
            // Charger le contenu
            const response = await fetch(href);
            const html = await response.text();

            // Parser
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // Extraire les infos
            const title = doc.querySelector('title')?.textContent || targetSlug;
            const textContents = doc.querySelectorAll('.text-content');
            
            let previewText = '';
            for (let content of textContents) {
                const text = content.textContent.trim();
                if (text.length > 50) {
                    previewText = text.substring(0, 200) + '...';
                    break;
                }
            }

            if (!previewText) {
                previewText = 'Aucun aperçu disponible';
            }

            // Afficher
            preview.innerHTML = `
                <div class="preview-header">
                    <strong>${this.escapeHtml(title)}</strong>
                </div>
                <div class="preview-content">
                    ${this.escapeHtml(previewText)}
                </div>
                <div class="preview-footer">
                    Cliquez pour ouvrir →
                </div>
            `;

        } catch (error) {
            preview.innerHTML = `
                <div class="preview-error">
                    Impossible de charger l'aperçu
                </div>
            `;
        }
    }

    /**
     * Positionner la preview
     */
    positionPreview(preview, link) {
        const rect = link.getBoundingClientRect();
        const previewWidth = 350;
        
        let left = rect.left + (rect.width / 2) - (previewWidth / 2);
        let top = rect.bottom + 10;

        // Ajustements viewport
        if (left + previewWidth > window.innerWidth - 20) {
            left = window.innerWidth - previewWidth - 20;
        }
        if (left < 20) {
            left = 20;
        }

        // Si dépasse en bas, afficher au-dessus
        if (top + 200 > window.innerHeight) {
            top = rect.top - 210;
        }

        preview.style.left = left + 'px';
        preview.style.top = top + 'px';
        preview.style.width = previewWidth + 'px';
    }

    /**
     * Cacher la preview
     */
    hideLinkPreview() {
        const preview = document.getElementById('link-preview');
        if (preview) {
            preview.style.display = 'none';
        }
    }

    /**
     * Escape HTML pour sécurité
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Gestion des galeries d'images
     */
    setupGalleries() {
        const galleries = document.querySelectorAll('.gallery-viewer');

        galleries.forEach(gallery => {
            const images = gallery.querySelectorAll('.gallery-img');
            const prevBtn = gallery.querySelector('.gallery-prev');
            const nextBtn = gallery.querySelector('.gallery-next');
            const dots = gallery.querySelectorAll('.gallery-dot');
            let currentIndex = 0;

            // Fonction d'affichage
            const showImage = (index) => {
                images.forEach(img => img.style.display = 'none');
                dots.forEach(dot => dot.classList.remove('active'));

                if (images[index]) {
                    images[index].style.display = 'block';
                    if (dots[index]) dots[index].classList.add('active');
                    currentIndex = index;
                }
            };

            // Navigation
            if (prevBtn) {
                prevBtn.addEventListener('click', () => {
                    const newIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1;
                    showImage(newIndex);
                });
            }

            if (nextBtn) {
                nextBtn.addEventListener('click', () => {
                    const newIndex = currentIndex === images.length - 1 ? 0 : currentIndex + 1;
                    showImage(newIndex);
                });
            }

            // Dots
            dots.forEach(dot => {
                dot.addEventListener('click', () => {
                    const index = parseInt(dot.dataset.index);
                    showImage(index);
                });
            });

            // Clavier (flèches)
            document.addEventListener('keydown', (e) => {
                if (!this.isGalleryVisible(gallery)) return;

                if (e.key === 'ArrowLeft') {
                    prevBtn?.click();
                } else if (e.key === 'ArrowRight') {
                    nextBtn?.click();
                }
            });

            // Touch swipe (mobile)
            this.setupSwipe(gallery, (direction) => {
                if (direction === 'left') nextBtn?.click();
                if (direction === 'right') prevBtn?.click();
            });
        });
    }

    /**
     * Vérifier si la galerie est visible
     */
    isGalleryVisible(gallery) {
        const rect = gallery.getBoundingClientRect();
        return rect.top < window.innerHeight && rect.bottom > 0;
    }

    /**
     * Setup swipe pour mobile
     */
    setupSwipe(element, callback) {
        let touchStartX = 0;
        let touchEndX = 0;

        element.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        element.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            const diff = touchStartX - touchEndX;

            if (Math.abs(diff) > 50) {
                callback(diff > 0 ? 'left' : 'right');
            }
        }, { passive: true });
    }
}

// Initialisation au chargement
document.addEventListener('DOMContentLoaded', () => {
    window.wikiViewer = new WikiViewer();
});

// Export pour utilisation externe
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WikiViewer;
}