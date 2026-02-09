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
