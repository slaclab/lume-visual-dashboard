---
icon: lucide/palette
---

# Design system

The app shell comes from `@swapps/ui`, part of the [SWAPPS design system](https://github.com/slaclab/swapps-design-system). It's built on IBM Carbon and adds app-level components (header, layout, theming) shared across SWAPPS applications. For buttons, forms, tables and other primitives, keep using `@carbon/react` directly, as the design system recommends.

`src/layouts/RootLayout.tsx` uses it as follows:

- `SWAPPSThemeProvider` with `appearance: 'dark'`, which applies Carbon's `g100` theme, and the SLAC branding.
- `AppHeader`, the fixed Carbon UI-shell header. `<main id="main-content">` is its skip-to-content target, and `.app-main` adds the 3rem offset the fixed header needs.

## Router links in the header

`AppHeader` takes `linkAs={RouterLink}` (`src/components/RouterLink.tsx`), a TanStack Router `Link` that maps Carbon's `href` to `to`. With it, the header's links:

- navigate client-side, keeping query caches and live streams open
- preload on hover
- get `aria-current="page"` on the current route, which Carbon styles as the active nav item

Their `href`s are router paths like `/models`. The router adds the production base path.

To add header links, pass `navigation={[{ label, href }]}`. For `admin`, `actions` or `utilities.help` with an `href`, also pass `onNavigate={(href) => navigate({ to: href })}` (from `useNavigate()`), because those render as buttons rather than links. `src/components/RouterLink.test.tsx` covers both.

## How it's consumed

`@swapps/ui` isn't published to npm yet. The design system is a git submodule at `external/swapps-design-system`, and the app compiles the package's TypeScript source directly, so it needs no build step or `package.json` entry:

- `tsconfig.app.json` maps `@swapps/ui` to `external/swapps-design-system/packages/ui/src/index.ts`. Vite reads the same mapping through `resolve.tsconfigPaths`.
- The source resolves `react` and `@carbon/react` from this app's `node_modules`. `resolve.dedupe` in `vite.config.ts` keeps a single copy of each, even if someone runs `pnpm install` inside the submodule.
- The source is type-checked with this app's compiler settings, and its CSS is bundled by Vite.
- ESLint and Vitest ignore `external/`, so the submodule's own lint rules and tests don't run here.

The submodule must be checked out to type-check, test or build the app (see [Getting started](../getting-started.md#clone-the-repository)). In CI:

- The **Check** and **Test** workflows initialize just this submodule before their commands.
- The **Update Docker Image** workflow does the same before the image build. `.dockerignore` lets only `packages/ui/src` into the image's build context.

To pick up design system changes, move the submodule to a newer commit:

```sh
git submodule update --remote external/swapps-design-system
git add external/swapps-design-system && git commit -m "Bump swapps-design-system"
```

**Tracks a fork.** Until `@swapps/ui` is published to npm, the submodule tracks the `develop` branch of [MitchellAV/swapps-design-system](https://github.com/MitchellAV/swapps-design-system/tree/develop) (see `.gitmodules`), so `--remote` pulls from that branch. `develop` is upstream `main` plus changes proposed to slaclab/swapps-design-system and not yet merged there:

- `AppHeader`'s `linkAs` and `onNavigate`, which the header's router links depend on
- the dependency updates, ECharts 6 support, and the `@swapps/ui/styles` and token fixes

## Known limitations

- `linkAs` and `onNavigate` exist only on the fork's `develop` branch until they're merged upstream (see above).
- The theme toggle needs an `onConfigChange` handler on `SWAPPSThemeProvider`. The app only has a dark theme, so the toggle is off.

## When `@swapps/ui` is published

Add it as a dependency (`pnpm add @swapps/ui`), then remove:

- the submodule (`git rm external/swapps-design-system`, which also drops its `.gitmodules` entry)
- the `@swapps/ui` path in `tsconfig.app.json` and the `dedupe` entry in `vite.config.ts`
- the submodule steps in the workflows and the `.dockerignore` exceptions

Imports don't change.
