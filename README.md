# Lambda Calcul typé enrichie

Partie 1 à 4 sont implémentés

Contributions personnelles :
- Implémentation de l'algorithme W
- Implémentation modulaire, pour ajouter un Pterm, il suffit d'ajouter un fichier dans src/pterm
- Parser
- Ajout d'un CLI
  - support de fichier "itératif" avec la command `deno task run <file>`
  - evaluation avec la commande `deno task eval <term>`
  - typage avec la commande `deno task type <term>`
