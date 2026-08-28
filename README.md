# Morning Brief

A nonintrusive calendar companion that connects to Google Calendar and gives you a
quiet, side-panel rundown of what actually needs your attention today — split into
**Urgent** and **Important**, Eisenhower-matrix style.

Built for JH '26 SFU Sidequests.

## How it works

- **Compatible with Google Calendar** — sign in with Google (read-only access) and it
  pulls today's events across all of your calendars.
- **Nonintrusive** — instead of a blocking popup, tasks live in a slim tab docked to
  the right edge of the screen. It auto-opens once each morning (first visit of the
  day), then collapses to a small badge you can reopen anytime. A quiet browser
  notification is sent alongside it (if you grant permission) — no modal, no nagging.
- **Urgent vs. Important** — each event is classified using:
  - **Gemini API** (if `GEMINI_API_KEY` is set) for context-aware triage, or
  - a rule-based fallback: *urgent* = starting within ~3 hours / already in progress /
    overdue; *important* = matches keywords like "exam", "deadline", "interview",
    "appointment", etc., or runs an hour or longer.

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS, Auth.js (NextAuth v5) with the
Google provider, `googleapis` for Calendar access. Deploys cleanly to Vercel.

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a Google OAuth client**
   - In [Google Cloud Console](https://console.cloud.google.com/), create/select a
     project and enable the **Google Calendar API**.
   - Under *APIs & Services > Credentials*, create an **OAuth client ID** (Web
     application).
   - Add authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (local dev)
     - `https://<your-vercel-domain>/api/auth/callback/google` (production)

3. **Configure environment variables**

   ```bash
   cp .env.example .env.local
   npx auth secret   # fills in AUTH_SECRET
   ```

   Then set `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` from step 2. Optionally set
   `GEMINI_API_KEY` (from [Google AI Studio](https://aistudio.google.com/apikey)) to
   enable AI-assisted classification instead of the heuristic fallback.

4. **Run it**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000), sign in with Google, and grant
   calendar read access.

## Deploying

Push this repo to Vercel and set the same environment variables (`AUTH_SECRET`,
`AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, optionally `GEMINI_API_KEY`) as project env
vars, plus the production redirect URI on the Google OAuth client.

## Project background

JH '26 SFU Sidequests — exploring UI/Figma, Vercel, and the Gemini API. Judging
criteria: Best Use of Gemini API, Best Pitch using Alpha Foundry, Best UI by Huion,
Surge Choice Award, Lone Wanderer Award.
