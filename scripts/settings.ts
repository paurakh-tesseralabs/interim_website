export const projectId = 'a5h6mb2t'
export const dataset = 'production'
export const apiVersion = '2026-10-05'
export const reservedSlugs = ['index', 'about', 'blog', 'privacy', 'terms']

export function validSlug(slug: unknown): slug is string {
  return typeof slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
    && !reservedSlugs.includes(slug)
}
