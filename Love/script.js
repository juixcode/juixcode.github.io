const affichage = document.getElementById("resultat");
const button_heart = document.querySelector('button')
let resultat = 0;

function add() {
	resultat += 1;
	affichage.textContent = (String(resultat)); // AFFICHAGE DU RESULTAT
	new Audio("Medias/done.mp3").play();

    affichage.className = "";
    button_heart.className = "";
       window.requestAnimationFrame(function (time) {
        window.requestAnimationFrame(function (time) {
            affichage.className = "active";
            button_heart.className = "active";
        });
       });
}