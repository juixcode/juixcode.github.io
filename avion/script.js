
// --- 1. GESTION DES PAGES (ROUTING) ---
function switchPage(pageId) {
    // 1. Masquer toutes les sections
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // 2. Afficher la section demandée (avec animation CSS)
    const activeSection = document.getElementById('page-' + pageId);
    if(activeSection) activeSection.classList.add('active');

    // 3. Mettre à jour le menu DESKTOP
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('bg-blue-100', 'text-blue-600');
        btn.classList.add('text-slate-600');
    });
    const activeDesktopBtn = document.getElementById('nav-' + pageId);
    if(activeDesktopBtn) {
        activeDesktopBtn.classList.remove('text-slate-600');
        activeDesktopBtn.classList.add('bg-blue-100', 'text-blue-600');
    }

    // 4. Mettre à jour le menu MOBILE (La correction est ici !)
    document.querySelectorAll('.mobile-link').forEach(btn => {
        // On remet tout le monde en "inactif" (gris)
        btn.classList.remove('bg-blue-50', 'text-blue-600');
        btn.classList.add('text-slate-600', 'hover:bg-slate-100');
    });
    const activeMobileBtn = document.getElementById('mobile-nav-' + pageId);
    if(activeMobileBtn) {
        // On met le bouton actif en bleu
        activeMobileBtn.classList.remove('text-slate-600', 'hover:bg-slate-100');
        activeMobileBtn.classList.add('bg-blue-50', 'text-blue-600');
    }

    // 5. Fermer le menu mobile proprement s'il est ouvert
    const mobileMenu = document.getElementById('mobile-menu');
    if (!mobileMenu.classList.contains('hidden')) {
        // On appelle la fonction toggleMenu() existante pour avoir l'animation de fermeture
        if(typeof toggleMenu === 'function') {
            toggleMenu(); 
        } else {
            // Fallback au cas où toggleMenu n'est pas définie
            mobileMenu.classList.add('hidden');
        }
    }
    
    // 6. Scroll en haut de page
    window.scrollTo(0,0);
}

// --- 2. MENU MOBILE ANIMÉ ---
        const menuBtn = document.getElementById('mobile-menu-btn');
        const mobileMenu = document.getElementById('mobile-menu');
        
        // Icônes SVG
        const iconBurger = '<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7" /></svg>';
        const iconClose = '<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>';

        function toggleMenu() {
            const isHidden = mobileMenu.classList.contains('hidden');
            
            if (isHidden) {
                // OUVERTURE
                mobileMenu.classList.remove('hidden');
                // Petit délai pour permettre au navigateur de rendre l'élément avant de lancer l'animation CSS
                requestAnimationFrame(() => {
                    mobileMenu.classList.remove('-translate-y-4', 'opacity-0');
                    mobileMenu.classList.add('translate-y-0', 'opacity-100');
                });
                menuBtn.innerHTML = iconClose;
            } else {
                // FERMETURE
                mobileMenu.classList.remove('translate-y-0', 'opacity-100');
                mobileMenu.classList.add('-translate-y-4', 'opacity-0');
                
                // On attend la fin de l'animation (300ms) pour remettre 'hidden'
                setTimeout(() => {
                    mobileMenu.classList.add('hidden');
                }, 300);
                menuBtn.innerHTML = iconBurger;
            }
        }

        // Clic sur le bouton burger
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Empêche le clic de se propager
            toggleMenu();
        });

        // Fermer le menu quand on clique sur un lien (déjà géré dans switchPage, mais on s'assure de l'animation)
        document.querySelectorAll('.mobile-link').forEach(link => {
            link.addEventListener('click', () => {
                // On force la fermeture douce
                if (!mobileMenu.classList.contains('hidden')) {
                    toggleMenu();
                }
            });
        });

        // Fermer si on clique ailleurs sur la page
        document.addEventListener('click', (e) => {
            if (!mobileMenu.classList.contains('hidden') && !mobileMenu.contains(e.target) && !menuBtn.contains(e.target)) {
                toggleMenu();
            }
        });

    // --- 2. INJECTION DES DONNÉES DE L'ÉQUIPE (Team) ---
    const teamContainer = document.getElementById('team-grid');
    if (teamContainer) {
        // Liste EXACTE des 15 membres issue de team.component.ts
        const teamMembers = [
            { name: 'BARAK Alexandre', role: 'Organisateur de projet', imageUrl: 'profiles/alexandre.png', description: 'Coordination et planification du projet.' },
            { name: 'BIDAULT Jean-Marc', role: 'Organisateur de projet', imageUrl: 'profiles/jm.png', description: 'Coordination et planification du projet.' },
            { name: 'GALLAIS Kévin', role: 'Organisateur de projet', imageUrl: 'profiles/kevin.png', description: 'Coordination et planification du projet.' },
            { name: 'BOISSEAU OROZCO Alex', role: 'Usinage', imageUrl: 'profiles/alex.jpg', description: 'Opérateur sur la fraiseuse numérique.' },
            { name: 'LEBREQUIER Alexandre', role: 'Référent du groupe', imageUrl: 'profiles/alexandre.jpg', description: 'Coordination et communication de l`équipe, responsable usinage avec la fraiseuse CNC' },
            { name: 'CONDAMIN-CHEINET Charles', role: 'Assemblage & Tests', imageUrl: 'images/etape1.jpg', description: 'Tests d\'emboîtement et de stabilité.' },
            { name: 'PAREL Ewen', role: 'Documentation Technique', imageUrl: 'images/etape1.jpg', description: 'Rédaction du cahier des charges.' },
            { name: 'FOUBERT Gabriel', role: 'Design & Esthétique', imageUrl: 'profiles/gabriel.jpg', description: 'Responsable du rendu final.' },
            { name: 'BARONNET Hugues', role: 'Conception 3D', imageUrl: 'profiles/hugues.jpg', description: 'Modélisation des pièces sur logiciel CAO.' },
            { name: 'VIMART Julien', role: 'Ailes, Supports, Site web', imageUrl: 'profiles/julien.jpg', description: 'Mise en place du site web, des pièces supports et leurs G-codes, et calculs de courbure des ailes' },
            { name: 'CATREVAULT Louis', role: 'Finitions', imageUrl: 'images/etape1.jpg', description: 'Ponçage, calculs de courbure des ailes, coordonnées de points avec programme python, rédaction du CDC' },
            { name: 'GUETTACHE Reda', role: 'Assemblage & Tests', imageUrl: 'images/etape1.jpg', description: 'Tests d\'emboîtement et de stabilité.' },
            { name: 'IORDACHE Sébastian', role: 'Usinage, ponçage, production', imageUrl: 'images/etape1.jpg', description: 'Usinage à la fraiseuse, ponçage post-production, inventaire des pièces produites et calculs' },
            { name: 'MERCIER Valentin', role: 'Documentation Technique', imageUrl: 'images/etape1.jpg', description: 'Rédaction du manuel d\'assemblage.' },
            { name: 'STOUFF Augustin', role: 'Gcode&Schémas, Production, CDC', imageUrl: 'profiles/augustin.jpg', description: 'Réalisation de G-code et de schémas, rédaction du CDC, usinage à la fraiseuse' }
        ];

        teamContainer.innerHTML = teamMembers.map(member => `
            <div class="text-center bg-white/50 backdrop-blur-2xl p-6 rounded-2xl shadow-lg border border-white/20 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl hover:shadow-cyan-500/20">
                <img src="${member.imageUrl}" alt="Photo de ${member.name}" class="w-32 h-32 rounded-full mx-auto object-cover shadow-md border-4 border-slate-200">
                <h3 class="mt-4 text-xl font-bold text-slate-900">${member.name}</h3>
                <p class="text-blue-600 font-semibold">${member.role}</p>
                <p class="mt-2 text-slate-600 text-sm">${member.description}</p>
            </div>
        `).join('');
    }

// --- 3. INJECTION DES DÉTAILS DU PROJET (Details) ---
    const detailsContainer = document.getElementById('details-container');
    if (detailsContainer) {
        
        // Nouvelle structure : On définit chaque pièce individuellement
        const sections = [
            {
                id: 'tete',
                title: "Nez de l'avion",
                description: "Nous avons opté pour un nez aérodynamique, pointu et provocateur, en référence au nez très pointu du Concorde.",
                pieces: [
                    { name: "P8 - Pointe du nez", copies: 1, file: "P8.txt", image: "resources/schema_p8.png" },
                    { name: "P8a - Côtés du nez", copies: 2, file: "P8a.txt", image: "resources/schema_p8a.png" }
                ],
                seed: 'Tete'
            },
            {
                id: 'corps',
                title: "Corps de l'avion",
                description: "Le corps de l'avion est composé de deux squelettes parallèles, qui relient les 28 disques formant le corps cylindrique de l'avion, de la queue jusqu'à la tête.",
                pieces: [
                    { name: "P1 - Disque principal", copies: 24, file: "P1.txt", image: "resources/schema_p1.png" },
                    { name: "P1a - Disque de la tête, grand", copies: 1, file: "P1a.txt", image: "resources/schema_p1a.png" },
                    { name: "P1b - Disque de la tête, moyen", copies: 1, file: "P1b.txt", image: "resources/schema_p1b.png" },
                    { name: "P1c - Disque de la tête, petit", copies: 1, file: "P1c.txt", image: "resources/schema_p1c.png" },
                    { name: "P1d - Disque de la tête, support du nez", copies: 1, file: "P1d.txt", image: "resources/schema_p1d.png" },
                    { name: "P7 - Squelette, milieu", copies: 4, file: "P7.txt", image: "resources/schema_p7.png" },
                    { name: "P7a - Squelette, extrémité", copies: 2, file: "P7a.txt", image: "resources/schema_p7a.png" },
                    { name: "P7b - Squelette, tete de l'avion", copies: 2, file: "P7b.txt", image: "resources/schema_p7b.png" },
                    { name: "P6 - Squelette, fixation", copies: 6, file: "P6.txt", image: "resources/schema_p6.png" }
                ],
                seed: 'Corps'
            },
            {
                id: 'ailes',
                title: "Ailes de l'avion",
                description: "Les ailes sont larges et ont une courbure parfaite pour un vol supersonique.",
                pieces: [
                    { name: "P2 - Aile", copies: 1, file: "P2.txt", image: "resources/schema_p2.png" },
                    { name: "P2a - Aile, logo gravé", copies: 1, file: "P2a.txt", image: "resources/schema_p2a.png" },
                    { name: "P3 - Aile, milieu", copies: 2, file: "P3.txt", image: "resources/schema_p3.png" },
                    { name: "P3a - Aile, pointe", copies: 2, file: "P3a.txt", image: "resources/schema_p3a.png" },
                    { name: "P4 - Aile, avant", copies: 2, file: "P4.txt", image: "resources/schema_p4.png" }
                ],
                seed: 'Ailes'
            },
            {
                id: 'reacteurs',
                title: "Réacteurs de l'avion",
                description: "Les réacteurs rectangulaires inspirés de ceux du Concorde permettent, avec un peu d'imagination, de propulser notre avion jusqu'à New York !",
                pieces: [
                    { name: "P9 - Réacteur", copies: 8, file: "P9.txt", image: "resources/schema_p9.png" }
                ],
                seed: 'Reacteurs'
            },
            {
                id: 'aileron',
                title: "Aileron de l'avion",
                description: "Un aileron élégant pour une stabilité optimale en vol.",
                pieces: [
                    { name: "P11 - Aileron", copies: 1, file: "P11.txt", image: "resources/schema_p11.png" }
                ],
                seed: 'Aileron'
            },
            {
                id: 'support',
                title: "Support de l'avion",
                description: "Surélévation de l'avion pour le mettre en valeur lors de la présentation. L'avion est ainsi incliné vers le haut, prêt à décoller !",
                pieces: [
                    { name: "P10 - Piédestal avant", copies: 1, file: "P10.txt", image: "resources/schema_p10.png" },
                    { name: "P10b - Piédestal arrière", copies: 1, file: "P10b.txt", image: "resources/schema_p10b.png" },
                    { name: "P10a - Stabiliseur du piédestal", copies: 2, file: "P10a.txt", image: "resources/schema_p10a.png" }
                ],
                seed: 'Support'
            }
        ];

        sections.forEach(section => {
            let piecesHtml = '';
            
            section.pieces.forEach((piece, index) => {
                const i = index + 1;
                const uniqueId = `${section.id}-p${i}`;
                
                piecesHtml += `
                <div class="bg-white/50 backdrop-blur-2xl p-6 rounded-2xl shadow-xl border border-white/20 overflow-hidden mb-8">
                    <h3 class="text-2xl font-bold text-slate-800 mb-4">${piece.name}</h3>
                    
                    <div class="grid grid-cols-1 md:grid-cols-5 gap-8">
                        <div class="md:col-span-2 h-96 md:h-auto">
                            <img src="${piece.image}" alt="Schéma ${piece.name}" class="w-full h-full object-cover rounded-lg shadow-md">
                        </div>

                        <div class="md:col-span-3 flex flex-col h-full justify-between">
                            <div class="flex flex-col flex-grow mb-4">
                                <div class="bg-white p-3 rounded-t-lg font-semibold flex justify-between items-center">
                                    <span>G-Code Preview (${piece.file})</span>
                                </div>
                                <div class="bg-slate-900 p-4 rounded-b-lg overflow-auto h-96 relative group border border-slate-700">
                                    <button style="position:sticky;display:flex;margin-left:auto;margin-bottom:-35px;" onclick="copyToClipboard('${uniqueId}')" class="absolute top-2 right-2 bg-slate-700 hover:bg-slate-600 text-slate-300 p-2 rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-10" title="Copier">
                                        📋
                                    </button>
                                    <pre><code id="${uniqueId}" class="text-sm font-mono text-slate-300">Chargement du G-Code...</code></pre>
                                </div>
                            </div>

                            <div class="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-white/30">
                                <div class="flex items-center gap-2">
                                    <span class="text-slate-600 font-semibold text-lg">Quantité à usiner :</span>
                                    <span class="bg-slate-800 text-white font-bold py-1 px-3 rounded-full shadow-sm">${piece.copies}x</span>
                                </div>

                                <button onclick="downloadRealGcode('${piece.file}')" class="flex-shrink-0 inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold py-2 px-6 rounded-full hover:shadow-lg hover:shadow-cyan-500/50 transition-all transform hover:scale-105 shadow-md">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
                                    </svg>
                                    <span>Télécharger</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>`;

                fetch(`./gcode/${piece.file}`)
                    .then(response => {
                        if (!response.ok) throw new Error("Fichier introuvable");
                        return response.text();
                    })
                    .then(text => {
                        // On attend un tout petit peu que le HTML soit injecté
                        setTimeout(() => {
                            const codeElement = document.getElementById(uniqueId);
                            if (codeElement) {
                                // On limite la taille si le fichier est énorme (optionnel)
                                codeElement.innerText = text.length > 5000 ? text.substring(0, 5000) + "\n... [Fichier tronqué pour l'affichage]" : text;
                            }
                        }, 100);
                    })
                    .catch(err => {
                        setTimeout(() => {
                            const codeElement = document.getElementById(uniqueId);
                            if (codeElement) codeElement.innerText = `Erreur : Impossible de charger ${piece.file}.\nVérifiez que le fichier est bien dans le dossier 'gcode'.`;
                        }, 100);
                    });
            });

            const sectionHtml = `
            <section id="${section.id}" class="mb-20">
                <div class="text-center mb-12">
                    <h2 class="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-500">${section.title}</h2>
                    <div class="mt-8 max-w-4xl mx-auto bg-white/30 backdrop-blur-lg p-6 rounded-2xl border border-white/40 shadow-lg">
                        <p class="text-slate-800 text-lg text-left leading-relaxed">${section.description}</p>
                    </div>
                </div>
                <div class="space-y-12">
                    ${piecesHtml}
                </div>
            </section>`;
            
            detailsContainer.innerHTML += sectionHtml;
        });
    }

// --- 4. INJECTION DU MANUEL (Manual) ---
    const manualContainer = document.getElementById('manual-grid');
    if (manualContainer) {
        
        // C'est ici que tu configures tes étapes une par une !
        const stepsData = [
            { 
                id: 1, 
                title: "Préparation du corps", 
                desc: "Prendre toutes les pièces P7, P7a et P7b (les squelettes 'peignes') et les relier à l’aide des pièces P6 (la fixation).", 
                img: "./images/etape1.jpg"
            },
            { 
                id: 2, 
                title: "Construction du corps", 
                desc: "Insérer les disques P1a, P1b et P1c par ordre décroissant sur P7b (le 'peigne' courbé) de sorte qu’il reste une encoche de libre au bout de l’armature.", 
                img: "./images/etape2.jpg"
            },
            { 
                id: 3, 
                title: "Fixation du nez", 
                desc: "Insérer les pièces P8 dans les orifices latéraux de P1d puis insérer la pièce P8a dans l’orifice central de P1d (le petit disque à encoches). Insérer P1d dans l’encoche restante à l'avant du corps principal précédemment construit.", 
                img: "./images/etape3.jpg"
            },
            { 
                id: 4, 
                title: "Fixation des réacteurs", 
                desc: "Joindre les pièces d'ailes P2/P2a à P3a (les pointes des ailes) grâce à 4 réacteurs P9. Recommencer une deuxième fois pour l'autre aile.", 
                img: "./images/etape4.jpg"
            },
            { 
                id: 5, 
                title: "Pose de l'aile arrière gauche", 
                desc: "Insérer l’ensemble comportant P2 à l’arrière droite du corps principal au niveau des encoches latérales des armatures. L’encoche (indiquée en rouge sur le schéma et présente dans le G-Code de P2) indique à quel niveau la dernière armature doit se trouver par rapport à P2.", 
                img: "./images/etape5.jpg"
            },
            { 
                id: 6, 
                title: "Pose de l'aile arrière droite", 
                desc: "Insérer l’ensemble comportant P2a à l’arrière gauche du corps principal au niveau des encoches latérales des armatures. L’encoche (indiquée en rouge sur le schéma et présente dans le G-Code de P2a) indique à quel niveau la dernière armature doit se trouver par rapport à P2a.", 
                img: "./images/etape6.jpg"
            },
            { 
                id: 7, 
                title: "Pose de l'avant des ailes", 
                desc: "Insérer P3 (le milieu des ailes) à la suite de P2/P2a de chaque côté du corps principal. Insérer P4 (l'avant des ailes) à la suite de P3 de chaque côté du corps principal.", 
                img: "./images/etape7.jpg"
            },
            { 
                id: 8, 
                title: "Pose de l'Aileron", 
                desc: "Insérer l’aileron à l’arrière du corps principale sur la partie supérieure des 6 dernières armatures du corps principal (De manière perpendiculaire aux ailes). L'avion est prêt !", 
                img: "./images/etape8.jpg"
            }
        ];

        // On vide le conteneur avant de commencer (sécurité)
        manualContainer.innerHTML = '';

        // On génère le HTML pour chaque étape de ta liste
        stepsData.forEach(step => {
            manualContainer.innerHTML += `
            <div class="bg-white/50 backdrop-blur-2xl rounded-2xl shadow-lg border border-white/20 overflow-hidden transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/20">
                <div class="h-48 overflow-hidden relative group">
                    <img src="${step.img}" alt="Illustration ${step.title}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110">
                </div>
                <div class="p-6">
                    <div class="flex items-center gap-3 mb-2">
                        <span class="bg-blue-100 text-blue-600 font-bold py-1 px-3 rounded-full text-xs uppercase tracking-wider">Étape ${step.id}</span>
                    </div>
                    <h2 class="text-2xl font-bold text-slate-800 mb-2">${step.title}</h2>
                    <p class="text-slate-600 leading-relaxed">${step.desc}</p>
                </div>
            </div>`;
        });
    }

let popupTimeout;

function showCopiedPopup(textToShow) {
    const popup = document.getElementById('copy-toast');
    const text = document.querySelector('#copy-toast span');
    
    // Si une animation est déjà en cours, on l'annule pour redémarrer
    clearTimeout(popupTimeout);
    
    // On affiche
    popup.classList.add('show');
    text.textContent = textToShow;
    
    // On masque après 1 seconde (1000ms)
    popupTimeout = setTimeout(() => {
        popup.classList.remove('show');
    }, 1000);
}

// Fonctions Globales pour G-Code
function copyToClipboard(ElementID) {
    const codeText = document.getElementById(ElementID).innerText;
    navigator.clipboard.writeText(codeText).then(() => {
        
        // TA NOUVELLE FONCTION ICI 👇
        showCopiedPopup("Copié !");
        
    }).catch(err => {
        console.error('Erreur', err);
    });
}

// Fonction pour forcer le téléchargement via un Blob
async function downloadRealGcode(filename) {
    const filePath = `./gcode/${filename}`;

    try {
        // 1. On va chercher le fichier
        const response = await fetch(filePath);
        
        if (!response.ok) {
            throw new Error(`Fichier ${filename} introuvable`);
        }

        // 2. On récupère le contenu sous forme de "Blob" (Binary Large Object)
        const blob = await response.blob();
        
        // 3. On crée une URL temporaire pour ce Blob
        const url = window.URL.createObjectURL(blob);
        
        // 4. On crée le lien invisible et on clique dessus
        const element = document.createElement('a');
        element.style.display = 'none';
        element.href = url;
        element.download = filename; // C'est ici qu'on impose le nom du fichier
        
        document.body.appendChild(element);
        element.click();
        
        // 5. Nettoyage
        window.URL.revokeObjectURL(url); // On libère la mémoire
        document.body.removeChild(element);
        
    } catch (err) {
        console.error('Erreur de téléchargement :', err);
        alert("Impossible de télécharger le fichier. Vérifiez qu'il existe bien dans le dossier 'gcode'.");
    }
}

// --- 5. LOGIQUE D'ENVOI TELEGRAM (Contact) ---

function sendMessage() {
    let name = document.getElementById('name');
    let email = document.getElementById('email');
    let message = document.getElementById('message');

    // Validation rapide
    if (!name.value || !email.value || !message.value) return;

    const token = '7505325320:AAEjahmj4jRnz4sejUS0g0hBECS4r-tyWCE';
    const chat_id = '5964879114';
    const telegram_message = 'AVION\n🙋‍♂️' + name.value + ' a écrit :\n' + message.value + '\n\n➡️Contact : ' + email.value;
    const url = `https://api.telegram.org/bot${token}/sendMessage?chat_id=${chat_id}&text=${encodeURIComponent(telegram_message)}`;

    fetch(url) // Requête
        .then(response => response.json())
        .then(data => {
            if (data.ok) {
                console.log('Message envoyé avec succès :', data);
                showCopiedPopup("Envoyé !");
            } else {
                console.error('Erreur lors de l\'envoi du message :', data);
            }
        })
        .catch(error => {
            console.error('Erreur lors de l\'envoi de la requête :', error);
        });
    email.value = '';
    message.value = '';
    name.value = '';
};