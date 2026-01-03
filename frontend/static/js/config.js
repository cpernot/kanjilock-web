const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

// On ajoute /api à la fin de l'URL de base
window.API_BASE_URL = isLocal 
    ? "http://127.0.0.1:8000/api" 
    : "https://kanjilock-backend.onrender.com/api";

console.log("Mode:", isLocal ? "Local" : "Production", "| API Root:", window.API_BASE_URL);