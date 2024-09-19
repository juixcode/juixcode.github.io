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

// ⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙ Ouverture des pages

function changeBackgroundTheme(x) {
    body.dataset.value = x
}

const documentHtml = document.documentElement;
const body = document.querySelector('body')
const hamburger = document.querySelector('.hamburger')
const hamburger_menu = document.querySelector('.hamburger_menu')
const first_page = document.querySelector('div.page.type1');
const pages = document.querySelector('div.pages');

function open_page(x) {
    window.scrollTo(0, 0);
    const link_on_page = document.querySelector('.link.page.on_page');
    
    hamburger.classList.remove('active'); //Fermeture auto du menu
    hamburger_menu.classList.remove('active');

    setTimeout(changeBackgroundTheme(x), 150); //Change le fond d'écran
    body.classList.add("active"); //Lance l'animation de blur
    pages.style.height = `${pages.children[x].offsetHeight}px`

    link_on_page.classList.add("anim_button_hover_navigation");
    link_on_page.classList.remove("on_page");
    navbar.children[2].children[x].classList.remove("anim_button_hover_navigation");
    navbar.children[2].children[x].classList.add("on_page");

    first_page.style.marginLeft = String(-100 * x) + 'vw'

    body.addEventListener('animationend', function() {
        body.classList.remove('active');
    });
}

// ⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙ LOAD initialisation

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(resetPageHeight, 1);
});

function resetPageHeight() {
    documentHtml.style.scrollBehavior = 'auto';
    window.scrollTo({
        left: 0,
        behavior: 'auto'
    });
    documentHtml.style.scrollBehavior = 'smooth';
    pages.style.height = `${pages.children[0].offsetHeight}px`
}

// ⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙⁙ Copie de lien

const successMessage = document.querySelector('div.copy_success_message');

function copy(a) {
    navigator.clipboard
        .writeText(a)
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
    }
};