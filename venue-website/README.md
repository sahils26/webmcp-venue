# spaces360 Venue Assistant

This Vite + React app is written in TypeScript and includes an in-app venue
assistant backed by a local tool registry. The assistant can call registered
venue tools for room details, availability checks, and quote form preparation.
Styling is written in SCSS, with shared theme values and mixins centralized in
`src/styles/_theme.scss`.

## Run the app

```bash
npm install
npm run dev
```

Open [https://127.0.0.1:5173](https://127.0.0.1:5173).

Create a `.env.local` file with `VITE_GROQ_API_KEY` before testing the chat
completion flow.

## Quality checks

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

`npm run build` runs TypeScript first, then creates the production Vite bundle.

Run the full local pre-merge gate with:

```bash
npm run verify
```

`npm run verify` runs linting, TypeScript, coverage-enforced tests, and the
production build.

## Styling

SCSS files are imported directly from React entrypoints and compiled by Vite.
The shared venue theme lives in `src/styles/_theme.scss`.

- Change `$theme-color` to update the primary venue color across the page, chat widget, buttons, and focus states.
- Reuse the theme mixins for repeated styling patterns such as panel surfaces, focus rings, text truncation, and primary actions.
- Global styles live in `src/index.scss`.
- Component and page styles live beside their owners under `src/components/style` and `src/pages/style`.

## Testing

```bash
npm run test
npm run test:watch
npm run test:coverage
```

- Unit tests cover date normalization, availability rules, OpenStreetMap service mapping, and the assistant tool registry.
- Component tests cover the venue page room list, quote request success/failure, live venue fallback, and assistant chat tool flow.
- Test setup lives in `src/tests/setup.ts`.
- Coverage HTML output is written to `coverage/`.
- Coverage thresholds are enforced at 90% statements, 90% lines, 90% functions, and 70% branches.

## Project structure

- `src/components` contains reusable React components, with component SCSS in `src/components/style` and component tests in `src/components/tests`.
- `src/pages` contains route-level page components, with page SCSS in `src/pages/style` and page tests in `src/pages/tests`.
- `src/styles` contains shared SCSS theme variables and mixins.
- `src/data` contains static venue data and tool JSON schemas.
- `src/services` contains typed service logic for availability and OSM lookups.
- `src/utils` contains shared pure utilities such as date key normalization.
- `src/types` contains shared app-level TypeScript contracts.
- `src/lib/toolRegistry.ts` contains the local assistant tool registry.
- Feature tests live in `tests` folders under the source area they cover.

## Notes

- Vite uses `@vitejs/plugin-basic-ssl` to generate a local self-signed certificate for development.
- Your browser may show a certificate warning the first time. Proceed to the site so the page loads over HTTPS.
- React components register tools through `src/hooks/useAgentTool.ts`.
- `127.0.0.1` is used instead of `localhost` to avoid environments that resolve `localhost` to the IPv6 loopback `::1`, which can prevent the Vite server from starting.
