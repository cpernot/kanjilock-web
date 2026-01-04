// frontend/static/js/quizEngine.js

let staticData = {}; // kanjilock.json
let userProgress = {}; // SRS states
let currentSession = []; 

// Configuration des Modes (Portage de quiz_modes.py)
const MODES = {
    "qa": {
        q: (k) => k.kanji,
        a: (k) => k.signification,
        extras: (k) => ({ romaji: k.romaji, mot: k.mot, lecture: k.lecture_mot })
    },
    "qb": {
        q: (k) => k.signification,
        a: (k) => k.kanji,
        extras: (k) => ({ romaji: k.romaji, boite: k.boite })
    },
    "qc": {
        q: (k) => k.mot,
        a: (k) => k.signification,
        extras: (k) => ({ lecture_mot: k.lecture_mot, kanji: k.kanji, romaji: k.romaji, boite: k.boite })
    },
    "qd": {
        q: (k) => k.kanji,
        a: (k) => k.mot,
        extras: (k) => ({ romaji: k.romaji, signification: k.signification })
    },
    "qe": {
        q: (k) => k.kanji,
        a: (k) => k.lecture_mot,
        extras: (k) => ({ romaji: k.romaji, signification: k.signification })
    }
};

            
 
export async function initEngine() {
    console.log("📥 Chargement des données locales...");
    const res = await fetch(`${API_BASE_URL}/quiz/init`);
    const data = await res.json();
    
    staticData = data.static_data;
    userProgress = data.user_progress;
    console.log(`✅ Engine prêt : ${Object.keys(staticData).length} kanjis`);
}

export function getNextQuestion(mode) {
    // 1. Logique de sélection pondérée (Portage de selection.py)
    // Pour l'instant, faisons simple : prendre un kanji aléatoire disponible
    // Tu devras implémenter ici la logique de poids (1:5, 2:3, etc.)
    
    const keys = Object.keys(staticData);
    const kanjiKey = keys[Math.floor(Math.random() * keys.length)];
    const kData = staticData[kanjiKey];
    
    // Si pas de définition de mode, fallback sur QA
    const modeDef = MODES[mode] || MODES["qa"];

    // 2. Générer la question
    const question = modeDef.q({kanji: kanjiKey, ...kData});
    const correctAnswer = modeDef.a({kanji: kanjiKey, ...kData});

    // 3. Générer les leurres (Options)
    let options = [correctAnswer];
    while (options.length < 4) {
        const randomK = staticData[keys[Math.floor(Math.random() * keys.length)]];
        const wrongAnswer = modeDef.a({kanji: keys[Math.floor(Math.random() * keys.length)], ...randomK});
        if (!options.includes(wrongAnswer)) {
            options.push(wrongAnswer);
        }
    }
    
    // Mélanger
    options.sort(() => Math.random() - 0.5);

    return {
        qid: crypto.randomUUID(), // Génère un ID unique en local
        kanji: kanjiKey,
        question: question,
        options: options,
        correctAnswer: correctAnswer, // Gardé secret côté JS (mais accessible si on triche)
        extras: modeDef.extras({kanji: kanjiKey, ...kData})
    };
}
const WEIGHTS = { 1: 5, 2: 3, 3: 1, 4: 0.2 };

// Vérifie si un kanji est dispo (date < maintenant)
function isAvailable(state) {
    if (!state || !state.next_review) return true; // Dispo si nouveau
    return new Date(state.next_review) <= new Date();
}

export function getNextQuestion_NEW(mode) {
    const srsMode = userProgress[mode] || {};
    const availablePool = [];
    const newItems = [];

    // 1. Filtrer les kanjis éligibles
    Object.keys(staticData).forEach(kanji => {
        const state = srsMode[kanji];
        
        if (!state) {
            // Pas d'historique = Nouveau Kanji
            newItems.push(kanji);
        } else if (isAvailable(state)) {
            // Kanji connu et date de révision dépassée
            const weight = WEIGHTS[state.level] || 1;
            // On ajoute le kanji X fois dans le pool selon son poids
            // (Technique simple de "Weighted Random")
            const count = Math.ceil(weight * 10); 
            for (let i = 0; i < count; i++) {
                availablePool.push(kanji);
            }
        }
    });

    let selectedKanji;
    
    // 2. Priorité : Mélange items à revoir et nouveaux
    // Si on a beaucoup de révisions, on tape dedans, sinon on prend un nouveau
    if (availablePool.length > 0) {
         // Petite chance d'introduire un nouveau mot même si on a des révisions (facultatif, pour le fun)
         if (newItems.length > 0 && Math.random() < 0.2) {
             selectedKanji = newItems[Math.floor(Math.random() * newItems.length)];
         } else {
             selectedKanji = availablePool[Math.floor(Math.random() * availablePool.length)];
         }
    } else if (newItems.length > 0) {
        selectedKanji = newItems[Math.floor(Math.random() * newItems.length)];
    } else {
        // Fallback : Si tout est fait, on prend n'importe quoi au hasard (mode "révision forcée")
        const keys = Object.keys(staticData);
        selectedKanji = keys[Math.floor(Math.random() * keys.length)];
    }

    // 3. Construction de la question (comme vu précédemment)
    const kData = staticData[selectedKanji];
    const modeDef = getModeDefinition(mode); // Ta fonction helper pour qa, qb...

    const question = modeDef.q({kanji: selectedKanji, ...kData});
    const correctAnswer = modeDef.a({kanji: selectedKanji, ...kData});

    // Génération des leurres...
    let options = [correctAnswer];
    const keys = Object.keys(staticData);
    while (options.length < 4) {
        let rk = keys[Math.floor(Math.random() * keys.length)];
        // Évite de prendre le même kanji
        if (rk === selectedKanji) continue; 
        
        let wrong = modeDef.a({kanji: rk, ...staticData[rk]});
        if (!options.includes(wrong)) options.push(wrong);
    }
    options.sort(() => Math.random() - 0.5);

    return {
        qid: crypto.randomUUID(),
        kanji: selectedKanji, // Important pour le SRS
        question: question,
        options: options,
        correctAnswer: correctAnswer,
        extras: modeDef.extras({kanji: selectedKanji, ...kData})
    };
}

// Helper pour récupérer les définitions de mode (à mettre dans le même fichier ou importer)
function getModeDefinition(mode) {
    const MODES = {
        "qa": { q: k=>k.kanji, a: k=>k.signification, extras: k=>({romaji:k.romaji, mot:k.mot, lecture_mot: k.lecture_mot}) },
        "qb": { q: k=>k.signification, a: k=>k.kanji, extras: k=>({romaji:k.romaji, boite:k.boite}) },
        // ... ajoute tes autres modes ici (qc, qd, qe)
    };
    return MODES[mode] || MODES["qa"];
}

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