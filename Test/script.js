const body = document.querySelector('body');
const html = document.querySelector('html');
const cardAnimationTime = 300; // ms

function initialize() {
    questionIndex = 0;
    progression = 0;

    chooseGender(userGender)

    x = 0
    y = 0

    score = 0
    scoreMultiplier = 1
    scoreMax = 0

    document.querySelector('section#playing .part.button .active').classList.add('active') // Réaffiche le bouton de réponse
    document.querySelector('section#playing #results-button').classList.remove('active')
    genderButton.remove()
}

function openPage(page) {
    let newOpenedPage = document.querySelector('body').children[page];

    body.classList.add('animated');
    body.addEventListener('animationend', function() {
        body.classList.remove('animated');
    });

    setTimeout(() => {
        document.querySelector('section.active').classList.remove('active');
        newOpenedPage.classList.add('active');
    }, 500);
}

let resources;

let questionsNumber; // Nombre de questions
let questionIndex = 0;
let progression = 0;

function newCard(value) { // Ajoute une carte à la fin de la file
    const container = document.querySelector('section#playing .part.cards');

    questionIndex += 1;
    progression = Math.round(questionIndex / questionsNumber * 100);
    let card = document.createElement('div');
    let cardData = resources.shift();

    card.classList.add('card');
    card.setAttribute('data-value', value);
    card.innerHTML = `
        <div class="title">Test de saleté</div>
        <img class="emoji" src="${cardData.emoji}"></img>
        <div class="text">${cardData.text}</div>
        <div class="progress">
            <div class="bar">
				<div class="progression", style="width: ${progression}%;"></div>
				<p>${questionIndex}/${questionsNumber}</p>
			</div>
        </div>
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

    currentCard.style.opacity = `0`;
    setCardAnimated(currentCard)

    setTimeout(() => {
        currentCard.remove()
        document.querySelectorAll('section.active .card').forEach(card => { // Animation de déplacement des cartes
            setCardAnimated(card)
            card.dataset.value = parseInt(card.dataset.value) + 1;
        });
    }, cardAnimationTime);

    setTimeout(() => {
        if (resources.length !== 0) {
            newCard(0); // Crée une nouvelle carte de data-value 0
        }
        if (container.children.length === 0) { // Plus de cartes : partie terminée
            document.querySelector('section#playing .part.button .active').classList.remove('active')
            document.querySelector('section#playing #results-button').classList.add('active') // Affiche le bouton d'accès aux résultats
        } else { // Sinon carte suivante sélectionnée
            setCurrentCard(document.querySelector('section#playing .card[data-value="5"]'));
        }

    }, cardAnimationTime*2);
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
    scoreMax += scoreMultiplier

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
        currentCard.addEventListener('mousemove', onDrag);
        currentCard.addEventListener('mouseup', stopDrag);

        // Événements pour le tactile
        currentCard.addEventListener('touchstart', startDrag);
        currentCard.addEventListener('touchmove', onDrag);
        currentCard.addEventListener('touchend', stopDrag);
    }
}

function setCardAnimated(card) { // Anime les comportements de la carte pour 0.2s
    card.classList.add('animated'); // Autorise les animations smooth de durée
    html.style.pointerEvents = 'none';
    html.classList.add('click-protection');
    setTimeout(() => {
        card.classList.remove('animated');
        html.style.pointerEvents = 'all';
        html.classList.remove('click-protection');
    }, cardAnimationTime);
}



/////////////////////>
// BOUTONS - Fonctionnalités appelées par boutons cliquables
/////////////////////>

const genderButton = document.querySelector('#gender-button')

function chooseGender(gender) {
    const userGender = gender
    globalThis.userGender = userGender

    if (userGender == 'male') {
        resources = [
            {'emoji': 'Icons/crane.png', 'text': 'Est-ce queee1 ??', 'type': 'default', 'answers': []},
            {'emoji': 'Icons/crane.png', 'text': 'Est-ce quee2 ??', 'type': 'special', 'answers': ['1', '2', '3', '4']},
            {'emoji': 'Icons/crane.png', 'text': 'Est-ce quee3 ??', 'type': 'default', 'answers': []},
            {'emoji': 'Icons/crane.png', 'text': 'Est-ce quee4 ??', 'type': 'default', 'answers': []},
            {'emoji': 'Icons/crane.png', 'text': 'Est-ce que5??', 'type': 'default', 'answers': []},
            {'emoji': 'Icons/crane.png', 'text': 'Est-ce qu6??', 'type': 'special', 'answers': []},
            {'emoji': 'Icons/crane.png', 'text': 'Est-ce qu7??', 'type': 'default', 'answers': []},
            {'emoji': 'Icons/crane.png', 'text': 'Est-ce qu8??', 'type': 'default', 'answers': []},
        ]
    } else {
        resources = [
            {'emoji': 'Icons/crane.png', 'text': 'Est-ce queee1 ??', 'type': 'default', 'answers': []},
            {'emoji': 'Icons/crane.png', 'text': 'Est-ce quee2 ??', 'type': 'special', 'answers': ['1', '2', '3', '4']},
            {'emoji': 'Icons/crane.png', 'text': 'Est-ce quee3 ??', 'type': 'default', 'answers': []},
            {'emoji': 'Icons/crane.png', 'text': 'Est-ce quee4 ??', 'type': 'default', 'answers': []},
            {'emoji': 'Icons/crane.png', 'text': 'Est-ce que5??', 'type': 'default', 'answers': []},
            {'emoji': 'Icons/crane.png', 'text': 'Est-ce qu6??', 'type': 'special', 'answers': []},
            {'emoji': 'Icons/crane.png', 'text': 'Est-ce qu7??', 'type': 'default', 'answers': []},
            {'emoji': 'Icons/crane.png', 'text': 'Est-ce qu8??', 'type': 'default', 'answers': []},
        ]
    }

    questionsNumber = resources.length;

    if (genderButton.classList.contains('active')) {
        genderButton.classList.remove('active')
    }
}

function startGame() {
    openPage(1)
    for (let i = 5; i >= 0; i--) { // Crée les cartes de 5 à 0
        newCard(i);
    }
    setCurrentCard(document.querySelector('section#playing .card[data-value="5"]'));
}

function showResults() {
    const rewards = [
        {'name': 'ASSEZ PROPRE', 'color': '#90F06B'},
        {'name': 'SALE', 'color': '#B0D356'},
        {'name': 'SUPER SALE', 'color': '#DFAA39'},
        {'name': 'MEGA SALE', 'color': '#ED7B27'},
        {'name': 'UN GROS CRADO', 'color': '#E14B22'},
        {'name': 'LE CRADO ORIGINEL', 'color': '#D4191D'},
        {'name': 'LE ROI DES CRADOS', 'color': '#BB0F4C'},
        {'name': 'UN CACA SUPER SALE', 'color': '#A2067E'},
        {'name': 'LE SEIGNEUR DU CACA', 'color': '#78007A'},
        {'name': 'UNE GROSSE MERDE', 'color': '#3F0140'},
        {'name': 'UNE CAUSE PERDUE', 'color': '#000000'}
    ]

    // Calcul du score
    let scorePercentage = Math.round(score / scoreMax * 100);

    if (scorePercentage > 100) {
        scorePercentage = 100;
    }

    // Affichage
    let rewardIndex = Math.round(scorePercentage/10);
    let rewardText = document.querySelector('section#results h3');
    rewardText.textContent = rewards[rewardIndex].name
    rewardText.style.color = rewards[rewardIndex].color

    document.querySelector('section#results .bar .cursor').style.left = `${scorePercentage}%`

    openPage(2)
}

function answerQuestion(answer) { // Réponse par bouton
    if (answer == 0) {
        absoluteToFixed();
        currentCard.style.left = `${currentCard.offsetLeft - cardStartWidth}px`; // Fait disparaître la carte à gauche
        currentCard.style.transform = `translate(0, 0) scale(1) rotate(-20deg)`
        if (currentCard.classList.contains('special')) {
            currentCard.style.filter = 'hue-rotate(-50deg)'
        } else {
            currentCard.style.background = `rgb(255, 106, 136)`
        }
        nextCard();
    } else {
        absoluteToFixed();
        score += answer * scoreMultiplier
        currentCard.style.left = `${currentCard.offsetLeft + cardStartWidth}px`; // Fait disparaître la carte à droite
        currentCard.style.transform = `translate(0, 0) scale(1) rotate(20deg)`
        if (currentCard.classList.contains('special')) {
            currentCard.style.filter = 'hue-rotate(50deg)'
        } else {
            currentCard.style.background = `rgb(107, 255, 136)`
        }
        nextCard();
    }
}

function homeMenu() {
    initialize()
    openPage(0)
}



/////////////////////>
// FONCTIONNALITE - Déplacement de la carte en haut de la pile
/////////////////////>

let x = 0
let y = 0 // Coordonnées = décalages Left et Top de la carte

let score = 0
let scoreMultiplier = 1
let scoreMax = 0

function fixedToAbsolute() { // Centrage absolu de la carte déplaçable
    currentCard.style.left = `50%`;
    currentCard.style.top = `50%`;
    currentCard.style.height = `100%` // (La largeur est automatique)
    currentCard.style.position = 'absolute'
    currentCard.style.transform = `translate(-50%, -50%) scale(1) rotate(0deg)`
}
function absoluteToFixed() { // Centrage fixe de la carte déplaçable
    cardStartX = currentCard.getBoundingClientRect().left;
    cardStartY = currentCard.getBoundingClientRect().top;
    cardStartWidth = currentCard.offsetWidth;
    cardStartHeight = currentCard.offsetHeight;

    setNewPosition(cardStartX, cardStartY)
    currentCard.style.position = 'fixed'
    currentCard.style.height = `${cardStartHeight}px` // (La largeur est automatique)
    currentCard.style.transform = `translate(0, 0) scale(1) rotate(0deg)`
}

function cardCentering() { // Centrage de la carte
    // Retour aux positions centrées fixes
    currentCard.style.position = 'fixed'
    currentCard.style.transform = `translate(0, 0) scale(1) rotate(0deg)`
    setNewPosition(cardStartX, cardStartY)

    // Réinitialisation des comportements fixes de la carte vers du absolu
    setTimeout(() => {
        fixedToAbsolute()
    }, cardAnimationTime);

    // Colorimétrie
    if (currentCard.classList.contains('special')) {
        currentCard.style.filter = 'hue-rotate(0deg)'
    } else {
        currentCard.style.background = `rgb(107, 106, 136)`
    }
};

let isDragging = false;
let startX, startY; // User mouse first positions
let cardStartX, cardStartY, cardStartWidth, cardStartHeight; // 5e Carte - positions & tailles par défaut  (quand centrée)

let cardStartOffset; // OffsetLeft initial de la carte pour le calcul du ratio (car le Rotate crée des conflits avec BoundingClientRect)
let ratio; // Calcul du déplacement gauche-droite de la carte

function startDrag(e) {
    e.preventDefault(); // Désactivation du drag-and-drop de l'image
    if (e.touches && e.touches.length === 2) { // Vérifie qu'il y a deux doigts ---> Zoom sur mobile
        return
    }
    const event = e.touches ? e.touches[0] : e; // Si tactile, utilise le premier touch
    isDragging = true;
    ratio = 0;

    absoluteToFixed() // Conversion des positions absolues vers fixes

    cardStartOffset = currentCard.offsetLeft - body.getBoundingClientRect().left;

    startX = event.clientX - cardStartX; // Position initiale de la souris par rapport à la carte
    startY = event.clientY - cardStartY;
    currentCard.style.cursor = 'grabbing'; // Change le curseur quand l'utilisateur commence à glisser
};

function onDrag(e) {
    if (e.touches && e.touches.length === 2) { // Pinch-to-zoom avec deux doigts sur mobile
        return
    }
    if (!isDragging) return; //Déplace seulement si clic enfoncé depuis la map
    const event = e.touches ? e.touches[0] : e;

    // Calculer le ratio de décalage gauche-droite de la carte
    let cardCurrentOffset = currentCard.offsetLeft - body.getBoundingClientRect().left;
    ratio = Math.round((cardCurrentOffset - cardStartOffset) / cardStartOffset * 1000) / 100;
    currentCard.style.transform = `translate(0, 0) scale(1) rotate(${ratio / 4}deg)` // Appliquer le ratio de décalage gauche-droite de la carte
    if (currentCard.classList.contains('special')) {
        currentCard.style.filter = `hue-rotate(${ratio * 0.5}deg)`
    } else {
        if (ratio < 0) {
            currentCard.style.background = `rgb(${107 - ratio * 0.75}, 106, 136)`
        } else {
            currentCard.style.background = `rgb(107, ${106 + ratio *0.75}, 136)`
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
    if (ratio <= -25) {
        currentCard.style.left = `${currentCard.offsetLeft - cardStartWidth}px`; // Fait disparaître la carte à gauche
        nextCard();
    } else if (ratio >= 25) {
        currentCard.style.left = `${currentCard.offsetLeft + cardStartWidth}px`; // Fait disparaître la carte à droite
        score += 1 * scoreMultiplier
        nextCard();
    } else if (-25 < ratio < 25) {
        setCardAnimated(currentCard) // Autorise les animations smooth de durée
        cardCentering();
    }
    currentCard.style.cursor = 'grab'; // Remet le curseur de "saisie" une fois le déplacement terminé
    isDragging = false;
    ratio = false;
};



/////////////////////>
// RESOLUTION DE BUG - Interaction avec les boutons & Hover compatible avec iOS
/////////////////////>

// Empêchement de la sélection de texte de boutons
document.querySelectorAll("button").forEach(button => {
    button.addEventListener("contextmenu", function(e) {
        e.preventDefault(); // Empêche le menu contextuel
    });
});

// Hover animations
const hoverAnimatedElements = document.querySelectorAll('button');
hoverAnimatedElements.forEach(element => {
    // Souris sur PC
    element.addEventListener('mousedown', () => {
        element.classList.add('hover');
    });
    element.addEventListener('mouseup', () => {
        element.classList.remove('hover');
    });
    element.addEventListener('mouseleave', () => {
        element.classList.remove('hover'); // pour le cas où la souris sort du bouton
    });

    // Tactile sur mobile
    element.addEventListener('touchstart', () => {
        element.classList.add('hover');
    });
    element.addEventListener('touchend', () => {
        element.classList.remove('hover');
    });
});