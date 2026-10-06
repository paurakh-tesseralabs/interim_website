import {createReadStream} from 'node:fs'
import path from 'node:path'
import {createClient} from '@sanity/client'
import {extractBlog, root} from './extract-blog'
import {projectId, dataset, apiVersion} from './settings'

async function main() {
  const posts = await extractBlog()
  for (const post of posts) {
    console.log(`${post.title}: ${post.body.length} blocks, ${post.body.filter((b) => b._type === 'image').length} images`)
  }
  if (!process.argv.includes('--write')) {
    console.log(`Dry run: ${posts.length} articles parsed. No content was written to Sanity.`)
    return
  }
  if (!process.env.SANITY_AUTH_TOKEN) throw new Error('Use npm run import:blog after signing in with Sanity. No token belongs in this repository.')
  const client = createClient({projectId, dataset, apiVersion, useCdn: false, perspective: 'raw', token: process.env.SANITY_AUTH_TOKEN})
  for (const source of posts) {
    // A rerun must never overwrite an article edited in Studio, including an unpublished draft.
    const existing = await client.fetch('*[_type == "post" && (legacySource == $source || slug.current == $slug)][0]{_id}', {source: source.legacySource, slug: source.slug.current})
    if (existing) { console.log(`Already imported: ${source.title}`); continue }
    const authors = []
    for (const name of source.authorNames) {
      let author = await client.fetch('*[_type == "author" && name == $name && !(_id in path("drafts.**"))][0]{_id}', {name})
      if (!author) author = await client.create({_type: 'author', name})
      authors.push({_type: 'reference', _key: crypto.randomUUID().replaceAll('-', ''), _ref: author._id})
    }
    const body = []
    for (const block of source.body as any[]) {
      if (block._type !== 'image') { body.push(block); continue }
      const {localPath, ...image} = block
      const asset = await client.assets.upload('image', createReadStream(path.join(root, localPath)), {filename: path.basename(localPath)})
      body.push({...image, asset: {_type: 'reference', _ref: asset._id}})
    }
    const {authorNames, ...post} = source
    await client.create({...post, authors, body})
    console.log(`Imported: ${post.title}`)
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1 })
