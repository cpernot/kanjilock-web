from fastapi import APIRouter
import csv, random, uuid
from backend.data.kanji_loader import load_kanjilock
from backend.core.logging import log_event
from backend.core.config import DATA_DIR

router = APIRouter(prefix="/api")

COMPOSE_FILE = DATA_DIR / "liste_de_mots.csv"

def load_compose_data():
    rows = []
    with open(COMPOSE_FILE, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for r in reader:
            rows.append(r)
    return rows

COMPOSE_DATA = load_compose_data()
KANJILOCK = load_kanjilock()
COMPOSE_SESSIONS = {}

def pick_random_words(excluding, n):
    """Pick random words from compose data excluding given list"""
    pool = set()
    for row in COMPOSE_DATA:
        words = row["liste_de_mots"].split(",")
        for w in words:
            w = w.strip()
            if w and w not in excluding:
                pool.add(w)

    pool = list(pool)
    random.shuffle(pool)
    return pool[:n]

@router.get("/quiz_compose")
def quiz_compose():
    row = random.choice(COMPOSE_DATA)
    kanji = row["kanji"].strip()

    k = KANJILOCK[kanji]
    if not k:
        return {"error": "Kanji introuvable"}
    # mots_corrects = row["liste_de_mots"].split(",")
    mots_corrects = [
            w.strip()
            for w in row["liste_de_mots"].split(",")
            if w.strip()
        ]
    leurres = pick_random_words(
        excluding=mots_corrects,
        n=max(0, 6 - len(mots_corrects))
    )
    options = mots_corrects + leurres
    random.shuffle(options)

    qid = str(uuid.uuid4())
    COMPOSE_SESSIONS[qid] = {
        "kanji": kanji,
        "correct": set(mots_corrects)
    }
    log_event({
        "event": "compose_quiz_shown",
        "kanji": kanji,
        "options": options
    })
    return {
        "qid": qid,
        "kanji": kanji,
        "signification": k["signification"],
        "options": options
    }


@router.post("/quiz_compose/validate")
def validate(payload: dict):
    qid = payload["qid"]
    selected = set(payload.get("selected", []))

    session = COMPOSE_SESSIONS.pop(qid, None)
    if not session:
        return {"error": "Session expirée"}

    correct = session["correct"]
    success = selected == correct

    k = KANJILOCK.get(session["kanji"], {})

    log_event({
        "event": "compose_answer",
        "kanji": session["kanji"],
        "selected": list(selected),
        "correct": list(correct),
        "success": success
    })

    return {
        "success": success,
        "kanji": session["kanji"],
        "extras": {
            "romaji": k["romaji"],
            "mot": k["mot"],
            "signification_mot": k["signification_mot"],
            "lecture_mot": k["lecture_mot"],
            "boite": k["boite"]
        }
    }
