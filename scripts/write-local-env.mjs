import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const output = execFileSync('npx', ['supabase', 'status', '-o', 'json'], { encoding: 'utf-8' })
const status = JSON.parse(output)

const contents = `VITE_SUPABASE_URL=${status.API_URL}\nVITE_SUPABASE_PUBLISHABLE_KEY=${status.PUBLISHABLE_KEY}\n`
writeFileSync('.env.local', contents)

console.log('Wrote .env.local from local Supabase status:')
console.log(contents)
