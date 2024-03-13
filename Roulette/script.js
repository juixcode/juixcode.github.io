var items_fr = ["Text1 - Cat1 - FR", "Text2 - Cat1 - FR", "Text3 - Cat1 - FR", "Text4 - Cat1 - FR"];
var items_it = ["Text1 - Cat1 - IT", "Text2 - Cat1 - IT", "Text3 - Cat1 - IT", "Text4 - Cat1 - IT"];

var items = items_fr;
var counter = 0;
var delay = 0;

function play() { //Passe à la question suivante avec animation de Pop
    counter++;
    if (counter > items.length-1) {
        counter = 0;
    }
    document.getElementById("show").innerHTML = items[counter];
    new Audio("tic.mp3").play();

    document.getElementById("show").className = "text";
    window.requestAnimationFrame(function (time) {
        window.requestAnimationFrame(function (time) {
            document.getElementById("show").className = "text active";
        });
    });
}

function done() { //Roll final : audio + apparition de la traduction (option 2)
    new Audio("done.mp3").play();
    if (document.getElementById('option-2').checked){
        tradRefresh();
        document.getElementById("trad").className = "text trad active";
    }
}

function tradRefresh() { //Affichage de la traduction (option 2)
    if (document.querySelector('button.lang').className.match('fr')) { 
        document.getElementById("trad").innerHTML = items_it[counter];
    } else {
        document.getElementById("trad").innerHTML = items_fr[counter];
    }
}
function enableTrad(){ //Cache la traduction à la (dés)activation de l'option 2
    document.getElementById("trad").className = "text trad";
}

function start(){ //Bouton Lancer : lance les rolls aléatoires avec délais
    if (document.getElementById('option-2').checked){
        document.getElementById("trad").className = "text trad";
    }
    if (document.getElementById('option-1').checked){
        counter = Math.floor(Math.random() * items.length);
        setTimeout(play, 0);
        setTimeout(done, 100);
    } else {
        delay = Math.floor(Math.random() * (50 - 10)) + 10;
        coef = (Math.floor(Math.random() * (125 - 105)) + 105)/100
        console.log("coef: " + coef);
        counter = Math.floor(Math.random() * items.length);
        console.log("starting choice: " + items[counter]);

        setTimeout(play, 0);
        while (delay < 6000*(2.6-coef)) {
            setTimeout(play, delay);
            // console.log("delay: " + delay);
            delay = delay*coef + 10;
        }
        setTimeout(play, delay);
        setTimeout(done, delay+1000);
        console.log("last delay: " + delay);
    }
}

function switchLang() { //Bouton de Langue : intervertis les deux langues
    document.querySelector('button.lang').classList.toggle('it');
    document.querySelector('button.lang').classList.toggle('fr');
    
    refreshLang();
    if (document.getElementById("show").innerHTML !== " ‎ ") {
        document.getElementById("show").innerHTML = items[counter];

        if (document.getElementById('option-2').checked){
            tradRefresh();
        }
    }
}
function refreshLang() { //Actualise les questions selon la langue choisie
    if (document.querySelector('button.lang').className.match('fr')) { 
        items = items_fr;
    } else {
        items = items_it;
    }

    // console.log(items)
}

function hamburgerDeploy() { //Ouvre/Ferme le volet d'options
    const hamburger = document.querySelector('.hamburger')
    const hamburger_menu = document.querySelector('.hamburger_menu')

    hamburger.classList.toggle('active');
    hamburger_menu.classList.toggle('active');
}

function setItems(){ //Actualise la liste des questions en fonction des sélections
    document.getElementById("show").innerHTML = " ‎ ";
    document.getElementById("trad").innerHTML = " ‎ ";
    const items_dictionary = 
    [[
        ["Text1 - Cat1 - FR", "Text2 - Cat1 - FR", "Text3 - Cat1 - FR", "Text4 - Cat1 - FR"],
        ["Text1 - Cat2 - FR", "Text2 - Cat2 - FR", "Text3 - Cat2 - FR", "Text4 - Cat2 - FR"],
        ["Text1 - Cat3 - FR", "Text2 - Cat3 - FR", "Text3 - Cat3 - FR", "Text4 - Cat2 - FR"]
    ],[
        ["Text1 - Cat1 - IT", "Text2 - Cat1 - IT", "Text3 - Cat1 - IT", "Text4 - Cat1 - IT"],
        ["Text1 - Cat2 - IT", "Text2 - Cat2 - IT", "Text3 - Cat2 - IT", "Text4 - Cat2 - IT"],
        ["Text1 - Cat3 - IT", "Text2 - Cat3 - IT", "Text3 - Cat3 - IT", "Text4 - Cat3 - IT"]
    ]];

    items_fr = [] ; items_it=[];

    if (document.getElementById('category-1').checked){
        for (let i = 0; i < items_dictionary[0][0].length; i++) {
            items_fr.push(items_dictionary[0][0][i]);
        }
        for (let i = 0; i < items_dictionary[1][0].length; i++) {
            items_it.push(items_dictionary[1][0][i]);
        }
    };
    if (document.getElementById('category-2').checked){
        for (let i = 0; i < items_dictionary[0][1].length; i++) {
            items_fr.push(items_dictionary[0][1][i]);
        }
        for (let i = 0; i < items_dictionary[1][1].length; i++) {
            items_it.push(items_dictionary[1][1][i]);
        }
    };
    if (document.getElementById('category-3').checked){
        for (let i = 0; i < items_dictionary[0][2].length; i++) {
            items_fr.push(items_dictionary[0][2][i]);
        }
        for (let i = 0; i < items_dictionary[1][2].length; i++) {
            items_it.push(items_dictionary[1][2][i]);
        }
    };

    refreshLang();
}