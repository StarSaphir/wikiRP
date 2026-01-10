#!/usr/bin/env python3
"""
Script pour générer la page d'accueil du Wiki (index.html)
À exécuter avant l'export vers GitHub Pages
"""

import json
from pathlib import Path

def generate_wiki_index():
    base_dir = Path(__file__).parent
    data_dir = base_dir / 'data'
    inventory_file = data_dir / 'inventory.json'
    
    # Charger l'inventaire
    with open(inventory_file, 'r', encoding='utf-8') as f:
        inventory = json.load(f)
    
    # Filtrer les pages visibles
    visible_pages = [p for p in inventory if not p.get('hidden_from_nav', False)]
    
    # Générer le HTML
    html = '''<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Wiki - Accueil</title>
    <link rel="stylesheet" href="static/viewer.css">
    <style>
        body {
            display: block;
            background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
        }
        .wiki-home {
            max-width: 1400px;
            margin: 0 auto;
            padding: 60px 20px;
        }
        .wiki-header {
            text-align: center;
            margin-bottom: 60px;
        }
        .wiki-header h1 {
            font-size: 56px;
            color: #4a9eff;
            margin-bottom: 20px;
            text-shadow: 0 4px 20px rgba(74, 158, 255, 0.5);
        }
        .wiki-header p {
            font-size: 22px;
            color: #999;
        }
        .pages-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 30px;
            margin-top: 40px;
        }
        .page-card {
            background: #252525;
            border-radius: 12px;
            padding: 35px;
            border: 2px solid #333;
            transition: all 0.3s;
            text-decoration: none;
            display: block;
            position: relative;
            overflow: hidden;
        }
        .page-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 4px;
            background: linear-gradient(90deg, #4a9eff, #667eea);
            transform: scaleX(0);
            transition: transform 0.3s;
        }
        .page-card:hover::before {
            transform: scaleX(1);
        }
        .page-card:hover {
            border-color: #4a9eff;
            transform: translateY(-8px);
            box-shadow: 0 15px 35px rgba(74, 158, 255, 0.3);
        }
        .page-card h3 {
            color: #4a9eff;
            margin-bottom: 15px;
            font-size: 26px;
        }
        .page-card .slug {
            color: #666;
            font-size: 14px;
            font-family: 'Courier New', monospace;
        }
        .page-count {
            text-align: center;
            color: #666;
            font-size: 16px;
            margin-top: 40px;
        }
    </style>
</head>
<body>
    <div class="wiki-home">
        <div class="wiki-header">
            <h1>📚 Bienvenue sur le Wiki</h1>
            <p>Explorez l'univers à travers {count} pages</p>
        </div>
        
        <div class="pages-grid">
'''.format(count=len(visible_pages))
    
    for page in visible_pages:
        html += f'''
            <a href="pages/{page['slug']}/" class="page-card">
                <h3>{page['title']}</h3>
                <div class="slug">{page['slug']}</div>
            </a>
        '''
    
    html += '''
        </div>
        
        <div class="page-count">
            Dernière mise à jour : <span id="update-date"></span>
        </div>
    </div>
    
    <script>
        document.getElementById('update-date').textContent = new Date().toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    </script>
</body>
</html>
'''
    
    # Écrire le fichier index.html à la racine
    index_file = base_dir / 'index.html'
    with open(index_file, 'w', encoding='utf-8') as f:
        f.write(html)
    
    print(f"✅ Page d'accueil générée : {index_file}")
    print(f"📊 {len(visible_pages)} pages visibles sur {len(inventory)} au total")

if __name__ == '__main__':
    generate_wiki_index()