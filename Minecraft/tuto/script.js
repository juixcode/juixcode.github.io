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

function refresh(elementClicked) {
    if (elementClicked.parentElement.parentElement.className.match('auto-selection-linked') && elementClicked.value !== '3') {
        document.querySelectorAll('form.auto-selection-linked').forEach(element => {
            element = element.children[elementClicked.value].children[0]
            element.checked = true;
            element.parentElement.parentElement.parentElement.children[1].querySelectorAll('div.hidden-content').forEach(each => {
                if (each.className.match('active') && each.parentElement.parentElement === element.parentElement.parentElement.parentElement) {
                    each.classList.remove("active");
                }
            });
            element.parentElement.parentElement.parentElement.children[1].children[element.value].classList.add("active");
        });
    } else {
        elementClicked.parentElement.parentElement.parentElement.children[1].querySelectorAll('div.hidden-content').forEach(each => {
            if (each.className.match('active') && each.parentElement.parentElement === elementClicked.parentElement.parentElement.parentElement) {
                each.classList.remove("active");
            }
        });
        elementClicked.parentElement.parentElement.parentElement.children[1].children[elementClicked.value].classList.add("active");
    }
}

function copyAnimated(element) {
    if (element.className.match('copied')) {
        element.classList.remove('copied');
    }
}

function copyIp(element) {
    navigator.clipboard
        .writeText(ip)
        .catch((error) => {
            console.error(
                `Failed to copy "${text}" to clipboard: ${error}`
            );
        });
    if (!element.classList.contains('copied')) {
        element.classList.add('copied');
        setTimeout(copyAnimated, 2000, element);
    }
}

function changePreview(element) {
    const previewImage = document.querySelector('img.shader-preview')
    const previewTitle = document.querySelector('#preview-image-name')

    document.querySelectorAll('a.preview-button').forEach(each => {
        if (each.className.match('active')) {
            each.classList.remove("active");
        }
    });
    if (!element.className.match('preview-button-reset')) {
        element.classList.add("active");
    }

    if (element.className.match('preview-button-reset')) {
        previewImage.src = "Screenshots/preview-vanilla.png"
        previewTitle.innerHTML = "Preview sans Shaders"
    } else if (element.className.match('preview-button-1')) {
        previewImage.src = "Screenshots/preview-complementary.png"
        previewTitle.innerHTML = "Preview de Complementary Shaders"
    } else if (element.className.match('preview-button-2')) {
        previewImage.src = "Screenshots/preview-bsl.png"
        previewTitle.innerHTML = "Preview de BSL Shaders"
    } else if (element.className.match('preview-button-3')) {
        previewImage.src = "Screenshots/preview-bliss.png"
        previewTitle.innerHTML = "Preview de Bliss Shaders"
    } else if (element.className.match('preview-button-4')) {
        previewImage.src = "Screenshots/preview-solas.png"
        previewTitle.innerHTML = "Preview de Solas Shader"
    } else if (element.className.match('preview-button-5')) {
        previewImage.src = "Screenshots/preview-pbr.png"
        previewTitle.innerHTML = "Preview de Fast PBR"
    } else if (element.className.match('preview-button-6')) {
        previewImage.src = "Screenshots/preview-makeup.png"
        previewTitle.innerHTML = "Preview de MakeUp UltraFast"
    }
}