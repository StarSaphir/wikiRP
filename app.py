from flask import Flask, render_template, request, jsonify, send_from_directory
import json
import re
import os
import shutil
from datetime import datetime
from pathlib import Path
import subprocess
import sys

try:
    from slugify import slugify
except ImportError:
    import re
    def slugify(text):
        text = text.lower()
        text = re.sub(r'[^\w\s-]', '', text)
        text = re.sub(r'[-\s]+', '-', text)
        return text.strip('-')

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max pour vidéos

# Configuration des chemins
BASE_DIR = Path(__file__).parent
PAGES_DIR = BASE_DIR / 'pages'
DATA_DIR = BASE_DIR / 'data'
STATIC_DIR = BASE_DIR / 'static'
INVENTORY_FILE = DATA_DIR / 'inventory.json'

# Initialisation des dossiers
PAGES_DIR.mkdir(exist_ok=True)
DATA_DIR.mkdir(exist_ok=True)
STATIC_DIR.mkdir(exist_ok=True)

if not INVENTORY_FILE.exists() or INVENTORY_FILE.stat().st_size == 0:
    with open(INVENTORY_FILE, 'w', encoding='utf-8') as f:
        json.dump([], f)

# --- Helpers ---

def load_inventory():
    try:
        with open(INVENTORY_FILE, 'r', encoding='utf-8') as f:
            content = f.read().strip()
            return json.loads(content) if content else []
    except:
        return []

def save_inventory(inventory):
    with open(INVENTORY_FILE, 'w', encoding='utf-8') as f:
        json.dump(inventory, f, indent=2, ensure_ascii=False)

def get_page_dir(slug):
    """Retourne le dossier d'une page"""
    return PAGES_DIR / slug

def get_layout_file(slug):
    """Retourne le fichier layout.json d'une page"""
    return get_page_dir(slug) / 'layout.json'

def create_backup(slug):
    """Crée une sauvegarde du layout"""
    page_dir = get_page_dir(slug)
    layout_file = get_layout_file(slug)
    
    if not layout_file.exists():
        return
    
    backup_dir = page_dir / 'backups'
    backup_dir.mkdir(exist_ok=True)
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_file = backup_dir / f'layout_{timestamp}.json'
    shutil.copy(layout_file, backup_file)
    
    # Garder seulement les 5 dernières
    backups = sorted(backup_dir.glob('layout_*.json'), reverse=True)
    for old_backup in backups[5:]:
        old_backup.unlink()

def regenerate_wiki_pages():
    """
    Appelle le script generate_wiki_pages.py
    Fonctionne même si le script échoue (graceful degradation)
    """
    try:
        result = subprocess.run(
            [sys.executable, 'generate_wiki_pages.py'],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode == 0:
            print("✅ Pages wiki régénérées")
            return True
        else:
            print(f"⚠️ Erreur génération wiki: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"⚠️ Impossible de régénérer le wiki: {e}")
        return False

# --- Routes Pages (HTML) ---

@app.route('/')
def dashboard():
    inventory = load_inventory()
    return render_template('dashboard.html', pages=inventory)

@app.errorhandler(404)
def page_not_found(e):
    root_404 = BASE_DIR / '404.html'
    if root_404.exists():
        with open(root_404, 'r', encoding='utf-8') as f:
            return f.read(), 404
    return "404", 404

@app.route('/editor/<slug>')
def editor(slug):
    page_dir = get_page_dir(slug)
    layout_file = get_layout_file(slug)
    
    if not page_dir.exists():
        return "Page non trouvée", 404
    
    layout = []
    if layout_file.exists():
        try:
            with open(layout_file, 'r', encoding='utf-8') as f:
                layout = json.load(f)
        except:
            layout = []
    
    return render_template('editor.html', slug=slug, layout=layout)

@app.route('/pages/<slug>/')
@app.route('/wiki/<slug>')
def viewer(slug):
    """Vue de consultation d'une page"""
    page_dir = get_page_dir(slug)
    index_file = page_dir / 'index.html'
    
    if not index_file.exists():
        return "Page non trouvée. Sauvegardez-la dans l'éditeur pour la générer.", 404
    
    with open(index_file, 'r', encoding='utf-8') as f:
        return f.read()
    
@app.route('/wiki/')
@app.route('/wiki/index.html')
def wiki_home():
    """Sert la page d'accueil statique du wiki"""
    wiki_file = BASE_DIR / 'wiki' / 'index.html'
    
    # Si le fichier existe, le servir
    if wiki_file.exists():
        with open(wiki_file, 'r', encoding='utf-8') as f:
            return f.read()
    
    # Sinon, retourner un message
    return """
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {
                font-family: sans-serif;
                max-width: 600px;
                margin: 100px auto;
                padding: 20px;
                text-align: center;
            }
            code {
                background: #f0f0f0;
                padding: 2px 6px;
                border-radius: 3px;
            }
        </style>
    </head>
    <body>
        <h1>📚 Wiki</h1>
        <p>La page d'accueil n'a pas encore été générée.</p>
        <p>Exécutez : <code>python generate_wiki_pages.py</code></p>
        <p>Ou sauvegardez une page depuis l'éditeur.</p>
    </body>
    </html>
    """, 404

# --- Routes API (JSON) ---

@app.route('/api/pages', methods=['GET'])
def list_pages():
    """Liste toutes les pages (pour copy-modal et API client)"""
    return jsonify(load_inventory())

@app.route('/api/pages', methods=['POST'])
def create_page():
    """Crée une nouvelle page"""
    title = request.json.get('title')
    if not title:
        return jsonify({"error": "Titre requis"}), 400
    
    slug = slugify(title)
    inventory = load_inventory()
    
    # Éviter les doublons
    if any(p['slug'] == slug for p in inventory):
        slug = f"{slug}-{len(inventory)}"
    
    # Créer le dossier de la page
    page_dir = get_page_dir(slug)
    page_dir.mkdir(exist_ok=True)
    (page_dir / 'images').mkdir(exist_ok=True)
    (page_dir / 'assets' / 'js').mkdir(parents=True, exist_ok=True)
    (page_dir / 'assets' / 'css').mkdir(parents=True, exist_ok=True)
    
    # Créer layout.json vide
    with open(get_layout_file(slug), 'w', encoding='utf-8') as f:
        json.dump([], f)
    
    # Ajouter à l'inventaire
    new_page = {
        "title": title,
        "slug": slug,
        "hidden_from_nav": False,
        "created_at": datetime.now().isoformat()
    }
    
    inventory.append(new_page)
    save_inventory(inventory)
    generate_pages_metadata()
    regenerate_wiki_pages()
    return jsonify(new_page)

@app.route('/api/pages/<slug>', methods=['GET'])
def get_page(slug):
    """Récupère les infos d'une page"""
    inventory = load_inventory()
    page = next((p for p in inventory if p['slug'] == slug), None)
    
    if not page:
        return jsonify({"error": "Page non trouvée"}), 404
    
    layout_file = get_layout_file(slug)
    layout = []
    
    if layout_file.exists():
        with open(layout_file, 'r', encoding='utf-8') as f:
            layout = json.load(f)
    
    return jsonify({
        **page,
        "layout": layout
    })

@app.route('/api/pages/<slug>', methods=['PUT'])
def update_page(slug):
    """Sauvegarde le layout d'une page"""
    data = request.json
    layout = data.get('layout', [])
    
    # Créer un backup
    create_backup(slug)
    
    # Sauvegarder le layout
    layout_file = get_layout_file(slug)
    with open(layout_file, 'w', encoding='utf-8') as f:
        json.dump(layout, f, indent=2, ensure_ascii=False)
    
    # Générer le HTML
    generate_html(slug, layout)
    generate_pages_metadata()
    regenerate_wiki_pages()
    return jsonify({"success": True})

@app.route('/api/pages/<slug>', methods=['DELETE'])
def delete_page(slug):
    """Supprime une page et ses données"""
    try:
        # Supprimer du dossier
        page_dir = get_page_dir(slug)
        if page_dir.exists():
            shutil.rmtree(page_dir)
        
        # Supprimer de l'inventaire
        inventory = load_inventory()
        inventory = [p for p in inventory if p['slug'] != slug]
        save_inventory(inventory)
        generate_pages_metadata()
        regenerate_wiki_pages()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/pages/<slug>/layout', methods=['GET'])
def get_page_layout(slug):
    """Récupère uniquement le layout d'une page"""
    layout_file = get_layout_file(slug)
    
    if not layout_file.exists():
        return jsonify([])
    
    with open(layout_file, 'r', encoding='utf-8') as f:
        return jsonify(json.load(f))

@app.route('/api/pages/<slug>/copy', methods=['POST'])
def copy_page_layout(slug):
    """Copie le layout d'une page source vers une page cible"""
    source_slug = request.json.get('source_slug')
    
    if not source_slug:
        return jsonify({"error": "source_slug requis"}), 400
    
    source_file = get_layout_file(source_slug)
    target_file = get_layout_file(slug)
    
    if not source_file.exists():
        return jsonify({"error": "Page source non trouvée"}), 404
    
    # Copier le layout
    shutil.copy(source_file, target_file)
    
    return jsonify({"success": True})

@app.route('/api/pages/<slug>/visibility', methods=['PUT'])
def toggle_visibility(slug):
    """Change la visibilité d'une page dans la navigation"""
    hidden = request.json.get('hidden', False)
    
    inventory = load_inventory()
    for page in inventory:
        if page['slug'] == slug:
            page['hidden_from_nav'] = hidden
            break
    
    save_inventory(inventory)
    generate_pages_metadata()
    return jsonify({"success": True})

@app.route('/api/upload/<slug>', methods=['POST'])
def upload_image(slug):
    """Upload d'image"""
    if 'file' not in request.files:
        return jsonify({"error": "Aucun fichier"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "Nom de fichier vide"}), 400
    
    page_dir = get_page_dir(slug)
    images_dir = page_dir / 'images'
    images_dir.mkdir(exist_ok=True)
    
    # Génération d'un nom unique
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_%f')  # Ajout de microsecondes pour unicité
    ext = file.filename.rsplit('.', 1)[1].lower()
    filename = f'img_{timestamp}.{ext}'
    
    filepath = images_dir / filename
    file.save(str(filepath))
    
    # Chemin relatif
    relative_path = f'images/{filename}'
    
    # 🔧 DEBUG: Log de l'upload
    print(f"✅ Image uploadée: {relative_path}")
    
    return jsonify({"path": relative_path})

@app.route('/api/upload-video/<slug>', methods=['POST'])
def upload_video(slug):
    """Upload de vidéo"""
    if 'file' not in request.files:
        return jsonify({"error": "Aucun fichier"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "Nom de fichier vide"}), 400
    
    page_dir = get_page_dir(slug)
    videos_dir = page_dir / 'assets' / 'videos'
    videos_dir.mkdir(parents=True, exist_ok=True)
    
    # Génération d'un nom unique
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    ext = file.filename.rsplit('.', 1)[1].lower()
    filename = f'video_{timestamp}.{ext}'
    
    filepath = videos_dir / filename
    file.save(str(filepath))
    
    # Chemin relatif
    relative_path = f'assets/videos/{filename}'
    
    return jsonify({"path": relative_path})

def extract_page_preview(slug):
    """Extrait un aperçu textuel d'une page"""
    layout_file = get_layout_file(slug)
    
    if not layout_file.exists():
        return "Page sans contenu"  # ✅ Valeur par défaut
    
    try:
        with open(layout_file, 'r', encoding='utf-8') as f:
            layout = json.load(f)
        
        if not layout:
            return "Page vide"  # ✅ Gérer layouts vides
        
        texts = []
        for comp in layout:
            if comp.get('type') == 'text' and comp.get('content'):
                content = comp.get('content', '')
                clean_text = re.sub(r'<[^>]+>', ' ', content)
                clean_text = re.sub(r'\s+', ' ', clean_text).strip()
                if clean_text:
                    texts.append(clean_text)
        
        full_text = ' '.join(texts)
        
        if not full_text:
            return "Page sans texte"  # ✅ Gérer absence de texte
        
        if len(full_text) > 200:
            return full_text[:200] + '...'
        return full_text
        
    except Exception as e:
        print(f"⚠️ Erreur extraction {slug}: {e}")
        return "Aperçu non disponible"


def generate_pages_metadata():
    """Génère data/pages-metadata.json avec tous les aperçus"""
    inventory = load_inventory()
    metadata = {}
    
    for page in inventory:
        slug = page['slug']
        metadata[slug] = {
            'title': page['title'],
            'slug': slug,
            'preview': extract_page_preview(slug),
            'hidden_from_nav': page.get('hidden_from_nav', False)
        }
    
    metadata_file = DATA_DIR / 'pages-metadata.json'
    with open(metadata_file, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Métadonnées générées: {len(metadata)} pages")
    return metadata


# --- Génération HTML ---
def generate_html(slug, layout):
    """Génère le fichier index.html avec prévisualisations statiques"""
    import json
    import re
    
    page_dir = get_page_dir(slug)
    
    inventory = load_inventory()
    page_info = next((p for p in inventory if p['slug'] == slug), {})
    title = page_info.get('title', slug)
    
    # Calculer hauteur et extraire les titres
    max_bottom = 0
    page_headings = []
    internal_links = set()
    
    for comp in layout:
        bottom = comp['y'] + comp['h']
        if bottom > max_bottom:
            max_bottom = bottom
        
        if comp.get('type') == 'text' and comp.get('content'):
            content = comp.get('content', '')
            
            # Trouver tous les h1, h2, h3
            h1_matches = re.findall(r'<h1[^>]*>(.*?)</h1>', content, re.IGNORECASE | re.DOTALL)
            h2_matches = re.findall(r'<h2[^>]*>(.*?)</h2>', content, re.IGNORECASE | re.DOTALL)
            h3_matches = re.findall(r'<h3[^>]*>(.*?)</h3>', content, re.IGNORECASE | re.DOTALL)
            
            for h1 in h1_matches:
                clean_text = re.sub(r'<[^>]+>', '', h1).strip()
                if clean_text:
                    page_headings.append({'level': 1, 'text': clean_text, 'id': slugify(clean_text)})
            
            for h2 in h2_matches:
                clean_text = re.sub(r'<[^>]+>', '', h2).strip()
                if clean_text:
                    page_headings.append({'level': 2, 'text': clean_text, 'id': slugify(clean_text)})
            
            for h3 in h3_matches:
                clean_text = re.sub(r'<[^>]+>', '', h3).strip()
                if clean_text:
                    page_headings.append({'level': 3, 'text': clean_text, 'id': slugify(clean_text)})
            
            # Extraire les liens internes
            internal_link_matches = re.findall(r'href="\.\.\/([^\/]+)\/"', content)
            internal_links.update(internal_link_matches)
    
    # Charger les métadonnées
    metadata_file = DATA_DIR / 'pages-metadata.json'
    pages_metadata = {}
    
    if metadata_file.exists():
        try:
            with open(metadata_file, 'r', encoding='utf-8') as f:
                pages_metadata = json.load(f)
        except Exception as e:
            print(f"⚠️ Erreur lecture métadonnées: {e}")
            pages_metadata = {}
    
    # Si pas de métadonnées, les générer
    if not pages_metadata:
        print("⚠️ Métadonnées vides, génération...")
        pages_metadata = generate_pages_metadata()
    
    # Convertir en JSON pour JavaScript (avec échappement correct)
    headings_json = json.dumps(page_headings, ensure_ascii=False)
    internal_links_list = list(internal_links)
    internal_links_json = json.dumps(internal_links_list, ensure_ascii=False)
    pages_metadata_json = json.dumps(pages_metadata, ensure_ascii=False)
    
    # HTML avec styles inline
    html = f'''<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #0a0a0a;
            color: #e0e0e0;
            overflow-x: hidden;
        }}
        
        .sidebar {{
            position: fixed;
            left: 0;
            top: 0;
            width: 280px;
            height: 100vh;
            background: #1a1a1a;
            border-right: 2px solid #333;
            padding: 20px;
            overflow-y: auto;
            z-index: 1000;
        }}
        
        .sidebar-header {{
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #4a9eff;
        }}
        
        .sidebar-header h2 {{
            color: #4a9eff;
            font-size: 20px;
            margin-bottom: 10px;
        }}
        
        .nav-toggle {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin-bottom: 20px;
        }}
        
        .nav-btn {{
            padding: 8px 12px;
            background: #252525;
            border: 2px solid #333;
            color: #e0e0e0;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            font-weight: bold;
            transition: all 0.3s;
        }}
        
        .nav-btn:hover {{
            background: #333;
            border-color: #4a9eff;
        }}
        
        .nav-btn.active {{
            background: #4a9eff;
            border-color: #4a9eff;
            color: white;
        }}
        
        .nav-section {{
            margin-bottom: 25px;
        }}
        
        .nav-section-title {{
            color: #999;
            font-size: 11px;
            text-transform: uppercase;
            margin-bottom: 10px;
            font-weight: bold;
            letter-spacing: 0.5px;
        }}
        
        .sidebar-nav {{
            list-style: none;
        }}
        
        .sidebar-nav li {{
            margin-bottom: 8px;
        }}
        
        .sidebar-nav a {{
            display: block;
            padding: 10px 12px;
            color: #e0e0e0;
            text-decoration: none;
            border-radius: 5px;
            transition: all 0.2s;
            font-size: 14px;
            background: #252525;
            border: 1px solid transparent;
        }}
        
        .sidebar-nav a:hover {{
            background: #333;
            border-color: #4a9eff;
            transform: translateX(3px);
        }}
        
        .sidebar-nav a.active {{
            background: #4a9eff;
            color: white;
        }}
        
        .toc-list {{
            list-style: none;
        }}
        
        .toc-list li {{
            margin-bottom: 6px;
        }}
        
        .toc-list a {{
            display: block;
            padding: 8px 10px;
            color: #e0e0e0;
            text-decoration: none;
            border-radius: 4px;
            font-size: 13px;
            transition: all 0.2s;
            border-left: 3px solid transparent;
        }}
        
        .toc-list a:hover {{
            background: #252525;
            border-left-color: #4a9eff;
            padding-left: 15px;
        }}
        
        .toc-list a.level-1 {{ font-weight: bold; }}
        .toc-list a.level-2 {{ padding-left: 20px; font-size: 12px; }}
        .toc-list a.level-3 {{ padding-left: 35px; font-size: 11px; color: #aaa; }}
        
        .content {{
            margin-left: 280px;
            min-height: 100vh;
            padding: 40px;
        }}
        
        .canvas-container {{
            position: relative;
            width: 100%;
            background: #1a1a1a;
            border-radius: 10px;
            padding: 20px;
            min-height: {max_bottom + 100}px;
        }}
        
        .component {{
            position: absolute;
            overflow: hidden;
        }}
        
        .component-text .text-content {{
            width: 100%;
            height: 100%;
            overflow-y: auto;
            padding: 15px;
            line-height: 1.6;
        }}
        
        .component-text .text-content h1,
        .component-text .text-content h2,
        .component-text .text-content h3 {{
            scroll-margin-top: 80px;
        }}
        
        .component-text .text-content a {{
            color: #4a9eff !important;
            text-decoration: none;
            border-bottom: 1px solid transparent;
            transition: border-color 0.2s;
            position: relative;
        }}
        
        .component-text .text-content a:hover {{
            border-bottom-color: #4a9eff;
        }}
        
        .component-text .text-content a:visited {{
            color: #4a9eff !important;
        }}
        
        .link-preview {{
            display: none;
            position: fixed;
            background: #2a2a2a;
            border: 2px solid #4a9eff;
            border-radius: 10px;
            padding: 0;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.8);
            z-index: 10000;
            max-width: 400px;
            overflow: hidden;
            animation: fadeInPreview 0.2s ease-out;
        }}
        
        @keyframes fadeInPreview {{
            from {{ opacity: 0; transform: translateY(-10px); }}
            to {{ opacity: 1; transform: translateY(0); }}
        }}
        
        .preview-header {{
            background: linear-gradient(135deg, #4a9eff, #667eea);
            padding: 12px 15px;
            color: white;
            font-size: 15px;
            font-weight: bold;
        }}
        
        .preview-content {{
            padding: 15px;
            color: #e0e0e0;
            font-size: 13px;
            line-height: 1.6;
            max-height: 150px;
            overflow-y: auto;
        }}
        
        .preview-footer {{
            padding: 10px 15px;
            background: #1e1e1e;
            color: #4a9eff;
            font-size: 12px;
            text-align: right;
            border-top: 1px solid #333;
        }}
        
        .component-image img {{ width: 100%; height: 100%; object-fit: contain; }}
        .component-separator hr {{ border: none; border-top: 2px solid #666; margin: 0; }}
        .component-shape {{ border-radius: 5px; }}
        .component-video video {{ width: 100%; height: 100%; object-fit: cover; }}
        .component-youtube iframe {{ width: 100%; height: 100%; border: none; }}
        
        .component-gallery {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 10px;
            padding: 10px;
        }}
        
        .component-gallery img {{
            width: 100%;
            height: 150px;
            object-fit: cover;
            border-radius: 5px;
            cursor: pointer;
            transition: transform 0.3s;
        }}
        
        .component-gallery img:hover {{ transform: scale(1.05); }}
        
        .component-table {{ overflow: auto; padding: 10px; }}
        .component-table table {{ width: 100%; border-collapse: collapse; background: #252525; }}
        .component-table th, .component-table td {{ padding: 12px; text-align: left; border: 1px solid #333; }}
        .component-table th {{ background: #333; color: #4a9eff; font-weight: bold; }}
        
        @media (max-width: 768px) {{
            .sidebar {{ transform: translateX(-100%); transition: transform 0.3s; }}
            .sidebar.open {{ transform: translateX(0); }}
            .content {{ margin-left: 0; }}
        }}
        
        ::-webkit-scrollbar {{ width: 8px; height: 8px; }}
        ::-webkit-scrollbar-track {{ background: #1a1a1a; }}
        ::-webkit-scrollbar-thumb {{ background: #444; border-radius: 4px; }}
        ::-webkit-scrollbar-thumb:hover {{ background: #555; }}
    </style>
</head>
<body>
    <nav class="sidebar">
        <div class="sidebar-header">
            <h2>📚 {title}</h2>
        </div>
        
        <div class="nav-toggle">
            <button class="nav-btn active" data-tab="links">🔗 Liens</button>
            <button class="nav-btn" data-tab="toc">📋 Sommaire</button>
        </div>
        
        <div class="nav-content" id="nav-links">
            <div class="nav-section" id="internal-links-section" style="display:none;">
                <div class="nav-section-title">Liens référencés</div>
                <ul class="sidebar-nav" id="internal-links-list"></ul>
            </div>
            
            <div class="nav-section">
                <div class="nav-section-title">Autres pages</div>
                <ul class="sidebar-nav" id="other-pages-list"></ul>
            </div>
        </div>
        
        <div class="nav-content" id="nav-toc" style="display:none;">
            <ul class="toc-list" id="toc-list">
                <li style="color: #666; font-size: 12px; padding: 10px;">Aucun titre trouvé</li>
            </ul>
        </div>
    </nav>
    
    <main class="content">
        <div class="canvas-container">
'''
    
    # Composants triés avec IDs sur les titres
    sorted_components = sorted(layout, key=lambda x: x.get('z', 0))
    
    for comp in sorted_components:
        html += render_component_html_with_anchors(comp, slug)
    
    # Fermeture du HTML avec script
    html += f'''
        </div>
    </main>
    
    <div class="link-preview" id="link-preview">
        <div class="preview-header" id="preview-title"></div>
        <div class="preview-content" id="preview-content"></div>
        <div class="preview-footer">Cliquez pour ouvrir →</div>
    </div>
    
    <script>
        const PAGE_HEADINGS = {headings_json};
        const INTERNAL_LINKS = {internal_links_json};
        const CURRENT_SLUG = "{slug}";
        const PAGES_METADATA = {pages_metadata_json};
        
        fetch('../../data/inventory.json')
            .then(res => res.json())
            .then(pages => {{
                const visiblePages = pages.filter(p => !p.hidden_from_nav);
                const referencedPages = visiblePages.filter(p => INTERNAL_LINKS.includes(p.slug) && p.slug !== CURRENT_SLUG);
                const otherPages = visiblePages.filter(p => !INTERNAL_LINKS.includes(p.slug) && p.slug !== CURRENT_SLUG);
                
                if (referencedPages.length > 0) {{
                    document.getElementById('internal-links-section').style.display = 'block';
                    const internalList = document.getElementById('internal-links-list');
                    referencedPages.forEach(page => {{
                        const li = document.createElement('li');
                        const a = document.createElement('a');
                        a.href = `../${{page.slug}}/`;
                        a.textContent = page.title;
                        li.appendChild(a);
                        internalList.appendChild(li);
                    }});
                }}
                
                const otherList = document.getElementById('other-pages-list');
                otherPages.forEach(page => {{
                    const li = document.createElement('li');
                    const a = document.createElement('a');
                    a.href = `../${{page.slug}}/`;
                    a.textContent = page.title;
                    li.appendChild(a);
                    otherList.appendChild(li);
                }});
            }})
            .catch(err => console.error('Erreur chargement navigation:', err));
        
        if (PAGE_HEADINGS.length > 0) {{
            const tocList = document.getElementById('toc-list');
            tocList.innerHTML = '';
            PAGE_HEADINGS.forEach(heading => {{
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.href = `#${{heading.id}}`;
                a.textContent = heading.text;
                a.classList.add(`level-${{heading.level}}`);
                a.addEventListener('click', (e) => {{
                    e.preventDefault();
                    const target = document.getElementById(heading.id);
                    if (target) target.scrollIntoView({{ behavior: 'smooth', block: 'start' }});
                }});
                li.appendChild(a);
                tocList.appendChild(li);
            }});
        }}
        
        document.querySelectorAll('.nav-btn').forEach(btn => {{
            btn.addEventListener('click', () => {{
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const tab = btn.dataset.tab;
                document.getElementById('nav-links').style.display = tab === 'links' ? 'block' : 'none';
                document.getElementById('nav-toc').style.display = tab === 'toc' ? 'block' : 'none';
            }});
        }});
        
        const preview = document.getElementById('link-preview');
        let previewTimeout;
        let isOverPreview = false;
        
        function showLinkPreview(linkElement) {{
            const href = linkElement.getAttribute('href');
            const match = href.match(/\.\.\/([^\/]+)\//);
            if (!match) return;
            
            const targetSlug = match[1];
            const metadata = PAGES_METADATA[targetSlug];
            
            if (!metadata) {{
                console.warn('Pas de métadonnées pour', targetSlug);
                return;
            }}
            
            document.getElementById('preview-title').textContent = metadata.title;
            document.getElementById('preview-content').textContent = metadata.preview;
            
            const rect = linkElement.getBoundingClientRect();
            preview.style.display = 'block';
            
            let left = rect.right + 15;
            let top = rect.top;
            
            if (left + 400 > window.innerWidth) {{
                left = rect.left - 415;
            }}
            
            if (top + 250 > window.innerHeight) {{
                top = window.innerHeight - 260;
            }}
            
            preview.style.left = left + 'px';
            preview.style.top = top + 'px';
        }}
        
        document.querySelectorAll('.text-content a[href*="../"]').forEach(link => {{
            link.addEventListener('mouseenter', (e) => {{
                clearTimeout(previewTimeout);
                previewTimeout = setTimeout(() => {{
                    showLinkPreview(e.target);
                }}, 300);
            }});
            
            link.addEventListener('mouseleave', () => {{
                clearTimeout(previewTimeout);
                setTimeout(() => {{
                    if (!isOverPreview) {{
                        preview.style.display = 'none';
                    }}
                }}, 200);
            }});
        }});
        
        preview.addEventListener('mouseenter', () => {{
            isOverPreview = true;
        }});
        
        preview.addEventListener('mouseleave', () => {{
            isOverPreview = false;
            preview.style.display = 'none';
        }});
        
        document.querySelectorAll('.component-gallery img').forEach(img => {{
            img.addEventListener('click', () => {{
                const lightbox = document.createElement('div');
                lightbox.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:10000;cursor:pointer';
                const enlargedImg = document.createElement('img');
                enlargedImg.src = img.src;
                enlargedImg.style.cssText = 'max-width:90%;max-height:90%;object-fit:contain';
                lightbox.appendChild(enlargedImg);
                lightbox.onclick = () => lightbox.remove();
                document.body.appendChild(lightbox);
            }});
        }});
        
        const observer = new IntersectionObserver((entries) => {{
            entries.forEach(entry => {{
                if (entry.isIntersecting) {{
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }}
            }});
        }}, {{ threshold: 0.1, rootMargin: '0px 0px -50px 0px' }});
        
        document.querySelectorAll('.component').forEach(component => {{
            component.style.opacity = '0';
            component.style.transform = 'translateY(20px)';
            component.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
            observer.observe(component);
        }});
        
        console.log('✅ Viewer initialisé');
        console.log('📊 Métadonnées:', Object.keys(PAGES_METADATA).length, 'pages');
    </script>
</body>
</html>'''
    
    # Écrire le fichier
    try:
        with open(page_dir / 'index.html', 'w', encoding='utf-8') as f:
            f.write(html)
        print(f"✅ HTML généré pour {slug}")
    except Exception as e:
        print(f"❌ Erreur écriture HTML pour {slug}: {e}")
        raise

def debug_metadata_generation():
    """Script pour débugger la génération des métadonnées"""
    print("\n🔍 DEBUG MÉTADONNÉES\n")
    
    inventory = load_inventory()
    print(f"📄 Pages dans l'inventaire: {len(inventory)}")
    
    for page in inventory:
        slug = page['slug']
        layout_file = get_layout_file(slug)
        
        print(f"\n---  {page['title']} ({slug}) ---")
        print(f"   Layout existe: {layout_file.exists()}")
        
        if layout_file.exists():
            try:
                with open(layout_file, 'r', encoding='utf-8') as f:
                    layout = json.load(f)
                print(f"   Composants: {len(layout)}")
                
                # Compter les composants texte
                text_comps = [c for c in layout if c.get('type') == 'text']
                print(f"   Composants texte: {len(text_comps)}")
                
                # Extraire preview
                preview = extract_page_preview(slug)
                print(f"   Preview ({len(preview)} chars): {preview[:100]}...")
                
            except Exception as e:
                print(f"   ❌ Erreur: {e}")
    
    print("\n🔄 Génération pages-metadata.json...")
    try:
        metadata = generate_pages_metadata()
        print(f"✅ {len(metadata)} pages dans les métadonnées")
        
        # Afficher un exemple
        if metadata:
            sample_slug = list(metadata.keys())[0]
            print(f"\n📋 Exemple ({sample_slug}):")
            print(json.dumps(metadata[sample_slug], indent=2, ensure_ascii=False))
    
    except Exception as e:
        print(f"❌ Erreur: {e}")
        import traceback
        traceback.print_exc()


def render_component_html_with_anchors(comp, slug):
    """Génère le HTML avec ancres sur les titres"""
    import re
    
    style = f'left:{comp["x"]}px;top:{comp["y"]}px;width:{comp["w"]}px;height:{comp["h"]}px;z-index:{comp.get("z", 0)};'
    if comp.get('custom_css'):
        style += comp['custom_css']
    
    html = f'<div class="component component-{comp["type"]}" id="{comp["id"]}" style="{style}">\n'
    
    comp_type = comp['type']
    
    if comp_type == 'text':
        content = comp.get("content", "")
        
        # Ajouter des IDs aux titres pour le scroll
        def add_id_to_heading(match):
            tag = match.group(1)
            attrs = match.group(2)
            text = match.group(3)
            clean_text = re.sub(r'<[^>]+>', '', text).strip()
            heading_id = slugify(clean_text)
            return f'<{tag} id="{heading_id}"{attrs}>{text}</{tag}>'
        
        content = re.sub(r'<(h[123])([^>]*)>(.*?)</\1>', add_id_to_heading, content, flags=re.IGNORECASE | re.DOTALL)
        
        html += f'<div class="text-content">{content}</div>\n'
    
    elif comp_type == 'image':
        html += f'<img src="{comp.get("image_path", "")}" alt="Image" />\n'
    
    elif comp_type == 'gallery':
        # 🔧 FIX: Générer un carousel fonctionnel avec toutes les images
        images = comp.get('images', [])
        
        if len(images) == 0:
            html += '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #666;">Aucune image dans la galerie</div>\n'
        elif len(images) == 1:
            # Une seule image, affichage simple
            html += f'<img src="{images[0]}" style="width: 100%; height: 100%; object-fit: cover;" alt="Image galerie" />\n'
        else:
            # Plusieurs images, créer un carousel
            gallery_id = f'gallery-{comp["id"]}'
            html += f'''
            <div class="gallery-carousel" id="{gallery_id}" style="position: relative; width: 100%; height: 100%; overflow: hidden;">
                <div class="gallery-slides" style="position: relative; width: 100%; height: 100%;">
'''
            
            for idx, img_path in enumerate(images):
                display = 'block' if idx == 0 else 'none'
                html += f'''
                    <img class="gallery-slide" src="{img_path}" 
                         style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; display: {display};" 
                         alt="Image {idx + 1}" />
'''
            
            html += '''
                </div>
                
                <!-- Boutons de navigation -->
                <button class="gallery-prev" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.7); color: white; border: none; padding: 15px 20px; cursor: pointer; border-radius: 5px; font-size: 24px; z-index: 10;">‹</button>
                <button class="gallery-next" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.7); color: white; border: none; padding: 15px 20px; cursor: pointer; border-radius: 5px; font-size: 24px; z-index: 10;">›</button>
                
                <!-- Indicateurs -->
                <div class="gallery-indicators" style="position: absolute; bottom: 15px; left: 50%; transform: translateX(-50%); display: flex; gap: 8px; z-index: 10;">
'''
            
            for idx in range(len(images)):
                active_style = 'background: #4a9eff;' if idx == 0 else 'background: rgba(255,255,255,0.5);'
                html += f'''
                    <div class="gallery-indicator" data-index="{idx}" style="width: 12px; height: 12px; border-radius: 50%; {active_style} cursor: pointer; transition: background 0.3s;"></div>
'''
            
            html += f'''
                </div>
            </div>
            
            <script>
            (function() {{
                const gallery = document.getElementById('{gallery_id}');
                const slides = gallery.querySelectorAll('.gallery-slide');
                const prevBtn = gallery.querySelector('.gallery-prev');
                const nextBtn = gallery.querySelector('.gallery-next');
                const indicators = gallery.querySelectorAll('.gallery-indicator');
                let currentIndex = 0;
                
                function showSlide(index) {{
                    // Cacher toutes les slides
                    slides.forEach(slide => slide.style.display = 'none');
                    
                    // Afficher la slide actuelle
                    if (slides[index]) {{
                        slides[index].style.display = 'block';
                    }}
                    
                    // Mettre à jour les indicateurs
                    indicators.forEach((ind, i) => {{
                        ind.style.background = i === index ? '#4a9eff' : 'rgba(255,255,255,0.5)';
                    }});
                    
                    currentIndex = index;
                }}
                
                prevBtn.addEventListener('click', () => {{
                    const newIndex = currentIndex > 0 ? currentIndex - 1 : slides.length - 1;
                    showSlide(newIndex);
                }});
                
                nextBtn.addEventListener('click', () => {{
                    const newIndex = currentIndex < slides.length - 1 ? currentIndex + 1 : 0;
                    showSlide(newIndex);
                }});
                
                indicators.forEach((indicator, index) => {{
                    indicator.addEventListener('click', () => {{
                        showSlide(index);
                    }});
                }});
                
                // Auto-play si configuré
                const autoplayDelay = {comp.get('autoplay_delay', 0)};
                if (autoplayDelay > 0) {{
                    setInterval(() => {{
                        const newIndex = currentIndex < slides.length - 1 ? currentIndex + 1 : 0;
                        showSlide(newIndex);
                    }}, autoplayDelay);
                }}
            }})();
            </script>
'''
    
    elif comp_type == 'video':
        html += f'<video controls><source src="{comp.get("video_path", "")}" type="video/mp4"></video>\n'
    
    elif comp_type == 'youtube':
        html += f'<iframe src="https://www.youtube.com/embed/{comp.get("youtube_id", "")}" allowfullscreen></iframe>\n'
    
    elif comp_type == 'shape':
        html += f'<div style="width:100%;height:100%;background:{comp.get("bg_color", "#333")};border-radius:5px;"></div>\n'
    
    elif comp_type == 'table':
        # ✅ FIX: Utiliser 'content' au lieu de 'rows'
        content = comp.get('content', '')
        
        if not content:
            # Tableau par défaut si vide
            content = '''
                <table style="width: 100%; border-collapse: collapse; background: #252525;">
                    <thead>
                        <tr>
                            <th style="padding: 12px; text-align: left; border: 1px solid #333; background: #333; color: #4a9eff;">Colonne 1</th>
                            <th style="padding: 12px; text-align: left; border: 1px solid #333; background: #333; color: #4a9eff;">Colonne 2</th>
                            <th style="padding: 12px; text-align: left; border: 1px solid #333; background: #333; color: #4a9eff;">Colonne 3</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="padding: 12px; border: 1px solid #333;">Données</td>
                            <td style="padding: 12px; border: 1px solid #333;">Données</td>
                            <td style="padding: 12px; border: 1px solid #333;">Données</td>
                        </tr>
                        <tr>
                            <td style="padding: 12px; border: 1px solid #333;">Données</td>
                            <td style="padding: 12px; border: 1px solid #333;">Données</td>
                            <td style="padding: 12px; border: 1px solid #333;">Données</td>
                        </tr>
                    </tbody>
                </table>
            '''
        
        html += content + '\n'

    
    elif comp_type == 'separator':
        html += '<hr />\n'
    
    html += '</div>\n'
    return html

# --- Routes Statiques ---

@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory('static', filename)

@app.route('/data/inventory.json')
def serve_inventory():
    return send_from_directory('data', 'inventory.json')

@app.route('/pages/<slug>/images/<filename>')
def serve_image(slug, filename):
    page_dir = get_page_dir(slug) / 'images'
    return send_from_directory(page_dir, filename)

if __name__ == '__main__':
    app.run(debug=True, port=5000)