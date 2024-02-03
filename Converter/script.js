function calculer() {

		// 0 - SETUP
		var entree = Number(document.getElementById("entree").value);
		var sortie = Number(document.getElementById("sortie").value);
		var nombre = String(document.getElementById("nombre").value);
		var affichage = document.getElementById("resultat");
		var resultat = 0;
		error = "";

		// 0 - REGULATION DE LA BASE MAX ACCEPTEE (ACTUELLEMENT : 36)
		if (sortie > 36) {
			document.getElementById("sortie").value = 36
			sortie = 36
		}
		if (entree > 36) {
			document.getElementById("entree").value = 36
			entree = 36
		}

		// 0 - DETECTION DE CHAMPS MANQUANTS
		if (!(entree) || !(sortie) || !(nombre)) {
			error = "Erreur : une donnée est manquante !"
		} else {

		// 1 - CONVERSION EN BASE 10
			if (entree !== 10) {
				for (var i = 0; i < nombre.length; i++) {
					resultat = resultat + letter_to_num(nombre[nombre.length-i-1],entree)*(entree**i);
					if (letter_to_num(nombre[nombre.length-i-1],entree) >= entree) { // VERIFICATION DE LA BASE DU NOMBRE SAISI
						error = "Erreur : le nombre à convertir contient un caractère incorrect"
					}
				}
				nombre = resultat;
			}

		// 2 - CONVERSION EN BASE DE SORTIE (DIVISIONS SUCCESSIVES)
			var q = 0; var r = 0; resultat = "";
			while (nombre !== 0) {
				q = Math.floor(nombre / sortie);
				r = nombre % sortie;
				r = num_to_letter(r); // CONVERSION DES NOMBRES SUPERIEURS A 10 EN LETTRES
				resultat = resultat + String(r);
				nombre = q
			}

		// 3 - INVERSION DE L'ORDRE DES DIVISIONS SUCCESSIVES
			var resultat_reverse = "";
			for (var i = 0; i < resultat.length; i++) {
				resultat_reverse = resultat_reverse + resultat[resultat.length-i-1];
			}
		}
		
		// 4 - AFFICHAGE
		if (error !== "") {
			affichage.textContent = (error); // AFFICHAGE DE L ERREUR S IL Y EN A UNE
			new Audio("error.mp3").play(); // PETIT SON
		} else {
			affichage.textContent = (resultat_reverse); // AFFICHAGE DU RESULTAT
			new Audio("done.mp3").play();
		}
		console.log(error)
}

function num_to_letter(r) { // CONVERSION DES NOMBRES SUPERIEURS A 10 EN LETTRES
	if (r < 10) {
		r = String(r);
	} else if (r == 10) {
		r = "A";
	} else if (r == 11) {
		r = "B";
	} else if (r == 12) {
		r = "C";
	} else if (r == 13) {
		r = "D";
	} else if (r == 14) {
		r = "E";
	} else if (r == 15) {
		r = "F";
	} else if (r == 16) {
		r = "G";
	} else if (r == 17) {
		r = "H";
	} else if (r == 18) {
		r = "I";
	} else if (r == 19) {
		r = "J";
	} else if (r == 20) {
		r = "K";
	} else if (r == 21) {
		r = "L";
	} else if (r == 22) {
		r = "M";
	} else if (r == 23) {
		r = "N";
	} else if (r == 24) {
		r = "O";
	} else if (r == 25) {
		r = "P";
	} else if (r == 26) {
		r = "Q";
	} else if (r == 27) {
		r = "R";
	} else if (r == 28) {
		r = "S";
	} else if (r == 29) {
		r = "T";
	} else if (r == 30) {
		r = "U";
	} else if (r == 31) {
		r = "V";
	} else if (r == 32) {
		r = "W";
	} else if (r == 33) {
		r = "X";
	} else if (r == 34) {
		r = "Y";
	} else if (r == 35) {
		r = "Z";
	}
	return r
}

function letter_to_num(r, entree) { // CONVERSION DES NOMBRES SUPERIEURS A 10 EN LETTRES
	if (r == "A" || r == "a") {
		r = 10;
	} else if (r == "B" || r == "b") {
		r = 11;
	} else if (r == "C" || r == "c") {
		r = 12;
	} else if (r == "D" || r == "d") {
		r = 13;
	} else if (r == "E" || r == "e") {
		r = 14;
	} else if (r == "F" || r == "f") {
		r = 15;
	} else if (r == "G" || r == "g") {
		r = 16;
	} else if (r == "H" || r == "h") {
		r = 17;
	} else if (r == "I" || r == "i") {
		r = 18;
	} else if (r == "J" || r == "j") {
		r = 19;
	} else if (r == "K" || r == "k") {
		r = 20;
	} else if (r == "L" || r == "l") {
		r = 21;
	} else if (r == "M" || r == "m") {
		r = 22;
	} else if (r == "N" || r == "n") {
		r = 23;
	} else if (r == "O" || r == "o") {
		r = 24;
	} else if (r == "P" || r == "p") {
		r = 25;
	} else if (r == "Q" || r == "q") {
		r = 26;
	} else if (r == "R" || r == "r") {
		r = 27;
	} else if (r == "S" || r == "s") {
		r = 28;
	} else if (r == "T" || r == "t") {
		r = 29;
	} else if (r == "U" || r == "u") {
		r = 30;
	} else if (r == "V" || r == "v") {
		r = 31;
	} else if (r == "W" || r == "w") {
		r = 32;
	} else if (r == "X" || r == "x") {
		r = 33;
	} else if (r == "Y" || r == "y") {
		r = 34;
	} else if (r == "Z" || r == "z") {
		r = 35;
	} else {
		r = Number(r);
	}
	return r
}