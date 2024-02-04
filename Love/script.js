const affichage = document.getElementById("resultat");
const button_heart = document.querySelector('button')
const audio = new Audio("Medias/done.mp3")
let resultat = 0;

function add() {
	resultat += 1;
	affichage.textContent = (String(resultat)); // AFFICHAGE DU RESULTAT
	audio.play();

    affichage.className = "";
    button_heart.className = "";
       window.requestAnimationFrame(function (time) {
        window.requestAnimationFrame(function (time) {
            affichage.className = "active";
            button_heart.className = "active";
        });
       });
}