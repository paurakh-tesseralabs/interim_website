import {readFile, writeFile, readdir, mkdir, cp, rm, rename} from 'node:fs/promises'
import path from 'node:path'
import {JSDOM} from 'jsdom'
import {createClient} from '@sanity/client'
import {extractBlog, root} from './extract-blog'
import {projectId, dataset, apiVersion, validSlug} from './settings'
import {articleBody, articleCard, authorsText, formattedDate} from './render'

async function main() {
  const local = process.argv.includes('--local')
  const client = createClient({projectId, dataset, apiVersion, useCdn: false, perspective: 'published', token: process.env.SANITY_API_READ_TOKEN || undefined})
  const posts: any[] = local ? await extractBlog() : await client.fetch(`*[_type == "post"] | order(publishedAt desc, _id asc) {
    _id, title, slug, publishedAt, category, excerpt, isNew, body, authors[]->{name}
  }`)
  const slugs = new Set<string>()
  for (const post of posts) {
    const slug = post.slug?.current
    if (!validSlug(slug) || slugs.has(slug)) throw new Error(`Invalid or duplicate article address: ${slug}`)
    if (!post.title || !post.excerpt || !post.category || !Array.isArray(post.body) || !post.body.length) throw new Error(`Incomplete article: ${post.title || slug}`)
    authorsText(post)
    formattedDate(post.publishedAt)
    slugs.add(slug)
  }
  const staging = path.join(root, 'work/site-build')
  await rm(staging, {recursive: true, force: true})
  await mkdir(staging, {recursive: true})
  await cp(path.join(root, 'assets'), path.join(staging, 'assets'), {recursive: true})
  const sourceListing = await readFile(path.join(root, 'blog.html'), 'utf8')
  const listingDom = new JSDOM(sourceListing)
  const originalArticles = new Set([...listingDom.window.document.querySelectorAll('#blog-posts .blog-card')].map((el) => el.getAttribute('href')))
  // Copy only public pages and assets. Studio, credentials, scripts and source data never enter dist.
  for (const filename of await readdir(root)) {
    if (filename.endsWith('.html') && filename !== 'blog.html' && !originalArticles.has(filename)) {
      if (slugs.has(filename.slice(0, -5))) throw new Error(`Article would overwrite a website page: ${filename}`)
      await cp(path.join(root, filename), path.join(staging, filename))
    }
  }
  listingDom.window.document.querySelector('#blog-posts .blog-grid')!.innerHTML = posts.length ? posts.map(articleCard).join('\n') : '<p>No articles published yet.</p>'
  await writeFile(path.join(staging, 'blog.html'), listingDom.serialize())
  const template = await readFile(path.join(root, 'erp-migrations-ai-investment.html'), 'utf8')
  for (const post of posts) {
    const dom = new JSDOM(template)
    const doc = dom.window.document
    doc.title = `${post.title} — Tessera`
    const description = doc.createElement('meta')
    description.name = 'description'
    description.content = post.excerpt
    doc.head.append(description)
    doc.querySelector('.post-hero h1')!.textContent = post.title
    doc.querySelector('.post-hero .blog-tag')!.textContent = post.category
    doc.querySelector('.post-byline')!.textContent = `By ${authorsText(post)} · ${formattedDate(post.publishedAt)}`
    doc.querySelector('.post-body')!.innerHTML = articleBody(post.body)
    const related = posts.filter((other) => other.slug.current !== post.slug.current).slice(0, 3)
    if (related.length) doc.querySelector('.post-related .blog-grid')!.innerHTML = related.map(articleCard).join('\n')
    else doc.querySelector('.post-related')!.remove()
    await writeFile(path.join(staging, `${post.slug.current}.html`), dom.serialize())
  }
  // Replace output only after all content has rendered successfully.
  await rm(path.join(root, 'dist'), {recursive: true, force: true})
  await rename(staging, path.join(root, 'dist'))
  console.log(`Built ${posts.length} articles from ${local ? 'local HTML (preview only)' : 'published Sanity content'} into dist/.`)
}
main().catch((error) => {console.error(`Build failed: ${error.message}`); process.exitCode = 1})
