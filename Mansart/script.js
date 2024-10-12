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

let database = firebase.database();

// Compteur de connexions
let fullDatabase = database.ref('mansart-database'); // Référence à la base de données

function linkTracking(ref) {
    let valueToIncrease = database.ref('mansart-database/'+ref);
    valueToIncrease.once('value')
        .then((snapshot) => {
            let currentValue = snapshot.val();
            if (currentValue === null) {
                currentValue = 0;
            }
            valueToIncrease.set(currentValue + 1);
        })
        .catch((error) => {
            console.error("Erreur lors de la récupération ou de la mise à jour de la base de données :", error);
        });
}

window.onload = linkTracking('clicks-current');

// ⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙

let juixAd = document.querySelector('.pub');

function closeAd() {
    juixAd.classList.add('active');
    setTimeout(deleteAd, 300);
}
function deleteAd() {
    juixAd.classList.add('closed');
}

let body = document.querySelector('body');

function switchPage(num) {
    if (num === 11) {
        showDatabase()
    }
    document.querySelector('.current-page').classList.remove('current-page');
    body.children[num].classList.add('current-page');
}

let databaseArea = document.querySelector('.database table tbody');

let changeByPartnerName = document.querySelectorAll('.change-by-partner-name');
let changeByPartnerClass = document.querySelectorAll('.change-by-partner-class');
let changeByPartnerContact = document.querySelectorAll('.change-by-partner-contact');
let changeByPartnerMessage = document.querySelectorAll('.change-by-partner-message');

let changeByUserNumber = document.querySelectorAll('.change-by-user-number');

let changeByParnersErrorNames = document.querySelectorAll('.change-by-partners-names-error');
let changeByParnersErrorContacts = document.querySelectorAll('.change-by-partners-contacts-error');

let textareaUserNumber = document.querySelector('.champ-numero');

function ResetPlaceholderColor() {
    document.querySelectorAll('textarea.active').forEach(each => {
        each.classList.remove('active')
    });
}

function checkUserNumber(element) {
    let userNumber = textareaUserNumber.value.padStart(3, '0');
    if (userNumber.length > 3) {
        userNumber = userNumber.slice(-3);  // Garde uniquement les 3 derniers caractères
    }
    changeByUserNumber.forEach(each => {
        each.textContent = userNumber;
    });

    fullDatabase.once('value')
        .then((snapshot) => {
            let newDatabase = snapshot.val();
            if (userNumber === "000") {
                textareaUserNumber.classList.add('active')
                setTimeout(ResetPlaceholderColor, 150);
            } else if (newDatabase[userNumber]) {
                if (newDatabase[userNumber].length === 1) { // Moitié détectée
                    changeByPartnerName.forEach(each => {
                        each.textContent = newDatabase[userNumber][0][0];
                    });
                    changeByPartnerClass.forEach(each => {
                        each.textContent = newDatabase[userNumber][0][1];
                    });
                    changeByPartnerContact.forEach(each => {
                        each.textContent = newDatabase[userNumber][0][2];
                    });
                    changeByPartnerMessage.forEach(each => {
                        each.textContent = newDatabase[userNumber][0][3];
                    });
                    switchPage(7);
                } else if (newDatabase[userNumber].length === 2) { // Erreur : Deux moitiés détectées
                    changeByParnersErrorNames[0].textContent = newDatabase[userNumber][0][0];
                    changeByParnersErrorNames[1].textContent = newDatabase[userNumber][1][0];
                    changeByParnersErrorContacts[0].textContent = newDatabase[userNumber][0][2];
                    changeByParnersErrorContacts[1].textContent = newDatabase[userNumber][1][2];
                    switchPage(10);
                }
            } else { // Aucune moitié détectée
                switchPage(4);
            }
        })
        .catch((error) => {
            console.error("Erreur lors de la récupération ou de la mise à jour de la base de données :", error);
        });
}

function saveUser(element, page) { // Exemple : [["Lucie","TA","@lucie_mansart","Bonjour ! C'est Lucie"], [...partner2]]
    let userNumber = element.parentElement.querySelector('.change-by-user-number').textContent;
    let userName = element.parentElement.querySelector('.champ-nom');
    let userClass = element.parentElement.querySelector('.champ-classe');
    let userContact = element.parentElement.querySelector('.champ-contact');
    let userMessage = "";
    if (element.parentElement.querySelector('.champ-message')) {
        userMessage = element.parentElement.querySelector('.champ-message').value;
    }

    fullDatabase.once('value')
        .then((snapshot) => {
            let newDatabase = snapshot.val();

            if (userName.value === "" || userClass.value === "" || userContact.value === "") {
                userName.classList.add('active')
                userClass.classList.add('active')
                userContact.classList.add('active')
                setTimeout(ResetPlaceholderColor, 150);
            } else {
                if (newDatabase[userNumber]) {
                    if (newDatabase[userNumber].length === 1) {
                        newDatabase[userNumber].push([userName.value, userClass.value, userContact.value, userMessage])
                    }
                } else {
                    newDatabase[userNumber] = [[userName.value, userClass.value, userContact.value, userMessage]]
                }
                switchPage(page);
                fullDatabase.set(newDatabase);
            }
        })
        .catch((error) => {
            console.error("Erreur lors de la récupération ou de la mise à jour de la base de données :", error);
        });
}

function showDatabase() {
    fullDatabase.once('value')
    .then((snapshot) => {
        databaseArea.innerHTML = ''; // Suppression de tous les balises enfants

        let currentDatabase = snapshot.val();
        for (let key in currentDatabase) {
            if (key.length === 3) {
                let newUserNumber = document.createElement('td');
                newUserNumber.textContent = String(key);

                let newUserName = document.createElement('td');
                newUserName.textContent = currentDatabase[key][0][0];
                
                let newUserClass = document.createElement('td');
                newUserClass.textContent = currentDatabase[key][0][1];

                let newRow = document.createElement('tr'); //Création de la ligne
                newRow.appendChild(newUserNumber);
                newRow.appendChild(newUserName);
                newRow.appendChild(newUserClass);
                if (currentDatabase[key].length === 2) {
                    let newUserNumber = document.createElement('td');
                    newUserNumber.textContent = "";

                    let newUserName = document.createElement('td');
                    newUserName.textContent = currentDatabase[key][1][0];

                    let newUserClass = document.createElement('td');
                    newUserClass.textContent = currentDatabase[key][1][1];

                    newRow.appendChild(newUserNumber);
                    newRow.appendChild(newUserName);
                    newRow.appendChild(newUserClass);
                    newRow.className = 'duo';
                }
                databaseArea.appendChild(newRow);
            }
        }
    })
    .catch((error) => {
        console.error("Erreur lors de la récupération ou de la mise à jour de la base de données :", error);
    });
}

// Bouton d'actualisation de la database
let refreshButton = document.querySelector('.refresh_database');
refreshButton.addEventListener('animationend', function() {
    refreshButton.classList.remove('active');
});
refreshButton.addEventListener('click', () => {
        showDatabase()
        refreshButton.classList.add('active');
});