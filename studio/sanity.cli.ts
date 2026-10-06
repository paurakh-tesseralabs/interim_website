import {defineCliConfig} from 'sanity/cli'
export default defineCliConfig({
  api: {projectId: 'a5h6mb2t', dataset: 'production'},
  // Polling avoids the file-watcher limit encountered on this Mac.
  vite: {server: {watch: {usePolling: true, interval: 1000}}},
})
