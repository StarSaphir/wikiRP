# regenerate_all.py
from app import load_inventory, get_layout_file, generate_html, generate_pages_metadata
import json

# Générer les métadonnées d'abord
print("🔄 Génération des métadonnées...")
generate_pages_metadata()

# Régénérer chaque page
inventory = load_inventory()
for page in inventory:
    slug = page['slug']
    layout_file = get_layout_file(slug)
    
    if layout_file.exists():
        with open(layout_file, 'r', encoding='utf-8') as f:
            layout = json.load(f)
        
        print(f"🔄 Régénération: {page['title']} ({slug})")
        generate_html(slug, layout)

print("\n✅ Toutes les pages ont été régénérées !")