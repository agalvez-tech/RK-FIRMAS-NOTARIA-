// api/firmas.js — Vercel Serverless Function (CommonJS)
const KV_KEY = 'rk_firmas_notaria_v1'

async function kvGet() {
  const res = await fetch(`${process.env.KV_REST_API_URL}/get/${KV_KEY}`, {
    headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` },
  })
  const json = await res.json()
  if (!json.result) return []
  try { return JSON.parse(json.result) } catch { return [] }
}

async function kvSet(data) {
  await fetch(`${process.env.KV_REST_API_URL}/set/${KV_KEY}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(JSON.stringify(data)),
  })
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-rk-pin')

  if (req.method === 'OPTIONS') return res.status(200).end()

  const EDITOR_PIN = process.env.RK_FIRMAS_PIN || '1976'
  const pin = req.headers['x-rk-pin']

  try {
    if (req.method === 'GET') {
      const firmas = await kvGet()
      return res.status(200).json({ ok: true, firmas })
    }

    if (req.method === 'POST') {
      if (pin !== EDITOR_PIN) return res.status(401).json({ ok: false, error: 'PIN incorrecto' })
      const { firma } = req.body
      if (!firma || firma.__test) return res.status(200).json({ ok: true, firmas: await kvGet() })
      const firmas = await kvGet()
      firmas.push(firma)
      await kvSet(firmas)
      return res.status(200).json({ ok: true, firmas })
    }

    if (req.method === 'DELETE') {
      if (pin !== EDITOR_PIN) return res.status(401).json({ ok: false, error: 'PIN incorrecto' })
      const { id } = req.body
      const firmas = (await kvGet()).filter(f => f.id !== id)
      await kvSet(firmas)
      return res.status(200).json({ ok: true, firmas })
    }

    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  } catch (err) {
    console.error('API error:', err)
    return res.status(500).json({ ok: false, error: 'Error interno', firmas: [] })
  }
}
