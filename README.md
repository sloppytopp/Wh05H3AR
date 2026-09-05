# wh05h3ar

A modern EVP/spirit-box web app. Built to fix what the incumbents
(Hope Paranormal, Fantasm) get wrong: fussy per-utterance controls,
dated "spooky" UI, and no personalization.

## Product decisions

- **Session gate, not push-to-talk.** Open the gate once when you're ready
  to communicate, close it once when you're done. Hope Paranormal makes you
  re-slide a gate for every utterance — friction with no benefit.
- **Clean audio mode.** Standard noise-gating/filtering on top of the sweep,
  so the output isn't just raw static. This does not make the underlying
  mechanic more "real" — it's still filtered noise — it just means less junk
  reaches your ears.
- **Modern, not spooky.** No cobwebs/gothic UI. Dark, minimal, product-grade.
- **Free tier:** spirit-box sweep, clean-audio toggle, voice gender choice.
- **Investigator mode ($9.99 / 3 months):** distance meter (magnetometer-based
  — phones have no real EMF sensor, and the UI says so), EVP recording,
  session/audio logs, personal-voice sessions.
- **Personal voice, not celebrity voice.** Users may upload audio of someone
  they knew personally to use as the session voice, gated behind an explicit
  consent checkbox. There is no name search, browse, or library of public
  figures — this is a deliberate legal/ethical boundary (postmortem right of
  publicity, App Store/Play Store impersonation policies, and TTS vendor
  ToS all prohibit unlicensed voice cloning of identifiable public figures).
  Do not add a celebrity or public-figure voice feature to this app.

## Stack

Next.js (App Router) + TypeScript + Tailwind. No backend yet — session log
is local-storage only; payments and voice cloning are stubbed (see `TODO`
comments in `components/PaywallModal.tsx` and `components/InvestigatorPanel.tsx`)
pending a Stripe account and a voice-cloning vendor whose ToS is confirmed
to allow this use case.

## Running locally

```
npm install
npm run dev
```
