// frontend/static/js/quizEngine.js

let staticData = {}; // kanjilock.json
let userProgress = {}; // SRS states
let currentSession = []; 
// 🆕 VARIABLES DE GESTION DE FLUX
let sessionHistory = new Set(); // Kanjis déjà vus dans cette session (pour éviter doublon immédiat)
let penaltyQueue = new Map();   // Kanji -> Nombre de tours à attendre (pour les erreurs)
let boxProgress = {}; 

// Configuration des Modes (Portage de quiz_modes.py)
const MODES = {
    "qa": {
        q: (k) => k.kanji,
        a: (k) => k.signification,
        extras: (k) => ({ romaji: k.romaji, mot: k.mot, lecture: k.lecture_mot, signification_mot: k.signification_mot, boite: k.boite  })
    },
    "qb": {
        q: (k) => k.signification,
        a: (k) => k.kanji,
        extras: (k) => ({  romaji: k.romaji, mot: k.mot, lecture: k.lecture_mot, signification_mot: k.signification_mot,boite: k.boite  })
    },
    "qc": {
        q: (k) => k.mot,
        a: (k) => k.signification_mot,
        extras: (k) => ({ lecture_mot: k.lecture_mot, kanji: k.kanji, signification: k.signification , romaji: k.romaji,  boite: k.boite })
    },
    "qd": {
        q: (k) => k.kanji,
        a: (k) => k.boite ,
        extras: (k) => ({ signification: k.signification , romaji: k.romaji, mot: k.mot, lecture: k.lecture_mot, signification_mot: k.signification_mot })
    },
    "qe": {
        q: (k) => k.kanji,
        a: (k) => k.romaji,
        extras: (k) => ({ signification: k.signification, mot: k.mot ,lecture: k.lecture_mot, signification_mot: k.signification_mot,boite: k.boite})
    },
     "intrus": {
        q: (k) => k.kanji,
        a: (k) => k.boite,
        extras: (k) => ({ boite: k.boite, signification: k.signification, mot: k.mot ,lecture: k.lecture_mot, signification_mot: k.signification_mot})
    }
};
const WEIGHTS = { 1: 5, 2: 3, 3: 1, 4: 0.2 };
const COOLDOWN_ERROR = 20; // Nombre de questions à attendre après une erreur
import { getPlayer_setting } from "./settings.js"; 
export let currentBoxFilter = null; 
// 1 SETTER FOR BOX
export function setBoxContext(boxId) {
    currentBoxFilter = boxId ? String(boxId) : null;
    console.log("📦 Box Context set to:", currentBoxFilter);
}
// 2 RESET BOX CONTEXT
export function resetBoxContext() {
    currentBoxFilter = null;
}
// 3 INIT ENGINE (Fetch data from server)
export async function initEngine() {
    // OPTIMISATION : Si on a déjà des données (plus de 0 clés), on ne recharge pas !
    if (Object.keys(staticData).length > 0) {
        console.log("⚡ Données déjà en mémoire, pas de rechargement.");
        return; 
    }
    const player = getPlayer_setting();
    console.log("📥 Chargement des données locales (depuis le serveur)...");
    try {
        const res = await fetch(`${API_BASE_URL}/quiz/init?player=${encodeURIComponent(player)}`);
        const data = await res.json();
        staticData = data.static_data;
        userProgress = data.user_progress;
        const savedBoxes = localStorage.getItem("kanjilock_boxes_" + player);
        boxProgress = savedBoxes ? JSON.parse(savedBoxes) : {};
        console.log(`✅ Engine prêt : ${Object.keys(staticData).length} kanjis. Box Progress:`, boxProgress);
    } catch (e) {
        console.error("Erreur chargement engine:", e);
    }
}
// 4 RESET ENGINE SESSION
export function resetEngineSession() {
    sessionHistory.clear();
    // On ne vide pas penaltyQueue ici pour que la punition persiste entre deux quiz rapides
}
// 5 GET BOX LEVEL
export function getBoxLevel(boxId) {
    const b = boxProgress[String(boxId)];
    return b ? b.level : 0;
}
// 6 HELPER: IS AVAILABLE
function isAvailable(state) {
    if (!state || !state.next_review) return true; // Dispo si nouveau
    return new Date(state.next_review) < new Date();
}
// 7 GET NEXT QUESTION
export function getNextQuestion(mode) {
     // 1. Get ALL possible keys from your data
    let allKeys = Object.keys(staticData);
    // 2. APPLY FILTER (Only if currentBoxFilter is set)
    // If currentBoxFilter is null, candidates = allKeys (Original behavior)
    let candidates = currentBoxFilter 
        ? allKeys.filter(k => String(staticData[k].boite) === currentBoxFilter)
        : allKeys;
    // 3. Fallback: If for some reason the box is empty, use all keys
    if (candidates.length === 0) candidates = allKeys;
    
    // 1. Gérer le décrément des pénalités (on réduit le compteur de 1 pour tout le monde)
    for (const [k, turns] of penaltyQueue) {
        if (turns <= 1) penaltyQueue.delete(k); // Libéré !
        else penaltyQueue.set(k, turns - 1);
    }
    const srsMode = userProgress[mode] || {};
    // const availablePool = [];
    const newItems = [];

    let availablePool = candidates.filter(k => !sessionHistory.has(k) && !penaltyQueue.has(k));

    if (availablePool.length === 0) {
        sessionHistory.clear();
        availablePool = candidates;
    }

    // 4. SELECTION Logic
// 2. Filtrer les kanjis éligibles
    // Object.keys(staticData).forEach(kanji => {
    candidates.forEach(kanji => {    
        // 🛑 FILTRE 1 : Est-il puni ? (Réponse fausse récente)
        if (penaltyQueue.has(kanji)) return;

        // 🛑 FILTRE 2 : Déjà vu dans cette session ?
        if (sessionHistory.has(kanji)) return;

        const state = srsMode[kanji];
        
        if (!state) {
            newItems.push(kanji);
        } else if (isAvailable(state)) {
            // Kanji disponible (date passée)
            const weight = WEIGHTS[state.level] || 1;
            const count = Math.ceil(weight * 10); 
            for (let i = 0; i < count; i++) {
                availablePool.push(kanji);
            }
        }
    });

    let selectedKanji;

    if (currentBoxFilter) {
        // In Box Mode: Random pick from the box (Simple cycling)
        selectedKanji = availablePool[Math.floor(Math.random() * availablePool.length)];
    } else {
        // In Global Mode: Use your existing Weight-based SRS Selection
            if (availablePool.length > 0) {
         if (newItems.length > 0 && Math.random() < 0.2) {
             selectedKanji = newItems[Math.floor(Math.random() * newItems.length)];
         } else {
             selectedKanji = availablePool[Math.floor(Math.random() * availablePool.length)];
         }
    } else if (newItems.length > 0) {
        selectedKanji = newItems[Math.floor(Math.random() * newItems.length)];
    } else {
        // FALLBACK DE SECOURS
        // Si tout est bloqué (soit fait aujourd'hui, soit puni), on tape dans les punis ou tout le reste
        // Pour éviter que l'app plante s'il n'y a plus rien de dispo.
        // const allKeys = Object.keys(staticData);
        const allKeys = candidates;
        // On essaye d'abord ceux qui ne sont pas dans l'historique immédiat
        const notSeen = allKeys.filter(k => !sessionHistory.has(k));
        const finalPool = notSeen.length > 0 ? notSeen : allKeys;
        
        selectedKanji = finalPool[Math.floor(Math.random() * finalPool.length)];
    }
        // selectedKanji = selectByWeight(availablePool, userProgress); 
    }
    
  
    // 🆕 On ajoute le gagnant à l'historique de session
    sessionHistory.add(selectedKanji);

    // ... La suite (Construction de la question) reste identique ...
    const kData = staticData[selectedKanji];
    const modeDef = getModeDefinition(mode); // (Assure-toi que cette fonction est accessible)

    // ... (Ton code de génération d'options) ...
    // Note: Pour les leurres, tu n'as pas besoin de filtrer avec sessionHistory, 
    // utiliser un kanji déjà vu comme leurre est une bonne chose !
    
    // ... Génération options ...
    
    const question = modeDef.q({kanji: selectedKanji, ...kData});
    const correctAnswer = modeDef.a({kanji: selectedKanji, ...kData});

    let options = [correctAnswer];
    const keys = Object.keys(staticData);
    while (options.length < 4) {
        let rk = keys[Math.floor(Math.random() * keys.length)];
        if (rk === selectedKanji) continue;
        let wrong = modeDef.a({kanji: rk, ...staticData[rk]});
        if (!options.includes(wrong)) options.push(wrong);
    }
    options.sort(() => Math.random() - 0.5);

    return {
        qid: crypto.randomUUID(),
        kanji: selectedKanji,
        question: question,
        options: options,
        correctAnswer: correctAnswer,
        extras: modeDef.extras({kanji: selectedKanji, ...kData})
    };
}
// 8 UPDATE ENGINE AFTER ANSWER
export function updateEngineAfterAnswer(kanji, isCorrect, mode) {
    // 1. Gestion de la punition (Erreur -> 20 tours)
    if (!isCorrect) {
        penaltyQueue.set(kanji, COOLDOWN_ERROR);
        console.log(`🚫 ${kanji} mis au coin pour ${COOLDOWN_ERROR} tours.`);
    }
    // 2. Gestion de la réussite (Succès -> Repoussé à demain MINIMUM)
    if (isCorrect) {
        // On met à jour userProgress en mémoire TOUT DE SUITE
        if (!userProgress[mode]) userProgress[mode] = {};
        if (!userProgress[mode][kanji]) userProgress[mode][kanji] = { level: 1 }; // Défaut

        const state = userProgress[mode][kanji];
        
        // Simuler la logique SRS Python pour l'affichage local
        // Si c'est juste, on repousse à demain (Time + 24h)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // On met à jour la date locale. Ainsi isAvailable(state) renverra FALSE
        // au prochain tour de boucle.
        state.next_review = tomorrow.toISOString();
        
        // Optionnel : Monter le niveau localement pour ajuster le poids si on recharge pas
        state.level = Math.min((state.level || 1) + 1, 4);
    }
}
// 9 GET MODE DEFINITION
function getModeDefinition(mode) {
    const MODES = {
        "qa": {
        q: (k) => k.kanji,
        a: (k) => k.signification,
        extras: (k) => ({ romaji: k.romaji, mot: k.mot, lecture: k.lecture_mot, signification_mot: k.signification_mot, boite: k.boite  })
    },
    "qb": {
        q: (k) => k.signification,
        a: (k) => k.kanji,
        extras: (k) => ({  romaji: k.romaji, mot: k.mot, lecture: k.lecture_mot, signification_mot: k.signification_mot,boite: k.boite  })
    },
    "qc": {
        q: (k) => k.mot,
        a: (k) => k.signification_mot,
        extras: (k) => ({ lecture_mot: k.lecture_mot, kanji: k.kanji, signification: k.signification , romaji: k.romaji,  boite: k.boite })
    },
    "qd": {
        q: (k) => k.kanji,
        a: (k) => k.boite ,
        extras: (k) => ({ signification: k.signification , romaji: k.romaji, mot: k.mot, lecture: k.lecture_mot, signification_mot: k.signification_mot })
    },
    "qe": {
        q: (k) => k.kanji,
        a: (k) => k.romaji,
        extras: (k) => ({ signification: k.signification, mot: k.mot ,lecture: k.lecture_mot, signification_mot: k.signification_mot,boite: k.boite})
    },
     "intrus": {
        q: (k) => k.kanji,
        a: (k) => k.boite,
        extras: (k) => ({ boite: k.boite, signification: k.signification, mot: k.mot ,lecture: k.lecture_mot, signification_mot: k.signification_mot})
    }
    };
    return MODES[mode] || MODES["qa"];
}
// 10 CHECK LOCAL ANSWER
export function checkLocalAnswer(questionObj, userChoice, rt_ms) {
    const isCorrect = (userChoice === questionObj.correctAnswer);
    
    // Ici tu peux aussi faire la mise à jour SRS locale temporaire
    // updateLocalSRS(questionObj.kanji, isCorrect);

    return {
        correct: isCorrect,
        bonne: questionObj.correctAnswer,
        extras: questionObj.extras,
        rt_ms: rt_ms
    };
}
//11 COMPOSE QUESTION LOCAL
export function getComposeQuestionLocal() {
    const keys = Object.keys(staticData);

    // 1. FILTRAGE : On ne garde QUE ceux qui ont la propriété 'comp_words'
    // (C'est-à-dire ceux qui étaient présents dans ton CSV kanji_mot)
    const pool = keys.filter(key => {
        const k = staticData[key];
        // On vérifie que la clé existe et n'est pas vide
        return k.comp_words && k.comp_words.trim().length > 0;
    });

    if (pool.length === 0) {
        console.warn("Aucun kanji de composition trouvé !");
        return null;
    }

    // 2. Sélection
    const selectedKey = pool[Math.floor(Math.random() * pool.length)];
    const kData = staticData[selectedKey];

    // 3. Extraction des mots corrects depuis 'comp_words'
    // On sépare par la virgule (ton format CSV)
    const correctWords = kData.comp_words.split(',')
        .map(w => w.trim())
        .filter(w => w.length > 0);

    // 4. Génération des leurres (Distractors)
    const distractors = [];
    let attempts = 0;
    
    // Pour les leurres, on pioche aussi dans le pool 'composition' 
    // pour avoir des mots crédibles
    while (distractors.length < 5 && attempts < 50) {
        attempts++;
        const randomKey = pool[Math.floor(Math.random() * pool.length)]; // On pioche dans le pool filtré
        if (randomKey === selectedKey) continue;

        const otherData = staticData[randomKey];
        if (!otherData.comp_words) continue;

        const otherWords = otherData.comp_words.split(',').map(w => w.trim());
        const randomWord = otherWords[Math.floor(Math.random() * otherWords.length)];

        if (randomWord && !correctWords.includes(randomWord) && !distractors.includes(randomWord)) {
            distractors.push(randomWord);
        }
    }

    // 5. Mélange
    const nbLeurres = Math.max(2, 6 - correctWords.length); 
    const options = [...correctWords, ...distractors.slice(0, nbLeurres)];
    options.sort(() => Math.random() - 0.5);

    return {
        qid: crypto.randomUUID(),
        kanji: selectedKey,
        signification: kData.signification, // Vient de la table principale
        options: options,
        correctAnswers: correctWords,
        extras: {
            romaji: kData.romaji,           // Vient de la table principale
            lecture_mot: kData.lecture_mot, // Vient de la table principale
            mot: kData.mot, 
            signification_mot: kData.signification_mot, 
            boite: kData.boite
        }
    };
}
//12 CHECK COMPOSE ANSWER
export function checkComposeAnswer(questionData, selectedWords) {
    // On vérifie si TOUS les mots sélectionnés sont corrects 
    // et si on a trouvé TOUS les mots corrects.
    
    const correctSet = new Set(questionData.correctAnswers);
    const selectedSet = new Set(selectedWords);

    // 1. Est-ce que tous les mots choisis sont bons ?
    const noErrors = selectedWords.every(w => correctSet.has(w));
    
    // 2. A-t-on tout trouvé ?
    const allFound = correctSet.size === selectedSet.size;

    const isSuccess = noErrors && allFound;

    return {
        success: isSuccess,
        kanji: questionData.kanji,
        correct: questionData.correctAnswers, // pour l'affichage
        extras: questionData.extras
    };
}
// 13 GET USER PROGRESS
export function getUserProgress() {
    return userProgress; // Retourne l'objet global userProgress mis à jour en temps réel
}
// 14 UPDATE BOX RANKING
export function updateBoxRanking(boxId, sessionStats) {
    if (!boxId) return null;
    boxId = String(boxId);

    const now = new Date();
    let current = boxProgress[boxId] || { level: 0, last_attempt: null };
    
    // Logic Rules:
    // Level 1: Quiz done once (We are here, so it's done)
    let newLevel = 1;
    let message = "Niveau 1 Validé !";

    // Level 2: No miss (100% success)
    const isPerfect = (sessionStats.wrong === 0);
    
    if (isPerfect) {
        newLevel = 2;
        message = "Niveau 2 : Sans faute !";

        // Level 3: Perfect + Time < 14s (14000ms)
        const isFast = (sessionStats.totalTime <= 14000);
        
        if (isFast) {
            newLevel = 3;
            message = "Niveau 3 : Éclair (14s) !";

            // Level 4: Achieved Level 3 condition AFTER 5 days since last attempt
            if (current.last_attempt) {
                const lastDate = new Date(current.last_attempt);
                const diffTime = Math.abs(now - lastDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

                if (current.level >= 3 && diffDays >= 5) {
                    newLevel = 4;
                    message = "🏆 NIVEAU 4 : MAÎTRE DU SCEAU !";
                } else if (current.level >= 3) {
                     // Keep Level 3, but tell them to wait
                     message = `Niveau 3 confirmé. Revenez dans ${5 - diffDays} jours pour le Niv 4.`;
                }
            }
        }
    }

    // Update State (Only promote, never demote? Or demote if fail?)
    // Usually SRS prevents demotion of badges unless intended. Let's keep Max Level.
    if (newLevel > current.level) {
        current.level = newLevel;
    }
    current.last_attempt = now.toISOString();
    
    // Save
    boxProgress[boxId] = current;
    const player = getPlayer_setting();
    localStorage.setItem("kanjilock_boxes_" + player, JSON.stringify(boxProgress));

    return { level: current.level, message: message };
}

