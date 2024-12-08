// ######################### GLOBAL #########################

function copyIp(textToCopy, element) {
    playSound1()
    navigator.clipboard
        .writeText(textToCopy)
        .catch((error) => {
            console.error(
                `Failed to copy "${text}" to clipboard: ${error}`
            );
        });
    if (!element.classList.contains('copied')) {
        element.classList.add('copied');
        setTimeout(copyAnimated, 2000, element);
    }
}

function copyAnimated(element) {
    if (element.className.match('copied')) {
        element.classList.remove('copied');
    }
}

const body = document.querySelector('body');
function switchPage() {
    body.classList.toggle('show-map');
    // sound2.pause();
    // sound2.currentTime = 0;
    // sound2.play();
}

const creditsBanner = document.querySelector('.credits');
function toggleCredits() {
    creditsBanner.classList.toggle('active');
}

// ######################### AUDIOS EFFECTS #########################

const audio = document.getElementById('background-music');
window.addEventListener('load', () => {
    audio.muted = false;
    audio.volume = 0.3;

    audio.play(); // Tenter d'activer le son après le chargement
    if (audio.playing) {
        toggleVolume();
    }
});

document.addEventListener('click', () => {
    if (volumeButton.classList.contains('off')) {
        toggleVolume();
    }
}, { once: true }); // L'événement ne se déclenche qu'une fois

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        audio.pause(); // Met en pause si la fenêtre perd le focus
    } else {
        volumeTry()
    }
});

const sound1 = document.getElementById('click-sound');
const sound2 = document.getElementById('click-sound-2');
function playSound1() {
    sound1.pause();
    sound1.currentTime = 0;
    sound1.play();
}

const volumeButton = document.querySelector('.volume-button');
function toggleVolume() {
    volumeButton.classList.toggle('off');
    volumeTry()
}

function volumeTry() {
    if (volumeButton.classList.contains('off')) {
        audio.pause();
    } else {
        audio.play();
    }
}

// ######################### MINIMAP #########################

const map = document.getElementById('map');
const container = document.querySelector('.map-container');

let x = 0
let y = 0 // Coordonnées = décalages Left et Top de l'image
window.onload = () => {
    const mapWidth = map.offsetWidth;
    const mapHeight = map.offsetHeight;
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;

    // Calculer les nouvelles positions pour centrer l'image
    x = (containerWidth - mapWidth) / 2;
    y = (containerHeight - mapHeight) / 2;

    // Appliquer les positions centrées
    map.style.left = `${x}px`;
    map.style.top = `${y}px`;
};

let isDragging = false;
let startX, startY;

function startDrag(e) {
    e.preventDefault(); // Désactivation du drag-and-drop de l'image
    isDragging = true;
    const event = e.touches ? e.touches[0] : e; // Si tactile, utilise le premier touch

    startX = event.clientX - map.offsetLeft;  // Position de la souris par rapport à l'image
    startY = event.clientY - map.offsetTop;
    container.style.cursor = 'grabbing'; // Change le curseur quand l'utilisateur commence à glisser

    if (map.classList.contains('zooming')) {
        map.classList.remove('zooming');
    }
};

function onDrag(e) {
    if (!isDragging) return; //Déplace seulement si clic enfoncé depuis la map
    const event = e.touches ? e.touches[0] : e;

    // Calculer les nouvelles positions de l'image
    x = event.clientX - startX;
    y = event.clientY - startY;
    setNewPosition(map.offsetWidth, map.offsetHeight)
};

function setNewPosition(width, height) {
    // Calculer les limites pour éviter que l'image dépasse du conteneur
    const maxX = container.offsetWidth - width;
    const maxY = container.offsetHeight - height;
    // Limiter les positions à l'intérieur du conteneur
    x = Math.max(maxX, Math.min(0, x)); // Empêche l'image de dépasser à droite ou à gauche
    y = Math.max(maxY, Math.min(0, y)); // Empêche l'image de dépasser en haut ou en bas

    // Appliquer les nouvelles positions à l'image
    map.style.left = `${x}px`;
    map.style.top = `${y}px`;
}

function stopDrag() {
    isDragging = false;
    container.style.cursor = 'grab'; // Remet le curseur de "saisie" une fois le déplacement terminé
};



const zoomInButton = document.getElementById('zoom-in');
const zoomOutButton = document.getElementById('zoom-out');

let zoomLevel = 1;  // Niveau de zoom initial (1 = taille normale)

// Fonction pour appliquer le zoom
function setZoom(newLevel) {
    if (!map.classList.contains('zooming')) {
        map.classList.add('zooming');
    }
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;

    // Calculer la nouvelle largeur en fonction du niveau de zoom
    const newWidth = containerWidth * newLevel;
    const newHeight = containerHeight * newLevel;

    // Appliquer la transformation
    map.style.height = `${newHeight}px`;

    let difference = newLevel - zoomLevel
    if (difference > 0) { // Test si l'on zoom ou dézoom
        x = -(-x * 2 + (containerWidth / 2)) // Zoom centré
        y = -(-y * 2 + (containerHeight / 2))
    } else if (difference < 0) {
        x = -((-x + containerWidth/2) / 2 - (containerWidth / 2))
        y = -((-y + containerHeight/2) / 2 - (containerHeight / 2))
    }
    zoomLevel = newLevel // Zoom mis à jour
    setNewPosition(newWidth, newHeight)
}

// Ajouter un événement pour le bouton "Zoom In"
zoomInButton.addEventListener('click', () => {
    let newZoomLevel = Math.min(8.0, zoomLevel * 2); // Incrémente
    setZoom(newZoomLevel);
});

// Ajouter un événement pour le bouton "Zoom Out"
zoomOutButton.addEventListener('click', () => {
    let newZoomLevel = Math.max(1.0, zoomLevel * 0.5); // Décrémente le niveau de zoom (minimum 0.1)
    setZoom(newZoomLevel);
});

container.addEventListener('wheel', (e) => {
    if (e.deltaY < 0) {
        newZoomLevel = Math.min(8.0, zoomLevel * 2); // Incrémente
    } else {
        newZoomLevel = Math.max(1.0, zoomLevel * 0.5); // Décrémente le niveau de zoom (minimum 0.1)
    }
    setZoom(newZoomLevel);
});



// Événements pour la souris
map.addEventListener('mousedown', startDrag);
document.addEventListener('mousemove', onDrag);
document.addEventListener('mouseup', stopDrag);

// Événements pour le tactile
map.addEventListener('touchstart', startDrag);
document.addEventListener('touchmove', onDrag);
document.addEventListener('touchend', stopDrag);