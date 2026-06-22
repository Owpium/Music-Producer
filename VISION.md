# Vision — Music Producer

## Pitch en une phrase
Un outil simple pour créer de la musique électronique **sans connaissance préalable**,
où une IA propose une base musicale **structurée et éditable** que l'on remodèle
couche par couche.

## Le problème
Deux mondes existent et ne se rejoignent pas :
- **Générateurs IA (Suno, Udio)** : un prompt → un morceau fini, mais boîte noire,
  quasi inéditable couche par couche.
- **DAW (GarageBand, BandLab, Ableton…)** : contrôle total, mais courbe
  d'apprentissage qui suppose justement les connaissances qu'on veut éviter.

## Notre angle
Le **pont** entre les deux : un *éditeur d'arrangement assisté par IA*.
- Ni boîte noire, ni DAW intimidant.
- L'IA pose une **structure éditable** (pistes + sections + motifs).
- L'utilisateur la remodèle via une interface simple.

## Métaphore directrice
La musique = un **alignement de couches** qui forment des **séquences**
(intro / build / drop / break / outro) racontant une histoire et créant de l'émotion.
→ C'est littéralement le modèle de données du produit (cf. schéma d'arrangement).

## Principes
1. **Simple d'abord** : tout ce qui transforme l'outil en DAW intimidant est repoussé.
2. **Éditer par l'intention, pas par la note** : l'utilisateur dit « plus sombre »,
   « enlève la basse au break » — pas « transpose +2 ». Le MIDI/pattern est un
   **format interne**, jamais l'interface du débutant (le piano-roll est un mode avancé).
3. **L'émotion vient du son et de l'arrangement, pas des notes** : en techno, ~70-80 %
   de l'émotion = sound design (sidechain, filtres, reverb) + courbe d'énergie + transitions.
   Conséquence : **sample-based** dès le départ et schéma qui encode énergie/automation.
4. **Le schéma JSON d'arrangement est le contrat central** : moteur audio, UI et IA
   s'y branchent indépendamment. C'est la décision la plus coûteuse à corriger → on la soigne.
5. **Player avant éditeur** : une boucle d'écoute existe dès le jour 1, sinon rien à juger.
6. **Local d'abord** : usage personnel, données privées, zéro coût. La génération par
   Claude Code est un *échafaudage* assumé, derrière une frontière `intention → JSON`
   remplaçable (règles / Ollama / API) pour une future version publique.

## Décisions de cadrage (2026-06-22)
| Sujet | Choix |
|---|---|
| Cœur produit | Arrangement éditable (MIDI/patterns), pas d'audio boîte-noire |
| Plateforme | Web app en local (navigateur + Tone.js) |
| Moteur de génération (MVP) | Claude Code écrit/modifie le JSON ; archi prête pour Ollama/API ensuite |
| Genre cible | Techno / tech house / minimale / melodic techno |
| Usage | Perso d'abord ; public/monétisation = phase ultérieure |

## Benchmark (synthèse)
- **Suno / Udio** : prompt→audio, stems + MIDI export, mais peu éditable, cloud.
- **GarageBand** : instruments de qualité, Mac only, reste un DAW.
- **BandLab** : navigateur, gratuit, collaboratif, mais pas de génération structurée.
- **Ableton / FL** : puissance totale, hors cible (trop complexe).
- **Tone.js** : moteur audio navigateur open source → **notre fondation**.
- **Magenta** : génération de motifs MIDI → à encapsuler plus tard si besoin.

## Hors périmètre (au début)
Automation fine, mixage/EQ pro, plugins VST externes, multipiste audio complet,
génération d'audio brut par IA.
