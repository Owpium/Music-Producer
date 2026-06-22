/* =============================================================================
   ARRANGEMENT — LE CONTRAT CENTRAL (schéma v1)
   -----------------------------------------------------------------------------
   Source de vérité unique du morceau. Le cœur pur (core.js) le transforme en
   liste d'événements ; le moteur audio (app.js) ne fait que jouer ces événements.
   Module "dual" : utilisable dans le navigateur (global MPArrangement) ET en
   Node (require) pour les tests.

   Démo : melodic techno hypnotique + basse acid, 124 BPM, La mineur.
   Réfs : Miss Monique × Boris Brejcha (socle) + Mathu "Acid Rain" (la basse).
============================================================================= */
(function (root) {
  const ARRANGEMENT = {
    title: "Demo — Melodic Acid (Phase 1)",
    tempo: 124,
    key: "A minor",
    swing: 0.08,

    sections: [
      { name: "intro", bars: 8,  energy: 0.25, chords: ["Am", "F", "C", "G"] },
      { name: "build", bars: 8,  energy: 0.60, chords: ["Am", "F", "C", "G"] },
      { name: "drop",  bars: 16, energy: 1.00, chords: ["Am", "F", "C", "G"] },
      { name: "break", bars: 8,  energy: 0.35, chords: ["F",  "C", "Am", "G"] },
      { name: "outro", bars: 8,  energy: 0.30, chords: ["Am", "F", "C", "G"] }
    ],

    transitions: [
      { from: "build", to: "drop", type: "riser+impact" }
    ],

    layers: [
      {
        name: "kick", role: "kick", gain: 0,
        patterns: {
          build: "x...x...x...x...",
          drop:  "x...x...x...x...",
          outro: "x...x...x...x..."
        }
      },
      {
        name: "clap", role: "clap", gain: -11,
        patterns: { drop: "....x.......x..." }
      },
      {
        name: "hat", role: "hat", gain: -20,
        patterns: {
          intro: "..x...x...x...x.",
          build: "..x.x.x...x.x.x.",
          drop:  "..x...x...x...x.",
          outro: "..x...x...x...x."
        }
      },
      {
        name: "acid", role: "bass", gain: -7, sidechain: "kick",
        patterns: {
          build: [
            { step: 0, off: 0, len: 2 }, { step: 4, off: 0, len: 2 },
            { step: 8, off: 0, len: 2 }, { step: 12, off: 0, len: 2 }
          ],
          drop: [
            { step: 0, off: 0 }, { step: 2, off: 0 }, { step: 3, off: 12, slide: true },
            { step: 4, off: 0 }, { step: 6, off: 3 }, { step: 8, off: 0 },
            { step: 10, off: 7 }, { step: 11, off: 0 }, { step: 12, off: 0 },
            { step: 14, off: -2 }, { step: 15, off: 12, slide: true }
          ],
          break: [ { step: 0, off: 0, len: 4 }, { step: 8, off: 7, len: 4 } ]
        }
      },
      {
        name: "sub", role: "sub", gain: -7, sidechain: "kick",
        sections: ["intro", "build", "drop", "break", "outro"]
      },
      {
        name: "pad", role: "pad", gain: -15, sidechain: "kick",
        sections: ["intro", "build", "drop", "break", "outro"]
      },
      {
        name: "lead", role: "lead", gain: -13, sidechain: "kick",
        patterns: {
          drop: [
            { step: 0, note: "A4", len: 2 }, { step: 4, note: "E5", len: 2 },
            { step: 7, note: "C5", len: 1 }, { step: 8, note: "D5", len: 2 },
            { step: 12, note: "C5", len: 2 }, { step: 14, note: "B4", len: 2 }
          ],
          break: [ { step: 0, note: "A4", len: 6 }, { step: 8, note: "C5", len: 6 } ]
        }
      }
    ]
  };

  if (typeof module !== "undefined" && module.exports) module.exports = ARRANGEMENT;
  else root.MPArrangement = ARRANGEMENT;
})(typeof self !== "undefined" ? self : globalThis);
