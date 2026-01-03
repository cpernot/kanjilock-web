Prérequis (à vérifier une seule fois)

Windows + Python installé

VS Code installé

ngrok installé et configuré (ngrok config add-authtoken ...)

Un iPhone avec Safari

Le PC et l’iPhone connectés à Internet (pas forcément au même Wi-Fi si ngrok est utilisé)

📁 Structure du projet (simplifiée)
KanjiLock/
│
├─ main.py                ← backend FastAPI
├─ data/
│   ├─ kanjilock.json
│   └─ progress.json
├─ frontend/
│   ├─ index.html
│   ├─ app.js
│   └─ style.css
└─ README.txt

---

# 📱 KanjiLock — Mode d’emploi (PC → iPhone)

## 🔧 Environnements Python (IMPORTANT)

KanjiLock utilise **FastAPI**, qui doit être lancé **dans le bon environnement Python**.

Sur ce PC, FastAPI / uvicorn sont installés dans l’environnement conda :

```
opencv-env
```

👉 **C’est normal que `uvicorn` ne fonctionne pas dans le terminal VS Code par défaut.**

---

## ▶️ Démarrage complet

### 1️⃣ Ouvrir un terminal Anaconda

* Lancer **Anaconda Prompt**
* Activer l’environnement :

```bash
conda activate opencv-env
```

---

### 2️⃣ Aller dans le dossier du projet

```bash
cd C:\Users\owner\Documents\kanjilock-web
```

---

### 3️⃣ Lancer le backend FastAPI (OBLIGATOIRE)

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

✅ Résultat attendu :

```
INFO:     Application startup complete.
```

👉 Tant que cette fenêtre est ouverte, **le serveur tourne**.

---

### 4️⃣ Vérification sur l’ordinateur (facultatif mais recommandé)

Dans un navigateur sur le PC :

```
http://127.0.0.1:8000
```

Tu dois voir :

* KanjiLock
* ou “Plus rien à réviser aujourd’hui”

---

### 5️⃣ Lancer ngrok (nouveau terminal)

Dans **un autre terminal** (Anaconda ou CMD) :

```bash
ngrok http 8000
```

Tu obtiens une URL du type :

```
https://xxxxx.ngrok-free.dev
```

👉 Copier cette URL (HTTPS obligatoire).

---

### 6️⃣ Accès depuis l’iPhone

Sur l’iPhone → Safari :

```
https://xxxxx.ngrok-free.dev
```

KanjiLock s’affiche 🎉

---

## 📲 Ajouter KanjiLock à l’écran d’accueil (PWA)

À faire **une seule fois** :

1. Safari (sur la page KanjiLock)
2. Bouton **Partager** (carré + flèche ↑)
3. **Ajouter à l’écran d’accueil**
4. Nom : `KanjiLock`
5. Valider

➡️ Une icône apparaît comme une vraie app.

---

## 🔁 Démarrages suivants (résumé)

À chaque utilisation :

1. `conda activate opencv-env`
2. `uvicorn main:app --host 0.0.0.0 --port 8000`
3. `ngrok http 8000`
4. Ouvrir l’icône **KanjiLock** sur iPhone

⚠️ Si le PC est éteint → l’app ne fonctionne pas
⚠️ Si ngrok est arrêté → l’app ne fonctionne pas

---

# 📘 C’est quoi FastAPI ?

**FastAPI** est un framework Python pour créer des **API web modernes**.

Dans KanjiLock, FastAPI sert à :

* choisir le prochain kanji (`/quiz`)
* recevoir les réponses (`/answer`)
* gérer le SRS, les scores, les dates

### Pourquoi FastAPI ?

* Très rapide ⚡
* Simple à lire
* Idéal pour API + frontend JS
* Documentation automatique (`/docs`)

👉 FastAPI = **le cerveau de KanjiLock**

---

# 📱 C’est quoi une PWA ?

**PWA = Progressive Web App**

C’est un **site web** qui peut se comporter comme une **application mobile**.

KanjiLock en PWA :

* icône sur l’écran d’accueil
* plein écran (sans barre Safari)
* fonctionne hors App Store
* mises à jour instantanées

### Ce que KanjiLock N’EST PAS (encore)

* ❌ pas une app native iOS
* ❌ pas dans l’App Store

👉 Mais **l’expérience utilisateur est quasi identique**.

---

## 🧠 Schéma mental (à retenir)

```
[ iPhone (PWA) ]
        ↓
[ ngrok (Internet) ]
        ↓
[ FastAPI (PC) ]
        ↓
[ kanjilock.json + progress.json ]
```

---

## 🧪 Dépannage rapide

### ❓ uvicorn introuvable

➡️ Tu n’es pas dans le bon environnement conda

```bash
conda activate opencv-env
```

---

### ❓ L’app ne répond plus sur iPhone

➡️ Vérifier :

* le terminal FastAPI est encore ouvert
* ngrok tourne encore
* l’URL ngrok n’a pas changé

---

