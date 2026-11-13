# Documentation

This site is built with [Zensical](https://zensical.org) from the Markdown files in `docs/`. The page order and titles are set by `nav` in `zensical.toml`. Add new pages there.

To preview it locally with live reload at `http://localhost:8000`:

```sh
uv sync --group docs
uv run zensical serve
```

CI builds the site with `zensical build --strict`, so a broken link to another page fails the build. Run the same command before pushing:

```sh
uv run zensical build --clean --strict
```

Link to other pages with relative paths to their `.md` files, such as `[Secrets](../deployment/secrets.md)`. Files outside `docs/` aren't part of the site, so refer to them as code (`src/api/live.ts`) or link to them on GitHub.

The site is published to GitHub Pages on every push to `main`; see [CI and image builds](../deployment/ci.md).

## What goes where

- **`README.md`**: what the project is, a quick start, and links here. Keep it short.
- **This site**: everything a developer or operator needs beyond that.
