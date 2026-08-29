# JourneyHacks-26

JH '26 SFU Sidequests

## What is this app solving?

Boredom, social connection, exploration.

**Purpose:** a gamified campus companion for SFU students:

- Discover sidequests (social, academic, fitness, exploration)
- Complete them IRL
- Track progress, streaks, and rewards
- Chat with an AI "Quest Guide" for recommendations
- Log how you're feeling with the Sentiment Tracker

Think: Pokémon Go × Notion × campus life.

**Features:**
- Location tracking (GPS)
- Chatbot
- Sentiment tracker (Gemini-powered mood journal)

**Judging criteria:** Best Use of Gemini API · Best Pitch using Alpha Foundry ·
Best UI by Huion · Surge Choice Award · Lone Wanderer Award

## Sentiment Tracker

A mood journal: type how you're feeling, Gemini analyzes the sentiment and
reflects a short, supportive insight back to you. Entries and the mood trend
are stored locally in your browser (no backend/database required).

### Getting started

```bash
npm install
cp .env.example .env.local   # then add your GEMINI_API_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Get a Gemini API key at <https://aistudio.google.com/apikey>.

## Deploy on Vercel

The easiest way to deploy this app is with the [Vercel Platform](https://vercel.com/new).
Set the `GEMINI_API_KEY` environment variable in your Vercel project settings.
