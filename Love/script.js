// ⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙ Effets sonores

// Charger le son une seule fois pour réduire la latence
const audioSrc = "Medias/done.mp3";
let audioPreloaded = new Audio(audioSrc);
audioPreloaded.load();  // Précharger l'audio

function playSound() {
    // Créer une nouvelle instance d'Audio à chaque clic pour permettre la superposition
    const audio = new Audio(audioSrc);
    audio.play();  // Jouer l'audio
}

// ⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙ Firebase

// Configuration Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBmhiQWCrQvmGLjIz59I2Z4cTgdaVlkAEg",
    authDomain: "juixcode-db.firebaseapp.com",
    databaseURL: "https://juixcode-db-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "juixcode-db",
    storageBucket: "juixcode-db.appspot.com",
    messagingSenderId: "391952832798",
    appId: "1:391952832798:web:be602e7d058416e9f5110f"
};

// Initialiser Firebase
firebase.initializeApp(firebaseConfig);

// ⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙ Compteur de clics

const affichage = document.getElementById("resultat");
const affichage_adversaire = document.getElementById("resultat_adversaire");
const nom = document.getElementById("player_name");
const nom_adversaire = document.getElementById("player_adversary_name");
const button_heart = document.querySelector('button.clicker');
const body = document.querySelector('body');

// Référence à la base de données pour stocker les clics
let player1 = firebase.database().ref('love-emitter-player1-clicks');
let player2 = firebase.database().ref('love-emitter-player2-clicks');
let temp = "";

function switchPlayer() {
    if (nom.textContent == "Chiara") {
        player2 = firebase.database().ref('love-emitter-player1-clicks');
        player1 = firebase.database().ref('love-emitter-player2-clicks');
    } else {
        player1 = firebase.database().ref('love-emitter-player1-clicks');
        player2 = firebase.database().ref('love-emitter-player2-clicks');
    }
    temp = nom.textContent;
    nom.textContent = nom_adversaire.textContent;
    nom_adversaire.textContent = temp;

    temp = affichage.textContent;
    affichage.textContent = affichage_adversaire.textContent;
    affichage_adversaire.textContent = temp;
}

// Incrémenter le compteur de clics
function add() {
    player1.transaction(function(currentClicks) {
        return (currentClicks || 0) + 1; // Incrémente le compteur ou initialise à 1 si la valeur est null
    });
    playSound();
    affichage.className = "";
    button_heart.className = "clicker";
        window.requestAnimationFrame(function (time) {
            window.requestAnimationFrame(function (time) {
                affichage.className = "active";
                button_heart.className = "clicker active";
            });
        });
    if (nom.textContent == "Chiara") {
        progressBarUpdate(Number(affichage_adversaire.textContent), Number(affichage.textContent))
    } else {
        progressBarUpdate(Number(affichage.textContent), Number(affichage_adversaire.textContent))
    }
}

// ⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙ Barre de pourcentages

const blueBar = document.getElementById("blue_progress");
const pinkBar = document.getElementById("pink_progress");

function progressBarUpdate(blueValue, pinkValue) {
    temp = (blueValue * 100 / (blueValue + pinkValue)).toFixed(0)
    blueBar.style.width = String(temp) + '%';
    blueBar.textContent = 'Juju ' + String(temp) + '%';
    temp = 100 - temp;
    pinkBar.style.width = String(temp) + '%';
    pinkBar.textContent = String(temp) + '% Chiara';
}

document.addEventListener("DOMContentLoaded", () => {
    setTimeout(function() {
        progressBarUpdate(Number(affichage_adversaire.textContent), Number(affichage.textContent))
    }, 300);

    const currentHash = window.location.hash;  // Récupère ce qui est après le #

    // Vérifie s'il y a un fragment dans l'URL
    if (currentHash) {
        switch (currentHash) {
            case "#player1":
                break;
            case "#player2":
                switchPlayer()
                break;
            default:
                console.log("Fragment non reconnu");
        }
    }
});

// ⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙ Scores

// Affichage du score n°1
firebase.database().ref('love-emitter-player1-clicks').on('value', function(snapshot) {
    if (nom.textContent == "Chiara") {
        affichage.textContent = snapshot.val() || 0;
    } else {
        affichage_adversaire.textContent = snapshot.val() || 0;
    }
});

// Affichage du score n°2
firebase.database().ref('love-emitter-player2-clicks').on('value', function(snapshot) {
    if (nom.textContent == "Chiara") {
        affichage_adversaire.textContent = snapshot.val() || 0;
    } else {
        affichage.textContent = snapshot.val() || 0;
    }
});