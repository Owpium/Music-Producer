'use strict';
/* Affiche le "piano-roll texte" de l'arrangement — les yeux structurels de
   l'assistant dans le conteneur (pas d'audio). Lance : node tools/print-timeline.cjs */
const A = require("../app/arrangement.js");
const Core = require("../app/core.js");
console.log(Core.renderTextTimeline(A));
