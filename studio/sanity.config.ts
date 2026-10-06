import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {schemaTypes} from './schemaTypes'

export default defineConfig({
  name: 'default',
  title: 'Tessera Blog',
  projectId: 'a5h6mb2t',
  dataset: 'production',
  plugins: [structureTool()],
  schema: {types: schemaTypes},
})
