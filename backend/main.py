from fastapi import FastAPI
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from backend.core.config import FRONTEND_DIR
from backend.data.progress import load_data
from backend.core.config import supabase
import os

app = FastAPI()

# 環境変数が "true" の場合のみチャット機能をロードする
ENABLE_CHAT = os.getenv("ENABLE_CHAT", "false").lower() == "true"

if ENABLE_CHAT:
    try:
        from backend.chat import router as chat_router
        app.include_router(chat_router, prefix="/api/chat")
        print("🤖 Chat mode enabled")
    except ImportError as e:
        print(f"⚠️ Chat failed to load: {e}")
else:
    print("📴 Chat mode disabled (Save Memory)")

@app.get("/")
def home():
    return {"message": "Server is running", "chat_enabled": ENABLE_CHAT}

# 1. DEFINITION DU LIFESPAN
@asynccontextmanager
async def lifespan(app: FastAPI):    
    print("🚀 STARTUP: Initialisation du serveur...")
    try:
        # 1. Récupérer TOUS les kanjis (pagination)
        all_data = []
        chunk_size = 1000
        start = 0
        while True:
            res = supabase.table('kanji').select("*").range(start, start + chunk_size - 1).execute()
            all_data.extend(res.data)
            if len(res.data) < chunk_size: break
            start += chunk_size

        # 2. Récupérer la table de composition (CSV importé)
        # Note: Si la table est très grande, il faudrait aussi paginer, 
        # mais pour un fichier CSV de kanjis ça devrait passer d'un coup.
        response_comp = supabase.table("kanji_mot").select("*").execute()
        comp_map = {item['kanji']: item['liste_de_mots'] for item in response_comp.data}

        # 3. Construction du cache final
        final_cache = {}

        for row in all_data:
            k_char = row['kanji']      # Le caractère (Clé)
            k_infos = row['data']      # Le contenu JSON (romaji, signification...) [cite: 17]

            # FUSION : On injecte la liste de mots DANS l'objet d'infos
            # C'est important pour que le frontend puisse faire 'staticData[k].comp_words'
            if k_char in comp_map:
                k_infos['comp_words'] = comp_map[k_char]
            
            final_cache[k_char] = k_infos

        app.state.kanji_cache = final_cache
        chat.build_vector_store(final_cache)
        print(f"✅ {len(app.state.kanji_cache)} kanjis en cache (avec composition).")

    except Exception as e:
        print(f"❌ Erreur chargement cache kanji: {e}")
        # En cas d'erreur critique, on évite que l'app plante, mais le quiz sera vide
        app.state.kanji_cache = {}

    # --- AFFICHAGE DES ROUTES (Le print que tu aimes) ---
    print("\n--- 🛣️ ROUTES ENREGISTRÉES ---")
    for route in app.routes:
        methods = getattr(route, "methods", "N/A")
        # print(f"Path: {route.path} | Methods: {methods}")
    print(f"Path: {len(route.path)} | Methods: {methods}")
    print("------------------------------\n")

    yield
    print("🛑 SHUTDOWN: Fermeture du serveur...")

# 2. CRÉATION DE L'APP (Indispensable à la racine pour Uvicorn)
app = FastAPI(lifespan=lifespan)
# 3. MIDDLEWARE
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# 4. IMPORTS ET INCLUSION DES ROUTERS
# (On les importe ici pour s'assurer que l'objet 'app' existe déjà)
from backend.api.quiz import router as quiz_router
from backend.api.stats import router as stats_router
from backend.api.quiz_compose import router as compose_router
from backend.api.session import router as session_router
from backend.api.ranking import router as ranking_router
from backend.api import chat 

app.include_router(quiz_router, prefix="/api")
app.include_router(stats_router, prefix="/api")
app.include_router(compose_router, prefix="/api")
app.include_router(session_router, prefix="/api")
app.include_router(ranking_router, prefix="/api")
app.include_router(chat.router, prefix="/api")

# 5. FICHIERS STATIQUES ET ROUTES SPA
if FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR / "static")), name="static")
    app.mount("/pages", StaticFiles(directory=str(FRONTEND_DIR / "pages")), name="static_pages")

@app.get("/")
@app.get("/quiz-page")
@app.get("/intrus-page")
@app.get("/stats-page")
@app.get("/compose-page")
@app.get("/ranking-page")
def spa_index():
    index_file = FRONTEND_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return {"error": "Frontend files not found"}
@app.get("/api/quiz/session")
async def get_box_session(box_id: int, player_id: str):
    # 1. Get all kanji from cache
    # 2. Filter by info['boite'] == box_id
    # 3. Check levels: Skip kanji that are already Level 4 (Mastered)
    # 4. Return 14 random kanji from that box    
    all_kanji = app.state.kanji_cache
    box_kanji = [k for k in all_kanji.values() if k.get('boite') == box_id]    
    # Selection logic here...
    return box_kanji[:14]

@app.post("/api/box-progress/save")
async def save_box_progress(data: dict):
    # Ensure types match your DB schema
    payload = {
        "user_id": data['user_id'],
        "boite": data['boite'], 
        "mode": data.get('mode', 'qa'),
        "level": int(data['level']),
        "last_attempt": data['last_attempt']
    }    
    try:
        # Update on_conflict to include mode
        res = supabase.table('box_progress').upsert(
            payload, 
            on_conflict="user_id,boite,mode" 
        ).execute()
        return {"status": "success"}
    except Exception as e:
        print(f"❌ Supabase Error: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/api/box-progress/{user_id}")
async def get_all_box_progress(user_id: str):
    # Select mode as well
    res = supabase.table('box_progress').select("boite, level, mode").eq("user_id", user_id).execute()
    
    # Transform into a nested dictionary: { "box_id": { "qa": 2, "qb": 1 } }
    progress_map = {}
    for item in res.data:
        b_id = str(item['boite'])
        mode = item.get('mode', 'qa')
        lvl = item['level']
        
        if b_id not in progress_map:
            progress_map[b_id] = {}
        
        progress_map[b_id][mode] = lvl
        
    return progress_map

@app.get("/api/available-boxes")
async def get_available_boxes():
    all_boxes = []
    seen = set()
    limit = 1000
    offset = 0
    
    try:
        while True:
            # Fetch 1000 rows at a time, ordered by the database ID
            # Use data->>boite to extract the value from the JSON column
            res = supabase.table('kanji').select("id, data->>boite").order("id").range(offset, offset + limit - 1).execute()
            
            if not res.data:
                break
            
            for item in res.data:
                # The select "data->>boite" results in a key named 'boite' in the dict
                box_val = item.get('boite')
                if box_val is not None and box_val not in seen:
                    all_boxes.append(box_val)
                    seen.add(box_val)
            
            # If we got fewer rows than the limit, we've reached the end
            if len(res.data) < limit:
                break
            offset += limit
            
        print(f"📦 Found {len(all_boxes)} unique boxes in sequence.")
        return all_boxes
    except Exception as e:
        print(f"❌ Error fetching boxes: {e}")
        return []

