from fastapi import FastAPI
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import os
from datetime import datetime

# Imports des routers
from backend.api.quiz import router as quiz_router
from backend.api.answer import router as answer_router
from backend.api.stats import router as stats_router
from backend.api.quiz_compose import router as compose_router
from backend.api.session import router as session_router
from backend.api.ranking import router as ranking_router

from backend.core.config import FRONTEND_DIR, USER_ID
from backend.data.progress import load_data


# Variable globale pour les kanjis
KANJI_CACHE = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 STARTUP: Lifespan démarré")
    # --- [STARTUP] ---
    global KANJI_CACHE
    from backend.core.config import supabase
    from backend.data.progress import load_data
    from backend.core.config import USER_ID
    
    print("🚀 Initialisation du serveur (Lifespan)...")
    
    # 1. Charger les données utilisateur
    try:
        load_data(USER_ID)
        print(f"✅ Données utilisateur chargées pour : {USER_ID}")
    except Exception as e:
        print(f"⚠️ Erreur chargement user: {e}")

    # 2. Charger le Cache Kanjis
    try:
        all_data = []
        chunk_size = 1000
        start = 0
        while True:
            res = supabase.table('kanji').select("*").range(start, start + chunk_size - 1).execute()
            all_data.extend(res.data)
            if len(res.data) < chunk_size:
                break
            start += chunk_size
        
        # Stockage dans l'état de l'application pour accès via request.app.state
        app.state.kanji_cache = {item['kanji']: item['data'] for item in all_data}
        print(f"✅ {len(app.state.kanji_cache)} kanjis en cache.")
    except Exception as e:
        print(f"❌ Erreur chargement cache kanji: {e}")
        app.state.kanji_cache = {}

    yield
    # --- [SHUTDOWN] ---
    print("Shutting down...")
app = FastAPI(lifespan=lifespan)    

# 1. CORS en premier
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # On garde "*" pour les tests, on sécurisera après
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Inclusion des routers avec le préfixe /api
app.include_router(quiz_router, prefix="/api")
app.include_router(answer_router, prefix="/api")
app.include_router(stats_router, prefix="/api")
app.include_router(compose_router, prefix="/api")
app.include_router(session_router, prefix="/api")
app.include_router(ranking_router, prefix="/api")

# 3. Fichiers statiques (Utile pour voir l'interface sur Render si besoin)
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
# @app.on_event("startup")
# async def startup_event():
#     global KANJI_CACHE
#     from backend.core.config import supabase
#     print("🚀 Initialisation du serveur...")
    
#     # Pré-chargement des données utilisateur (Supabase)
#     try:
#         load_data(USER_ID)
#         print(f"✅ Données utilisateur chargées pour : {USER_ID}")
#     except Exception as e:
#         print(f"⚠️ Erreur chargement initial user: {e}")

#     # Chargement du Cache Kanjis
#     try:
#         all_data = []
#         chunk_size = 1000
#         start = 0
#         while True:
#             res = supabase.table('kanji').select("*").range(start, start + chunk_size - 1).execute()
#             all_data.extend(res.data)
#             if len(res.data) < chunk_size: break
#             start += chunk_size
#         KANJI_CACHE = {item['kanji']: item['data'] for item in all_data}
#         app.state.kanji_cache = KANJI_CACHE  # <--- AJOUTE CETTE LIGNE
#         print(f"✅ {len(KANJI_CACHE)} kanjis en cache.")
#     except Exception as e:
#         print(f"❌ Erreur chargement cache kanji: {e}")

@app.on_event("startup")
async def debug_routes():
    for route in app.routes:
        # On vérifie si l'attribut 'methods' existe avant de l'afficher
        methods = getattr(route, "methods", "N/A")
        print(f"Route enregistrée: {route.path} | Methods: {methods}")