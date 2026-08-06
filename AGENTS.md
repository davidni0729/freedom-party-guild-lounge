# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## Durable project direction

- Product name: 巫師公會交誼廳／自由派對。
- Visual direction: use the supplied Freedom Party A1 poster for the acid yellow, cyan, hot pink, black, grid-based visual system; use the three supplied guest-badge images for metallic, graffiti, industrial-cutout identity cards.
- Core surfaces: responsive mobile check-in, public lounge display, and host control dashboard sharing one event state.
- Four roles: 機甲師（工程師）、幻術師（設計師）、召喚師（媒合者）、城主（金主／老闆）。
- The QR code is public check-in only. Lounge and admin surfaces require a private host credential and must never be exposed through public navigation or the attendee QR code.
- D1 is the authoritative participant, event, and matching store; R2 stores participant photos. localStorage may only keep the current attendee's opaque id/token identity.
- Production and seeded demo data must start empty. Any deployment verification records must be removed before handoff.
