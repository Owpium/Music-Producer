# Samples de batterie

La démo Phase 1 fonctionne **sans samples** : la batterie est synthétisée par
Tone.js (kick type 909, clap, hi-hat) pour qu'elle sonne tout de suite, sans
téléchargement ni dépendance.

L'architecture est néanmoins **sample-ready**. Quand tu auras tes sons :

1. Dépose tes fichiers ici, par exemple :
   - `samples/kick.wav`
   - `samples/clap.wav`
   - `samples/hat.wav`
2. On remplacera, dans `app.js`, les instruments synthétisés `kick` / `clap` /
   `hat` par des `Tone.Player` / `Tone.Sampler` pointant vers ces fichiers
   (le reste du moteur — séquençage, sidechain, sections — ne change pas).

> Astuce : pour de la techno crédible, des one-shots courts et secs marchent
> mieux que des boucles. Des packs libres de droits (CC0) existent ; on pourra
> aussi sampler tes propres sons plus tard (Phase 5).

> Note technique : la **basse acid** reste *synthétisée* (Tone.MonoSynth +
> filtre résonant + saturation) — c'est ce qui donne le gras et le caractère
> 303. Un sample figé ne permettrait pas de la faire "chanter".
