# diagnostic.py - Script pour identifier l'erreur 500

"""
Exécutez ce script pour diagnostiquer l'erreur 500:
python diagnostic.py
"""

from pathlib import Path
import json
import re
import sys

# Configuration (adaptez selon votre structure)
BASE_DIR = Path(__file__).parent
PAGES_DIR = BASE_DIR / 'pages'
DATA_DIR = BASE_DIR / 'data'
INVENTORY_FILE = DATA_DIR / 'inventory.json'

def slugify(text):
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '-', text)
    return text.strip('-')

def load_inventory():
    try:
        with open(INVENTORY_FILE, 'r', encoding='utf-8') as f:
            content = f.read().strip()
            return json.loads(content) if content else []
    except Exception as e:
        print(f"❌ Erreur chargement inventory: {e}")
        return []

def get_page_dir(slug):
    return PAGES_DIR / slug

def get_layout_file(slug):
    return get_page_dir(slug) / 'layout.json'

def extract_page_preview(slug):
    """Extrait un aperçu textuel d'une page"""
    layout_file = get_layout_file(slug)
    
    if not layout_file.exists():
        return ""
    
    try:
        with open(layout_file, 'r', encoding='utf-8') as f:
            layout = json.load(f)
        
        texts = []
        for comp in layout:
            if comp.get('type') == 'text' and comp.get('content'):
                content = comp.get('content', '')
                clean_text = re.sub(r'<[^>]+>', ' ', content)
                clean_text = re.sub(r'\s+', ' ', clean_text).strip()
                if clean_text:
                    texts.append(clean_text)
        
        full_text = ' '.join(texts)
        if len(full_text) > 200:
            return full_text[:200] + '...'
        return full_text if full_text else "Aucun aperçu disponible"
    
    except Exception as e:
        print(f"   ⚠️ Erreur extraction preview {slug}: {e}")
        return "Aperçu non disponible"

def test_metadata_generation():
    """Teste la génération des métadonnées"""
    print("\n" + "="*60)
    print("🔍 DIAGNOSTIC GÉNÉRATION MÉTADONNÉES")
    print("="*60 + "\n")
    
    inventory = load_inventory()
    print(f"📄 Pages trouvées dans inventory.json: {len(inventory)}\n")
    
    if not inventory:
        print("❌ PROBLÈME: Aucune page dans l'inventaire!")
        return
    
    metadata = {}
    errors = []
    
    for i, page in enumerate(inventory, 1):
        slug = page['slug']
        title = page.get('title', slug)
        
        print(f"[{i}/{len(inventory)}] Test de: {title} ({slug})")
        
        try:
            layout_file = get_layout_file(slug)
            
            # Vérifier l'existence du fichier
            if not layout_file.exists():
                print(f"   ⚠️ Pas de layout.json")
                metadata[slug] = {
                    'title': title,
                    'slug': slug,
                    'preview': 'Page sans contenu',
                    'hidden_from_nav': page.get('hidden_from_nav', False)
                }
                continue
            
            # Vérifier la taille du fichier
            file_size = layout_file.stat().st_size
            print(f"   📊 Taille layout.json: {file_size} bytes")
            
            # Lire le layout
            with open(layout_file, 'r', encoding='utf-8') as f:
                layout = json.load(f)
            
            print(f"   📦 Composants: {len(layout)}")
            
            # Compter les types
            types = {}
            for comp in layout:
                comp_type = comp.get('type', 'unknown')
                types[comp_type] = types.get(comp_type, 0) + 1
            
            if types:
                print(f"   🏷️  Types: {types}")
            
            # Extraire le preview
            preview = extract_page_preview(slug)
            preview_length = len(preview)
            
            print(f"   📝 Preview: {preview_length} caractères")
            if preview_length > 0:
                print(f"      → {preview[:80]}...")
            
            # Créer les métadonnées
            metadata[slug] = {
                'title': title,
                'slug': slug,
                'preview': preview,
                'hidden_from_nav': page.get('hidden_from_nav', False)
            }
            
            print(f"   ✅ OK\n")
            
        except json.JSONDecodeError as e:
            error_msg = f"JSON invalide dans {slug}/layout.json: {e}"
            print(f"   ❌ {error_msg}\n")
            errors.append(error_msg)
            
        except Exception as e:
            error_msg = f"Erreur sur {slug}: {str(e)}"
            print(f"   ❌ {error_msg}\n")
            errors.append(error_msg)
    
    print("\n" + "="*60)
    print("📊 RÉSULTATS")
    print("="*60 + "\n")
    
    print(f"✅ Pages traitées avec succès: {len(metadata)}/{len(inventory)}")
    
    if errors:
        print(f"\n❌ Erreurs détectées: {len(errors)}")
        for error in errors:
            print(f"   - {error}")
    else:
        print("\n✅ Aucune erreur détectée!")
    
    # Vérifier les métadonnées vides
    empty_previews = [slug for slug, meta in metadata.items() 
                     if not meta['preview'] or meta['preview'] in ['', 'Aucun aperçu disponible', 'Aperçu non disponible']]
    
    if empty_previews:
        print(f"\n⚠️ Pages sans aperçu: {len(empty_previews)}")
        for slug in empty_previews:
            print(f"   - {slug}")
    
    # Sauvegarder les métadonnées
    print("\n" + "="*60)
    print("💾 SAUVEGARDE")
    print("="*60 + "\n")
    
    metadata_file = DATA_DIR / 'pages-metadata.json'
    
    try:
        with open(metadata_file, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2, ensure_ascii=False)
        
        saved_size = metadata_file.stat().st_size
        print(f"✅ Métadonnées sauvegardées: {metadata_file}")
        print(f"   Taille: {saved_size} bytes")
        print(f"   Pages: {len(metadata)}")
        
        # Afficher un échantillon
        if metadata:
            sample_slug = list(metadata.keys())[0]
            print(f"\n📋 Exemple de métadonnées ({sample_slug}):")
            print(json.dumps(metadata[sample_slug], indent=2, ensure_ascii=False))
        
    except Exception as e:
        print(f"❌ Erreur sauvegarde: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

def test_html_generation(test_slug=None):
    """Teste la génération HTML sur une page spécifique"""
    inventory = load_inventory()
    
    if not inventory:
        print("❌ Aucune page dans l'inventaire")
        return
    
    # Choisir une page à tester
    if test_slug:
        page = next((p for p in inventory if p['slug'] == test_slug), None)
        if not page:
            print(f"❌ Page '{test_slug}' introuvable")
            return
    else:
        page = inventory[0]
    
    slug = page['slug']
    title = page['title']
    
    print("\n" + "="*60)
    print(f"🔨 TEST GÉNÉRATION HTML: {title} ({slug})")
    print("="*60 + "\n")
    
    try:
        # Charger le layout
        layout_file = get_layout_file(slug)
        
        if not layout_file.exists():
            print("❌ Pas de layout.json")
            return
        
        with open(layout_file, 'r', encoding='utf-8') as f:
            layout = json.load(f)
        
        print(f"📦 Layout chargé: {len(layout)} composants")
        
        # Charger les métadonnées
        metadata_file = DATA_DIR / 'pages-metadata.json'
        
        if not metadata_file.exists():
            print("⚠️ pages-metadata.json n'existe pas, génération...")
            test_metadata_generation()
        
        with open(metadata_file, 'r', encoding='utf-8') as f:
            pages_metadata = json.load(f)
        
        print(f"📊 Métadonnées chargées: {len(pages_metadata)} pages")
        
        # Tester la sérialisation JSON
        print("\n🧪 Test sérialisation JSON...")
        
        try:
            headings_json = json.dumps([], ensure_ascii=False)
            print(f"   ✅ headings_json: OK")
        except Exception as e:
            print(f"   ❌ headings_json: {e}")
        
        try:
            links_json = json.dumps([], ensure_ascii=False)
            print(f"   ✅ links_json: OK")
        except Exception as e:
            print(f"   ❌ links_json: {e}")
        
        try:
            metadata_json = json.dumps(pages_metadata, ensure_ascii=False)
            print(f"   ✅ metadata_json: OK ({len(metadata_json)} chars)")
        except Exception as e:
            print(f"   ❌ metadata_json: {e}")
            # Identifier la page problématique
            for page_slug, meta in pages_metadata.items():
                try:
                    json.dumps(meta, ensure_ascii=False)
                except Exception as e2:
                    print(f"      ❌ Problème avec page '{page_slug}': {e2}")
        
        print("\n✅ Tous les tests JSON passés!")
        
    except Exception as e:
        print(f"\n❌ ERREUR: {e}")
        import traceback
        traceback.print_exc()

def main():
    """Point d'entrée principal"""
    print("\n🚀 DÉBUT DU DIAGNOSTIC\n")
    
    # Test 1: Génération des métadonnées
    success = test_metadata_generation()
    
    if not success:
        print("\n❌ Échec du test de métadonnées, arrêt.")
        sys.exit(1)
    
    # Test 2: Génération HTML
    print("\n" + "="*60)
    input("Appuyez sur Entrée pour tester la génération HTML...")
    test_html_generation()
    
    print("\n" + "="*60)
    print("✅ DIAGNOSTIC TERMINÉ")
    print("="*60 + "\n")
    
    print("📝 PROCHAINES ÉTAPES:")
    print("   1. Si des erreurs persistent, vérifiez les layouts JSON")
    print("   2. Testez la sauvegarde depuis l'éditeur")
    print("   3. Vérifiez les logs du serveur Flask\n")

if __name__ == '__main__':
    main()