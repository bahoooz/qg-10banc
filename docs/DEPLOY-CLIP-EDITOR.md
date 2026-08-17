# Déploiement — Éditeur de clips

Checklist pour mettre l'éditeur de clips en production sur le PC serveur (Node + PostgreSQL + ffmpeg).

## Prérequis système

- **Node.js** 20+ et **pnpm** 10
- **PostgreSQL** avec base `qg_10banc`
- **ffmpeg** et **ffprobe** dans le `PATH` (vérifiés au démarrage — le serveur crash si absents)
- Espace disque : quota clips **100 Go** (`back/clips/`)

## Configuration

1. Copier `back/.env.example` → `back/.env` et remplir :
   - `DATABASE_URL`, `JWT_SECRET`, `GATEKEEPER_PASSWORD`, `RESEND_API_KEY`
   - `API_URL`, `FRONTEND_URL` (URLs publiques)
   - **`GROQ_API_KEY`** (transcription Whisper — requis en prod)
   - OAuth selon besoins : `TWITCH_*`, `GOOGLE_*`, `TIKTOK_*`

2. Créer `front/.env.production` :
   ```
   VITE_API_URL=https://api.10banc.com
   ```

3. Appliquer les migrations :
   ```bash
   pnpm db:migrate
   ```

## Build & démarrage

```bash
cd ~/apps/qg-10banc
pnpm install
pnpm db:migrate
pnpm build:front   # génère front/dist/index.html
pnpm build:back    # compile subtitle-composition + back/dist — OBLIGATOIRE après chaque pull
pm2 restart qg-app
```

**Vérifier le build backend** (cause fréquente de 404 sur `/saved-clips`) :

```bash
grep -q 'saved-clips' back/dist/src/index.js && echo "OK routes saved-clips" || echo "BUILD OBSOLÈTE"
node -e "import('./back/dist/src/index.js')" 2>&1 | head -1   # doit démarrer sans erreur .ts
```

Si PM2 pointe encore vers un ancien `dist/src/index.js` non regénéré, l'import `/clips` peut marcher mais pas `/saved-clips`, `/clip-templates` ni `/soundboard`.

Vérifier que le build front existe :

```bash
ls -la front/dist/index.html
```

Au démarrage, `pm2 logs` doit afficher :

```
[startup] Routes éditeur clips actives {"clips":"/clips","savedClips":"/saved-clips",...}
[paths] Chemins résolus {"frontDistDir":"/home/.../qg-10banc/front/dist","frontIndexExists":true}
[static] Frontend servi depuis /home/.../qg-10banc/front/dist
```

Si tu vois `back/front/dist` → le backend n'a **pas** été recompilé (`pnpm build:back`).

**Important :** le front et le back doivent être rebuild **ensemble**. Si seul le front est à jour, l'import de clips peut appeler `/clips/import-jobs/undefined` (backend obsolète).

Après déploiement, vérifier dans `pm2 logs` :
- `[clips:import] Upload démarré {"jobId":"..."}` à l'import d'un fichier
- Pas d'erreur `IMPORT_JOB_NOT_FOUND`
- Pas de `[cors] Origin refusée: http://10banc.com` (http + https sont tous deux autorisés)

En prod, le backend sert le front (`front/dist`) et l'API sur le port `4000`.

Vérifier : `GET /health` et les logs de démarrage (`ffmpeg` OK, purge clips).

## Reverse proxy

- Pointer vers le port 4000 (Cloudflared, nginx, etc.)
- Limite upload **≥ 1 Go** pour les clips sources
- `trust proxy` est déjà activé sur Express

## Fichiers ignorés par git

Ne **jamais** committer :
- `back/clips/` (sources, previews, exports)
- `back/dist/`, `front/dist/`
- `.env`

## Maintenance automatique

Au démarrage et **toutes les 24 h** :
- Purge des clips enregistrés expirés (> 30 jours, basé sur `createdAt`)
- Suppression des artefacts temporaires (`temp_*`, `render_*`) de plus de 24 h

## Polices sous-titres personnalisées

Voir [`assets/subtitle-fonts/README.md`](../assets/subtitle-fonts/README.md).

Résumé : déposer le fichier `.woff2` + entrée dans `manifest.json`, puis `pnpm build`.

## Points d'attention

| Sujet | Détail |
|-------|--------|
| Médias clips | `/clips/previews`, `/sources`, `/exports` sont publics (UUID) — pas de token |
| Auto-save | Intervalle 1 s par éditeur ouvert — acceptable en usage interne |
| Preview vs export | Polices embarquées `@fontsource` (plus de dépendance Google Fonts CDN) |
| Migrations | Appliquer avant prod si `SavedClip` / `ClipTemplate` pas encore en DB |

## Scripts utiles

```bash
pnpm typecheck      # vérif TypeScript back + front
pnpm build:back
pnpm build:front
pnpm db:generate    # après changement schema Prisma
```
