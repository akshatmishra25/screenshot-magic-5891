# Secure Spotify token endpoint

## Scope
Add only the server-side Spotify credential/token foundation requested. Keep the Spotify client secret out of browser code and leave album browsing UI/data integration for a separate step.

## Work
- Add a same-origin-only TanStack server endpoint under `/api/public/` that performs Spotify's Client Credentials exchange and caches the access token server-side until shortly before expiration.
- Read the client secret only inside the server handler; accept and validate the public client ID without logging credentials or tokens.
- After the endpoint exists, request the Spotify client secret through Lovable's secure secret form and identify the expected public client ID configuration.
- Record the architectural choice in `AGENTS.md`; do not create a Supabase Edge Function because this project already has a serverless route layer.

## Technical details
The endpoint returns a limited-lifetime Spotify access token to same-origin app requests; it never returns or embeds the client secret. No search, album page, or review UI changes are included.
