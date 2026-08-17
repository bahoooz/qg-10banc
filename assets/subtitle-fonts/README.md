# Polices sous-titres personnalisées

Ce dossier permet d'ajouter des polices hors Google Fonts / @fontsource (ex. typographies [DaFont](https://www.dafont.com/)).

## Ajouter une police

1. Télécharge la police (de préférence **`.woff2`**, sinon `.ttf` / `.otf`).
2. Place le fichier ici, ex. `ImpactLabel.woff2`.
3. Ajoute une entrée dans `manifest.json` :

```json
[
  {
    "id": "custom-impact-label",
    "label": "Impact Label",
    "file": "ImpactLabel.woff2",
    "canvasFamily": "Impact Label",
    "fontWeight": 400,
    "assFontName": "Impact Label"
  }
]
```

**Règles pour `id`** : préfixe obligatoire `custom-`, lettres minuscules, chiffres et tirets uniquement.

4. Rebuild : `pnpm build` (front + back).

La police apparaît dans le sélecteur de l'éditeur (sous-titres + textes overlay) et est utilisée à l'export canvas.

## Licence

Vérifie la licence de la police avant mise en prod (usage commercial, redistribution).
