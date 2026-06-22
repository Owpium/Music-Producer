---
name: llm-council
description: Convoque un conseil de 5 agents Claude indépendants, dans Claude Code uniquement, qui répondent séparément à une question difficile, se relisent et se classent à l'aveugle, puis synthétisent une réponse validée. Combat la complaisance et le raisonnement à angle unique — à utiliser quand Jo veut une vraie réponse au lieu d'un acquiescement. Se déclenche sur "/llm-council", "convoque le conseil", "passe ça au conseil", "donne-moi un avis multi-agents / une seconde opinion", "stress-teste ça", "ne sois pas juste d'accord avec moi", "argumente les deux camps et dis-moi qui a raison", "est-ce vraiment une bonne idée", ou tout moment où elle veut qu'une décision soit éprouvée plutôt que validée d'office.
---

# LLM Council

Une chaîne en 3 étapes (d'après karpathy/llm-council) qui produit une réponse
**validée** au lieu d'une réponse complaisante. Cinq agents Claude indépendants
répondent à l'aveugle, puis se relisent et classent le travail des autres à
l'aveugle, puis la boucle principale (toi, en tant que Président) synthétise.
Le gain, c'est la relecture par les pairs à l'aveugle entre raisonneurs
indépendants — on juge au mérite, personne ne sait quelle réponse est à qui.

Tout se passe dans Claude Code, avec des sous-agents Claude uniquement. Aucun
appel externe, aucun autre fournisseur, rien ne quitte Anthropic.

La **question** est ce que Jo a passé (l'argument de `/llm-council`, ou le truc
qu'elle t'a demandé de passer au conseil). Si c'est vague, pose d'abord **une
seule** question de clarification.

## Prérequis
Ce skill utilise l'outil **Agent** de Claude Code pour lancer 5 sous-agents en
parallèle. Il tourne donc dans Claude Code (ou tout environnement Claude qui
expose les sous-agents). Si l'outil Agent n'est pas disponible, dis-le à Jo au
lieu de simuler les membres toi-même.

## Étape 1 — Réponses indépendantes (5 membres, en parallèle)
Lance les **cinq appels Agent dans un seul message** pour qu'ils tournent en
parallèle. Chacun est un agent `general-purpose`. Donne à chacun la même
question plus sa lentille. Les membres ne se voient jamais.

| Membre | Lentille |
|---|---|
| **Pragmatique** | Ce qui marche vraiment sous contraintes réelles. Biais vers l'action et le prochain pas concret. |
| **Red-teamer** | Attaque la prémisse. Où est-ce que ça échoue ? Est-ce que la question elle-même est fausse ou incomplète ? |
| **Rigoriste du domaine** | Justesse technique et précision. Nomme les vrais arbitrages exactement ; pas de flou. |
| **Premiers principes** | Ignore les conventions et les best-practices. Raisonne depuis les fondamentaux ; remets en cause les défauts. |
| **Généraliste** | Largeur de vue. Connecte les angles, pèse le tableau d'ensemble, réponds simplement. |

Template de prompt pour chaque membre :

```
Tu es un membre d'un conseil d'experts répondant à une question de façon
indépendante. Ton job est de donner ta meilleure réponse sincère — la lentille
ci-dessous est ce que tu dois mettre en avant, pas un personnage à jouer.

Ta lentille : {lens}

Question : {question}

Donne une réponse directe et bien raisonnée. Énonce tes hypothèses clés et la
plus forte objection à ta propre position. Sois précis et concis. Ne renvoie
que ta réponse.
```

Récupère les cinq réponses mot pour mot.

## Étape 2 — Relecture à l'aveugle + classement (5 relecteurs, en parallèle)
Étiquette les cinq réponses de l'Étape 1 en **Réponse A…E** et retire toute
identité. Garde ta propre table privée étiquette → membre.

Lance **cinq appels Agent relecteurs dans un seul message** (agents
`general-purpose`). Chaque relecteur voit les cinq réponses anonymisées.

Template de prompt relecteur :

```
Tu évalues des réponses anonymisées à cette question :

Question : {question}

{Réponse A … Réponse E}

Ta tâche :
1. Évalue chaque réponse individuellement — en jugeant sur l'exactitude et la
   pertinence uniquement, pas le style ni la longueur.
2. Puis donne un classement final, du meilleur au pire.

Formate le classement EXACTEMENT comme ceci tout à la fin :

FINAL RANKING:
Response C
Response A
...
```

Parse chaque bloc `FINAL RANKING`. Agrège par position moyenne.

## Étape 3 — Synthèse du Président (toi, la boucle principale)
Tu détiens les cinq réponses et les cinq relectures. **Ne te contente pas de
prendre la réponse n°1.**

- Construis la réponse finale à partir du raisonnement le plus solide parmi
  tous les membres.
- Là où le conseil est vraiment divisé, dis-le et prends position.
- Si le Red-teamer a montré que la prémisse de la question est fausse, c'est ça
  qui mène.

### Output
- **La réponse** — recommandation synthétisée, clairement.
- **Notes du conseil** — 3 à 5 lignes : là où ils étaient d'accord, le seul vrai
  désaccord (et quel camp tu as choisi), le classement agrégé, ce que tu as
  outrepassé.

Ne déverse pas les cinq réponses complètes par défaut. Si Jo dit « montre le
travail », affiche-les à ce moment-là.

## Notes & limites
- Comme les 5 membres sont tous des Claude, ils partagent les mêmes angles
  morts — ce qu'un Claude rate, les 5 peuvent le rater pareil. Le gain vient des
  lentilles distinctes et de la relecture à l'aveugle, pas de fournisseurs
  différents.
- Le nombre de membres et les lentilles sont faciles à ajuster.
