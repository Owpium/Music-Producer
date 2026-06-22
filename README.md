# Music-Producer

Outil pour **créer de la musique électronique sans connaissance préalable** :
une IA propose une base musicale **structurée et éditable** (couches × sections)
que l'on remodèle, plutôt qu'un audio fini « boîte noire ».

- 📄 Vision & positionnement : [`VISION.md`](VISION.md)
- 🗺️ Plan de développement : [`PLAN.md`](PLAN.md)

## Démo (Phase 1) — écouter le moteur

Un mini-morceau de **melodic techno + basse acid** (124 BPM, La mineur) décrit
entièrement dans un objet `ARRANGEMENT` et joué par Tone.js dans le navigateur.

### Lancer

Option simple (sans rien installer) — un petit serveur statique :

```bash
cd app
python3 -m http.server 8000
# puis ouvrir http://localhost:8000 dans le navigateur
```

Clique sur **Play**, monte le son. Le seul critère de cette étape :
*« est-ce que ça donne envie de bouger la tête ? »*

> Tu peux aussi ouvrir `app/index.html` directement, mais passer par un serveur
> local est plus fiable.

### Ce qu'il y a sous le capot

- `app/index.html` — l'interface (transport + timeline des sections + énergie).
- `app/app.js` — l'objet `ARRANGEMENT` (le **contrat** éditable) + le moteur
  audio : séquenceur 16 pas, sidechain kick→basse, filtre « musical » qui
  s'ouvre selon l'énergie de chaque section, transition riser+impact avant le drop.
- `app/samples/` — où déposer de vrais samples de batterie (voir le README dedans).

Pour modifier le morceau, édite l'objet `ARRANGEMENT` en haut de `app.js`
(tempo, sections, accords, patterns par couche) et recharge la page.
