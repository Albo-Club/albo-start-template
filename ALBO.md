# Albo Start Template

Fork de [`dyeoman2/tanstack-start-template`](https://github.com/dyeoman2/tanstack-start-template) avec :

- Bugs upstream pré-fixés (cf. [`KNOWN_ISSUES.md`](./KNOWN_ISSUES.md))
- Charte graphique Albo (couleurs, fonts Leitura News + Inter, radius 9px)
- Script one-shot `albo-create.sh` qui transforme `git clone → localhost prêt` en < 5 min
- Mode **dual** : config par défaut "test" pour quiconque clone hors-Albo, override automatique en mode "Albo" si tu es loggé dans l'org `Albo-Club` GitHub

## Démarrage rapide (60 secondes de lecture)

### Pour Albo Studio (Benjamin / Maël / Clément)

```bash
gh auth login                                                   # une fois sur la machine
gh repo clone Albo-Club/albo-start-template ~/Documents/Albo/mon-projet
cd ~/Documents/Albo/mon-projet
bash scripts/albo-create.sh mon-projet
# → en < 5 min : repo créé, Convex provisionné, localhost:3000 ouvert avec landing brandée Albo
```

Ou en une ligne (mode `curl-pipe-bash`) :

```bash
curl -sSL https://raw.githubusercontent.com/Albo-Club/albo-start-template/main/scripts/albo-create.sh | bash -s -- mon-projet
```

### Pour quelqu'un hors-Albo qui veut tester ce template

Pareil, mais le script détecte que tu n'es pas dans l'org `Albo-Club` et bascule en mode "test" :
- Repo créé sous ton compte GitHub perso (pas Albo-Club)
- Email sender = `onboarding@resend.dev` (domaine vérifié Resend, marche avec n'importe quelle clé Resend)
- Pas de charte Albo appliquée si tu surcharges `src/styles/albo-brand.css`

## Stack incluse

- **TanStack Start** (Vite + React 19, SSR, file-based routing)
- **Convex** (DB + real-time + functions)
- **Better Auth** via `@convex-dev/better-auth` (magic link + password + passkey + Google OAuth)
- **shadcn/ui** + Tailwind v4 (charte graphique Albo override-able)
- **`@convex-dev/agent`** (AI agent natif Convex avec memory + threads + persistance)
- **Resend** via `@convex-dev/resend` (emails transactionnels)
- **Rate limiter** via `@convex-dev/rate-limiter`
- Compliance NIST/HIPAA/SOC2 audit ledger built-in (upstream — ignorable si pas pertinent)

**Mastra** est volontairement **pas inclus** par défaut. Il est "in stock" — à ajouter dans un projet précis si le brief justifie des workflows durables multi-étapes :

```bash
pnpm add @mastra/core @get-convex/mastra
```

Pour 80% des projets, `@convex-dev/agent` du template suffit (chat avec mémoire, persistance, real-time).

## Charte graphique

Définie dans [`src/styles/albo-brand.css`](./src/styles/albo-brand.css). Override les CSS variables shadcn :

| Token | Hex | Usage |
|---|---|---|
| `--primary` | `#CD4D28` | Orange Albo, CTA principal |
| `--background` | `#F4F3EF` | Neutral background |
| `--foreground` | `#000000` | Texte principal |
| `--accent` | `#FBE055` | Jaune (highlights) |
| `--secondary` | `#D2D0F4` | Lavande (badges) |
| `--success` | `#84CD96` | Vert (états positifs) |
| `--radius` | `9px` | Tous les rounded |

**Typo** : `Leitura News Roman/Italic` (display) + `Inter` (body). Classes utilitaires `.albo-h1`, `.albo-h2`, `.albo-h3`, `.albo-title`, `.albo-subtitle`, `.albo-link`, `.albo-paragraph`.

⚠️ **Leitura News** est une font commerciale (license web Albo). Les fichiers `.woff2` sont à placer dans `public/fonts/leitura/`. En attendant, fallback Playfair Display (Google Fonts).

Pour un projet client non-Albo qui veut sa propre charte : surcharge `albo-brand.css` ou crée son `client-brand.css` importé après.

## Suivi upstream

```bash
# Voir le delta vs notre baseline
git fetch upstream main
git log --oneline HEAD..upstream/main

# Sync (trimestriel ou ad-hoc)
git merge upstream/main
# Résoudre conflits si nos fixes touchent les mêmes fichiers, tester pnpm dev,
# commit le merge, push.
```

## Non-négociables Albo

1. **Toujours utiliser `albo-create.sh`** pour bootstrap un nouveau projet. Pas de `pnpm setup:dev` direct (incomplet — voir KNOWN_ISSUES #1).
2. **Quand tu rencontres un bug**, ajoute-le dans [`KNOWN_ISSUES.md`](./KNOWN_ISSUES.md) avec son fix. Patche `albo-fix-env.sh` ou `albo-create.sh` si mécanisable.
3. **Ne modifie pas les fichiers upstream** sauf si nécessaire. Tout custom Albo va dans des nouveaux fichiers (`src/styles/albo-brand.css`, `scripts/albo-*.sh`, etc.) pour que `git fetch upstream` reste propre.
4. **`AGENTS.md` et `CLAUDE.md` symlink** : c'est le guide upstream. Ne pas modifier — Convex et le template les écrasent à chaque `convex dev` quand tu réponds Y au prompt "Set up Convex AI files?".
5. **Tester en mode test (hors `Albo-Club` org)** avant chaque release du fork — vérifier que quelqu'un d'extérieur peut bootstrap.
