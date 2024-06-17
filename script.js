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



const hamburger = document.querySelector('.hamburger')
const hamburger_menu = document.querySelector('.hamburger_menu')

function open_page(x) {

    const active_page = document.querySelector('.page.active');
    const link_on_page = document.querySelector('.link.page.on_page');
    
    hamburger.classList.remove('active');
    hamburger_menu.classList.remove('active');

    link_on_page.classList.add("anim1");
    link_on_page.classList.remove("on_page");
    active_page.classList.remove("active");

    document.body.children[x].classList.add("active");
    navbar.children[2].children[x-1].classList.remove("anim1");
    navbar.children[2].children[x-1].classList.add("on_page");
}



function copy(a) {
    navigator.clipboard
        .writeText(a)
        .catch((error) => {
            console.error(
                `Failed to copy "${text}" to clipboard: ${error}`
            );
        });
    document.querySelector('div.copy_success_message').classList.add('active');
    setTimeout(stopMessageAnimation, 1000);
}
function stopMessageAnimation() {
    document.querySelector('div.copy_success_message').classList.remove('active');
}



const showMoreBtns = document.querySelectorAll('.link.redirection.type3');

showMoreBtns.forEach(showMoreBtn => {
    showMoreBtn.addEventListener('click', () => {
        console.log(showMoreBtn)
        if (showMoreBtn.className.match('active')) { 
            showMoreBtnClose();
        } else {
            const expander = showMoreBtn.parentElement.parentElement.parentElement.parentElement;
            showMoreBtnClose();
            expander.classList.add('active');
            showMoreBtn.classList.add('active');
            if (langBtn.className.match('fr')) { 
                showMoreBtn.textContent = "Voir moins";
            } else {
                showMoreBtn.textContent = "Show less";
            }
        }
    })
});

function showMoreBtnClose() {
    const activeExpander = document.querySelector('.expander.active');
    const activeShowMoreBtn = document.querySelector('.link.redirection.type3.active');
    if (!(activeExpander == null)) {
        activeExpander.classList.remove('active');
    }
    if (!(activeShowMoreBtn == null)) {
        activeShowMoreBtn.classList.remove('active');
        if (langBtn.className.match('fr')) { 
            activeShowMoreBtn.textContent = "Voir plus";
        } else {
            activeShowMoreBtn.textContent = "Show more";
        }
    }
}



hamburger.onclick = function () {
    hamburger.classList.toggle('active');
    hamburger_menu.classList.toggle('active');
};



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

    showMoreBtns.forEach(each => {
        if (langBtn.className.match('fr')) { 
            if (each.className.match('active')) { each.textContent = "Voir moins"; } else { each.textContent = "Voir plus"; }
        } else {
            if (each.className.match('active')) { each.textContent = "Show less"; } else { each.textContent = "Show more"; }
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