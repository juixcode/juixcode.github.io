function check() {
	var result = String(document.getElementById("result").value);
	var show = document.getElementById("show");

	final_result = ""
	for (var i = 0; i < result.length; i++) {
		final_result = final_result + String(convert(result[i]));
	}
	
	let Day = new Date().getDate();

	if (Day !== 14) {
		new Audio("error.mp3").play();
		show.textContent = ("Tu ne peux accéder à ce message qu'à la Saint-Valentin !");
	} else if (final_result !== "43838588172586858858596864786588") {
		new Audio("error.mp3").play();
		show.textContent = ("Le mot de passe est incorrect");
	} else {
		new Audio("done.mp3").play();
		document.getElementById("page1").className = "page";
		document.getElementById("page2").className = "page active";
	}
}

function convert(r) {
	if (r == "A" || r == "a") {
		r = 17;
	} else if (r == "B" || r == "b") {
		r = 525;
	} else if (r == "C" || r == "c") {
		r = 4243;
	} else if (r == "D" || r == "d") {
		r = 4253;
	} else if (r == "E" || r == "e") {
		r = 85;
	} else if (r == "F" || r == "f") {
		r = 6864;
	} else if (r == "G" || r == "g") {
		r = 342;
	} else if (r == "H" || r == "h") {
		r = 2453;
	} else if (r == "I" || r == "i") {
		r = 25;
	} else if (r == "J" || r == "j") {
		r = 4383;
	} else if (r == "K" || r == "k") {
		r = 25;
	} else if (r == "L" || r == "l") {
		r = 77;
	} else if (r == "M" || r == "m") {
		r = 86;
	} else if (r == "N" || r == "n") {
		r = 78;
	} else if (r == "O" || r == "o") {
		r = 786;
	} else if (r == "P" || r == "p") {
		r = 876;
	} else if (r == "Q" || r == "q") {
		r = 65;
	} else if (r == "R" || r == "r") {
		r = 5;
	} else if (r == "S" || r == "s") {
		r = 9;
	} else if (r == "T" || r == "t") {
		r = 88;
	} else if (r == "U" || r == "u") {
		r = 456;
	} else if (r == "V" || r == "v") {
		r = 58;
	} else if (r == "W" || r == "w") {
		r = 74;
	} else if (r == "X" || r == "x") {
		r = 66;
	} else if (r == "Y" || r == "y") {
		r = 673;
	} else if (r == "Z" || r == "z") {
		r = 327;
	} else {
		r = Number(r);
	}
	return r
}