# Known Issues & Fixes

Bugs rencontrés lors du bootstrap d'un projet basé sur ce template — et leur remédiation. Mis à jour au fil de l'eau.

Le script `scripts/albo-create.sh` applique tous les fixes ci-dessous automatiquement. Cette doc sert quand quelqu'un débugue manuellement OU quand un nouveau bug apparaît avec une cause similaire.

---

## #1 — `BETTER_AUTH_URL environment variable is required`

**Découvert** : 2026-05-06
**Symptôme** : crash runtime au premier signup avec
```
[CONVEX H(POST /api/auth/sign-up/email)] [ERROR]
Error: BETTER_AUTH_URL environment variable is required for Better Auth configuration.
```

**Root cause** : le script `setup:dev` (upstream) génère `BETTER_AUTH_SECRET` et `AUTH_PROXY_SHARED_SECRET` mais oublie de pousser `BETTER_AUTH_URL` sur Convex. Better Auth ne crashe qu'au runtime, sur la première requête auth.

**Fix appliqué dans le fork** : `scripts/albo-fix-env.sh` set `BETTER_AUTH_URL=$SITE_URL` (généralement `http://localhost:3000`) sur Convex et dans `.env.local`. Appelé automatiquement depuis `albo-create.sh` étape 6.

**Manual fix** :
```bash
pnpm exec convex env set BETTER_AUTH_URL "http://localhost:3000"
```

---

## #2 — `mode` validator extra field (rate limiter)

**Découvert** : 2026-05-06
**Symptôme** :
```
[CONVEX Q(adapter:findMany)] ArgumentValidationError:
Object contains extra field `mode` that is not in the validator.
Path: .where[0]
```

**Root cause** : `better-auth@1.6.8` envoie un champ `mode: "sensitive"` dans les queries du rate-limiter. `@convex-dev/better-auth@0.11.5` n'a pas ce champ dans son validator. Les queries auth fail dès qu'on cible une route rate-limitée (la plupart).

**Fix appliqué dans le fork** : `package.json` pin `@convex-dev/better-auth: "^0.12.2"` (la 0.12.x ajoute `mode: v.optional(v.union(v.literal("sensitive"), v.literal("insensitive")))` au validator).

**Manual fix** : `pnpm add @convex-dev/better-auth@^0.12.2`

---

## #3 — JWKS chicken-and-egg au bootstrap

**Découvert** : 2026-05-06
**Symptôme** :
```
✖ Environment variable JWKS is used in auth config file but its value was not set.
```
suivi de
```
✖ Failed to run function "auth:getLatestJwks": No functions found.
Did you forget to run `npx convex dev`?
```

**Root cause** :
- Convex refuse de pusher les fonctions tant que la variable d'env `JWKS` n'est pas set
- `convex:jwks:sync` a besoin de la fonction `auth:getLatestJwks` qui n'existe sur le déploiement qu'après le push

→ Boucle bloquante : tu peux pas pusher sans JWKS, tu peux pas générer JWKS sans push.

**Fix appliqué dans le fork** : `scripts/albo-fix-env.sh` set un placeholder valide `JWKS={"keys":[]}` AVANT le premier `convex dev --once`. Ça débloque le push. Puis `convex:jwks:sync` (ou son workaround, voir #4) écrase avec la vraie clé.

**Manual fix** :
```bash
pnpm exec convex env set JWKS '{"keys":[]}'
pnpm exec convex dev --once
pnpm convex:jwks:sync   # ou voir #4 si ça échoue
```

---

## #4 — `convex:jwks:sync` échoue sur le warning Better Auth dans stdout

**Découvert** : 2026-05-06
**Symptôme** :
```
❌ JWKS sync failed: Error: Better Auth JWKS output is not valid JSON.
```

**Root cause** : Le script `scripts/lib/deploy-env-helpers.ts` (`parseConvexRunStdout`) lit le stdout de `convex run auth:getLatestJwks`. Better Auth émet un warning `[better-auth] Base URL could not be determined` qui pollue stdout/stderr et fait foirer le JSON.parse.

**Fix appliqué dans le fork** : `albo-create.sh` étape 8 fallback automatique :
```bash
JWKS_RAW=$(pnpm exec convex run auth:getLatestJwks 2>/dev/null)
JWKS_VALUE=$(node -e "process.stdout.write(JSON.parse(process.argv[1]))" "$JWKS_RAW")
pnpm exec convex env set JWKS "$JWKS_VALUE"
```

(Note : si `BETTER_AUTH_URL` est déjà set — fix #1 — le warning Better Auth disparaît et le sync upstream marche normalement. À vérifier dans une future itération.)

---

## #5 — Resend test mode

**Découvert** : 2026-05-06
**Symptôme** :
```
You can only send testing emails to your own email address (xxx@xxx.com).
To send emails to other recipients, please verify a domain at resend.com/domains
```

**Root cause** : par défaut Resend en mode test (clé API `re_xxx` sans domaine vérifié) n'envoie qu'à l'adresse du compte. C'est leur protection anti-spam.

**Fix appliqué dans le fork** : pas de fix automatique — c'est un comportement légitime de Resend. Mais le script propose `RESEND_EMAIL_SENDER=onboarding@resend.dev` en mode "test" (domaine vérifié de Resend, fonctionne pour quiconque). En mode "albo", utilise `noreply@alboteam.com` (suppose DNS vérifié pour l'org Albo).

**Pour vérifier ton propre domaine** : https://resend.com/domains → ajouter ton domaine → set les records DNS demandés (TXT + MX + DKIM) → attendre la propagation (~10 min).

---

## #6 — `setup:env` n'append pas les secrets si `.env.local` existe

**Découvert** : 2026-05-08 (real-world bootstrap)
**Symptôme** : `setup:env` imprime des secrets à stdout, n'append pas à `.env.local`. La suite du bootstrap pète sur `BETTER_AUTH_SECRET environment variable is required`.

**Root cause** : `pnpm setup:env` (upstream) refuse d'écraser un `.env.local` existant — il imprime juste les secrets générés en console et te laisse les coller à la main.

**Fix appliqué dans le fork** : `albo-create.sh` étape 5 capture stdout, grep les `BETTER_AUTH_SECRETS=` / `BETTER_AUTH_SECRET=` / `AUTH_PROXY_SHARED_SECRET=`, et les append automatiquement à `.env.local`.

---

## #7 — Better Auth secrets pas mirrored vers Convex

**Découvert** : 2026-05-08
**Symptôme** : `auth:getLatestJwks` plante au runtime avec `BETTER_AUTH_SECRET environment variable is required`.

**Root cause** : Les secrets sont dans `.env.local` (utilisés par le client Better Auth côté Vite SSR) mais PAS sur le déploiement Convex (où tournent les actions auth). Upstream `setup:env` n'envoie rien à Convex.

**Fix appliqué dans le fork** : `albo-fix-env.sh` étape 3 lit `BETTER_AUTH_SECRET` / `BETTER_AUTH_SECRETS` / `AUTH_PROXY_SHARED_SECRET` depuis `.env.local` et les push sur Convex via `convex env set`.

**Manual fix** :
```bash
pnpm exec convex env set BETTER_AUTH_SECRET "$(grep '^BETTER_AUTH_SECRET=' .env.local | cut -d= -f2-)"
# idem pour BETTER_AUTH_SECRETS et AUTH_PROXY_SHARED_SECRET
```

---

## #8 — Convex team slug ≠ GitHub username

**Découvert** : 2026-05-08
**Symptôme** :
```
✖ Error: Team benbou not found, fix the --team option or remove it
```

**Root cause** : Le team slug Convex est indépendant du GitHub username. Benjamin a `gh login = Benbou` mais son team Convex est `bouquetbenjamin`. La première version d'`albo-create.sh` utilisait `gh login` comme heuristique → fail pour la plupart des users.

**Fix appliqué dans le fork** : `albo-create.sh` ne passe plus `--team` par défaut. Convex CLI utilise alors le team par défaut de l'access token (marche pour 95% des users qui n'ont qu'un team).

**Override** : si tu as plusieurs teams Convex et veux en forcer une :
```bash
CONVEX_TEAM=bouquetbenjamin bash scripts/albo-create.sh mon-projet
```

Trouve ton slug à `https://dashboard.convex.dev` — c'est dans l'URL `/t/<slug>`.

---

## #9 — Convex CLI hangs silently when stdout is captured

**Découvert** : 2026-05-08 (real-world bootstrap, sur test-4)
**Symptôme** : `pnpm exec convex dev --configure new` reste bloqué pendant 15+ min, aucun prompt visible, aucune erreur. Le script n'avance pas au-delà de l'étape 4.

**Root cause** : `convex` CLI utilise une TUI Ink (React-based). Quand stdout est piped (`$(...)`, `| tail`, etc.), Ink détecte qu'il n'est plus dans un TTY et **désactive tous les prompts interactifs** silencieusement. Si Convex a besoin de quoi que ce soit (sélection team par exemple), il attend un input qui n'arrivera jamais.

**Fix appliqué dans le fork** : `albo-create.sh` n'utilise plus `$(...)` pour capturer la sortie de `convex dev`. À la place, `tee /tmp/albo-create-convex-$$.log` stream en live + log pour analyse post-hoc. Les prompts deviennent visibles et répondables.

**Pattern général à retenir** : tout outil CLI moderne (Convex, gh, npm, prisma, etc.) qui utilise une TUI doit être appelé en streaming, pas capturé. Si tu as besoin du contenu, redirige vers un fichier (`tee`), ne capture pas avec `$()`.

---

## #10 — CSS `@import` not first when `albo-brand.css` is itself `@imported`

**Découvert** : 2026-05-08 (test-5)
**Symptôme** :
```
[vite:css][postcss] @import must precede all other statements
@import url('https://fonts.googleapis.com/css2?family=Inter...');
```

**Root cause** : CSS spec demande que les `@import` soient en **première position** du fichier final. Quand `app.css` fait `@import 'tailwindcss'` puis `@import './albo-brand.css'`, et que `albo-brand.css` commence par `@import url(...)` Google Fonts, ces imports se retrouvent en milieu du fichier concaténé → violation spec.

**Fix appliqué** : retiré les `@import url(...)` Google Fonts de `albo-brand.css`. À la place, ajoutés comme `<link rel="stylesheet">` dans `src/routes/__root.tsx`. Bonus : `<link>` permet le `preconnect` parallèle, meilleur pour la perf.

**Pattern général** : ne jamais `@import` une URL externe depuis un fichier CSS qui peut être lui-même imported. Toujours via `<link>` dans le HTML.

---

## #11 — Upstream "regulated baseline" force MFA + email verification au signup

**Découvert** : 2026-05-08
**Symptôme** : à la création du compte, le user est forcé sur la page "Account setup" qui demande MFA + verification email même si on veut juste tester avec email/password.

**Root cause** : `dyeoman2/tanstack-start-template` cible des workloads HIPAA/SOC2/NIST. Son `src/lib/shared/security-baseline.ts` exporte `ALWAYS_ON_REGULATED_BASELINE` avec `requireMfaOrPasskey: true`, `requireVerifiedEmail: true`, `auditExportRequiresStepUp: true`. Ces flags sont câblés dans toute la stack auth.

**Fix appliqué dans le fork** : Albo override dans `security-baseline.ts` :
```ts
export const ALWAYS_ON_REGULATED_BASELINE = {
  auditExportRequiresStepUp: false,
  requireVerifiedEmail: false,
  requireMfaOrPasskey: false,
  allowBreakGlassPasswordLogin: true,  // password sign-in ON
  webSearchAllowed: false,
  aiChatEnabled: true,
} as const;
```

**Pour un projet client compliance-heavy** (healthcare, finance régulée) : flip ces flags à `true` au début du projet. Documenté dans `ALBO.md`.

---

## #12 — Node engine warning ≥24

**Découvert** : 2026-05-06 (cosmétique)
**Symptôme** :
```
WARN  Unsupported engine: wanted: {"node":">=24"} (current: {"node":"v22.19.0",...})
```

**Root cause** : `package.json` upstream demande Node ≥24 dans `engines` mais tout fonctionne sur Node 22.19+.

**Fix** : ignorer le warning. Si tu veux le silencer, bump Node : `nvm install 24 && nvm use 24`.

---

## #13 — Convex CLI prompts forcent une interaction au bootstrap

**Découvert** : 2026-05-08
**Symptôme** : `convex dev --once --configure new` affiche 2 prompts interactifs même quand on veut un bootstrap 100% automatisé :

1. `Where should this dev deployment run?` (region selector — US/Europe/etc.)
2. `Set up Convex AI files? (guidelines, AGENTS.md, agent skills) [Y/n]`

Et en plus, si on a un autre `pnpm dev` qui tourne dans un autre terminal sur port 3000, son `concurrently` peut crasher avec `[convex] pnpm exec convex dev exited with code SIGTERM` au moment où le nouveau bootstrap essaye de toucher la config Convex partagée.

**Root cause** :
- Convex CLI v1.36+ utilise `process.stdin.isTTY` pour décider d'afficher les prompts. Quand stdin est un vrai TTY → prompts. Quand stdin est `/dev/null` → skip.
- Pour la région : si stdin pas TTY ET `team.defaultRegion` non set → fallback serveur (US). Si team.defaultRegion set → utilisé silencieusement.
- Pour les AI files : si stdin pas TTY → skip total (pas de fichiers générés). On doit donc les installer explicitement après.
- Pour le SIGTERM : un `pnpm dev` orphelin tient le port 3000 et fait crasher le nouveau bootstrap. Hard à diagnostiquer parce que le message est cryptique.

**Fix appliqué dans le fork** (`scripts/albo-create.sh`) :
1. Étape 1 (preflight) : `lsof -ti :3000` détecte un dev server orphelin, abort proprement avec instruction `kill <PID>`.
2. Étape 4 : `convex dev --once … </dev/null` redirige stdin → CLI voit pas de TTY → 0 prompt.
3. Étape 4b (nouveau) : `convex ai-files install` installe les AI files non-interactivement après coup.
4. Détection région : `grep "configure a default region" "$CONVEX_LOG"` → si trouvé, le team n'a pas de défaut, on log une URL pour la setter une fois.

**Manual fix** :
```bash
pnpm exec convex dev --once --configure new --project my-app --dev-deployment cloud </dev/null
pnpm exec convex ai-files install
# Puis : aller sur https://dashboard.convex.dev/t/<team>/settings et set "Default region" = Europe
```

**Pourquoi pas un flag CLI** : Convex 1.38 n'a pas de flag `--region` sur `convex dev`, ni de flag `--no-ai-files` ou `--yes`. L'astuce stdin est la voie officielle pour bypass les prompts (comme tous les CLI Ink-based : git, gh, etc. utilisent le même pattern).

---

## #14 — 2FA forcée au signup malgré le baseline relaxé

**Découvert** : 2026-05-09
**Symptôme** : signup email + password fonctionne, l'email de vérification arrive bien (Resend OK), mais après avoir cliqué sur le lien de vérif :
- soit la page `/account-setup` reste bloquée sur "set up MFA" sans laisser entrer
- soit redirect direct sur `/two-factor` ("Please enter your one-time password")

…alors que le user n'a setupé **aucun TOTP, aucune passkey**. Impossible d'entrer dans `/app`.

**Root cause** : Le précédent fix #11 a flippé `ALWAYS_ON_REGULATED_BASELINE.requireMfaOrPasskey: false`, mais ce flag n'était utilisé que pour la posture compliance + la création d'organizations. Cinq endroits du code hardcodaient encore `mfaRequired: true` ou `requiresMfaSetup: !mfaEnabled` sans regarder le baseline :

| # | Fichier | Ligne | Effet |
|---|---------|-------|-------|
| 1 | `src/lib/shared/auth-policy.ts` | 287 | `requiresMfaSetup` toujours `true` pour les nouveaux users |
| 2 | `convex/users.ts` | 1192 | `mfaRequired: true` hardcodé (fallback) |
| 3 | `convex/auth/access.ts` | 1258 | `mfaRequired: true` hardcodé (happy path) |
| 4 | `convex/auth/access.ts` | 384-397 | `getMfaRequirementReason` → toutes les Convex queries throw `MFA_REQUIRED` |
| 5 | `convex/auth/access.ts` | 962 | `mfaSatisfied` → `requireOrganizationPermission` block tout |

**Fix appliqué dans le fork** : tout rebrancher sur `ALWAYS_ON_REGULATED_BASELINE.requireMfaOrPasskey`. Quand le flag est `false`, 0 enforcement MFA côté client ET serveur. Quand `true` (client healthcare/HIPAA), comportement upstream restauré sans modif supplémentaire.

**Manual fix** : éditer les 5 endroits ci-dessus pour gate sur le baseline. Voir le commit qui ferme cette issue (l'edit pattern est trivial : remplacer `true` par `ALWAYS_ON_REGULATED_BASELINE.requireMfaOrPasskey` et ajouter une short-circuit `if (!ALWAYS_ON_REGULATED_BASELINE.requireMfaOrPasskey) return null` dans `getMfaRequirementReason`).

**Pour un projet client compliance-heavy** (healthcare, finance régulée) : flip `requireMfaOrPasskey: true` dans `src/lib/shared/security-baseline.ts` au début du projet. Tout le enforcement upstream se réactive automatiquement.

---

## Comment ajouter une nouvelle entrée

Quand tu rencontres un bug pendant un bootstrap d'un projet client :

1. Note le symptôme exact (copier-coller du terminal)
2. Identifie la root cause (lib en cause, pourquoi ça plante)
3. Trouve le fix (manuel d'abord)
4. Si le fix est mécanisable → ajoute-le à `scripts/albo-create.sh` ou `albo-fix-env.sh`
5. Documente ici en suivant le template ci-dessus
6. Commit avec message `docs: KNOWN_ISSUES.md #N — <symptôme court>`

Ce fichier est le **mémoire collective** d'Albo Studio sur les pièges du template. Quand le prochain projet client tombe sur un bug connu, il a juste à grep ici.
