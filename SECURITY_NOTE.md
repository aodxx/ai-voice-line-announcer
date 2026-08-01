# Security note

Firebase web configuration must be supplied at build time through local or CI environment variables. Do not commit live API keys, LINE credentials, Gemini keys, service-role keys, or other secrets to this repository.

Required frontend variables:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`

Production backend secrets must remain in Google Secret Manager.
