import {toHTML} from '@portabletext/to-html'
import {createImageUrlBuilder} from '@sanity/image-url'
import {projectId, dataset, validSlug} from './settings'

const imageBuilder = createImageUrlBuilder({projectId, dataset})
export function escapeHtml(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]!))
}
export function safeHref(value: unknown): string | null {
  if (typeof value !== 'string' || !value || /[\u0000-\u0020\\]/.test(value)) return null
  if (/^(https?:\/\/|mailto:|tel:)/i.test(value)) return value
  if (!value.startsWith('//') && !/^[^/?#]*:/.test(value)) return value
  return null
}
export function formattedDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) throw new Error(`Invalid article date: ${date}`)
  return new Intl.DateTimeFormat('en-US', {month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC'}).format(new Date(date + 'T12:00:00Z'))
}
export function authorsText(post: any) {
  const names = post.authorNames || post.authors?.map((author: any) => author?.name)
  if (!names?.length || names.some((name: unknown) => typeof name !== 'string' || !name.trim())) throw new Error(`Missing author for ${post.title}`)
  return new Intl.ListFormat('en-US', {style: 'long', type: 'conjunction'}).format(names)
}
export function articleCard(post: any) {
  if (!validSlug(post.slug?.current)) throw new Error(`Invalid article slug: ${post.slug?.current}`)
  return `<a class="blog-card" href="${post.slug.current}.html">${post.isNew ? '<span class="badge-new">New</span>' : ''}<span class="blog-tag">${escapeHtml(post.category)}</span><h3>${escapeHtml(post.title)}</h3><p>${escapeHtml(post.excerpt)}</p><span class="blog-meta">${escapeHtml(formattedDate(post.publishedAt))} &middot; ${escapeHtml(authorsText(post))}</span></a>`
}
export function articleBody(body: any[]) {
  return toHTML(body, {
    onMissingComponent: (message) => {throw new Error(message)},
    components: {
      marks: {link: ({children, value}) => {
        const href = safeHref(value?.href)
        return href ? `<a href="${escapeHtml(href)}"${value?.blank ? ' target="_blank" rel="noopener noreferrer"' : ''}>${children}</a>` : children
      }},
      types: {image: ({value}) => {
        let src: string
        if (value.localPath && /^assets\/img\/blog\/[a-zA-Z0-9_.-]+$/.test(value.localPath)) src = value.localPath
        else if (value.asset?._ref) src = imageBuilder.image(value).width(1520).fit('max').auto('format').url()
        else throw new Error('Article image has no valid asset')
        return `<figure class="post-figure"><img src="${escapeHtml(src)}" alt="${escapeHtml(value.alt)}" loading="lazy">${value.caption ? `<figcaption>${escapeHtml(value.caption)}</figcaption>` : ''}</figure>`
      }},
    },
  })
}
