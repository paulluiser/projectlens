import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve,join } from 'node:path'
import { checksum } from './migrate-storage.mjs'
const config = JSON.parse(await readFile(resolve('.local/migration/control.json'),'utf8'))
const action = process.argv[2]
if (!['export','freeze','schema','initialize','verify','export-db'].includes(action)) throw new Error('Unknown migration action.')
const write=['freeze','schema','initialize'].includes(action)
const response=await fetch(`${config.baseURL}/api/storage-migration${write?'':`?action=${action}`}`,{method:write?'POST':'GET',headers:{Authorization:`Bearer ${config.token}`,'Content-Type':'application/json'},...(write?{body:JSON.stringify({action})}:{})})
const result=await response.json()
if (!response.ok) {console.error(result.error || 'Migration request failed.');process.exitCode=1}
else if (result.state) {
  if (checksum(result.state)!==result.checksum) throw new Error('Backup checksum did not match.')
  await mkdir('.local/migration',{recursive:true,mode:0o700})
  const file=join('.local/migration',`${action}-${Date.now()}.json`)
  await writeFile(file,JSON.stringify(result,null,2),{mode:0o600,flag:'wx'})
  console.log(JSON.stringify({backup:file,checksum:result.checksum,counts:result.counts}))
} else console.log(JSON.stringify(result))
