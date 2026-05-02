/* ============================
   QUIZ MODES DEFINITION
   Source of Truth: backend/core/config.py
   ============================ */

export const MODES = {
    "qa": {
        label: "Kanji → Sens",
        q: (k) => k.kanji,
        a: (k) => k.signification,
        extras: (k) => ({
            romaji: k.romaji,
            mot: k.mot,
            signification_mot: k.signification_mot,
            lecture_mot: k.lecture_mot,
            boite: k.boite
        })
    },

    "qb": {
        label: "Sens → Kanji",
        q: (k) => k.signification,
        a: (k) => k.kanji,
        extras: (k) => ({
            romaji: k.romaji,
            mot: k.mot,
            signification_mot: k.signification_mot,
            lecture_mot: k.lecture_mot,
            boite: k.boite
        })
    },

    "qc": {
        label: "Mot → Sens",
        q: (k) => k.mot,
        a: (k) => k.signification_mot,
        extras: (k) => ({
            lecture_mot: k.lecture_mot,
            kanji: k.kanji,
            romaji: k.romaji,
            boite: k.boite,
            signification: k.signification
        })
    },

    "qd": {
        label: "Mot → Lecture",
        q: (k) => k.mot,
        a: (k) => k.lecture_mot,
        extras: (k) => ({
            signification_mot: k.signification_mot,
            kanji: k.kanji,
            romaji: k.romaji,
            boite: k.boite,
            signification: k.signification
        })
    },

    "qe": {
        label: "Sens → Mot",
        q: (k) => k.signification_mot,
        a: (k) => k.mot,
        extras: (k) => ({
            signification_mot: k.lecture_mot, // As per config.py
            kanji: k.kanji,
            romaji: k.romaji,
            boite: k.boite,
            signification: k.signification
        })
    },

    "qf": {
        label: "Kanji → Romaji",
        q: (k) => k.kanji,
        a: (k) => k.romaji,
        extras: (k) => ({
            signification: k.signification,
            lecture_mot: k.lecture_mot,
            signification_mot: k.signification_mot,
            boite: k.boite,
            mot: k.mot
        })
    },

    "qg": {
        label: "Kanji → Boite",
        q: (k) => k.kanji,
        a: (k) => k.boite,
        extras: (k) => ({
            signification: k.signification,
            romaji: k.romaji,
            lecture_mot: k.lecture_mot,
            signification_mot: k.signification_mot,
            mot: k.mot
        })
    },

    "qh": {
        label: "Kanji → Composition",
        q: (k) => k.kanji,
        a: (k) => k.comp_words,
        extras: (k) => ({
            romaji: k.romaji,
            signification: k.signification,
            mot: k.mot,
            lecture_mot: k.lecture_mot,
            signification_mot: k.signification_mot,
            boite: k.boite
        })
    },

    "qi": {
        label: "Romaji → Kanji",
        q: (k) => k.romaji,
        a: (k) => k.kanji,
        extras: (k) => ({
            signification: k.signification,
            lecture_mot: k.lecture_mot,
            signification_mot: k.signification_mot,
            boite: k.boite,
            mot: k.mot
        })
    },

    "qj": {
        label: "Lecture → Mot",
        q: (k) => k.lecture_mot,
        a: (k) => k.mot,
        extras: (k) => ({
            signification_mot: k.signification_mot,
            kanji: k.kanji,
            romaji: k.romaji,
            boite: k.boite,
            signification: k.signification
        })
    }
};
