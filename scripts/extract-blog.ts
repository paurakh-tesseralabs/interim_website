import {readFile} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'
import path from 'node:path'
import {JSDOM} from 'jsdom'
import {htmlToBlocks} from '@portabletext/block-tools'
import {createSchema} from 'sanity'
import {schemaTypes} from '../studio/schemaTypes/index'

export const root = fileURLToPath(new URL('../', import.meta.url))
const schema = createSchema({name: 'blog-import', types: schemaTypes})
const blockType = schema.get('blockContent')

export async function extractBlog() {
  const listing = new JSDOM(await readFile(path.join(root, 'blog.html'), 'utf8')).window.document
  const articles = []
  for (const card of listing.querySelectorAll('#blog-posts .blog-card')) {
    const filename = card.getAttribute('href')!
    if (!/^[a-z0-9-]+\.html$/.test(filename)) throw new Error(`Unexpected article path: ${filename}`)
    const doc = new JSDOM(await readFile(path.join(root, filename), 'utf8')).window.document
    const body = doc.querySelector('.post-body')!
    const meta = card.querySelector('.blog-meta')!.textContent!.split('·').map((s) => s.trim())
    const date = new Date(meta[0] + ' 12:00:00 UTC')
    if (Number.isNaN(date.valueOf())) throw new Error(`Invalid date in ${filename}`)
    const authors = meta[1].split(' and ').map((name) => name.trim())
    const blocks = htmlToBlocks(body.innerHTML, blockType, {
      parseHtml: (html) => new JSDOM(html).window.document,
      rules: [{deserialize(el: any, next: any, block: any) {
        if (el.tagName?.toLowerCase() === 'figure') {
          const img = el.querySelector('img')
          if (!img) throw new Error(`Figure without image in ${filename}`)
          const localPath = img.getAttribute('src')
          if (!/^assets\/img\/blog\/[a-zA-Z0-9_.-]+$/.test(localPath)) throw new Error('Unexpected image path')
          return block({
            _type: 'image', localPath,
            alt: img.getAttribute('alt') || '',
            caption: el.querySelector('figcaption')?.textContent?.trim() || '',
          })
        }
        if (el.tagName?.toLowerCase() === 'a') {
          const href = el.getAttribute('href')
          if (!href) return undefined
          return {_type: '__annotation', markDef: {_key: crypto.randomUUID().replaceAll('-', ''), _type: 'link', href, blank: el.getAttribute('target') === '_blank'}, children: next(el.childNodes)}
        }
        return undefined
      }}],
    })
    articles.push({
      _type: 'post',
      title: doc.querySelector('.post-hero h1')!.textContent!.trim(),
      slug: {_type: 'slug', current: filename.replace(/\.html$/, '')},
      legacySource: filename,
      publishedAt: date.toISOString().slice(0, 10),
      category: card.querySelector('.blog-tag')!.textContent!.trim(),
      excerpt: card.querySelector('p')!.textContent!.trim(),
      isNew: Boolean(card.querySelector('.badge-new')),
      authorNames: authors,
      body: blocks,
    })
  }
  return articles
}
