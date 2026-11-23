/* ══════════════════════════════════════════════════════════════
   CATALOGUE — Last Minute Learning
   ──────────────────────────────────────────────────────────────
   Organisation des dossiers :  <Niveau>/<Année>/<module>/…
     ex. A1/2025/partiels/cours-algo.html
         A2/2026/poo-csharp/index.html

   « year » = année de RENTRÉE de l'année scolaire
     2025 → 2025-2026 · 2026 → 2026-2027

   Pour publier un cours / QCM : déposer le dossier au bon endroit,
   puis ajouter une entrée ci-dessous. Rien d'autre à modifier.

   Champs :
     year     (number)  année de rentrée
     level    ('A1'…'A5')
     title    titre de la carte
     subject  'info' | 'maths' | 'physique' | 'autre'  (couleur + icône)
     type     'cours' | 'qcm'
     tag      petit libellé (ex. 'S2 CC2')
     tags     plusieurs libellés à la place de « tag » (ex. ['S1 Partiel', 'CC2'])
     href     chemin relatif depuis learn/
     storage  préfixes des clés LocalStorage utilisées par la page
              (purgés par le bouton « Purger » de la catégorie)
     hidden   true → page non affichée, mais ses données sont purgeables
   ══════════════════════════════════════════════════════════════ */
window.LML_CATALOG = [

  /* ───────── 2026-2027 ───────── */
  {
    year: 2026, level: 'A2',
    title: 'POO en C#', subject: 'info', type: 'cours', tags: ['S1 Partiel', 'CC2'],
    href: 'A2/2026/poo-csharp/index.html',
    storage: ['poo_csharp_']
  },
  {
    year: 2026, level: 'A2',
    title: 'Séries', subject: 'maths', type: 'cours', tag: 'S1 CC2',
    href: 'A2/2026/maths-series/index.html',
    storage: ['maths_series_']
  },
  {
    year: 2026, level: 'A2',
    title: 'Algèbre linéaire', subject: 'maths', type: 'cours', tag: 'S1 CC2',
    href: 'A2/2026/maths-algebre-lineaire/index.html',
    storage: ['maths_algebre_']
  },

  /* ───────── 2025-2026 ───────── */
  {
    year: 2025, level: 'A1',
    title: 'Algorithmique', subject: 'info', type: 'qcm', tag: 'S2 Partiels',
    href: 'A1/2025/partiels/quiz-algo.html',
    storage: ['quiz_algo_', 'site_theme']
  },
  {
    year: 2025, level: 'A1',
    title: 'Algorithmique', subject: 'info', type: 'cours', tag: 'S2 Partiels',
    href: 'A1/2025/partiels/cours-algo.html',
    storage: ['site_theme']
  },
  {
    year: 2025, level: 'A1',
    title: 'Réseaux', subject: 'info', type: 'qcm', tag: 'S2 CC2',
    href: 'A1/2025/reseaux-cc2/index.html',
    storage: ['reseaux_cc2_']
  },
  {
    year: 2025, level: 'A1',
    title: 'Électronique', subject: 'physique', type: 'qcm', tag: 'S2 CC2',
    href: 'A1/2025/electronique-cc2/index.html',
    storage: ['electronique_cc2_']
  },
  {
    year: 2025, level: 'A1',
    title: 'Systèmes & Réseaux', subject: 'info', type: 'qcm', tag: 'S2 CC1',
    href: 'A1/2025/linux-cc1/index.html',
    storage: ['sysreseaux_']
  },
  {
    year: 2025, level: 'A1', hidden: true,
    title: 'Quiz Systèmes & Réseaux', subject: 'info', type: 'qcm', tag: 'S2 Partiels',
    href: 'A1/2025/partiels/quiz-systemes-reseaux.html',
    storage: ['quiz_reseaux_', 'site_theme']
  }

];
