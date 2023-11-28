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
}



const showMoreBtns = document.querySelectorAll('.link.redirection.type3');

showMoreBtns.forEach(showMoreBtn => {
    showMoreBtn.addEventListener('click', () => {
        console.log(showMoreBtn)
        if(showMoreBtn.className.match('active')) { 
            showMoreBtnClose();
        } else {
            const expander = showMoreBtn.parentElement.parentElement.parentElement.parentElement;
            showMoreBtnClose();
            expander.classList.add('active');
            showMoreBtn.classList.add('active');
            showMoreBtn.textContent = "Show less";
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
        activeShowMoreBtn.textContent = "Show more";
    }
}



hamburger.onclick = function () {
    hamburger.classList.toggle('active');
    hamburger_menu.classList.toggle('active');
};