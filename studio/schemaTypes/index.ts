import {defineType, defineField, defineArrayMember} from 'sanity'
import {DocumentTextIcon} from '@sanity/icons/DocumentText'
import {UserIcon} from '@sanity/icons/User'
import {ImageIcon} from '@sanity/icons/Image'
import {LinkIcon} from '@sanity/icons/Link'
import {validSlug} from '../../scripts/settings'

const blockContent = defineType({
  name: 'blockContent', title: 'Article body', type: 'array',
  of: [
    defineArrayMember({
      type: 'block',
      styles: [{title: 'Paragraph', value: 'normal'}, {title: 'Heading', value: 'h2'}, {title: 'Subheading', value: 'h3'}, {title: 'Quote', value: 'blockquote'}],
      lists: [{title: 'Bullet list', value: 'bullet'}, {title: 'Numbered list', value: 'number'}],
      marks: {
        decorators: [{title: 'Bold', value: 'strong'}, {title: 'Italic', value: 'em'}, {title: 'Code', value: 'code'}],
        annotations: [defineArrayMember({
          name: 'link', title: 'Link', type: 'object', icon: LinkIcon,
          fields: [
            defineField({name: 'href', title: 'Address', type: 'url', validation: (r) => r.required().uri({scheme: ['http', 'https', 'mailto', 'tel'], allowRelative: true})}),
            defineField({name: 'blank', title: 'Open in a new tab', type: 'boolean', initialValue: false}),
          ],
        })],
      },
    }),
    defineArrayMember({
      type: 'image', title: 'Image', icon: ImageIcon, options: {hotspot: true},
      validation: (r) => r.required().assetRequired(),
      fields: [
        defineField({name: 'alt', title: 'Image description', type: 'string', description: 'Describe the image for readers using assistive technology.', validation: (r) => r.required()}),
        defineField({name: 'caption', title: 'Caption', type: 'string'}),
      ],
    }),
  ],
})
const author = defineType({
  name: 'author', title: 'Author', type: 'document', icon: UserIcon,
  fields: [defineField({name: 'name', title: 'Name', type: 'string', validation: (r) => r.required()})],
  preview: {select: {title: 'name'}},
})
const post = defineType({
  name: 'post', title: 'Blog post', type: 'document', icon: DocumentTextIcon,
  fields: [
    defineField({name: 'title', title: 'Title', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'slug', title: 'Web address', type: 'slug', options: {source: 'title', maxLength: 100}, description: 'Keep this unchanged for existing articles so their links keep working. The website adds .html.', validation: (r) => r.required().custom((v) => !v?.current || validSlug(v.current) || 'Use lowercase words separated by hyphens. This must not match a main page name.')}),
    defineField({name: 'authors', title: 'Authors', type: 'array', of: [defineArrayMember({type: 'reference', to: [{type: 'author'}]})], validation: (r) => r.required().min(1).unique()}),
    defineField({name: 'publishedAt', title: 'Article date', type: 'date', description: 'Displayed on the article. Use Publish to make it available; this date does not schedule publication.', validation: (r) => r.required()}),
    defineField({name: 'category', title: 'Category', type: 'string', initialValue: 'Insights', options: {list: ['Insights', 'Research']}, validation: (r) => r.required()}),
    defineField({name: 'excerpt', title: 'Summary', type: 'text', rows: 3, description: 'Shown on blog cards and in the page description.', validation: (r) => r.required()}),
    defineField({name: 'isNew', title: 'Show the New badge', type: 'boolean', initialValue: false}),
    defineField({name: 'body', title: 'Article', type: 'blockContent', validation: (r) => r.required().min(1)}),
    defineField({name: 'legacySource', title: 'Original file', type: 'string', readOnly: true, hidden: true}),
  ],
  orderings: [{title: 'Newest first', name: 'newestFirst', by: [{field: 'publishedAt', direction: 'desc'}]}],
  preview: {select: {title: 'title', subtitle: 'publishedAt'}},
})
export const schemaTypes = [post, author, blockContent]
