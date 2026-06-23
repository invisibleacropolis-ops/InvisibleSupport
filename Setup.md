# Supabase Setup

Use this checklist to connect Invisible Support Portal to Supabase durable storage.

## 1. Create Supabase Resources

1. Open your Supabase project.
2. Go to **SQL Editor**.
3. Run `supabase/schema.sql` from this repository.
4. Confirm that:
   - bucket `invisible-support-assets` exists and is private
   - table `public.assets` exists
   - RLS is enabled on `public.assets` and `storage.objects`

## 2. Configure Auth URLs

In **Authentication → URL Configuration**:

- Site URL: `https://invisibleacropolis-ops.github.io/InvisibleSupport/`
- Redirect URLs:
  - `https://invisibleacropolis-ops.github.io/InvisibleSupport/`
  - `http://localhost:8080/**`

## 3. Configure the Static Site

Edit `src/shared/config/supabase.js`:

```js
export const SUPABASE_CONFIG = {
    projectUrl: 'https://<project-ref>.supabase.co',
    publishableKey: '<publishable-key>',
    bucket: 'invisible-support-assets',
    assetsTable: 'assets',
    storageLimitMb: 200,
    signedUrlExpiresInSeconds: 60 * 60,
};
```

Use the project URL and publishable key from **Project Settings → API**.

Do not put the service role key in this file.

## 4. Sign In and Test

1. Open the portal.
2. In **Supabase storage**, enter your email and click **Send magic link**.
3. Open the email link.
4. Click **Test connection**.
5. Upload a small file and confirm it appears in the asset library.

## 5. Migrate Existing Repo Assets

Run a dry run first:

```powershell
$env:SUPABASE_URL = "https://<project-ref>.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "<service-role-key>"
$env:SUPABASE_MIGRATION_USER_ID = "<auth-user-uuid>"

npm run supabase:migrate -- -DryRun
```

Then run the real migration:

```powershell
npm run supabase:migrate
```

The service role key is used only by the local migration script. Never commit it.
