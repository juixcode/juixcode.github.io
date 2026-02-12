// --- CONFIGURATION ---
tailwind.config = {
    theme: {
        extend: {
            colors: {
                background: '#0f172a',
                surface: '#1e293b',
                primary: '#6366f1',
                secondary: '#10b981',
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-out forwards',
            }
        },
    },
}

// --- DATA CONSTANTS ---
const STORAGE_KEY_CARDS = 'flash-cards-v3';
const STORAGE_KEY_DECKS = 'flash-decks-v3';
const PREFS_KEY = 'flash-prefs-v3';
const THEME_COLORS_KEY = 'flash-theme-colors-v3';

// --- STATE ---
let decks = [];
let cards = [];
let themeColors = {};
let currentView = 'home';
let activeDeckId = null;
let currentSortMode = 'date';
let isCustomSortMode = false;
let draggedItem = null;

// --- PRESETS ---
const GRADIENTS = [
    { name: 'Indigo', class: 'from-indigo-600 to-violet-600' },
    { name: 'Emerald', class: 'from-emerald-600 to-teal-600' },
    { name: 'Rose', class: 'from-rose-600 to-pink-600' },
    { name: 'Amber', class: 'from-amber-600 to-orange-600' },
    { name: 'Blue', class: 'from-blue-600 to-cyan-600' },
    { name: 'Fuchsia', class: 'from-fuchsia-600 to-purple-600' },
    { name: 'Slate', class: 'from-slate-600 to-gray-600' },
];
// Simplified Colors
const THEME_COLORS = [
    { name: 'Rouge', class: 'bg-red-500' },
    { name: 'Orange', class: 'bg-orange-500' },
    { name: 'Jaune', class: 'bg-yellow-500' },
    { name: 'Vert', class: 'bg-emerald-500' },
    { name: 'Bleu', class: 'bg-blue-500' },
    { name: 'Indigo', class: 'bg-indigo-500' },
    { name: 'Violet', class: 'bg-purple-500' },
    { name: 'Rose', class: 'bg-pink-500' },
];

const DEFAULT_DECK_ID = 'colles-n2-public';

const DEFAULT_CARDS = [
    // Probas
    { question: "1. Définition d'une tribu sur Ω:", answer: "On appelle tribu (ou $\\sigma$-algèbre) sur $\\Omega$ toute famille $\\mathcal{A} \\subset \\mathcal{P}(\\Omega)$ telle que : \n- $\\Omega \\in \\mathcal{A}$, \n- si $A \\in \\mathcal{A}$ alors $\\overline{A}=\\Omega \\backslash A \\in \\mathcal{A}$ \n- si $(A_{n})_{n \\in \\mathbb{N}}$ est une suite d'éléments de $\\mathcal{A}$, alors $\\bigcup_{n \\in \\mathbb{N}} A_{n} \\in \\mathcal{A}$.", theme: "Probas : Introduction aux probabilités" },
    { question: "2. Définition d'un espace probabilisable :", answer: "Un espace probabilisable est un couple $(\\Omega, \\mathcal{A})$ où $\\Omega$ est un ensemble (univers) et $\\mathcal{A}$ une tribu sur $\\Omega$.", theme: "Probas : Introduction aux probabilités" },
    { question: "3. Définition d'une probabilité sur (Ω, A) et d'un espace probabilisé :", answer: "Une probabilité sur $(\\Omega, \\mathcal{A})$ est une application $P : \\mathcal{A} \\rightarrow \\mathbb{R}$ vérifiant : \n- $\\forall A \\in \\mathcal{A}, P(A) \\ge 0$, \n- $P(\\Omega)=1$, \n- si $(A_{n})_{n \\ge 1}$ sont deux à deux incompatibles (i.e. $A_{n} \\cap A_{m}=\\emptyset$ si $n \\neq m$), alors $P\\left(\\bigcup_{n \\ge 1} A_{n}\\right)=\\sum_{n \\ge 1} P(A_{n}).$ \nLe triplet $(\\Omega, \\mathcal{A}, P)$ est appelé espace probabilisé.", theme: "Probas : Introduction aux probabilités" },
    { question: "4. Définition de la probabilité uniforme sur un univers fini:", answer: "Soit $\\Omega$ fini et $\\mathcal{A}=\\mathcal{P}(\\Omega)$. On dit que $P$ est la probabilité uniforme si $\\forall \\omega, \\omega^{\\prime} \\in \\Omega, P(\\{\\omega\\})=P(\\{\\omega^{\\prime}\\}).$ Dans ce cas, $\\forall A \\in \\mathcal{A}, P(A)=\\frac{Card(A)}{Card(\\Omega)}.$", theme: "Probas : Introduction aux probabilités" },
    { question: "5. Définition de la probabilité conditionnelle et formule des probabilités composées:", answer: "Soit $B \\in \\mathcal{A}$ tel que $P(B)>0$. La probabilité conditionnelle de $A$ sachant $B$ est $P(A|B)=\\frac{P(A \\cap B)}{P(B)}.$ On en déduit la formule des probabilités composées : $P(A \\cap B)=P(A|B)P(B)=P(B|A)P(A)$ (si $P(A)>0$ et $P(B)>0$).", theme: "Probas : Introduction aux probabilités" },
    { question: "6. Formule des probabilités totales (avec SCE) :", answer: "Si $(B_{n})_{n \\ge 0}$ est un système complet d'événements (partition dénombrable de $\\Omega$ par des événements de $\\mathcal{A}$, deux à deux incompatibles, dont l'union vaut $\\Omega$), alors $\\forall A \\in \\mathcal{A}, P(A)=\\sum_{n \\ge 0} P(A \\cap B_{n})=\\sum_{n \\ge 0} P(A|B_{n})P(B_{n})$ (en supposant $P(B_{n})>0$ pour écrire $P(A|B_{n})$).", theme: "Probas : Introduction aux probabilités" },
    { question: "7. Formule de Bayes:", answer: "Si $P(A)>0$ et $P(B)>0$ alors $P(B|A)=\\frac{P(A|B)P(B)}{P(A)}$. Plus généralement, si $(B_{n})_{n \\ge 0}$ est un SCE avec $P(B_{n})>0$ et si $P(A)>0$ alors $P(B_{i}|A)=\\frac{P(A|B_{i})P(B_{i})}{\\sum_{n \\ge 0} P(A|B_{n})P(B_{n})}.$", theme: "Probas : Introduction aux probabilités" },
    { question: "8. Définition de l'indépendance de deux événements:", answer: "Deux événements $A$ et $B$ sont indépendants si et seulement si $P(A \\cap B)=P(A)P(B)$.", theme: "Probas : Introduction aux probabilités" },
    { question: "1. Variable aléatoire réelle définition et intuition:", answer: "Soit $(\\Omega, \\mathcal{A}, P)$ un espace probabilisé. Une variable aléatoire réelle est une application $X : \\Omega \\rightarrow \\mathbb{R}.$ Intuition historique : l'expérience est le \"jeu\", la variable aléatoire est le \"gain\", la loi décrit le comportement probabiliste de ce gain.", theme: "Probas : Variables aléatoires discrètes" },
    { question: "2. Définition d'une variable aléatoire discrète et de sa loi de probabilité:", answer: "On dit que $X$ est discrète si $X(\\Omega)$ est fini ou dénombrable. Si $X(\\Omega)=\\{x_{1}, x_{2}, ...\\}$, la loi de $X$ est donnée par $p(x_{i})=P(X=x_{i})$ ($i \\ge 1$), $p(x_{i}) \\ge 0$ et $\\sum_{i \\ge 1} p(x_{i})=1.$ Pour tout $B \\subset \\mathbb{R}$, on a $P(X \\in B)=\\sum_{i: x_{i} \\in B} p(x_{i}).$", theme: "Probas : Variables aléatoires discrètes" },
    { question: "3. Définition de la fonction de répartition (cas discret) et son rôle:", answer: "La fonction de répartition de $X$ est $F_{X}(a)=P(X \\le a)=\\sum_{i: x_{i} \\le a} P(X=x_{i})$ pour $a \\in \\mathbb{R}.$ Rôle : $F_{X}$ caractérise la loi de $X$ (c'est un \"identifiant\" de la loi, comme un numéro d'immatriculation : deux v.a. ont la même loi ssi elles ont la même fonction de répartition).", theme: "Probas : Variables aléatoires discrètes" },
    { question: "4. Propriétés essentielles de $F_{X}$ (discret):", answer: "$F_{X}$ est une fonction en escalier, non décroissante, continue à droite, et vérifie $\\lim_{a \\rightarrow -\\infty} F_{X}(a)=0$ , $\\lim_{a \\rightarrow +\\infty} F_{X}(a)=1$ . De plus, pour $a < b, P(a < X \\le b)=F_{X}(b)-F_{X}(a).$", theme: "Probas : Variables aléatoires discrètes" },
    { question: "5. Définition de l'espérance (cas discret):", answer: "Si $X$ est discrète de loi $p(x_{i})$, l'espérance de $X$ est $\\mathbb{E}(X)=\\sum_{i \\ge 1} x_{i} p(x_{i})$ (lorsque la série converge absolument).", theme: "Probas : Variables aléatoires discrètes" },
    { question: "6. Linéarité de l'espérance:", answer: "Pour $a, b \\in \\mathbb{R}$ et pour des v.a. intégrables $X, Y,$ $\\mathbb{E}(aX+b)=a\\mathbb{E}(X)+b,$ $\\mathbb{E}(X+Y)=\\mathbb{E}(X)+\\mathbb{E}(Y).$", theme: "Probas : Variables aléatoires discrètes" },
    { question: "7. Théorème de transfert (cas discret) et son importance:", answer: "Pour toute fonction $g : \\mathbb{R} \\rightarrow \\mathbb{R}$ telle que la somme ait un sens, $\\mathbb{E}(g(X))=\\sum_{i \\ge 1} g(x_{i}) P(X=x_{i}).$ Importance : cela permet de calculer $\\mathbb{E}(g(X))$ sans déterminer explicitement la loi de $Y=g(X)$, ce qui évite parfois des calculs de lois difficiles.", theme: "Probas : Variables aléatoires discrètes" },
    { question: "8. Moments non centrés et moments centrés (cas discret):", answer: "Le moment non centré d'ordre $r \\in \\mathbb{N}^{*}$ est $m_{r}(X)=\\mathbb{E}(X^{r})=\\sum_{i \\ge 1} x_{i}^{r} P(X=x_{i}).$ Le moment centré d'ordre $r \\in \\mathbb{N}^{*}$ est $\\mu_{r}(X)=\\mathbb{E}[(X-\\mathbb{E}(X))^{r}].$", theme: "Probas : Variables aléatoires discrètes" },
    { question: "9. Définition de la variance et formule pratique :", answer: "La variance de $X$ est $Var(X)=\\mathbb{E}[(X-\\mathbb{E}(X))^{2}].$ On a aussi la formule $Var(X)=\\mathbb{E}(X^{2})-(\\mathbb{E}(X))^{2}.$", theme: "Probas : Variables aléatoires discrètes" },
    { question: "10. Ecart-type: définition et pourquoi on ne garde pas seulement la variance:", answer: "L'écart-type de $X$ est $\\sigma_{X}=\\sqrt{Var(X)}.$ Pourquoi l'écart-type ? Parce que $\\sigma_{X}$ est dans la même unité que $X$, alors que la variance est en unité \"carrée\".", theme: "Probas : Variables aléatoires discrètes" },
    { question: "11. Inégalité de Bienaymé-Tchebychev: énoncé et utilité :", answer: "Si $X$ admet une espérance $\\mu$ et une variance $\\sigma^{2}$ alors $\\forall \\epsilon > 0, P(|X-\\mu| \\ge \\epsilon) \\le \\frac{\\sigma^{2}}{\\epsilon^{2}}.$ Utilité : donner un encadrement de probabilités d'écart à la moyenne ; utile pour répondre à des questions du type \"quelle dispersion/quelle précision pour garantir une probabilité d'écart faible ?\".", theme: "Probas : Variables aléatoires discrètes" },
    { question: "1. Pourquoi introduire des couples de variables aléatoires?", answer: "Dans de nombreux phénomènes, une seule variable ne suffit pas : on observe plusieurs grandeurs simultanément (ex. deux mesures physiques couplées, intensité et tension, position et vitesse, etc.). Les couples permettent de modéliser des dépendances entre variables.", theme: "Probas : Couples de variables aléatoires discrètes" },
    { question: "2. Définition de la loi conjointe d'un couple discret:", answer: "Soient $X$ et $Y$ discrètes avec $X(\\Omega)=\\{x_{1}, ..., x_{l}\\}$ et $Y(\\Omega)=\\{y_{1}, ..., y_{k}\\}$. La loi du couple $(X, Y)$ est donnée par $p_{ij}=P(X=x_{i}, Y=y_{j})=P(\\{X=x_{i}\\} \\cap \\{Y=y_{j}\\}),$ avec $p_{ij} \\ge 0$ et $\\sum_{i=1}^{l} \\sum_{j=1}^{k} p_{ij}=1.$", theme: "Probas : Couples de variables aléatoires discrètes" },
    { question: "3. Définition des lois marginales (cas discret) et calcul sur le tableau:", answer: "Les lois marginales sont : $p_{i \\cdot}=P(X=x_{i})=\\sum_{j=1}^{k} p_{ij}$ et $p_{\\cdot j}=P(Y=y_{j})=\\sum_{i=1}^{l} p_{ij}.$ Dans une table conjointe, on obtient les marginales par sommes sur lignes/colonnes.", theme: "Probas : Couples de variables aléatoires discrètes" },
    { question: "4. Définition de l'indépendance de X et Y (discret):", answer: "$X$ et $Y$ sont indépendantes si et seulement si $\\forall i, j, P(X=x_{i}, Y=y_{j})=P(X=x_{i})P(Y=y_{j}),$ i.e. $p_{ij}=p_{i \\cdot} p_{\\cdot j}.$", theme: "Probas : Couples de variables aléatoires discrètes" },
    { question: "5. Espérance d'une fonction g(X,Y) (transfert en dimension 2, discret):", answer: "Si $g : \\mathbb{R}^{2} \\rightarrow \\mathbb{R}$ et si les sommes convergent, $\\mathbb{E}(g(X,Y))=\\sum_{i=1}^{l} \\sum_{j=1}^{k} g(x_{i}, y_{j}) p_{ij}.$", theme: "Probas : Couples de variables aléatoires discrètes" },
    { question: "6. Covariance définition, interprétation, lien avec indépendance:", answer: "La covariance de $X$ et $Y$ est $Cov(X,Y)=\\mathbb{E}[(X-\\mathbb{E}(X))(Y-\\mathbb{E}(Y))]=\\mathbb{E}(XY)-\\mathbb{E}(X)\\mathbb{E}(Y).$ Interprétation : mesure de liaison linéaire. Si $X$ et $Y$ sont indépendantes et intégrables, alors $\\mathbb{E}(XY)=\\mathbb{E}(X)\\mathbb{E}(Y)$ donc $Cov(X,Y)=0$ (mais la réciproque est fausse en général).", theme: "Probas : Couples de variables aléatoires discrètes" },
    { question: "7. Corrélation définition:", answer: "Si $\\sigma_{X} > 0$ et $\\sigma_{Y} > 0,$ le coefficient de corrélation est $\\rho_{X,Y}=\\frac{Cov(X,Y)}{\\sigma_{X} \\sigma_{Y}},$ et vérifie $-1 \\le \\rho_{X,Y} \\le 1.$", theme: "Probas : Couples de variables aléatoires discrètes" },

    // Der & Int
    {
        "question": "Définition 1.1.1. Donner la définition d'une distance sur un ensemble E et donner un exemple de métrique usuelle.",
        "answer": "Soit $E$ un ensemble non vide. Une distance sur $E$ est une application $d: E \\times E \\rightarrow \\mathbb{R}^{+}$ qui vérifie $\\forall(x,y,z) \\in E \\times E \\times E$ :\n- $d(x,y)=0 \\iff x=y$ (homogénéité)\n- $d(x,y)=d(y,x)$ (symétrie)\n- $d(x,z) \\le d(x,y)+d(y,z)$ (inégalité triangulaire).\nSi $d$ est une distance sur $E$, le couple $(E,d)$ est appelé espace métrique.\nExemples : Sur $\\mathbb{R}$, la métrique usuelle est $d(x,y):=|x-y|$. Sur $\\mathbb{C}$, la métrique usuelle est $d(z_{1},z_{2}):=|z_{2}-z_{1}|$.",
        "theme": "Dér & Int"
    },
    {
        "question": "Définition 1.1.2. [Boule ouverte, boule fermée] Donner la définition d'une boule ouverte ou d'une boule fermée sur un espace métrique. Caractériser une boule ouverte sur l'espace métrique (R.).",
        "answer": "Soit $(E,d)$ un espace métrique, $a \\in E$ et $r \\in \\mathbb{R}^{+}$. La boule ouverte de centre $a$ et de rayon $r$ est l'ensemble $B(a,r):=\\{x \\in E, \\text{ tel que } d(x,a)<r\\}$. Sur l'espace métrique $(\\mathbb{R}, |\\cdot|)$, la boule ouverte de centre $a$ et de rayon $r$ est l'intervalle $]a-r, a+r[$. La boule fermée de centre $a$ et de rayon $r$ est l'ensemble $B_{f}(a,r):=\\{x \\in E, \\text{ tel que } d(x,a) \\le r\\}$. Sur l'espace métrique $(\\mathbb{R}, |\\cdot|)$, la boule fermée de centre $a$ et de rayon $r$ est l'intervalle $[a-r, a+r]$.",
        "theme": "Dér & Int"
    },
    {
        "question": "Définition 1.1.3. [Ouvert] Donner la définition d'un ouvert sur un espace métrique. Donnez un exemple d'ensemble ouvert.",
        "answer": "Soit $(E,d)$ un espace métrique. On dit que $\\mathcal{A} \\in \\mathcal{P}(E)$ est un ouvert de $E$ si $\\mathcal{A}$ contient une boule ouverte. Autrement dit, si $\\forall a \\in \\mathcal{A}, \\exists r>0$ tel que $B(a,r) \\subset \\mathcal{A}$. Exemple : Dans l'espace vectoriel $\\mathbb{R}$, les ouverts sont tous les intervalles du type $]a, b[$ où $(a,b) \\in \\mathbb{R}^{2}$.",
        "theme": "Dér & Int"
    },
    {
        "question": "Définition 1.1.4. [Fermé] Donner la définition d'un fermé sur un espace métrique. Donnez un exemple d'ensemble fermé.",
        "answer": "Soit $(E,d)$ un espace métrique. On dit que $\\mathcal{A} \\in \\mathcal{P}(E)$ est un fermé si $\\mathcal{C}_{E}\\mathcal{A}$ est un ouvert de $E$.",
        "theme": "Dér & Int"
    },
    {
        "question": "Définition 1.1.5. [Voisinage] Donner la définition d'un voisinage d'un point a appartenant à un espace métrique (E.d).",
        "answer": "Soit $(E, d)$ un espace métrique et $a \\in E$. On dit que $\\mathcal{V} \\subset E$ est un voisinage de $a$ si, et seulement si, il existe un ouvert $O \\subset \\mathcal{V}$ contenant $a$. Autrement dit s'il existe une boule ouverte de centre $a$ et de rayon $r>0$ contenue dans $\\mathcal{V} : B(a,r) \\subset \\mathcal{V}$.",
        "theme": "Dér & Int"
    },
    {
        "question": "1.2 Continuité. Donner la définition d'une fonction continue en un point $a \\in I$ où I est un intervalle inclus dans R. Apporter ensuite une illustration graphique d'une fonction continue et d'une fonction discontinue.",
        "answer": "Définition 1.2.1. [Caractérisation de Weierstrass] : Soit $f$ une fonction définie sur un intervalle $I \\subset \\mathbb{R}$, non vide, non réduit à un point, et $a \\in I$. La fonction $f$ est dite continue en $a$ si $\\forall \\epsilon > 0, \\exists \\eta > 0, \\forall x \\in I, |x-a| \\le \\eta \\Rightarrow |f(x)-f(a)| \\le \\epsilon$. Cela veut dire qu'en fixant un seuil $\\epsilon > 0$, on peut trouver un intervalle autour de $a$ (voisinage de $a$) tel que $f(x)$ soit à une distance inférieure à $\\epsilon$ de $f(a)$.",
        "theme": "Dér & Int"
    },
    {
        "question": "Enoncer le théorème des valeurs intermédiaires.",
        "answer": "Théorème 1.2.2. [Théorème des valeurs intermédiaires] : Soit $f$ une application continue sur un intervalle $[a, b]$. Toute valeur comprise entre $f(a)$ et $f(b)$ est atteinte par la fonction $f$ sur $[a, b]$.",
        "theme": "Dér & Int"
    },
    {
        "question": "Définition 2.1.1. Donner la définition d'une fonction dominée par une autre au voisinage d'un point a. Donner un exemple.",
        "answer": "Soit $f$ et $\\varphi$ des fonctions définies sur un intervalle $I \\subset \\mathbb{R}$ et soit $a \\in I$. On dit que $f$ est dominée par la fonction $\\varphi$ au voisinage de $a$, s'il existe une fonction $u$ définie sur $I$, bornée au voisinage de $a$ et telle que $f=\\varphi u$ au voisinage de $a$. On note $f=\\mathcal{O}(\\varphi)$. Exemple 2.1.2 : Soit $f: \\mathbb{R} \\rightarrow \\mathbb{R}$ définie par $f(x)=x^{2}\\sin(1/x)$ et $\\varphi: \\mathbb{R} \\rightarrow \\mathbb{R}$ définie par $\\varphi(x)=x^{2}$. On a $f(x)=\\varphi(x)u(x)$ où $u(x)=\\sin(1/x)$. La fonction $u$ est bornée sur $\\mathbb{R}$, ainsi $f=\\mathcal{O}(\\varphi)$.",
        "theme": "Dér & Int : Relations de comparaison"
    },
    {
        "question": "Définition 2.1.3. Donner la définition d'une fonction négligeable par une autre au voisinage d'un point a. Donner un exemple.",
        "answer": "On dit que $f$ est négligeable devant $\\varphi$ au voisinage de $a$, s'il existe une fonction $\\epsilon$ définie sur $I$ tel que $f=\\varphi \\epsilon$ au voisinage de $a$ et $\\lim_{a} \\epsilon = 0$. Exemple 2.1.4 : Au voisinage de 0, la fonction $x \\mapsto x^{3}$ est négligeable devant la fonction $x \\mapsto x^{2}$. En effet, $\\lim_{x \\rightarrow 0} \\frac{x^{3}}{x^{2}} = 0$.",
        "theme": "Dér & Int : Relations de comparaison"
    },
    {
        "question": "Définition 2.1.5. Donner la définition de deux fonctions équivalentes au voisinage d'un point a.",
        "answer": "Étant donné deux fonctions $f$ et $g$ définies sur un intervalle $I$, on dit que $f$ est équivalente à $g$ au voisinage de $a$ s'il existe une fonction $h$ définie sur $I$ telle que $f=gh$ au voisinage de $a$ et $\\lim_{x \\rightarrow a} h(x)=1$. On note alors $f \\sim_{a} g$ ou $f \\sim g$. Exemple 2.1.6 : Soit $f$ définie par $f(x)=\\sin(x)$ et $g$ par $g(x)=x$. On a $f \\sim_{0} g$ car $\\forall x \\in \\mathbb{R}^{*}, f(x)=\\frac{\\sin(x)}{x} \\times g(x)$ et $\\lim_{x \\rightarrow 0} \\frac{\\sin(x)}{x} = 1$.",
        "theme": "Dér & Int : Relations de comparaison"
    },
    {
        "question": "Donner la définition d'une fonction dérivable en un point a. Donner une fonction qui n'est pas dérivable sur R.",
        "answer": "Définition 3.1.1. On dit que $f$ est dérivable en $a$ si la fonction $\\mathcal{T}$, appelée taux d'accroissement de $f$ en $a$, définie sur $I \\backslash \\{a\\}$ par $\\mathcal{T}(x)=\\frac{f(x)-f(a)}{x-a}$ possède une limite finie en $a$. Cette limite s'appelle le nombre dérivé de $f$ en $a$ et se note $f^{\\prime}(a)$. Exemple 3.1.2 : La fonction $f: x \\mapsto |x|$ n'est pas dérivable en 0 car $\\lim_{x \\rightarrow 0} \\frac{|x|-0}{x}$ n'est pas unique (vaut +1 à droite et -1 à gauche).",
        "theme": "Dér & Int : Dérivation"
    },
    {
        "question": "Donnez le théorème de dérivation des fonctions composées.",
        "answer": "Propriété 3.1.3. Soient $I$ et $J$ deux intervalles, $f$ une application de $I$ dans $J$ et $g$ une aplicação définie sur $J$. Si $f$ est dérivable en $a \\in I$ et $g$ dérivable en $b=f(a)$, alors $g \\circ f$ est dérivable en $a$ et $(g \\circ f)^{\\prime}(a) = g^{\\prime}(f(a))f^{\\prime}(a)$.",
        "theme": "Dér & Int : Dérivation"
    },
    {
        "question": "Donnez le théorème de dérivation d'une application réciproque.",
        "answer": "Propriété 3.1.4. Soit $f$ une application continue et strictement monotone de l'intervalle $I$ sur l'intervalle $J=f(I)$, dérivable en $a \\in I$. La fonction $f^{-1}$ est dérivable en $b=f(a)$ si, et seulement si, $f^{\\prime}(a) \\neq 0$ et l'on a alors : $(f^{-1})^{\\prime}(b) = \\frac{1}{f^{\\prime}(f^{-1}(b))}$.",
        "theme": "Dér & Int : Dérivation"
    },
    {
        "question": "Énoncer le théorème de Rolle. Donnez une interprétation de ce théorème (Bonus).",
        "answer": "Théorème 3.1.5. Soit $(a,b) \\in \\mathbb{R}^{2}$ tel que $a<b$. Soit $f$ une fonction continue sur $[a, b]$ et dérivable sur $]a, b[$ et vérifiant $f(a)=f(b)$. Alors $\\exists c \\in ]a, b[$ tel que $f^{\\prime}(c)=0$. Interprétation : Le graphe possède au moins une tangente horizontale. En cinématique, si un mobile est à la même position à deux instants, il existe un instant intermédiaire où sa vitesse est nulle.",
        "theme": "Dér & Int : Dérivation"
    },
    {
        "question": "Énoncer l'égalité des accroissements finis et fournir une interprétation physique (Bonus).",
        "answer": "Théorème 3.1.6. Étant donnés des réels $a$ et $b$ tels que $a<b$ ainsi qu'une fonction $f$ continue sur $[a, b]$, dérivable sur $]a, b[$, il existe un réel $c$ appartenant à $]a, b[$ tel que $f(b)-f(a)=(b-a)f^{\\prime}(c)$. Interprétation géométrique : Il existe un point où la tangente est parallèle à la droite passant par les points d'abscisses $a$ et $b$. Interprétation physique : Si une voiture fait un parcours à $90 \\text{ km/h}$ de moyenne, il existe un instant où sa vitesse instantanée est exactement $90 \\text{ km/h}$.",
        "theme": "Dér & Int : Dérivation"
    },
    {
        "question": "Énoncer l'inégalité des accroissements finis.",
        "answer": "Théorème 3.1.7. Soit $(a,b) \\in \\mathbb{R}^{2}$ tels que $a<b$ ainsi qu'une fonction $f \\in \\mathcal{C}^{0}([a,b])$ et dérivable sur $]a, b[$. S'il existe des réels $m$ et $M$ vérifiant $\\forall x \\in ]a, b[, m \\le f^{\\prime}(x) \\le M$, alors on a $m(b-a) \\le f(b)-f(a) \\le M(b-a)$.",
        "theme": "Dér & Int : Dérivation"
    },
    {
        "question": "Énoncer le théorème de Taylor avec reste intégral.",
        "answer": "Théorème 4.0.1. Si $f$ est une fonction de classe $\\mathcal{C}^{n+1}$ sur $I$ et soient $a$ et $b$ des points de $I$, on a : $f(b)=\\sum_{k=0}^{n} \\frac{(b-a)^{k}}{k!}f^{(k)}(a) + \\int_{a}^{b} \\frac{(b-t)^{n}}{n!}f^{(n+1)}(t) dt$.",
        "theme": "Dér & Int : Développements limités"
    },
    {
        "question": "Énoncer l'inégalité de Taylor-Lagrange.",
        "answer": "Théorème 4.0.2. Soit $f$ une fonction de classe $\\mathcal{C}^{n+1}$ sur $I$. Si $M$ majore $|f^{(n+1)}|$ sur le segment $[a, b]$, on a : $|f(b)-\\sum_{k=0}^{n} \\frac{(b-a)^{k}}{k!}f^{(k)}(a)| \\le M \\frac{|b-a|^{n+1}}{(n+1)!}$.",
        "theme": "Dér & Int : Développements limités"
    },
    {
        "question": "Énoncer la formule de Taylor Young.",
        "answer": "Théorème 4.0.3. Si $f$ est une fonction de classe $\\mathcal{C}^{n}$ sur $I$, il existe une fonction $\\epsilon$ définie sur $I$ telle que : $\\forall x \\in I \\cap \\mathcal{V}_{a}, f(x)=\\sum_{k=0}^{n} \\frac{(x-a)^{k}}{k!}f^{(k)}(a)+(x-a)^{n}\\epsilon(x)$ avec $\\lim_{x \\rightarrow a} \\epsilon(x)=0$.",
        "theme": "Dér & Int : Développements limités"
    },
    {
        "question": "Donner la définition du développement limité d'une fonction à l'ordre n au voisinage de 0.",
        "answer": "Définition 4.0.4. Une fonction $f$ admet un développement limité d'ordre $n$ au voisinage de 0, s'il existe des réels $a_{0}, a_{1}, \\dots, a_{n}$ et une fonction $\\epsilon$ définie sur $\\mathcal{D}_{f}$ tels que : $\\forall x \\in \\mathcal{D}_{f}, f(x)=\\sum_{k=0}^{n} a_{k}x^{k}+x^{n}\\epsilon(x)$ avec $\\lim_{x \\rightarrow 0} \\epsilon(x)=0$.",
        "theme": "Dér & Int : Développements limités"
    },
    {
        "question": "Donner le développement limité au voisinage de 0 à l'ordre n des fonctions élémentaires suivantes. En choisir 2.",
        "answer": "- Exponentielle : $e^{x}=1+\\frac{x}{1!}+\\frac{x^{2}}{2!}+\\dots+\\frac{x^{n}}{n!}+o(x^{n})$\n- Cosinus : $\\cos(x)=1-\\frac{x^{2}}{2!}+\\frac{x^{4}}{4!}+\\dots+(-1)^{n}\\frac{x^{2n}}{(2n)!}+o(x^{2n})$\n- Sinus : $\\sin(x)=x-\\frac{x^{3}}{3!}+\\frac{x^{5}}{5!}+\\dots+(-1)^{n}\\frac{x^{2n+1}}{(2n+1)!}+o(x^{2n+1})$\n- Logarithme : $\\ln(1+x)=x-\\frac{x^{2}}{2}+\\frac{x^{3}}{3}+\\dots+(-1)^{n-1}\\frac{x^{n}}{n}+o(x^{n})$\n- Puissance : $(1+x)^{\\alpha}=1+\\alpha x+\\frac{\\alpha(\\alpha-1)}{2!}x^{2}+\\dots+\\frac{\\alpha(\\alpha-1)\\dots(\\alpha-n+1)}{n!}x^{n}+o(x^{n})$\n- Inverse : $\\frac{1}{1-x}=\\sum_{k=0}^{n} x^{k}+o(x^{n})$.",
        "theme": "Dér & Int : Développements limités"
    },
    {
        "question": "Définition 4.1.1. Donner la définition du développement limité à droite et à gauche à l'ordre n au voisinage d'un point xo.",
        "answer": "On dit qu'une fonction $f$ admet un développement limité à droite (resp. à gauche) à l'ordre $n$ au voisinage de $x_{0}$ si la restriction de $f$ à $\\mathcal{D}_{f} \\cap [x_{0}, +\\infty[$ (resp. à $\\mathcal{D}_{f} \\cap ]-\\infty, x_{0}]$) admet un développement limité à l'ordre $n$ en $x_{0}$.",
        "theme": "Dér & Int : Développements limités"
    },
    {
        "question": "Donner les règles permettant de calculer le développement limité d'une somme et d'un produit.",
        "answer": "Propriété 4.2.1. Soient $f$ et $g$ deux applications admettant en $0$ des DL à l'ordre $n$ : $f(x)=P(x)+o(x^{n})$ et $g(x)=Q(x)+o(x^{n})$. Alors $f+g$ admet le DL : $(f+g)(x)=P(x)+Q(x)+o(x^{n})$. Et $fg$ admet le DL : $(fg)(x)=R(x)+o(x^{n})$ où $R$ est le polynôme obtenu en ne gardant, dans le produit $PQ$, que les termes de degré inférieur ou égal à $n$.",
        "theme": "Dér & Int : Développements limités"
    },
    {
        "question": "Donner la propriété donnant le développement limité d'une primitive d'une fonction possédant un développement limité.",
        "answer": "Propriété 4.2.2. Soit $I$ un intervalle contenant 0 et $f: I \\rightarrow \\mathbb{R}$ une fonction continue possédant en $0$ un DL à l'ordre $n$ qui vaut $\\sum_{k=0}^{n} a_{k}x^{k}$. Si $F$ est une primitive de $f$, alors elle admet un DL à l'ordre $n+1$ en 0 qui est : $F(0)+\\sum_{k=0}^{n} \\frac{a_{k}}{k+1}x^{k+1}$.",
        "theme": "Dér & Int : Développements limités"
    },
    {
        "question": "Expliquez comment étudier la position d'une tangente par rapport à la courbe représentative d'une fonction f en un point $x_{0}$.",
        "answer": "L'existence d'une tangente non verticale en $x_{0}$ est équivalente à l'existence d'un DL à l'ordre 1 en $x_{0}$. L'étude du signe de $f(x)-f(x_{0})-(x-x_{0})f^{\\prime}(x_{0})$ précise la position relative. Plus généralement, avec un DL à l'ordre $p \\ge 2$ : $f(x)=a_{0}+a_{1}(x-x_{0})+\\dots+a_{k}(x-x_{0})^{k}+o((x-x_{0})^{k})$ où $a_{k}$ est le premier coefficient non nul pour $k \\ge 2$.\n- Si $k$ est pair et $a_{k}>0$ : courbe au-dessus de la tangente.\n- Si $k$ est pair et $a_{k}<0$ : courbe en dessous.\n- Si $k$ est impair et $a_{k}>0$ : traverse la tangente en passant au-dessus.\n- Si $k$ est impair et $a_{k}<0$ : traverse la tangente en passant en dessous.",
        "theme": "Dér & Int : Développements limités"
    }
]

// --- DATA MANAGEMENT ---

function generateId() { return Math.random().toString(36).substr(2, 9); }

function loadData() {
    const storedDecks = localStorage.getItem(STORAGE_KEY_DECKS);
    const storedCards = localStorage.getItem(STORAGE_KEY_CARDS);
    const storedPrefs = localStorage.getItem(PREFS_KEY);
    const storedColors = localStorage.getItem(THEME_COLORS_KEY);

    // Seed Check
    const isSeeded = localStorage.getItem('v3_seeded_colles2');

    if (storedPrefs) {
        const prefs = JSON.parse(storedPrefs);
        currentSortMode = prefs.sortMode || 'date';
        isCustomSortMode = currentSortMode === 'custom';
    }

    if (storedColors) {
        themeColors = JSON.parse(storedColors);
    }

    if (storedDecks && storedCards) {
        decks = JSON.parse(storedDecks);
        cards = JSON.parse(storedCards);
    } else {
        decks = [];
        cards = [];
    }

    // Default Deck creation
    let publicDeck = decks.find(d => d.id === DEFAULT_DECK_ID);
    if (!publicDeck) {
        publicDeck = {
            id: DEFAULT_DECK_ID,
            title: "Colles n°2",
            gradient: GRADIENTS[1].class,
            createdAt: Date.now(),
            isPublic: true,
            order: -1
        };
        decks.push(publicDeck);
        saveData();
    }

    // Default Cards Seeding (Run once if not seeded OR if public deck has 0 cards)
    const hasPublicCards = cards.some(c => c.deckId === DEFAULT_DECK_ID);

    if (!isSeeded || !hasPublicCards) {
        let count = 0;
        DEFAULT_CARDS.forEach(item => {
            // Avoid duplicates if already exists roughly (optional, but good)
            const exists = cards.find(c => c.question === item.question && c.deckId === DEFAULT_DECK_ID);
            if (!exists) {
                cards.push({
                    id: generateId(),
                    deckId: DEFAULT_DECK_ID,
                    question: item.question,
                    answer: item.answer,
                    theme: item.theme,
                    isLearned: false,
                    createdAt: Date.now(),
                    order: cards.length
                });
                count++;
            }
        });
        if (count > 0) {
            console.log(`Seeded/Restored ${count} default cards.`);
            saveData();
        }
        localStorage.setItem('v3_seeded_colles2', 'true');
    }

    cards.forEach((c, i) => { if (typeof c.order === 'undefined') c.order = i; });
}

function saveData() {
    localStorage.setItem(STORAGE_KEY_DECKS, JSON.stringify(decks));
    localStorage.setItem(STORAGE_KEY_CARDS, JSON.stringify(cards));
    localStorage.setItem(PREFS_KEY, JSON.stringify({ sortMode: currentSortMode }));
    localStorage.setItem(THEME_COLORS_KEY, JSON.stringify(themeColors));
}

// --- SORTING & UTILS ---
const SORT_MODES = ['date', 'color', 'alpha', 'custom'];

function cycleSortMode() {
    const idx = SORT_MODES.indexOf(currentSortMode);
    currentSortMode = SORT_MODES[(idx + 1) % SORT_MODES.length];
    isCustomSortMode = currentSortMode === 'custom';
    saveData();
    renderView();
}

function getSortedDecks(deckList) {
    let sorted = [...deckList];
    if (currentSortMode === 'date') sorted.sort((a, b) => b.createdAt - a.createdAt);
    else if (currentSortMode === 'color') sorted.sort((a, b) => a.gradient.localeCompare(b.gradient));
    else if (currentSortMode === 'alpha') sorted.sort((a, b) => a.title.localeCompare(b.title));
    else if (currentSortMode === 'custom') sorted.sort((a, b) => (a.order || 0) - (b.order || 0));
    return sorted;
}

function getThemeColor(deckId, themeName) {
    if (themeName === 'Général' || themeName === 'Divers') return 'bg-red-500';
    return themeColors[`${deckId}_${themeName}`] || 'bg-indigo-500';
}


// --- TOASTS ---
function showToast(message, type = 'info', action = null) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'toast';
    let icon = 'info'; let color = 'text-blue-400';
    if (type === 'success') { icon = 'check-circle'; color = 'text-emerald-400'; }
    if (type === 'error') { icon = 'alert-triangle'; color = 'text-red-400'; }
    if (type === 'confirm') { icon = 'help-circle'; color = 'text-amber-400'; }

    let content = `<i data-lucide="${icon}" class="${color} w-5 h-5"></i><span>${message}</span>`;
    if (type === 'confirm' && action) {
        content += `<div class="flex gap-2 ml-4">
            <button id="toast-confirm" class="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-sm font-bold text-white transition">Oui</button>
            <button id="toast-cancel" class="px-3 py-1 hover:bg-white/10 rounded text-sm text-slate-300 transition">Non</button>
        </div>`;
    }
    toast.innerHTML = content;
    container.appendChild(toast);
    lucide.createIcons();

    if (type === 'confirm') {
        const cleanup = () => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); };
        toast.querySelector('#toast-confirm').onclick = () => { action(); cleanup(); };
        toast.querySelector('#toast-cancel').onclick = cleanup;
    } else {
        setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
    }
}


// --- RENDERING ---

function initApp() {
    loadData();
    renderView();
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.context-menu-trigger') && !e.target.closest('.context-menu')) closeAllContextMenus();
    });
}

function renderView() {
    const container = document.getElementById('main-content');
    const headerTitle = document.getElementById('header-title');
    const headerSubtitle = document.getElementById('header-subtitle');
    const navAction = document.getElementById('nav-action');
    const fabContainer = document.getElementById('fab-container');

    container.innerHTML = '';

    if (currentView === 'home') {
        headerTitle.innerText = "Mes Blocs de Fiches";
        headerSubtitle.innerText = `${decks.length} blocs disponibles`;

        // Restore Home Icon
        navAction.className = "flex p-2.5 bg-slate-800 text-indigo-400 rounded-xl shadow-lg border border-slate-700";
        navAction.innerHTML = `<i data-lucide="library" class="w-6 h-6"></i>`;

        // Sort Control
        const controls = document.createElement('div');
        controls.className = "flex justify-end mb-6 animate-fade-in";
        controls.innerHTML = `
            <button onclick="cycleSortMode()" class="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 border border-slate-700 transition-all ${isCustomSortMode ? 'ring-2 ring-indigo-500 text-white' : ''}">
                <i data-lucide="${getSortIcon(currentSortMode)}" class="w-4 h-4"></i>
                <span class="text-sm font-medium">Tri : ${getSortLabel(currentSortMode)}</span>
            </button>
        `;
        container.appendChild(controls);

        const publicDecks = getSortedDecks(decks.filter(d => d.isPublic));
        const personalDecks = getSortedDecks(decks.filter(d => !d.isPublic));

        // Public Section
        if (publicDecks.length > 0) {
            container.appendChild(createSectionTitle("Blocs Publics"));
            const grid = createDeckGrid(publicDecks);
            container.appendChild(grid);
            container.appendChild(document.createElement('hr')).className = "border-slate-800 my-8";
        }

        // Personal Section
        container.appendChild(createSectionTitle("Mes Blocs"));
        if (personalDecks.length === 0) {
            container.innerHTML += `<div class="flex flex-col items-center justify-center py-12 text-slate-500 opacity-60"><p>Vous n'avez pas encore de bloc personnel.</p></div>`;
        } else {
            container.appendChild(createDeckGrid(personalDecks));
        }

        fabContainer.innerHTML = `
            <button onclick="openModal('deck')" class="group relative flex items-center justify-center gap-3 pl-6 pr-7 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-2xl shadow-indigo-900/60 transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0 active:scale-95 border border-white/10 hover:border-white/30 whitespace-nowrap">
                <i data-lucide="plus" class="w-6 h-6"></i>
                <span class="font-bold">Nouveau Bloc</span>
            </button>
        `;

    } else if (currentView === 'deck') {
        const deck = decks.find(d => d.id === activeDeckId);
        if (!deck) return openHome();

        headerTitle.innerText = deck.title;
        headerSubtitle.innerText = "Mode Révision";
        navAction.innerHTML = `<i data-lucide="arrow-left" class="text-white w-6 h-6"></i>`;
        navAction.className = "flex p-2.5 bg-slate-800 hover:bg-slate-700 cursor-pointer rounded-xl shadow-lg border border-slate-700 transition-colors";
        navAction.onclick = openHome;

        const deckCards = cards.filter(c => c.deckId === activeDeckId);
        const learnedCount = deckCards.filter(c => c.isLearned).length;
        const totalCount = deckCards.length;
        const percentage = totalCount > 0 ? Math.round((learnedCount / totalCount) * 100) : 0;

        // Stats + Import/Export Buttons
        container.innerHTML += `
            <div class="mb-8 flex flex-col md:flex-row gap-6 animate-fade-in">
                <div class="flex-grow flex items-center justify-between p-6 bg-slate-900/50 border border-slate-800 rounded-2xl">
                    <div><h3 class="text-lg font-bold text-white">Progression Globale</h3><p class="text-slate-400 text-sm">${learnedCount} sur ${totalCount} cartes maîtrisées</p></div>
                    <div class="relative w-16 h-16 flex items-center justify-center">
                        <svg class="w-full h-full rotate-[-90deg]" viewBox="0 0 36 36">
                            <path class="text-slate-800" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke-width="3" />
                            <path class="text-emerald-500 transition-all duration-1000 ease-out" stroke-dasharray="${percentage}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" stroke-width="3" />
                        </svg> <span class="absolute text-xs font-bold text-white">${percentage}%</span>
                    </div>
                </div>
                <div class="flex flex-col gap-2 min-w-[140px]">
                     <button onclick="openImportModal()" class="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition text-sm font-bold">
                        <i data-lucide="download" class="w-4 h-4"></i> Importer
                     </button>
                     <button onclick="exportDeck()" class="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition text-sm font-bold">
                        <i data-lucide="share" class="w-4 h-4"></i> Exporter
                     </button>
                </div>
            </div>
        `;

        if (deckCards.length === 0) {
            container.innerHTML += `<div class="flex flex-col items-center justify-center py-24 text-slate-500 animate-fade-in"><i data-lucide="copy" class="w-16 h-16 mb-4 text-slate-700 opacity-50"></i><p class="text-xl font-medium">Ce bloc est vide</p><p class="mt-2 text-sm">Ajoutez votre première carte !</p></div>`;
        } else {
            const themes = [...new Set(deckCards.map(c => c.theme))].sort();
            const listContainer = document.createElement('div');
            listContainer.className = "space-y-12 animate-fade-in";

            themes.forEach(theme => {
                const themeColor = getThemeColor(activeDeckId, theme);

                // SORT LOGIC: Unlearned cards first (by order), then Learned cards (by order)
                const themeCards = deckCards.filter(c => c.theme === theme).sort((a, b) => {
                    // 1. Learned status (false < true)
                    if (!!a.isLearned !== !!b.isLearned) return a.isLearned ? 1 : -1;
                    // 2. Custom Order
                    return (a.order || 0) - (b.order || 0);
                });

                const themeSection = document.createElement('div');
                themeSection.innerHTML = `
                    <div class="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 border-b border-slate-800 pb-4 sticky top-[72px] bg-[#0f172a]/95 backdrop-blur z-30 py-4 -mx-2 px-2">
                        <div class="flex items-center gap-3">
                            <span class="w-2 h-8 rounded-full ${themeColor} shadow-[0_0_10px_rgba(0,0,0,0.5)]"></span>
                            <h2 class="text-xl font-bold text-white tracking-tight">${theme}</h2>
                            <span class="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-xs font-medium border border-slate-700">${themeCards.length}</span>
                        </div>
                        <div class="flex items-center gap-2 w-full md:w-auto">
                            <button onclick="startLearningMode('${theme}')" class="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg shadow-lg shadow-indigo-500/20 transition-all">
                                <i data-lucide="play-circle" class="w-4 h-4"></i> <span>Apprendre</span>
                            </button>
                            <button onclick="shuffleTheme('${theme}')" class="p-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition" title="Mélanger"><i data-lucide="shuffle" class="w-4 h-4"></i></button>
                            <button onclick="emptyThemeTrash('${theme}')" class="p-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-red-900/30 hover:text-red-400 transition" title="Vider"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                            <div class="relative flex-grow md:flex-grow-0 md:w-48 ml-2">
                                <input type="text" placeholder="Rechercher..." oninput="filterCards(this.value, '${theme}')" class="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg pl-8 p-2">
                                <div class="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-slate-500"><i data-lucide="search" class="w-3.5 h-3.5"></i></div>
                            </div>
                        </div>
                    </div>
                `;

                const grid = document.createElement('div');
                grid.id = `grid-${theme}`;
                grid.className = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6";
                grid.dataset.theme = theme; // Identifier for Drop

                themeCards.forEach(card => {
                    grid.appendChild(createCardDOM(card));
                });

                themeSection.appendChild(grid);
                listContainer.appendChild(themeSection);
            });
            container.appendChild(listContainer);
        }

        fabContainer.innerHTML = `
            <button onclick="openModal('card')" class="group relative flex items-center justify-center gap-3 pl-6 pr-7 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-2xl shadow-emerald-900/60 transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0 active:scale-95 border border-white/10 hover:border-white/30 whitespace-nowrap">
                <div class="absolute inset-0 rounded-full bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
                <i data-lucide="plus" class="w-6 h-6"></i>
                <span class="font-bold">Ajouter une carte</span>
            </button>
        `;
    }
    lucide.createIcons();
    if (typeof renderMathInElement !== 'undefined') initKatex();
}

// --- DOM CREATION ---

function getSortIcon(mode) {
    if (mode === 'date') return 'calendar';
    if (mode === 'color') return 'palette';
    if (mode === 'alpha') return 'a-large-small';
    return 'grip-horizontal';
}
function getSortLabel(mode) {
    if (mode === 'date') return 'Date';
    if (mode === 'color') return 'Couleur';
    if (mode === 'alpha') return 'A-Z';
    return 'Manuel';
}

function createSectionTitle(text) {
    const div = document.createElement('div');
    div.className = "mb-4";
    div.innerHTML = `<h2 class="text-lg font-bold text-slate-300 uppercase tracking-wider">${text}</h2>`;
    return div;
}

function createDeckGrid(deckList) {
    const grid = document.createElement('div');
    grid.className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in";

    deckList.forEach(deck => {
        const deckCard = document.createElement('div');
        deckCard.className = `group relative h-48 rounded-2xl p-6 flex flex-col justify-between cursor-pointer overflow-hidden transition-all duration-300 hover:scale-[1.02] shadow-xl hover:shadow-2xl border border-white/10 bg-gradient-to-br ${deck.gradient} ${isCustomSortMode ? 'hover:border-indigo-400/50' : ''}`;
        deckCard.dataset.id = deck.id;

        // Drag Logic
        if (isCustomSortMode) {
            deckCard.ondragover = (e) => handleDragOver(e, deck.id, 'deck');
            deckCard.ondrop = (e) => handleDrop(e, deck.id, 'deck');
        }

        deckCard.onclick = (e) => {
            if (!e.target.closest('.context-menu-trigger') && !e.target.closest('.context-menu') && !e.target.closest('.grab-handle')) {
                openDeck(deck.id);
            }
        };

        const cardCount = cards.filter(c => c.deckId === deck.id).length;
        const masteredCount = cards.filter(c => c.deckId === deck.id && c.isLearned).length;
        const progress = cardCount > 0 ? Math.round((masteredCount / cardCount) * 100) : 0;

        deckCard.innerHTML = `
            <div class="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
            
            <div class="absolute top-4 right-4 z-20 flex gap-2">
                 ${isCustomSortMode ? `
                    <div class="grab-handle p-1.5 rounded-full hover:bg-black/20 text-white/70 hover:text-white cursor-grab active:cursor-grabbing" draggable="true" ondragstart="handleDragStart(event, '${deck.id}', 'deck')">
                        <i data-lucide="grip-horizontal" class="w-5 h-5"></i>
                    </div>
                 ` : ''}
                <button class="context-menu-trigger p-1.5 rounded-full hover:bg-black/20 text-white/70 hover:text-white transition-colors" onclick="toggleDeckMenu(event, '${deck.id}')">
                    <i data-lucide="more-vertical" class="w-5 h-5"></i>
                </button>
                <div id="menu-deck-${deck.id}" class="context-menu hidden absolute right-0 top-8 w-40 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden text-sm">
                    <button onclick="editDeck('${deck.id}')" class="w-full text-left px-4 py-2.5 text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"><i data-lucide="pencil" class="w-4 h-4"></i> Modifier</button>
                    <button onclick="duplicateDeck('${deck.id}')" class="w-full text-left px-4 py-2.5 text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"><i data-lucide="copy" class="w-4 h-4"></i> Dupliquer</button>
                    <div class="h-px bg-slate-800"></div>
                    <button onclick="deleteDeck('${deck.id}')" class="w-full text-left px-4 py-2.5 text-red-400 hover:bg-red-900/30 flex items-center gap-2"><i data-lucide="trash" class="w-4 h-4"></i> Supprimer</button>
                </div>
            </div>

            <div class="relative z-10 pointer-events-none">
                <h3 class="text-2xl font-bold text-white mb-1 shadow-black/50 drop-shadow-md">${deck.title}</h3>
                <p class="text-white/80 text-sm font-medium">${cardCount} cartes</p>
                ${isCustomSortMode ? '<div class="mt-1 flex items-center gap-1 text-white/50 text-xs text-indigo-200">Mode tri activé</div>' : ''}
            </div>
            
            <div class="relative z-10 w-full pointer-events-none">
                 <div class="flex justify-between text-xs text-white/90 mb-1 font-semibold"><span>Progression</span><span>${progress}%</span></div>
                <div class="w-full bg-black/30 rounded-full h-2 overflow-hidden"><div class="bg-white/90 h-full rounded-full transition-all duration-500" style="width: ${progress}%"></div></div>
            </div>
        `;
        grid.appendChild(deckCard);
    });
    return grid;
}

function createCardDOM(card) {
    const cardWrapper = document.createElement('div');
    cardWrapper.className = "group h-80 w-full perspective-1000 cursor-pointer card-container select-none";
    cardWrapper.dataset.id = card.id;

    // Card DnD logic
    cardWrapper.draggable = true;
    cardWrapper.ondragstart = (e) => handleDragStart(e, card.id, 'card');
    cardWrapper.ondragover = (e) => handleDragOver(e, card.id, 'card');
    cardWrapper.ondrop = (e) => handleDrop(e, card.id, 'card');

    cardWrapper.onclick = function (e) {
        if (!e.target.closest('.context-menu') && !e.target.closest('button') && !e.target.closest('.grab-handle')) this.classList.toggle('card-flipped');
    };

    const isLearned = card.isLearned;
    const styles = isLearned ? {
        border: 'border-emerald-500/50 bg-gradient-to-br from-slate-800 to-emerald-900/20',
        badge: 'bg-emerald-500/20 text-emerald-400',
        icon: 'undo-2',
        btnClass: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/50'
    } : {
        border: 'border-slate-700 bg-slate-800 hover:border-slate-600',
        badge: 'bg-slate-700/50 text-slate-400',
        icon: 'check',
        btnClass: 'bg-slate-700 hover:bg-indigo-500 text-slate-300 hover:text-white'
    };

    const inner = document.createElement('div');
    inner.className = "card-inner relative h-full w-full transition-all duration-500 transform-style-3d";
    inner.innerHTML = `
        <div class="card-front absolute inset-0 rounded-2xl shadow-xl flex flex-col overflow-hidden border-2 transition-all duration-300 ${styles.border}">
             <!-- Header / Controls -->
             <div class="relative z-20 flex justify-between items-start p-4 pb-2 shrink-0">
                 <span class="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md ${styles.badge}">Question</span>
                 <div class="flex gap-2">
                     <div class="p-1.5 rounded-full hover:bg-slate-700/50 text-slate-500 hover:text-white cursor-grab active:cursor-grabbing grab-handle" draggable="true" ondragstart="handleDragStart(event, '${card.id}', 'card')"><i data-lucide="grip-horizontal" class="w-4 h-4"></i></div>
                     <button class="context-menu-trigger p-1.5 rounded-full hover:bg-slate-700/50 text-slate-400 hover:text-indigo-400 transition-colors" onclick="toggleCardMenu(event, '${card.id}')"><i data-lucide="more-vertical" class="w-4 h-4"></i></button>
                     <div id="menu-card-${card.id}" class="context-menu hidden absolute right-0 top-8 w-32 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden text-xs">
                        <button onclick="editCard(event, '${card.id}')" class="w-full text-left px-3 py-2 text-slate-300 hover:bg-slate-800 flex items-center gap-2"><i data-lucide="pencil" class="w-3 h-3"></i> Modifier</button>
                        <button onclick="duplicateCard(event, '${card.id}')" class="w-full text-left px-3 py-2 text-slate-300 hover:bg-slate-800 flex items-center gap-2"><i data-lucide="copy" class="w-3 h-3"></i> Dupliquer</button>
                        <div class="h-px bg-slate-800"></div>
                        <button onclick="deleteCard(event, '${card.id}')" class="w-full text-left px-3 py-2 text-red-400 hover:bg-red-900/30 flex items-center gap-2"><i data-lucide="trash" class="w-3 h-3"></i> Supprimer</button>
                    </div>
                 </div>
             </div>

             <!-- Content -->
             <div class="relative z-0 flex-grow flex flex-col min-h-0 w-full">
                <div class="card-text-container" style="font-size: 0.85rem;">
                    <div class="card-text-inner latex-content font-medium text-slate-100">${card.question}</div>
                </div>
             </div>

             <!-- Footer -->
             <div class="p-4 pt-2 text-center text-slate-500 text-xs flex items-center justify-start gap-2 shrink-0">
                <i data-lucide="rotate-cw" class="w-3 h-3"></i> <span>Retourner</span>
             </div>

             <!-- Quick Action Button -->
            <button onclick="toggleCardLearned(event, '${card.id}')" class="absolute bottom-4 right-4 p-3 rounded-full shadow-lg z-30 transition-all ${styles.btnClass}">
                <i data-lucide="${styles.icon}" class="w-5 h-5"></i>
            </button>
        </div>

        <div class="card-back absolute inset-0 rounded-2xl shadow-xl flex flex-col overflow-hidden border-2 border-indigo-500/30 bg-gradient-to-br from-slate-800 to-indigo-900/20">
             <div class="p-4 pb-2 flex justify-end shrink-0">
                <span class="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-indigo-500/20 text-indigo-400">Réponse</span>
             </div>

             <div class="relative z-0 flex-grow flex flex-col min-h-0 w-full">
                <div class="card-text-container" style="font-size: 0.85rem;">
                    <div class="card-text-inner latex-content font-medium text-white">${card.answer}</div>
                </div>
             </div>

             <div class="p-4 pt-2 text-center text-slate-400 text-xs flex items-center gap-2 shrink-0">
                <i data-lucide="rotate-ccw" class="w-3 h-3"></i> Revérifier
             </div>
             <!-- Quick Action Button Back -->
             <button onclick="toggleCardLearned(event, '${card.id}')" class="absolute bottom-4 right-4 p-3 rounded-full shadow-lg z-30 transition-all ${styles.btnClass}">
                <i data-lucide="${styles.icon}" class="w-5 h-5"></i>
            </button>
        </div>
    `;

    cardWrapper.appendChild(inner);

    // Render Math
    setTimeout(() => {
        if (typeof renderMathInElement !== 'undefined') initKatex(cardWrapper);
    }, 0);

    return cardWrapper;
}

// --- DRAG AND DROP (REAL-TIME VISUAL) ---
function handleDragStart(e, id, type) {
    e.stopPropagation(); // Prevent propagation if handle inside card
    draggedItem = { id, type };
    e.target.closest(type === 'deck' ? '.group' : '.card-container').classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text', id);
}

function handleDragOver(e, targetId, type) {
    e.preventDefault();
    if (!draggedItem || draggedItem.type !== type || draggedItem.id === targetId) return;

    // REAL-TIME SWAP LOGIC
    // Simple array swap and re-render

    const array = type === 'deck' ? decks : cards;
    const fromIdx = array.findIndex(x => x.id === draggedItem.id);
    const toIdx = array.findIndex(x => x.id === targetId);

    if (fromIdx !== -1 && toIdx !== -1) {
        // Swap locally
        const item = array[fromIdx];
        array.splice(fromIdx, 1);
        array.splice(toIdx, 0, item);

        // Re-number orders
        array.forEach((d, i) => d.order = i);

        renderView();

        // Restore Drag style
        setTimeout(() => {
            const newEl = document.querySelector(`[data-id="${draggedItem.id}"]`);
            if (newEl) {
                if (type === 'deck') newEl.classList.add('dragging');
                else newEl.firstElementChild?.classList.add('dragging'); // Card container
            }
        }, 0);
    }
}

function handleDrop(e, targetId, type) {
    e.preventDefault();
    e.stopPropagation();
    document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
    draggedItem = null;
    saveData(); // Commit
}

// --- LEARNING MODE (Refined) ---
function startLearningMode(theme) {
    const grid = document.getElementById(`grid-${theme}`);
    if (!grid) return;
    const visibleIds = Array.from(grid.children).map(c => c.dataset.id);
    let sessionCards = visibleIds.map(id => cards.find(c => c.id === id)).filter(c => c);

    let unlearned = sessionCards.filter(c => !c.isLearned);
    if (unlearned.length === 0) {
        if (!confirm("Tout est maîtrisé. Tout réviser ?")) return;
    } else {
        sessionCards = unlearned;
    }

    const overlay = document.createElement('div');
    overlay.id = 'learning-overlay';
    overlay.className = "fixed inset-0 z-[60] bg-slate-950 flex flex-col items-center justify-center p-4 animate-fade-in";

    let currentIndex = 0;
    let isAnimating = false; // MUTEX

    function renderCard(direction = 'init') {
        if (isAnimating && direction !== 'init') return; // Prevent double click

        const container = document.getElementById('learning-card-container');

        if (currentIndex >= sessionCards.length) {
            overlay.innerHTML = `
                <div class="text-center animate-fade-in px-6">
                    <div class="inline-flex p-6 bg-emerald-500/20 rounded-full mb-6"><i data-lucide="trophy" class="w-16 h-16 text-emerald-400"></i></div>
                    <h2 class="text-3xl font-bold text-white mb-2">Session Terminée !</h2>
                    <p class="text-slate-400 mb-8 text-lg">Vous avez revu ${sessionCards.length} cartes.</p>
                    <button onclick="closeLearningMode()" class="px-8 py-3 bg-indigo-600 rounded-xl text-white font-bold hover:bg-indigo-500 transition shadow-lg shadow-indigo-500/25">Retour aux fiches</button>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        const card = sessionCards[currentIndex];
        const cardHTML = `
            <div class="relative w-full max-w-sm aspect-[3/4] perspective-1000 cursor-pointer group select-none" onclick="this.classList.toggle('card-flipped')">
                <div class="card-inner relative w-full h-full transform-style-3d transition-all duration-500">
                    <div class="card-front absolute inset-0 bg-slate-800 rounded-3xl border border-slate-700 p-6 flex flex-col items-center justify-center text-center shadow-2xl backface-hidden">
                        <span class="text-indigo-400 text-xs font-bold uppercase tracking-widest mb-4">Question</span>
                        <div class="flex-grow w-full overflow-hidden relative">
                             <div class="card-text-container">
                                <div class="card-text-inner latex-content font-medium text-white">${card.question}</div>
                             </div>
                             <!-- Scroll Fade Hints (Optional, can be added via CSS mask in future) -->
                        </div>
                        <div class="mt-4 text-slate-500 text-xs flex items-center gap-2"><i data-lucide="touchpad" class="w-4 h-4"></i> Taper pour retourner</div>
                    </div>
                    <div class="card-back absolute inset-0 bg-gradient-to-br from-slate-800 to-indigo-900/40 rounded-3xl border border-indigo-500/30 p-6 flex flex-col items-center justify-center text-center shadow-2xl backface-hidden" style="transform: rotateY(180deg)">
                        <span class="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-4">Réponse</span>
                        <div class="flex-grow w-full overflow-hidden relative">
                             <div class="card-text-container">
                                <div class="card-text-inner latex-content font-medium text-white">${card.answer}</div>
                             </div>
                        </div>
                         <div class="mt-4 text-slate-400 text-xs flex items-center gap-2"><i data-lucide="rotate-ccw" class="w-4 h-4"></i> Revérifier</div>
                    </div>
                </div>
                <div id="success-anim-${card.id}"></div>
            </div>
        `;

        const actionsHTML = `
             <div class="flex flex-col gap-4 z-50 w-full max-w-sm mx-auto pb-4">
                 <div class="flex items-center gap-3">
                    <button id="btn-later-3" class="flex-1 py-3 rounded-xl bg-slate-800 text-amber-400 text-sm font-bold border border-slate-700 hover:bg-slate-700 active:scale-95 transition">Pas su<br><span class="text-[10px] font-normal opacity-70">+3 rangs</span></button>
                    <button id="btn-later-7" class="flex-1 py-3 rounded-xl bg-slate-800 text-blue-400 text-sm font-bold border border-slate-700 hover:bg-slate-700 active:scale-95 transition">A peu près<br><span class="text-[10px] font-normal opacity-70">+7 rangs</span></button>
                </div>
                <div class="flex items-center gap-4">
                     <button id="btn-prev" class="p-4 rounded-full bg-slate-800 text-slate-400 hover:text-white border border-slate-700 disabled:opacity-30"><i data-lucide="arrow-left" class="w-6 h-6"></i></button>
                     <button id="btn-validate" class="flex-grow py-4 rounded-2xl font-bold bg-emerald-600 text-white hover:bg-emerald-500 shadow-xl active:scale-95 transition flex items-center justify-center gap-2"><i data-lucide="check" class="w-6 h-6"></i> Maîtrisé</button>
                     <button id="btn-next" class="p-4 rounded-full bg-slate-800 text-white border border-slate-700"><i data-lucide="arrow-right" class="w-6 h-6"></i></button>
                </div>
             </div>
        `;

        if (!container) {
            overlay.innerHTML = `
                <div class="absolute top-0 left-0 right-0 p-6 flex justify-between items-center text-slate-400 z-50">
                    <button onclick="closeLearningMode()" class="p-2 hover:bg-white/10 rounded-full text-white transition"><i data-lucide="x" class="w-6 h-6"></i></button>
                    <div class="font-mono text-sm bg-black/30 px-3 py-1 rounded-full border border-white/10" id="progress-indicator">${currentIndex + 1} / ${sessionCards.length}</div>
                    <div class="w-10"></div>
                </div>
                <!-- Container is RELATIVE. Cards will be Absolute/Relative inside. -->
                <div id="learning-card-container" class="w-full h-full flex justify-center items-center py-4 flex-grow relative overflow-visible">
                    ${cardHTML}
                </div>
                ${actionsHTML}
            `;
            document.body.appendChild(overlay);
        } else {
            isAnimating = true;
            const oldCard = container.firstElementChild;
            const wrapper = document.createElement('div');
            wrapper.innerHTML = cardHTML;
            const newCard = wrapper.firstElementChild;

            // Positioning Logic for Animation
            // To prevent pushing, we ensure valid stacking.

            if (direction === 'next') {
                oldCard.style.position = 'absolute'; // Remove from flow
                oldCard.style.top = '50%';
                oldCard.style.left = '50%';
                oldCard.style.transform = 'translate(-50%, -50%)'; // Centered

                oldCard.classList.add('slide-exit-next');

                // New card takes the flow space
                newCard.classList.add('slide-enter-next');
                container.appendChild(newCard);

            } else if (direction === 'prev') {
                oldCard.style.position = 'absolute';
                oldCard.style.top = '50%';
                oldCard.style.left = '50%';
                oldCard.style.transform = 'translate(-50%, -50%)';

                oldCard.classList.add('slide-exit-prev');
                newCard.classList.add('slide-enter-prev');
                container.appendChild(newCard);
            }

            setTimeout(() => {
                oldCard.remove();
                newCard.classList.remove('slide-enter-next', 'slide-enter-prev');
                isAnimating = false; // Unlock
            }, 500); // Match CSS duration

            document.getElementById('progress-indicator').innerText = `${currentIndex + 1} / ${sessionCards.length}`;
        }

        lucide.createIcons();
        if (typeof renderMathInElement !== 'undefined') initKatex(overlay);

        document.getElementById('btn-prev').disabled = currentIndex === 0;
        document.getElementById('btn-prev').onclick = () => { if (currentIndex > 0 && !isAnimating) { currentIndex--; renderCard('prev'); } };
        document.getElementById('btn-next').onclick = () => { if (!isAnimating) { currentIndex++; renderCard('next'); } };

        document.getElementById('btn-validate').onclick = (e) => {
            e.stopPropagation();
            if (isAnimating) return;
            document.getElementById(`success-anim-${card.id}`).innerHTML = `<div class="success-overlay"><div class="success-icon bg-emerald-500 text-white p-4 rounded-full shadow-lg"><i data-lucide="check" class="w-8 h-8"></i></div></div>`;
            lucide.createIcons();
            card.isLearned = true;
            saveData();
            setTimeout(() => { currentIndex++; renderCard('next'); }, 600);
        };

        const deferCard = (offset) => {
            if (isAnimating) return;
            const item = sessionCards[currentIndex];
            sessionCards.splice(currentIndex, 1);
            const newIndex = Math.min(currentIndex + offset, sessionCards.length);
            sessionCards.splice(newIndex, 0, item);
            sessionCards.forEach((c, i) => c.order = i);
            saveData();
            renderCard('next');
        };

        document.getElementById('btn-later-3').onclick = (e) => { e.stopPropagation(); deferCard(3); };
        document.getElementById('btn-later-7').onclick = (e) => { e.stopPropagation(); deferCard(7); };
    }

    renderCard();
}

function closeLearningMode() {
    document.getElementById('learning-overlay').remove();
    renderView();
}


// --- MODALS UPDATED ---
let selectedThemeColor = '';

function openModal(type, entity = null) {
    const modal = document.getElementById('modal-overlay');
    const contentDeck = document.getElementById('modal-deck');
    const contentCard = document.getElementById('modal-card');

    modal.classList.remove('hidden');

    if (type === 'deck') {
        contentDeck.classList.remove('hidden');
        contentCard.classList.add('hidden');
        renderGradientSelector();
        if (entity) {
            document.getElementById('deck-title').value = entity.title;
            selectedGradient = entity.gradient;
            editingId = entity.id;
        } else {
            document.getElementById('deck-title').value = '';
            editingId = null;
        }
    } else {
        contentDeck.classList.add('hidden');
        contentCard.classList.remove('hidden');
        initCardModal();

        if (entity) {
            document.getElementById('card-question').value = entity.question;
            document.getElementById('card-answer').value = entity.answer;
            document.getElementById('card-theme-select').value = entity.theme;
            editingId = entity.id;
        } else {
            document.getElementById('card-question').value = '';
            document.getElementById('card-answer').value = '';
            editingId = null;
        }
    }
}

function toggleThemeMode(isNew) {
    isNewTheme = isNew;
    const btnEx = document.getElementById('btn-existing-theme');
    const btnNew = document.getElementById('btn-new-theme');
    const inputEx = document.getElementById('container-theme-select');
    const inputNew = document.getElementById('input-new-theme');
    const colorPicker = document.getElementById('theme-color-picker');

    if (isNew) {
        btnEx.classList.replace('bg-indigo-600', 'bg-slate-800');
        btnEx.classList.replace('text-white', 'text-slate-400');
        btnNew.classList.replace('bg-slate-800', 'bg-indigo-600');
        btnNew.classList.replace('text-slate-400', 'text-white');

        inputEx.classList.add('hidden');
        inputNew.classList.remove('hidden');

        if (!colorPicker) {
            const div = document.createElement('div');
            div.id = 'theme-color-picker';
            div.className = "mt-4 flex gap-2 animate-fade-in";
            THEME_COLORS.forEach(c => {
                const dot = document.createElement('div');
                dot.className = `color-dot ${c.class}`;
                dot.onclick = () => {
                    document.querySelectorAll('.color-dot').forEach(el => el.classList.remove('selected'));
                    dot.classList.add('selected');
                    selectedThemeColor = c.class;
                };
                div.appendChild(dot);
            });
            inputNew.after(div);
            div.children[0].click(); // Default
        } else {
            colorPicker.classList.remove('hidden');
        }
    } else {
        btnNew.classList.replace('bg-indigo-600', 'bg-slate-800');
        btnNew.classList.replace('text-white', 'text-slate-400');
        btnEx.classList.replace('bg-slate-800', 'bg-indigo-600');
        btnEx.classList.replace('text-slate-400', 'text-white');

        inputNew.classList.add('hidden');
        inputEx.classList.remove('hidden');
        if (colorPicker) colorPicker.classList.add('hidden');
    }
}

function handleCreateCard(e) {
    e.preventDefault();
    const q = document.getElementById('card-question').value;
    const a = document.getElementById('card-answer').value;
    let theme = isNewTheme ? document.getElementById('input-new-theme').value : document.getElementById('card-theme-select').value;
    if (!theme) theme = "Divers";

    if (q && a) {
        if (isNewTheme && selectedThemeColor) {
            themeColors[`${activeDeckId}_${theme}`] = selectedThemeColor;
        }

        if (editingId) {
            const idx = cards.findIndex(c => c.id === editingId);
            if (idx !== -1) {
                cards[idx].question = q;
                cards[idx].answer = a;
                cards[idx].theme = theme;
            }
        } else {
            cards.unshift({
                id: generateId(),
                deckId: activeDeckId,
                question: q,
                answer: a,
                theme,
                isLearned: false,
                createdAt: Date.now(),
                order: -1
            });
            cards.forEach((c, i) => c.order = i); // Re-index
        }
        saveData();
        closeModal();
        renderView();
    }
}

// --- MODAL UTILS (Gradient, etc.) ---
let selectedGradient = GRADIENTS[0].class;
function renderGradientSelector() {
    const container = document.getElementById('gradient-selector');
    container.innerHTML = '';
    GRADIENTS.forEach(g => {
        const div = document.createElement('div');
        div.className = `w-10 h-10 rounded-full cursor-pointer transition-all hover:scale-110 border-2 ${selectedGradient === g.class ? 'border-white scale-110' : 'border-transparent'} bg-gradient-to-br ${g.class}`;
        div.onclick = () => {
            selectedGradient = g.class;
            renderGradientSelector();
        };
        container.appendChild(div);
    });
}
function initCardModal() {
    const currentDeckCards = cards.filter(c => c.deckId === activeDeckId);
    const themes = [...new Set(currentDeckCards.map(c => c.theme))];
    if (themes.length === 0) themes.push('Général');

    const select = document.getElementById('card-theme-select');
    select.innerHTML = themes.map(t => `<option value="${t}">${t}</option>`).join('');
    toggleThemeMode(false);
}

function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
    document.getElementById('modal-import-export').classList.add('hidden');
    document.getElementById('menu-deck-' + editingId)?.classList.add('hidden');
    closeAllContextMenus();
}

function initKatex(element = document.body) {
    if (window.renderMathInElement) {
        renderMathInElement(element, {
            delimiters: [
                { left: "$$", right: "$$", display: true },
                { left: "\\[", right: "\\]", display: true },
                { left: "\\(", right: "\\)", display: false },
                { left: "$", right: "$", display: false } // Added inline support
            ],
            throwOnError: false
        });
    }
}

function closeAllContextMenus() {
    document.querySelectorAll('.context-menu').forEach(el => el.classList.add('hidden'));
}

function toggleDeckMenu(e, id) {
    e.stopPropagation();
    closeAllContextMenus();
    const menu = document.getElementById(`menu-deck-${id}`);
    if (menu) menu.classList.remove('hidden');
}

function toggleCardMenu(e, id) {
    e.stopPropagation();
    closeAllContextMenus();
    const menu = document.getElementById(`menu-card-${id}`);
    if (menu) menu.classList.remove('hidden');
}

function deleteDeck(id) {
    showToast("Supprimer ce bloc ?", "confirm", () => {
        decks = decks.filter(d => d.id !== id);
        cards = cards.filter(c => c.deckId !== id);
        saveData();
        renderView();
        showToast("Bloc supprimé", "success");
    });
}

function duplicateDeck(id) {
    const original = decks.find(d => d.id === id);
    if (!original) return;
    const newId = generateId();
    decks.push({
        ...original,
        id: newId,
        title: original.title + " (Copie)",
        createdAt: Date.now(),
        order: decks.length
    });
    const originalCards = cards.filter(c => c.deckId === id);
    originalCards.forEach(c => {
        cards.push({
            ...c,
            id: generateId(),
            deckId: newId,
            createdAt: Date.now()
        });
    });
    saveData();
    renderView();
    showToast("Bloc dupliqué", "success");
}

function deleteCard(e, id) {
    e.stopPropagation();
    showToast("Supprimer cette carte ?", "confirm", () => {
        cards = cards.filter(c => c.id !== id);
        saveData();
        renderView();
        showToast("Carte supprimée", "success");
    });
}

function duplicateCard(e, id) {
    e.stopPropagation();
    const original = cards.find(c => c.id === id);
    if (!original) return;
    cards.push({
        ...original,
        id: generateId(),
        createdAt: Date.now()
    });
    saveData();
    renderView();
    showToast("Carte dupliquée", "success");
}

function emptyThemeTrash(theme) {
    showToast(`Vider "${theme}" ?`, "confirm", () => {
        const count = cards.filter(c => c.deckId === activeDeckId && c.theme === theme).length;
        cards = cards.filter(c => !(c.deckId === activeDeckId && c.theme === theme));
        saveData();
        renderView();
        showToast(`${count} cartes supprimées`, "success");
    });
}

// QUICK ACTION
function toggleCardLearned(e, id) {
    e.stopPropagation();
    const card = cards.find(c => c.id === id);
    if (card) {
        card.isLearned = !card.isLearned;
        saveData();
        renderView();
        showToast(card.isLearned ? "Carte maîtrisée !" : "Carte à revoir", "success");
    }
}

// SHUFFLE (Unlearned Only)
function shuffleTheme(theme) {
    const unlearnedCards = cards.filter(c => c.deckId === activeDeckId && c.theme === theme && !c.isLearned);

    // Assign random orders to unlearned
    unlearnedCards.forEach(c => {
        c.order = Math.random();
    });

    saveData();
    renderView();
    showToast("Cartes à apprendre mélangées", "success");
}


// Modal Handlers
let editingId = null;

function editDeck(id) {
    editingId = id;
    const deck = decks.find(d => d.id === id);
    openModal('deck', deck);
}

function editCard(e, id) {
    e.stopPropagation();
    editingId = id;
    const card = cards.find(c => c.id === id);
    openModal('card', card);
}

function handleCreateDeck(e) {
    e.preventDefault();
    const title = document.getElementById('deck-title').value;
    if (title) {
        if (editingId) {
            const idx = decks.findIndex(d => d.id === editingId);
            if (idx !== -1) {
                decks[idx].title = title;
                decks[idx].gradient = selectedGradient;
            }
        } else {
            decks.push({
                id: generateId(),
                title,
                gradient: selectedGradient,
                createdAt: Date.now(),
                isPublic: false,
                order: decks.length
            });
        }
        saveData();
        closeModal();
        renderView();
    }
}

function openHome() {
    currentView = 'home';
    activeDeckId = null;
    renderView();
}

function openDeck(id) {
    currentView = 'deck';
    activeDeckId = id;
    renderView();
}

function filterCards(query, theme) {
    const grid = document.getElementById(`grid-${theme}`);
    if (!grid) return;
    const cards = Array.from(grid.children);
    const lowerQ = query.toLowerCase();

    cards.forEach(cardWrapper => {
        const text = cardWrapper.innerText.toLowerCase();
        if (text.includes(lowerQ)) {
            cardWrapper.style.display = '';
        } else {
            cardWrapper.style.display = 'none';
        }
    });
}

function openImportModal() {
    const modal = document.getElementById('modal-overlay');
    const contentImport = document.getElementById('modal-import-export');
    const contentDeck = document.getElementById('modal-deck');
    const contentCard = document.getElementById('modal-card');

    contentDeck.classList.add('hidden');
    contentCard.classList.add('hidden');
    contentImport.classList.remove('hidden');

    document.getElementById('modal-ie-title').innerText = "Importer des cartes";
    document.getElementById('modal-ie-desc').innerText = "Collez du JSON ou déposez un fichier.";
    document.getElementById('ie-content').value = "";
    document.getElementById('ie-content').readOnly = false;

    // Toggle UI Elements
    document.getElementById('import-drop-zone').classList.remove('hidden');
    document.getElementById('btn-copy-clipboard').classList.add('hidden');
    document.getElementById('btn-paste-clipboard').classList.remove('hidden');

    document.getElementById('btn-perform-import').classList.remove('hidden');
    document.getElementById('btn-download-json').classList.add('hidden');
    document.getElementById('btn-download-txt').classList.add('hidden');

    modal.classList.remove('hidden');

    // Init Drag Events
    const dropZone = document.getElementById('import-drop-zone');
    dropZone.ondragover = (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); };
    dropZone.ondragleave = (e) => { e.preventDefault(); dropZone.classList.remove('drag-over'); };
    dropZone.ondrop = (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) readFile(e.dataTransfer.files[0]);
    };
}

function exportDeck() {
    const deckCards = cards.filter(c => c.deckId === activeDeckId);
    if (deckCards.length === 0) return showToast("Aucune carte à exporter", "error");

    const exportData = deckCards.map(c => ({
        question: c.question,
        answer: c.answer,
        theme: c.theme
    }));

    const modal = document.getElementById('modal-overlay');
    const contentImport = document.getElementById('modal-import-export');
    const contentDeck = document.getElementById('modal-deck');
    const contentCard = document.getElementById('modal-card');

    contentDeck.classList.add('hidden');
    contentCard.classList.add('hidden');
    contentImport.classList.remove('hidden');

    document.getElementById('modal-ie-title').innerText = "Exporter le bloc";
    document.getElementById('modal-ie-desc').innerText = "Téléchargez le fichier ou copiez le code.";
    document.getElementById('ie-content').value = JSON.stringify(exportData, null, 2);
    document.getElementById('ie-content').readOnly = true;

    // Toggle UI Elements
    document.getElementById('import-drop-zone').classList.add('hidden');
    document.getElementById('btn-copy-clipboard').classList.remove('hidden');
    document.getElementById('btn-paste-clipboard').classList.add('hidden');

    document.getElementById('btn-perform-import').classList.add('hidden');
    document.getElementById('btn-download-json').classList.remove('hidden');
    document.getElementById('btn-download-txt').classList.remove('hidden');

    modal.classList.remove('hidden');
}

function handleFileSelect(event) {
    if (event.target.files.length > 0) readFile(event.target.files[0]);
}

function readFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('ie-content').value = e.target.result;
        showToast("Fichier chargé !", "success");
    };
    reader.readAsText(file);
}

function handleImportAction() {
    try {
        const raw = document.getElementById('ie-content').value;
        if (!raw) return;
        const data = JSON.parse(raw);
        if (!Array.isArray(data)) throw new Error("Format invalide (doit être un tableau)");

        let count = 0;
        data.forEach(item => {
            if (item.question && item.answer) {
                cards.push({
                    id: generateId(),
                    deckId: activeDeckId,
                    question: item.question,
                    answer: item.answer,
                    theme: item.theme || "Importé",
                    isLearned: false,
                    createdAt: Date.now(),
                    order: cards.length
                });
                count++;
            }
        });
        saveData();
        renderView();
        closeModal();
        showToast(`${count} cartes importées !`, "success");
    } catch (e) {
        showToast("Erreur d'import : " + e.message, "error");
    }
}

function downloadExport(type) {
    const content = document.getElementById('ie-content').value;
    if (!content) return;

    const mime = type === 'json' ? 'application/json' : 'text/plain';
    const ext = type === 'json' ? 'json' : 'txt';

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flashcards_export_${Date.now()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Téléchargement lancé", "success");
}

function copyToClipboard() {
    const text = document.getElementById('ie-content').value;
    navigator.clipboard.writeText(text).then(() => showToast("Copié !", "success"));
}

async function pasteFromClipboard() {
    try {
        const text = await navigator.clipboard.readText();
        document.getElementById('ie-content').value = text;
        showToast("Collé !", "success");
    } catch (err) {
        showToast("Impossible de coller : " + err, "error");
    }
}

window.onload = initApp;
