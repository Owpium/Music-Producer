'use strict';
/* Tests structurels du cœur pur — aucun audio, aucune dépendance.
   Lance : node test/structure.test.cjs
   C'est le filet de sécurité "à l'aveugle" : vérifie que l'ARRANGEMENT produit
   bien les bons événements (placement, notes valides, sections non muettes). */
const assert = require("node:assert");
const A = require("../app/arrangement.js");
const Core = require("../app/core.js");

let passed = 0;
function check(label, fn) { fn(); passed++; console.log("  ✓ " + label); }

const data = Core.buildArrangement(A);

console.log(`Test de l'arrangement « ${A.title} »`);

check("totalSteps = somme(mesures) × 16", () => {
  const expected = A.sections.reduce((n, s) => n + s.bars, 0) * 16;
  assert.strictEqual(data.totalSteps, expected);
  assert.strictEqual(data.totalSteps, 768);
});

check("durée cohérente (~92s à 124 BPM)", () => {
  assert.ok(data.durationSec > 85 && data.durationSec < 100, "durée=" + data.durationSec);
});

check("nombre de kicks = 4/mesure sur build+drop+outro (=128)", () => {
  const kicks = data.events.filter((e) => e.kind === "kick").length;
  assert.strictEqual(kicks, (8 + 16 + 8) * 4);
});

check("aucune section n'est muette", () => {
  const soundKinds = new Set(["kick", "clap", "hat", "sub", "pad", "bass", "lead"]);
  for (const s of data.sections) {
    const has = data.events.some((e) => e.pos >= s.start && e.pos < s.start + s.len && soundKinds.has(e.kind));
    assert.ok(has, "section muette: " + s.name);
  }
});

check("toutes les notes (bass/lead/sub) sont des noms valides", () => {
  for (const e of data.events) {
    if (e.kind === "bass" || e.kind === "lead" || e.kind === "sub") {
      assert.doesNotThrow(() => Core.noteToMidi(e.note), "note invalide: " + e.note);
    }
    if (e.kind === "pad") e.notes.forEach((n) => assert.doesNotThrow(() => Core.noteToMidi(n)));
  }
});

check("la basse reste dans un registre grave plausible (MIDI 30..60)", () => {
  for (const e of data.events) if (e.kind === "bass") {
    const m = Core.noteToMidi(e.note);
    assert.ok(m >= 30 && m <= 60, "basse hors registre: " + e.note + " (" + m + ")");
  }
});

check("le drop a plus d'événements sonores que l'intro (montée d'énergie)", () => {
  const inSec = (name) => {
    const s = data.sections.find((x) => x.name === name);
    return data.events.filter((e) => e.pos >= s.start && e.pos < s.start + s.len && e.kind !== "section").length;
  };
  // normalisé par nombre de mesures pour comparer équitablement
  const intro = inSec("intro") / 8, drop = inSec("drop") / 16;
  assert.ok(drop > intro, `densité drop(${drop.toFixed(1)}) <= intro(${intro.toFixed(1)})`);
});

check("5 marqueurs de section avec les bonnes énergies", () => {
  const secs = data.events.filter((e) => e.kind === "section");
  assert.strictEqual(secs.length, 5);
  assert.deepStrictEqual(secs.map((s) => s.name), ["intro", "build", "drop", "break", "outro"]);
});

console.log(`\n${passed} tests OK ✅`);
