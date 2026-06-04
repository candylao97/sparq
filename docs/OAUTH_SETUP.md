# Social sign-in setup (Google & Apple)

The "Continue with Apple / Google" buttons on `/login` and `/signup` are fully
wired into NextAuth. They activate automatically once the matching credentials
are present in the environment — no code changes needed. Until then, clicking a
button shows a "coming soon" message instead of erroring.

## How it works in the code

- `src/lib/auth.ts` registers the Google and Apple providers **only when their
  env vars are set** (so the app builds/runs without them).
- `src/components/auth/social-auth.tsx` reads `/api/auth/providers` to learn
  which providers are live, and calls `signIn(provider)` for those.
- The OAuth callback route already exists at `src/app/api/auth/[...nextauth]`.
- New social users are created with `role: CUSTOMER` (the Prisma default) and
  linked to an existing account with the same email
  (`allowDangerousEmailAccountLinking: true`).

## Redirect / callback URLs to register

Use these exact URLs in each provider's console. The base is your `AUTH_URL`.

| Provider | Redirect URI (development) | Redirect URI (production) |
|----------|----------------------------|----------------------------|
| Google   | `http://localhost:3000/api/auth/callback/google` | `https://YOUR_DOMAIN/api/auth/callback/google` |
| Apple    | `http://localhost:3000/api/auth/callback/apple`  | `https://YOUR_DOMAIN/api/auth/callback/apple`  |

> Apple does not allow `http://localhost` or bare IPs as a Return URL. For local
> testing use an HTTPS tunnel (e.g. ngrok/cloudflared) and register that HTTPS
> URL, or test Apple only against the deployed HTTPS domain.

## Environment variables

Add to `.env` (already templated in `.env.example`):

```bash
AUTH_GOOGLE_ID=""        # Google OAuth client ID
AUTH_GOOGLE_SECRET=""    # Google OAuth client secret
AUTH_APPLE_ID=""         # Apple Services ID (e.g. com.sparq.web)
AUTH_APPLE_SECRET=""     # Apple client secret (a signed JWT — see below)
```

Restart the dev server after setting them. The buttons go live immediately.

---

## Google — step by step

1. Go to **Google Cloud Console → APIs & Services → Credentials**.
2. Configure the **OAuth consent screen** (External), add your support email
   and the `email`, `profile`, `openid` scopes.
3. **Create credentials → OAuth client ID → Web application**.
4. Under **Authorized redirect URIs**, add the Google URL(s) from the table
   above (dev and/or production).
5. Copy the **Client ID** → `AUTH_GOOGLE_ID` and **Client secret** →
   `AUTH_GOOGLE_SECRET`.

That's it — Google sign-in works after a server restart.

---

## Apple — step by step

Apple is more involved because the "client secret" is a short-lived JWT you
sign yourself.

1. In the **Apple Developer** portal you need:
   - An **App ID** with **Sign in with Apple** enabled.
   - A **Services ID** (this is your `AUTH_APPLE_ID`, e.g. `com.sparq.web`).
     Configure its **Return URLs** with the Apple callback URL from the table.
   - A **Sign in with Apple key** (`.p8`) — note the **Key ID** and your
     **Team ID**.
2. Generate the client secret JWT (valid up to 6 months) from the `.p8` key,
   Key ID, Team ID, and Services ID. You can use the `@auth/core` helper:

   ```bash
   npx auth add apple   # interactive, or use the snippet below
   ```

   Or generate it in a one-off script:

   ```ts
   import { SignJWT, importPKCS8 } from "jose";

   const key = await importPKCS8(process.env.APPLE_P8!, "ES256");
   const secret = await new SignJWT({})
     .setProtectedHeader({ alg: "ES256", kid: process.env.APPLE_KEY_ID })
     .setIssuer(process.env.APPLE_TEAM_ID!)
     .setSubject(process.env.AUTH_APPLE_ID!) // the Services ID
     .setAudience("https://appleid.apple.com")
     .setIssuedAt()
     .setExpirationTime("180d")
     .sign(key);
   console.log(secret);
   ```

3. Put the Services ID in `AUTH_APPLE_ID` and the generated JWT in
   `AUTH_APPLE_SECRET`. Re-generate the JWT before it expires (≤ 6 months).

---

## Verifying

After setting the env vars and restarting:

```bash
curl http://localhost:3000/api/auth/providers
```

You should see `google` and/or `apple` listed alongside `credentials`. The
buttons on `/login` and `/signup` then start a real OAuth flow.
