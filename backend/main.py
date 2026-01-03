from fastapi import FastAPI
from fastapi import Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import  os 
from pathlib import Path
from datetime import date, datetime
from backend.data.progress import load_data, save_data, get_user, get_user_srs

from backend.api.quiz import router as quiz_router
from backend.api.answer import router as answer_router
from backend.api.stats import router as stats_router
from backend.api.quiz_compose import router as compose_router
from backend.api.session import router as session_router
from backend.api.ranking import router as ranking_router

FAILED_QUEUE = {}
from backend.core.config import FRONTEND_DIR
from backend.core.config import USER_ID

app = FastAPI()

# Autoriser le frontend à communiquer avec le backend
origins = [
    "http://localhost:5500", # Pour tes tests locaux (Live Server VS Code par ex)
    "http://127.0.0.1:5500",
    "https://kanjilock-web.vercel.app", # L'URL Vercel future
    "https://kanjilock-web.vercel.app/"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("CWD =", os.getcwd())

now = datetime.now().isoformat()
app.include_router(quiz_router, prefix="/api")
app.include_router(answer_router, prefix="/api")
app.include_router(stats_router, prefix="/api")
app.include_router(compose_router, prefix="/api")
app.include_router(session_router, prefix="/api")
app.include_router(ranking_router, prefix="/api")



def get_srs_stats(user_srs):
    counts = {1: 0, 2: 0, 3: 0, 4: 0}

    for state in user_srs.values():
        lvl = state["level"]
        counts[lvl] += 1

    return counts

def get_daily_stats(user):
    return user.get("daily_stats", {})

def get_kanji_stats(user_srs, kanjis):
    result = []

    for kanji, state in user_srs.items():
        k = kanjis.get(kanji, {})
        result.append({
            "kanji": kanji,
            "level": state["level"],
            "next_review": state["next_review"],
            "signification": k.get("signification", "")
        })

    return result

# 📦 Static files (CSS / JS / images)
app.mount("/static",StaticFiles(directory=FRONTEND_DIR /"static"),name="static")
app.mount(    "/pages",    StaticFiles(directory=FRONTEND_DIR / "pages"),    name="pages")
# @app.get("/")
# def root():
#     index_path = FRONTEND_DIR / "index.html"
#     return FileResponse(index_path)
@app.get("/")
@app.get("/quiz-page")
@app.get("/intrus-page")
@app.get("/stats-page")
@app.get("/compose-page")
@app.get("/ranking-page")
def spa_index():
    return FileResponse(FRONTEND_DIR / "index.html")
#-----------------------------------------------------------------##########################################




# --- Initialisation des données au démarrage ---
# On utilise le USER_ID importé depuis backend.core.config
data = load_data(USER_ID) 

# Le reste de ton code s'adapte
user = get_user(data, USER_ID)
# Note : vérifie si le mode est "qa" ou "qd" comme dans ton JSON
user_srs = get_user_srs(user, "qd") 

counts = get_srs_stats(user_srs)
daily = get_daily_stats(user)

print(f"Stats pour l'utilisateur {USER_ID}: {counts}")

for day, levels in daily.items():
    print(day, levels)

# Crée un dictionnaire global
KANJI_CACHE = {}

@app.on_event("startup")
async def startup_event():
    global KANJI_CACHE
    from backend.core.config import supabase
    print("🚀 Chargement du Cache Kanjis...")
    
    # On fait une boucle pour tout récupérer si tu as plus de 1000/2000 lignes
    all_data = []
    chunk_size = 1000
    start = 0
    
    while True:
        # On demande par paquets de 1000
        res = supabase.table('kanji').select("*").range(start, start + chunk_size - 1).execute()
        all_data.extend(res.data)
        if len(res.data) < chunk_size:
            break
        start += chunk_size

    KANJI_CACHE = {item['kanji']: item['data'] for item in all_data}
    print(f"✅ {len(KANJI_CACHE)} kanjis chargés en mémoire.")