import os

OUTPUT_FILE = "kanjilock_backup_html.txt"
EXCLUDE_DIRS = {"main_data", "__pycache__", ".git", ".venv", "venv", "node_modules", "data"}
EXCLUDE_EXT = {".pyc", ".log", ".env", ".md", ".txt",
               ".xlsx", "migrate_to_supabase.py", "export_project_to_txt.py","extract_requirements.py", "project_structure.py"}

def should_skip(path):
    parts = set(path.split(os.sep))
    return bool(parts & EXCLUDE_DIRS)

with open(OUTPUT_FILE, "w", encoding="utf-8") as out:
    for root, dirs, files in os.walk("."):
        if should_skip(root):
            continue

        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]

        for file in files:
            if any(file.endswith(ext) for ext in EXCLUDE_EXT):
                continue

            path = os.path.join(root, file)

            try:
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
            except Exception as e:
                content = f"[Erreur lecture: {e}]"

            out.write("\n" + "=" * 80 + "\n")
            out.write(f"FILE: {path}\n")
            out.write("=" * 80 + "\n")
            out.write(content + "\n")

print(f"✅ Projet exporté dans {OUTPUT_FILE}")
