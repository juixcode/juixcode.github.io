let juixAd = document.querySelector('.pub');

function closeAd() {
    juixAd.classList.add('active');
}

let body = document.querySelector('body');

function switchPage(num) {
    document.querySelector('.current-page').classList.remove('current-page');
    body.children[num].classList.add('current-page');
}