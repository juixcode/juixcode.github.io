const version = "1.21"
const ip = "ensemble.exaroton.me"



function setup() {
    document.querySelectorAll('.text-to-change-version').forEach(each => {
        each.innerHTML = version
    });
    document.querySelectorAll('.text-to-change-ip').forEach(each => {
        each.innerHTML = ip
    });
}

function refresh(element) {
    element.parentElement.parentElement.parentElement.children[1].querySelectorAll('div.hidden-content').forEach(each => {
        if (each.className.match('active') && each.parentElement.parentElement === element.parentElement.parentElement.parentElement) {
            each.classList.remove("active");
        }
    element.parentElement.parentElement.parentElement.children[1].children[element.value].classList.add("active");

    // const checkboxContainers = document.querySelectorAll('label.checkbox-container');
    // checkboxContainers.forEach(each => {
    //     each.children[0].checked
    //     if (each.children[0].checked) {
    //         if (!each.children[2].className.match('active')) {
    //             each.children[2].classList.add("active");
    //         }
    //     } else {
    //         if (each.children[2].className.match('active')) {
    //             each.children[2].classList.remove("active");
    //         }
    //     }
    });
}

function copyIp() {
    navigator.clipboard
        .writeText(ip)
        .catch((error) => {
            console.error(
                `Failed to copy "${text}" to clipboard: ${error}`
            );
        });
}