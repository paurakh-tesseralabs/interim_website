import assert from 'node:assert/strict'
import {test} from 'node:test'
import {readFile} from 'node:fs/promises'
import path from 'node:path'
import {JSDOM} from 'jsdom'
import {extractBlog, root} from '../scripts/extract-blog'
import {articleBody, articleCard, safeHref} from '../scripts/render'
import {validSlug} from '../scripts/settings'

const normalize = (s: string) => s.replace(/\s+/g, ' ').trim()
test('all five articles survive the HTML → Portable Text → HTML conversion', async () => {
  const posts = await extractBlog()
  assert.equal(posts.length, 5)
  let images = 0
  for (const post of posts) {
    const original = new JSDOM(await readFile(path.join(root, post.legacySource), 'utf8')).window.document.querySelector('.post-body')!
    const rendered = new JSDOM(articleBody(post.body)).window.document.body
    const textBlocks = (node: Element) => [...node.querySelectorAll('p, h2, h3, li, figcaption')].map((el) => normalize(el.textContent!))
    assert.deepEqual(textBlocks(rendered), textBlocks(original), post.title)
    for (const tag of ['h2', 'h3', 'ul', 'ol', 'li', 'strong', 'em', 'a', 'img', 'figcaption']) {
      assert.equal(rendered.querySelectorAll(tag).length, original.querySelectorAll(tag).length, `${post.title}: ${tag}`)
    }
    assert.deepEqual([...rendered.querySelectorAll('a')].map((a) => a.getAttribute('href')), [...original.querySelectorAll('a')].map((a) => a.getAttribute('href')))
    assert.deepEqual([...rendered.querySelectorAll('img')].map((img) => [img.getAttribute('src'), img.alt]), [...original.querySelectorAll('img')].map((img) => [img.getAttribute('src'), img.alt]))
    images += rendered.querySelectorAll('img').length
    assert.match(articleCard(post), new RegExp(`${post.slug.current}\\.html`))
  }
  assert.equal(images, 4)
})
test('article addresses cannot overwrite main pages or escape the output directory', () => {
  for (const bad of ['index', 'blog', 'about', 'privacy', 'terms', '../secret', 'foo/bar', 'UPPER', '', 'a.html']) assert.equal(validSlug(bad), false)
  assert.equal(validSlug('enterprise-transformation-index'), true)
})
test('links reject executable schemes and control characters', () => {
  for (const bad of ['javascript:alert(1)', 'data:text/html,test', '//evil.test', '\\evil.test', 'java\nscript:alert(1)', ' javascript:alert(1)']) assert.equal(safeHref(bad), null)
  for (const good of ['https://example.com', 'assets/docs/paper.pdf', '#research', 'mailto:hello@example.com']) assert.equal(safeHref(good), good)
})
test('editor content is escaped in cards and image attributes', () => {
  const card = articleCard({title: '<script>alert(1)</script>', slug: {current: 'safe-post'}, excerpt: '<img onerror="bad">', publishedAt: '2026-03-23', category: 'Research', authorNames: ['Example']})
  const dom = new JSDOM(card).window.document
  assert.equal(dom.querySelectorAll('script, img').length, 0)
  assert.equal(dom.querySelector('h3')!.textContent, '<script>alert(1)</script>')
  const body = articleBody([{_type: 'image', _key: 'image1', localPath: 'assets/img/blog/test.png', alt: '" onerror="bad', caption: '<script>bad</script>'}])
  const image = new JSDOM(body).window.document.querySelector('img')!
  assert.equal(image.getAttribute('onerror'), null)
})
