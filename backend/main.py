from fastapi import FastAPI
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from backend.core.config import FRONTEND_DIR
from backend.data.progress import load_data

# 1. DEFINITION DU LIFESPAN
@asynccontextmanager
async def lifespan(app: FastAPI):
    from backend.core.config import supabase
    print("🚀 STARTUP: Initialisation du serveur...")
    
    # --- Chargement des données ---
    # try:
    #     load_data(USER_ID)
    #     print(f"✅ Données utilisateur chargées pour : {USER_ID}")
    # except Exception as e:
    #     print(f"⚠️ Erreur chargement user: {e}")

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
        print(f"✅ {len(app.state.kanji_cache)} kanjis en cache (avec composition).")

    except Exception as e:
        print(f"❌ Erreur chargement cache kanji: {e}")
        # En cas d'erreur critique, on évite que l'app plante, mais le quiz sera vide
        app.state.kanji_cache = {}

    # --- AFFICHAGE DES ROUTES (Le print que tu aimes) ---
    print("\n--- 🛣️ ROUTES ENREGISTRÉES ---")
    for route in app.routes:
        methods = getattr(route, "methods", "N/A")
        print(f"Path: {route.path} | Methods: {methods}")
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
#from backend.api.answer import router as answer_router
from backend.api.stats import router as stats_router
from backend.api.quiz_compose import router as compose_router
from backend.api.session import router as session_router
from backend.api.ranking import router as ranking_router

app.include_router(quiz_router, prefix="/api")
#app.include_router(answer_router, prefix="/api")
app.include_router(stats_router, prefix="/api")
app.include_router(compose_router, prefix="/api")
app.include_router(session_router, prefix="/api")
app.include_router(ranking_router, prefix="/api")

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
