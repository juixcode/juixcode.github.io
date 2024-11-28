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
day = 10;
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

const gallery = document.querySelector('.gallery');
function galleryAddElement(id) {
    let newImage = document.createElement('img');
    newImage.src = database[id-1];

    gallery.insertBefore(newImage, gallery.firstChild);
}