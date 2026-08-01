# AI Voice LINE Announcer — Project Status

Updated: 2026-08-01 (Asia/Bangkok)

## Executive Summary

The production infrastructure is deployed and responding successfully. Cloud Run, Firestore, Firebase Storage, Secret Manager, Firebase Hosting, and Hosting-to-Cloud-Run rewrites are active. The remaining blocking issue is the frontend white-screen symptom on the deployed admin web app. A corrective patch has been prepared to remove legacy Service Worker caches and surface startup/render errors instead of showing an empty page.

## Production URLs

- Frontend: https://ai-voice-line-announcer.web.app
- Cloud Run backend: https://ai-voice-line-announcer-rebaejqh7q-as.a.run.app
- LINE webhook: https://ai-voice-line-announcer-rebaejqh7q-as.a.run.app/api/line/webhook
- Health check: https://ai-voice-line-announcer.web.app/health
- Readiness check: https://ai-voice-line-announcer.web.app/ready

## Completed

- Google Cloud project configured: `ai-voice-line-announcer`
- Cloud Run service deployed in `asia-southeast1`
- Secret Manager secrets created:
  - `GEMINI_API_KEY`
  - `LINE_CHANNEL_ACCESS_TOKEN`
  - `LINE_CHANNEL_SECRET`
- Firestore `(default)` database created and reachable
- Firebase Storage bucket configured: `ai-voice-line-announcer.firebasestorage.app`
- Firebase Authentication client configuration included
- Firebase Hosting deployed
- Firebase Hosting rewrites configured for:
  - `/api/**`
  - `/health`
  - `/healthz`
  - `/ready`
- Backend health check passed:
  - `ok: true`
  - Firestore enabled
  - Storage enabled
- Backend readiness check passed:
  - `ready: true`
  - no missing dependencies
  - no dependency errors
- GitHub validation workflow added for install, lint, and build

## Current Blocking Issue

### Frontend white screen

Observed behavior:

- Hosting serves `index.html` and generated JavaScript/CSS assets.
- Backend and Hosting rewrites work correctly.
- The browser still displays a blank white page.

Most likely causes addressed by the current patch:

1. An old Service Worker cache named `ai-voice-studio-v1` continues serving an obsolete application shell.
2. A JavaScript startup or React render exception occurs before visible UI is mounted.
3. Previous markup had no permanent boot fallback, so startup failures appeared as an empty page.

Corrective actions in the current patch:

- Stop registering the legacy Service Worker.
- Unregister all existing Service Workers for the app origin.
- Delete legacy browser Cache Storage entries.
- Add a visible dark boot screen before React loads.
- Add global startup error and unhandled rejection output.
- Add a React Error Boundary with a visible diagnostic screen.
- Add bootstrap-level try/catch handling in `src/main.tsx`.

## Pending Deployment Step

After this patch reaches `main`, run:

```bash
cd ~/ai-voice-line-announcer
git pull origin main
npm install
npm run lint
npm run build
firebase deploy --only hosting
```

Then open:

```text
https://ai-voice-line-announcer.web.app/?release=20260801-2
```

Expected result:

- The admin login screen appears, or
- A visible diagnostic error message appears instead of a blank page.

## LINE Integration Status

Infrastructure is ready for webhook testing.

Webhook URL:

```text
https://ai-voice-line-announcer-rebaejqh7q-as.a.run.app/api/line/webhook
```

Pending user-side verification:

- Save Webhook URL in LINE Developers
- Press Verify
- Enable Use webhook
- Test direct message
- Test group message
- Confirm generated voice reply and Firestore history

## Known Non-Blocking Warnings

- `npm install` reports 11 dependency vulnerabilities.
- Vite reports a JavaScript bundle larger than 500 kB.
- Some package install scripts are blocked by the current npm security configuration.

These warnings did not prevent the production build or Hosting deployment. They should be reviewed in a later maintenance phase after the white-screen blocker is resolved.

## Recommended Next Milestones

1. Deploy and verify the white-screen fix.
2. Complete LINE Developers webhook verification.
3. Test end-to-end voice generation from the admin web app.
4. Test LINE direct and group message flows.
5. Add automated production deployment from GitHub Actions.
6. Add frontend monitoring and structured backend error logging.
