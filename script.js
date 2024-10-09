// ⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙ Firebase

// Importer les fonctions SDKs
// import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

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

// ⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙ Mettre à jour la database

const elementsWithData = document.querySelectorAll('.has_data_to_save')
const elementsWithArray = document.querySelectorAll('.has_array_to_save')
const totalDownloadsIndicators = document.querySelectorAll('.pack_download_total_downloads')
var database = firebase.database().ref('juixcode-database'); // Référence à la base de données

function maxUsedID(database) {
    let allKeysList = []
    for (let clef in database) {
        allKeysList.push(Number(clef))
    }
    console.log("ID Maximal utilisé : " + Math.max(...allKeysList))
}

function updateDatabaseDomain() {
    // ETAPE 1 - INITIALISATION DE LA BASE VIDE
    localDatabase = {}

    elementsWithData.forEach(each => { // id ---> data
        localDatabase[each.id] = "0";
    });
    elementsWithArray.forEach(each => { // id ---> array
        localDatabase[each.id] = [['01/01/3024','Here is the start of the conversation. Ask any question, report a bug or give your opinion on my pack !']];
    });

    // ETAPE 2 - INSERTION DES VALEURS PRESENTES DANS LA BASE
    database.once('value')
        .then((snapshot) => {
            let onlineDatabase = snapshot.val(); // Extraire les valeurs de la base de données
            for (let key in onlineDatabase) {
                localDatabase[key] = onlineDatabase[key]
            }
            console.log(localDatabase)
            updateElementsWithData(localDatabase)

            // ETAPE 3 - UPDATE L'AFFICHAGE DES ELEMENTS
            updateElementsWithData(localDatabase)
            maxUsedID(localDatabase)

            // ETAPE 4 - REEXPORTATION
            return database.set(localDatabase); // Écrase les valeurs actuelles par celles de 'onlineDatabase'
        })
        .then(() => {
            console.log("La base de données a été mise à jour avec succès !");
        })
        .catch((error) => {
            console.error("Erreur lors de la récupération ou de la mise à jour de la base de données :", error);
        });
}

let globalCommentPostTest = document;

function updateElementsWithData(database) {
    document.querySelectorAll('.has_data_to_save.pack_download_upvote').forEach(element => { //Update des affichages des nombres d'upvotes de packs téléchargeables
        // element.textContent = database[element.id] + '\ud83d\udd25'
        element.textContent = database[element.id]
    });
    // document.querySelectorAll('.has_data_to_save.pack_download_reviews_note').forEach(element => { //Update des affichages des notes de packs téléchargeables
    //     let final_note = 0;
    //     for (let note in database[element.id]) {
    //         final_note += note;
    //     }
    //     final_note = (final_note / length(database[element.id])).toFixed(1);
    //     element.textContent = String(final_note);
    // });
    document.querySelectorAll('.has_data_to_save.pack_download_number_downloads').forEach(element => { //Update des affichages du nombre de téléchargements des versions de packs téléchargeables
        element.textContent = database[element.id]
    });
    totalDownloadsIndicators.forEach(element => { //Calcul des affichages de téléchargements totaux
        let totalDownloads = 0;
        element.parentElement.parentElement.parentElement.querySelectorAll('tbody td.has_data_to_save').forEach(downloadNumber => {
            totalDownloads = totalDownloads + Number(downloadNumber.textContent);
        });
        element.textContent = String(totalDownloads);
    });
    document.querySelectorAll('.has_array_to_save.link.redirection').forEach(element => { //Update des commentaires de packs téléchargeables
        let messagesArea = element.parentElement.parentElement.parentElement.children[1]
        if (messagesArea.childElementCount-1 < database[element.id].length) { //ChildCount-1 pour contourner la présence du bouton de Refresh
            for (let i = messagesArea.childElementCount-1; i < database[element.id].length; i++) {
                let newMessageDiv = document.createElement('div'); //Création du message
                newMessageDiv.className = 'message';
                newMessageDiv.textContent = database[element.id][i][1];
                newMessageDiv.appendChild(document.createElement('br'));

                if (globalCommentPostTest === element & i === database[element.id].length - 1) { // Alors le message a été envoyé par l'utilisateur actuel
                    newMessageDiv.classList.add('active');
                    globalCommentPostTest = document;
                };

                let spanElement = document.createElement('span');
                spanElement.textContent = database[element.id][i][0];
                newMessageDiv.appendChild(spanElement);
            
                messagesArea.appendChild(newMessageDiv);
            };
            messagesArea.scrollTo({top: messagesArea.scrollHeight, behavior: 'smooth'});
        };
    });
}

// ⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙ Compteurs de downloads & données enregistrées

function updateDatabase(elementID, addition, type) {
    database.once('value')
        .then((snapshot) => {
            // ETAPE 1 - RECUPERATION DES VALEURS PRESENTES DANS LA BASE
            let localDatabase = snapshot.val();

            // ETAPE 2 - AFFECTATION DE LA VALEUR CHANGEANTE
            if (type === 'data') {
                localDatabase[elementID] = String(Number(localDatabase[elementID]) + addition);
            } else if (type === 'array') {
                localDatabase[elementID].push(addition);
            }

            // ETAPE 3 - UPDATE L'AFFICHAGE DES ELEMENTS
            updateElementsWithData(localDatabase)

            // ETAPE 4 - REEXPORTATION DES DONNEES VERS LA BASE
            if (type !== 'init') {
                return database.set(localDatabase); // Écrase les valeurs actuelles par celles de 'onlineDatabase'
            } 
        })
        .then(() => {
        })
        .catch((error) => {
            console.error("Data error :", error);
        });
}

// Initialisation et récupération des données sauvegardées
document.addEventListener("DOMContentLoaded", () => {
    // updateDatabaseDomain()
    updateDatabase(0, 0, 'init');
});

// Incrémentation du nombre de downloads des versions de packs Minecraft
document.querySelectorAll('.pack_download_slider_item_download .link.download.type2').forEach(each => {
    each.addEventListener('click', () => {
        let relatedDataID = each.parentElement.parentElement.parentElement.children[3].id;
        updateDatabase(relatedDataID, 1, 'data');
    });
});

// Incrémentation du nombre d'upvotes des packs Minecraft
document.querySelectorAll('.has_data_to_save.pack_download_upvote').forEach(each => {
    each.addEventListener('click', () => {
        if (!each.classList.contains('disabled')) {
            updateDatabase(each.id, 1, 'data');
            each.classList.add('disabled');
            successMessage.children[0].textContent = "Thanks for support";
            successMessage.classList.add('active');
        }
    });
});

// Enregistrement de commentaire de pack téléchargeable
document.querySelectorAll('.has_array_to_save.link.redirection').forEach(each => {
    each.addEventListener('click', () => {
        let today = new Date();
        let day = String(today.getDate()).padStart(2, '0'); // Ajoute un 0 devant si < 10
        let month = String(today.getMonth() + 1).padStart(2, '0'); // Les mois sont indexés de 0 à 11, donc on ajoute +1
        let year = today.getFullYear();
        let fullDate = `${day}/${month}/${year}`;

        let messageContent = each.parentElement.querySelector('textarea');
        if (messageContent.value !== '') {
            console.log(messageContent.value)
            console.log([messageContent.value])
            globalCommentPostTest = each // Indique que le message a été envoyé par l'utilisateur actuel
            updateDatabase(each.id, [fullDate,messageContent.value], 'array');
            messageContent.value = '';
            successMessage.children[0].textContent = "Message sent";
            successMessage.classList.add('active');
        }
    });
});

// Bouton d'actualisation des valeurs
document.querySelectorAll('.link.refresh_database').forEach(each => {
    each.addEventListener('animationend', function() {
        each.classList.remove('active');
    });
    each.addEventListener('click', () => {
        updateDatabase(0, 0, 'init');
        each.classList.add('active');
    });
});

// ⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙ Navbar background animation

const navbar = document.querySelector('nav')
window.addEventListener('scroll', () => {

    const section = document.querySelector('.page.active').children[1]
    const {scrollTop, clientHeight} = document.documentElement;
    const topElementToViewport = section.getBoundingClientRect().top;
    
    if(scrollTop > (scrollTop + topElementToViewport).toFixed() - clientHeight * 0.80) {
        navbar.classList.add('secondary')
    } else {
        navbar.classList.remove('secondary')
    }
})

// ⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙ Lien vers élément de la page

function scrollToElement(element) {
    setTimeout(function() {
        // document.getElementById(element).scrollIntoView({ behavior: 'smooth' });
        const topPosition = document.getElementById(element).getBoundingClientRect().top + window.scrollY - 75;
        window.scrollTo({top: topPosition, behavior: 'smooth' });
    }, 300);
}

// ⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙ Ouverture auto de la page

document.addEventListener("DOMContentLoaded", () => {
    setTimeout(function() { //Attente du chargement de la homepage
        hashToPage(false);
    }, 500);
});

window.addEventListener('hashchange', function() {
    hashToPage(true);
});

function hashToPage(includeHomePage) {
    const currentHash = window.location.hash;  // Récupère ce qui est après le #
    if (currentHash) { // Vérifie s'il y a un fragment dans l'URL
        switch (currentHash) {
            case "#minecraft":
                open_page('1')
                break;
            case "#genshin":
                open_page('2')
                break;
            case "#music":
                open_page('3')
                break;
            case "#other":
                open_page('4')
                break;
            default:
                if (includeHomePage) {
                    open_page('0')
                }
                break;
        }
    }
}

// ⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙ Ouverture des pages

const documentHtml = document.documentElement;
const body = document.querySelector('body')
const hamburger = document.querySelector('.hamburger')
const hamburger_menu = document.querySelector('.hamburger_menu')
const pages = document.querySelector('div.pages');
const hashesList = ['#home', '#minecraft', '#genshin', '#music', '#other'];

function open_page(x) {
    // window.location.hash = hashesList[x]
    const link_on_page = document.querySelector('.link.page.on_page');
    
    hamburger.classList.remove('active'); //Fermeture auto du menu
    hamburger_menu.classList.remove('active');

    body.classList.add("active"); //Lance l'animation de blur & glissement

    documentHtml.style.scrollBehavior = 'auto';
    setTimeout(function() { //Redirection en haut de page & Remplacement de la page
        window.scrollTo(0, 0);
        documentHtml.style.scrollBehavior = 'smooth';

        const activePage = document.querySelector('.page.active');
        body.dataset.value = x //Change le fond d'écran
        activePage.classList.remove("active");
        pages.children[x].classList.add("active");
    }, 200); // Délai court pour garantir la réactivation après le scroll
    
    setTimeout(function() { //Modification de la couleur de la navbar
        navbar.dataset.value = x
    }, 500);

    link_on_page.classList.add("anim_button_hover_navigation");
    link_on_page.classList.remove("on_page");
    navbar.children[2].children[x].classList.remove("anim_button_hover_navigation");
    navbar.children[2].children[x].classList.add("on_page");

    body.addEventListener('animationend', function() { //Pour réitérer l'animation de blur
        body.classList.remove('active');
    });
}

// function open_page(x) {
//     const first_page = document.querySelector('div.page.type1');
//     window.scrollTo(0, 0);
//     const link_on_page = document.querySelector('.link.page.on_page');
    
//     hamburger.classList.remove('active'); //Fermeture auto du menu
//     hamburger_menu.classList.remove('active');

//     setTimeout(changeBackgroundTheme(x), 150); //Change le fond d'écran
//     body.classList.add("active"); //Lance l'animation de blur
//     pages.style.height = `${pages.children[x].offsetHeight}px`

//     link_on_page.classList.add("anim_button_hover_navigation");
//     link_on_page.classList.remove("on_page");
//     navbar.children[2].children[x].classList.remove("anim_button_hover_navigation");
//     navbar.children[2].children[x].classList.add("on_page");

//     first_page.style.marginLeft = String(-100 * x) + 'vw'

//     body.addEventListener('animationend', function() {
//         body.classList.remove('active');
//     });
// }

// ⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙ LOAD initialisation

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() { // Animations d'ouverture
        const appearAnimatedZoomOut = document.querySelectorAll('.anim_appear_zoom-out')
        appearAnimatedZoomOut.forEach(each => {
            each.classList.remove('anim_appear_zoom-out');
        });
        const appearAnimatedZoomIn = document.querySelectorAll('.anim_appear_zoom-in')
        appearAnimatedZoomIn.forEach(each => {
            each.classList.remove('anim_appear_zoom-in');
        });
    }, 300);

    document.querySelectorAll('.shortcut_download_button').forEach(each => { // Lien fastDownload relié à la dernière version dispo
        let latestPack = each.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.querySelector('.pack_download_slider_item_download table tbody').children[0]
        each.href = latestPack.children[4].children[0].children[0].href
        each.textContent = latestPack.children[1].textContent
        each.parentElement.parentElement.querySelector('p span').textContent = latestPack.children[0].textContent

        each.addEventListener('click', () => {
            updateDatabase(latestPack.children[3].id, 1, 'data');
        });
    });
});

// function resetPageHeight() {
//     documentHtml.style.scrollBehavior = 'auto';
//     window.scrollTo({
//         left: 0,
//         behavior: 'auto'
//     });
//     documentHtml.style.scrollBehavior = 'smooth';
//     pages.style.height = `${pages.children[0].offsetHeight}px`
// }

// ⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙ Copie de lien

const successMessage = document.querySelector('div.copy_success_message');

function copy(copyButton) {
    let textToCopy = copyButton.parentElement.querySelector('a').href;
    navigator.clipboard
        .writeText(textToCopy)
        .catch((error) => {
            console.error(
                `Failed to copy "${text}" to clipboard: ${error}`
            );
        });
    successMessage.children[0].textContent = "Copied successfully";
    successMessage.classList.add('active');
}

successMessage.addEventListener('animationend', function() {
    successMessage.classList.remove('active');
});

// ⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙ Slider de la homepage

const initialSliderItem1 = document.querySelector('.slider_homepage_item[data-value="1"]')
const initialSliderItem2 = document.querySelector('.slider_homepage_item[data-value="2"]')
const initialSliderItem3 = document.querySelector('.slider_homepage_item[data-value="3"]')
const initialSliderItem4 = document.querySelector('.slider_homepage_item[data-value="4"]')
const initialSliderItem5 = document.querySelector('.slider_homepage_item[data-value="5"]')
const sliderHomeItems = document.querySelectorAll('.slider_homepage_item');

function sliderHomepageRadioclick(element) {
    initialSliderItem1.dataset.value = 1 - Number(element.value)
    initialSliderItem2.dataset.value = 2 - Number(element.value)
    initialSliderItem3.dataset.value = 3 - Number(element.value)
    initialSliderItem4.dataset.value = 4 - Number(element.value)
    initialSliderItem5.dataset.value = 5 - Number(element.value)
    sliderHomeItems.forEach(each => {
        if (each.dataset.value < 1) {
            each.dataset.value =  String(Number(each.dataset.value) + 5)
        }
    });
}

function sliderHomepageItemclick(element) {
    if (element.dataset.value == 1) { sliderHomepage(2) }
    if (element.dataset.value == 2) { sliderHomepage(1) }
    if (element.dataset.value == 4) { sliderHomepage(-1) }
    if (element.dataset.value == 5) { sliderHomepage(-2) }
};

function sliderHomepage(side) {
    sliderHomeItems.forEach(each => {
        each.dataset.value =  String(Number(each.dataset.value) + Number(side))
        if (each.dataset.value > 5) {
            each.dataset.value =  String(Number(each.dataset.value) - 5)
        } else if (each.dataset.value < 1) {
            each.dataset.value =  String(Number(each.dataset.value) + 5)
        }
    });
    let slide_x = String(6 - Number(initialSliderItem1.dataset.value))
    if (slide_x == 5) {
        slide_x = 0
    }
    document.querySelector('.slider_homepage_nav form').children[slide_x].children[0].checked = true;
};

// ⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙ Slider de pack téléchargeable

function sliderPackDownloadRadioclick(element) {
    if (element.value == '3') {
        let messagesArea = element.parentElement.parentElement.parentElement.querySelector('.pack_download_slider_item_chat_messages')
        messagesArea.scrollTo({top: messagesArea.scrollHeight, behavior: 'smooth'});
    }
    let packDownloadSlider = element.parentElement.parentElement.parentElement.children[2]
    // packDownloadSlider.dataset.value = element.value
    packDownloadSlider.style.marginLeft = String(-100 * element.value) + 'vw'
}

function galleryPackDownloadRadioclick(element) {
    let packGalleryImage = element.parentElement.parentElement.parentElement.children[0]
    packGalleryImage.dataset.value = element.value
}

// ⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙ Expander de gallerie d'images téléchargeables

document.querySelectorAll('.gallery_download_item').forEach(each => {
    each.addEventListener('click', function() {
        each.classList.toggle('active');
    });
});

// ⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙ Expander

// const showMoreBtns = document.querySelectorAll('.link.redirection.type3');

// showMoreBtns.forEach(showMoreBtn => {
//     showMoreBtn.addEventListener('click', () => {
//         console.log(showMoreBtn)
//         if (showMoreBtn.className.match('active')) { 
//             showMoreBtnClose();
//         } else {
//             const expander = showMoreBtn.parentElement.parentElement.parentElement.parentElement;
//             showMoreBtnClose();
//             expander.classList.add('active');
//             showMoreBtn.classList.add('active');
//             if (langBtn.className.match('fr')) { 
//                 showMoreBtn.textContent = "Voir moins";
//             } else {
//                 showMoreBtn.textContent = "Show less";
//             }
//         }
//     })
// });

// function showMoreBtnClose() {
//     const activeExpander = document.querySelector('.expander.active');
//     const activeShowMoreBtn = document.querySelector('.link.redirection.type3.active');
//     if (!(activeExpander == null)) {
//         activeExpander.classList.remove('active');
//     }
//     if (!(activeShowMoreBtn == null)) {
//         activeShowMoreBtn.classList.remove('active');
//         if (langBtn.className.match('fr')) { 
//             activeShowMoreBtn.textContent = "Voir plus";
//         } else {
//             activeShowMoreBtn.textContent = "Show more";
//         }
//     }
// }

// ⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙ Ouverture du menu mobile

hamburger.onclick = function () {
    hamburger.classList.toggle('active');
    hamburger_menu.classList.toggle('active');
};

// ⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙ Traduction du site

document.addEventListener("DOMContentLoaded", () => {
    const lang=navigator.language.substr(0,2).toLowerCase();
    if (lang == "fr") {
        switchLang()
    }
});

const langBtn = document.querySelector('.link.lang');

function switchLang() {
    langBtn.classList.toggle('en');
    langBtn.classList.toggle('fr');
    
    const canSwitchLang = document.querySelectorAll('.can_switch_lang');
    canSwitchLang.forEach(each => {
        each.classList.toggle('active');
    });

    const checkOutBtns = document.querySelectorAll('.link.redirection.type1');
    checkOutBtns.forEach(each => {
        if (langBtn.className.match('fr')) { 
            each.textContent = "Voir plus";
        } else {
            each.textContent = "Check out";
        }
    });

    const seeMoreBtns = document.querySelectorAll('.slider_homepage_item a.link.redirection');
    seeMoreBtns.forEach(each => {
        if (langBtn.className.match('fr')) { 
            each.textContent = "Voir plus";
        } else {
            each.textContent = "See more";
        }
    });

    const sendMessage = document.querySelectorAll('.link.redirection.type3');
    sendMessage.forEach(each => {
        if (langBtn.className.match('fr')) { 
            each.textContent = "Envoyer le message";
        } else {
            each.textContent = "Send message";
        }
    });

    const mainNetworks = document.querySelectorAll('.link.main_network');
    mainNetworks.forEach(each => {
        if (langBtn.className.match('fr')) { 
            each.textContent = "Mon Instagram";
        } else {
            each.textContent = "My Instagram";
        }
    });

    const packDependencies = document.querySelectorAll('.pack_download_block a.link.redirection.type6');
    packDependencies.forEach(each => {
        if (langBtn.className.match('fr')) { 
            each.textContent = "Aller au pack";
        } else {
            each.textContent = "Go to pack";
        }
    });
}

// ⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙ Envoi de message depuis la homepage

function ResetPlaceholderColor() {
    document.querySelectorAll('textarea.active').forEach(each => {
        each.classList.remove('active')
    });
}

function sendMessage() {
    const contact_contact = document.querySelector('#contact_contact')
    const contact_message = document.querySelector('#contact_message')
    const contact_name = document.querySelector('#contact_name')
    if (contact_contact.value == '') {
        contact_contact.classList.add('active')
        setTimeout(ResetPlaceholderColor, 200);
    } else if (contact_message.value == '') {
        contact_message.classList.add('active')
        setTimeout(ResetPlaceholderColor, 200);
    } else {
        let customer = contact_name.value
        if (customer == '') {
            customer = 'Une personne anonyme'
        }
        const token = '7505325320:AAEjahmj4jRnz4sejUS0g0hBECS4r-tyWCE';
        const chat_id = '5964879114';
        const message = '🙋‍♂️' + customer + ' a écrit :\n' + contact_message.value + '\n\n➡️Contact : ' + contact_contact.value;
        const url = `https://api.telegram.org/bot${token}/sendMessage?chat_id=${chat_id}&text=${encodeURIComponent(message)}`;
    
        fetch(url) // Requête
            .then(response => response.json())
            .then(data => {
                if (data.ok) {
                    console.log('Message envoyé avec succès :', data);
                    successMessage.children[0].textContent = "Message sent";
                    successMessage.classList.add('active');
                } else {
                    console.error('Erreur lors de l\'envoi du message :', data);
                }
            })
            .catch(error => {
                console.error('Erreur lors de l\'envoi de la requête :', error);
            });
        contact_message.value = '';
    }
};