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

// --- PERFORMANCE UTILITIES ---

// Debounced save to avoid repeated synchronous localStorage writes
let _saveTimeout = null;
function saveData() {
    if (_saveTimeout) clearTimeout(_saveTimeout);
    _saveTimeout = setTimeout(() => {
        try {
            localStorage.setItem(STORAGE_KEY_DECKS, JSON.stringify(decks));
            localStorage.setItem(STORAGE_KEY_CARDS, JSON.stringify(cards));
            localStorage.setItem(PREFS_KEY, JSON.stringify({ sortMode: currentSortMode }));
            localStorage.setItem(THEME_COLORS_KEY, JSON.stringify(themeColors));
        } catch (e) {
            console.warn('saveData error:', e);
        }
    }, 100);
}

// Immediate save (for critical operations like before page unload)
function saveDataNow() {
    if (_saveTimeout) clearTimeout(_saveTimeout);
    try {
        localStorage.setItem(STORAGE_KEY_DECKS, JSON.stringify(decks));
        localStorage.setItem(STORAGE_KEY_CARDS, JSON.stringify(cards));
        localStorage.setItem(PREFS_KEY, JSON.stringify({ sortMode: currentSortMode }));
        localStorage.setItem(THEME_COLORS_KEY, JSON.stringify(themeColors));
    } catch (e) {
        console.warn('saveDataNow error:', e);
    }
}

// Targeted Lucide icon creation — only scan a subtree
function createIconsIn(element) {
    if (!element || typeof lucide === 'undefined') return;
    try {
        lucide.createIcons({ nodes: element.querySelectorAll ? [element] : undefined });
    } catch (e) {
        // Fallback to full scan
        try { lucide.createIcons(); } catch (e2) { /* ignore */ }
    }
}

// Lazy Rendering AND Aggressive DOM Memory Unloading via IntersectionObserver
// Cards are created as lightweight skeletons and only "inflated" to full DOM
// when near the viewport. When scrolled far away, they are "deflated" back to
// empty shells, aggressively freeing WebKit GPU/DOM memory on iOS.
let _cardVisibilityObserver = null;
let _inflationQueue = [];
let _inflationRunning = false;
const INFLATE_BATCH_SIZE = 4; // Cards inflated per animation frame

function queueInflation(skeleton) {
    if (!_inflationQueue.includes(skeleton)) {
        _inflationQueue.push(skeleton);
    }
    if (!_inflationRunning) {
        _inflationRunning = true;
        requestAnimationFrame(processInflationQueue);
    }
}

function processInflationQueue() {
    if (_inflationQueue.length === 0) {
        _inflationRunning = false;
        return;
    }

    const batch = _inflationQueue.splice(0, INFLATE_BATCH_SIZE);
    batch.forEach(skeleton => {
        // Only inflate if still in DOM and not already inflated
        if (skeleton.isConnected && skeleton.dataset.inflated !== 'true') {
            inflateCard(skeleton);
        }
    });

    if (_inflationQueue.length > 0) {
        requestAnimationFrame(processInflationQueue);
    } else {
        _inflationRunning = false;
    }
}

function initCardVisibilityObserver() {
    if (_cardVisibilityObserver) _cardVisibilityObserver.disconnect();
    // Clear any pending inflation queue from previous view
    _inflationQueue = [];
    _inflationRunning = false;
    
    _cardVisibilityObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const cardEl = entry.target;

            if (entry.isIntersecting) {
                // --- INFLATE: queue card DOM creation (batched across frames) ---
                if (cardEl.dataset.inflated !== 'true') {
                    queueInflation(cardEl);
                } else {
                    // Wake up previously hidden card
                    const inner = cardEl.querySelector('.card-inner');
                    if (inner && inner.style.display === 'none') {
                        inner.style.display = '';
                    }
                    // Render KaTeX if not done yet
                    if (!cardEl.dataset.katexRendered) {
                        renderKatexElement(cardEl);
                        cardEl.dataset.katexRendered = 'true';
                        cardEl.classList.remove('katex-pending');
                        cardEl.classList.add('katex-rendered');
                    }
                }
            } else {
                // --- DEFLATE: aggressively remove inner DOM to free memory ---
                if (cardEl.dataset.inflated === 'true') {
                    deflateCard(cardEl);
                }
                // Also remove from queue if it was pending
                const qi = _inflationQueue.indexOf(cardEl);
                if (qi !== -1) _inflationQueue.splice(qi, 1);
            }
        });
    }, {
        rootMargin: '400px 0px', // Tighter than 800px — reduces peak DOM on iOS
        threshold: 0
    });
}

// Inflate a skeleton into a full card DOM
function inflateCard(skeleton) {
    const cardId = skeleton.dataset.id;
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    // Build the full card inner DOM
    const fullCard = createCardDOM(card);
    // Transfer the inner content to the skeleton shell
    const inner = fullCard.querySelector('.card-inner');
    if (inner) {
        skeleton.innerHTML = '';
        skeleton.appendChild(inner);
    } else {
        skeleton.innerHTML = fullCard.innerHTML;
    }

    // Copy click handler
    const activeDeck = decks.find(d => d.id === card.deckId);
    const isQcm = activeDeck && activeDeck.type === 'qcm';
    const isVal = card.validationStatus === 'correct' || card.validationStatus === 'incorrect';
    skeleton.onclick = function (e) {
        if (!isQcm || isVal) {
            if (!e.target.closest('.context-menu') && !e.target.closest('button.no-flip') && !e.target.closest('.grab-handle')) {
                this.classList.toggle('card-flipped');
            }
        }
    };

    skeleton.dataset.inflated = 'true';
    skeleton.classList.remove('katex-pending');

    // Render KaTeX and icons for THIS card only
    renderKatexElement(skeleton);
    skeleton.dataset.katexRendered = 'true';
    skeleton.classList.add('katex-rendered');
    createIconsIn(skeleton);
}

// Deflate a card back to an empty skeleton to free memory
function deflateCard(cardEl) {
    cardEl.innerHTML = '';
    cardEl.dataset.inflated = 'false';
    cardEl.dataset.katexRendered = '';
    cardEl.classList.remove('card-flipped', 'katex-rendered');
    cardEl.classList.add('katex-pending');
    cardEl.onclick = null; // Remove handler to free closure memory
}

// Create a lightweight skeleton placeholder for a card
function createCardSkeleton(card) {
    const skeleton = document.createElement('div');
    skeleton.className = "group h-80 w-full perspective-1000 cursor-pointer card-container select-none";
    skeleton.dataset.id = card.id;
    skeleton.dataset.inflated = 'false';

    // Drag support (needed even on skeletons for drop targets)
    skeleton.ondragover = (e) => handleDragOver(e, card.id, 'card');
    skeleton.ondrop = (e) => handleDrop(e, card.id, 'card');

    return skeleton;
}

function renderKatexElement(element) {
    if (typeof renderMathInElement === 'undefined') return;
    try {
        renderMathInElement(element, {
            delimiters: [
                { left: "$$", right: "$$", display: true },
                { left: "\\[", right: "\\]", display: true },
                { left: "\\(", right: "\\)", display: false },
                { left: "$", right: "$", display: false }
            ],
            throwOnError: false
        });
    } catch (e) {
        console.warn('KaTeX render error:', e);
    }
}

// Observe a card skeleton/element for lazy inflation and memory unloading
function observeForKatex(cardElement) {
    if (!_cardVisibilityObserver) initCardVisibilityObserver();
    cardElement.classList.add('katex-pending');
    _cardVisibilityObserver.observe(cardElement);
}

// Direct KaTeX render for a single element (used in Learning Mode)
function renderKatexDirect(element) {
    if (!element) return;
    // Use requestAnimationFrame to avoid blocking the main thread
    requestAnimationFrame(() => {
        renderKatexElement(element);
    });
}

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

const DEFAULT_DECKS_CONFIG = [
    {
        id: 'default-english',
        title: 'Anglais Voc',
        type: 'qcm',
        gradient: GRADIENTS[3].class,
        order: -3,
        isPublic: true,
        cards: [
            // Anglais
        {
            "question": "Que signifie le mot 'apparatus' ?",
            "qcmMode": "multi",
            "answers": ["Un vêtement.", "Un ensemble d'équipements ou d'outils pour un but précis.", "Une réunion de personnes.", "Une petite ouverture."],
            "correctAnswers": [1],
            "explanation": "Apparatus: A set of equipment or tools used for a specific purpose. [cite: 22]",
            "theme": "The Machine Stops"
        },
        {
            "question": "Le mot 'applause' désigne une approbation exprimée en applaudissant.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [0],
            "explanation": "Applause: Approval or praise expressed by clapping. [cite: 24]",
            "theme": "The Machine Stops"
        },
        {
            "question": "Comment traduis-tu 'ashamed' ?",
            "qcmMode": "multi",
            "answers": ["Fier", "Honteux / Gêné", "Fatigué", "Fou"],
            "correctAnswers": [1],
            "explanation": "Ashamed: Feeling embarrassed or guilty about something. [cite: 26]",
            "theme": "The Machine Stops"
        },
        {
            "question": "Un 'attendant' est une personne qui fournit un service ou qui est présente à un événement.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [0],
            "explanation": "Attendant: A person who provides a service or is present at an event. [cite: 27]",
            "theme": "The Machine Stops"
        },
        {
            "question": "Que veut dire 'beyond measure' ?",
            "qcmMode": "multi",
            "answers": ["Sans limite / À un degré extrême", "Une petite quantité", "Mesurer une distance", "En retard"],
            "correctAnswers": [0],
            "explanation": "Beyond measure: To an extreme or immeasurable degree. [cite: 29]",
            "theme": "The Machine Stops"
        },
        {
            "question": "Faire un 'blunder' signifie réussir une tâche brillamment.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [1],
            "explanation": "Blunder: To make a careless or stupid mistake. [cite: 30]",
            "theme": "The Machine Stops"
        },
        {
            "question": "Que signifie 'brood' ?",
            "qcmMode": "multi",
            "answers": ["Mélanger", "Penser profondément à quelque chose qui rend malheureux", "Briser en morceaux", "S'envoler"],
            "correctAnswers": [1],
            "explanation": "Brood: To think deeply about something that makes one unhappy. [cite: 32]",
            "theme": "The Machine Stops"
        },
        {
            "question": "'Careless' veut dire qu'on ne fait pas assez attention pour éviter les erreurs.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [0],
            "explanation": "Careless: Not giving sufficient attention or thought to avoiding harm or errors. [cite: 33]",
            "theme": "The Machine Stops"
        },
        {
            "question": "Quel mot décrit le fait d'être inquiet ou troublé ('worried or troubled') ?",
            "qcmMode": "multi",
            "answers": ["Glad", "Concerned", "Wearily", "Well-bred"],
            "correctAnswers": [1],
            "explanation": "Concerned: Worried or troubled about something. [cite: 35]",
            "theme": "The Machine Stops"
        },
        {
            "question": "Le mot 'conduct' se réfère à la manière dont une personne se comporte.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [0],
            "explanation": "Conduct: The manner in which a person behaves. [cite: 36]",
            "theme": "The Machine Stops"
        },
        {
            "question": "Que veut dire l'expression 'dashed to pieces' ?",
            "qcmMode": "multi",
            "answers": ["Construit solidement", "Brisé ou fracassé complètement", "Mis de côté", "Vendu rapidement"],
            "correctAnswers": [1],
            "explanation": "Dashed to pieces: Broken or shattered completely. [cite: 37]",
            "theme": "The Machine Stops"
        },
        {
            "question": "'Dim' signifie quelque chose qui est très clair et brillant.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [1],
            "explanation": "Dim: Not bright or clear. [cite: 39]",
            "theme": "The Machine Stops"
        },
        {
            "question": "Quel verbe signifie ignorer ou ne pas prêter attention ('to ignore') ?",
            "qcmMode": "multi",
            "answers": ["Disregard", "Drag", "Mend", "Peep"],
            "correctAnswers": [0],
            "explanation": "Disregard: To ignore or pay no attention to. [cite: 41]",
            "theme": "The Machine Stops"
        },
        {
            "question": "'Drag' signifie tirer quelque chose ou quelqu'un avec force.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [0],
            "explanation": "Drag: To pull something or someone along forcefully. [cite: 43]",
            "theme": "The Machine Stops"
        },
        {
            "question": "Que signifie l'adverbe 'fairly' dans ce contexte ?",
            "qcmMode": "multi",
            "answers": ["De manière injuste", "À un degré modérément élevé", "Rarement", "Complètement"],
            "correctAnswers": [1],
            "explanation": "Fairly: To a moderately high degree. [cite: 44]",
            "theme": "The Machine Stops"
        },
        {
            "question": "'Faint' est utilisé pour décrire quelque chose de fort et puissant.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [1],
            "explanation": "Faint: Weak, light, or barely perceptible. [cite: 46]",
            "theme": "The Machine Stops"
        },
        {
            "question": "Qu'est-ce qu'un 'garment' ?",
            "qcmMode": "multi",
            "answers": ["Une pièce d'équipement", "Une pièce de vêtement", "Un déchet", "Un outil"],
            "correctAnswers": [1],
            "explanation": "Garment: A piece of clothing. [cite: 47]",
            "theme": "The Machine Stops"
        },
        {
            "question": "Le verbe 'gasp' signifie inspirer soudainement la bouche ouverte, souvent sous le choc.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [0],
            "explanation": "Gasp: To inhale suddenly with the mouth open, usually in shock or surprise. [cite: 49]",
            "theme": "The Machine Stops"
        },
        {
            "question": "Quel mot désigne une assemblée ou une réunion de personnes ?",
            "qcmMode": "multi",
            "answers": ["Hive", "Lump", "Gathering", "Tide"],
            "correctAnswers": [2],
            "explanation": "Gathering: A meeting or assembly of people. [cite: 51]",
            "theme": "The Machine Stops"
        },
        {
            "question": "Un 'hive' peut désigner un endroit très animé et bondé, ou une ruche.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [0],
            "explanation": "Hive: A structure for housing bees or a busy, crowded place. [cite: 53]",
            "theme": "The Machine Stops"
        },
        {
            "question": "Qu'est-ce qu'un 'hinge' ?",
            "qcmMode": "multi",
            "answers": ["Une charnière", "Une serrure", "Un mur", "Un toit"],
            "correctAnswers": [0],
            "explanation": "Hinge: A joint or mechanism that allows a door or lid to swing open and shut. [cite: 55]",
            "theme": "The Machine Stops"
        },
        {
            "question": "'Imponderable' signifie facile à estimer ou à comprendre.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [1],
            "explanation": "Imponderable: Difficult or impossible to estimate or understand. [cite: 57]",
            "theme": "The Machine Stops"
        },
        {
            "question": "Que veut dire 'keep pace with' ?",
            "qcmMode": "multi",
            "answers": ["Ignorer", "Avancer à la même vitesse que", "Ralentir", "S'arrêter complètement"],
            "correctAnswers": [1],
            "explanation": "Keep pace with: To progress or move at the same speed as someone or something. [cite: 58]",
            "theme": "The Machine Stops"
        },
        {
            "question": "'Latent' décrit quelque chose qui existe mais qui n'est pas encore développé ou visible.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [0],
            "explanation": "Latent: Existing but not yet developed or visible. [cite: 60]",
            "theme": "The Machine Stops"
        },
        {
            "question": "Quel est le sens de 'lecture' en anglais ?",
            "qcmMode": "multi",
            "answers": ["Une lecture silencieuse", "Un discours formel pour enseigner (une conférence)", "Une punition", "Un livre"],
            "correctAnswers": [1],
            "explanation": "Lecture: A formal talk given to teach or explain something. [cite: 61]",
            "theme": "The Machine Stops"
        },
        {
            "question": "Le mot 'litter' désigne des déchets laissés dans un espace public.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [0],
            "explanation": "Litter: Trash left in an open or public place. [cite: 63]",
            "theme": "The Machine Stops"
        },
        {
            "question": "Qu'est-ce qu'un 'lump' ?",
            "qcmMode": "multi",
            "answers": ["Une masse compacte ou un morceau", "Une lumière brillante", "Une erreur stupide", "Une émotion forte"],
            "correctAnswers": [0],
            "explanation": "Lump: A compact mass or piece of something. [cite: 64]",
            "theme": "The Machine Stops"
        },
        {
            "question": "'Mad' signifie complètement retenu par la raison, capable de penser clairement.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [1],
            "explanation": "Mad: Completely unrestrained by reason; unable to think clearly. [cite: 65]",
            "theme": "The Machine Stops"
        },
        {
            "question": "Que veut dire le verbe 'mend' ?",
            "qcmMode": "multi",
            "answers": ["Détruire", "Ignorer", "Réparer ce qui est cassé", "Mélanger"],
            "correctAnswers": [2],
            "explanation": "Mend: To repair something that is broken or damaged. [cite: 66]",
            "theme": "The Machine Stops"
        },
        {
            "question": "Le verbe 'mingle' signifie mélanger ou se mêler aux autres.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [0],
            "explanation": "Mingle: To mix or blend. [cite: 68]",
            "theme": "The Machine Stops"
        },
        {
            "question": "Quel mot décrit une libération soudaine d'une forte émotion ?",
            "qcmMode": "multi",
            "answers": ["Outright", "Outburst", "Uproar", "Unrest"],
            "correctAnswers": [1],
            "explanation": "Outburst: A sudden release of strong emotion. [cite: 70]",
            "theme": "The Machine Stops"
        },
        {
            "question": "'Outright' signifie partiellement ou avec réserve.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [1],
            "explanation": "Outright: Completely or without reservation. [cite: 72]",
            "theme": "The Machine Stops"
        },
        {
            "question": "Que signifie 'owing to' ?",
            "qcmMode": "multi",
            "answers": ["En dépit de", "À cause de / En raison de", "Afin de", "Contrairement à"],
            "correctAnswers": [1],
            "explanation": "Owing to: Because of or due to. [cite: 73]",
            "theme": "The Machine Stops"
        },
        {
            "question": "'Peep' signifie regarder rapidement ou secrètement quelque chose.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [0],
            "explanation": "Peep: To look quickly or secretly at something. [cite: 74]",
            "theme": "The Machine Stops"
        },
        {
            "question": "Comment définis-tu 'praise' ?",
            "qcmMode": "multi",
            "answers": ["Une insulte", "Une prière silencieuse", "Des expressions d'approbation ou d'admiration", "Une punition"],
            "correctAnswers": [2],
            "explanation": "Praise: Expressions of approval or admiration. [cite: 76]",
            "theme": "The Machine Stops"
        },
        {
            "question": "Le verbe 'repel' signifie attirer fortement.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [1],
            "explanation": "Repel: To drive back or push away. [cite: 78]",
            "theme": "The Machine Stops"
        },
        {
            "question": "Que signifie 'resent' ?",
            "qcmMode": "multi",
            "answers": ["Renvoyer", "Ressentir de l'amertume ou de la colère à propos de quelque chose", "Se réjouir", "Accepter calmement"],
            "correctAnswers": [1],
            "explanation": "Resent: To feel bitterness or anger about something. [cite: 80]",
            "theme": "The Machine Stops"
        },
        {
            "question": "'Sigh' signifie expirer de façon audible, exprimant tristesse ou soulagement (soupirer).",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [0],
            "explanation": "Sigh: To exhale audibly, expressing sadness or relief. [cite: 81]",
            "theme": "The Machine Stops"
        },
        {
            "question": "Quel verbe signifie s'élever rapidement ou atteindre un haut niveau ?",
            "qcmMode": "multi",
            "answers": ["Soar", "Sway", "Drag", "Peep"],
            "correctAnswers": [0],
            "explanation": "Soar: To rise quickly or reach a high level. [cite: 82]",
            "theme": "The Machine Stops"
        },
        {
            "question": "'Steadily' signifie à un rythme irrégulier et instable.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [1],
            "explanation": "Steadily: At a constant and consistent rate. [cite: 83]",
            "theme": "The Machine Stops"
        },
        {
            "question": "Que veut dire 'stranded' ?",
            "qcmMode": "multi",
            "answers": ["Heureux", "Laissé sans moyen de bouger de quelque part (coincé)", "En voyage", "Bien habillé"],
            "correctAnswers": [1],
            "explanation": "Stranded: Left without the means to move from somewhere. [cite: 85]",
            "theme": "The Machine Stops"
        },
        {
            "question": "L'expression 'sway to and fro' signifie bouger d'avant en arrière en rythme.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [0],
            "explanation": "Sway to and fro: To move back and forth rhythmically. [cite: 87]",
            "theme": "The Machine Stops"
        },
        {
            "question": "Qu'est-ce que la 'tide' ?",
            "qcmMode": "multi",
            "answers": ["La saleté", "La marée (montée et descente du niveau de la mer)", "Le temps", "Un outil de nettoyage"],
            "correctAnswers": [1],
            "explanation": "Tide: The rise and fall of sea levels. [cite: 89]",
            "theme": "The Machine Stops"
        },
        {
            "question": "'To be accounted for' signifie devoir être expliqué ou justifié.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [0],
            "explanation": "To be accounted for: To be explained or justified. [cite: 91]",
            "theme": "The Machine Stops"
        },
        {
            "question": "Que veut dire 'to be in touch with' ?",
            "qcmMode": "multi",
            "answers": ["Perdre contact", "Maintenir la communication avec quelqu'un", "Toucher physiquement", "Être en retard"],
            "correctAnswers": [1],
            "explanation": "To be in touch with: To maintain communication with someone. [cite: 93]",
            "theme": "The Machine Stops"
        },
        {
            "question": "'To be out of hand' veut dire être sous contrôle parfait.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [1],
            "explanation": "To be out of hand: To be unmanageable or out of control. [cite: 95]",
            "theme": "The Machine Stops"
        },
        {
            "question": "Quel mot décrit un état d'insatisfaction ou de perturbation (agitation) ?",
            "qcmMode": "multi",
            "answers": ["Uproar", "Unrest", "Gathering", "Outburst"],
            "correctAnswers": [1],
            "explanation": "Unrest: A state of dissatisfaction or disturbance. [cite: 97]",
            "theme": "The Machine Stops"
        },
        {
            "question": "Un 'uproar' est un état de confusion bruyante ou de tumulte.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [0],
            "explanation": "Uproar: A state of noisy confusion or disturbance. [cite: 98]",
            "theme": "The Machine Stops"
        },
        {
            "question": "Comment traduis-tu 'wearily' ?",
            "qcmMode": "multi",
            "answers": ["De manière joyeuse", "De manière fatiguée ou épuisée", "Rapidement", "Silencieusement"],
            "correctAnswers": [1],
            "explanation": "Wearily: In a tired or exhausted manner. [cite: 100]",
            "theme": "The Machine Stops"
        },
        {
            "question": "'Well-bred' décrit quelqu'un qui a de mauvaises manières.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [1],
            "explanation": "Well-bred: Having or showing good manners and proper upbringing. [cite: 102]",
            "theme": "The Machine Stops"
        },
        {
            "question": "Que signifie le verbe 'afford' ?",
            "qcmMode": "multi",
            "answers": ["Ignorer", "Avoir assez d'argent ou de ressources pour acheter/faire quelque chose", "Faire un effort", "Travailler dur"],
            "correctAnswers": [1],
            "explanation": "afford: To have enough money or resources to do or buy something. [cite: 123]",
            "theme": "The Subliminal Man"
        },
        {
            "question": "Les 'appliances' sont des appareils ménagers utilisés pour effectuer des tâches domestiques.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [0],
            "explanation": "appliances: Devices or machines used in households to perform tasks. [cite: 125]",
            "theme": "The Subliminal Man"
        },
        {
            "question": "Qu'est-ce qu'un 'bargain' ?",
            "qcmMode": "multi",
            "answers": ["Une arnaque", "Un accord mutuel avantageux, souvent une bonne affaire", "Un bateau", "Une erreur"],
            "correctAnswers": [1],
            "explanation": "bargain: An agreement between two parties where both benefit, often involving a good deal. [cite: 127]",
            "theme": "The Subliminal Man"
        },
        {
            "question": "Le 'bare minimum' désigne la quantité maximale possible.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [1],
            "explanation": "bare minimum: The least amount necessary. [cite: 129]",
            "theme": "The Subliminal Man"
        },
        {
            "question": "Qu'est-ce qu'un 'billboard' ?",
            "qcmMode": "multi",
            "answers": ["Une facture d'électricité", "Un grand panneau d'affichage publicitaire", "Un tableau noir", "Une planche de bois"],
            "correctAnswers": [1],
            "explanation": "billboard: A large outdoor board for displaying advertisements. [cite: 131]",
            "theme": "The Subliminal Man"
        },
        {
            "question": "Le mot 'blade' désigne la partie plate et tranchante d'un outil ou d'une arme (la lame).",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [0],
            "explanation": "blade: The flat, sharp-edged part of a tool or weapon. [cite: 133]",
            "theme": "The Subliminal Man"
        },
        {
            "question": "Que décrit l'expression 'bumper to bumper' ?",
            "qcmMode": "multi",
            "answers": ["Un accident de voiture", "Des véhicules tassés de très près dans les embouteillages", "Un nouveau modèle de voiture", "Une course de vitesse"],
            "correctAnswers": [1],
            "explanation": "bumper to bumper: Referring to vehicles packed closely together in traffic. [cite: 135]",
            "theme": "The Subliminal Man"
        },
        {
            "question": "Un 'crumb' est un énorme morceau de nourriture.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [1],
            "explanation": "crumb: A small piece of food, especially from bread or cake. [cite: 137]",
            "theme": "The Subliminal Man"
        },
        {
            "question": "Que veut dire l'adjectif 'damp' ?",
            "qcmMode": "multi",
            "answers": ["Brillant", "Totalement sec", "Légèrement mouillé / Humide", "Froid"],
            "correctAnswers": [2],
            "explanation": "damp: Slightly wet. [cite: 139]",
            "theme": "The Subliminal Man"
        },
        {
            "question": "L'adjectif 'dazzling' signifie extrêmement brillant ou impressionnant (éblouissant).",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [0],
            "explanation": "dazzling: Extremely bright or impressive. [cite: 141]",
            "theme": "The Subliminal Man"
        },
        {
            "question": "Comment traduis-tu 'dully' ?",
            "qcmMode": "multi",
            "answers": ["De manière ennuyeuse ou sans éclat", "Avec une grande intelligence", "Très rapidement", "En cachette"],
            "correctAnswers": [0],
            "explanation": "dully: In a way that lacks brightness or interest. [cite: 143]",
            "theme": "The Subliminal Man"
        },
        {
            "question": "Le verbe 'frown' signifie sourire de toutes ses dents.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [1],
            "explanation": "frown: A facial expression indicating disapproval, displeasure, or concentration (froncer les sourcils). [cite: 145]",
            "theme": "The Subliminal Man"
        },
        {
            "question": "Que signifie 'free riding on the backs of others' ?",
            "qcmMode": "multi",
            "answers": ["Faire du cheval", "Profiter des efforts des autres sans contribuer soi-même", "Travailler bénévolement", "Aider ses amis"],
            "correctAnswers": [1],
            "explanation": "free riding on the backs of others: Benefiting from others' efforts without contributing oneself. [cite: 147]",
            "theme": "The Subliminal Man"
        },
        {
            "question": "Un 'gimmick' est un stratagème ou un gadget utilisé pour attirer l'attention ou faire vendre.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [0],
            "explanation": "gimmick: A trick or device used to attract attention or increase sales. [cite: 149]",
            "theme": "The Subliminal Man"
        },
        {
            "question": "Que veut dire l'adjectif 'glad' ?",
            "qcmMode": "multi",
            "answers": ["Triste", "Ressentir du plaisir ou de la joie (content)", "Malade", "Perdu"],
            "correctAnswers": [1],
            "explanation": "glad: Feeling pleasure or happiness. [cite: 151]",
            "theme": "The Subliminal Man"
        },
        {
            "question": "'Grimly' signifie d'une manière très joyeuse et amusante.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [1],
            "explanation": "grimly: In a serious or gloomy manner. [cite: 152]",
            "theme": "The Subliminal Man"
        },
        {
            "question": "Que signifie 'groundless' ?",
            "qcmMode": "multi",
            "answers": ["Sans fondement (sans base factuelle)", "Au niveau du sol", "Très lourd", "Sûr et certain"],
            "correctAnswers": [0],
            "explanation": "groundless: Without any basis in fact; unfounded. [cite: 153]",
            "theme": "The Subliminal Man"
        },
        {
            "question": "Le 'gross national product' est la valeur totale des biens et services produits par un pays en un an.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [0],
            "explanation": "gross national product: The total value of goods and services produced by a country in a year. [cite: 155]",
            "theme": "The Subliminal Man"
        },
        {
            "question": "Qu'est-ce qu'une 'hedge' ?",
            "qcmMode": "multi",
            "answers": ["Une clôture en métal", "Une haie (buissons) ou une stratégie pour minimiser les risques", "Une petite maison", "Un compte en banque"],
            "correctAnswers": [1],
            "explanation": "hedge: A row of bushes or trees forming a boundary, or a strategy to minimize risk. [cite: 157]",
            "theme": "The Subliminal Man"
        },
        {
            "question": "Le verbe 'hunch' signifie se pencher en arrière pour se détendre.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [1],
            "explanation": "hunch: To bend the body forward. [cite: 159]",
            "theme": "The Subliminal Man"
        },
        {
            "question": "Que veut dire 'intact' ?",
            "qcmMode": "multi",
            "answers": ["Détruit", "Resté entier ou non endommagé", "En morceaux", "Malade"],
            "correctAnswers": [1],
            "explanation": "intact: Remaining whole or undamaged. [cite: 161]",
            "theme": "The Subliminal Man"
        },
        {
            "question": "Un 'junkyard' est un endroit où l'on collectionne de vieux objets, souvent des voitures (une casse).",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [0],
            "explanation": "junkyard: A place where old or discarded items, especially vehicles, are collected. [cite: 163]",
            "theme": "The Subliminal Man"
        },
        {
            "question": "Qu'est-ce que le 'leisure' ?",
            "qcmMode": "multi",
            "answers": ["Le travail acharné", "Du temps libre pour la détente", "Un vêtement de sport", "Une sanction"],
            "correctAnswers": [1],
            "explanation": "leisure: Free time for relaxation or enjoyment. [cite: 165]",
            "theme": "The Subliminal Man"
        },
        {
            "question": "Le verbe 'mutter' veut dire crier à pleins poumons.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [1],
            "explanation": "mutter: To speak in a low and indistinct voice (marmonner). [cite: 166]",
            "theme": "The Subliminal Man"
        },
        {
            "question": "Que signifie 'noncommittally' ?",
            "qcmMode": "multi",
            "answers": ["De manière très engagée", "D'une manière qui ne révèle pas d'opinion claire (évasivement)", "Agricole", "Ici et là"],
            "correctAnswers": [1],
            "explanation": "noncommittally: In a way that does not reveal a clear opinion or decision. [cite: 167]",
            "theme": "The Subliminal Man"
        },
        {
            "question": "Un 'outline' est une description générale montrant les points principaux.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [0],
            "explanation": "outline: A general description or plan showing the main points. [cite: 169]",
            "theme": "The Subliminal Man"
        },
        {
            "question": "Que désigne le terme 'output' ?",
            "qcmMode": "multi",
            "answers": ["La quantité de quelque chose de produit (le rendement/la sortie)", "Une porte de sortie", "Une prise de courant", "Une erreur"],
            "correctAnswers": [0],
            "explanation": "output: The amount of something produced. [cite: 171]",
            "theme": "The Subliminal Man"
        },
        {
            "question": "L'adjectif 'offbeat' veut dire tout à fait classique et habituel.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [1],
            "explanation": "offbeat: Unconventional or unusual. [cite: 172]",
            "theme": "The Subliminal Man"
        },
        {
            "question": "Qu'est-ce qu'un 'pattern' ?",
            "qcmMode": "multi",
            "answers": ["Un patron de l'entreprise", "Un design répété ou une séquence récurrente (un motif)", "Un outil de jardin", "Un animal"],
            "correctAnswers": [1],
            "explanation": "pattern: A repeated design or recurring sequence. [cite: 174]",
            "theme": "The Subliminal Man"
        },
        {
            "question": "Une 'plant' peut désigner un bâtiment où des biens sont fabriqués (une usine).",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [0],
            "explanation": "plant: A building where goods are manufactured. [cite: 175]",
            "theme": "The Subliminal Man"
        },
        {
            "question": "Que signifie 'prey on' ?",
            "qcmMode": "multi",
            "answers": ["Prier pour quelqu'un", "Exploiter ou blesser quelqu'un de vulnérable (s'en prendre à)", "Manger de l'herbe", "Jouer à un jeu"],
            "correctAnswers": [1],
            "explanation": "prey on: To exploit or harm someone vulnerable. [cite: 176]",
            "theme": "The Subliminal Man"
        },
        {
            "question": "Le verbe 'seal' veut dire ouvrir en grand.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [1],
            "explanation": "seal: To close something securely (sceller). [cite: 177]",
            "theme": "The Subliminal Man"
        },
        {
            "question": "Qu'est-ce qu'un 'shift' dans le monde du travail ?",
            "qcmMode": "multi",
            "answers": ["Un vêtement de sécurité", "Une période définie pendant laquelle les employés travaillent", "Un bouton d'ordinateur", "Une promotion"],
            "correctAnswers": [1],
            "explanation": "shift: A set period during which employees work. [cite: 178]",
            "theme": "The Subliminal Man"
        },
        {
            "question": "Le verbe 'shrug' signifie lever et baisser les épaules pour exprimer l'indifférence (hausser les épaules).",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [0],
            "explanation": "shrug: To raise and lower the shoulders to express indifference or uncertainty. [cite: 179]",
            "theme": "The Subliminal Man"
        },
        {
            "question": "Que veut dire 'snub' ?",
            "qcmMode": "multi",
            "answers": ["Couper court", "Traiter quelqu'un froidement ou le snober", "Aider quelqu'un", "Dormir profondément"],
            "correctAnswers": [1],
            "explanation": "snub: To treat someone coldly or dismissively. [cite: 181]",
            "theme": "The Subliminal Man"
        },
        {
            "question": "Le verbe 'spare' veut dire gaspiller tout ce qu'on possède.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [1],
            "explanation": "spare: To give something that one has extra of or to refrain from harming (épargner/accorder). [cite: 182]",
            "theme": "The Subliminal Man"
        },
        {
            "question": "Que signifie le verbe 'sprawl' ?",
            "qcmMode": "multi",
            "answers": ["Courir vite", "S'étaler de manière irrégulière", "Crier fort", "Nettoyer"],
            "correctAnswers": [1],
            "explanation": "sprawl: To spread out irregularly. [cite: 184]",
            "theme": "The Subliminal Man"
        },
        {
            "question": "'Straggle' veut dire marcher parfaitement au pas avec les autres.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [1],
            "explanation": "straggle: To move slowly and irregularly behind others (traîner derrière). [cite: 185]",
            "theme": "The Subliminal Man"
        },
        {
            "question": "Que veut dire 'stuff' en tant que verbe ?",
            "qcmMode": "multi",
            "answers": ["Vider complètement", "Remplir quelque chose fermement (fourrer)", "Cuisiner", "Étudier"],
            "correctAnswers": [1],
            "explanation": "stuff: To fill something tightly with items. [cite: 187]",
            "theme": "The Subliminal Man"
        },
        {
            "question": "Un 'tag' est une étiquette attachée à quelque chose pour l'identifier.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [0],
            "explanation": "tag: A label attached to something for identification. [cite: 188]",
            "theme": "The Subliminal Man"
        },
        {
            "question": "Que signifie le verbe 'tap' ?",
            "qcmMode": "multi",
            "answers": ["Boire de l'eau", "Frapper légèrement", "Déchirer", "Danser"],
            "correctAnswers": [1],
            "explanation": "tap: To strike lightly or gain access to something. [cite: 189]",
            "theme": "The Subliminal Man"
        },
        {
            "question": "Le mot 'tire' (en tant que nom) désigne la vitre d'une voiture.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [1],
            "explanation": "tire: A rubber covering for a wheel (un pneu). [cite: 191]",
            "theme": "The Subliminal Man"
        },
        {
            "question": "Que veut dire 'to trade something in' ?",
            "qcmMode": "multi",
            "answers": ["Voler quelque chose", "Échanger quelque chose contre un crédit ou un autre article", "Jeter à la poubelle", "Collectionner"],
            "correctAnswers": [1],
            "explanation": "to trade something in: To exchange something for credit or another item. [cite: 193]",
            "theme": "The Subliminal Man"
        },
        {
            "question": "L'adjectif 'trim' décrit quelque chose de soigné ou mince.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [0],
            "explanation": "trim: Neat, well-groomed, or slim. [cite: 195]",
            "theme": "The Subliminal Man"
        },
        {
            "question": "Que signifie 'trying to keep pace with' ?",
            "qcmMode": "multi",
            "answers": ["Essayer de courir plus vite", "S'efforcer d'avancer aussi vite qu'un autre (suivre le rythme)", "Marcher lentement", "Ne pas s'en soucier"],
            "correctAnswers": [1],
            "explanation": "trying to keep pace with: Striving to move as quickly or progress equally with someone or something. [cite: 197]",
            "theme": "The Subliminal Man"
        },
        {
            "question": "'Weary' (adverbe) signifie d'une manière reposée et pleine d'énergie.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [1],
            "explanation": "weary: In a tired or worn-out manner. [cite: 199]",
            "theme": "The Subliminal Man"
        },
        {
            "question": "Qu'est-ce qu'un 'windshield' ?",
            "qcmMode": "multi",
            "answers": ["Le volant", "Le pot d'échappement", "Le pare-brise (vitre avant d'un véhicule)", "Un essuie-glace"],
            "correctAnswers": [2],
            "explanation": "windshield: The glass panel at the front of a vehicle. [cite: 201]",
            "theme": "The Subliminal Man"
        },
        {
            "question": "Qu'est-ce qu'un 'big-ticket purchase' ?",
            "qcmMode": "multi",
            "answers": ["Un billet de cinéma", "Un objet très coûteux (un gros achat)", "Un billet d'avion", "Un achat impulsif"],
            "correctAnswers": [1],
            "explanation": "a big-ticket purchase: A very expensive item. [cite: 204]",
            "theme": "The Men Who Made Us Spend"
        },
        {
            "question": "Un 'double whammy' décrit une seule chose positive qui arrive.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [1],
            "explanation": "a double whammy: Two negative effects happening at the same time (une double peine). [cite: 206]",
            "theme": "The Men Who Made Us Spend"
        },
        {
            "question": "Que veut dire 'a sense of belonging' ?",
            "qcmMode": "multi",
            "answers": ["Un sentiment de rejet", "Un sentiment d'appartenance (être accepté)", "L'envie de posséder", "La perte de ses affaires"],
            "correctAnswers": [1],
            "explanation": "a sense of belonging: Feeling accepted and included. [cite: 208]",
            "theme": "The Men Who Made Us Spend"
        },
        {
            "question": "L'adjectif 'acute' signifie léger ou sans importance.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [1],
            "explanation": "acute: Severe or intense (sévère, intense). [cite: 210]",
            "theme": "The Men Who Made Us Spend"
        },
        {
            "question": "Que signifie le verbe 'address' ?",
            "qcmMode": "multi",
            "answers": ["Mettre une lettre à la poste", "Faire face ou traiter un problème particulier", "S'habiller", "Ignorer"],
            "correctAnswers": [1],
            "explanation": "address: To deal with or speak about a particular issue. [cite: 212]",
            "theme": "The Men Who Made Us Spend"
        },
        {
            "question": "Une 'advertisement' est une annonce publique pour promouvoir un produit.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [0],
            "explanation": "advertisement: A public notice promoting a product or service. [cite: 214]",
            "theme": "The Men Who Made Us Spend"
        },
        {
            "question": "Qu'est-ce qu'une 'assembly line' ?",
            "qcmMode": "multi",
            "answers": ["Une ligne de code", "Une ligne d'attente", "Une chaîne de montage", "Une réunion politique"],
            "correctAnswers": [2],
            "explanation": "assembly line: A manufacturing process where a product is put together in a sequence. [cite: 216]",
            "theme": "The Men Who Made Us Spend"
        },
        {
            "question": "'Awestruck' signifie être rempli d'émerveillement ou de stupéfaction.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [0],
            "explanation": "awestruck: Filled with amazement or wonder. [cite: 218]",
            "theme": "The Men Who Made Us Spend"
        },
        {
            "question": "Que sont des 'belongings' ?",
            "qcmMode": "multi",
            "answers": ["Des membres de la famille", "Des possessions personnelles (des affaires)", "Des sentiments de tristesse", "Des désirs"],
            "correctAnswers": [1],
            "explanation": "belongings: Personal possessions. [cite: 219]",
            "theme": "The Men Who Made Us Spend"
        },
        {
            "question": "La 'bleakness' est un état plein d'espoir et de promesses.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [1],
            "explanation": "bleakness: A state of being hopeless, empty, or without promise (morosité). [cite: 221]",
            "theme": "The Men Who Made Us Spend"
        },
        {
            "question": "Que veut dire le verbe 'blame' ?",
            "qcmMode": "multi",
            "answers": ["Louer quelqu'un", "Tenir quelqu'un pour responsable d'une faute (blâmer)", "Ignorer", "Aimer"],
            "correctAnswers": [1],
            "explanation": "blame: To hold someone responsible for a fault or mistake. [cite: 223]",
            "theme": "The Men Who Made Us Spend"
        },
        {
            "question": "L'adjectif 'blunt' décrit quelqu'un de direct, qui dit les choses sans prendre de gants.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [0],
            "explanation": "blunt: Direct and without sugar-coating; not sharp. [cite: 224]",
            "theme": "The Men Who Made Us Spend"
        },
        {
            "question": "Que signifie 'brand-new' ?",
            "qcmMode": "multi",
            "answers": ["Une vieille marque", "Totalement neuf et jamais utilisé", "Très connu", "Un produit de luxe"],
            "correctAnswers": [1],
            "explanation": "brand-new: Completely new and unused. [cite: 225]",
            "theme": "The Men Who Made Us Spend"
        },
        {
            "question": "'Clunky' veut dire léger et très rapide.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [1],
            "explanation": "clunky: Heavy, awkward, or outdated (maladroit, lourd). [cite: 226]",
            "theme": "The Men Who Made Us Spend"
        },
        {
            "question": "Que signifie le verbe 'discard' ?",
            "qcmMode": "multi",
            "answers": ["Jouer aux cartes", "Jeter ou se débarrasser de quelque chose d'inutile", "Acheter en masse", "Garder précieusement"],
            "correctAnswers": [1],
            "explanation": "discard: To throw away or get rid of something that is no longer needed. [cite: 227]",
            "theme": "The Men Who Made Us Spend"
        },
        {
            "question": "Le mot 'dishes' désigne les assiettes, bols et ustensiles utilisés pour la nourriture.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [0],
            "explanation": "dishes: Plates, bowls, and utensils used for serving food. [cite: 229]",
            "theme": "The Men Who Made Us Spend"
        },
        {
            "question": "Que veut dire 'dumbfounded' ?",
            "qcmMode": "multi",
            "answers": ["Être très surpris ou choqué (abasourdi)", "Être très intelligent", "Ne pas pouvoir parler", "Trouver quelque chose"],
            "correctAnswers": [0],
            "explanation": "dumbfounded: Greatly surprised or shocked. [cite: 230]",
            "theme": "The Men Who Made Us Spend"
        },
        {
            "question": "Le verbe 'dispose' signifie se débarrasser de quelque chose.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [0],
            "explanation": "dispose: To get rid of something, often in a specific way. [cite: 231]",
            "theme": "The Men Who Made Us Spend"
        },
        {
            "question": "Que signifie 'eco-friendly' ?",
            "qcmMode": "multi",
            "answers": ["Un ami de l'économie", "Pas cher", "Non nocif pour l'environnement (écolo)", "Un sac en plastique"],
            "correctAnswers": [2],
            "explanation": "eco-friendly: Not harmful to the environment. [cite: 232]",
            "theme": "The Men Who Made Us Spend"
        },
        {
            "question": "Le verbe 'emphasize' signifie donner une importance particulière à quelque chose (souligner).",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [0],
            "explanation": "emphasize: To give special importance to something in speech or writing. [cite: 234]",
            "theme": "The Men Who Made Us Spend"
        },
        {
            "question": "Que veut dire l'expression 'fix (prices)' ?",
            "qcmMode": "multi",
            "answers": ["Réparer une étiquette", "S'entendre illégalement sur les prix avec la concurrence", "Baisser les prix", "Augmenter les salaires"],
            "correctAnswers": [1],
            "explanation": "fix (prices): To illegally agree on a price with competitors instead of allowing market competition. [cite: 236]",
            "theme": "The Men Who Made Us Spend"
        },
        {
            "question": "Le mot 'furniture' (mobilier) inclut les tables, chaises et canapés.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [0],
            "explanation": "furniture: Objects like tables, chairs, and sofas used in a home or office. [cite: 238]",
            "theme": "The Men Who Made Us Spend"
        },
        {
            "question": "Que signifie la phrase 'grab what you can' ?",
            "qcmMode": "multi",
            "answers": ["Prendre son temps", "Attraper tout ce qui est possible le plus vite possible", "Partager avec les autres", "Mettre dans une boîte"],
            "correctAnswers": [1],
            "explanation": "grab what you can: Take as much as possible quickly. [cite: 240]",
            "theme": "The Men Who Made Us Spend"
        },
        {
            "question": "Le verbe 'halt' veut dire accélérer la cadence.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [1],
            "explanation": "halt: To stop or bring something to an end (stopper). [cite: 242]",
            "theme": "The Men Who Made Us Spend"
        },
        {
            "question": "Que signifie 'hard-wired' ?",
            "qcmMode": "multi",
            "answers": ["Un fil très dur", "Programmé instinctivement dans une personne ou un système", "Un problème informatique", "Une connexion internet"],
            "correctAnswers": [1],
            "explanation": "hard-wired: Instinctively present in a person or system. [cite: 243]",
            "theme": "The Men Who Made Us Spend"
        },
        {
            "question": "Un 'herd' est un groupe d'animaux qui se déplacent ensemble (un troupeau).",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [0],
            "explanation": "herd: A group of animals, such as cattle or sheep, that move together. [cite: 245]",
            "theme": "The Men Who Made Us Spend"
        },
        {
            "question": "Que veut dire 'long-lasting' ?",
            "qcmMode": "multi",
            "answers": ["Très grand", "Durable dans le temps", "La fin de quelque chose", "Rapide"],
            "correctAnswers": [1],
            "explanation": "long-lasting: Durable and enduring over time. [cite: 247]",
            "theme": "The Men Who Made Us Spend"
        },
        {
            "question": "Le 'peak' est le point le plus bas de quelque chose.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [1],
            "explanation": "peak: The highest point of something (le sommet). [cite: 249]",
            "theme": "The Men Who Made Us Spend"
        },
        {
            "question": "Que signifie l'adjectif 'perpetual' ?",
            "qcmMode": "multi",
            "answers": ["Temporaire", "Qui s'arrête vite", "Qui continue indéfiniment (perpétuel)", "Bruyant"],
            "correctAnswers": [2],
            "explanation": "perpetual: Continuing indefinitely. [cite: 251]",
            "theme": "The Men Who Made Us Spend"
        },
        {
            "question": "Le mot 'pinnacle' désigne le point de réussite le plus haut ou l'achèvement suprême (l'apogée).",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [0],
            "explanation": "pinnacle: The most successful point or highest achievement. [cite: 253]",
            "theme": "The Men Who Made Us Spend"
        },
        {
            "question": "Comment traduis-tu 'relentless' ?",
            "qcmMode": "multi",
            "answers": ["Détendu", "Implacable, qui ne cède pas (incessant)", "Paresseux", "Fragile"],
            "correctAnswers": [1],
            "explanation": "relentless: Unyielding and constant. [cite: 255]",
            "theme": "The Men Who Made Us Spend"
        },
        {
            "question": "L'adjectif 'sleek' signifie rugueux et ancien.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [1],
            "explanation": "sleek: Smooth, stylish, and modern (élégant, profilé). [cite: 257]",
            "theme": "The Men Who Made Us Spend"
        },
        {
            "question": "Qu'est-ce qu'un 'stencil' ?",
            "qcmMode": "multi",
            "answers": ["Un crayon", "Un pochoir utilisé pour créer un motif", "Une feuille de papier", "Un pot de peinture"],
            "correctAnswers": [1],
            "explanation": "stencil: A template used to create a design or pattern. [cite: 259]",
            "theme": "The Men Who Made Us Spend"
        },
        {
            "question": "Le verbe 'strew' (ou stew dans le texte, mais strew selon l'exemple) signifie éparpiller des choses de manière désordonnée.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [0],
            "explanation": "strew: To scatter or spread things untidily. [cite: 261]",
            "theme": "The Men Who Made Us Spend"
        },
        {
            "question": "Qu'est-ce qu'un 'stool' ?",
            "qcmMode": "multi",
            "answers": ["Un tabouret (siège sans dossier)", "Un outil de jardinage", "Une table basse", "Un tapis"],
            "correctAnswers": [0],
            "explanation": "stool: A simple seat without a back or arms. [cite: 263]",
            "theme": "The Men Who Made Us Spend"
        },
        {
            "question": "Le verbe 'struggle' veut dire réussir facilement sans effort.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [1],
            "explanation": "struggle: To try very hard to do something difficult (lutter). [cite: 265]",
            "theme": "The Men Who Made Us Spend"
        },
        {
            "question": "Que veut dire 'supercharged' ?",
            "qcmMode": "multi",
            "answers": ["Sans batterie", "Très cher", "Intensément puissant ou amélioré (survolté)", "Lent"],
            "correctAnswers": [2],
            "explanation": "supercharged: Intensely powerful or enhanced. [cite: 267]",
            "theme": "The Men Who Made Us Spend"
        },
        {
            "question": "Un 'suit' est un ensemble de vêtements assortis, généralement porté pour des occasions formelles (un costume).",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [0],
            "explanation": "suit: A set of matching clothes, typically worn for formal occasions. [cite: 269]",
            "theme": "The Men Who Made Us Spend"
        },
        {
            "question": "Que signifie 'sustainability' ?",
            "qcmMode": "multi",
            "answers": ["La destruction", "La capacité de se maintenir sans nuire à l'environnement (durabilité)", "La vitesse", "La consommation"],
            "correctAnswers": [1],
            "explanation": "sustainability: The ability to maintain something over time without harming the environment. [cite: 271]",
            "theme": "The Men Who Made Us Spend"
        },
        {
            "question": "L'expression 'to be penned in' signifie être totalement libre.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [1],
            "explanation": "to be penned in: To be confined or restricted (être parqué/enfermé). [cite: 273]",
            "theme": "The Men Who Made Us Spend"
        },
        {
            "question": "Que veut dire 'to chime with something' ?",
            "qcmMode": "multi",
            "answers": ["Sonner une cloche", "Correspondre ou être en accord avec quelque chose", "Casser quelque chose", "Se disputer"],
            "correctAnswers": [1],
            "explanation": "to chime with something: To match or agree with something. [cite: 275]",
            "theme": "The Men Who Made Us Spend"
        },
        {
            "question": "Le verbe 'toil' signifie travailler extrêmement dur, souvent dans des conditions difficiles (trimer).",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [0],
            "explanation": "toil: To work extremely hard, often in difficult conditions. [cite: 277]",
            "theme": "The Men Who Made Us Spend"
        },
        {
            "question": "Que signifie 'to keep something on the rails' ?",
            "qcmMode": "multi",
            "answers": ["Prendre le train", "Faire dérailler un projet", "S'assurer que quelque chose continue à bien se dérouler", "Laisser tomber"],
            "correctAnswers": [2],
            "explanation": "to keep something on the rails: To ensure something continues smoothly. [cite: 279]",
            "theme": "The Men Who Made Us Spend"
        },
        {
            "question": "L'expression 'to lay the foundations' veut dire établir la base pour quelque chose (poser les fondations).",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [0],
            "explanation": "to lay the foundations: To establish the basis for something. [cite: 281]",
            "theme": "The Men Who Made Us Spend"
        },
        {
            "question": "Que veut dire 'to square the circle' ?",
            "qcmMode": "multi",
            "answers": ["Dessiner des formes", "Tenter d'accomplir quelque chose qui semble impossible (la quadrature du cercle)", "Tourner en rond", "Faire du sport"],
            "correctAnswers": [1],
            "explanation": "to square the circle: To achieve something seemingly impossible. [cite: 283]",
            "theme": "The Men Who Made Us Spend"
        },
        {
            "question": "Un 'trailblazer' est un pionnier ou un innovateur dans un domaine particulier.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [0],
            "explanation": "trailblazer: A pioneer or innovator in a particular field. [cite: 285]",
            "theme": "The Men Who Made Us Spend"
        },
        {
            "question": "Qu'est-ce que le 'turnover' ?",
            "qcmMode": "multi",
            "answers": ["Se retourner dans son lit", "Le taux de renouvellement des employés ou le chiffre d'affaires", "Un vêtement d'hiver", "Une voiture décapotable"],
            "correctAnswers": [1],
            "explanation": "turnover: The rate at which employees leave and are replaced or the total revenue of a business. [cite: 287]",
            "theme": "The Men Who Made Us Spend"
        },
        {
            "question": "Le verbe 'usher in' veut dire marquer le début de quelque chose de nouveau.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [0],
            "explanation": "usher in: To mark the beginning of something new. [cite: 289]",
            "theme": "The Men Who Made Us Spend"
        },
        {
            "question": "Que signifie 'wage' ?",
            "qcmMode": "multi",
            "answers": ["Un pari", "Le salaire payé à un travailleur", "Une guerre", "Une blague"],
            "correctAnswers": [1],
            "explanation": "wage: The money paid to a worker for their labor. [cite: 291]",
            "theme": "The Men Who Made Us Spend"
        },
        {
            "question": "Une 'assumption' est une croyance ou une idée acceptée comme vraie sans preuve.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [0],
            "explanation": "assumption: A belief or idea accepted as true without proof. [cite: 296]",
            "theme": "Piper in the Woods"
        },
        {
            "question": "Que désigne le mot 'bank' (en rapport avec l'eau) ?",
            "qcmMode": "multi",
            "answers": ["Une institution financière", "La terre le long d'une rivière (la rive)", "Un bateau", "Un pont"],
            "correctAnswers": [1],
            "explanation": "bank: The land alongside a river. [cite: 298]",
            "theme": "Piper in the Woods"
        },
        {
            "question": "L'adjectif 'beefy' signifie grand, fort et musclé.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [0],
            "explanation": "beefy: Large, strong, or muscular. [cite: 300]",
            "theme": "Piper in the Woods"
        },
        {
            "question": "Que veut dire le verbe 'blink' ?",
            "qcmMode": "multi",
            "answers": ["Regarder fixement", "Ouvrir et fermer les yeux rapidement (cligner)", "Crier", "Dormir"],
            "correctAnswers": [1],
            "explanation": "blink: To quickly open and close the eyes. [cite: 302]",
            "theme": "Piper in the Woods"
        },
        {
            "question": "L'adjectif 'bulging' veut dire qui gonfle ou ressort vers l'extérieur.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [0],
            "explanation": "bulging: Swelling outward. [cite: 304]",
            "theme": "Piper in the Woods"
        },
        {
            "question": "Qu'est-ce qu'un 'bunk' ?",
            "qcmMode": "multi",
            "answers": ["Un coffre", "Un lit étroit, souvent superposé", "Une armoire", "Un tapis"],
            "correctAnswers": [1],
            "explanation": "bunk: A narrow bed, often one stacked over another. [cite: 306]",
            "theme": "Piper in the Woods"
        },
        {
            "question": "Le verbe 'clasp' veut dire lâcher prise.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [1],
            "explanation": "clasp: To grip tightly. [cite: 308]",
            "theme": "Piper in the Woods"
        },
        {
            "question": "Que signifie 'cram' ?",
            "qcmMode": "multi",
            "answers": ["Prendre son temps", "Fourrer dans un petit espace ou étudier intensément (bachoter)", "Crier", "Manger de la confiture"],
            "correctAnswers": [1],
            "explanation": "cram: To stuff something into a small space or to study intensely in a short time. [cite: 310]",
            "theme": "Piper in the Woods"
        },
        {
            "question": "Un 'cruiser' est un gros navire ou véhicule conçu pour voyager.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [0],
            "explanation": "cruiser: A large vehicle or ship designed for travel. [cite: 312]",
            "theme": "Piper in the Woods"
        },
        {
            "question": "Que veut dire 'damp' ?",
            "qcmMode": "multi",
            "answers": ["Complètement sec", "Légèrement humide ou mouillé", "Très chaud", "Brillant"],
            "correctAnswers": [1],
            "explanation": "damp: Slightly wet or moist. [cite: 314]",
            "theme": "Piper in the Woods"
        },
        {
            "question": "L'adjectif 'dim' signifie qui n'est pas clair ou très peu lumineux.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [0],
            "explanation": "dim: Not bright or clear. [cite: 316]",
            "theme": "Piper in the Woods"
        },
        {
            "question": "Que signifie le verbe 'doze' ?",
            "qcmMode": "multi",
            "answers": ["Travailler dur", "Dormir légèrement (somnoler)", "Courir vite", "Prendre une dose"],
            "correctAnswers": [1],
            "explanation": "doze: To sleep lightly. [cite: 318]",
            "theme": "Piper in the Woods"
        },
        {
            "question": "Une 'fern' est une plante verte avec des feuilles qui ressemblent à des plumes (une fougère).",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [0],
            "explanation": "fern: A green plant with feathery leaves. [cite: 320]",
            "theme": "Piper in the Woods"
        },
        {
            "question": "Que veut dire 'fidget' ?",
            "qcmMode": "multi",
            "answers": ["Bouger sans cesse à cause de la nervosité ou de l'ennui (gigoter)", "Faire un tour de magie", "S'asseoir calmement", "Cuisiner"],
            "correctAnswers": [0],
            "explanation": "fidget: To move restlessly out of nervousness or boredom. [cite: 322]",
            "theme": "Piper in the Woods"
        },
        {
            "question": "Le verbe 'glide' signifie bouger de manière fluide et sans effort (glisser).",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [0],
            "explanation": "glide: To move smoothly and effortlessly. [cite: 324]",
            "theme": "Piper in the Woods"
        },
        {
            "question": "Que signifie 'grim' ?",
            "qcmMode": "multi",
            "answers": ["Joyeux", "Coloré", "Sérieux, sombre ou sévère", "Léger"],
            "correctAnswers": [2],
            "explanation": "grim: Serious, gloomy, or harsh. [cite: 326]",
            "theme": "Piper in the Woods"
        },
        {
            "question": "Un 'grove' désigne un grand océan.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [1],
            "explanation": "grove: A small cluster of trees (un bosquet). [cite: 328]",
            "theme": "Piper in the Woods"
        },
        {
            "question": "Qu'est-ce qu'une 'gully' ?",
            "qcmMode": "multi",
            "answers": ["Une mouette", "Un fossé ou ravin causé par l'érosion de l'eau", "Une montagne", "Une plage"],
            "correctAnswers": [1],
            "explanation": "gully: A deep ditch or channel caused by water erosion. [cite: 330]",
            "theme": "Piper in the Woods"
        },
        {
            "question": "Un 'hatch' est une petite ouverture avec souvent une porte ou un couvercle (une trappe).",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [0],
            "explanation": "hatch: A small opening, often with a door or cover. [cite: 332]",
            "theme": "Piper in the Woods"
        },
        {
            "question": "Que veut dire 'interwoven' ?",
            "qcmMode": "multi",
            "answers": ["Connecté étroitement ou entremêlé", "Complètement séparé", "Très rapide", "Brouillé"],
            "correctAnswers": [0],
            "explanation": "interwoven: Closely connected or blended together. [cite: 333]",
            "theme": "Piper in the Woods"
        },
        {
            "question": "La 'jaw' est la mâchoire (partie inférieure du visage qui bouge).",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [0],
            "explanation": "jaw: The lower part of the face that moves when talking or chewing. [cite: 335]",
            "theme": "Piper in the Woods"
        },
        {
            "question": "Qu'est-ce qu'un 'load' ?",
            "qcmMode": "multi",
            "answers": ["Un jeu", "Une lourde quantité portée ou transportée (un chargement)", "Une route", "Un morceau de pain"],
            "correctAnswers": [1],
            "explanation": "load: A heavy amount of something that is carried or transported. [cite: 337]",
            "theme": "Piper in the Woods"
        },
        {
            "question": "Une 'meadow' est un parking recouvert de ciment.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [1],
            "explanation": "meadow: A grassy field, often filled with flowers (une prairie). [cite: 339]",
            "theme": "Piper in the Woods"
        },
        {
            "question": "Que sont les 'quarters' dans un contexte militaire ?",
            "qcmMode": "multi",
            "answers": ["Des pièces de monnaie", "Un espace de vie, un quartier de résidence", "Une période de temps", "Des armes"],
            "correctAnswers": [1],
            "explanation": "quarters: Living space, typically for military or workers. [cite: 341]",
            "theme": "Piper in the Woods"
        },
        {
            "question": "L'adjectif 'repressed' signifie retenu ou réprimé (souvent pour des émotions).",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [0],
            "explanation": "repressed: Held back or restrained, often referring to emotions. [cite: 343]",
            "theme": "Piper in the Woods"
        },
        {
            "question": "Qu'est-ce qu'un 'scrawl' ?",
            "qcmMode": "multi",
            "answers": ["Un rire bruyant", "Une écriture désordonnée et hâtive (un gribouillage)", "Un insecte", "Un tissu fin"],
            "correctAnswers": [1],
            "explanation": "scrawl: Messy or hurried handwriting. [cite: 345]",
            "theme": "Piper in the Woods"
        },
        {
            "question": "Le verbe 'scramble' veut dire marcher de manière très gracieuse.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [1],
            "explanation": "scramble: To move quickly or clumsily, often in a hurry. [cite: 347]",
            "theme": "Piper in the Woods"
        },
        {
            "question": "Que signifie 'settle one's affairs' ?",
            "qcmMode": "multi",
            "answers": ["Mettre de l'ordre dans ses affaires personnelles ou financières", "Commencer un business", "Partir en vacances", "Se disputer"],
            "correctAnswers": [0],
            "explanation": "settle one's affairs: To organize one's personal or financial matters. [cite: 349]",
            "theme": "Piper in the Woods"
        },
        {
            "question": "L'adjectif 'sparkling' signifie étincelant, produisant de petits éclairs de lumière.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [0],
            "explanation": "sparkling: Shining or giving off tiny flashes of light. [cite: 351]",
            "theme": "Piper in the Woods"
        },
        {
            "question": "Que veut dire le verbe 'stride' ?",
            "qcmMode": "multi",
            "answers": ["Tomber", "Marcher à grands pas confiants", "Ramper", "Sauter"],
            "correctAnswers": [1],
            "explanation": "stride: To walk with long, confident steps. [cite: 352]",
            "theme": "Piper in the Woods"
        },
        {
            "question": "L'adjectif 'sunk' veut dire fermement intégré ou affaissé vers l'intérieur (enfoncé/coulé).",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [0],
            "explanation": "sunk: Deeply embedded or collapsed inward. [cite: 353]",
            "theme": "Piper in the Woods"
        },
        {
            "question": "Que signifie 'supple' ?",
            "qcmMode": "multi",
            "answers": ["Rigide", "En colère", "Flexible et capable de bouger facilement (souple)", "Fatigué"],
            "correctAnswers": [2],
            "explanation": "supple: Flexible and able to move easily. [cite: 354]",
            "theme": "Piper in the Woods"
        },
        {
            "question": "Faire quelque chose 'on short notice' signifie le faire avec beaucoup de préparation.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [1],
            "explanation": "to do something on short notice: To act with little warning or preparation. [cite: 356]",
            "theme": "Piper in the Woods"
        },
        {
            "question": "Que veut dire 'to pace back and forth' ?",
            "qcmMode": "multi",
            "answers": ["Marcher en rythme militaire", "Faire les cent pas (à cause de l'inquiétude)", "Courir un marathon", "S'arrêter et démarrer"],
            "correctAnswers": [1],
            "explanation": "to pace back and forth: To walk repeatedly in one direction and then the opposite due to worry or impatience. [cite: 358]",
            "theme": "Piper in the Woods"
        },
        {
            "question": "L'expression 'to play hooky' signifie sécher les cours ou le travail sans permission.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [0],
            "explanation": "to play hooky: To skip school or work without permission. [cite: 360]",
            "theme": "Piper in the Woods"
        },
        {
            "question": "Que veut dire 'to poke around' ?",
            "qcmMode": "multi",
            "answers": ["Pousser fort", "Chercher ou fouiller de manière curieuse", "Se cacher", "Sauter sur place"],
            "correctAnswers": [1],
            "explanation": "to poke around: To search casually or curiously. [cite: 362]",
            "theme": "Piper in the Woods"
        },
        {
            "question": "Un 'whir' est un gros boom sonore.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [1],
            "explanation": "whir: A low, continuous buzzing or humming sound (un bourdonnement). [cite: 363]",
            "theme": "Piper in the Woods"
        },
        {
            "question": "Que veut dire le verbe 'wind' dans ce contexte ?",
            "qcmMode": "multi",
            "answers": ["Le vent", "Tordre ou enrouler quelque chose", "Crier", "Aider"],
            "correctAnswers": [1],
            "explanation": "wind: To twist or wrap something around another object. [cite: 364]",
            "theme": "Piper in the Woods"
        },
        {
            "question": "L'adjectif 'worthwhile' décrit une expérience qui vaut la peine, précieuse ou gratifiante.",
            "qcmMode": "tf",
            "answers": ["Vrai", "Faux"],
            "correctAnswers": [0],
            "explanation": "worthwhile: Valuable or rewarding. [cite: 365]",
            "theme": "Piper in the Woods"
        },
        {
            "question": "Que signifie le verbe 'yawn' ?",
            "qcmMode": "multi",
            "answers": ["Crier de douleur", "Ouvrir grand la bouche par fatigue ou ennui (bâiller)", "Manger bruyamment", "Fermer les yeux"],
            "correctAnswers": [1],
            "explanation": "yawn: To open one's mouth wide due to tiredness or boredom. [cite: 366]",
            "theme": "Piper in the Woods"
        }
    ]
    },
    {
        id: 'default-probas',
        title: 'Probas',
        type: 'flashcard',
        gradient: GRADIENTS[1].class,
        order: -2,
        isPublic: true,
        cards: [
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
    { question: "7. Corrélation définition:", answer: "Si $\\sigma_{X} > 0$ et $\\sigma_{Y} > 0,$ le coefficient de corrélation est $\\rho_{X,Y}=\\frac{Cov(X,Y)}{\\sigma_{X} \\sigma_{Y}},$ et vérifie $-1 \\le \\rho_{X,Y} \\le 1.$", theme: "Probas : Couples de variables aléatoires discrètes" }
        ]
    },
    {
        id: 'default-derint',
        title: 'Dér & Int',
        type: 'flashcard',
        gradient: GRADIENTS[2].class,
        order: -1,
        isPublic: true,
        cards: [
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
    }
];

// --- DATA MANAGEMENT ---

function generateId() { return Math.random().toString(36).substr(2, 9); }

function loadData() {
    const storedDecks = localStorage.getItem(STORAGE_KEY_DECKS);
    const storedCards = localStorage.getItem(STORAGE_KEY_CARDS);
    const storedPrefs = localStorage.getItem(PREFS_KEY);
    const storedColors = localStorage.getItem(THEME_COLORS_KEY);

    // No more seed check (always verify default decks exist)

    if (storedPrefs) {
        try {
            const prefs = JSON.parse(storedPrefs);
            currentSortMode = prefs.sortMode || 'date';
            isCustomSortMode = currentSortMode === 'custom';
        } catch (e) { /* ignore corrupt prefs */ }
    }

    if (storedColors) {
        try { themeColors = JSON.parse(storedColors); } catch (e) { themeColors = {}; }
    }

    if (storedDecks && storedCards) {
        try {
            decks = JSON.parse(storedDecks);
            cards = JSON.parse(storedCards);
        } catch (e) {
            decks = [];
            cards = [];
        }
    } else {
        decks = [];
        cards = [];
    }

    // Default Decks Seeding
    DEFAULT_DECKS_CONFIG.forEach(deckConf => {
            // Check if deck already exists
            let existingDeck = decks.find(d => d.id === deckConf.id);
            if (!existingDeck) {
                existingDeck = {
                    id: deckConf.id,
                    title: deckConf.title,
                    type: deckConf.type || 'flashcard',
                    gradient: deckConf.gradient,
                    createdAt: Date.now(),
                    isPublic: deckConf.isPublic,
                    order: deckConf.order
                };
                decks.push(existingDeck);
            }
            
            deckConf.cards.forEach(item => {
                const exists = cards.find(c => c.question === item.question && c.deckId === deckConf.id);
                if (!exists) {
                    const newCard = {
                        id: generateId(),
                        deckId: deckConf.id,
                        question: item.question,
                        answer: item.answer || item.explanation || '',
                        theme: item.theme,
                        isLearned: false,
                        validationStatus: 'unlearned',
                        createdAt: Date.now(),
                        order: cards.length
                    };
                    // QCM-specific fields
                    if (item.qcmMode) newCard.qcmMode = item.qcmMode;
                    if (item.answers) newCard.answers = item.answers;
                    if (item.correctAnswers) newCard.correctAnswers = item.correctAnswers;
                    if (item.explanation !== undefined) newCard.explanation = item.explanation;
                    if (item.qcmMode) newCard.selectedAnswers = [];
                    cards.push(newCard);
                }
            });
        });
        saveDataNow();

    cards.forEach((c, i) => { if (typeof c.order === 'undefined') c.order = i; });
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
    createIconsIn(toast);

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
    // Initialize KaTeX observer
    initCardVisibilityObserver();
    renderView();
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.context-menu-trigger') && !e.target.closest('.context-menu')) closeAllContextMenus();
    });
    // Save data before unload
    window.addEventListener('beforeunload', saveDataNow);
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
            const emptyState = document.createElement('div');
            emptyState.className = "flex flex-col items-center justify-center py-12 text-slate-500 opacity-60";
            emptyState.innerHTML = `<p>Vous n'avez pas encore de bloc personnel.</p>`;
            container.appendChild(emptyState);
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
        const correctCount = deckCards.filter(c => deck.type === 'qcm' ? c.validationStatus === 'correct' : c.isLearned).length;
        const incorrectCount = deckCards.filter(c => deck.type === 'qcm' && c.validationStatus === 'incorrect').length;
        const totalCount = deckCards.length;
        
        const greenPct = totalCount > 0 ? (correctCount / totalCount) * 100 : 0;
        const redPct = totalCount > 0 ? (incorrectCount / totalCount) * 100 : 0;

        // Stats + Import/Export Buttons
        container.innerHTML += `
            <div class="mb-8 flex flex-col md:flex-row gap-6 animate-fade-in">
                <div class="flex-grow flex items-center justify-between p-6 bg-slate-900/50 border border-slate-800 rounded-2xl">
                    <div>
                        <h3 class="text-lg font-bold text-white flex items-center gap-2">Progression Globale</h3>
                        <p id="deck-stats-text" class="text-slate-400 text-sm mt-1"> ${deck.type === 'qcm' ? (correctCount + incorrectCount) : correctCount} sur ${totalCount} ${deck.type === 'qcm' ? 'cartes étudiées' : 'cartes maîtrisées'}</p>
                        ${deck.type === 'qcm' ? `<div id="deck-stats-qcm" class="text-xs mt-1 font-medium hidden md:block"><span class="text-emerald-400">${correctCount} bonnes</span>  |  <span class="text-red-400">${incorrectCount} mauvaises</span></div>` : ''}
                    </div>
                    <div class="relative w-16 h-16 flex items-center justify-center shrink-0">
                        <svg class="w-full h-full rotate-[-90deg]" viewBox="0 0 36 36">
                            <path class="text-slate-800" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke-width="3" />
                            <path id="deck-stats-ring-green" class="text-emerald-500 transition-all duration-1000 ease-out" stroke-dasharray="${greenPct}, 100" stroke-dashoffset="0" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" stroke-width="3" />
                            <path id="deck-stats-ring-red" class="text-red-500 transition-all duration-1000 ease-out" stroke-dasharray="${redPct}, 100" stroke-dashoffset="-${greenPct}" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" stroke-width="3" />
                        </svg> <span id="deck-stats-pct" class="absolute text-xs font-bold text-white">${Math.round(deck.type === 'qcm' ? (greenPct + redPct) : greenPct)}%</span>
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
                // Escape theme name for use in onclick handlers
                const escapedTheme = theme.replace(/'/g, "\\'");
                themeSection.innerHTML = `
                    <div class="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 border-b border-slate-800 pb-4 sticky top-[72px] bg-[#0f172a]/95 backdrop-blur z-30 py-4 -mx-2 px-2">
                        <div class="flex items-center gap-3">
                            <span class="w-2 h-8 rounded-full ${themeColor} shadow-[0_0_10px_rgba(0,0,0,0.5)]"></span>
                            <h2 class="text-xl font-bold text-white tracking-tight">${theme}</h2>
                            <span class="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-xs font-medium border border-slate-700">${themeCards.length}</span>
                        </div>
                        <div class="flex items-center gap-2 w-full md:w-auto flex-wrap">
                            <button onclick="startLearningMode('${escapedTheme}')" class="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg shadow-lg shadow-indigo-500/20 transition-all">
                                <i data-lucide="play-circle" class="w-4 h-4"></i> <span>Apprendre</span>
                            </button>
                            <button onclick="toggleAllTheme('${escapedTheme}')" class="p-2 bg-slate-800 text-slate-300 rounded-lg ${deck.type === 'qcm' ? 'hover:bg-amber-900/30 hover:text-amber-400' : 'hover:bg-emerald-900/30 hover:text-emerald-400'} transition" title="${deck.type === 'qcm' ? 'Tout réinitialiser' : (themeCards.every(c => c.isLearned) ? 'Tout dévalider' : 'Tout valider')}">
                                <i data-lucide="${(deck.type === 'qcm' || themeCards.every(c => c.isLearned)) ? 'rotate-ccw' : 'check-circle'}" class="w-4 h-4"></i>
                            </button>
                            <button onclick="shuffleTheme('${escapedTheme}')" class="p-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition" title="Mélanger"><i data-lucide="shuffle" class="w-4 h-4"></i></button>
                            <button onclick="emptyThemeTrash('${escapedTheme}')" class="p-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-red-900/30 hover:text-red-400 transition" title="Vider"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                            <div class="relative flex-grow md:flex-grow-0 md:w-48 ml-2">
                                <input type="text" placeholder="Rechercher..." oninput="filterCards(this.value, '${escapedTheme}')" class="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg pl-8 p-2">
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
                    const cardEl = createCardSkeleton(card);
                    grid.appendChild(cardEl);
                    // Observer will inflate skeleton to full card when near viewport
                    observeForKatex(cardEl);
                });

                themeSection.appendChild(grid);
                listContainer.appendChild(themeSection);
            });
            container.appendChild(listContainer);
        }

        // NO batch KaTeX here — handled by IntersectionObserver per card

        fabContainer.innerHTML = `
            <button onclick="openModal('card')" class="group relative flex items-center justify-center gap-3 pl-6 pr-7 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-2xl shadow-emerald-900/60 transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0 active:scale-95 border border-white/10 hover:border-white/30 whitespace-nowrap">
                <div class="absolute inset-0 rounded-full bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
                <i data-lucide="plus" class="w-6 h-6"></i>
                <span class="font-bold">Ajouter une carte</span>
            </button>
        `;
    }
    createIconsIn(container);
    createIconsIn(fabContainer);
    createIconsIn(document.getElementById('nav-action'));
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
        deckCard.className = `group relative h-48 rounded-2xl p-6 flex flex-col justify-between cursor-pointer transition-all duration-300 hover:scale-[1.02] shadow-xl hover:shadow-2xl border border-white/10 bg-gradient-to-br ${deck.gradient} ${isCustomSortMode ? 'hover:border-indigo-400/50' : ''}`;
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
        const studiedCount = cards.filter(c => c.deckId === deck.id && (deck.type === 'qcm' ? c.validationStatus !== 'unlearned' : c.isLearned)).length;
        const progress = cardCount > 0 ? Math.round((studiedCount / cardCount) * 100) : 0;

        deckCard.innerHTML = `
            <div class="absolute inset-0 rounded-2xl bg-black/10 group-hover:bg-transparent transition-colors"></div>
            
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
                    <button onclick="downloadDeckDirectly('${deck.id}')" class="w-full text-left px-4 py-2.5 text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"><i data-lucide="download" class="w-4 h-4"></i> Télécharger</button>
                    <div class="h-px bg-slate-800"></div>
                    <button onclick="deleteDeck('${deck.id}')" class="w-full text-left px-4 py-2.5 text-red-400 hover:bg-red-900/30 flex items-center gap-2"><i data-lucide="trash" class="w-4 h-4"></i> Supprimer</button>
                </div>
            </div>

            <div class="relative z-10 pointer-events-none">
                <div class="flex items-center gap-2 mb-1">
                    <h3 class="text-2xl font-bold text-white shadow-black/50 drop-shadow-md">${deck.title}</h3>
                    <span class="text-[10px] bg-black/30 text-white/70 px-2 py-0.5 rounded-md uppercase tracking-widest font-bold border border-white/10">${deck.type === 'qcm' ? 'QCM' : 'Flashcards'}</span>
                </div>
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

    // Allow dropping on any card
    cardWrapper.ondragover = (e) => handleDragOver(e, card.id, 'card');
    cardWrapper.ondrop = (e) => handleDrop(e, card.id, 'card');
    
    // The actual dragging is initiated by the .grab-handle element's ondragstart,
    // but we can also bind it to the wrapper if needed. For now, the handle does it.
    const activeDeck = decks.find(d => d.id === card.deckId);
    const isQcm = activeDeck && activeDeck.type === 'qcm';
    card.selectedAnswers = card.selectedAnswers || [];
    const isVal = card.validationStatus === 'correct' || card.validationStatus === 'incorrect';

    cardWrapper.onclick = function (e) {
        if (!isQcm || isVal) {
            if (!e.target.closest('.context-menu') && !e.target.closest('button.no-flip') && !e.target.closest('.grab-handle')) {
                this.classList.toggle('card-flipped');
            }
        }
    };

    let styles, badge, icon, btnClass, border, contentFront, footerFront, actionBtnHTML;

    if (isQcm) {
        border = isVal ? (card.validationStatus === 'correct' ? 'border-emerald-500 bg-gradient-to-br from-slate-800 to-emerald-900/20' : 'border-red-500 bg-gradient-to-br from-slate-800 to-red-900/20') : 'border-slate-700 bg-slate-800 hover:border-slate-600';
        badge = isVal ? (card.validationStatus === 'correct' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400') : 'bg-slate-700/50 text-slate-400';
        icon = isVal ? 'rotate-cw' : 'check';
        
        let answersHTML = '';
        if (card.qcmMode === 'tf') {
            answersHTML = `<div class="flex w-full gap-2 mt-2 items-center justify-center py-2">
                ${(card.answers || []).map((ans, i) => {
                    const isSelected = card.selectedAnswers.includes(i);
                    const isCorrectAns = card.correctAnswers && card.correctAnswers.includes(i);
                    let localBtnClass = "bg-slate-700/50 hover:bg-slate-600 border-2 border-slate-600 text-slate-300";
                    if (isVal) {
                        if (isCorrectAns) {
                            if (!isSelected) localBtnClass = "bg-slate-700/50 border-2 border-emerald-500 ring-2 ring-emerald-500 text-emerald-400 cursor-default";
                            else localBtnClass = "bg-emerald-600 border-2 border-emerald-500 text-white cursor-default";
                        } else if (isSelected) {
                            localBtnClass = "bg-red-600 border-2 border-red-500 text-white cursor-default";
                        } else {
                            localBtnClass = "bg-slate-800/20 border-2 border-slate-700 text-slate-500 opacity-50 cursor-default";
                        }
                    } else if (isSelected) {
                        localBtnClass = "bg-indigo-600 border-2 border-indigo-600 text-white";
                    }
                    return `<button type="button" class="no-flip flex-1 rounded-xl transition-all h-[4.5rem] flex-shrink-0 font-bold ${localBtnClass} flex items-center justify-center p-2" onclick="handleQcmSelect(event, '${card.id}', ${i})"><span class="latex-content">${ans}</span></button>`;
                }).join('')}
            </div>`;
        } else {
            answersHTML = `<div class="flex flex-col gap-1.5 mt-1 overflow-y-auto qcm-answers-scroll pr-1 flex-grow min-h-0">
                ${(card.answers || []).map((ans, i) => {
                    const isSelected = card.selectedAnswers.includes(i);
                    const isCorrectAns = card.correctAnswers && card.correctAnswers.includes(i);
                    let localBtnClass = "bg-slate-700/50 hover:bg-slate-600 border-2 border-slate-600 text-slate-300 text-left";
                    if (isVal) {
                        if (isCorrectAns) {
                            if (!isSelected) localBtnClass = "bg-slate-700/50 border-2 border-emerald-500 ring-2 ring-emerald-500 text-emerald-400 cursor-default";
                            else localBtnClass = "bg-emerald-600 border-2 border-emerald-500 text-white cursor-default";
                        } else if (isSelected) {
                            localBtnClass = "bg-red-600 border-2 border-red-500 text-white cursor-default";
                        } else {
                            localBtnClass = "bg-slate-800 border-2 border-slate-700 text-slate-500 opacity-50 cursor-default";
                        }
                    } else if (isSelected) {
                        localBtnClass = "bg-indigo-600 border-2 border-indigo-600 text-white";
                    }
                    const prefix = ['A', 'B', 'C', 'D'][i] || i+1;
                    return `<button type="button" class="no-flip w-full rounded-xl transition-all font-medium text-xs p-2 flex gap-2 shrink-0 ${localBtnClass}" onclick="handleQcmSelect(event, '${card.id}', ${i})"><span class="font-bold opacity-75 shrink-0 mt-0.5">${prefix}.</span> <span class="latex-content break-words min-w-0">${ans}</span></button>`;
                }).join('')}
            </div>`;
        }

        contentFront = `
            <div class="relative z-0 flex-grow flex flex-col min-h-0 w-full overflow-hidden px-4">
                <div class="shrink-0 overflow-hidden" style="max-height: 35%;">
                    <div class="latex-content font-medium text-slate-100" style="font-size: 0.85rem;">${card.question}</div>
                </div>
                <div class="w-full h-px bg-slate-700/50 my-1.5 shrink-0"></div>
                ${answersHTML}
            </div>
        `;

        if (isVal) {
            btnClass = "no-flip bg-slate-700 hover:bg-indigo-500 text-slate-300 hover:text-white px-4 py-2 text-sm font-bold w-auto shadow-lg";
            actionBtnHTML = `<button onclick="this.closest('.card-container').classList.add('card-flipped');" class="absolute bottom-4 right-4 p-2 rounded-xl z-30 transition-all ${btnClass}"><div class="flex items-center gap-2"><i data-lucide="info" class="w-4 h-4"></i> Explication</div></button>`;
            footerFront = ``;
        } else {
            if (card.qcmMode === 'multi') {
                btnClass = "no-flip bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 text-sm font-bold w-auto shadow-lg shadow-indigo-900/30";
                actionBtnHTML = `<button onclick="validateQcmCard(event, '${card.id}')" class="absolute bottom-4 right-4 p-2 rounded-xl z-30 transition-all ${btnClass}"><div class="flex items-center gap-2"><i data-lucide="check" class="w-4 h-4"></i> Valider</div></button>`;
            } else {
                actionBtnHTML = ``;
            }
            footerFront = `<div class="p-4 pt-2 text-center text-slate-500 text-xs flex items-center justify-start gap-2 shrink-0"><i data-lucide="lock" class="w-3 h-3"></i> Flipping bloqué</div>`;
        }
    } else {
        const isLearned = card.isLearned;
        border = isLearned ? 'border-emerald-500/50 bg-gradient-to-br from-slate-800 to-emerald-900/20' : 'border-slate-700 bg-slate-800 hover:border-slate-600';
        badge = isLearned ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700/50 text-slate-400';
        icon = isLearned ? 'undo-2' : 'check';
        btnClass = isLearned ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/50' : 'bg-slate-700 hover:bg-indigo-500 text-slate-300 hover:text-white';
        
        contentFront = `
            <div class="relative z-0 flex-grow flex flex-col min-h-0 w-full">
                <div class="card-text-container" style="font-size: 0.85rem;">
                    <div class="card-text-inner latex-content font-medium text-slate-100">${card.question}</div>
                </div>
            </div>
        `;
        actionBtnHTML = `<button onclick="toggleCardLearned(event, '${card.id}')" class="no-flip absolute bottom-4 right-4 p-3 rounded-full shadow-lg z-30 transition-all ${btnClass}"><i data-lucide="${icon}" class="w-5 h-5"></i></button>`;
        footerFront = `<div class="p-4 pt-2 text-center text-slate-500 text-xs flex items-center justify-start gap-2 shrink-0"><i data-lucide="rotate-cw" class="w-3 h-3"></i> <span>Retourner</span></div>`;
    }

    const inner = document.createElement('div');
    inner.className = "card-inner relative h-full w-full transition-all duration-500 transform-style-3d";
    inner.innerHTML = `
        <div class="card-front absolute inset-0 rounded-2xl shadow-xl flex flex-col overflow-hidden border-2 transition-all duration-300 ${border}">
             <!-- Header / Controls -->
             <div class="relative z-20 flex justify-between items-start p-4 pb-2 shrink-0">
                 <span class="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md ${badge}">Question</span>
                 <div class="flex gap-2">
                     <div class="no-flip p-1.5 rounded-full hover:bg-slate-700/50 text-slate-500 hover:text-white cursor-grab active:cursor-grabbing grab-handle" draggable="true" ondragstart="handleDragStart(event, '${card.id}', 'card')"><i data-lucide="grip-horizontal" class="w-4 h-4"></i></div>
                     <button class="no-flip context-menu-trigger p-1.5 rounded-full hover:bg-slate-700/50 text-slate-400 hover:text-indigo-400 transition-colors" onclick="toggleCardMenu(event, '${card.id}')"><i data-lucide="more-vertical" class="w-4 h-4"></i></button>
                     <div id="menu-card-${card.id}" class="context-menu hidden absolute right-0 top-8 w-32 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden text-xs">
                        <button onclick="editCard(event, '${card.id}')" class="w-full text-left px-3 py-2 text-slate-300 hover:bg-slate-800 flex items-center gap-2"><i data-lucide="pencil" class="w-3 h-3"></i> Modifier</button>
                        <button onclick="duplicateCard(event, '${card.id}')" class="w-full text-left px-3 py-2 text-slate-300 hover:bg-slate-800 flex items-center gap-2"><i data-lucide="copy" class="w-3 h-3"></i> Dupliquer</button>
                        <div class="h-px bg-slate-800"></div>
                        <button onclick="deleteCard(event, '${card.id}')" class="w-full text-left px-3 py-2 text-red-400 hover:bg-red-900/30 flex items-center gap-2"><i data-lucide="trash" class="w-3 h-3"></i> Supprimer</button>
                    </div>
                 </div>
             </div>

             <!-- Content -->
             ${contentFront}

             <!-- Footer -->
             ${footerFront}

             <!-- Quick Action Button -->
             ${actionBtnHTML}
        </div>

        <div class="card-back absolute inset-0 rounded-2xl shadow-xl flex flex-col overflow-hidden border-2 border-indigo-500/30 bg-gradient-to-br from-slate-800 to-indigo-900/20">
             <div class="p-4 pb-2 flex justify-end shrink-0">
                <span class="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-indigo-500/20 text-indigo-400">${isQcm ? 'Explication' : 'Réponse'}</span>
             </div>

             <div class="relative z-0 flex-grow flex flex-col min-h-0 w-full">
                <div class="card-text-container" style="font-size: 0.85rem;">
                    <div class="card-text-inner latex-content font-medium text-white">${isQcm ? (card.answer || "<span class='opacity-50 italic'>Aucune explication fournie.</span>") : card.answer}</div>
                </div>
             </div>

             <div class="p-4 pt-2 text-center text-slate-400 text-xs flex items-center gap-2 shrink-0">
                <i data-lucide="rotate-ccw" class="w-3 h-3"></i> Taper pour pivoter
             </div>
             ${!isQcm ? `<button onclick="toggleCardLearned(event, '${card.id}')" class="no-flip absolute bottom-4 right-4 p-3 rounded-full shadow-lg z-30 transition-all ${btnClass}"><i data-lucide="${icon}" class="w-5 h-5"></i></button>` : ''}
        </div>
    `;

    cardWrapper.appendChild(inner);

    // KaTeX rendering is handled by IntersectionObserver (observeForKatex called by parent)
    // Lucide icons are handled in batch by parent

    return cardWrapper;
}

// --- QCM INTERACTION IN GRID ---
function handleQcmSelect(e, cardId, index) {
    if (e) e.stopPropagation();
    const card = cards.find(c => c.id === cardId);
    if (!card) return;
    
    // Ignore clicks if already validated
    if (card.validationStatus === 'correct' || card.validationStatus === 'incorrect') return;

    card.selectedAnswers = card.selectedAnswers || [];
    
    if (card.qcmMode === 'tf') {
        card.selectedAnswers = [index];
        validateQcmCard(null, cardId); // Auto-validate for TF
        return;
    } else {
        if (card.selectedAnswers.includes(index)) {
            card.selectedAnswers = card.selectedAnswers.filter(i => i !== index);
        } else {
            card.selectedAnswers.push(index);
        }
    }
    
    // Re-render specifically this card
    updateSingleCardDOM(card);
}

function validateQcmCard(e, cardId) {
    if (e) e.stopPropagation();
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    const selected = card.selectedAnswers || [];
    const correct = card.correctAnswers || [];
    
    // Perfect match? Selected contains all correct, and lengths match.
    const isPerfect = selected.length === correct.length && correct.every(val => selected.includes(val));
    
    // Update data state
    card.validationStatus = isPerfect ? 'correct' : 'incorrect';
    card.isLearned = isPerfect; // Keeps backwards compatibility for global progress logic (sort of)

    updateSingleCardDOM(card);
    saveData();
    if (activeDeckId) updateDeckStats(activeDeckId);
    
    // Check if we are in learning mode and should do the success animation
    if (window.learningScope_renderCard && isPerfect) {
        const animEl = document.getElementById(`success-anim-${card.id}`);
        if (animEl) {
            animEl.innerHTML = `<div class="success-overlay"><div class="success-icon bg-emerald-500 text-white p-4 rounded-full shadow-lg"><i data-lucide="check" class="w-8 h-8"></i></div></div>`;
            createIconsIn(animEl);
        }
        setTimeout(() => { 
            const btnNext = document.getElementById('btn-next');
            if (btnNext) btnNext.click();
        }, 800);
    }
}

function updateSingleCardDOM(card) {
    const oldWrapper = document.querySelector(`.card-container[data-id="${card.id}"]`);
    if (!oldWrapper) return;
    
    const newWrapper = createCardDOM(card);
    // Mark as already inflated so the observer doesn't try to re-inflate
    newWrapper.dataset.inflated = 'true';
    newWrapper.dataset.katexRendered = 'true';
    oldWrapper.replaceWith(newWrapper);
    
    // Re-observe for deflation when scrolled away
    observeForKatex(newWrapper);
    
    // Need to trigger KaTeX manually for new elements since IntersectionObserver takes a tick
    const ktxNodes = newWrapper.querySelectorAll('.katex-pending, .latex-content');
    ktxNodes.forEach(node => {
        if (typeof renderMathInElement !== 'undefined') {
            try {
                renderMathInElement(node, { delimiters: [{ left: "$$", right: "$$", display: true }, { left: "\\[", right: "\\]", display: true }, { left: "\\(", right: "\\)", display: false }, { left: "$", right: "$", display: false }], throwOnError: false });
            } catch(e) {}
        }
        node.classList.remove('katex-pending');
        node.classList.add('katex-rendered');
    });
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// --- QCM INTERACTION IN LEARNING MODE ---
function handleLearningQcmSelect(e, cardId, index) {
    if (e) e.stopPropagation();
    const card = cards.find(c => c.id === cardId);
    if (!card) return;
    
    // Ignore if already validated
    if (card.validationStatus === 'correct' || card.validationStatus === 'incorrect') return;

    card.selectedAnswers = card.selectedAnswers || [];
    
    if (card.qcmMode === 'tf') {
        card.selectedAnswers = [index];
        validateLearningQcmCard(null, cardId); // Auto-validate for TF
        return;
    } else {
        if (card.selectedAnswers.includes(index)) {
            card.selectedAnswers = card.selectedAnswers.filter(i => i !== index);
        } else {
            card.selectedAnswers.push(index);
        }
    }
    
    // Re-render learning card
    if (window.learningScope_renderCard) {
        window.learningScope_renderCard('refresh');
    }
}

function validateLearningQcmCard(e, cardId) {
    if (e) e.stopPropagation();
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    const selected = card.selectedAnswers || [];
    const correct = card.correctAnswers || [];
    const isPerfect = selected.length === correct.length && correct.every(val => selected.includes(val));
    
    card.validationStatus = isPerfect ? 'correct' : 'incorrect';
    card.isLearned = isPerfect;

    saveData();
    
    if (window.learningScope_renderCard) {
        window.learningScope_renderCard('refresh');
        
        if (isPerfect) {
            const animEl = document.getElementById(`success-anim-${card.id}`);
            if (animEl) {
                animEl.innerHTML = `<div class="success-overlay"><div class="success-icon bg-emerald-500 text-white p-4 rounded-full shadow-lg"><i data-lucide="check" class="w-8 h-8"></i></div></div>`;
                if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [animEl] });
            }
            // Auto-advance removed to let user see explanation
        }
    }
    if (activeDeckId) updateDeckStats(activeDeckId);
}

// --- DRAG AND DROP (REAL-TIME VISUAL) ---
function handleDragStart(e, id, type) {
    e.stopPropagation(); // Prevent propagation if handle inside card
    draggedItem = { id, type };
    const container = e.target.closest(type === 'deck' ? '.group' : '.card-container');
    if (container) {
        container.classList.add('dragging');
        if (e.dataTransfer.setDragImage) {
            e.dataTransfer.setDragImage(container, 20, 20);
        }
    }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text', id);
}

function handleDragOver(e, targetId, type) {
    e.preventDefault();
    if (!draggedItem || draggedItem.type !== type || draggedItem.id === targetId) return;

    // DOM-level swap — avoids full renderView() which causes flicker
    const array = type === 'deck' ? decks : cards;
    const fromIdx = array.findIndex(x => x.id === draggedItem.id);
    const toIdx = array.findIndex(x => x.id === targetId);

    if (fromIdx !== -1 && toIdx !== -1) {
        // Swap in data array
        const item = array[fromIdx];
        array.splice(fromIdx, 1);
        array.splice(toIdx, 0, item);

        // Re-number orders
        array.forEach((d, i) => d.order = i);

        // DOM swap — find the two elements and swap their positions
        const draggedEl = document.querySelector(`[data-id="${draggedItem.id}"]`);
        const targetEl = document.querySelector(`[data-id="${targetId}"]`);

        if (draggedEl && targetEl && draggedEl.parentNode === targetEl.parentNode) {
            const parent = draggedEl.parentNode;
            // Determine visual order
            if (fromIdx < toIdx) {
                // Moving down: insert dragged after target
                parent.insertBefore(draggedEl, targetEl.nextSibling);
            } else {
                // Moving up: insert dragged before target
                parent.insertBefore(draggedEl, targetEl);
            }
        }
    }
}

function handleDrop(e, targetId, type) {
    e.preventDefault();
    e.stopPropagation();
    document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
    draggedItem = null;
    saveData(); // Commit
}

// --- LEARNING MODE (Optimized for mobile) ---
function startLearningMode(theme) {
    const grid = document.getElementById(`grid-${theme}`);
    if (!grid) return;
    const visibleIds = Array.from(grid.children).map(c => c.dataset.id);
    let sessionCards = visibleIds.map(id => cards.find(c => c.id === id)).filter(c => c);

    const activeDeck = activeDeckId ? decks.find(d => d.id === activeDeckId) : null;
    const isQcm = activeDeck && activeDeck.type === 'qcm';

    let unlearned = sessionCards.filter(c => isQcm ? c.validationStatus === 'unlearned' : !c.isLearned);
    if (unlearned.length === 0) {
        if (!confirm("Tout est maîtrisé. Tout réviser ?")) return;
        if (isQcm) {
            sessionCards.forEach(c => {
                c.validationStatus = 'unlearned';
                c.selectedAnswers = [];
                c.isLearned = false;
            });
        }
    } else {
        sessionCards = unlearned;
    }

    const overlay = document.createElement('div');
    overlay.id = 'learning-overlay';
    // Use explicit flex layout — critical for iOS
    overlay.className = "fixed inset-0 z-[60] bg-slate-950 flex flex-col items-center p-4 animate-fade-in";
    overlay.style.cssText = "height: 100vh; height: 100dvh;";

    // --- HISTORY NAVIGATION FIX ---
    history.pushState({ mode: 'learning' }, '', '#learning');

    const handlePopState = () => {
        window.removeEventListener('popstate', handlePopState);
        exitLearningOverlay();
    };
    window.addEventListener('popstate', handlePopState);

    let currentIndex = 0;
    let isAnimating = false;

    window.learningScope_renderCard = (dir) => { if (!isAnimating || dir === 'refresh') renderCard(dir); };

    function renderCard(direction = 'init') {
        if (isAnimating && direction !== 'init' && direction !== 'refresh') return;

        const container = document.getElementById('learning-card-container');

        if (currentIndex >= sessionCards.length) {
            overlay.innerHTML = `
                <div class="text-center animate-fade-in px-6" style="margin: auto;">
                    <div class="inline-flex p-6 bg-emerald-500/20 rounded-full mb-6"><i data-lucide="trophy" class="w-16 h-16 text-emerald-400"></i></div>
                    <h2 class="text-3xl font-bold text-white mb-2">Session Terminée !</h2>
                    <p class="text-slate-400 mb-8 text-lg">Vous avez revu ${sessionCards.length} cartes.</p>
                    <button onclick="closeLearningMode()" class="px-8 py-3 bg-indigo-600 rounded-xl text-white font-bold hover:bg-indigo-500 transition shadow-lg shadow-indigo-500/25">Retour aux fiches</button>
                </div>
            `;
            createIconsIn(overlay);
            return;
        }

        const card = sessionCards[currentIndex];

        let flipClass = '';
        let contentFront = '';
        let footerFront = '';
        let actionBtnHTML = '';
        const isVal = card.validationStatus === 'correct' || card.validationStatus === 'incorrect';

        if (isQcm) {
            let answersHTML = '';
            if (card.qcmMode === 'tf') {
                answersHTML = `<div class="flex w-full gap-2 mt-4 pb-16 px-4 items-center justify-center">
                    ${(card.answers || []).map((ans, i) => {
                        const isSelected = (card.selectedAnswers || []).includes(i);
                        const isCorrectAns = card.correctAnswers && card.correctAnswers.includes(i);
                        let localBtnClass = "bg-slate-700/50 hover:bg-slate-600 border-2 border-slate-600 text-slate-300";
                        if (isVal) {
                            if (isCorrectAns) {
                                if (!isSelected) localBtnClass = "bg-slate-700/50 border-2 border-emerald-500 ring-2 ring-emerald-500 text-emerald-400 cursor-default";
                                else localBtnClass = "bg-emerald-600 border-2 border-emerald-500 text-white cursor-default";
                            } else if (isSelected) {
                                localBtnClass = "bg-red-600 border-2 border-red-500 text-white cursor-default";
                            } else {
                                localBtnClass = "bg-slate-800/20 border-2 border-slate-700 text-slate-500 opacity-50 cursor-default";
                            }
                        } else if (isSelected) {
                            localBtnClass = "bg-indigo-600 border-2 border-indigo-600 text-white";
                        }
                        // Need learning-specific click handler, we can reuse handleQcmSelect but ensure learning redraws!
                        // Actually handleQcmSelect calls updateSingleCardDOM, which searches for .card-container! 
                        // The learning overlay uses .learning-card-wrapper!
                        // We must define a new learning-specific handler or update handleQcmSelect.
                        return `<button type="button" class="no-flip flex-1 rounded-xl transition-all h-[8rem] font-bold ${localBtnClass} flex items-center justify-center p-2" onclick="handleLearningQcmSelect(event, '${card.id}', ${i})"><span class="latex-content">${ans}</span></button>`;
                    }).join('')}
                </div>`;
            } else {
                answersHTML = `<div class="flex flex-col gap-2 mt-2 pb-16 overflow-y-auto qcm-answers-scroll px-4 flex-grow min-h-0">
                    ${(card.answers || []).map((ans, i) => {
                        const isSelected = (card.selectedAnswers || []).includes(i);
                        const isCorrectAns = card.correctAnswers && card.correctAnswers.includes(i);
                        let localBtnClass = "bg-slate-700/50 hover:bg-slate-600 border-2 border-slate-600 text-slate-300 text-left";
                        if (isVal) {
                            if (isCorrectAns) {
                                if (!isSelected) localBtnClass = "bg-slate-700/50 border-2 border-emerald-500 ring-2 ring-emerald-500 text-emerald-400 cursor-default";
                                else localBtnClass = "bg-emerald-600 border-2 border-emerald-500 text-white cursor-default";
                            } else if (isSelected) {
                                localBtnClass = "bg-red-600 border-2 border-red-500 text-white cursor-default";
                            } else {
                                localBtnClass = "bg-slate-800 border-2 border-slate-700 text-slate-500 opacity-50 cursor-default";
                            }
                        } else if (isSelected) {
                            localBtnClass = "bg-indigo-600 border-2 border-indigo-600 text-white";
                        }
                        const prefix = ['A', 'B', 'C', 'D'][i] || i+1;
                        return `<button type="button" class="no-flip w-full rounded-xl transition-all font-medium text-xs p-2.5 flex gap-2.5 ${localBtnClass}" onclick="handleLearningQcmSelect(event, '${card.id}', ${i})"><span class="font-bold opacity-75 shrink-0 mt-0.5">${prefix}.</span> <span class="latex-content break-words min-w-0">${ans}</span></button>`;
                    }).join('')}
                </div>`;
            }
            
            contentFront = `
                 <div class="flex-grow w-full overflow-hidden relative min-h-0 flex flex-col px-4">
                     <div class="card-text-container shrink-0" style="max-height: 30%;">
                        <div class="card-text-inner latex-content font-medium text-white">${card.question}</div>
                     </div>
                     <div class="w-full h-px bg-slate-700/50 my-1.5 shrink-0"></div>
                     ${answersHTML}
                 </div>
            `;
            
            if (isVal) {
                // Use an invisible placeholder to maintain vertical alignment and prevent layout shifts
                footerFront = `<div class="mt-auto text-slate-500 text-xs flex items-center gap-2 shrink-0 pb-2 opacity-0 select-none" aria-hidden="true"><i data-lucide="lock" class="w-4 h-4"></i> Space Placeholder</div>`;
                flipClass = "onclick=\"if(!event.target.closest('button.no-flip')) this.classList.toggle('card-flipped')\"";
            } else {
                footerFront = `<div class="mt-auto text-slate-500 text-xs flex items-center gap-2 shrink-0 pb-2"><i data-lucide="lock" class="w-4 h-4"></i> Flipping bloqué</div>`;
                flipClass = "";
            }
        } else {
            contentFront = `
                 <div class="flex-grow w-full overflow-hidden relative min-h-0 flex flex-col justify-center">
                     <div class="card-text-container">
                        <div class="card-text-inner latex-content font-medium text-white">${card.question}</div>
                     </div>
                 </div>
            `;
            footerFront = `<div class="mt-auto text-slate-500 text-xs flex items-center gap-2 shrink-0 pb-2"><i data-lucide="touchpad" class="w-4 h-4"></i> Taper pour retourner</div>`;
            flipClass = "onclick=\"if(!event.target.closest('button.no-flip')) this.classList.toggle('card-flipped')\"";
        }

        const borderFace = isVal ? (card.validationStatus === 'correct' ? 'border-emerald-500 bg-gradient-to-br from-slate-800 to-emerald-900/20' : 'border-red-500 bg-gradient-to-br from-slate-800 to-red-900/20') : 'border-slate-700 bg-slate-800';

        const badgeFace = isVal ? (card.validationStatus === 'correct' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400') : 'bg-slate-700/50 text-slate-400';

        // Build card HTML — using explicit dimensions, no aspect-ratio dependency
        const cardHTML = `
            <div class="relative w-full max-w-sm perspective-1000 cursor-pointer group select-none learning-card-wrapper" data-id="${card.id}" ${flipClass} style="height: min(70vh, 28rem); height: min(70dvh, 28rem);">
                <div class="card-inner relative w-full h-full transform-style-3d transition-all duration-500">
                    <div class="card-front absolute inset-0 ${borderFace} rounded-3xl border-2 p-6 pt-10 pb-6 flex flex-col items-center justify-start text-center shadow-2xl backface-hidden">
                        <span class="${badgeFace} text-xs font-bold uppercase tracking-widest px-2 py-1 rounded-md mb-4 mt-0 shrink-0">Question</span>
                        ${contentFront}
                        ${footerFront}
                    </div>
                    <div class="card-back absolute inset-0 bg-gradient-to-br from-slate-800 to-indigo-900/40 rounded-3xl border border-indigo-500/30 p-6 pt-10 pb-6 flex flex-col items-center justify-start text-center shadow-2xl backface-hidden" style="-webkit-transform: rotateY(180deg); transform: rotateY(180deg)">
                        <span class="bg-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest px-2 py-1 rounded-md mb-4 mt-0 shrink-0">${isQcm ? 'Explication' : 'Réponse'}</span>
                        <div class="flex-grow w-full overflow-hidden relative min-h-0 flex flex-col justify-center">
                             <div class="card-text-container">
                                <div class="card-text-inner latex-content font-medium text-white">${isQcm ? (card.answer || "<span class='opacity-50 italic'>Aucune explication fournie.</span>") : card.answer}</div>
                             </div>
                        </div>
                         <div class="mt-auto text-slate-400 text-xs flex items-center gap-2 shrink-0 pb-2"><i data-lucide="rotate-ccw" class="w-4 h-4"></i> Taper pour pivoter</div>
                    </div>
                </div>
                <div id="success-anim-${card.id}"></div>
            </div>
        `;

        let actionsHTML = '';
        if (isQcm) {
            let qcmMainActionBtnHTML = '';
            if (isVal) {
                qcmMainActionBtnHTML = `<button onclick="const wrapper = document.querySelector('.learning-card-wrapper'); if(wrapper) wrapper.classList.toggle('card-flipped')" class="flex-grow py-4 rounded-2xl font-bold bg-indigo-600 text-white hover:bg-indigo-500 shadow-xl active:scale-95 transition flex items-center justify-center gap-2"><i data-lucide="info" class="w-6 h-6"></i> Expliquer</button>`;
            } else {
                if (card.qcmMode === 'multi') {
                    qcmMainActionBtnHTML = `<button onclick="validateLearningQcmCard(event, '${card.id}')" class="flex-grow py-4 rounded-2xl font-bold bg-emerald-600 text-white hover:bg-emerald-500 shadow-xl active:scale-95 transition flex items-center justify-center gap-2"><i data-lucide="check" class="w-6 h-6"></i> Valider</button>`;
                } else {
                    qcmMainActionBtnHTML = `<button disabled class="flex-grow py-4 rounded-2xl font-bold bg-slate-700/50 text-slate-500 border border-slate-600/50 flex items-center justify-center gap-2 cursor-not-allowed opacity-50"><i data-lucide="info" class="w-6 h-6"></i> Expliquer</button>`;
                }
            }

            actionsHTML = `
             <div id="learning-actions-container" class="flex flex-col gap-3 z-50 w-full max-w-sm mx-auto pb-4 shrink-0" style="padding-bottom: max(1rem, env(safe-area-inset-bottom, 0px));">
                <div class="flex items-center gap-4 py-2 w-full justify-between">
                     <button id="btn-prev" class="p-4 rounded-full bg-slate-800 text-slate-400 hover:text-white border border-slate-700 disabled:opacity-30 shrink-0"><i data-lucide="arrow-left" class="w-6 h-6"></i></button>
                     ${qcmMainActionBtnHTML}
                     <button id="btn-next" class="p-4 rounded-full bg-slate-800 text-white border border-slate-700 hover:bg-slate-700 shrink-0 shadow-lg"><i data-lucide="arrow-right" class="w-6 h-6"></i></button>
                </div>
             </div>
            `;
        } else {
            actionsHTML = `
                 <div id="learning-actions-container" class="flex flex-col gap-3 z-50 w-full max-w-sm mx-auto pb-4 shrink-0" style="padding-bottom: max(1rem, env(safe-area-inset-bottom, 0px));">
                     <div class="flex items-center gap-3">
                        <button id="btn-later-3" class="flex-1 py-3 rounded-xl bg-slate-800 text-amber-400 text-sm font-bold border border-slate-700 hover:bg-slate-700 active:scale-95 transition">Pas su<br><span class="text-[10px] font-normal opacity-70">+3 rangs</span></button>
                        <button id="btn-later-7" class="flex-1 py-3 rounded-xl bg-slate-800 text-blue-400 text-sm font-bold border border-slate-700 hover:bg-slate-700 active:scale-95 transition">A peu près<br><span class="text-[10px] font-normal opacity-70">+7 rangs</span></button>
                    </div>
                    <div class="flex items-center gap-4">
                         <button id="btn-prev" class="p-4 rounded-full bg-slate-800 text-slate-400 hover:text-white border border-slate-700 disabled:opacity-30 shrink-0"><i data-lucide="arrow-left" class="w-6 h-6"></i></button>
                         <button id="btn-validate" class="flex-grow py-4 rounded-2xl font-bold bg-emerald-600 text-white hover:bg-emerald-500 shadow-xl active:scale-95 transition flex items-center justify-center gap-2"><i data-lucide="check" class="w-6 h-6"></i> Maîtrisé</button>
                         <button id="btn-next" class="p-4 rounded-full bg-slate-800 text-white border border-slate-700 shrink-0"><i data-lucide="arrow-right" class="w-6 h-6"></i></button>
                    </div>
                 </div>
            `;
        }

        let newCard = null;

        if (!container) {
            overlay.innerHTML = `
                <div class="w-full flex justify-between items-center text-slate-400 z-50 shrink-0 pt-2" style="padding-top: max(0.5rem, env(safe-area-inset-top, 0px));">
                    <button onclick="closeLearningMode()" class="p-2 hover:bg-white/10 rounded-full text-white transition"><i data-lucide="x" class="w-6 h-6"></i></button>
                    <div class="font-mono text-sm bg-black/30 px-3 py-1 rounded-full border border-white/10" id="progress-indicator">${currentIndex + 1} / ${sessionCards.length}</div>
                    <div class="w-10"></div>
                </div>
                <div id="learning-card-container" class="w-full flex justify-center items-center py-4 flex-grow relative overflow-visible min-h-0">
                    ${cardHTML}
                </div>
                ${actionsHTML}
            `;
            document.body.appendChild(overlay);
            // Render KaTeX only for THIS card
            const cardContainer = document.getElementById('learning-card-container');
            if (cardContainer) {
                renderKatexDirect(cardContainer);
            }
        } else {
            isAnimating = true;
            const oldCard = container.firstElementChild;
            const wrapper = document.createElement('div');
            wrapper.innerHTML = cardHTML;
            newCard = wrapper.firstElementChild;

            if (direction === 'refresh') {
                container.innerHTML = '';
                container.appendChild(newCard);
                const actionContainer = document.getElementById('learning-actions-container');
                if (actionContainer) {
                    actionContainer.outerHTML = actionsHTML;
                }
                renderKatexDirect(newCard);
                createIconsIn(overlay);
                isAnimating = false;
                
                // Re-bind events for actions if needed
                const btnPrev = document.getElementById('btn-prev');
                const btnNext = document.getElementById('btn-next');
                const btnVal = document.getElementById('btn-validate');
                if (btnPrev) btnPrev.onclick = () => { if (currentIndex > 0 && !isAnimating) { currentIndex--; renderCard('prev'); } };
                if (btnNext) btnNext.onclick = () => { if (!isAnimating) { currentIndex++; renderCard('next'); } };
                if (btnVal) btnVal.onclick = (e) => { e.stopPropagation(); if (!isAnimating) { card.isLearned = true; saveData(); currentIndex++; renderCard('next'); } };
                
                return; // Early return for refresh
            }

            if (direction === 'next') {
                if (oldCard) {
                    oldCard.style.position = 'absolute';
                    oldCard.style.top = '50%';
                    oldCard.style.left = '50%';
                    oldCard.style.transform = 'translate(-50%, -50%)';
                    oldCard.classList.add('slide-exit-next');
                }
                newCard.classList.add('slide-enter-next');
                container.appendChild(newCard);

            } else if (direction === 'prev') {
                if (oldCard) {
                    oldCard.style.position = 'absolute';
                    oldCard.style.top = '50%';
                    oldCard.style.left = '50%';
                    oldCard.style.transform = 'translate(-50%, -50%)';
                    oldCard.classList.add('slide-exit-prev');
                }
                newCard.classList.add('slide-enter-prev');
                container.appendChild(newCard);
            }

            setTimeout(() => {
                if (oldCard) oldCard.remove();
                if (newCard) newCard.classList.remove('slide-enter-next', 'slide-enter-prev');
                isAnimating = false;
            }, 500);

            const progressEl = document.getElementById('progress-indicator');
            if (progressEl) progressEl.innerText = `${currentIndex + 1} / ${sessionCards.length}`;

            const actionContainer = document.getElementById('learning-actions-container');
            if (actionContainer) {
                actionContainer.outerHTML = actionsHTML;
            }

            // Render KaTeX only for the NEW card
            renderKatexDirect(newCard);
        }

        createIconsIn(overlay);

        // Wire up buttons (safe — buttons exist by now)
        const btnPrev = document.getElementById('btn-prev');
        const btnNext = document.getElementById('btn-next');
        const btnValidate = document.getElementById('btn-validate');
        const btnLater3 = document.getElementById('btn-later-3');
        const btnLater7 = document.getElementById('btn-later-7');

        if (btnPrev) {
            btnPrev.disabled = currentIndex === 0;
            btnPrev.onclick = () => { if (currentIndex > 0 && !isAnimating) { currentIndex--; renderCard('prev'); } };
        }
        if (btnNext) {
            btnNext.onclick = () => { if (!isAnimating) { currentIndex++; renderCard('next'); } };
        }

        if (btnValidate) {
            btnValidate.onclick = (e) => {
                e.stopPropagation();
                if (isAnimating) return;
                const animEl = document.getElementById(`success-anim-${card.id}`);
                if (animEl) {
                    animEl.innerHTML = `<div class="success-overlay"><div class="success-icon bg-emerald-500 text-white p-4 rounded-full shadow-lg"><i data-lucide="check" class="w-8 h-8"></i></div></div>`;
                    createIconsIn(animEl);
                }
                card.isLearned = true;
                saveData();
                setTimeout(() => { currentIndex++; renderCard('next'); }, 600);
            };
        }

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

        if (btnLater3) btnLater3.onclick = (e) => { e.stopPropagation(); deferCard(3); };
        if (btnLater7) btnLater7.onclick = (e) => { e.stopPropagation(); deferCard(7); };
    }

    renderCard();
}

function closeLearningMode() {
    window.learningScope_renderCard = null;
    if (location.hash === '#learning') {
        history.back(); // This will trigger popstate → handlePopState → exitLearningOverlay
    } else {
        exitLearningOverlay();
    }
}

// Remove learning overlay WITHOUT rebuilding the entire deck view.
// The deck grid behind the overlay is still intact — we just need to
// refresh cards whose state changed during the learning session.
function exitLearningOverlay() {
    window.learningScope_renderCard = null;

    // 1. Remove the overlay
    const overlay = document.getElementById('learning-overlay');
    if (overlay) overlay.remove();

    // 2. Clean up hash if it's still there (e.g. fallback path)
    if (location.hash === '#learning') {
        history.replaceState(null, '', location.pathname + location.search);
    }

    // 3. Update stats (progress ring, counters)
    if (activeDeckId) updateDeckStats(activeDeckId);

    // 4. Deflate all currently inflated cards so the observer
    //    re-inflates them with fresh data via the batch queue.
    //    This is safe because the queue processes only 4 per frame.
    document.querySelectorAll('.card-container[data-inflated="true"]').forEach(el => {
        deflateCard(el);
    });

    saveData();
}


// --- QUICK ACTIONS (OPTIMIZED — no full re-render) ---

function toggleCardLearned(e, id) {
    e.stopPropagation();
    const card = cards.find(c => c.id === id);
    if (!card) return;
    
    card.isLearned = !card.isLearned;
    saveData();
    // Full re-render to reposition card (learned cards sort to end of theme group)
    // Lazy KaTeX via IntersectionObserver prevents the performance hit
    renderView();
    showToast(card.isLearned ? "Carte maîtrisée !" : "Carte à revoir", "success");
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
            const typeEls = document.getElementsByName('deck-type');
            for(const el of typeEls) { el.checked = (el.value === (entity.type || 'flashcard')); }
            selectedGradient = entity.gradient;
            editingId = entity.id;
        } else {
            document.getElementById('deck-title').value = '';
            document.getElementsByName('deck-type')[0].checked = true;
            editingId = null;
        }
    } else {
        contentDeck.classList.add('hidden');
        contentCard.classList.remove('hidden');
        
        const activeDeck = decks.find(d => d.id === activeDeckId);
        const isQcm = activeDeck && activeDeck.type === 'qcm';
        
        document.getElementById('card-flashcard-fields').classList.toggle('hidden', isQcm);
        document.getElementById('card-qcm-fields').classList.toggle('hidden', !isQcm);
        
        // Form Validation toggle
        document.getElementById('card-answer').required = !isQcm;

        initCardModal();

        if (entity) {
            document.getElementById('card-question').value = entity.question;
            document.getElementById('card-theme-select').value = entity.theme;
            if (isQcm) {
                document.getElementById('card-explanation').value = entity.answer || '';
                currentQcmCorrect = entity.correctAnswers ? [...entity.correctAnswers] : [];
                currentQcmAnswers = entity.answers ? [...entity.answers] : [];
                setQcmMode(entity.qcmMode || 'tf'); // Will also trigger renderQcmAnswersUI
            } else {
                document.getElementById('card-answer').value = entity.answer;
            }
            editingId = entity.id;
        } else {
            document.getElementById('card-question').value = '';
            document.getElementById('card-answer').value = '';
            document.getElementById('card-explanation').value = '';
            if (isQcm) {
                currentQcmCorrect = [];
                currentQcmAnswers = [];
                setQcmMode('tf');
            }
            editingId = null;
        }
    }
    createIconsIn(modal);
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

// --- QCM MODAL LOGIC ---
let currentQcmMode = 'tf';
let currentQcmAnswers = [];
let currentQcmCorrect = [];

function setQcmMode(mode) {
    currentQcmMode = mode;
    const btnTf = document.getElementById('btn-qcm-tf');
    const btnMulti = document.getElementById('btn-qcm-multi');
    const container = document.getElementById('qcm-answers-container');
    const addBtn = document.getElementById('btn-qcm-add-ans');

    if (mode === 'tf') {
        btnTf.className = "flex-1 py-1.5 text-sm rounded-lg bg-indigo-600 text-white";
        btnMulti.className = "flex-1 py-1.5 text-sm rounded-lg bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700";
        addBtn.classList.add('hidden');
        renderQcmAnswersUI(['Vrai', 'Faux'], true);
    } else {
        btnMulti.className = "flex-1 py-1.5 text-sm rounded-lg bg-indigo-600 text-white";
        btnTf.className = "flex-1 py-1.5 text-sm rounded-lg bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700";
        addBtn.classList.remove('hidden');
        if (currentQcmAnswers.length < 2 || (currentQcmAnswers.length === 2 && currentQcmAnswers[0] === 'Vrai')) {
            currentQcmAnswers = ['', ''];
            currentQcmCorrect = [];
        }
        renderQcmAnswersUI(currentQcmAnswers, false);
    }
}

function addQcmAnswer() {
    if (currentQcmMode !== 'multi' || currentQcmAnswers.length >= 4) return;
    currentQcmAnswers.push('');
    renderQcmAnswersUI(currentQcmAnswers, false);
}

function removeQcmAnswer(index) {
    if (currentQcmAnswers.length <= 2) return;
    currentQcmAnswers.splice(index, 1);
    currentQcmCorrect = currentQcmCorrect.filter(c => c !== index).map(c => c > index ? c - 1 : c);
    renderQcmAnswersUI(currentQcmAnswers, false);
}

function toggleQcmCorrect(index) {
    if (currentQcmMode === 'tf') {
        currentQcmCorrect = [index];
    } else {
        if (currentQcmCorrect.includes(index)) {
            currentQcmCorrect = currentQcmCorrect.filter(c => c !== index);
        } else {
            currentQcmCorrect.push(index);
        }
    }
    renderQcmAnswersUI(currentQcmAnswers, currentQcmMode === 'tf');
}

function updateQcmText(index, value) {
    if (currentQcmMode === 'multi') {
        currentQcmAnswers[index] = value;
    }
}

function renderQcmAnswersUI(answers, readOnly) {
    currentQcmAnswers = answers;
    const container = document.getElementById('qcm-answers-container');
    container.innerHTML = '';
    
    answers.forEach((ans, i) => {
        const isCorrect = currentQcmCorrect.includes(i);
        const div = document.createElement('div');
        div.className = "flex items-center gap-3";
        
        const checkClass = isCorrect ? "bg-emerald-500 border-emerald-500" : "bg-slate-900 border-slate-600";
        const checkIcon = isCorrect ? `<i data-lucide="check" class="w-3 h-3 text-white mx-auto mt-0.5"></i>` : "";
        
        div.innerHTML = `
            <div onclick="toggleQcmCorrect(${i})" class="w-5 h-5 rounded-full border-2 cursor-pointer flex-shrink-0 transition-colors flex items-center justify-center ${checkClass}">
                ${checkIcon}
            </div>
            ${readOnly 
                ? `<div class="flex-grow bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-300 select-none">${ans}</div>`
                : `<input type="text" value="${ans}" onchange="updateQcmText(${i}, this.value)" placeholder="Réponse ${i+1}" class="flex-grow bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none">`
            }
            ${(!readOnly && answers.length > 2) 
                ? `<button type="button" onclick="removeQcmAnswer(${i})" class="p-2 bg-slate-800 text-red-400 hover:bg-red-900/30 rounded-lg"><i data-lucide="trash-2" class="w-4 h-4"></i></button>`
                : ''}
        `;
        container.appendChild(div);
    });
    
    // Add logic for button "+" hiding
    const addBtn = document.getElementById('btn-qcm-add-ans');
    if (addBtn) {
        if (currentQcmMode === 'multi' && answers.length < 4) addBtn.classList.remove('hidden');
        else addBtn.classList.add('hidden');
    }
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function handleCreateCard(e) {
    e.preventDefault();
    const activeDeck = decks.find(d => d.id === activeDeckId);
    if (!activeDeck) return;
    
    const isQcm = activeDeck.type === 'qcm';
    const q = document.getElementById('card-question').value;
    
    let a = '';
    let qcmData = null;
    
    if (isQcm) {
        if (currentQcmCorrect.length === 0) {
            showToast("Veuillez sélectionner au moins une bonne réponse.", "error");
            return;
        }
        if (currentQcmMode === 'multi' && currentQcmAnswers.some(ans => !ans.trim())) {
            showToast("Veuillez remplir tous les champs de réponse.", "error");
            return;
        }
        
        a = document.getElementById('card-explanation').value || '';
        qcmData = {
            mode: currentQcmMode,
            answers: [...currentQcmAnswers],
            correct: [...currentQcmCorrect],
            explanation: a
        };
    } else {
        a = document.getElementById('card-answer').value;
        if (!a) return; // Flashcard requires an answer natively ignored due to hidden fields removing 'required'
    }
    
    let theme = isNewTheme ? document.getElementById('input-new-theme').value : document.getElementById('card-theme-select').value;
    if (!theme) theme = "Divers";

    if (q) {
        if (isNewTheme && selectedThemeColor) {
            themeColors[`${activeDeckId}_${theme}`] = selectedThemeColor;
        }

        if (editingId) {
            const idx = cards.findIndex(c => c.id === editingId);
            if (idx !== -1) {
                cards[idx].question = q;
                cards[idx].answer = a;
                cards[idx].theme = theme;
                if (isQcm) {
                    cards[idx].qcmMode = qcmData.mode;
                    cards[idx].answers = qcmData.answers;
                    cards[idx].correctAnswers = qcmData.correct;
                    cards[idx].explanation = qcmData.explanation;
                }
            }
        } else {
            const newCard = {
                id: generateId(),
                deckId: activeDeckId,
                question: q,
                answer: a,
                theme,
                isLearned: false,
                validationStatus: 'unlearned',
                createdAt: Date.now(),
                order: -1
            };
            if (isQcm) {
                newCard.qcmMode = qcmData.mode;
                newCard.answers = qcmData.answers;
                newCard.correctAnswers = qcmData.correct;
                newCard.explanation = qcmData.explanation;
            }
            cards.unshift(newCard);
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

function closeAllContextMenus() {
    document.querySelectorAll('.context-menu').forEach(el => {
        el.classList.add('hidden');
        const parentGroup = el.closest('.group, .card-container');
        if (parentGroup) parentGroup.style.zIndex = '';
    });
}

function toggleDeckMenu(e, id) {
    e.stopPropagation();
    closeAllContextMenus();
    const menu = document.getElementById(`menu-deck-${id}`);
    if (menu) {
        menu.classList.remove('hidden');
        const container = menu.closest('.group');
        if (container) container.style.zIndex = '50';
    }
}

function toggleCardMenu(e, id) {
    e.stopPropagation();
    closeAllContextMenus();
    const menu = document.getElementById(`menu-card-${id}`);
    if (menu) {
        menu.classList.remove('hidden');
        const container = menu.closest('.card-container');
        if (container) container.style.zIndex = '50';
    }
}

function downloadDeckDirectly(id) {
    const deck = decks.find(d => d.id === id);
    if (!deck) return;
    const exportData = {
        meta: {
            appVersion: "3.0",
            exportDate: new Date().toISOString()
        },
        decks: [deck],
        cards: cards.filter(c => c.deckId === deck.id)
    };
    
    // Convert to JSON and offer as .txt download
    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deck_${deck.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Téléchargement démarré", "success");
    closeAllContextMenus();
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
        // Targeted removal instead of full re-render
        const cardWrapper = document.querySelector(`.card-container[data-id="${id}"]`);
        if (cardWrapper) {
            cardWrapper.remove();
            if (activeDeckId) updateDeckStats(activeDeckId);
        } else {
            renderView();
        }
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

// TOGGLE LEARNED ALL FOR THEME
function toggleThemeLearned(theme) {
    const themeCards = cards.filter(c => c.deckId === activeDeckId && c.theme === theme);
    if (themeCards.length === 0) return;

    const allLearned = themeCards.every(c => c.isLearned);
    const targetState = !allLearned;

    themeCards.forEach(c => {
        c.isLearned = targetState;
    });

    saveData();
    renderView();
    showToast(targetState ? `Catégorie "${theme}" validée` : `Catégorie "${theme}" réinitialisée`, "success");
}

function updateDeckStats(deckId) {
    const deck = decks.find(d => d.id === deckId);
    if (!deck) return;
    
    const deckCards = cards.filter(c => c.deckId === deckId);
    const correctCount = deckCards.filter(c => deck.type === 'qcm' ? c.validationStatus === 'correct' : c.isLearned).length;
    const incorrectCount = deckCards.filter(c => deck.type === 'qcm' && c.validationStatus === 'incorrect').length;
    const totalCount = deckCards.length;
    
    const greenPct = totalCount > 0 ? (correctCount / totalCount) * 100 : 0;
    const redPct = totalCount > 0 ? (incorrectCount / totalCount) * 100 : 0;

    const elText = document.getElementById('deck-stats-text');
    const elQcmText = document.getElementById('deck-stats-qcm');
    const elRingG = document.getElementById('deck-stats-ring-green');
    const elRingR = document.getElementById('deck-stats-ring-red');
    const elPct = document.getElementById('deck-stats-pct');

    if (elText) elText.innerText = `${deck.type === 'qcm' ? (correctCount + incorrectCount) : correctCount} sur ${totalCount} ${deck.type === 'qcm' ? 'cartes étudiées' : 'cartes maîtrisées'}`;
    if (elQcmText) elQcmText.innerHTML = `<span class="text-emerald-400">${correctCount} bonnes</span>  |  <span class="text-red-400">${incorrectCount} mauvaises</span>`;
    if (elPct) elPct.innerText = `${Math.round(deck.type === 'qcm' ? (greenPct + redPct) : greenPct)}%`;
    if (elRingG) {
        elRingG.setAttribute('stroke-dasharray', `${greenPct}, 100`);
    }
    if (elRingR) {
        elRingR.setAttribute('stroke-dasharray', `${redPct}, 100`);
        elRingR.setAttribute('stroke-dashoffset', `-${greenPct}`);
    }
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

function toggleAllTheme(themeName) {
    const deckCards = cards.filter(c => c.deckId === activeDeckId && c.theme === themeName);
    const activeDeck = decks.find(d => d.id === activeDeckId);
    if (!activeDeck || deckCards.length === 0) return;
    const isQcm = activeDeck.type === 'qcm';
    
    if (isQcm) {
        deckCards.forEach(c => {
            c.validationStatus = 'unlearned';
            c.isLearned = false; 
            c.selectedAnswers = [];
        });
        showToast(`Questions réinitialisées`, "success");
    } else {
        const allLearned = deckCards.every(c => c.isLearned);
        deckCards.forEach(c => {
            c.isLearned = !allLearned;
        });
        showToast(allLearned ? `Catégorie "${themeName}" réinitialisée` : `Catégorie "${themeName}" validée`, "success");
    }
    
    saveData();
    renderView();
}

function handleCreateDeck(e) {
    e.preventDefault();
    const title = document.getElementById('deck-title').value;
    const typeEls = document.getElementsByName('deck-type');
    let type = 'flashcard';
    for (const el of typeEls) { if (el.checked) type = el.value; }

    if (title) {
        if (editingId) {
            const idx = decks.findIndex(d => d.id === editingId);
            if (idx !== -1) {
                decks[idx].title = title;
                decks[idx].type = type;
                decks[idx].gradient = selectedGradient;
            }
        } else {
            decks.push({
                id: generateId(),
                title,
                type,
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
    const cardEls = Array.from(grid.children);
    const lowerQ = query.toLowerCase();

    cardEls.forEach(cardWrapper => {
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

    const deck = activeDeckId ? decks.find(d => d.id === activeDeckId) : null;
    const isQcm = deck && deck.type === 'qcm';
    const exampleJson = isQcm 
        ? `[
  {
    "question": "Quelle est la capitale de la France ?",
    "qcmMode": "multi",
    "answers": ["Paris", "Lyon", "Marseille", "Bordeaux"],
    "correctAnswers": [0],
    "explanation": "Paris est la capitale et la ville la plus peuplée de France.",
    "theme": "Géographie"
  },
  {
    "question": "La Terre est plate.",
    "qcmMode": "tf",
    "answers": ["Vrai", "Faux"],
    "correctAnswers": [1],
    "explanation": "La Terre est un ellipsoïde de révolution.",
    "theme": "Sciences"
  }
]`
        : `[
    {
        "question":"Question1 ?",
        "answer":"Answer1 !",
        "theme":"Général"
    },
    {
        "question":"Question2 ?",
        "answer":"Answer2 !",
        "theme":"Général"
    }, ...
]`;

    document.getElementById('modal-ie-title').innerText = "Importer des cartes";
    document.getElementById('modal-ie-desc').innerText = "Collez du JSON ou déposez un fichier.";
    document.getElementById('ie-content').value = "";
    document.getElementById('ie-content').placeholder = exampleJson;
    document.getElementById('ie-content').readOnly = false;

    // Toggle UI Elements
    document.getElementById('import-drop-zone').classList.remove('hidden');
    document.getElementById('btn-copy-clipboard').classList.add('hidden');
    document.getElementById('btn-paste-clipboard').classList.remove('hidden');

    document.getElementById('btn-perform-import').classList.remove('hidden');
    document.getElementById('btn-download-json').classList.add('hidden');
    document.getElementById('btn-download-txt').classList.add('hidden');
    document.getElementById('btn-open-tuto').classList.remove('hidden');

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
    
    createIconsIn(modal);
}

function exportDeck() {
    const deckCards = cards.filter(c => c.deckId === activeDeckId);
    if (deckCards.length === 0) return showToast("Aucune carte à exporter", "error");
    const activeDeck = decks.find(d => d.id === activeDeckId);
    const isQcm = activeDeck && activeDeck.type === 'qcm';

    const exportData = deckCards.map(c => {
        if (isQcm) {
            return {
                question: c.question,
                qcmMode: c.qcmMode,
                answers: c.answers,
                correctAnswers: c.correctAnswers,
                explanation: c.explanation || c.answer,
                theme: c.theme
            };
        }
        return {
            question: c.question,
            answer: c.answer,
            theme: c.theme
        };
    });

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
    document.getElementById('btn-open-tuto').classList.add('hidden');

    modal.classList.remove('hidden');
    createIconsIn(modal);
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

        const activeDeck = decks.find(d => d.id === activeDeckId);
        const isQcm = activeDeck && activeDeck.type === 'qcm';

        let count = 0;
        data.forEach(item => {
            if (isQcm && item.question && Array.isArray(item.answers) && item.correctAnswers !== undefined) {
                cards.push({
                    id: generateId(),
                    deckId: activeDeckId,
                    question: item.question,
                    qcmMode: item.qcmMode || 'multi',
                    answers: item.answers,
                    correctAnswers: item.correctAnswers,
                    explanation: item.explanation || "",
                    answer: item.explanation || item.answer || "",
                    theme: item.theme || "Importé",
                    isLearned: false,
                    validationStatus: 'unlearned',
                    selectedAnswers: [],
                    createdAt: Date.now(),
                    order: cards.length
                });
                count++;
            } else if (!isQcm && item.question && item.answer) {
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

function downloadDeckDirectly(deckId) {
    const deckCards = cards.filter(c => c.deckId === deckId);
    if (deckCards.length === 0) return showToast("Aucune carte à télécharger", "error");

    const d = decks.find(d => d.id === deckId);
    const isQcm = d && d.type === 'qcm';

    const exportData = deckCards.map(c => {
        if (isQcm) {
            return {
                question: c.question,
                qcmMode: c.qcmMode,
                answers: c.answers,
                correctAnswers: c.correctAnswers,
                explanation: c.explanation || c.answer,
                theme: c.theme
            };
        }
        return {
            question: c.question,
            answer: c.answer,
            theme: c.theme
        };
    });

    const content = JSON.stringify(exportData, null, 2);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // Create a clean filename from the deck title
    const title = d ? d.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'bloc';

    a.download = `flashcards_${title}_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Téléchargement lancé", "success");
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

// --- UI HELPERS ---
function updateDeckTypeUI() {
    // Just re-renders peer classes visually handled by CSS logic but hook exists in case JS behavior is needed later
}

// --- TUTORIAL POPUP ---

const TUTO_PROMPTS = {
    flashcard: `A partir de mes documents, g\u00e9n\u00e8re une structure de donn\u00e9es JSON pour en extraire des Flashcards de r\u00e9vision, en regroupant les questions dans des groupes/th\u00e8mes, en suivant ce mod\u00e8le (pour le langage mathématique, utilise le format LaTeX et vérifie ta syntaxe à plusieurs reprises):
[
    {
        "question":"Question1 ?",
        "answer":"Answer1 !",
        "theme":"G\u00e9n\u00e9ral"
    },
    {
        "question":"Question2 ?",
        "answer":"Answer2 !",
        "theme":"G\u00e9n\u00e9ral"
    }, ...
]`,
    qcm: `A partir de mes documents, g\u00e9n\u00e8re une structure de donn\u00e9es JSON pour en extraire des QCM de r\u00e9vision, en regroupant les questions dans des groupes/th\u00e8mes, en suivant ce mod\u00e8le (pour le langage mathématique, utilise le format LaTeX et vérifie ta syntaxe à plusieurs reprises):
[
  {
    "question": "Quelle est la capitale de la France ?",
    "qcmMode": "multi",
    "answers": ["Paris", "Lyon", "Marseille", "Bordeaux"],
    "correctAnswers": [0],
    "explanation": "Paris est la capitale et la ville la plus peupl\u00e9e de France.",
    "theme": "G\u00e9ographie"
  },
  {
    "question": "La Terre est plate.",
    "qcmMode": "tf",
    "answers": ["Vrai", "Faux"],
    "correctAnswers": [1],
    "explanation": "La Terre est un ellipso\u00efde de r\u00e9volution.",
    "theme": "Sciences"
  },...
]`
};

function openTutoPopup() {
    const deck = activeDeckId ? decks.find(d => d.id === activeDeckId) : null;
    const isQcm = deck && deck.type === 'qcm';
    const type = isQcm ? 'qcm' : 'flashcard';

    const title = isQcm
        ? 'Comment g\u00e9n\u00e9rer ses QCM \u00e0 partir de ses cours ?'
        : 'Comment g\u00e9n\u00e9rer ses flashcards \u00e0 partir de ses cours ?';

    const prompt = TUTO_PROMPTS[type];

    const contentEl = document.getElementById('tuto-content');
    contentEl.innerHTML = `
        <div class="p-6 border-b border-slate-800">
            <div class="flex items-center gap-3">
                <div class="p-2 bg-indigo-500/20 rounded-xl">
                    <i data-lucide="${isQcm ? 'list-checks' : 'layers'}" class="w-5 h-5 text-indigo-400"></i>
                </div>
                <h2 class="text-lg font-bold text-white pr-8">${title}</h2>
            </div>
        </div>
        <div class="p-6 space-y-5">
            <div class="tuto-step">
                <span class="tuto-step-icon">1\uFE0F\u20E3</span>
                <span>Copie ce prompt <span class="text-slate-500">(adapte-le selon tes besoins)</span> :</span>
            </div>
            <div class="relative">
                <div class="tuto-code-block" id="tuto-prompt-code">${escapeHtml(prompt)}</div>
                <button onclick="copyTutoPrompt()" class="tuto-copy-btn" id="tuto-copy-btn" title="Copier le prompt">
                    <i data-lucide="copy" class="w-4 h-4"></i>
                </button>
            </div>
            <div class="tuto-step">
                <span class="tuto-step-icon">2\uFE0F\u20E3</span>
                <span>Utilise ton IA pr\u00e9f\u00e9r\u00e9e et fournis-lui le prompt & tes documents de cours :</span>
            </div>
            <div>
                <a href="https://gemini.google.com/app" target="_blank" rel="noopener noreferrer" class="tuto-link-btn">
                    <i data-lucide="sparkles" class="w-4 h-4"></i> Gemini
                    <i data-lucide="external-link" class="w-3.5 h-3.5 opacity-60"></i>
                </a>
            </div>
            <div class="tuto-step">
                <span class="tuto-step-icon">3\uFE0F\u20E3</span>
                <span>Copie le r\u00e9sultat ou t\u00e9l\u00e9charge sous forme de fichier la structure de donn\u00e9es g\u00e9n\u00e9r\u00e9e, et ins\u00e8re-le dans la zone d\u2019importation apr\u00e8s avoir ferm\u00e9 ce tutoriel</span>
            </div>
        </div>
    `;

    const overlay = document.getElementById('tuto-overlay');
    overlay.classList.remove('hidden');

    // Re-trigger animation
    const popup = document.getElementById('tuto-popup');
    popup.classList.remove('tuto-animate-in');
    void popup.offsetWidth; // Force reflow
    popup.classList.add('tuto-animate-in');

    createIconsIn(overlay);
}

function closeTutoPopup() {
    document.getElementById('tuto-overlay').classList.add('hidden');
}

function copyTutoPrompt() {
    const codeEl = document.getElementById('tuto-prompt-code');
    const btn = document.getElementById('tuto-copy-btn');
    if (!codeEl) return;

    const text = codeEl.textContent;
    navigator.clipboard.writeText(text).then(() => {
        btn.classList.add('copied');
        btn.innerHTML = '<i data-lucide="check" class="w-4 h-4"></i>';
        createIconsIn(btn);
        showToast('Prompt copi\u00e9 !', 'success');
        setTimeout(() => {
            btn.classList.remove('copied');
            btn.innerHTML = '<i data-lucide="copy" class="w-4 h-4"></i>';
            createIconsIn(btn);
        }, 2000);
    }).catch(() => {
        showToast('Erreur lors de la copie', 'error');
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// --- INITIALIZATION ---
// Use DOMContentLoaded for deferred scripts compatibility
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    // DOM already loaded (e.g. script at end of body)
    window.onload = initApp;
}
