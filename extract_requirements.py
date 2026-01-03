import os
import re
from pathlib import Path

def extract_imports(directory):
    imports = set()
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.py'):
                filepath = os.path.join(root, file)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                    # Trouver les imports de la forme 'import x' ou 'from x import y'
                    found_imports = re.findall(r'^(?:import|from)\s+([a-zA-Z0-9_]+)', content, re.MULTILINE)
                    for imp in found_imports:
                        # Ignorer les imports internes (commencent par un point ou sont des noms de dossiers locaux)
                        if not imp.startswith('.') and imp not in ['backend', 'core', 'api', 'models', 'main']:
                            imports.add(imp)
    return sorted(imports)

if __name__ == "__main__":
    backend_dir = "backend"
    requirements = extract_imports(backend_dir)
    print("Bibliothèques externes utilisées dans le backend :")
    for req in requirements:
        print(f"- {req}")
    print("\nPour créer requirements.txt, copie cette liste :")
    print("\n".join(requirements))
