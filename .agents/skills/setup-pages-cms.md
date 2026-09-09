# Set Up Pages CMS

Pages CMS is the Git-based editor for this site. It does **not** run inside Astro: editors use [app.pagescms.org](https://app.pagescms.org), save Markdown/YAML back to GitHub, and the host rebuilds the static site.

The schema lives in `.pages.yml` at the repository root. It must stay aligned with `src/content.config.ts`.

## Architecture

```
Pages CMS (edit) → GitHub commit → Vercel / Netlify / Cloudflare rebuild → AstroWind static site
```

Content is read **at build time** (`content-at-build-time.md`). Saving in Pages CMS is not enough until a production build runs.

## Connect the repository (once)

1. Open [app.pagescms.org](https://app.pagescms.org) and sign in with GitHub.
2. Install the Pages CMS GitHub App on the account that owns this repo.
3. Open this repository and the production branch (`main`).
4. `.pages.yml` is already in the repo; the sidebar should show **博客文章**, **服务条款**, **隐私政策**, and **站点信息**.

## What editors can change

| Sidebar       | Writes to                            | Notes                                                                   |
| ------------- | ------------------------------------ | ----------------------------------------------------------------------- |
| 博客文章      | `src/data/post/*.md`                 | Frontmatter matches the `post` collection. Filename = URL slug.         |
| 服务条款      | `src/pages/terms.md`                 | Keep the hidden `layout` field.                                         |
| 隐私政策      | `src/pages/privacy.md`               | Same as terms.                                                          |
| 站点信息      | `src/config.yaml` (`name`, URL, SEO) | Other keys are preserved (`settings.content.merge`). Comments may drop. |
| Media library | `public/images/`                     | Cover uploads default to `public/images/thumd`. Public URL `/images/…`. |

MDX demo posts (`markdown-elements-demo-post.mdx`, `astrowind-template-in-depth.mdx`) are excluded: they embed Astro components.

## Fields vs. AstroWind schema

When you add a post field, update **both**:

1. `.pages.yml` (editor)
2. `src/content.config.ts` (build)

Required in AstroWind: `title`. Optional: `publishDate`, `updateDate`, `draft`, `excerpt` (not `description`), `image`, `imageAlt`, `category`, `tags`, `author`, `metadata`.

Cover images should be `/images/…` (from Pages CMS) or `https://…`. `findImage()` already accepts both. `~/assets/images/…` still works for files committed under `src/assets/images/`.

## Publish a post

1. In Pages CMS, **博客文章** → create entry.
2. Set title (filename becomes `{title}.md`; edit the filename on create if you want a shorter slug). For Chinese titles, set a Latin slug yourself (`hello-world.md`), otherwise the URL may be empty or ugly.
3. Fill excerpt, dates, cover (`public/images/thumd`), category, tags, body.
4. Leave **存为草稿** off to publish.
5. Save. GitHub receives a commit; the connected host rebuilds.

Drafts (`draft: true`) are omitted from lists, RSS and related posts by `fetchPosts()`.

## Notes

- Do not use the shipped Decap admin (`/decapcms/`) for the same files; two Git CMS backends will fight.
- Homepage widgets, header/footer and most `.astro` pages are code, not CMS collections. Change those in the repo (see `customize-header.md`, `use-widgets.md`, `add-page.md`).
- After changing `.pages.yml`, reload Pages CMS so the editor picks up the new schema.
