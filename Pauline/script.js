document.addEventListener("DOMContentLoaded", function () {
    randomGiftTexture();
    checkDate();
});

const Gifts = document.querySelectorAll('td');
function randomGiftTexture() {
    Gifts.forEach(each => {
        let randomClass = String(Math.floor(Math.random() * 3) + 1)
        randomClass = 'gift' + randomClass
        each.classList.add(randomClass);
        // each.style.cssText = "background: url(" + database[each.dataset.value] + ") no-repeat center center; background-size: cover;";
    });
};

const today = new Date();
let day = String(today.getDate());
if (day == 25) {
    day = 24;
} else if (day > 25) {
    day = 0;
}

// function checkDate() {
//     Gifts.forEach(each => {
//         if (each.dataset.value < day) {
//             each.classList.add('unlocked');
//             galleryAddElement(each.dataset.value)
//         }
//     });
// };

function checkDate() {
    for (let id = 1; id < day; id++) {
        document.querySelector(`[data-value="${id}"]`).classList.add('unlocked');
        galleryAddElement(id)
    };
};

Gifts.forEach(each => {
    each.addEventListener('click', () => {
        if (each.dataset.value == day && !each.classList.contains('unlocked')) {
            each.classList.add('unlocked');
            galleryAddElement(each.dataset.value)
        }
    });
});

function pageChange(element) {
    document.querySelector('.page.active').classList.remove('active');
    document.querySelector('section').children[element.value].classList.add('active');
}

const database = [
    'Medias/1.jpg',
    'Medias/2.jpg',
    'Medias/3.jpg',
    'Medias/4.jpg',
    'Medias/5.jpg',
    'Medias/6.jpg',
    'Medias/7.jpg',
    'Medias/8.jpg',
    'Medias/9.jpg',
    'Medias/10.jpg',
    'Medias/11.jpg',
    'Medias/12.jpg',
    'Medias/13.jpg',
    'Medias/14.jpg',
    'Medias/15.jpg',
    'Medias/16.jpg',
    'Medias/17.jpg',
    'Medias/18.jpg',
    'Medias/19.jpg',
    'Medias/20.jpg',
    'Medias/21.jpg',
    'Medias/22.jpg',
    'Medias/23.jpg',
    'Medias/24.jpg'
];

const messagesDatabase = [
    'On est tous avec toi ma bichette 💖',
    'Si fière de mon BB... 💝',
    '1+1+1 = 1',
    'Les BGs 🔥',
    "Le regard de l'amour 💝",
    'Tellement mignonne ma bichette 😍',
    'Avec ta bestfriend 🔗',
    'Souvenirs...🥹',
    'Les drôles de dames 💃',
    'La classe des amoureux ❤️',
    'The best family 🍣',
    'Tellement fière de vous 3 ! ❤️',
    'Ma chérie adorée 💖',
    'Souvenirs de fête 🥂',
    'Que de bons moments 🔥',
    'Frère et Soeur pour la vie 🔗',
    'Couple goal ✨',
    'Encore & toujours ♾️',
    'Née pour être Reine 👑',
    'Unis pour la vie 🔗',
    'Love 💖',
    'Souvenirs de vacances 🍸',
    'Famille folle vous dîtes ? ✨',
    "Tous réunis pour te dire que l'on t'aime fort 💗"
];

const gallery = document.querySelector('.gallery');
function galleryAddElement(id) {
    let newTitle = document.createElement('h4');
    newTitle.innerHTML = "Mot du jour";

    let newMessage = document.createElement('p');
    newMessage.innerHTML = messagesDatabase[id-1];

    let newMessageBox = document.createElement('div');
    newMessageBox.classList.add('message');
    newMessageBox.appendChild(newTitle)
    newMessageBox.appendChild(newMessage)

    let newImage = document.createElement('img');
    newImage.src = database[id-1];

    let newImageContainer = document.createElement('div');
    newImageContainer.classList.add('img-container');
    newImageContainer.appendChild(newImage);
    newImageContainer.appendChild(newMessageBox);
    newImageContainer.addEventListener('click', () => {
        newImageContainer.classList.toggle('active');
    });

    gallery.insertBefore(newImageContainer, gallery.firstChild);
}