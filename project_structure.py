import os
import ast

EXCLUDE_DIRS = {"data", "__pycache__", ".git", ".venv", "venv", "node_modules"}
OUTPUT_FILE = "kanjilock_structure.txt"

def should_skip(path):
    return any(part in EXCLUDE_DIRS for part in path.split(os.sep))

def analyze_python_file(path):
    result = []
    try:
        with open(path, "r", encoding="utf-8") as f:
            tree = ast.parse(f.read())
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                result.append(f"    def {node.name}()")
            elif isinstance(node, ast.ClassDef):
                result.append(f"    class {node.name}")
    except Exception as e:
        result.append(f"    [Erreur analyse: {e}]")
    return result

with open(OUTPUT_FILE, "w", encoding="utf-8") as out:
    for root, dirs, files in os.walk("."):
        if should_skip(root):
            continue

        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]

        level = root.count(os.sep)
        indent = "  " * level
        out.write(f"{indent}{os.path.basename(root)}/\n")

        for file in files:
            out.write(f"{indent}  {file}\n")

            if file.endswith(".py"):
                path = os.path.join(root, file)
                details = analyze_python_file(path)
                for line in details:
                    out.write(f"{indent}    {line}\n")

print(f"✅ Structure exportée dans {OUTPUT_FILE}")
