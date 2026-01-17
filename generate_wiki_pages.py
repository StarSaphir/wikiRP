#!/usr/bin/env python3
"""
generate_wiki_pages.py - Générateur AUTONOME de pages statiques
N'a AUCUNE dépendance avec Flask/app.py
Peut être appelé directement ou par app.py
"""

import json
import random
from pathlib import Path
from datetime import datetime

# Configuration des chemins (relatifs au script)
BASE_DIR = Path(__file__).parent
PAGES_DIR = BASE_DIR / 'pages'
DATA_DIR = BASE_DIR / 'data'
WIKI_DIR = BASE_DIR / 'wiki'

def load_inventory():
    """Charge l'inventaire des pages"""
    inventory_file = DATA_DIR / 'inventory.json'
    try:
        with open(inventory_file, 'r', encoding='utf-8') as f:
            content = f.read().strip()
            return json.loads(content) if content else []
    except Exception as e:
        print(f"⚠️ Erreur chargement inventory: {e}")
        return []

def load_metadata():
    """Charge les métadonnées des pages"""
    metadata_file = DATA_DIR / 'pages-metadata.json'
    try:
        with open(metadata_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"⚠️ Erreur chargement metadata: {e}")
        return {}

def generate_wiki_home():
    """
    Génère la page d'accueil du wiki (/wiki/index.html)
    Cette page liste toutes les pages disponibles
    """
    print("\n📝 Génération de /wiki/index.html...")
    
    inventory = load_inventory()
    visible_pages = [p for p in inventory if not p.get('hidden_from_nav', False)]
    pages_metadata = load_metadata()
    
    page_count = len(visible_pages)
    
    # Template HTML complet avec CSS inline
    html = f'''<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>📚 Wiki - Accueil</title>
    <meta name="description" content="Explorez toutes les pages du wiki - {page_count} pages disponibles">
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
            color: #e0e0e0;
            min-height: 100vh;
            overflow-x: hidden;
        }}
        
        .particles {{
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            z-index: 0;
            pointer-events: none;
        }}
        
        .particle {{
            position: absolute;
            background: rgba(74, 158, 255, 0.3);
            border-radius: 50%;
            animation: float 20s infinite;
        }}
        
        @keyframes float {{
            0%, 100% {{ transform: translateY(0) translateX(0); opacity: 0; }}
            10% {{ opacity: 0.5; }}
            90% {{ opacity: 0.5; }}
            100% {{ transform: translateY(-100vh) translateX(50px); opacity: 0; }}
        }}
        
        .container {{
            position: relative;
            z-index: 1;
            max-width: 1400px;
            margin: 0 auto;
            padding: 60px 20px;
        }}
        
        .header {{
            text-align: center;
            margin-bottom: 80px;
            animation: fadeInDown 1s ease-out;
        }}
        
        @keyframes fadeInDown {{
            from {{
                opacity: 0;
                transform: translateY(-50px);
            }}
            to {{
                opacity: 1;
                transform: translateY(0);
            }}
        }}
        
        .header h1 {{
            font-size: clamp(36px, 8vw, 64px);
            background: linear-gradient(135deg, #4a9eff 0%, #667eea 50%, #f093fb 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 20px;
            font-weight: 800;
            letter-spacing: -1px;
        }}
        
        .header p {{
            font-size: clamp(16px, 3vw, 24px);
            color: #999;
            font-weight: 300;
        }}
        
        .stats {{
            display: flex;
            justify-content: center;
            gap: 30px;
            margin-top: 40px;
            flex-wrap: wrap;
        }}
        
        .stat-badge {{
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 15px 30px;
            border-radius: 50px;
            display: flex;
            align-items: center;
            gap: 12px;
            transition: all 0.3s;
        }}
        
        .stat-badge:hover {{
            background: rgba(74, 158, 255, 0.1);
            border-color: rgba(74, 158, 255, 0.3);
            transform: translateY(-3px);
        }}
        
        .stat-number {{
            font-size: 28px;
            font-weight: 700;
            background: linear-gradient(135deg, #4a9eff, #667eea);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }}
        
        .stat-label {{
            font-size: 14px;
            color: #999;
            text-transform: uppercase;
            letter-spacing: 1px;
        }}
        
        .pages-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 30px;
            animation: fadeInUp 1s ease-out 0.3s both;
        }}
        
        @keyframes fadeInUp {{
            from {{
                opacity: 0;
                transform: translateY(50px);
            }}
            to {{
                opacity: 1;
                transform: translateY(0);
            }}
        }}
        
        .page-card {{
            position: relative;
            background: rgba(255, 255, 255, 0.03);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            padding: 35px;
            text-decoration: none;
            display: block;
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            overflow: hidden;
        }}
        
        .page-card::before {{
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #4a9eff, #667eea, #f093fb);
            transform: scaleX(0);
            transform-origin: left;
            transition: transform 0.4s ease;
        }}
        
        .page-card:hover::before {{
            transform: scaleX(1);
        }}
        
        .page-card:hover {{
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(74, 158, 255, 0.4);
            transform: translateY(-8px) scale(1.02);
            box-shadow: 0 20px 60px rgba(74, 158, 255, 0.2);
        }}
        
        .page-icon {{
            font-size: 48px;
            margin-bottom: 20px;
            display: inline-block;
            transition: all 0.3s;
        }}
        
        .page-card:hover .page-icon {{
            transform: scale(1.2) rotate(5deg);
        }}
        
        .page-title {{
            font-size: 26px;
            color: #e0e0e0;
            margin-bottom: 15px;
            font-weight: 700;
            line-height: 1.3;
        }}
        
        .page-preview {{
            font-size: 14px;
            color: #999;
            line-height: 1.6;
            margin-bottom: 20px;
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }}
        
        .page-slug {{
            font-size: 12px;
            color: #666;
            font-family: 'Courier New', monospace;
            background: rgba(255, 255, 255, 0.05);
            padding: 6px 12px;
            border-radius: 6px;
            display: inline-block;
        }}
        
        .page-meta {{
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
        }}
        
        .read-more {{
            color: #4a9eff;
            font-size: 14px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.3s;
        }}
        
        .page-card:hover .read-more {{
            gap: 12px;
        }}
        
        .empty-state {{
            text-align: center;
            padding: 100px 20px;
            animation: fadeIn 1s ease-out;
        }}
        
        @keyframes fadeIn {{
            from {{ opacity: 0; }}
            to {{ opacity: 1; }}
        }}
        
        .empty-icon {{
            font-size: 120px;
            margin-bottom: 30px;
            opacity: 0.3;
        }}
        
        .empty-title {{
            font-size: 32px;
            color: #666;
            margin-bottom: 15px;
        }}
        
        .empty-text {{
            font-size: 18px;
            color: #555;
        }}
        
        .footer {{
            text-align: center;
            margin-top: 100px;
            padding: 40px 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
            color: #666;
            font-size: 14px;
        }}
        
        @media (max-width: 768px) {{
            .pages-grid {{
                grid-template-columns: 1fr;
            }}
            
            .container {{
                padding: 40px 15px;
            }}
            
            .header {{
                margin-bottom: 50px;
            }}
            
            .stats {{
                gap: 15px;
            }}
            
            .stat-badge {{
                padding: 12px 20px;
            }}
        }}
        
        ::-webkit-scrollbar {{
            width: 12px;
        }}
        
        ::-webkit-scrollbar-track {{
            background: #0a0a0a;
        }}
        
        ::-webkit-scrollbar-thumb {{
            background: linear-gradient(135deg, #4a9eff, #667eea);
            border-radius: 6px;
        }}
        
        ::-webkit-scrollbar-thumb:hover {{
            background: linear-gradient(135deg, #5ab0ff, #7790ff);
        }}
    </style>
</head>
<body>
    <div class="particles" id="particles"></div>
    
    <div class="container">
        <header class="header">
            <h1>📚 Bienvenue sur le Wiki</h1>
            <p>Explorez toutes les pages disponibles</p>
            
            <div class="stats">
                <div class="stat-badge">
                    <span class="stat-number" id="page-count">0</span>
                    <span class="stat-label">Pages</span>
                </div>
            </div>
        </header>
        
        <div id="pages-container">
'''
    
    if len(visible_pages) == 0:
        html += '''
            <div class="empty-state">
                <div class="empty-icon">📄</div>
                <h2 class="empty-title">Aucune page disponible</h2>
                <p class="empty-text">Créez votre première page depuis l'éditeur</p>
            </div>
'''
    else:
        html += '            <div class="pages-grid">\n'
        
        icons = ['📄', '📝', '📋', '📑', '📖', '📚', '🗂️', '📌']
        
        for idx, page in enumerate(visible_pages):
            slug = page['slug']
            title = page['title']
            icon = icons[idx % len(icons)]
            preview = pages_metadata.get(slug, {}).get('preview', 'Aucune description disponible')
            
            html += f'''                <a href="../pages/{slug}/" class="page-card">
                    <div class="page-icon">{icon}</div>
                    <h3 class="page-title">{title}</h3>
                    <p class="page-preview">{preview}</p>
                    <div class="page-meta">
                        <span class="page-slug">{slug}</span>
                        <span class="read-more">Lire →</span>
                    </div>
                </a>
'''
        
        html += '            </div>\n'
    
    html += f'''        </div>
        
        <footer class="footer">
            <p>✨ Wiki généré avec Architect • {page_count} page(s) disponible(s)</p>
            <p style="margin-top: 10px; font-size: 12px;">Dernière mise à jour : {datetime.now().strftime("%d/%m/%Y à %H:%M")}</p>
        </footer>
    </div>
    
    <script>
        // Particules animées
        const particlesContainer = document.getElementById('particles');
        const particleCount = 30;
        
        for (let i = 0; i < particleCount; i++) {{
            const particle = document.createElement('div');
            particle.className = 'particle';
            
            const size = Math.random() * 4 + 2;
            particle.style.width = size + 'px';
            particle.style.height = size + 'px';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDuration = (Math.random() * 10 + 15) + 's';
            particle.style.animationDelay = Math.random() * 5 + 's';
            
            particlesContainer.appendChild(particle);
        }}
        
        // Compteur animé
        const pageCount = {page_count};
        const counter = document.getElementById('page-count');
        let current = 0;
        const increment = Math.ceil(pageCount / 50);
        const timer = setInterval(() => {{
            current += increment;
            if (current >= pageCount) {{
                current = pageCount;
                clearInterval(timer);
            }}
            counter.textContent = current;
        }}, 30);
        
        // Animation d'apparition des cartes
        const cards = document.querySelectorAll('.page-card');
        cards.forEach((card, index) => {{
            card.style.opacity = '0';
            card.style.transform = 'translateY(30px)';
            setTimeout(() => {{
                card.style.transition = 'all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }}, 100 * index);
        }});
        
        console.log('✨ Wiki home chargé: {page_count} pages');
    </script>
</body>
</html>'''
    
    # Créer le dossier /wiki/ si nécessaire
    WIKI_DIR.mkdir(exist_ok=True)
    
    # Sauvegarder
    output_file = WIKI_DIR / 'index.html'
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(html)
    
    print(f"   ✅ {output_file}")
    return output_file


def generate_404_page():
    """
    Génère la page 404
    - À la racine /404.html pour GitHub Pages
    - Dans /wiki/404.html pour cohérence
    """
    print("\n📝 Génération de la page 404...")
    
    inventory = load_inventory()
    visible_pages = [p for p in inventory if not p.get('hidden_from_nav', False)]
    suggestions = random.sample(visible_pages, min(3, len(visible_pages))) if visible_pages else []
    
    # Détecter si on est en local ou sur GitHub Pages
    # En local : liens relatifs
    # Sur GitHub : liens absolus avec /repo-name/
    
    html = '''<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>404 - Page non trouvée</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
            color: #e0e0e0;
            min-height: 100vh;
            padding: 40px 20px;
            overflow-y: auto;  /* ← Permet le scroll */
        }

        .container {
            text-align: center;
            max-width: 800px;
            margin: 0 auto;    /* ← Centre le contenu */
            padding: 40px 20px;
            animation: fadeIn 1s ease-out;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-30px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .error-code {
            font-size: clamp(80px, 20vw, 180px);
            font-weight: 900;
            background: linear-gradient(135deg, #ff4a4a, #f093fb, #4a9eff);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 20px;
            animation: glow 2s ease-in-out infinite;
        }
        
        @keyframes glow {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }
        
        .error-icon {
            font-size: 120px;
            margin-bottom: 30px;
            animation: float 3s ease-in-out infinite;
        }
        
        @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-20px); }
        }
        
        h1 {
            font-size: clamp(28px, 6vw, 48px);
            color: #e0e0e0;
            margin-bottom: 20px;
            font-weight: 700;
        }
        
        p {
            font-size: clamp(16px, 3vw, 20px);
            color: #999;
            margin-bottom: 40px;
            line-height: 1.6;
        }
        
        .url-info {
            background: rgba(255, 74, 74, 0.1);
            border: 1px solid rgba(255, 74, 74, 0.3);
            padding: 15px 20px;
            border-radius: 10px;
            margin: 30px auto;
            max-width: 600px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            color: #ff6b6b;
            word-break: break-all;
        }
        
        .actions {
            display: flex;
            gap: 20px;
            justify-content: center;
            flex-wrap: wrap;
            margin-top: 50px;
        }
        
        .btn {
            padding: 15px 35px;
            border-radius: 50px;
            text-decoration: none;
            font-weight: 600;
            font-size: 16px;
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            display: inline-flex;
            align-items: center;
            gap: 10px;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #4a9eff, #667eea);
            color: white;
            border: none;
        }
        
        .btn-primary:hover {
            transform: translateY(-3px);
            box-shadow: 0 10px 30px rgba(74, 158, 255, 0.4);
        }
        
        .btn-secondary {
            background: rgba(255, 255, 255, 0.05);
            color: #e0e0e0;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .btn-secondary:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(255, 255, 255, 0.2);
            transform: translateY(-3px);
        }
        
        .suggestions {
            margin-top: 60px;
            padding-top: 40px;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
        }
        
        .suggestions h2 {
            font-size: 24px;
            color: #999;
            margin-bottom: 30px;
        }
        
        .suggestions-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            max-width: 700px;
            margin: 0 auto;
        }
        
        .suggestion-card {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 20px;
            border-radius: 15px;
            text-decoration: none;
            transition: all 0.3s;
            display: block;
        }
        
        .suggestion-card:hover {
            background: rgba(74, 158, 255, 0.1);
            border-color: rgba(74, 158, 255, 0.3);
            transform: translateY(-5px);
        }
        
        .suggestion-card h3 {
            color: #4a9eff;
            font-size: 18px;
            margin-bottom: 8px;
        }
        
        .suggestion-card p {
            color: #666;
            font-size: 12px;
            margin: 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="error-icon">🔍</div>
        <div class="error-code">404</div>
        <h1>Oups ! Page introuvable</h1>
        <p>La page que vous recherchez n'existe pas ou a été déplacée.</p>
        
        <div class="url-info" id="url-display"></div>
        
        <div class="actions">
            <a href="/" class="btn btn-primary" id="home-link">
                🏠 Retour à l'accueil
            </a>
            <a href="javascript:history.back()" class="btn btn-secondary">
                ← Retour
            </a>
        </div>
'''
    
    if suggestions:
        html += '''
        <div class="suggestions">
            <h2>Pages qui pourraient vous intéresser</h2>
            <div class="suggestions-grid">
'''
        for page in suggestions:
            html += f'''
                <a href="/pages/{page['slug']}/" class="suggestion-card">
                    <h3>{page['title']}</h3>
                    <p>{page['slug']}</p>
                </a>
'''
        html += '''
            </div>
        </div>
'''
    
    html += '''
    </div>
    
    <script>
        // Afficher l'URL demandée
        const urlDisplay = document.getElementById('url-display');
        if (urlDisplay) {
            urlDisplay.textContent = '📍 ' + window.location.pathname;
        }
        
        // Détecter si on est sur GitHub Pages et ajuster les liens
        const isGitHubPages = window.location.hostname.includes('github.io');
        
        if (isGitHubPages) {
            // Sur GitHub Pages, déterminer le nom du repo
            const pathParts = window.location.pathname.split('/').filter(p => p);
            const repoName = pathParts[0] || '';
            
            // Mettre à jour le lien d'accueil
            const homeLink = document.getElementById('home-link');
            if (homeLink && repoName) {
                homeLink.href = `/${repoName}/wiki/`;
            }
            
            // Mettre à jour les liens de suggestions
            document.querySelectorAll('.suggestion-card').forEach(link => {
                const href = link.getAttribute('href');
                if (href && !href.startsWith('http') && repoName) {
                    link.href = `/${repoName}${href}`;
                }
            });
        } else {
            // En local, utiliser /wiki/
            const homeLink = document.getElementById('home-link');
            if (homeLink) {
                homeLink.href = '/wiki/';
            }
        }
        
        console.log('🔍 Page 404 chargée');
        console.log('📍 URL demandée:', window.location.href);
    </script>
</body>
</html>'''
    
    # Sauvegarder dans /wiki/404.html
    WIKI_DIR.mkdir(exist_ok=True)
    wiki_404 = WIKI_DIR / '404.html'
    with open(wiki_404, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f"   ✅ {wiki_404}")
    
    # Sauvegarder à la racine pour GitHub Pages
    root_404 = BASE_DIR / '404.html'
    with open(root_404, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f"   ✅ {root_404} (pour GitHub Pages)")
    
    return root_404

def main():
    """Point d'entrée principal"""
    print("\n" + "="*70)
    print("🚀 GÉNÉRATION DES PAGES WIKI STATIQUES")
    print("="*70)
    
    # Vérifications
    if not DATA_DIR.exists():
        print("\n❌ Erreur: Le dossier 'data/' n'existe pas")
        print("   Assurez-vous d'être dans le bon répertoire")
        return 1
    
    if not (DATA_DIR / 'inventory.json').exists():
        print("\n❌ Erreur: Le fichier 'data/inventory.json' n'existe pas")
        print("   Créez des pages depuis l'éditeur d'abord")
        return 1
    
    # Génération
    try:
        wiki_home = generate_wiki_home()
        page_404 = generate_404_page()
        
        print("\n" + "="*70)
        print("✅ GÉNÉRATION TERMINÉE AVEC SUCCÈS")
        print("="*70)
        print(f"\nFichiers créés:")
        print(f"  • {wiki_home.relative_to(BASE_DIR)}")
        print(f"  • {page_404.relative_to(BASE_DIR)}")
        print(f"\n📦 Ces fichiers sont 100% statiques et prêts pour GitHub Pages")
        print(f"💡 Ouvrez {wiki_home} dans votre navigateur pour tester")
        print(f"\n🚀 Pour déployer sur GitHub Pages:")
        print(f"   1. git add wiki/")
        print(f"   2. git commit -m 'Update wiki pages'")
        print(f"   3. git push")
        print()
        
        return 0
        
    except Exception as e:
        print(f"\n❌ Erreur lors de la génération:")
        print(f"   {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == '__main__':
    exit(main())