const body = document.querySelector('body');
const html = document.querySelector('html');

function openPage(page) {
    let newOpenedPage = document.querySelector('body').children[page];

    body.classList.add('animated');
    body.addEventListener('animationend', function() {
        body.classList.remove('animated');
    });

    setTimeout(() => {
        document.querySelector('section.active').classList.remove('active');
        newOpenedPage.classList.add('active');
        if (newOpenedPage.id == 'playing') {
            updateCardsSize();
            cardCentering();
        };
    }, 500);
}

let resources = [
    {'emoji': 'Icons/crane.png', 'text': 'Est-ce queee1 ??', 'type': 'default', 'answers': []},
    {'emoji': 'Icons/crane.png', 'text': 'Est-ce quee2 ??', 'type': 'special', 'answers': ['1', '2', '3', '4']},
    {'emoji': 'Icons/crane.png', 'text': 'Est-ce quee3 ??', 'type': 'default', 'answers': []},
    {'emoji': 'Icons/crane.png', 'text': 'Est-ce quee4 ??', 'type': 'default', 'answers': []},
    {'emoji': 'Icons/crane.png', 'text': 'Est-ce que5??', 'type': 'default', 'answers': []},
    {'emoji': 'Icons/crane.png', 'text': 'Est-ce qu6??', 'type': 'special', 'answers': []},
    {'emoji': 'Icons/crane.png', 'text': 'Est-ce qu7??', 'type': 'default', 'answers': []},
    {'emoji': 'Icons/crane.png', 'text': 'Est-ce qu8??', 'type': 'default', 'answers': []},
]

function newCard(value) { // Ajoute une carte à la fin de la file
    const container = document.querySelector('section#playing .part.cards');

    let card = document.createElement('div');
    let cardData = resources.shift();

    card.classList.add('card');
    card.setAttribute('data-value', value);
    card.innerHTML = `
        <div class="title">Test de saleté</div>
        <img class="emoji" src="${cardData.emoji}"></img>
        <div class="text">${cardData.text}</div>
        <div class="progress"></div>
    `;

    let answersDiv = document.createElement('div'); // Stockage des réponses multiples s'il y en a
    answersDiv.classList.add('answers');
    if (cardData.answers.length >= 1) {
        for (element in cardData.answers) {
            let child = document.createElement('div')
            child.textContent = element
            answersDiv.appendChild(child);
        }
    }

    if (cardData.type == 'special') { // Carte spéciale : carte d'or
        card.classList.add('special');
    }

    card.appendChild(answersDiv);

    container.appendChild(card);
}

function nextCard() { // Supprime la carte swipée et passe à la suivante
    const container = document.querySelector('section#playing .part.cards');
    html.style.pointerEvents = 'none';
    html.classList.add('click-protection');

    currentCard.style.opacity = `0`;
    setCardAnimated(currentCard)

    setTimeout(() => {
        currentCard.remove()
        document.querySelectorAll('section.active .card').forEach(card => { // Animation de déplacement des cartes
            setCardAnimated(card)
            card.dataset.value = parseInt(card.dataset.value) + 1;
        });
    }, 200);

    setTimeout(() => {
        if (resources.length !== 0) {
            newCard(0); // Crée une nouvelle carte de data-value 0
        }
        if (container.children.length === 0) { // Plus de cartes : partie terminée
            document.querySelector('section#playing .part.button .active').classList.remove('active')
            document.querySelector('section#playing #results-button').classList.add('active') // Affiche le bouton d'accès aux résultats
        } else { // Sinon carte suivante sélectionnée
            setCurrentCard(document.querySelector('section#playing .card[data-value="5"]'));
            updateCardsSize();
            cardCentering();
        }
        html.style.pointerEvents = 'all';
        html.classList.remove('click-protection');
    }, 400);
}

function setCurrentCard(card) { // Définit la carte actuelle déplaçable
    let currentCard = card
    currentCard.style.cursor = 'grab';
    globalThis.currentCard = currentCard

    // Carte en or : multiplicateur de points x3 & empêchement du swipe
    scoreMultiplier = 1
    if (currentCard.classList.contains('special')) {
        scoreMultiplier = 3
    }

    // Choix du type de bouton réponse & empêchement du swipe
    let answers = currentCard.querySelector('.answers')
    const answersButton = document.querySelector('#answers-button')
    const noYesButton = document.querySelector('#no-yes-button')
    answersButton.classList.remove('active')
    noYesButton.classList.add('active')

    if (answers.children.length >= 1) { // Si la carte a des réponses multiples
        for (i = 0; i < 4; i++) {
            answersButton.children[i].textContent = answers.children[i].textContent
        }
        answersButton.classList.add('active')
        noYesButton.classList.remove('active')
    } else {
        // Événements pour la souris
        currentCard.addEventListener('mousedown', startDrag);
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', stopDrag);

        // Événements pour le tactile
        currentCard.addEventListener('touchstart', startDrag);
        document.addEventListener('touchmove', onDrag);
        document.addEventListener('touchend', stopDrag);
    }
}

function setCardAnimated(card) { // Anime les comportements de la carte pour 0.2s
    card.classList.add('animated'); // Autorise les animations smooth de durée
    setTimeout(() => {
        card.classList.remove('animated');
    }, 200);
}



/////////////////////>
// BOUTONS - Fonctionnalités appelées par boutons cliquables
/////////////////////>

const genderButton = document.querySelector('#gender-button')
genderButton.classList.add('active')

function chooseGender(gender) {
    const userGender = gender
    globalThis.userGender = userGender

    //resources =

    genderButton.classList.remove('active')
    setTimeout(() => {
        genderButton.style.display = 'none'
    }, 400);
}

function startGame() {
    openPage(1)

    for (let i = 5; i >= 0; i--) { // Crée les cartes de 5 à 0
        newCard(i);
    }

    setCurrentCard(document.querySelector('section#playing .card[data-value="5"]'));
    window.addEventListener('resize', cardCentering);
}

function showResults() {
    openPage(2)
}



/////////////////////>
// FONCTIONNALITE - Déplacement de la carte en haut de la pile
/////////////////////>

let cardsContainer = html;

let x = 0
let y = 0 // Coordonnées = décalages Left et Top de la carte
let score = 0
let scoreMultiplier = 1

function cardCentering() { // Centrage de la carte
    const cardWidth = currentCard.offsetWidth;
    const cardHeight = currentCard.offsetHeight;
    const containerWidth = cardsContainer.offsetWidth;
    const containerHeight = cardsContainer.offsetHeight;

    // Calculer les nouvelles positions pour centrer la carte
    x = (containerWidth - cardWidth) / 2;
    y = (containerHeight - cardHeight) / 2;

    // Appliquer les positions centrées
    currentCard.style.left = `${x}px`;
    currentCard.style.top = `${y}px`;
    currentCard.style.transform = 'translate(0, 0) scale(1)';

    if (!(currentCard.classList.contains('special'))) {
        currentCard.style.background = `rgb(107, 106, 136)`
    }
};

let isDragging = false;
let startX, startY;
let startOffsetLeft, startOffsetTop;
let ratio;

function startDrag(e) {
    e.preventDefault(); // Désactivation du drag-and-drop de l'image
    if (e.touches && e.touches.length === 2) { // Vérifie qu'il y a deux doigts ---> Zoom sur mobile
        return
    }
    const event = e.touches ? e.touches[0] : e; // Si tactile, utilise le premier touch
    isDragging = true;
    startOffsetLeft = currentCard.offsetLeft;
    startOffsetTop = currentCard.offsetTop;
    ratio = 0;

    startX = event.clientX - startOffsetLeft;  // Position de la souris par rapport à l'image
    startY = event.clientY - startOffsetTop;
    currentCard.style.cursor = 'grabbing'; // Change le curseur quand l'utilisateur commence à glisser
};

function onDrag(e) {
    if (e.touches && e.touches.length === 2) { // Pinch-to-zoom avec deux doigts sur mobile
        return
    }
    if (!isDragging) return; //Déplace seulement si clic enfoncé depuis la map
    const event = e.touches ? e.touches[0] : e;

    // Calculer le ratio de décalage gauche-droite de la carte
    let startCardLeft = startOffsetLeft - body.getBoundingClientRect().left;
    let currentCardLeft = currentCard.offsetLeft - body.getBoundingClientRect().left;
    ratio = Math.round((currentCardLeft - startCardLeft) / startCardLeft * 1000) / 100;
    currentCard.style.transform = `translate(0, 0) scale(1) rotate(${ratio / 2}deg)` // Appliquer le ratio de décalage gauche-droite de la carte
    if (!(currentCard.classList.contains('special'))) {
        if (ratio < 0) {
            currentCard.style.background = `rgb(${107 - ratio}, 106, 136)`
        } else {
            currentCard.style.background = `rgb(107, ${106 + ratio}, 136)`
        }
    }

    // Calculer les nouvelles positions de l'image
    x = event.clientX - startX;
    y = event.clientY - startY;
    setNewPosition(x, y)
}

function setNewPosition(x, y) {
    currentCard.style.left = `${x}px`;
    currentCard.style.top = `${y}px`;
}

function stopDrag() {
    if (ratio < -40) {
        currentCard.style.left = `${currentCard.offsetLeft - currentCard.offsetWidth}px`; // Fait disparaître la carte à gauche
        nextCard();
    } else if (ratio > 40) {
        currentCard.style.left = `${currentCard.offsetLeft + currentCard.offsetWidth}px`; // Fait disparaître la carte à droite
        score += 1 * scoreMultiplier
        nextCard();
    } else {
        setCardAnimated(currentCard) // Autorise les animations smooth de durée
        cardCentering();
    }
    isDragging = false;
    ratio = 0;
    currentCard.style.cursor = 'grab'; // Remet le curseur de "saisie" une fois le déplacement terminé
};

function answerQuestion(answer) {
    if (answer == 0) {
        currentCard.style.left = `${currentCard.offsetLeft - currentCard.offsetWidth}px`; // Fait disparaître la carte à gauche
        if (!(currentCard.classList.contains('special'))) {
            currentCard.style.background = `rgb(255, 106, 136)`
        }
        currentCard.style.transform = `translate(0, 0) scale(1) rotate(-20deg)`
        nextCard();
    } else {
        score += answer * scoreMultiplier
        currentCard.style.left = `${currentCard.offsetLeft + currentCard.offsetWidth}px`; // Fait disparaître la carte à droite
        if (!(currentCard.classList.contains('special'))) {
            currentCard.style.background = `rgb(107, 255, 136)`
        }
        currentCard.style.transform = `translate(0, 0) scale(1) rotate(20deg)`
        nextCard();
    }
}



/////////////////////>
// RESOLUTION DE BUG - Préservation de la taille relative & position des cartes lors du Resize de la fenêtre
/////////////////////>

function updateCardsSize() {
    document.querySelectorAll('section.active .card').forEach(card => {
        let parentWidth = card.parentElement.offsetWidth;
        let parentHeight = card.parentElement.offsetHeight;
        card.style.width = `${parentWidth * 0.8}px`;
        card.style.height = `${parentHeight * 0.9}px`;
    });
}

window.addEventListener('resize', updateCardsSize);
updateCardsSize(); // Appel initial pour définir la taille