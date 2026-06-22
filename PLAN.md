# Plan de développement — Music Producer

> Document vivant. On avance par incréments testables. Le **schéma d'arrangement**
> (section ci-dessous) est le contrat stable entre les trois briques : moteur audio,
> UI, et couche de génération (IA).

## Architecture (vue d'ensemble)

```
                ┌─────────────────────────┐
   Génération → │  arrangement.json        │ ← Édition UI
 (Claude Code)  │  (le contrat central)    │   (souris/clavier)
                └───────────┬─────────────┘
                            │
                ┌───────────▼─────────────┐
                │  Moteur audio (Tone.js)  │ → son
                └─────────────────────────┘
```

- **MVP** : la génération est faite par **Claude Code** (ce terminal), qui écrit/modifie
  `arrangement.json` dans le projet. Pas d'API, pas de clé, pas de coût.
- **Plus tard** : une couche `generator` interchangeable (Claude Code / Ollama / API Claude)
  produit le même JSON depuis l'app elle-même.

## Schéma d'arrangement (brouillon v1 — révisé par le conseil)

> **Correction clé du conseil :** le schéma ne décrit PAS que des notes. En
> techno, l'émotion vient à ~70-80 % du **son et du mouvement** (filtre qui
> s'ouvre, sidechain, reverb), pas des hauteurs. Le schéma doit donc encoder
> dès le départ une **courbe d'énergie par section** et une **automation par
> couche** — même si on laisse ces champs partiellement vides au début. C'est
> la décision la plus coûteuse à corriger plus tard.

```jsonc
{
  "tempo": 124,
  "key": "A minor",
  "swing": 0.12,
  "sections": [
    // chaque section porte un niveau d'ENERGIE (0..1) : c'est l'arc narratif.
    { "name": "intro", "bars": 16, "energy": 0.2 },
    { "name": "build", "bars": 8,  "energy": 0.6 },
    { "name": "drop",  "bars": 32, "energy": 1.0 },
    { "name": "break", "bars": 16, "energy": 0.3 },
    { "name": "outro", "bars": 16, "energy": 0.2 }
  ],
  // les TRANSITIONS entre sections font l'histoire (riser, sweep, silence...).
  "transitions": [
    { "from": "build", "to": "drop", "type": "riser+silence" }
  ],
  "layers": [
    {
      "name": "kick", "type": "sampler", "sound": "kick_909",
      "patterns": {
        "drop":  "x...x...x...x...",
        "break": "x.......x......."
      }
      // pas d'automation : le kick porte le groupe via le sidechain ci-dessous.
    },
    {
      "name": "bass", "type": "synth", "sound": "sub",
      "patterns": { "drop": [ { "step": 0, "note": "A1", "len": 2 } ] },
      "sidechain": "kick",                 // ducking kick -> basse (non optionnel)
      "automation": { "filterCutoff": { "build": [200, 4000] } }
    },
    {
      "name": "pad", "type": "synth", "sound": "warm_pad",
      "patterns": { "drop": [ { "step": 0, "note": "A2", "len": 16 } ] },
      "sidechain": "kick",
      "automation": { "filterCutoff": { "intro": [400, 2000] }, "reverbSend": { "break": [0.2, 0.6] } }
    },
    {
      "name": "lead", "type": "synth", "sound": "pluck",
      "patterns": { "drop": [] }
    }
  ]
}
```
- Patterns rythmiques : notation step `x`/`.` (16 pas par défaut).
- Patterns mélodiques : liste d'événements `{ step, note, len }`.
- `energy` par section = l'arc narratif ; pilote le rendu (couches actives, intensité).
- `transitions` = ce qui relie les sections (le vrai moteur de l'« histoire »).
- `sidechain` et `automation` par couche = ce qui fait que ça « respire » et bouge.
- Une couche peut n'avoir de pattern que dans certaines sections (silence ailleurs).
- **Le MIDI/pattern est un format INTERNE, pas l'interface utilisateur** (cf. Phase 4).

## Phases

### Phase 0 — Cadrage  ✅ (ce document + VISION.md)

### Phase 1 — Le test qui valide (ou tue) le projet  ⭐
> **Recommandation forte du conseil : ne PAS commencer par l'IA ni l'UI.**
- Écrire **à la main** un `arrangement.json` court (60-90 s, intro/build/drop/break/outro).
- App web minimale (Vite + TS) + Tone.js qui le **joue en boucle**.
- **Sample-based** : vrais one-shots kick/clap/hat (pas des oscillateurs nus).
- Mix minimal **non négociable** : sidechain kick→basse/pad + gain-staging.
- **Critère de succès unique** : « est-ce que ça donne envie de bouger la tête ? »
- **But** : valider simultanément le schéma ET « est-ce que ça sonne techno ? ».
  Si oui, tout le reste est de l'outillage. Si non, on l'a appris en 1 journée.

### Phase 2 — Player + boucle d'écoute solide
- Transport (play/stop, tempo, position), enchaînement des sections + transitions.
- 2-3 morceaux de référence codés **à la main** pour stabiliser le schéma (« gold standards »).
- Banque de sons de départ crédible (samples de batterie + 2-3 synths Tone.js réglés).
- Timeline visuelle des sections (lecture, pas encore édition).

### Phase 3 — Génération assistée (via Claude Code)
- Workflow MVP : prompt en langage naturel → **Claude Code** écrit/met à jour `arrangement.json`.
- Frontière nette `intention → JSON` (le générateur est remplaçable : Claude Code → règles → Ollama/API).
- **Schéma strict + validation** (Zod) pour fiabiliser la génération.
- Variations : « rends le drop plus énergique », « ajoute une montée », etc.

### Phase 4 — Édition par INTENTION (pas piano-roll)
> **Correction du conseil : c'est ici qu'est la vraie valeur, pas dans la génération.**
- Contrôles sémantiques : « plus sombre », « + / - d'énergie », « enlève la basse au break »,
  « varie le lead », swap de variation de pattern. L'app traduit l'intention en modifs du JSON.
- Garde-fous silencieux : gamme/quantification appliquées automatiquement ; undo ; « rends ça meilleur ».
- Retour audio **immédiat** après chaque action.
- Le **piano-roll / step-sequencer note-à-note = mode AVANCÉ optionnel**, jamais le défaut débutant.
- Sauvegarder / charger des projets (`.json`) ; export **WAV** et **MIDI**.

### Phase 5 — Jouer & sampler
- **Clavier d'ordinateur → instrument** (mappé sur la gamme du morceau → pas de fausses notes).
- **Sampling** : enregistrer un son (micro), le découper, le rejouer.

### Phase 6 (ultérieur) — Vers le public
- Couche `generator` interchangeable intégrée à l'app (Ollama / API Claude).
- Packaging (PWA ou Electron), comptes, partage, éventuelle monétisation.

## Pile technique pressentie
- **Build** : Vite.
- **Langage** : TypeScript.
- **Audio** : Tone.js (Web Audio API).
- **UI** : à décider en Phase 2 (vanilla + Web Components, ou Svelte/React léger).
- **Validation schéma** : Zod (ou JSON Schema).

## Références musicales (à compléter par Jordan)
- Genres : techno, tech house, minimale, melodic techno.
- Artistes / morceaux exemples : _à fournir_ → serviront à calibrer la génération.
