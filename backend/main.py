from backend.core.auth import get_current_user
from fastapi import FastAPI, Request, Depends
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from backend.core.config import FRONTEND_DIR
from backend.data.progress import load_data
from backend.core.config import supabase
import os

# 環境変数が "true" の場合のみチャット機能をロードする
ENABLE_CHAT = os.getenv("ENABLE_CHAT", "false").lower() == "true"

async def initialize_cache(app: FastAPI):
    print("🚀 STARTUP: Initializing kanji cache...")
    try:
        # 1. Fetch ALL kanji (with pagination)
        all_data = []
        chunk_size = 1000
        start = 0
        while True:
            # Try sorting by 'kanji' if 'id' doesn't exist
            res = supabase.table('kanji').select("*").order('id').range(start, start + chunk_size - 1).execute()
            all_data.extend(res.data)
            if len(res.data) < chunk_size: break
            start += chunk_size

        if not all_data:
            print("⚠️ WARNING: No kanji found in 'kanji' table!")

        # 2. Fetch composition table
        response_comp = supabase.table("kanji_mot").select("*").execute()
        comp_map = {item['kanji']: item['liste_de_mots'] for item in response_comp.data}

        # 3. Build final cache
        final_cache = {}
        for row in all_data:
            k_char = row['kanji']
            k_infos = row.get('data', {})
            if k_char in comp_map:
                k_infos['comp_words'] = comp_map[k_char]
            elif 'custom_keywords' in k_infos:
                k_infos['comp_words'] = k_infos['custom_keywords']
            final_cache[k_char] = k_infos

        app.state.kanji_cache = final_cache
        
        # 4. Build box cache
        seen_boxes = set()
        for k_infos in final_cache.values():
            box_val = k_infos.get('boite')
            if box_val is not None:
                seen_boxes.add(str(box_val))
        
        # Master sorting for boxes using official sequence
        from backend.box_metadata import get_box_sort_index
        app.state.available_boxes = sorted(list(seen_boxes), key=get_box_sort_index)

        if ENABLE_CHAT:
            from backend.api import chat
            import asyncio
            asyncio.create_task(chat.build_vector_store(final_cache))
            print("🤖 Chat mode enabled (Vector store building in background...)")
        
        app.state.is_ready = True
        print(f"✅ Cache ready: {len(app.state.kanji_cache)} kanjis loaded.")

    except Exception as e:
        print(f"❌ Erreur chargement cache kanji: {e}")
        app.state.kanji_cache = {}
        app.state.available_boxes = []

# 1. DEFINITION DU LIFESPAN
@asynccontextmanager
async def lifespan(app: FastAPI):    
    print("🚀 STARTUP: Initialisation du serveur...")
    
    # Initialisation de l'état par défaut (pour éviter les erreurs 500 pendant le chargement)
    app.state.kanji_cache = {}
    app.state.available_boxes = []
    app.state.is_ready = False

    # Lancement du chargement en arrière-plan
    import asyncio
    asyncio.create_task(initialize_cache(app))

    # --- AFFICHAGE DES ROUTES ---
    print("\n--- 🛣️ ROUTES ENREGISTRÉES ---")
    for route in app.routes:
        methods = getattr(route, "methods", "N/A")
        path = getattr(route, "path", "N/A")
        print(f"Path: {path:30} | Methods: {methods}")
    print("------------------------------\n")

    yield
    print("🛑 SHUTDOWN: Fermeture du serveur...")

# 2. CRÉATION DE L'APP (Indispensable à la racine pour Uvicorn)
app = FastAPI(lifespan=lifespan)

# @app.get("/")
# def home():
#     return {"message": "Server is running", "chat_enabled": ENABLE_CHAT}

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

if ENABLE_CHAT:
    app.include_router(chat.router, prefix="/api/chat")

@app.get("/health")
def health_check():
    return {"status": "ok", "version": "2.0"}

@app.get("/api/auth/test")
def auth_test(user = Depends(get_current_user)):
    """
    Test endpoint to verify JWT token.
    """
    return {
        "status": "authenticated",
        "user_id": user.id,
        "email": user.email
    }

@app.get("/api/ready")
def ready_check():
    """Returns whether the cache is fully loaded and ready."""
    return {
        "ready": getattr(app.state, "is_ready", False),
        "count": len(getattr(app.state, "kanji_cache", {}))
    }
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
    from fastapi.responses import JSONResponse
    try:
        payload = {
            "user_id": data['user_id'],
            "boite": data['boite'], 
            "mode": data.get('mode', 'qa'),
            "level": int(data['level']),
            "last_attempt": data.get('last_attempt')
        }
        res = supabase.table('box_progress').upsert(
            payload, 
            on_conflict="user_id,boite,mode" 
        ).execute()
        return {"status": "success", "data": res.data}
    except Exception as e:
        print(f"❌ Erreur save_box_progress: {e}")
        # Return proper error message and status
        return JSONResponse(
            status_code=401 if "unauthorized" in str(e).lower() else 500,
            content={"status": "error", "message": str(e)}
        )

@app.get("/api/box-progress/{user_id}")
async def get_all_box_progress(user_id: str):
    try:
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
    except Exception as e:
        print(f"❌ Erreur get_all_box_progress: {e}")
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/api/settings/{player}")
async def get_settings_api(player: str):
    from backend.data.progress import get_player_settings
    settings = get_player_settings(player)
    return settings if settings else {}

@app.post("/api/settings/{player}")
async def save_settings_api(player: str, settings: dict):
    from backend.data.progress import save_player_settings
    success = save_player_settings(player, settings)
    return {"status": "success" if success else "error"}

@app.get("/api/available-boxes")
async def get_available_boxes():
    """Returns the cached list of unique boxes (O(1) retrieval)"""
    return getattr(app.state, "available_boxes", [])

# 6. SERVE FRONTEND (Next.js Static Export)
# This MUST be after all /api routes
if FRONTEND_DIR.exists():
    print(f"📂 Serving frontend from: {FRONTEND_DIR}")
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
    
    # Catch-all route for SPA (Next.js) navigation
    @app.exception_handler(404)
    async def custom_404_handler(request: Request, exc):
        if not request.url.path.startswith("/api"):
            index_path = FRONTEND_DIR / "index.html"
            if index_path.exists():
                return FileResponse(index_path)
        return {"detail": "Not Found"}
else:
    print(f"⚠️ Warning: FRONTEND_DIR not found at {FRONTEND_DIR}. Frontend will not be served.")

