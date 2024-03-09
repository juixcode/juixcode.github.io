const items_fr = ["Texte1", "Texte2", "Texte3", "Texte4"];
const items_it = ["Itali1", "Itali2", "Itali3", "Itali4"];

var items = items_fr;
var counter = 0;
var delay = 0;
  
function play() {
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
  
function start(){
    delay = Math.floor(Math.random() * (50 - 10)) + 10;
    coef = (Math.floor(Math.random() * (125 - 105)) + 105)/100
    console.log("coef: " + coef);
    counter = -1;

    setTimeout(play, 0);
    while (delay < 6000*(2.6-coef)) {
        delay = delay*coef + 10;
        setTimeout(play, delay);
        console.log("delay: " + delay);
    }
}

function switchLang() {
    document.querySelector('button.lang').classList.toggle('it');
    document.querySelector('button.lang').classList.toggle('fr');
    
    if (document.querySelector('button.lang').className.match('fr')) { 
        items = items_fr;
    } else {
        items = items_it;
    }
    document.getElementById("show").innerHTML = items[counter];
}