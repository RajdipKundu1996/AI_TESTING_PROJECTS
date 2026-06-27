# eMudhra Testplan Orchestrator (APP)

This folder contains the frontend and a small CORS relay used by the eMudhra QA-Gen AI project.

Quick run
---------
1. Install dependencies:

```powershell
cd APP
npm install
```

Copy `.env.example` to `.env` and add the API keys for the providers you use. Never commit `.env`.

2. Start the app (launches the CORS relay on port 11435 and a static web server on port 3000):

```powershell
node start.js
```

3. Open the UI in your browser:

- http://127.0.0.1:3000

Mistral API key
---------------
- The project supports verifying a Mistral API key via the relay endpoint `http://127.0.0.1:11435/mistral_test`.
- You can provide the key either:
  - Server-side: put it in `APP/.env` as `MISTRAL_API_KEY` (already created for you), or
  - Client-side: open the login page and click the ⚙ settings button to provide and save the API key locally.

What I added
------------
- `APP/.env` — contains `MISTRAL_API_KEY` and `MISTRAL_BASE_URL` (local dev convenience).
- `APP/ollama_relay.js` — extended to expose `/mistral_test` which validates the API key and returns the models list.
- `APP/js/mistral_settings.js` — frontend settings UI to save/test keys and auto-detect a model.
- `APP/index.html` — added a floating settings button + modal to input/test the Mistral key.
- `APP/css/login.css` — appended styles for the settings modal and animations.
- `APP/package.json` — added `dotenv` dependency so `ollama_relay.js` can read `.env`.
 - `APP/pages/settings.html` — dedicated settings page for advanced configuration.
 - `APP/js/settings.js` — logic for the dedicated settings page (test key, populate models, save selection).

Notes
-----
- I tested the provided API key by invoking the relay endpoint. The relay responded with HTTP 401 Unauthorized (Mistral rejected the key).
- If you want me to remove the key from `APP/.env` for security, I can do that and rely only on localStorage or an OS environment variable.

Next steps
----------
- Open the web UI at `http://127.0.0.1:3000`, click the ⚙ settings button, paste your Mistral key, and click `Test Key` to validate from the browser.
- If you want a different model endpoint or different provider, I can add a dropdown and richer validation.
 - You can also open the dedicated settings page: http://127.0.0.1:3000/pages/settings.html

Service worker & cache
----------------------
- A service worker (`/sw.js`) now precaches core static assets for faster loads and offline use.
- Use the "Clear Cache" button on the Settings page to remove cached files if you want a hard reload.
- The service worker removes older cache versions automatically on activation.

Render deployment
-----------------
- The repository-level `render.yaml` configures the `nirikshanai` Node web service.
- `npm start` launches the cloud-compatible server on `process.env.PORT` and binds to `0.0.0.0`.
- The public server exposes `/health`, serves the frontend, and routes `/api`, `/relay`, and `/recorder` to the internal services.
- Use `npm run start:local` to launch the original local multi-process script.
- Configure provider credentials such as `GROQ_API_KEY` in Render environment variables; never commit `.env`.
