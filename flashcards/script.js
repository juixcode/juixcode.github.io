// --- APP VERSION ---
const APP_VERSION = 'v2.1'; // Keep in sync with sw.js

// --- DATA CONSTANTS ---
const STORAGE_KEY_CARDS = 'flash-cards-v3';
const STORAGE_KEY_DECKS = 'flash-decks-v3';
const PREFS_KEY = 'flash-prefs-v3';
const THEME_COLORS_KEY = 'flash-theme-colors-v3';
const STORAGE_KEY_PREFERENCE = 'flash-storage-pref';
const STORAGE_KEY_LOCAL = 'flash-local-data-v4';
const STORAGE_KEY_CLOUD_CACHE = 'flash-cloud-cache-v4';
const MAX_CLOUD_SIZE_BYTES = 500 * 1024; // 512,000 bytes (500 Ko)
const SETTING_KEY_FONT_STEP = 'flash-setting-card-font-step';
const SETTING_KEY_ALIGN_LEFT = 'flash-setting-align-left';
const SETTING_KEY_DISABLE_3D = 'flash-setting-disable-3d';

// --- STATE ---
let decks = [];
let cards = [];
let themeColors = {};
let currentView = 'home';
let activeDeckId = null;
let currentSortMode = 'date';
let isCustomSortMode = false;
let draggedItem = null;

// Storage Mode & Firebase State
let currentStorageMode = 'local'; // 'local' | 'cloud'
let currentUser = null; // Google user profile if authenticated
let isSyncingCloud = false;
let _cloudSaveTimeout = null;
let _lastCloudSizeBytes = 0;

function getCloudUsageBytes() {
    if (_lastCloudSizeBytes > 0) return _lastCloudSizeBytes;
    try {
        if (typeof extractCompactPayload === 'function') {
            const payload = extractCompactPayload();
            _lastCloudSizeBytes = new Blob([JSON.stringify(payload)]).size;
            return _lastCloudSizeBytes;
        }
    } catch (e) { }
    return 0;
}

// --- FIREBASE HELPER ---
function getFirebaseInstance() {
    if (typeof firebase === 'undefined') return null;
    if (firebase.apps && firebase.apps.length > 0) return firebase;
    if (typeof firebaseConfig !== 'undefined' && firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey !== "VOTRE_API_KEY") {
        try {
            firebase.initializeApp(firebaseConfig);
            try {
                firebase.firestore().settings({ ignoreUndefinedProperties: true, merge: true });
            } catch (e) { }
            try {
                firebase.firestore().enablePersistence({ synchronizeTabs: true }).catch((err) => {
                    if (err.code === 'failed-precondition') {
                        console.warn("Firestore persistence: onglets multiples ou précondition non remplie.");
                    } else if (err.code === 'unimplemented') {
                        console.warn("Firestore persistence: non supporté par ce navigateur.");
                    } else {
                        console.warn("Firestore persistence error:", err);
                    }
                });
            } catch (e) {
                console.warn("Firestore enablePersistence exception:", e);
            }
            return firebase;
        } catch (e) {
            console.warn("Firebase initialization error:", e);
            return null;
        }
    }
    return null;
}

function checkFirebaseConfigured() {
    const fb = getFirebaseInstance();
    if (!fb) {
        openStorageModal(`
            <button onclick="closeStorageModal()" aria-label="Fermer" class="storage-modal-close">
                <i data-lucide="x" class="storage-icon"></i>
            </button>
            <div class="storage-modal-tag tag-warn">
                <i data-lucide="alert-triangle" class="storage-icon"></i>
                <span>Configuration requise</span>
            </div>
            <h2 class="storage-modal-title">Configuration Firebase requise</h2>
            <p class="storage-modal-desc">
                Pour activer la synchronisation Cloud Google, renseignez vos clés de projet dans :
            </p>

            <div class="storage-code-box">
                <code>flashcards/firebase-config.js</code>
            </div>

            <div class="storage-steps-box">
                <div style="font-weight: 600; color: #e2e8f0; margin-bottom: 0.25rem;">Guide d'installation rapide :</div>
                <div>1. Créez un projet gratuit sur <strong>console.firebase.google.com</strong></div>
                <div>2. Activez l'authentification <strong>Google Sign-in</strong></div>
                <div>3. Activez la base <strong>Cloud Firestore</strong></div>
                <div>4. Copiez vos clés dans <code>firebase-config.js</code></div>
            </div>

            <div class="storage-modal-actions" style="margin-top: 1.25rem;">
                <button onclick="closeStorageModal()" class="storage-btn-secondary full-width">
                    Compris, continuer en mode Local
                </button>
            </div>
        `);
        return false;
    }
    return true;
}

async function signInWithGoogle() {
    if (window.location.protocol === 'file:') {
        showToast("La connexion Google requiert un serveur web (http://localhost ou https://) et ne fonctionne pas en file://", "error");
        return null;
    }
    if (!checkFirebaseConfigured()) return null;
    const fb = getFirebaseInstance();
    try {
        const provider = new fb.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const result = await fb.auth().signInWithPopup(provider);
        currentUser = result.user;
        return currentUser;
    } catch (err) {
        if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
            showToast("Connexion annulée", "info");
        } else if (err.code === 'auth/popup-blocked') {
            console.warn("Popup bloquée par le navigateur:", err);
            showToast("Fenêtre de connexion bloquée par le navigateur. Cliquez à nouveau sur Se connecter ou autorisez les pop-ups.", "warning");
        } else if (err.code === 'auth/operation-not-supported-in-this-environment') {
            showToast("Connexion impossible : ouvrez le site via un serveur (http://localhost...) ou https://", "error");
        } else if (err.code === 'auth/unauthorized-domain') {
            showToast("Domaine non autorisé dans Firebase Console (Authentication > Settings > Authorized domains)", "error");
        } else {
            console.error("Erreur connexion Google:", err);
            showToast("Erreur de connexion Google : " + err.message, "error");
        }
        return null;
    }
}

let _cloudUnsubscribe = null;
let _lastSavedUpdatedAt = 0;
let _baseCloudUpdatedAt = 0;
let _hasLocalModifications = false;
let _isConflictModalOpen = false;
let _pendingConflictCloudData = null;

async function signOutGoogle() {
    unsubscribeFromCloudUpdates();
    const fb = getFirebaseInstance();
    if (fb && fb.auth) {
        try {
            await fb.auth().signOut();
        } catch (e) { }
    }
    currentUser = null;
}

// --- DATA PERSISTENCE & DELTA STORAGE SYSTEM ---

function saveLocalData() {
    try {
        const payload = extractCompactPayload();
        localStorage.setItem(STORAGE_KEY_LOCAL, JSON.stringify(payload));
        localStorage.setItem(PREFS_KEY, JSON.stringify({ sortMode: currentSortMode }));
        localStorage.setItem(THEME_COLORS_KEY, JSON.stringify(themeColors));
    } catch (e) {
        console.warn('saveLocalData error:', e);
    }
}

let _isWritingToFirestore = false;
let _pendingFirestorePayload = null;

async function _executeFirestoreWrite(payload) {
    if (!currentUser) return;
    const fb = getFirebaseInstance();
    if (!fb || !fb.firestore) return;

    if (_isWritingToFirestore) {
        // Enregistrer la version la plus récente pour l'exécuter dès la fin de l'écriture en cours
        _pendingFirestorePayload = payload;
        return;
    }

    _isWritingToFirestore = true;
    isSyncingCloud = true;
    renderStorageModeWidget();

    try {
        const cleanPayload = JSON.parse(JSON.stringify(payload));
        // Utiliser .set() direct avec un timeout pour éviter de bloquer indéfiniment si coupure réseau
        const writePromise = fb.firestore().collection('users').doc(currentUser.uid).set(cleanPayload);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Délai réseau dépassé")), 12000));
        await Promise.race([writePromise, timeoutPromise]);

        _hasLocalModifications = false;
        _baseCloudUpdatedAt = cleanPayload.updatedAt || Date.now();
        _lastSavedUpdatedAt = _baseCloudUpdatedAt;
    } catch (err) {
        console.warn("Erreur écriture Firestore:", err);
        const errMsg = err && err.message ? err.message : String(err);
        if (!_pendingFirestorePayload && navigator.onLine) {
            showToast("Erreur synchronisation Cloud : " + errMsg, "error");
        }
    } finally {
        _isWritingToFirestore = false;
        isSyncingCloud = false;
        renderStorageModeWidget();

        // Enchaîner avec la modification la plus récente si survenue pendant le transfert réseau
        if (_pendingFirestorePayload) {
            const nextPayload = _pendingFirestorePayload;
            _pendingFirestorePayload = null;
            _executeFirestoreWrite(nextPayload);
        }
    }
}

function saveCloudData(immediate = false) {
    const payload = extractCompactPayload();
    _lastSavedUpdatedAt = payload.updatedAt;
    _hasLocalModifications = true;
    const sizeBytes = new Blob([JSON.stringify(payload)]).size;
    _lastCloudSizeBytes = sizeBytes;
    renderStorageModeWidget();

    // 1. Mise en cache locale compacte et isolée
    try {
        localStorage.setItem(STORAGE_KEY_CLOUD_CACHE, JSON.stringify(payload));
    } catch (e) {
        console.warn('Erreur mise à jour cache cloud:', e);
    }

    // 2. Mesure du quota strict de 500 Ko (512 000 octets)
    if (sizeBytes > MAX_CLOUD_SIZE_BYTES) {
        showToast(`Quota Cloud dépassé (${(sizeBytes / 1024).toFixed(1)} Ko / 500 Ko). Supprimez des cartes pour synchroniser.`, "error");
        return;
    }

    // 3. Écriture Firestore sérialisée si utilisateur connecté
    if (!currentUser) return;
    const fb = getFirebaseInstance();
    if (!fb) return;

    if (navigator.onLine === false) {
        // En mode hors-ligne : les modifications restent sécurisées dans le cache local.
        // L'envoi vers Firestore sera déclenché au retour du réseau (événement 'online')
        // après vérification d'absence de conflit.
        isSyncingCloud = false;
        renderStorageModeWidget();
        return;
    }

    if (_cloudSaveTimeout) clearTimeout(_cloudSaveTimeout);

    if (immediate) {
        _executeFirestoreWrite(payload);
    } else {
        _cloudSaveTimeout = setTimeout(() => {
            _executeFirestoreWrite(payload);
        }, 400);
    }
}

let _saveTimeout = null;
function saveData() {
    _hasLocalModifications = true;
    if (currentStorageMode === 'cloud') {
        saveCloudData(false);
    } else {
        if (_saveTimeout) clearTimeout(_saveTimeout);
        _saveTimeout = setTimeout(saveLocalData, 100);
    }
}

function saveDataNow() {
    if (currentStorageMode === 'cloud') {
        if (_hasLocalModifications) {
            saveCloudData(true);
        }
    } else {
        if (_saveTimeout) clearTimeout(_saveTimeout);
        saveLocalData();
    }
}

function createIconsIn(element) {
    if (typeof lucide === 'undefined' || typeof lucide.createIcons !== 'function') return;
    try {
        if (!element || element === document) {
            lucide.createIcons();
            return;
        }
        const target = (element.hasAttribute && element.hasAttribute('data-lucide'))
            ? (element.parentElement || document)
            : element;
        lucide.createIcons({ root: target });
    } catch (e) {
        try {
            lucide.createIcons();
        } catch (err) {
            console.warn('createIcons error:', err);
        }
    }
}

// Lazy Rendering via IntersectionObserver
let _cardVisibilityObserver = null;
let _inflationQueue = [];
let _inflationRunning = false;
let _observerPaused = false;
const INFLATE_BATCH_SIZE = 6;

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
    if (_cardVisibilityObserver) {
        _cardVisibilityObserver.disconnect();
    }
    _inflationQueue = [];
    _inflationRunning = false;

    _cardVisibilityObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const cardEl = entry.target;

            if (entry.isIntersecting) {
                if (cardEl.dataset.inflated !== 'true') {
                    queueInflation(cardEl);
                } else {
                    const inner = cardEl.querySelector('.card-inner');
                    if (inner && inner.style.display === 'none') {
                        inner.style.display = '';
                    }
                }
            } else {
                // If it scrolls away before inflating, remove from queue
                const qi = _inflationQueue.indexOf(cardEl);
                if (qi !== -1) _inflationQueue.splice(qi, 1);
            }
        });
    }, {
        rootMargin: '600px 0px',
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
    const inner = fullCard.querySelector('.card-inner');
    if (inner) {
        skeleton.innerHTML = '';
        skeleton.appendChild(inner);
    } else {
        skeleton.innerHTML = fullCard.innerHTML;
    }

    // Perspective added now for 3D flip
    skeleton.classList.add('perspective-1000');

    // Click handler for card flipping
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

    // Render KaTeX only if math delimiters exist
    renderKatexElement(skeleton);
    skeleton.dataset.katexRendered = 'true';
    skeleton.classList.add('katex-rendered');

    // Convert icons inside this skeleton only
    createIconsIn(skeleton);
}

// Create a lightweight skeleton placeholder for a card
function createCardSkeleton(card) {
    const skeleton = document.createElement('div');
    skeleton.className = "group h-80 w-full cursor-pointer card-container select-none";
    skeleton.dataset.id = card.id;
    skeleton.dataset.inflated = 'false';

    return skeleton;
}

function renderKatexElement(element) {
    if (!element || typeof renderMathInElement === 'undefined') return;
    // Fast path: skip KaTeX regex parser if text contains no math delimiters
    const text = element.textContent || '';
    if (!text.includes('$') && !text.includes('\\')) {
        return;
    }
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

// Observe a card skeleton/element for lazy inflation
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

let DEFAULT_DECKS_CONFIG = [];

// --- DATA MANAGEMENT ---

function generateId() { return Math.random().toString(36).substr(2, 9); }

// Automatic purge of obsolete legacy storage keys (v1, v2, legacy flash prefixes)
function purgeLegacyStorage() {
    try {
        const activeKeys = [
            STORAGE_KEY_LOCAL,
            STORAGE_KEY_CLOUD_CACHE,
            STORAGE_KEY_PREFERENCE,
            THEME_COLORS_KEY,
            PREFS_KEY,
            SETTING_KEY_FONT_STEP,
            SETTING_KEY_ALIGN_LEFT,
            SETTING_KEY_DISABLE_3D
        ];
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key) continue;
            // Ne jamais supprimer les clés de paramètres utilisateur
            if (key.startsWith('flash-setting-')) continue;
            const isFlashKey = key.startsWith('flash-') || key.startsWith('flashcards') || key.startsWith('flash_');
            if (isFlashKey && !activeKeys.includes(key) && key !== STORAGE_KEY_DECKS && key !== STORAGE_KEY_CARDS) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(k => {
            localStorage.removeItem(k);
            console.info(`[Flashcards] Purge de l'ancienne clé localStorage : "${k}"`);
        });
    } catch (e) {
        console.warn('purgeLegacyStorage error:', e);
    }
}

async function fetchDefaultDecksConfig() {
    if (DEFAULT_DECKS_CONFIG && DEFAULT_DECKS_CONFIG.length > 0) {
        return DEFAULT_DECKS_CONFIG;
    }
    try {
        const response = await fetch('./default-decks.json');
        if (response.ok) {
            DEFAULT_DECKS_CONFIG = await response.json();
            return DEFAULT_DECKS_CONFIG;
        }
    } catch (e) {
        console.warn('Could not fetch default-decks.json:', e);
    }
    return [];
}

function formatCardContent(text) {
    if (!text || typeof text !== 'string') return text || '';
    // Normalize literal escaped newlines (\n, \r\n) that are outside LaTeX math delimiters ($$, \[, \(, $)
    const mathRegex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\(.*?\\\)|(?<!\\)\$.*?(?<!\\)\$)/g;
    return text.split(mathRegex).map((part, index) => {
        if (index % 2 === 0) {
            return part.replace(/\\r\\n|\\n/g, '\n');
        }
        return part;
    }).join('').trim();
}

function createBasePublicDeck(conf) {
    return {
        id: conf.id,
        title: conf.title,
        type: conf.type || 'flashcard',
        gradient: conf.gradient,
        createdAt: conf.createdAt || 1700000000000,
        isPublic: true,
        order: typeof conf.order !== 'undefined' ? conf.order : -1
    };
}

function createBasePublicCards(conf) {
    return (conf.cards || []).map((item, idx) => {
        const q = formatCardContent(item.question);
        const a = formatCardContent(item.answer || item.explanation || '');
        const card = {
            id: `${conf.id}_${idx}`,
            deckId: conf.id,
            question: q,
            answer: a,
            theme: item.theme,
            isLearned: false,
            validationStatus: 'unlearned',
            createdAt: 1700000000000 + idx,
            order: idx,
            isDefaultCard: true
        };
        if (item.qcmMode) card.qcmMode = item.qcmMode;
        if (item.answers) card.answers = item.answers.map(ans => formatCardContent(ans));
        if (item.correctAnswers) card.correctAnswers = item.correctAnswers;
        if (item.explanation !== undefined) card.explanation = formatCardContent(item.explanation);
        if (item.qcmMode) card.selectedAnswers = [];
        return card;
    });
}

function extractCompactPayload() {
    // 1. Blocs créés par l'utilisateur
    const customDecks = decks.filter(d => !d.isPublic);
    const customDeckIds = new Set(customDecks.map(d => d.id));

    // 2. Cartes appartenant aux blocs personnalisés
    const customCards = cards.filter(c => customDeckIds.has(c.deckId));

    // 3. Overrides / Deltas pour les blocs publics
    const publicOverrides = {};
    const publicConfigs = DEFAULT_DECKS_CONFIG || [];

    publicConfigs.forEach(conf => {
        const pDeckId = conf.id;
        const currentDeck = decks.find(d => d.id === pDeckId);
        if (!currentDeck) return;

        const currentDeckCards = cards.filter(c => c.deckId === pDeckId);
        const originalCards = conf.cards || [];
        const originalIdSet = new Set(originalCards.map((_, idx) => `${pDeckId}_${idx}`));
        const currentIdSet = new Set(currentDeckCards.map(c => c.id));

        // Cartes ajoutées par l'utilisateur dans ce bloc public
        const addedCards = currentDeckCards.filter(c => !originalIdSet.has(c.id));

        // Cartes originales supprimées par l'utilisateur
        const deletedCardIds = [];
        originalIdSet.forEach(id => {
            if (!currentIdSet.has(id)) deletedCardIds.push(id);
        });

        // Cartes originales modifiées ou ayant un état d'apprentissage
        const modifiedCards = [];
        const cardStates = {};

        currentDeckCards.forEach(c => {
            if (!originalIdSet.has(c.id)) return;
            const idx = parseInt(c.id.slice(pDeckId.length + 1), 10);
            const orig = originalCards[idx];
            if (!orig) return;

            const origAns = orig.answer || orig.explanation || '';
            const isContentModified =
                c.question !== orig.question ||
                c.answer !== origAns ||
                c.theme !== orig.theme ||
                (c.answers && JSON.stringify(c.answers) !== JSON.stringify(orig.answers)) ||
                (c.correctAnswers && JSON.stringify(c.correctAnswers) !== JSON.stringify(orig.correctAnswers));

            if (isContentModified) {
                modifiedCards.push({
                    id: c.id,
                    question: c.question,
                    answer: c.answer,
                    theme: c.theme,
                    answers: c.answers,
                    correctAnswers: c.correctAnswers,
                    explanation: c.explanation,
                    qcmMode: c.qcmMode
                });
            }

            const hasProgress = c.isLearned ||
                (c.validationStatus && c.validationStatus !== 'unlearned') ||
                (c.selectedAnswers && c.selectedAnswers.length > 0) ||
                (typeof c.order === 'number' && c.order !== idx);

            if (hasProgress) {
                cardStates[c.id] = {
                    isLearned: !!c.isLearned,
                    validationStatus: c.validationStatus || 'unlearned',
                    selectedAnswers: c.selectedAnswers || [],
                    order: c.order
                };
            }
        });

        const deckProps = {};
        if (currentDeck.title !== conf.title) deckProps.title = currentDeck.title;
        if (currentDeck.gradient !== conf.gradient) deckProps.gradient = currentDeck.gradient;
        if (typeof currentDeck.order === 'number' && currentDeck.order !== conf.order) deckProps.order = currentDeck.order;

        if (addedCards.length > 0 || deletedCardIds.length > 0 || modifiedCards.length > 0 || Object.keys(cardStates).length > 0 || Object.keys(deckProps).length > 0) {
            publicOverrides[pDeckId] = {};
            if (addedCards.length > 0) publicOverrides[pDeckId].addedCards = addedCards;
            if (deletedCardIds.length > 0) publicOverrides[pDeckId].deletedCardIds = deletedCardIds;
            if (modifiedCards.length > 0) publicOverrides[pDeckId].modifiedCards = modifiedCards;
            if (Object.keys(cardStates).length > 0) publicOverrides[pDeckId].cardStates = cardStates;
            if (Object.keys(deckProps).length > 0) publicOverrides[pDeckId].deckProps = deckProps;
        }
    });

    return {
        v: 4,
        customDecks,
        customCards,
        publicOverrides,
        themeColors,
        sortMode: currentSortMode,
        updatedAt: Date.now()
    };
}

function applyCompactPayload(payload) {
    if (!payload) return;

    if (payload.sortMode) {
        currentSortMode = payload.sortMode;
        isCustomSortMode = currentSortMode === 'custom';
    }
    if (payload.themeColors) themeColors = payload.themeColors;

    const loadedCustomDecks = payload.customDecks || [];
    const loadedCustomCards = payload.customCards || [];

    const publicConfigs = DEFAULT_DECKS_CONFIG || [];
    const publicOverrides = payload.publicOverrides || {};

    const loadedPublicDecks = [];
    let loadedPublicCards = [];

    publicConfigs.forEach(conf => {
        const overrides = publicOverrides[conf.id] || {};

        const deckObj = createBasePublicDeck(conf);
        if (overrides.deckProps) {
            if (overrides.deckProps.title) deckObj.title = overrides.deckProps.title;
            if (overrides.deckProps.gradient) deckObj.gradient = overrides.deckProps.gradient;
            if (typeof overrides.deckProps.order === 'number') deckObj.order = overrides.deckProps.order;
        }
        loadedPublicDecks.push(deckObj);

        const baseCards = createBasePublicCards(conf);
        const deletedIds = new Set(overrides.deletedCardIds || []);
        const modifiedMap = new Map((overrides.modifiedCards || []).map(c => [c.id, c]));
        const statesMap = overrides.cardStates || {};

        const activeBaseCards = baseCards
            .filter(c => !deletedIds.has(c.id))
            .map(c => {
                let card = { ...c };
                if (modifiedMap.has(card.id)) {
                    card = { ...card, ...modifiedMap.get(card.id) };
                }
                if (statesMap[card.id]) {
                    const st = statesMap[card.id];
                    if (typeof st.isLearned !== 'undefined') card.isLearned = st.isLearned;
                    if (st.validationStatus) card.validationStatus = st.validationStatus;
                    if (st.selectedAnswers) card.selectedAnswers = st.selectedAnswers;
                    if (typeof st.order === 'number') card.order = st.order;
                }
                return card;
            });

        const addedCards = (overrides.addedCards || []).map(c => ({
            ...c,
            deckId: conf.id
        }));

        loadedPublicCards = loadedPublicCards.concat(activeBaseCards, addedCards);
    });

    decks = [...loadedPublicDecks, ...loadedCustomDecks];
    cards = [...loadedPublicCards, ...loadedCustomCards];

    cards.forEach((c, i) => { if (typeof c.order === 'undefined') c.order = i; });
}

async function loadLocalData() {
    await fetchDefaultDecksConfig();

    const storedLocal = localStorage.getItem(STORAGE_KEY_LOCAL);
    if (storedLocal) {
        try {
            const payload = JSON.parse(storedLocal);
            applyCompactPayload(payload);
            return;
        } catch (e) {
            console.warn('Error parsing local storage:', e);
        }
    }

    // Migration transparente depuis le stockage v3 (flash-decks-v3 / flash-cards-v3)
    const storedDecks = localStorage.getItem(STORAGE_KEY_DECKS);
    const storedCards = localStorage.getItem(STORAGE_KEY_CARDS);
    if (storedDecks && storedCards) {
        try {
            const v3Decks = JSON.parse(storedDecks);
            const v3Cards = JSON.parse(storedCards);
            const storedPrefs = localStorage.getItem(PREFS_KEY);
            if (storedPrefs) try { currentSortMode = JSON.parse(storedPrefs).sortMode || 'date'; } catch (e) { }
            const storedColors = localStorage.getItem(THEME_COLORS_KEY);
            if (storedColors) try { themeColors = JSON.parse(storedColors); } catch (e) { }

            (DEFAULT_DECKS_CONFIG || []).forEach(conf => {
                const origCards = conf.cards || [];
                v3Cards.forEach(c => {
                    if (c.deckId === conf.id && !c.id.startsWith(conf.id + '_')) {
                        const origIdx = origCards.findIndex(orig => orig.question === c.question);
                        if (origIdx !== -1) {
                            c.id = `${conf.id}_${origIdx}`;
                        }
                    }
                });
            });

            decks = v3Decks;
            cards = v3Cards;
            isCustomSortMode = currentSortMode === 'custom';

            saveLocalData();
            localStorage.removeItem(STORAGE_KEY_DECKS);
            localStorage.removeItem(STORAGE_KEY_CARDS);
            return;
        } catch (e) {
            console.warn('Error migrating v3 data:', e);
        }
    }

    // Premier visiteur : initialisation standard avec la configuration par défaut
    applyCompactPayload({
        customDecks: [],
        customCards: [],
        publicOverrides: {},
        sortMode: 'date',
        themeColors: {}
    });
}

async function loadCloudData(user) {
    if (!user) return false;
    const fb = getFirebaseInstance();
    if (!fb) return false;

    isSyncingCloud = true;
    renderStorageModeWidget();

    try {
        await fetchDefaultDecksConfig();
        const docRef = fb.firestore().collection('users').doc(user.uid);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            const data = docSnap.data();
            if (data.publicOverrides || data.v >= 4) {
                applyCompactPayload(data);
            } else {
                decks = data.decks || [];
                cards = data.cards || [];
                themeColors = data.themeColors || {};
                currentSortMode = data.sortMode || 'date';
                isCustomSortMode = currentSortMode === 'custom';
                saveCloudData(true);
            }

            const payload = extractCompactPayload();
            _lastCloudSizeBytes = new Blob([JSON.stringify(payload)]).size;
            _baseCloudUpdatedAt = data.updatedAt || payload.updatedAt || Date.now();
            _lastSavedUpdatedAt = _baseCloudUpdatedAt;
            _hasLocalModifications = false;
            localStorage.setItem(STORAGE_KEY_CLOUD_CACHE, JSON.stringify(payload));
        } else {
            await loadLocalData();
            saveCloudData(true);
        }

        isSyncingCloud = false;
        renderStorageModeWidget();
        return true;
    } catch (err) {
        isSyncingCloud = false;
        renderStorageModeWidget();
        console.error("Erreur chargement cloud:", err);
        showToast("Erreur de chargement Cloud : " + err.message, "error");
        return false;
    }
}

function subscribeToCloudUpdates(user) {
    unsubscribeFromCloudUpdates();
    if (!user) return;
    const fb = getFirebaseInstance();
    if (!fb || !fb.firestore) return;

    try {
        const docRef = fb.firestore().collection('users').doc(user.uid);
        _cloudUnsubscribe = docRef.onSnapshot((docSnap) => {
            // Ignorer les écritures émises par ce client en cours de commit
            if (docSnap.metadata && docSnap.metadata.hasPendingWrites) {
                return;
            }

            if (docSnap.exists) {
                const data = docSnap.data();
                const incomingUpdatedAt = data.updatedAt || 0;
                // Sécurité anti-écrasement : si des modifications locales sont en attente et que le Cloud a changé
                if (_hasLocalModifications && incomingUpdatedAt && _baseCloudUpdatedAt && incomingUpdatedAt > _baseCloudUpdatedAt) {
                    showConflictModal(data);
                    return;
                }
                handleIncomingCloudData(data, false);
            }
        }, (error) => {
            console.warn("Erreur écouteur temps réel Firestore:", error);
        });
    } catch (err) {
        console.warn("Impossible d'activer l'écouteur temps réel Firestore:", err);
    }
}

function unsubscribeFromCloudUpdates() {
    if (_cloudUnsubscribe) {
        try {
            _cloudUnsubscribe();
        } catch (e) { }
        _cloudUnsubscribe = null;
    }
}

function handleIncomingCloudData(data, isSilent = false) {
    if (!data) return;

    // Vérifier timestamp : appliquer seulement si les données distantes sont plus récentes
    const incomingUpdatedAt = data.updatedAt || 0;
    if (_lastSavedUpdatedAt && incomingUpdatedAt && incomingUpdatedAt <= _lastSavedUpdatedAt) {
        return;
    }

    // Vérifier si l'utilisateur est en train de saisir dans un champ texte
    const isModalOpen = document.getElementById('modal-overlay') && !document.getElementById('modal-overlay').classList.contains('hidden');
    const isEditing = isModalOpen && document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA');

    if (data.publicOverrides || data.v >= 4) {
        applyCompactPayload(data);
    } else {
        decks = data.decks || [];
        cards = data.cards || [];
        themeColors = data.themeColors || {};
        currentSortMode = data.sortMode || 'date';
        isCustomSortMode = currentSortMode === 'custom';
    }

    _baseCloudUpdatedAt = incomingUpdatedAt || Date.now();
    _lastSavedUpdatedAt = _baseCloudUpdatedAt;
    _hasLocalModifications = false;

    const payload = extractCompactPayload();
    _lastCloudSizeBytes = new Blob([JSON.stringify(payload)]).size;
    try {
        localStorage.setItem(STORAGE_KEY_CLOUD_CACHE, JSON.stringify(payload));
    } catch (e) { }

    renderStorageModeWidget();

    // Re-rendre la vue si l'utilisateur n'édite pas activement dans un formulaire
    if (!isEditing) {
        renderView();
    }

    if (!isSilent) {
        showToast("Synchronisé avec le Cloud ☁️", "info", 2500);
    }
}

async function handleAppResume() {
    if (document.visibilityState && document.visibilityState !== 'visible') return;
    if (currentStorageMode !== 'cloud' || !currentUser) return;
    if (_isConflictModalOpen) return;

    const fb = getFirebaseInstance();
    if (!fb || !fb.firestore) return;

    try {
        const docRef = fb.firestore().collection('users').doc(currentUser.uid);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
            const data = docSnap.data();
            const incomingUpdatedAt = data.updatedAt || 0;
            // Vérifier s'il y a conflit avec des modifications locales non envoyées
            if (_hasLocalModifications && incomingUpdatedAt && _baseCloudUpdatedAt && incomingUpdatedAt > _baseCloudUpdatedAt) {
                showConflictModal(data);
                return;
            }
            if (incomingUpdatedAt && (!_lastSavedUpdatedAt || incomingUpdatedAt > _lastSavedUpdatedAt)) {
                handleIncomingCloudData(data, false);
            }
        }
    } catch (e) {
        console.warn("Erreur vérification Cloud au réveil:", e);
    }
}

async function checkCloudConflictBeforeSync() {
    if (!currentUser || !_hasLocalModifications || _isConflictModalOpen) return;
    const fb = getFirebaseInstance();
    if (!fb || !fb.firestore) {
        saveDataNow();
        return;
    }

    try {
        const docRef = fb.firestore().collection('users').doc(currentUser.uid);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
            const cloudData = docSnap.data();
            const incomingUpdatedAt = cloudData.updatedAt || 0;
            if (incomingUpdatedAt && _baseCloudUpdatedAt && incomingUpdatedAt > _baseCloudUpdatedAt) {
                showConflictModal(cloudData);
                return;
            }
        }
        // Pas de conflit détecté : vider la file d'attente locale vers le Cloud
        saveDataNow();
    } catch (e) {
        console.warn("Erreur checkCloudConflictBeforeSync:", e);
        saveDataNow();
    }
}

async function handleNetworkOnline() {
    showToast("Connexion Internet rétablie 🌐", "info", 2000);
    renderStorageModeWidget();
    if (currentStorageMode === 'cloud' && currentUser) {
        if (_hasLocalModifications) {
            await checkCloudConflictBeforeSync();
        } else {
            await handleAppResume();
        }
    }
}

function formatSyncDate(ts) {
    if (!ts) return "Date inconnue";
    const d = new Date(ts);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function getStatsFromPayload(data) {
    if (!data) return { deckCount: 0, cardCount: 0 };
    if (data.decks && data.cards) {
        return { deckCount: data.decks.length, cardCount: data.cards.length };
    }
    const customDecks = data.customDecks ? data.customDecks.length : 0;
    const publicConfigs = DEFAULT_DECKS_CONFIG || [];
    const publicOverrides = data.publicOverrides || {};
    let publicCardsCount = 0;
    publicConfigs.forEach(conf => {
        const ov = publicOverrides[conf.id] || {};
        const origCount = (conf.cards || []).length;
        const deletedCount = (ov.deletedOriginalIndices || []).length;
        const addedCount = (ov.customCardsAdded || []).length;
        publicCardsCount += Math.max(0, origCount - deletedCount) + addedCount;
    });
    const customCards = data.customCards ? data.customCards.length : 0;
    return {
        deckCount: customDecks + publicConfigs.length,
        cardCount: customCards + publicCardsCount
    };
}

function showConflictModal(cloudData) {
    if (_isConflictModalOpen) return;
    _isConflictModalOpen = true;
    _pendingConflictCloudData = cloudData;

    const localDateStr = formatSyncDate(_lastSavedUpdatedAt || Date.now());
    const cloudDateStr = formatSyncDate(cloudData.updatedAt || 0);

    const localStats = { deckCount: decks.length, cardCount: cards.length };
    const cloudStats = getStatsFromPayload(cloudData);

    openStorageModal(`
        <button onclick="closeStorageModal()" aria-label="Fermer" class="storage-modal-close">
            <i data-lucide="x" class="storage-icon"></i>
        </button>
        <div class="storage-modal-tag tag-warn">
            <i data-lucide="alert-triangle" class="storage-icon"></i>
            <span>Conflit de synchronisation</span>
        </div>
        <h2 class="storage-modal-title">Modifications concurrentes</h2>
        <p class="storage-modal-desc">
            Des modifications ont été enregistrées sur le Cloud depuis un autre appareil pendant que vous étiez hors-ligne. Choisissez quelle version conserver :
        </p>

        <div class="storage-choices-list">
            <!-- Choix 1 : Version locale -->
            <div class="storage-choice-card card-local" onclick="resolveConflict('local')">
                <div class="storage-choice-icon icon-local">
                    <i data-lucide="smartphone" class="w-6 h-6"></i>
                </div>
                <div class="storage-choice-content">
                    <div class="storage-choice-header">
                        <span class="storage-choice-title">Cet appareil (Local)</span>
                        <span class="storage-choice-badge badge-local">Non envoyé</span>
                    </div>
                    <p class="storage-choice-desc">
                        Modifié le ${localDateStr} • ${localStats.deckCount} blocs (${localStats.cardCount} fiches).
                        <br><strong style="color: #cbd5e1;">Écrase le Cloud avec vos modifications de cet appareil.</strong>
                    </p>
                </div>
            </div>

            <!-- Choix 2 : Version Cloud -->
            <div class="storage-choice-card card-cloud" onclick="resolveConflict('cloud')">
                <div class="storage-choice-icon icon-cloud">
                    <i data-lucide="cloud" class="w-6 h-6"></i>
                </div>
                <div class="storage-choice-content">
                    <div class="storage-choice-header">
                        <span class="storage-choice-title">Version Cloud</span>
                        <span class="storage-choice-badge badge-cloud">En ligne</span>
                    </div>
                    <p class="storage-choice-desc">
                        Modifié le ${cloudDateStr} • ${cloudStats.deckCount} blocs (${cloudStats.cardCount} fiches).
                        <br><strong style="color: #818cf8;">Remplace cet appareil par les données du Cloud.</strong>
                    </p>
                </div>
            </div>
        </div>

        <p class="storage-modal-footer-note">
            Une sauvegarde de sécurité de la version non retenue sera archivée dans ce navigateur.
        </p>
    `);
}

async function resolveConflict(choice) {
    if (!_pendingConflictCloudData) {
        closeStorageModal();
        return;
    }
    const cloudData = _pendingConflictCloudData;
    _pendingConflictCloudData = null;
    _isConflictModalOpen = false;

    // 1. Sauvegarde automatique de secours dans localStorage
    try {
        const localBackup = extractCompactPayload();
        localStorage.setItem('flashcards_conflict_backup', JSON.stringify({
            timestamp: Date.now(),
            localVersion: localBackup,
            cloudVersion: cloudData
        }));
    } catch (e) {
        console.warn("Erreur sauvegarde secours conflit:", e);
    }

    if (choice === 'local') {
        _baseCloudUpdatedAt = Date.now();
        _lastSavedUpdatedAt = _baseCloudUpdatedAt;
        closeStorageModal();
        showToast("Envoi de votre version locale vers le Cloud ☁️...", "info");
        saveCloudData(true);
    } else if (choice === 'cloud') {
        _hasLocalModifications = false;
        closeStorageModal();
        handleIncomingCloudData(cloudData, true);
        showToast("Version Cloud appliquée avec succès ☁️", "success");
    }
}

async function loadData() {
    await fetchDefaultDecksConfig();
    purgeLegacyStorage();
    const preferredMode = localStorage.getItem(STORAGE_KEY_PREFERENCE);

    if (preferredMode === 'cloud') {
        currentStorageMode = 'cloud';
        const cached = localStorage.getItem(STORAGE_KEY_CLOUD_CACHE);
        if (cached) {
            try {
                const c = JSON.parse(cached);
                if (c.publicOverrides || c.v >= 4) {
                    applyCompactPayload(c);
                } else {
                    decks = c.decks || [];
                    cards = c.cards || [];
                    themeColors = c.themeColors || {};
                    currentSortMode = c.prefs?.sortMode || 'date';
                }
                _lastCloudSizeBytes = new Blob([cached]).size;
                _lastSavedUpdatedAt = c.updatedAt || 0;
            } catch (e) {
                await loadLocalData();
            }
        } else {
            await loadLocalData();
        }
    } else {
        currentStorageMode = 'local';
        await loadLocalData();
    }
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

    let content = '';
    if (type === 'confirm' && action) {
        toast.classList.add('toast-confirm-type');
        content = `
            <div class="toast-content">
                <i data-lucide="${icon}" class="${color} w-5 h-5 shrink-0"></i>
                <span class="toast-msg">${message}</span>
            </div>
            <div class="toast-actions">
                <button id="toast-cancel" class="toast-btn toast-btn-cancel">Non</button>
                <button id="toast-confirm" class="toast-btn toast-btn-confirm">Oui</button>
            </div>
        `;
    } else {
        content = `<i data-lucide="${icon}" class="${color} w-5 h-5 shrink-0"></i><span>${message}</span>`;
    }
    toast.innerHTML = content;
    container.appendChild(toast);
    createIconsIn(toast);

    if (type === 'confirm') {
        const cleanup = () => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); };
        const btnConfirm = toast.querySelector('#toast-confirm');
        const btnCancel = toast.querySelector('#toast-cancel');
        if (btnConfirm) btnConfirm.onclick = () => { action(); cleanup(); };
        if (btnCancel) btnCancel.onclick = cleanup;
    } else {
        setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
    }
}


// --- RENDERING ---

// --- MODAL STORAGE MANAGEMENT ---

function openStorageModal(htmlContent) {
    if (!htmlContent) {
        if (currentStorageMode === 'cloud') {
            promptSwitchToLocal();
        } else {
            promptSwitchToCloud();
        }
        return;
    }
    const overlay = document.getElementById('storage-modal-overlay');
    const content = document.getElementById('storage-modal-content');
    if (!overlay || !content) return;
    content.innerHTML = htmlContent;
    overlay.classList.remove('hidden');
    createIconsIn(content);
}

let isPwaWelcomeModalOpen = false;
let _waitingForPwaPrompt = null;

function closeStorageModal() {
    if (isPwaWelcomeModalOpen) {
        dismissPwaWelcomeModal();
        return;
    }
    if (_isConflictModalOpen) {
        _isConflictModalOpen = false;
        _pendingConflictCloudData = null;
    }
    const overlay = document.getElementById('storage-modal-overlay');
    if (overlay) overlay.classList.add('hidden');
}

function showPwaFirstVisitModal() {
    isPwaWelcomeModalOpen = true;
    openStorageModal(`
        <button onclick="dismissPwaWelcomeModal()" aria-label="Fermer" class="storage-modal-close">
            <i data-lucide="x" class="w-5 h-5"></i>
        </button>
        <div class="storage-modal-tag tag-new">
            <i data-lucide="download" class="storage-icon"></i>
            <span>Application disponible</span>
        </div>
        <h2 class="storage-modal-title">Installer Flashcards</h2>
        <p class="storage-modal-desc">Pour une meilleure expérience, installez l'application sur votre appareil afin de réviser rapidement et hors-ligne :</p>

        <div class="storage-choices-list">
            <div onclick="handlePwaWelcomeInstall()" class="storage-choice-card card-cloud" style="cursor: pointer;">
                <div class="storage-choice-icon icon-cloud">
                    <i data-lucide="download" style="width: 22px; height: 22px;"></i>
                </div>
                <div class="storage-choice-content">
                    <div class="storage-choice-header">
                        <span class="storage-choice-title">Installer l'application</span>
                        <span class="storage-choice-badge badge-cloud">PWA</span>
                    </div>
                    <p class="storage-choice-desc">
                        Accès direct en 1 clic • Mode plein écran • Fonctionne sans connexion internet.
                    </p>
                </div>
            </div>
        </div>

        <div class="storage-modal-actions actions-vertical" style="margin-top: 1.25rem;">
            <button type="button" onclick="handlePwaWelcomeInstall()" class="storage-btn-primary full-width">
                <i data-lucide="download" class="w-4 h-4"></i>
                <span>Installer l'application</span>
            </button>
            <button type="button" onclick="dismissPwaWelcomeModal()" class="storage-btn-secondary full-width">
                Ignorer
            </button>
        </div>

        <p class="storage-modal-footer-note">
            Vous pourrez également installer l'application plus tard via le bouton en haut à droite.
        </p>
    `);
}

function dismissPwaWelcomeModal() {
    isPwaWelcomeModalOpen = false;
    showFirstVisitModal();
}

async function handlePwaWelcomeInstall() {
    isPwaWelcomeModalOpen = false;
    await triggerPwaInstall();
    showFirstVisitModal();
}

async function checkAndShowOnboarding() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isStandalone) {
        showFirstVisitModal();
        return;
    }

    if (isPwaEligible()) {
        showPwaFirstVisitModal();
        return;
    }

    // Wait a brief window (up to 350ms) in case beforeinstallprompt fires shortly after load
    await new Promise(resolve => {
        _waitingForPwaPrompt = () => resolve();
        setTimeout(resolve, 350);
    });
    _waitingForPwaPrompt = null;

    if (isPwaEligible()) {
        showPwaFirstVisitModal();
    } else {
        showFirstVisitModal();
    }
}

function showFirstVisitModal() {
    isPwaWelcomeModalOpen = false;
    openStorageModal(`
        <div class="storage-modal-tag tag-new">
            <i data-lucide="sparkles" class="storage-icon"></i>
            <span>Nouvel appareil détecté</span>
        </div>
        <h2 class="storage-modal-title">Où enregistrer vos fiches ?</h2>
        <p class="storage-modal-desc">Choisissez comment stocker et synchroniser vos données :</p>

        <div class="storage-choices-list">
            <div onclick="handleFirstVisitChoice('cloud')" class="storage-choice-card card-cloud">
                <div class="storage-choice-icon icon-cloud">
                    <i data-lucide="cloud" style="width: 22px; height: 22px;"></i>
                </div>
                <div class="storage-choice-content">
                    <div class="storage-choice-header">
                        <span class="storage-choice-title">Mode Cloud</span>
                        <span class="storage-choice-badge badge-cloud">Synchronisé</span>
                    </div>
                    <p class="storage-choice-desc">
                        Connexion à un compte Google • 500 Ko Max • Synchronisé en temps réel sur tous vos appareils.
                    </p>
                </div>
            </div>

            <div onclick="handleFirstVisitChoice('local')" class="storage-choice-card card-local">
                <div class="storage-choice-icon icon-local">
                    <i data-lucide="hard-drive" style="width: 22px; height: 22px;"></i>
                </div>
                <div class="storage-choice-content">
                    <div class="storage-choice-header">
                        <span class="storage-choice-title">Mode Local</span>
                        <span class="storage-choice-badge badge-local">Hors-ligne</span>
                    </div>
                    <p class="storage-choice-desc">
                        Stockage dans ce navigateur • Aucun compte requis • Pas de synchronisation entre appareils.
                    </p>
                </div>
            </div>
        </div>

        <p class="storage-modal-footer-note">
            Ce choix est mémorisé. Vous pourrez basculer de mode à tout moment via le bouton en haut à droite.
        </p>
    `);
}

async function handleFirstVisitChoice(choice) {
    if (choice === 'cloud') {
        if (!checkFirebaseConfigured()) return;
        const user = await signInWithGoogle();
        if (user) {
            localStorage.setItem(STORAGE_KEY_PREFERENCE, 'cloud');
            currentStorageMode = 'cloud';
            closeStorageModal();
            showToast(`Bienvenue ${user.displayName || ''} ! Mode Cloud activé.`, "success");
            await loadCloudData(user);
            subscribeToCloudUpdates(user);
            renderView();
        }
    } else {
        localStorage.setItem(STORAGE_KEY_PREFERENCE, 'local');
        currentStorageMode = 'local';
        closeStorageModal();
        showToast("Mode Local sélectionné. Fiches enregistrées dans ce navigateur.", "info");
        await loadLocalData();
        renderView();
    }
}

function initCloudAuthListener() {
    const fb = getFirebaseInstance();
    if (!fb || !fb.auth) {
        showCloudPromptModal();
        return;
    }

    let initialResolved = false;
    fb.auth().onAuthStateChanged(async (user) => {
        initialResolved = true;
        if (user) {
            currentUser = user;
            currentStorageMode = 'cloud';
            // Session active trouvée : synchronisation transparente silencieuse
            await loadCloudData(user);
            subscribeToCloudUpdates(user);
            renderView();
        } else {
            unsubscribeFromCloudUpdates();
            currentUser = null;
            if (localStorage.getItem(STORAGE_KEY_PREFERENCE) === 'cloud') {
                showCloudPromptModal();
            }
        }
    });

    // Fallback si pas de réponse rapide (ex: déconnecté / hors-ligne)
    setTimeout(() => {
        if (!initialResolved) {
            initialResolved = true;
            if (!currentUser && localStorage.getItem(STORAGE_KEY_PREFERENCE) === 'cloud') {
                showCloudPromptModal();
            }
        }
    }, 2500);
}

function showCloudPromptModal() {
    openStorageModal(`
        <div class="storage-modal-tag tag-last">
            <i data-lucide="cloud-check" class="storage-icon"></i>
            <span>Sélectionné la dernière fois</span>
        </div>
        <h2 class="storage-modal-title">Charger les données Cloud ?</h2>
        <p class="storage-modal-desc">
            Votre session précédente était en mode Cloud synchronisé avec Google.
        </p>

        <div class="storage-modal-actions actions-vertical">
            <button onclick="confirmLoadCloud()" class="storage-btn-primary full-width">
                <i data-lucide="cloud" class="storage-icon"></i>
                <span>Charger mes données Cloud</span>
            </button>

            <button onclick="switchToLocalFromPrompt()" class="storage-btn-secondary full-width">
                <i data-lucide="hard-drive" class="storage-icon"></i>
                <span>Basculer en mode Local</span>
            </button>
        </div>

        <p class="storage-modal-footer-note">
            Vos données locales et vos données cloud sont protégées et isolées.
        </p>
    `);
}

async function confirmLoadCloud() {
    if (!checkFirebaseConfigured()) return;
    const user = await signInWithGoogle();
    if (user) {
        localStorage.setItem(STORAGE_KEY_PREFERENCE, 'cloud');
        currentStorageMode = 'cloud';
        closeStorageModal();
        showToast("Synchronisation Cloud active", "success");
        await loadCloudData(user);
        subscribeToCloudUpdates(user);
        renderView();
    }
}

async function switchToLocalFromPrompt() {
    localStorage.setItem(STORAGE_KEY_PREFERENCE, 'local');
    currentStorageMode = 'local';
    await signOutGoogle();
    closeStorageModal();
    showToast("Mode Local activé", "info");
    await loadLocalData();
    renderView();
}

function promptSwitchToCloud() {
    openStorageModal(`
        <button onclick="closeStorageModal()" aria-label="Fermer" class="storage-modal-close">
            <i data-lucide="x" class="storage-icon"></i>
        </button>
        <div class="storage-modal-tag tag-new">
            <i data-lucide="cloud-upload" class="storage-icon"></i>
            <span>Passer au Cloud</span>
        </div>
        <h2 class="storage-modal-title">Activer le stockage Cloud ?</h2>
        <p class="storage-modal-desc">
            Connectez-vous avec votre compte Google pour charger vos fiches synchronisées (max 500 Ko).
        </p>

        <div class="storage-info-box">
            <i data-lucide="shield-check" class="storage-info-box-icon" style="color: #34d399;"></i>
            <div>
                Toutes vos fiches actuelles en mode local restent conservées dans ce navigateur et <span style="color: #34d399; font-weight: 600;">ne seront pas supprimées</span>.
            </div>
        </div>

        <div class="storage-modal-actions">
            <button onclick="confirmSwitchToCloud()" class="storage-btn-primary">
                <i data-lucide="log-in" class="storage-icon"></i>
                <span>Se connecter avec Google</span>
            </button>
            <button onclick="closeStorageModal()" class="storage-btn-secondary" style="flex: 0 0 auto; padding-left: 1.25rem; padding-right: 1.25rem;">
                Annuler
            </button>
        </div>
    `);
}

async function confirmSwitchToCloud() {
    if (!checkFirebaseConfigured()) return;
    const user = await signInWithGoogle();
    if (user) {
        localStorage.setItem(STORAGE_KEY_PREFERENCE, 'cloud');
        currentStorageMode = 'cloud';
        closeStorageModal();
        showToast("Passage en mode Cloud réussi", "success");
        await loadCloudData(user);
        subscribeToCloudUpdates(user);
        renderView();
    }
}

function promptSwitchToLocal() {
    const sizeBytes = getCloudUsageBytes();
    const sizeKb = (sizeBytes / 1024).toFixed(1);
    const remainingKb = Math.max(0, 500 - (sizeBytes / 1024)).toFixed(1);
    const pct = Math.min(100, Math.max(0, Math.round((sizeBytes / MAX_CLOUD_SIZE_BYTES) * 100)));
    const isNearLimit = pct >= 85;

    const emailDisplay = currentUser?.email
        ? `Connecté avec <strong style="color: #a5b4fc;">${currentUser.email}</strong>`
        : 'Stockage synchronisé avec votre compte Google';

    openStorageModal(`
        <button onclick="closeStorageModal()" aria-label="Fermer" class="storage-modal-close">
            <i data-lucide="x" class="storage-icon"></i>
        </button>
        <div class="storage-modal-tag tag-cloud">
            <i data-lucide="cloud" class="storage-icon"></i>
            <span>Mode Cloud Actif</span>
        </div>
        <h2 class="storage-modal-title">Gestion du Stockage Cloud</h2>
        <p class="storage-modal-desc">
            ${emailDisplay}
        </p>

        <div class="storage-quota-card">
            <div class="storage-quota-header">
                <div class="storage-quota-label-wrap">
                    <i data-lucide="database" class="storage-icon" style="color: #818cf8;"></i>
                    <span class="storage-quota-label">Espace utilisé</span>
                </div>
                <span class="storage-quota-val ${isNearLimit ? 'text-amber-400' : ''}">${sizeKb} Ko <span class="storage-quota-total">/ 500 Ko</span> <span class="storage-quota-pct">(${pct}%)</span></span>
            </div>
            <div class="storage-quota-bar-bg">
                <div class="storage-quota-bar-fill ${isNearLimit ? 'storage-quota-warning' : ''}" style="width: ${pct}%"></div>
            </div>
            <div class="storage-quota-footer">
                <span>${remainingKb} Ko disponibles</span>
                <span>Quota max : 500 Ko</span>
            </div>
        </div>

        <div class="storage-info-box">
            <i data-lucide="cloud-check" class="storage-info-box-icon" style="color: #818cf8;"></i>
            <div>
                Vos modifications sont enregistrées et synchronisées en direct sur le <span style="color: #818cf8; font-weight: 600;">Cloud de Google</span>.
            </div>
        </div>

        <div class="storage-modal-actions">
            <button onclick="confirmSwitchToLocal()" class="storage-btn-secondary" style="flex: 1; color: #cbd5e1; border-color: #475569;">
                <i data-lucide="hard-drive" class="storage-icon"></i>
                <span>Basculer en Local</span>
            </button>
            <button onclick="closeStorageModal()" class="storage-btn-primary" style="flex: 0 0 auto; padding-left: 1.5rem; padding-right: 1.5rem;">
                Fermer
            </button>
        </div>
    `);
}

async function confirmSwitchToLocal() {
    if (_hasLocalModifications) {
        saveCloudData(true);
    }
    unsubscribeFromCloudUpdates();
    await signOutGoogle();
    localStorage.setItem(STORAGE_KEY_PREFERENCE, 'local');
    currentStorageMode = 'local';
    closeStorageModal();
    showToast("Mode Local chargé", "info");
    await loadLocalData();
    renderView();
}

function renderStorageModeWidget() {
    const container = document.getElementById('storage-mode-container');
    if (!container) return;

    if (currentView === 'deck') {
        container.classList.add('hidden');
    } else {
        container.classList.remove('hidden');
    }

    if (currentStorageMode === 'cloud') {
        const sizeBytes = getCloudUsageBytes();
        const sizeKb = (sizeBytes / 1024).toFixed(1);
        const pct = Math.min(100, Math.max(0, Math.round((sizeBytes / MAX_CLOUD_SIZE_BYTES) * 100)));
        const isNearLimit = pct >= 85;
        const isOfflinePending = !navigator.onLine && _hasLocalModifications;
        const iconName = isOfflinePending ? 'cloud-off' : 'cloud';
        const iconClasses = isOfflinePending 
            ? 'storage-icon text-amber-400' 
            : (isSyncingCloud ? 'storage-icon animate-pulse text-indigo-300' : 'storage-icon');
        const badgeClass = isOfflinePending ? 'badge-warning' : (isNearLimit ? 'badge-warning' : '');
        const badgeLabel = isOfflinePending ? 'En attente' : `${sizeKb} / 500 Ko`;
        const btnTitle = isOfflinePending
            ? "Hors-ligne : vos modifications sont enregistrées sur cet appareil et seront envoyées au retour d'Internet."
            : `Stockage Cloud : ${sizeKb} Ko / 500 Ko (${pct}%). Cliquez pour voir les détails ou basculer en mode Local.`;

        container.innerHTML = `
            <button onclick="promptSwitchToLocal()" class="storage-btn storage-btn-cloud" title="${btnTitle}">
                <i data-lucide="${iconName}" class="${iconClasses}"></i>
                <div class="storage-cloud-info">
                    <div class="storage-cloud-row">
                        <span class="storage-cloud-title">Cloud</span>
                        <span class="storage-cloud-meter-badge ${badgeClass}">${badgeLabel}</span>
                    </div>
                    <div class="storage-cloud-track">
                        <div class="storage-cloud-bar ${isNearLimit ? 'bar-warning' : ''}" style="width: ${pct}%"></div>
                    </div>
                </div>
            </button>
        `;
    } else {
        container.innerHTML = `
            <button onclick="promptSwitchToCloud()" class="storage-btn storage-btn-local" title="Mode Local actif. Cliquez pour passer au stockage Cloud.">
                <i data-lucide="hard-drive" class="storage-icon"></i>
                <span class="storage-btn-text">Local</span>
            </button>
        `;
    }
    createIconsIn(container);
    updatePwaUi();
}

// --- PWA SERVICE WORKER & INSTALL FLOW ---
let deferredInstallPrompt = null;

function setupPwa() {
    // 1. Register Service Worker for offline caching
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => console.log('[PWA] SW registered successfully:', reg.scope))
                .catch(err => console.warn('[PWA] SW registration error:', err));
        });
    }

    // 2. Intercept beforeinstallprompt for Android, Windows, macOS, ChromeOS
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredInstallPrompt = e;
        updatePwaUi();
        if (_waitingForPwaPrompt) {
            _waitingForPwaPrompt();
        }
    });

    // 3. Track successful installation
    window.addEventListener('appinstalled', () => {
        deferredInstallPrompt = null;
        updatePwaUi();
        showToast('🎉 Flash Cards est maintenant installée sur votre appareil !', 'success');
    });

    // Initial check (handles iOS Safari & standalone mode)
    updatePwaUi();
}

function isPwaEligible() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isStandalone) return false;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    return deferredInstallPrompt !== null || isIOS;
}

function updatePwaUi() {
    const eligible = isPwaEligible();

    // Permanent Header Button next to Storage mode
    const headerBtn = document.getElementById('btn-header-pwa-install');
    if (headerBtn) {
        if (eligible && currentView === 'home') {
            headerBtn.classList.remove('hidden');
        } else {
            headerBtn.classList.add('hidden');
        }
    }
}

async function triggerPwaInstall() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isStandalone) {
        showToast("L'application est déjà installée !", "info");
        return;
    }

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        const choiceResult = await deferredInstallPrompt.userChoice;
        if (choiceResult && choiceResult.outcome === 'accepted') {
            showToast('Installation de Flash Cards en cours... 📲', 'info');
        }
        deferredInstallPrompt = null;
        updatePwaUi();
    } else if (isIOS) {
        showToast("📲 Sur iPhone/iPad : touchez l'icône Partager puis 'Sur l'écran d'accueil'", 'info', 6000);
    } else {
        showToast("📲 Ouvrez le menu de votre navigateur (⋮) puis 'Installer l'application'", 'info', 5000);
    }
}

// --- INITIALIZATION ---

async function initApp() {
    setupPwa();
    initAppSettings();
    await loadData();
    initCardVisibilityObserver();
    renderView();
    createIconsIn();

    // Pré-initialisation anticipée de Firebase en tâche de fond.
    // Permet de charger l'iframe d'authentification (authDomain) et Firestore dès l'ouverture,
    // garantissant que la popup Google s'ouvre sans latence ni blocage dès le premier clic.
    getFirebaseInstance();

    // Check user preference for storage mode
    const preferredMode = localStorage.getItem(STORAGE_KEY_PREFERENCE);
    if (!preferredMode) {
        checkAndShowOnboarding();
    } else if (preferredMode === 'cloud') {
        initCloudAuthListener();
    }

    document.addEventListener('pointerdown', (e) => {
        if (_openContextMenu && !e.target.closest('.context-menu-trigger') && !e.target.closest('.context-menu')) {
            closeAllContextMenus();
        }
    });
    window.addEventListener('beforeunload', saveDataNow);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            handleAppResume();
        }
    });
    window.addEventListener('focus', handleAppResume);
    window.addEventListener('online', handleNetworkOnline);
    window.addEventListener('offline', () => {
        renderStorageModeWidget();
    });
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const settingsModal = document.getElementById('settings-overlay');
            if (settingsModal && settingsModal.classList.contains('is-open')) {
                closeSettingsModal();
                return;
            }
            const legalModal = document.getElementById('legal-modal-overlay');
            if (legalModal && !legalModal.classList.contains('hidden')) {
                closeLegalModal();
            }
        }
    });

    initAppSettings();

    const yearEl = document.getElementById('app-year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    const versionBadge = document.getElementById('app-version-badge');
    if (versionBadge) versionBadge.textContent = APP_VERSION;

    _initDragListeners();
}

function renderView() {
    // Clean up previous observer & queue to prevent memory leak and detached DOM holding
    if (_cardVisibilityObserver) {
        _cardVisibilityObserver.disconnect();
    }
    _inflationQueue = [];
    _inflationRunning = false;
    _openContextMenu = null;

    const container = document.getElementById('main-content');
    const headerTitle = document.getElementById('header-title');
    const headerSubtitle = document.getElementById('header-subtitle');
    const navAction = document.getElementById('nav-action');
    const fabContainer = document.getElementById('fab-container');
    const versionBadge = document.getElementById('app-version-badge');
    const headerActions = document.getElementById('header-actions');

    container.innerHTML = '';

    if (currentView === 'home') {
        if (versionBadge) versionBadge.classList.remove('hidden');
        if (headerActions) headerActions.classList.remove('hidden');
        const storageContainer = document.getElementById('storage-mode-container');
        if (storageContainer) storageContainer.classList.remove('hidden');
        const settingsBtn = document.getElementById('btn-header-settings');
        if (settingsBtn) settingsBtn.classList.remove('hidden');
        updatePwaUi();

        headerTitle.innerText = "Flashcards";
        headerSubtitle.innerText = `${decks.length} blocs disponibles`;

        // Restore Home Icon — use official site icon
        navAction.className = "w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 shadow-md";
        navAction.innerHTML = `<img src="icons/icon-192.png" alt="Flashcards" class="w-full h-full object-cover block rounded-xl">`;

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
        if (versionBadge) versionBadge.classList.add('hidden');
        if (headerActions) headerActions.classList.remove('hidden');
        const storageContainer = document.getElementById('storage-mode-container');
        if (storageContainer) storageContainer.classList.add('hidden');
        const pwaBtn = document.getElementById('btn-header-pwa-install');
        if (pwaBtn) pwaBtn.classList.add('hidden');
        const settingsBtn = document.getElementById('btn-header-settings');
        if (settingsBtn) settingsBtn.classList.remove('hidden');

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
                const safeThemeId = theme.replace(/[^a-zA-Z0-9]/g, '_');
                themeSection.innerHTML = `
                    <div class="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 border-b border-slate-800 pb-4 sticky top-[72px] bg-[#0f172a]/95 backdrop-blur z-30 py-4 -mx-2 px-2">
                        <div class="flex items-center gap-3">
                            <span class="w-2 h-8 rounded-full ${themeColor} shadow-[0_0_10px_rgba(0,0,0,0.5)]"></span>
                            <h2 class="text-xl font-bold text-white tracking-tight">${theme}</h2>
                            <span id="theme-count-${safeThemeId}" class="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-xs font-medium border border-slate-700">${themeCards.length}</span>
                        </div>
                        <div class="flex items-center gap-2 w-full md:w-auto flex-wrap">
                            <button onclick="startLearningMode('${escapedTheme}')" class="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg shadow-lg shadow-indigo-500/20 transition-all">
                                <i data-lucide="play-circle" class="w-4 h-4"></i> <span>Apprendre</span>
                            </button>
                            <button id="btn-toggle-theme-${safeThemeId}" onclick="toggleAllTheme('${escapedTheme}')" class="p-2 bg-slate-800 text-slate-300 rounded-lg ${deck.type === 'qcm' ? 'hover:bg-amber-900/30 hover:text-amber-400' : 'hover:bg-emerald-900/30 hover:text-emerald-400'} transition" title="${deck.type === 'qcm' ? 'Tout réinitialiser' : (themeCards.every(c => c.isLearned) ? 'Tout dévalider' : 'Tout valider')}">
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
    renderStorageModeWidget();
    createIconsIn(document.getElementById('nav-action'));
    createIconsIn();
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

        // Drag Logic - only enabled in custom sort mode
        if (isCustomSortMode) {
            deckCard.setAttribute('data-drag-type', 'deck');
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
                <div class="grab-handle p-1.5 rounded-full hover:bg-black/20 text-white/70 hover:text-white cursor-grab active:cursor-grabbing" data-drag-handle data-drag-id="${deck.id}" data-drag-type="deck" title="Glisser pour réorganiser">
                    <i data-lucide="grip-horizontal" class="w-5 h-5"></i>
                </div>
                ` : ''}
                <button class="context-menu-trigger p-1.5 rounded-full hover:bg-black/20 text-white/70 hover:text-white transition-colors" onclick="toggleDeckMenu(event, '${deck.id}')">
                    <i data-lucide="more-vertical" class="w-5 h-5"></i>
                </button>
                <div id="menu-deck-${deck.id}" class="context-menu hidden absolute right-0 top-8 w-40 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden text-sm">
                    <button onclick="editDeck(event, '${deck.id}')" class="w-full text-left px-4 py-2.5 text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"><i data-lucide="pencil" class="w-4 h-4"></i> Modifier</button>
                    <button onclick="duplicateDeck(event, '${deck.id}')" class="w-full text-left px-4 py-2.5 text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"><i data-lucide="copy" class="w-4 h-4"></i> Dupliquer</button>
                    <button onclick="downloadDeckDirectly(event, '${deck.id}')" class="w-full text-left px-4 py-2.5 text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"><i data-lucide="download" class="w-4 h-4"></i> Télécharger</button>
                    <div class="h-px bg-slate-800"></div>
                    ${deck.isPublic ? `
                    <button onclick="resetPublicDeck(event, '${deck.id}')" class="w-full text-left px-4 py-2.5 text-amber-400 hover:bg-amber-900/30 flex items-center gap-2" title="Réinitialiser les fiches et la progression de ce bloc par défaut"><i data-lucide="rotate-ccw" class="w-4 h-4"></i> Réinitialiser</button>
                    ` : `
                    <button onclick="deleteDeck(event, '${deck.id}')" class="w-full text-left px-4 py-2.5 text-red-400 hover:bg-red-900/30 flex items-center gap-2"><i data-lucide="trash" class="w-4 h-4"></i> Supprimer</button>
                    `}
                </div>
            </div>

            <div class="relative z-10 pointer-events-none pr-16">
                <h3 class="text-2xl font-bold text-white shadow-black/50 drop-shadow-md mb-1 leading-tight break-words">${deck.title}</h3>
                <p class="text-white/80 text-sm font-medium">${cardCount} cartes</p>
                ${isCustomSortMode ? '<div class="mt-1 flex items-center gap-1 text-white/50 text-xs text-indigo-200">Mode tri activé</div>' : ''}
            </div>
            
            <div class="relative z-10 w-full pointer-events-none">
                <div class="flex justify-between items-center text-xs text-white/90 mb-1.5 font-semibold">
                    <span class="inline-flex items-center text-[10px] bg-black/35 text-white/90 px-2 py-0.5 rounded-md uppercase tracking-wider font-bold border border-white/15 backdrop-blur-sm shadow-sm leading-none">${deck.type === 'qcm' ? 'QCM' : 'Flashcards'}</span>
                    <span class="text-[11px] tracking-wide">Progression ${progress}%</span>
                </div>
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
                return `<button type="button" class="no-flip qcm-tf-btn flex-1 rounded-xl transition-all h-[4.5rem] flex-shrink-0 font-bold ${localBtnClass} flex items-center justify-center p-2" onclick="handleQcmSelect(event, '${card.id}', ${i})"><span class="latex-content">${ans}</span></button>`;
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
                const prefix = ['A', 'B', 'C', 'D'][i] || i + 1;
                return `<button type="button" class="no-flip qcm-choice-btn w-full rounded-xl transition-all font-medium text-xs p-2 flex gap-2 shrink-0 ${localBtnClass}" onclick="handleQcmSelect(event, '${card.id}', ${i})"><span class="font-bold opacity-75 shrink-0 mt-0.5">${prefix}.</span> <span class="latex-content break-words min-w-0">${ans}</span></button>`;
            }).join('')}
            </div>`;
        }

        contentFront = `
            <div class="relative z-0 flex-grow flex flex-col min-h-0 w-full overflow-hidden px-4">
                <div class="shrink-0 overflow-y-auto card-text-container qcm-question-container" style="max-height: 38%; padding: 0;">
                    <div class="card-text-inner latex-content font-medium text-slate-100">${formatCardContent(card.question)}</div>
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
                <div class="card-text-container">
                    <div class="card-text-inner latex-content font-medium text-slate-100">${formatCardContent(card.question)}</div>
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
                     <div class="no-flip p-1.5 rounded-full hover:bg-slate-700/50 text-slate-500 hover:text-white cursor-grab active:cursor-grabbing grab-handle" data-drag-handle data-drag-id="${card.id}" data-drag-type="card" title="Glisser pour réorganiser"><i data-lucide="grip-horizontal" class="w-4 h-4"></i></div>
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
                <div class="card-text-container">
                    <div class="card-text-inner latex-content font-medium text-white">${isQcm ? (formatCardContent(card.answer) || "<span class='opacity-50 italic'>Aucune explication fournie.</span>") : formatCardContent(card.answer)}</div>
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

    if (_cardVisibilityObserver) {
        _cardVisibilityObserver.unobserve(oldWrapper);
    }

    const newWrapper = createCardDOM(card);
    newWrapper.dataset.inflated = 'true';
    newWrapper.dataset.katexRendered = 'true';
    oldWrapper.replaceWith(newWrapper);

    observeForKatex(newWrapper);
    renderKatexElement(newWrapper);
    createIconsIn(newWrapper);
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

// --- DRAG AND DROP (Unified Pointer-based — no HTML5 drag API) ---
let _dragState = null;

function _findDragContainer(handle, type) {
    return handle.closest(type === 'deck' ? '.group[data-id]' : '.card-container[data-id]');
}

function commitReorder(id, type, container) {
    if (!container || !container.parentNode) return;

    if (type === 'deck') {
        const grid = container.parentNode;
        const ids = Array.from(grid.children).map(el => el.dataset.id).filter(Boolean);
        ids.forEach((deckId, index) => {
            const d = decks.find(x => x.id === deckId);
            if (d) d.order = index;
        });
        decks.sort((a, b) => (a.order || 0) - (b.order || 0));
        saveDataNow();
    } else if (type === 'card') {
        const grid = container.parentNode;
        if (grid) {
            const ids = Array.from(grid.children).map(el => el.dataset.id).filter(Boolean);
            ids.forEach((cardId, index) => {
                const c = cards.find(x => x.id === cardId);
                if (c) c.order = index;
            });
        }
        saveDataNow();
    }
}

function _findTargetUnder(x, y, type, draggedEl) {
    draggedEl.style.pointerEvents = 'none';
    const el = document.elementFromPoint(x, y);
    draggedEl.style.pointerEvents = '';
    if (!el) return null;
    return el.closest(type === 'deck' ? '.group[data-id]' : '.card-container[data-id]');
}

function _swapToward(draggedEl, targetEl) {
    if (!targetEl || targetEl === draggedEl) return;
    const parent = draggedEl.parentNode;
    if (!parent || parent !== targetEl.parentNode) return;

    const children = Array.from(parent.children);
    const draggedIdx = children.indexOf(draggedEl);
    const targetIdx = children.indexOf(targetEl);
    if (draggedIdx === -1 || targetIdx === -1) return;

    if (draggedIdx < targetIdx) {
        // En déplaçant vers l'avant, échange immédiat dès survol de la cible suivante
        parent.insertBefore(draggedEl, targetEl.nextSibling);
    } else {
        // En déplaçant vers l'arrière, échange immédiat dès survol de la cible précédente
        parent.insertBefore(draggedEl, targetEl);
    }
}

function _cleanupDrag() {
    if (!_dragState) return;
    const { container, handle, pointerId } = _dragState;
    if (handle && pointerId !== undefined) {
        try { handle.releasePointerCapture(pointerId); } catch (err) { }
    }
    _dragState = null;
    if (container) {
        container.classList.remove('dragging');
        container.style.pointerEvents = '';
    }
    document.querySelectorAll('.dragging').forEach(el => {
        el.classList.remove('dragging');
        el.style.pointerEvents = '';
    });
    document.body.style.userSelect = '';
    document.body.style.webkitUserSelect = '';
}

function _onPointerMove(clientX, clientY) {
    if (!_dragState) return false;
    const dx = clientX - _dragState.startX;
    const dy = clientY - _dragState.startY;

    if (!_dragState.hasMoved) {
        if (Math.hypot(dx, dy) < 6) return false;
        _dragState.hasMoved = true;
        _dragState.container.classList.add('dragging');
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
    }

    // Auto-scroll near viewport edges
    if (clientY < 80) window.scrollBy(0, -7);
    else if (clientY > window.innerHeight - 80) window.scrollBy(0, 7);

    // Find target under point and reorder immediately upon hover
    const target = _findTargetUnder(clientX, clientY, _dragState.type, _dragState.container);
    if (target) _swapToward(_dragState.container, target);
    return true;
}

function _onPointerEnd() {
    if (!_dragState) return;
    const { id, type, container, hasMoved } = _dragState;
    _cleanupDrag();
    if (hasMoved) commitReorder(id, type, container);
}

// Global event delegation for drag handles using robust Pointer Events
function _initDragListeners() {
    document.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        const handle = e.target.closest('[data-drag-handle]');
        if (!handle) return;

        const id = handle.dataset.dragId;
        const type = handle.dataset.dragType;
        if (!id || !type) return;
        const container = _findDragContainer(handle, type);
        if (!container) return;

        e.preventDefault();
        e.stopPropagation();

        try {
            handle.setPointerCapture(e.pointerId);
        } catch (err) { }

        _cleanupDrag();

        _dragState = {
            id, type, container, handle,
            pointerId: e.pointerId,
            startX: e.clientX,
            startY: e.clientY,
            hasMoved: false
        };

        const onMove = (ev) => {
            if (!_dragState || ev.pointerId !== _dragState.pointerId) return;
            if (_onPointerMove(ev.clientX, ev.clientY)) {
                ev.preventDefault();
            }
        };

        const onEnd = (ev) => {
            if (!_dragState || ev.pointerId !== _dragState.pointerId) return;
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onEnd);
            window.removeEventListener('pointercancel', onEnd);
            _onPointerEnd();
        };

        window.addEventListener('pointermove', onMove, { passive: false });
        window.addEventListener('pointerup', onEnd);
        window.addEventListener('pointercancel', onEnd);
    });
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

    // Pause card deflation so cards behind the overlay stay intact
    _observerPaused = true;

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
                    return `<button type="button" class="no-flip qcm-tf-btn flex-1 rounded-xl transition-all h-[8rem] font-bold ${localBtnClass} flex items-center justify-center p-2" onclick="handleLearningQcmSelect(event, '${card.id}', ${i})"><span class="latex-content">${ans}</span></button>`;
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
                    const prefix = ['A', 'B', 'C', 'D'][i] || i + 1;
                    return `<button type="button" class="no-flip qcm-choice-btn w-full rounded-xl transition-all font-medium text-xs p-2.5 flex gap-2.5 ${localBtnClass}" onclick="handleLearningQcmSelect(event, '${card.id}', ${i})"><span class="font-bold opacity-75 shrink-0 mt-0.5">${prefix}.</span> <span class="latex-content break-words min-w-0">${ans}</span></button>`;
                }).join('')}
                </div>`;
            }

            contentFront = `
                 <div class="flex-grow w-full overflow-hidden relative min-h-0 flex flex-col px-4">
                     <div class="card-text-container qcm-question-container shrink-0" style="max-height: 35%; padding: 0;">
                        <div class="card-text-inner latex-content font-medium text-white">${formatCardContent(card.question)}</div>
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
                        <div class="card-text-inner latex-content font-medium text-white">${formatCardContent(card.question)}</div>
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
                    <div class="card-back absolute inset-0 bg-gradient-to-br from-slate-800 to-indigo-900/40 rounded-3xl border border-indigo-500/30 p-6 pt-10 pb-6 flex flex-col items-center justify-start text-center shadow-2xl backface-hidden">
                        <span class="bg-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest px-2 py-1 rounded-md mb-4 mt-0 shrink-0">${isQcm ? 'Explication' : 'Réponse'}</span>
                        <div class="flex-grow w-full overflow-hidden relative min-h-0 flex flex-col justify-center">
                             <div class="card-text-container">
                                <div class="card-text-inner latex-content font-medium text-white">${isQcm ? (formatCardContent(card.answer) || "<span class='opacity-50 italic'>Aucune explication fournie.</span>") : formatCardContent(card.answer)}</div>
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
                <div id="learning-card-container" class="w-full flex flex-col justify-center items-center py-4 flex-grow relative overflow-visible min-h-0">
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
// Cards behind the overlay stayed intact (observer was paused).
// We just refresh cards whose state changed during learning.
function exitLearningOverlay() {
    window.learningScope_renderCard = null;

    // 1. Resume the observer (was paused during learning mode)
    _observerPaused = false;

    // 2. Remove the overlay
    const overlay = document.getElementById('learning-overlay');
    if (overlay) overlay.remove();

    // 3. Clean up hash if it's still there (e.g. fallback path)
    if (location.hash === '#learning') {
        history.replaceState(null, '', location.pathname + location.search);
    }

    // 4. Update stats (progress ring, counters)
    if (activeDeckId) updateDeckStats(activeDeckId);

    // 5. Refresh only the cards that were modified during learning.
    //    Their data changed but their DOM is stale. updateSingleCardDOM
    //    replaces just those cards and re-observes them.
    document.querySelectorAll('.card-container[data-inflated="true"]').forEach(el => {
        const cardId = el.dataset.id;
        const card = cards.find(c => c.id === cardId);
        if (card) {
            // Re-render this card with fresh data
            updateSingleCardDOM(card);
        }
    });

    saveData();
}


// --- QUICK ACTIONS (OPTIMIZED — no full re-render) ---

function toggleCardLearned(e, id) {
    if (e) e.stopPropagation();
    const card = cards.find(c => c.id === id);
    if (!card) return;

    card.isLearned = !card.isLearned;
    saveData();

    // Targeted DOM update — avoids full renderView() wipe which crashed Safari iOS
    const cardWrapper = document.querySelector(`.card-container[data-id="${id}"]`);
    if (cardWrapper && cardWrapper.dataset.inflated === 'true') {
        const isLearned = card.isLearned;
        const front = cardWrapper.querySelector('.card-front');
        if (front) {
            front.className = `card-front absolute inset-0 rounded-2xl shadow-xl flex flex-col overflow-hidden border-2 transition-all duration-300 ${isLearned ? 'border-emerald-500/50 bg-gradient-to-br from-slate-800 to-emerald-900/20' : 'border-slate-700 bg-slate-800 hover:border-slate-600'}`;
            const badge = front.querySelector('span.uppercase');
            if (badge) {
                badge.className = `text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md ${isLearned ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700/50 text-slate-400'}`;
            }
            const actionBtn = front.querySelector('button.no-flip.absolute');
            if (actionBtn) {
                actionBtn.className = `no-flip absolute bottom-4 right-4 p-3 rounded-full shadow-lg z-30 transition-all ${isLearned ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/50' : 'bg-slate-700 hover:bg-indigo-500 text-slate-300 hover:text-white'}`;
                actionBtn.innerHTML = `<i data-lucide="${isLearned ? 'undo-2' : 'check'}" class="w-5 h-5"></i>`;
                createIconsIn(actionBtn);
            }
        }
        const back = cardWrapper.querySelector('.card-back');
        if (back) {
            const backBtn = back.querySelector('button.no-flip.absolute');
            if (backBtn) {
                backBtn.className = `no-flip absolute bottom-4 right-4 p-3 rounded-full shadow-lg z-30 transition-all ${isLearned ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/50' : 'bg-slate-700 hover:bg-indigo-500 text-slate-300 hover:text-white'}`;
                backBtn.innerHTML = `<i data-lucide="${isLearned ? 'undo-2' : 'check'}" class="w-5 h-5"></i>`;
                createIconsIn(backBtn);
            }
        }
    }

    // Re-position within theme grid: unlearned first, then learned
    const grid = document.getElementById(`grid-${card.theme}`);
    if (grid) {
        const themeCards = cards.filter(c => c.deckId === activeDeckId && c.theme === card.theme).sort((a, b) => {
            if (!!a.isLearned !== !!b.isLearned) return a.isLearned ? 1 : -1;
            return (a.order || 0) - (b.order || 0);
        });
        themeCards.forEach(c => {
            const el = grid.querySelector(`.card-container[data-id="${c.id}"]`);
            if (el) grid.appendChild(el);
        });
    }

    updateThemeHeaderStatus(card.theme);
    if (activeDeckId) updateDeckStats(activeDeckId);
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
        const deckTitleHeading = document.getElementById('modal-deck-title');
        const deckTypeGroup = document.getElementById('deck-type-group');
        if (entity) {
            if (deckTitleHeading) deckTitleHeading.textContent = "Modifier le Bloc";
            if (deckTypeGroup) deckTypeGroup.classList.add('hidden');
            document.getElementById('deck-title').value = entity.title;
            const typeEls = document.getElementsByName('deck-type');
            for (const el of typeEls) { el.checked = (el.value === (entity.type || 'flashcard')); }
            selectedGradient = entity.gradient;
            editingId = entity.id;
        } else {
            if (deckTitleHeading) deckTitleHeading.textContent = "Nouveau Bloc de Fiches";
            if (deckTypeGroup) deckTypeGroup.classList.remove('hidden');
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
                : `<input type="text" value="${ans}" onchange="updateQcmText(${i}, this.value)" placeholder="Réponse ${i + 1}" class="flex-grow bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none">`
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
    const rawQ = document.getElementById('card-question').value;
    const q = formatCardContent(rawQ);

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

        a = formatCardContent(document.getElementById('card-explanation').value || '');
        qcmData = {
            mode: currentQcmMode,
            answers: currentQcmAnswers.map(ans => formatCardContent(ans)),
            correct: [...currentQcmCorrect],
            explanation: a
        };
    } else {
        a = formatCardContent(document.getElementById('card-answer').value);
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

let _openContextMenu = null;

function closeAllContextMenus() {
    if (_openContextMenu) {
        _openContextMenu.classList.add('hidden');
        const parentGroup = _openContextMenu.closest('.group, .card-container');
        if (parentGroup) parentGroup.style.zIndex = '';
        _openContextMenu = null;
    }
}

function toggleDeckMenu(e, id) {
    if (e) e.stopPropagation();
    const menu = document.getElementById(`menu-deck-${id}`);
    if (!menu) return;
    const isAlreadyOpen = !menu.classList.contains('hidden');
    closeAllContextMenus();
    if (!isAlreadyOpen) {
        menu.classList.remove('hidden');
        const container = menu.closest('.group');
        if (container) container.style.zIndex = '50';
        _openContextMenu = menu;
    }
}

function toggleCardMenu(e, id) {
    if (e) e.stopPropagation();
    const menu = document.getElementById(`menu-card-${id}`);
    if (!menu) return;
    const isAlreadyOpen = !menu.classList.contains('hidden');
    closeAllContextMenus();
    if (!isAlreadyOpen) {
        menu.classList.remove('hidden');
        const container = menu.closest('.card-container');
        if (container) container.style.zIndex = '50';
        _openContextMenu = menu;
    }
}

function downloadDeckDirectly(arg1, arg2) {
    let e = null;
    let deckId = null;

    if (arg1 && typeof arg1 === 'object' && arg1.stopPropagation) {
        e = arg1;
        deckId = arg2;
    } else {
        deckId = arg1;
    }

    if (e && e.stopPropagation) e.stopPropagation();
    closeAllContextMenus();

    if (!deckId) return showToast("Identifiant de bloc manquant", "error");

    const deck = decks.find(d => d.id === deckId);
    if (!deck) return showToast("Bloc introuvable", "error");

    const deckCards = cards.filter(c => c.deckId === deckId);
    if (deckCards.length === 0) return showToast("Aucune carte à télécharger", "error");

    const isQcm = deck.type === 'qcm';
    const exportData = deckCards.map(c => {
        if (isQcm) {
            return {
                question: c.question,
                qcmMode: c.qcmMode || 'multi',
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

    const title = deck.title ? deck.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'bloc';
    a.download = `flashcards_${title}_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Téléchargement lancé", "success");
}

function resetPublicDeck(e, id) {
    if (e) e.stopPropagation();
    closeAllContextMenus();
    const targetDeck = decks.find(d => d.id === id);
    const title = targetDeck ? `"${targetDeck.title}"` : 'ce bloc';
    showToast(`Réinitialiser ${title} à l'état d'origine ?`, "confirm", async () => {
        await doResetPublicDeck(id);
    });
}

async function doResetPublicDeck(deckId) {
    await fetchDefaultDecksConfig();
    const originalDeckConf = (DEFAULT_DECKS_CONFIG || []).find(d => d.id === deckId);
    if (!originalDeckConf) return;

    // 1. Réinitialiser le deck en mémoire
    const deckIdx = decks.findIndex(d => d.id === deckId);
    if (deckIdx !== -1) {
        decks[deckIdx] = createBasePublicDeck(originalDeckConf);
    }

    // 2. Remplacer les cartes de ce deck par les cartes de base vierges
    cards = cards.filter(c => c.deckId !== deckId);
    const freshCards = createBasePublicCards(originalDeckConf);
    cards = cards.concat(freshCards);

    // 3. Sauvegarder (l'absence d'overrides sera répercutée en local ou sur le Cloud)
    saveDataNow();
    renderView();
    showToast(`Bloc ${originalDeckConf.title} réinitialisé`, "success");
}

function deleteDeck(e, id) {
    if (e) e.stopPropagation();
    closeAllContextMenus();
    const targetDeck = decks.find(d => d.id === id);
    if (targetDeck && targetDeck.isPublic) {
        resetPublicDeck(e, id);
        return;
    }
    showToast("Supprimer ce bloc ?", "confirm", () => {
        decks = decks.filter(d => d.id !== id);
        cards = cards.filter(c => c.deckId !== id);
        if (themeColors) {
            Object.keys(themeColors).forEach(k => {
                if (k.startsWith(`${id}_`)) delete themeColors[k];
            });
        }
        saveData();
        renderView();
        showToast("Bloc supprimé", "success");
    });
}

function duplicateDeck(e, id) {
    if (e) e.stopPropagation();
    closeAllContextMenus();
    const original = decks.find(d => d.id === id);
    if (!original) return;
    const newId = generateId();
    decks.push({
        ...original,
        id: newId,
        title: original.title + " (Copie)",
        createdAt: Date.now(),
        order: decks.length,
        isPublic: false
    });
    const originalCards = cards.filter(c => c.deckId === id);
    originalCards.forEach(c => {
        cards.push({
            ...c,
            id: generateId(),
            deckId: newId,
            isLearned: false,
            validationStatus: 'unlearned',
            selectedAnswers: [],
            createdAt: Date.now(),
            order: cards.length,
            isDefaultCard: false
        });
    });
    saveData();
    renderView();
    showToast("Bloc dupliqué", "success");
}

function deleteCard(e, id) {
    if (e) e.stopPropagation();
    closeAllContextMenus();
    showToast("Supprimer cette carte ?", "confirm", () => {
        const card = cards.find(c => c.id === id);
        const cardTheme = card ? card.theme : null;
        cards = cards.filter(c => c.id !== id);
        saveData();

        // Targeted removal — clean up observer and DOM node
        const cardWrapper = document.querySelector(`.card-container[data-id="${id}"]`);
        if (cardWrapper) {
            if (_cardVisibilityObserver) _cardVisibilityObserver.unobserve(cardWrapper);
            cardWrapper.remove();
            if (cardTheme) updateThemeHeaderStatus(cardTheme);
            if (activeDeckId) updateDeckStats(activeDeckId);
        } else {
            renderView();
        }
        showToast("Carte supprimée", "success");
    });
}

function duplicateCard(e, id) {
    if (e) e.stopPropagation();
    closeAllContextMenus();
    const original = cards.find(c => c.id === id);
    if (!original) return;
    const newCard = {
        ...original,
        id: generateId(),
        createdAt: Date.now()
    };
    cards.push(newCard);
    saveData();

    // Targeted insertion into theme grid — avoid full view wipe
    const grid = document.getElementById(`grid-${original.theme}`);
    if (grid) {
        const newSkeleton = createCardSkeleton(newCard);
        grid.appendChild(newSkeleton);
        observeForKatex(newSkeleton);
        updateThemeHeaderStatus(original.theme);
        if (activeDeckId) updateDeckStats(activeDeckId);
    } else {
        renderView();
    }
    showToast("Carte dupliquée", "success");
}

function emptyThemeTrash(theme) {
    showToast(`Supprimer "${theme}" ?`, "confirm", () => {
        const count = cards.filter(c => c.deckId === activeDeckId && c.theme === theme).length;
        cards = cards.filter(c => !(c.deckId === activeDeckId && c.theme === theme));
        saveData();

        const grid = document.getElementById(`grid-${theme}`);
        if (grid) {
            if (_cardVisibilityObserver) {
                Array.from(grid.children).forEach(el => _cardVisibilityObserver.unobserve(el));
            }
            const section = grid.closest('.space-y-12 > div') || grid.parentElement;
            if (section && section.parentElement) {
                section.remove();
            } else {
                grid.innerHTML = '';
            }
        } else {
            renderView();
        }
        if (activeDeckId) updateDeckStats(activeDeckId);
        showToast(`${count} cartes supprimées`, "success");
    });
}

// SHUFFLE (Unlearned Only) - Targeted in-place DOM re-ordering, NO full re-render
function shuffleTheme(theme) {
    const unlearnedCards = cards.filter(c => c.deckId === activeDeckId && c.theme === theme && !c.isLearned);
    if (unlearnedCards.length === 0) {
        showToast("Aucune carte à apprendre dans cette catégorie", "info");
        return;
    }

    // Assign random orders to unlearned
    unlearnedCards.forEach(c => {
        c.order = Math.random();
    });

    saveData();

    // In-place DOM reordering: avoids full renderView() wipe which crashed Safari iOS
    const grid = document.getElementById(`grid-${theme}`);
    if (grid) {
        const deckCards = cards.filter(c => c.deckId === activeDeckId && c.theme === theme);
        const sorted = deckCards.sort((a, b) => {
            if (!!a.isLearned !== !!b.isLearned) return a.isLearned ? 1 : -1;
            return (a.order || 0) - (b.order || 0);
        });
        sorted.forEach(c => {
            const el = grid.querySelector(`.card-container[data-id="${c.id}"]`);
            if (el) {
                grid.appendChild(el);
            }
        });
    } else {
        renderView();
    }

    showToast("Cartes à apprendre mélangées", "success");
}

function updateThemeHeaderStatus(theme) {
    const deck = decks.find(d => d.id === activeDeckId);
    if (!deck) return;
    const themeCards = cards.filter(c => c.deckId === activeDeckId && c.theme === theme);
    const safeId = theme.replace(/[^a-zA-Z0-9]/g, '_');
    const btn = document.getElementById(`btn-toggle-theme-${safeId}`);
    if (btn) {
        const allLearned = themeCards.length > 0 && themeCards.every(c => c.isLearned);
        const iconName = (deck.type === 'qcm' || allLearned) ? 'rotate-ccw' : 'check-circle';
        btn.title = deck.type === 'qcm' ? 'Tout réinitialiser' : (allLearned ? 'Tout dévalider' : 'Tout valider');
        btn.innerHTML = `<i data-lucide="${iconName}" class="w-4 h-4"></i>`;
        createIconsIn(btn);
    }
    const countEl = document.getElementById(`theme-count-${safeId}`);
    if (countEl) {
        countEl.innerText = `${themeCards.length}`;
    }
}

// TOGGLE LEARNED ALL FOR THEME
function toggleThemeLearned(theme) {
    toggleAllTheme(theme);
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

    // Targeted refresh of this theme's grid only
    const grid = document.getElementById(`grid-${themeName}`);
    if (grid) {
        deckCards.forEach(c => {
            const el = grid.querySelector(`.card-container[data-id="${c.id}"]`);
            if (el) {
                if (_cardVisibilityObserver) _cardVisibilityObserver.unobserve(el);
                const newSkeleton = createCardSkeleton(c);
                grid.replaceChild(newSkeleton, el);
                observeForKatex(newSkeleton);
            }
        });
    } else {
        renderView();
    }

    updateThemeHeaderStatus(themeName);
    if (activeDeckId) updateDeckStats(activeDeckId);
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

// Modal Handlers & Edit
let editingId = null;

function editDeck(e, id) {
    if (e) e.stopPropagation();
    closeAllContextMenus();
    editingId = id;
    const deck = decks.find(d => d.id === id);
    openModal('deck', deck);
}

function editCard(e, id) {
    if (e) e.stopPropagation();
    closeAllContextMenus();
    editingId = id;
    const card = cards.find(c => c.id === id);
    openModal('card', card);
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
    const lowerQ = query.toLowerCase().trim();

    cardEls.forEach(cardWrapper => {
        const id = cardWrapper.dataset.id;
        const card = cards.find(c => c.id === id);
        let match = false;
        if (card) {
            match = (card.question && card.question.toLowerCase().includes(lowerQ)) ||
                (card.answer && card.answer.toLowerCase().includes(lowerQ));
        } else {
            match = cardWrapper.textContent.toLowerCase().includes(lowerQ);
        }
        cardWrapper.style.display = match ? '' : 'none';
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
                const exp = formatCardContent(item.explanation || "");
                const ans = formatCardContent(item.explanation || item.answer || "");
                cards.push({
                    id: generateId(),
                    deckId: activeDeckId,
                    question: formatCardContent(item.question),
                    qcmMode: item.qcmMode || 'multi',
                    answers: item.answers.map(a => formatCardContent(a)),
                    correctAnswers: item.correctAnswers,
                    explanation: exp,
                    answer: ans,
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
                    question: formatCardContent(item.question),
                    answer: formatCardContent(item.answer),
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

// --- UI HELPERS ---
function updateDeckTypeUI() {
    // Just re-renders peer classes visually handled by CSS logic but hook exists in case JS behavior is needed later
}

// --- TUTORIAL POPUP ---

const TUTO_PROMPTS = {
    flashcard: `A partir de mes documents, génère une structure de données JSON pour en extraire des Flashcards de révision, en regroupant les questions dans des groupes/thèmes, en suivant ce modèle (pour le langage mathématique, utilise le format LaTeX et vérifie ta syntaxe à plusieurs reprises). Pour structurer les réponses avec des retours à la ligne ou des paragraphes, utilise \\n ou \\n\\n :
[
    {
        "question": "Question 1 ?",
        "answer": "Première partie de la réponse.\\n\\nDeuxième partie ou détails.",
        "theme": "Général"
    },
    {
        "question": "Question 2 ?",
        "answer": "Réponse concise.",
        "theme": "Général"
    }
]`,
    qcm: `A partir de mes documents, génère une structure de données JSON pour en extraire des QCM de révision, en regroupant les questions dans des groupes/thèmes, en suivant ce modèle (pour le langage mathématique, utilise le format LaTeX et vérifie ta syntaxe à plusieurs reprises). Pour structurer les explications avec des retours à la ligne ou des paragraphes, utilise \\n ou \\n\\n :
[
  {
    "question": "Quelle est la capitale de la France ?",
    "qcmMode": "multi",
    "answers": ["Paris", "Lyon", "Marseille", "Bordeaux"],
    "correctAnswers": [0],
    "explanation": "Paris est la capitale de la France.\\n\\nC'est également la ville la plus peuplée du pays.",
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
    contentEl.scrollTop = 0;
    contentEl.innerHTML = `
        <div class="p-4 sm:p-6 border-b border-slate-800">
            <div class="flex items-center gap-3">
                <div class="p-2 bg-indigo-500/20 rounded-xl shrink-0">
                    <i data-lucide="${isQcm ? 'list-checks' : 'layers'}" class="w-5 h-5 text-indigo-400"></i>
                </div>
                <h2 class="text-base sm:text-lg font-bold text-white pr-8 leading-snug">${title}</h2>
            </div>
        </div>
        <div class="p-4 sm:p-6 space-y-4 sm:space-y-5">
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

// --- SETTINGS MODAL ---
function getCardFontScale(step) {
    const s = parseInt(step, 10) || 8;
    return Math.round((1 + (s - 8) * 0.05) * 100) / 100;
}

function applyCardFontScale(step, save = false) {
    const s = Math.min(10, Math.max(1, parseInt(step, 10) || 8));
    const scale = getCardFontScale(s);

    if (save) {
        localStorage.setItem(SETTING_KEY_FONT_STEP, s.toString());
    }

    // Application dynamique de la variable CSS
    document.documentElement.style.setProperty('--card-font-scale', scale);

    // Synchronisation du curseur input range s'il est présent
    const fontSlider = document.getElementById('setting-card-font-size');
    if (fontSlider && parseInt(fontSlider.value, 10) !== s) {
        fontSlider.value = s;
    }

    // Prévisualisation centrée en direct
    const previewEl = document.getElementById('settings-font-preview');
    if (previewEl) {
        previewEl.style.fontSize = `calc(1rem * ${scale})`;
    }

    // Mise à jour du label textuel
    const labelEl = document.getElementById('setting-font-val-label');
    if (labelEl) {
        if (s === 8) {
            labelEl.textContent = "Taille : 1 (Défaut)";
        } else {
            labelEl.textContent = `Taille : ${scale}`;
        }
    }

    // Coloration dynamique des crans
    const ticks = document.querySelectorAll('.settings-slider-ticks .tick');
    ticks.forEach(t => {
        const val = parseInt(t.dataset.val, 10);
        t.classList.toggle('active', val <= s);
    });
}

function handleCardFontScaleChange(step) {
    applyCardFontScale(step, true);
}

function openSettingsModal() {
    const modal = document.getElementById('settings-overlay');
    if (!modal) return;

    // Synchroniser l'état des contrôles avec le localStorage
    initAppSettings();

    const verBadge = document.getElementById('settings-version-badge');
    if (verBadge && typeof APP_VERSION !== 'undefined') {
        verBadge.textContent = APP_VERSION.startsWith('v') ? APP_VERSION : `v${APP_VERSION}`;
    }

    const storageDesc = document.getElementById('settings-storage-mode-desc');
    if (storageDesc) {
        const mode = typeof getStorageMode === 'function' ? getStorageMode() : 'local';
        storageDesc.textContent = mode === 'cloud'
            ? "Mode Cloud Firestore actif (synchronisation temps réel multi-appareils)."
            : "Mode Local actif (données stockées sur ce navigateur).";
    }

    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    createIconsIn(modal);
}

function closeSettingsModal() {
    const modal = document.getElementById('settings-overlay');
    if (!modal) return;
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
}

function openStorageModeSelector() {
    closeSettingsModal();
    if (currentStorageMode === 'cloud') {
        promptSwitchToLocal();
    } else {
        promptSwitchToCloud();
    }
}

function toggleSettingAlignLeft(checked) {
    localStorage.setItem(SETTING_KEY_ALIGN_LEFT, checked ? 'true' : 'false');
    document.body.classList.toggle('align-left-back', checked);
}

function toggleSetting3dFlip(checked) {
    localStorage.setItem(SETTING_KEY_DISABLE_3D, checked ? 'false' : 'true');
    document.body.classList.toggle('disable-3d-flip', !checked);
}

function initAppSettings() {
    // 1. Alignement des réponses à gauche
    const isAlignLeft = localStorage.getItem(SETTING_KEY_ALIGN_LEFT) === 'true';
    document.body.classList.toggle('align-left-back', isAlignLeft);
    const alignToggle = document.getElementById('setting-align-left');
    if (alignToggle) alignToggle.checked = isAlignLeft;

    // 2. Pivotement 3D des fiches (activé par défaut)
    const isDisable3D = localStorage.getItem(SETTING_KEY_DISABLE_3D) === 'true';
    document.body.classList.toggle('disable-3d-flip', isDisable3D);
    const flipToggle = document.getElementById('setting-3d-flip');
    if (flipToggle) flipToggle.checked = !isDisable3D;

    // 3. Échelle de police des cartes (cran 8 = échelle 1 par défaut)
    const savedStep = parseInt(localStorage.getItem(SETTING_KEY_FONT_STEP), 10) || 8;
    applyCardFontScale(savedStep, false);
}

// --- LEGAL NOTICE MODAL ---
function openLegalModal() {
    const modal = document.getElementById('legal-modal-overlay');
    if (!modal) return;
    modal.classList.remove('hidden');
    createIconsIn(modal);
    document.body.style.overflow = 'hidden';
}

function closeLegalModal() {
    const modal = document.getElementById('legal-modal-overlay');
    if (!modal) return;
    modal.classList.add('hidden');
    document.body.style.overflow = '';
}

// --- INITIALIZATION ---
// Use DOMContentLoaded for deferred scripts compatibility
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

