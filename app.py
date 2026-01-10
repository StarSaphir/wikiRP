from flask import Flask, render_template, request, jsonify, send_from_directory
import json
import os
import shutil
from datetime import datetime
from pathlib import Path

try:
    from slugify import slugify
except ImportError:
    # Fallback si python-slugify n'est pas installé
    import re
    def slugify(text):
        text = text.lower()
        text = re.sub(r'[^\w\s-]', '', text)
        text = re.sub(r'[-\s]+', '-', text)
        return text.strip('-')

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max

BASE_DIR = Path(__file__).parent
PAGES_DIR = BASE_DIR / 'pages'
DATA_DIR = BASE_DIR / 'data'
INVENTORY_FILE = DATA_DIR / 'inventory.json'

# Initialisation des dossiers
PAGES_DIR.mkdir(exist_ok=True)
DATA_DIR.mkdir(exist_ok=True)

# Initialiser inventory.json s'il n'existe pas ou est vide
if not INVENTORY_FILE.exists() or INVENTORY_FILE.stat().st_size == 0:
    with open(INVENTORY_FILE, 'w', encoding='utf-8') as f:
        json.dump([], f)

def load_inventory():
    if INVENTORY_FILE.exists():
        try:
            with open(INVENTORY_FILE, 'r', encoding='utf-8') as f:
                content = f.read().strip()
                if not content:
                    return []
                return json.loads(content)
        except (json.JSONDecodeError, ValueError):
            return []
    return []

def save_inventory(inventory):
    with open(INVENTORY_FILE, 'w', encoding='utf-8') as f:
        json.dump(inventory, f, indent=2, ensure_ascii=False)

def create_backup(slug):
    page_dir = PAGES_DIR / slug
    layout_file = page_dir / 'layout.json'
    if not layout_file.exists():
        return
    
    backup_dir = page_dir / 'backups'
    backup_dir.mkdir(exist_ok=True)
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_file = backup_dir / f'layout_{timestamp}.json'
    shutil.copy(layout_file, backup_file)
    
    # Garder seulement les 5 dernières versions
    backups = sorted(backup_dir.glob('layout_*.json'), reverse=True)
    for old_backup in backups[5:]:
        old_backup.unlink()

def generate_html(slug):
    page_dir = PAGES_DIR / slug
    layout_file = page_dir / 'layout.json'
    
    with open(layout_file, 'r', encoding='utf-8') as f:
        layout = json.load(f)
    
    inventory = load_inventory()
    page_info = next((p for p in inventory if p['slug'] == slug), {})
    title = page_info.get('title', slug)
    
    # Calculer la hauteur nécessaire
    max_bottom = 0
    for comp in layout:
        bottom = comp['y'] + comp['h']
        if bottom > max_bottom:
            max_bottom = bottom
    
    # Génération du HTML
    html = f'''<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <link rel="stylesheet" href="../../static/viewer.css">
</head>
<body>
    <nav class="sidebar">
        <div class="sidebar-header">
            <h2>Wiki Navigator</h2>
        </div>
        <ul class="sidebar-nav" id="nav-list"></ul>
    </nav>
    
    <main class="content">
        <div class="canvas-container" id="canvas" style="min-height: {max_bottom + 100}px;">
'''
    
    # Tri par z-index
    sorted_components = sorted(layout, key=lambda x: x.get('z', 0))
    
    for comp in sorted_components:
        comp_id = comp['id']
        comp_type = comp['type']
        x, y = comp['x'], comp['y']
        w, h = comp['w'], comp['h']
        z = comp.get('z', 0)
        content = comp.get('content', '')
        custom_css = comp.get('custom_css', '')
        custom_js = comp.get('custom_js', '')
        
        style = f'left:{x}px;top:{y}px;width:{w}px;height:{h}px;z-index:{z};'
        if custom_css:
            style += custom_css
        
        html += f'        <div class="component component-{comp_type}" id="{comp_id}" style="{style}">\n'
        
        if comp_type == 'text':
            html += f'            <div class="text-content">{content}</div>\n'
        elif comp_type == 'image':
            img_path = comp.get('image_path', '')
            html += f'            <img src="{img_path}" alt="Image" />\n'
        elif comp_type == 'gallery':
            images = comp.get('images', [])
            if images:
                html += f'            <div class="gallery-viewer">\n'
                html += f'                <button class="gallery-prev">‹</button>\n'
                for idx, img in enumerate(images):
                    display = '' if idx == 0 else 'display:none;'
                    html += f'                <img class="gallery-img" src="{img}" style="{display} width:100%; height:100%; object-fit:cover;" data-index="{idx}" />\n'
                html += f'                <button class="gallery-next">›</button>\n'
                html += f'                <div class="gallery-dots">\n'
                for idx in range(len(images)):
                    active = 'active' if idx == 0 else ''
                    html += f'                    <span class="gallery-dot {active}" data-index="{idx}"></span>\n'
                html += f'                </div>\n'
                html += f'            </div>\n'
        elif comp_type == 'video':
            video_path = comp.get('video_path', '')
            if video_path:
                html += f'            <video src="{video_path}" controls style="width:100%; height:100%;"></video>\n'
        elif comp_type == 'youtube':
            youtube_id = comp.get('youtube_id', '')
            if youtube_id:
                html += f'            <iframe src="https://www.youtube.com/embed/{youtube_id}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="width:100%; height:100%;"></iframe>\n'
        elif comp_type == 'shape':
            bg_color = comp.get('bg_color', '#333')
            html += f'            <div class="shape" style="background:{bg_color};width:100%;height:100%;"></div>\n'
        elif comp_type == 'table':
            html += f'            <div class="table-content">{content}</div>\n'
        elif comp_type == 'separator':
            html += f'            <hr />\n'
        elif comp_type == 'title':
            html += f'            <h2 class="custom-title">{content}</h2>\n'
        
        if custom_js:
            html += f'            <script>{custom_js}</script>\n'
        
        html += '        </div>\n'
    
    html += '''        </div>
    </main>
    
    <div class="mobile-warning" id="mobile-warning">
        <div class="mobile-warning-content">
            <p>📱 Ce Wiki est optimisé pour une consultation sur ordinateur</p>
            <button onclick="document.getElementById('mobile-warning').style.display='none'">Continuer</button>
        </div>
    </div>
    
    <script src="../../static/viewer.js"></script>
</body>
</html>'''
    
    with open(page_dir / 'index.html', 'w', encoding='utf-8') as f:
        f.write(html)

@app.route('/')
def index():
    inventory = load_inventory()
    return render_template('dashboard.html', pages=inventory)

@app.route('/editor/<slug>')
def editor(slug):
    page_dir = PAGES_DIR / slug
    if not page_dir.exists():
        return "Page non trouvée", 404
    
    layout_file = page_dir / 'layout.json'
    try:
        with open(layout_file, 'r', encoding='utf-8') as f:
            layout = json.load(f)
    except (json.JSONDecodeError, FileNotFoundError):
        layout = []
    
    # S'assurer que layout est toujours une liste
    if not isinstance(layout, list):
        layout = []
    
    return render_template('editor.html', slug=slug, layout=layout)

@app.route('/api/pages', methods=['GET'])
def get_pages():
    return jsonify(load_inventory())

@app.route('/api/pages', methods=['POST'])
def create_page():
    data = request.json
    title = data['title']
    slug = slugify(title)
    
    page_dir = PAGES_DIR / slug
    page_dir.mkdir(exist_ok=True)
    (page_dir / 'images').mkdir(exist_ok=True)
    (page_dir / 'assets' / 'js').mkdir(parents=True, exist_ok=True)
    (page_dir / 'assets' / 'css').mkdir(parents=True, exist_ok=True)
    
    # Créer layout.json vide
    with open(page_dir / 'layout.json', 'w') as f:
        json.dump([], f)
    
    # Ajouter à l'inventaire
    inventory = load_inventory()
    inventory.append({
        'title': title,
        'slug': slug,
        'hidden_from_nav': False
    })
    save_inventory(inventory)
    
    return jsonify({'slug': slug})

@app.route('/api/pages/<slug>', methods=['PUT'])
def save_page(slug):
    data = request.json
    layout = data['layout']
    
    create_backup(slug)
    
    page_dir = PAGES_DIR / slug
    with open(page_dir / 'layout.json', 'w', encoding='utf-8') as f:
        json.dump(layout, f, indent=2, ensure_ascii=False)
    
    generate_html(slug)
    
    return jsonify({'success': True})

@app.route('/api/pages/<slug>/copy', methods=['POST'])
def copy_page(slug):
    data = request.json
    source_slug = data['source_slug']
    
    source_dir = PAGES_DIR / source_slug
    target_dir = PAGES_DIR / slug
    
    if not source_dir.exists():
        return jsonify({'error': 'Page source non trouvée'}), 404
    
    shutil.copy(source_dir / 'layout.json', target_dir / 'layout.json')
    
    return jsonify({'success': True})

@app.route('/api/upload/<slug>', methods=['POST'])
def upload_image(slug):
    if 'file' not in request.files:
        return jsonify({'error': 'Aucun fichier'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'Nom de fichier vide'}), 400
    
    page_dir = PAGES_DIR / slug
    images_dir = page_dir / 'images'
    
    # Génération d'un nom unique
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    ext = file.filename.rsplit('.', 1)[1].lower()
    filename = f'img_{timestamp}.{ext}'
    
    filepath = images_dir / filename
    file.save(filepath)
    
    # Chemin relatif pour le HTML
    relative_path = f'images/{filename}'
    
    return jsonify({'path': relative_path})

@app.route('/api/upload-video/<slug>', methods=['POST'])
def upload_video(slug):
    if 'file' not in request.files:
        return jsonify({'error': 'Aucun fichier'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'Nom de fichier vide'}), 400
    
    page_dir = PAGES_DIR / slug
    videos_dir = page_dir / 'assets' / 'videos'
    videos_dir.mkdir(parents=True, exist_ok=True)
    
    # Génération d'un nom unique
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    ext = file.filename.rsplit('.', 1)[1].lower()
    filename = f'video_{timestamp}.{ext}'
    
    filepath = videos_dir / filename
    file.save(filepath)
    
    # Chemin relatif pour le HTML
    relative_path = f'assets/videos/{filename}'
    
    return jsonify({'path': relative_path})

@app.route('/pages/<slug>/')
def view_page(slug):
    page_dir = PAGES_DIR / slug
    index_file = page_dir / 'index.html'
    
    if not index_file.exists():
        return "Page non trouvée. Avez-vous sauvegardé la page dans l'éditeur ?", 404
    
    with open(index_file, 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    return html_content

@app.route('/api/pages/<slug>', methods=['DELETE'])
def delete_page(slug):
    try:
        page_dir = PAGES_DIR / slug
        
        print(f"Tentative de suppression de: {page_dir}")
        
        if page_dir.exists():
            shutil.rmtree(page_dir)
            print(f"Dossier supprimé: {page_dir}")
        else:
            print(f"Dossier non trouvé: {page_dir}")
        
        # Retirer de l'inventaire
        inventory = load_inventory()
        original_count = len(inventory)
        inventory = [p for p in inventory if p['slug'] != slug]
        new_count = len(inventory)
        
        print(f"Inventaire: {original_count} -> {new_count} pages")
        
        save_inventory(inventory)
        
        return jsonify({'success': True, 'message': f'Page {slug} supprimée'})
    except Exception as e:
        print(f"Erreur lors de la suppression: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/pages/<slug>/visibility', methods=['PUT'])
def toggle_visibility(slug):
    data = request.json
    hidden = data.get('hidden', False)
    
    inventory = load_inventory()
    for page in inventory:
        if page['slug'] == slug:
            page['hidden_from_nav'] = hidden
            break
    
    save_inventory(inventory)
    return jsonify({'success': True})

@app.route('/pages/<slug>/images/<filename>')
def serve_image(slug, filename):
    page_dir = PAGES_DIR / slug / 'images'
    return send_from_directory(page_dir, filename)

@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory('static', filename)

@app.route('/data/inventory.json')
def serve_inventory():
    return send_from_directory('data', 'inventory.json')

# Page d'accueil du wiki (liste toutes les pages)
@app.route('/wiki/')
@app.route('/wiki/index.html')
def wiki_home():
    inventory = load_inventory()
    visible_pages = [p for p in inventory if not p.get('hidden_from_nav', False)]
    
    html = '''<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Wiki - Accueil</title>
    <link rel="stylesheet" href="../static/viewer.css">
    <style>
        .wiki-home {
            max-width: 1200px;
            margin: 0 auto;
            padding: 60px 20px;
        }
        .wiki-header {
            text-align: center;
            margin-bottom: 60px;
        }
        .wiki-header h1 {
            font-size: 48px;
            color: #4a9eff;
            margin-bottom: 10px;
        }
        .wiki-header p {
            font-size: 20px;
            color: #999;
        }
        .pages-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 25px;
            margin-top: 40px;
        }
        .page-card {
            background: #252525;
            border-radius: 10px;
            padding: 30px;
            border: 2px solid #333;
            transition: all 0.3s;
            text-decoration: none;
            display: block;
        }
        .page-card:hover {
            border-color: #4a9eff;
            transform: translateY(-5px);
            box-shadow: 0 10px 25px rgba(74, 158, 255, 0.3);
        }
        .page-card h3 {
            color: #4a9eff;
            margin-bottom: 15px;
            font-size: 24px;
        }
        .page-card .slug {
            color: #666;
            font-size: 14px;
        }
    </style>
</head>
<body style="display: block;">
    <div class="wiki-home">
        <div class="wiki-header">
            <h1>📚 Bienvenue sur le Wiki</h1>
            <p>Explorez toutes les pages disponibles</p>
        </div>
        
        <div class="pages-grid">
'''
    
    for page in visible_pages:
        html += f'''
            <a href="../pages/{page['slug']}/" class="page-card">
                <h3>{page['title']}</h3>
                <div class="slug">{page['slug']}</div>
            </a>
        '''
    
    html += '''
        </div>
    </div>
</body>
</html>
'''
    
    return html

if __name__ == '__main__':
    app.run(debug=True, port=5000)