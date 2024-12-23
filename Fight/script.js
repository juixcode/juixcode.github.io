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

// Référence à la base de données pour stocker les clics
let player1Ref = firebase.database().ref('skibidi-fight-game/player1');
let player2Ref = firebase.database().ref('skibidi-fight-game/player2');
let temp = "";

let currentPlayer = player1Ref;

// ⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙ Player datas

let player1Obj = document.getElementById("player1");
let player2Obj = document.getElementById("player2");

// Affichage du joueur n°1
player1Ref.on('value', function(snapshot) {
    let player = (snapshot.val() || {"x": 0, "y": 0});
    player1Obj.style.left = player.x + "%";
    player1Obj.style.bottom = player.y + "%";
});

// Affichage du joueur n°2
player2Ref.on('value', function(snapshot) {
    let player = (snapshot.val() || {"x": 0, "y": 0});
    player2Obj.style.left = player.x + "%";
    player2Obj.style.bottom = player.y + "%";
});

function add(coord, value) {
    currentPlayer.transaction(function(currentValues) {
        backup = currentValues[coord] || 0;
        currentValues[coord] = Number(currentValues[coord]) + value; // Incrémente le compteur ou initialise à 1 si la valeur est null
        if (currentValues[coord] < 0) {
            currentValues[coord] = backup;
        } else if (currentValues[coord] > 98) {
            currentValues[coord] = backup;
        }
        return currentValues;
    });
}

// ⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙ Autre

const nom = document.getElementById("player_name");

function switchPlayer(elem) {
    if (nom.textContent == "Player 1") {
        nom.textContent = "Player 2";
        currentPlayer = player2Ref;
    } else {
        nom.textContent = "Player 1";
        currentPlayer = player1Ref;
    }
    elem.classList.toggle("switched");
}

document.addEventListener("keydown", function (event) {
    switch (event.key) {
        case "ArrowUp":
            add("y", 2);
            break;
        case "ArrowDown":
            add("y", -2);
            break;
        case "ArrowLeft":
            add("x", -2);
            break;
        case "ArrowRight":
            add("x", 2);
            break;
        default:
            console.log(`Touche pressée : ${event.key}`);
    }
});