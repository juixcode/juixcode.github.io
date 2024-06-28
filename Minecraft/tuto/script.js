function refresh(element) {
    element.parentElement.parentElement.parentElement.children[3].querySelectorAll('div.hidden-content').forEach(each => {
        if (each.className.match('active')) {
            each.classList.remove("active");
        }
    element.parentElement.parentElement.parentElement.children[3].children[element.value].classList.add("active");

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