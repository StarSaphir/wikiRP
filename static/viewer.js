// Mode de navigation
let currentNavMode = 'wiki'; // 'wiki' ou 'page'

// Chargement de la navigation depuis inventory.json
async function loadNavigation() {
    try {
        const response = await fetch('../../data/inventory.json');
        const inventory = await response.json();
        
        const navList = document.getElementById('nav-list');
        if (!navList) return;
        
        // Ajouter les boutons de toggle
        const sidebarHeader = document.querySelector('.sidebar-header');
        if (sidebarHeader && !document.getElementById('nav-toggle')) {
            // Bouton retour à l'accueil
            const homeBtn = document.createElement('a');
            homeBtn.href = '../../wiki/';
            homeBtn.className = 'home-btn';
            homeBtn.innerHTML = '🏠 Retour à l\'accueil';
            sidebarHeader.appendChild(homeBtn);
            
            const toggleContainer = document.createElement('div');
            toggleContainer.id = 'nav-toggle';
            toggleContainer.className = 'nav-toggle';
            toggleContainer.innerHTML = `
                <button class="nav-btn active" data-mode="wiki">🔗 Liens Wiki</button>
                <button class="nav-btn" data-mode="page">📄 Sommaire</button>
            `;
            sidebarHeader.appendChild(toggleContainer);
            
            // Événements
            toggleContainer.querySelectorAll('.nav-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    toggleContainer.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    currentNavMode = btn.dataset.mode;
                    if (currentNavMode === 'wiki') {
                        showWikiNav(inventory);
                    } else {
                        showPageNav();
                    }
                });
            });
        }
        
        // Afficher la navigation wiki par défaut
        showWikiNav(inventory);
        
    } catch (error) {
        console.error('Erreur lors du chargement de la navigation:', error);
    }
}

function showWikiNav(inventory) {
    const navList = document.getElementById('nav-list');
    navList.innerHTML = '';
    
    // Filtrer les pages cachées
    const visiblePages = inventory.filter(page => !page.hidden_from_nav);
    
    // Construire la navigation des pages
    visiblePages.forEach(page => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        
        a.href = `../${page.slug}/`;
        a.textContent = page.title;
        
        if (window.location.pathname.includes(page.slug)) {
            a.classList.add('active');
        }
        
        li.appendChild(a);
        navList.appendChild(li);
    });
    
    // Ajouter les liens trouvés dans la page actuelle
    const pageLinks = document.querySelectorAll('.text-content a[href^="../"]');
    if (pageLinks.length > 0) {
        const separator = document.createElement('li');
        separator.innerHTML = '<hr style="margin: 15px 0; border-color: #444;">';
        navList.appendChild(separator);
        
        const titleLi = document.createElement('li');
        titleLi.innerHTML = '<strong style="color: #4a9eff; font-size: 12px;">Liens dans cette page</strong>';
        navList.appendChild(titleLi);
        
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
}

function showPageNav() {
    const navList = document.getElementById('nav-list');
    navList.innerHTML = '';
    
    // Extraire tous les titres de la page
    const headings = document.querySelectorAll('.text-content h1, .text-content h2, .text-content h3, .component-title h2');
    
    if (headings.length === 0) {
        navList.innerHTML = '<li style="color: #666; padding: 20px;">Aucun titre trouvé dans cette page</li>';
        return;
    }
    
    const titleLi = document.createElement('li');
    titleLi.innerHTML = '<strong style="color: #4a9eff; font-size: 12px;">SOMMAIRE DE LA PAGE</strong>';
    navList.appendChild(titleLi);
    
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
        
        a.addEventListener('click', (e) => {
            e.preventDefault();
            heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        
        li.appendChild(a);
        navList.appendChild(li);
    });
}

// Détection mobile et affichage de l'avertissement
function checkMobile() {
    const isMobile = window.innerWidth <= 768;
    const mobileWarning = document.getElementById('mobile-warning');
    
    if (isMobile && mobileWarning) {
        // Vérifier si l'utilisateur a déjà fermé l'avertissement
        const hasSeenWarning = sessionStorage.getItem('mobile-warning-seen');
        
        if (!hasSeenWarning) {
            mobileWarning.style.display = 'flex';
            
            // Marquer comme vu quand l'utilisateur clique sur "Continuer"
            const continueBtn = mobileWarning.querySelector('button');
            if (continueBtn) {
                continueBtn.addEventListener('click', () => {
                    sessionStorage.setItem('mobile-warning-seen', 'true');
                    mobileWarning.style.display = 'none';
                });
            }
        }
    }
}

// Amélioration des liens internes
function enhanceLinks() {
    const links = document.querySelectorAll('.text-content a');
    
    links.forEach(link => {
        // Ajouter target="_blank" pour les liens externes seulement
        if (link.hostname && link.hostname !== window.location.hostname) {
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer');
            // Ne plus ajouter d'emoji
        }
    });
}

// Animations au scroll
function setupScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, {
        threshold: 0.1
    });
    
    document.querySelectorAll('.component').forEach(component => {
        component.style.opacity = '0';
        component.style.transform = 'translateY(20px)';
        component.style.transition = 'opacity 0.5s, transform 0.5s';
        observer.observe(component);
    });
}

// Gestion des images lazy loading
function setupLazyLoading() {
    const images = document.querySelectorAll('img[data-src]');
    
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                imageObserver.unobserve(img);
            }
        });
    });
    
    images.forEach(img => imageObserver.observe(img));
}

// Recherche dans la sidebar
function setupSearch() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    
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
    `;
    
    sidebar.insertBefore(searchInput, sidebar.querySelector('.sidebar-nav'));
    
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const links = document.querySelectorAll('.sidebar-nav a');
        
        links.forEach(link => {
            const text = link.textContent.toLowerCase();
            const li = link.parentElement;
            
            if (text.includes(searchTerm)) {
                li.style.display = 'block';
            } else {
                li.style.display = 'none';
            }
        });
    });
}

// Gestion du mode sombre/clair (optionnel)
function setupThemeToggle() {
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
        transition: transform 0.2s;
    `;
    
    themeToggle.addEventListener('mouseenter', () => {
        themeToggle.style.transform = 'scale(1.1)';
    });
    
    themeToggle.addEventListener('mouseleave', () => {
        themeToggle.style.transform = 'scale(1)';
    });
    
    document.body.appendChild(themeToggle);
    
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('light-theme');
        themeToggle.innerHTML = document.body.classList.contains('light-theme') ? '☀️' : '🌙';
    });
}

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    loadNavigation();
    checkMobile();
    enhanceLinks();
    setupScrollAnimations();
    setupLazyLoading();
    setupSearch();
    setupThemeToggle();
    setupLinkPreviews();
    setupGalleries();
});

// Gestion des galeries d'images
function setupGalleries() {
    const galleries = document.querySelectorAll('.gallery-viewer');
    
    galleries.forEach(gallery => {
        const images = gallery.querySelectorAll('.gallery-img');
        const prevBtn = gallery.querySelector('.gallery-prev');
        const nextBtn = gallery.querySelector('.gallery-next');
        const dots = gallery.querySelectorAll('.gallery-dot');
        let currentIndex = 0;
        
        function showImage(index) {
            images.forEach(img => img.style.display = 'none');
            dots.forEach(dot => dot.classList.remove('active'));
            
            if (images[index]) {
                images[index].style.display = 'block';
                if (dots[index]) dots[index].classList.add('active');
                currentIndex = index;
            }
        }
        
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
        
        dots.forEach(dot => {
            dot.addEventListener('click', () => {
                const index = parseInt(dot.dataset.index);
                showImage(index);
            });
        });
    });
}

// Gestion du redimensionnement de fenêtre
window.addEventListener('resize', () => {
    checkMobile();
});

// Preview des liens internes
function setupLinkPreviews() {
    const internalLinks = document.querySelectorAll('.text-content a[href^="../"]');
    
    internalLinks.forEach(link => {
        link.addEventListener('mouseenter', (e) => showLinkPreview(e, link));
        link.addEventListener('mouseleave', hideLinkPreview);
    });
}

async function showLinkPreview(e, link) {
    const href = link.getAttribute('href');
    
    // Extraire le slug de la page depuis l'URL
    const match = href.match(/\.\.\/([^\/]+)\//);
    if (!match) return;
    
    const targetSlug = match[1];
    
    // Créer la preview
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
    const rect = link.getBoundingClientRect();
    const previewWidth = 350;
    let left = rect.left + (rect.width / 2) - (previewWidth / 2);
    let top = rect.bottom + 10;
    
    // Ajuster si dépasse à droite
    if (left + previewWidth > window.innerWidth - 20) {
        left = window.innerWidth - previewWidth - 20;
    }
    // Ajuster si dépasse à gauche
    if (left < 20) {
        left = 20;
    }
    
    preview.style.left = left + 'px';
    preview.style.top = top + 'px';
    preview.style.width = previewWidth + 'px';
    
    try {
        // Charger le contenu de la page cible
        const response = await fetch(href);
        const html = await response.text();
        
        // Parser le HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Extraire le titre
        const title = doc.querySelector('title')?.textContent || targetSlug;
        
        // Extraire le premier texte significatif
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
        
        // Afficher la preview
        preview.innerHTML = `
            <div class="preview-header">
                <strong>${title}</strong>
            </div>
            <div class="preview-content">
                ${previewText}
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

function hideLinkPreview() {
    const preview = document.getElementById('link-preview');
    if (preview) {
        preview.style.display = 'none';
    }
}