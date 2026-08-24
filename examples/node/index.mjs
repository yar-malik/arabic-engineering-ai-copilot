/**
 * Ask an engineering document a question and get the page it came from.
 *
 * No dependencies and no build step — Node 18 or newer.
 *
 *   export VOHO_API_KEY=voho_sk_live_...   # app.voho.ai -> API Tokens
 *   npm start
 *
 * New accounts start with $25 of credit, so this costs nothing to try.
 */
const KEY = process.env.VOHO_API_KEY
const BASE = process.env.VOHO_BASE_URL ?? 'https://app.voho.ai'

if (!KEY) {
  console.error('Set VOHO_API_KEY first — create one at https://app.voho.ai/tokens')
  process.exit(1)
}

async function voho(path, body, raw = false) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}))
    console.error(`${detail.error?.code ?? res.status}: ${detail.error?.message ?? 'request failed'}`)
    process.exit(1)
  }
  return raw ? Buffer.from(await res.arrayBuffer()) : res.json()
}

function spent(cents) {
  console.log(`\nCharged $${(cents / 100).toFixed(2)} from your Voho balance.`)
}

const { readFile } = await import('node:fs/promises')

const question = process.argv[3] ?? process.argv[2] ?? 'What torque do the seal gland bolts take, and which revision is this?'
const path = process.argv[3] ? process.argv[2] : null
const sample = `${BASE}/samples/sample-manual.pdf`

let data
if (path) {
  data = (await readFile(path)).toString('base64')
} else {
  console.log(`No document given — asking the sample manual at ${sample}`)
  data = Buffer.from(await (await fetch(sample)).arrayBuffer()).toString('base64')
}

console.log(`\nQ: ${question}`)
const out = await voho('/v1/documents/ask', { file: data, mime_type: 'application/pdf', question })

console.log(`A: ${out.answer}`)
if (!out.answered) console.log('   (not in the document — it said so rather than guessing)')
for (const q of out.quotes) console.log(`   > ${q}`)
spent(out.cost_cents)
