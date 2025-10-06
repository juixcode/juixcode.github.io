// ######################### GLOBAL #########################

// Réduction du lag & bugs de flou sur iOS
document.addEventListener("DOMContentLoaded", () => {
    // const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    //     (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    // if (isIOS) {
    //     document.documentElement.classList.add("iOS");
    // }
    if (window.matchMedia("(pointer: coarse)").matches) { // Solution temporaire - réduction du lag sur tous les mobiles
        document.documentElement.classList.add("iOS");
    }
});

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
function switchPage(page) {
    document.querySelector('.page.active').classList.remove('active');
    document.querySelector(`.page[data-value="${page}"]`).classList.add('active');
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
    if (volumeButton.classList.contains('off') && window.innerWidth > window.innerHeight) { //Seulement si c'est sur horizontal (PC)
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