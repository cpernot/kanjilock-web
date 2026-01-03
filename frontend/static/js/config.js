// On détecte si on est en local
const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

// On attache la variable à "window" pour qu'elle soit globale
window.API_BASE_URL = isLocal 
    ? "http://127.0.0.1:8000"  // Ton backend local Python
    : "https://kanjilock-backend.onrender.com"; // Ton futur backend Render

console.log("Mode:", isLocal ? "Local" : "Production", "| API:", window.API_BASE_URL);
