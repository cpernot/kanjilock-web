// frontend/static/js/quizEngine.js

let staticData = {}; // kanjilock.json
let userProgress = {}; // SRS states
let currentSession = []; 

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

            
 // Dans frontend/static/js/quizengine.js

export async function initEngine() {
    // OPTIMISATION : Si on a déjà des données (plus de 0 clés), on ne recharge pas !
    if (Object.keys(staticData).length > 0) {
        console.log("⚡ Données déjà en mémoire, pas de rechargement.");
        return; 
    }

    console.log("📥 Chargement des données locales (depuis le serveur)...");
    try {
        const res = await fetch(`${API_BASE_URL}/quiz/init`);
        const data = await res.json();
        
        staticData = data.static_data;
        userProgress = data.user_progress;
        console.log(`✅ Engine prêt : ${Object.keys(staticData).length} kanjis`);
    } catch (e) {
        console.error("Erreur chargement engine:", e);
    }
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
// Ajouter checkComposeAnswer pour valider localement
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