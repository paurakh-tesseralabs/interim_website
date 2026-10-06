# Tessera website and Sanity blog

The marketing website keeps its existing HTML and CSS. Sanity manages blog posts and authors. A build reads published posts from Sanity and generates the website into `dist/`, keeping the existing `.html` article addresses.

- Project: `a5h6mb2t`
- Organization supplied for this project: `odevceaka`
- Dataset: `production`
- Setup branch: `sanity-cms-setup`

## Current setup status

Studio and the blog schema are configured for the existing project. The initial import is complete: five published articles, two authors, and four images. All seven content documents passed Sanity validation without errors or warnings, and the website builds successfully from published Sanity content. Hosting and automatic rebuilds are not configured. The public website has not been deployed by this setup.

## Start locally

Use Node.js 24 LTS (24.15 or later). `.nvmrc` selects Node 24 for developers using nvm. From this repository folder:

```sh
npm ci
npm run studio
```

Open http://localhost:3333 and sign in with the Google account that has access to this Sanity project. Studio contains **Blog post** and **Author** content types. The development server uses polling to avoid the file-watcher limit encountered on this Mac.

## Import the existing articles once

First sign in to the Sanity command-line tool:

```sh
cd studio
npx sanity login --provider google
npm run schema:deploy
cd ..
npm run import:check
npm run import:blog
```

`import:check` previews the conversion without writing anything. `import:blog` uploads the four blog figures, creates authors, and imports the five articles as published posts. These articles are already present in the original public website. It uses your local Sanity CLI login; do not paste tokens into source files.

Rerunning the import skips posts matching the original file or slug, including drafts. It does not overwrite edits made in Studio. Run one import process at a time. Keep the original root HTML files: they are the import sources and layout templates.

## Edit or add a post

1. Open Studio and choose **Blog post**.
2. Edit a post, or create one and fill in its title, web address, authors, article date, category, summary, and article body.
3. Add images inside the article. Supply an image description and an optional caption.
4. Click **Publish** when ready.
5. Rebuild and deploy the website to show the change publicly.

Draft edits are excluded from the website build. The article date controls the displayed date and sort order; it does not schedule publishing. Keep existing web addresses unchanged to preserve incoming links. Unpublished or deleted posts disappear from the next build, including their article pages and related-post cards.

## Preview the website

After the import:

```sh
npm run build
npm run preview
```

Open http://127.0.0.1:8080/blog.html. To inspect the original articles before signing in, use `npm run build:local` instead of `npm run build`. The local build uses original HTML content and does not include Sanity edits.

The production build uses the published perspective, queries Sanity directly, and fails if a published post is malformed or has a conflicting address. If the dataset contains no published posts, the generated blog is empty; finish the initial import before deploying. Only public HTML and assets are copied into `dist/`.

## Publish the website

The hosting provider should run `npm ci` followed by `npm run build`, use Node 24 LTS, and publish **`dist`**. It must not serve the repository root or `studio/` as the public website.

Publishing in Sanity does not yet trigger a website deployment. Once the hosting provider is identified, connect a Sanity webhook (for post and author changes, including deletions) to its rebuild hook. Treat the rebuild hook URL as a secret and keep it out of Git.

The dataset currently permits public reads, so this build requires no API token. If it becomes private, set `SANITY_API_READ_TOKEN` only in the hosting provider's private build environment. Never use a browser-visible environment variable for a token.

Studio can later be hosted separately with `npm run deploy --workspace studio`. This has not been done. Use the same project and dataset so all editors work with the same content.

## Checks

```sh
npm test
npm run typecheck --workspace studio
npm run studio:build
npm run build:local
```

The tests cover article conversion fidelity, image/link preservation, unsafe links, HTML escaping, and protected website addresses. Build output, dependencies, local environment files, and temporary files are ignored by Git.
