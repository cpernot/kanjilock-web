import { initMode } from "./modeManager.js";
import { clearPlayer ,getPlayer} from "./player.js";
import { navigate } from "./spa.js";



export function initHome() {   
     initMode();
   console.log("Home init Done!");   
   
  document.getElementById("currentPlayer").textContent =
    `Pseudo: "${getPlayer()}" `;

   document.getElementById("changePlayer").onclick = () => {
  clearPlayer();
  navigate("/login");
}; 
}
