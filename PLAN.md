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

## Schéma d'arrangement (brouillon v0)

```jsonc
{
  "tempo": 124,
  "key": "A minor",
  "swing": 0.1,
  "sections": [
    { "name": "intro", "bars": 16 },
    { "name": "build", "bars": 8 },
    { "name": "drop",  "bars": 32 },
    { "name": "break", "bars": 16 },
    { "name": "outro", "bars": 16 }
  ],
  "layers": [
    {
      "name": "kick", "type": "sampler", "sound": "kick_909",
      "patterns": {
        "drop":  "x...x...x...x...",
        "break": "x.......x......."
      }
    },
    {
      "name": "bass", "type": "synth", "sound": "sub",
      "patterns": {
        "drop": [ { "step": 0, "note": "A1", "len": 2 } ]
      }
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
- Une couche peut n'avoir de pattern que dans certaines sections (silence ailleurs).

## Phases

### Phase 0 — Cadrage  ✅ (ce document + VISION.md)

### Phase 1 — Prototype moteur audio
- App web minimale (Vite + JS/TS), Tone.js.
- Charger un `arrangement.json` codé en dur et le **jouer** (transport, sections enchaînées).
- 1 sampler (kick) + 1 synth (bass) suffisent.
- **But** : valider « JSON d'arrangement → son ».

### Phase 2 — UI minimale
- Transport (play/stop, tempo, position dans les sections).
- Timeline des sections.
- **Step sequencer** 16 pas par couche (l'interface la plus intuitive débutant).
- Bibliothèque de sons de départ (quelques samples + 2 synths Tone.js).

### Phase 3 — Génération assistée (via Claude Code)
- Workflow : prompt en langage naturel → Claude Code écrit/met à jour `arrangement.json`.
- L'app détecte/recharge le fichier (hot-reload) ou bouton « recharger ».
- Définir un **schéma strict + validation** pour fiabiliser la génération.
- Variations : « rends le drop plus énergique », « ajoute une montée », etc.

### Phase 4 — Édition & itération
- Modifier patterns, sons, longueur de sections, tempo.
- Sauvegarder / charger des projets (`.json`).
- Export **WAV** et **MIDI**.

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
