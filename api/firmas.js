const KV_KEY = 'rk_firmas_notaria_v1'

async function kvGet() {
  try {
    const url = process.env.KV_REST_API_URL
    const token = process.env.KV_REST_API_TOKEN
    if (!url || !token) return []
    const res = await fetch(`${url}/get/${KV_KEY}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const json = await res.json()
    if (!json.result) return []
    return JSON.parse(json.result)
  } catch { return [] }
}

async function kvSet(data) {
  try {
    const url = process.env.KV_REST_API_URL
    const token = process.env.KV_REST_API_TOKEN
    if (!url || !token) return
    await fetch(`${url}/set/${KV_KEY}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(JSON.stringify(data)),
    })
  } catch {}
}

async function parseBody(req) {
  return new Promise((resolve) => {
    if (req.body) { resolve(req.body); return }
    let data = ''
    req.on('data', chunk => { data += chunk })
    req.on('end', () => {
      try { resolve(JSON.parse(data)) } catch { resolve({}) }
    })
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

    const body = await parseBody(req)

    if (req.method === 'POST') {
      if (pin !== EDITOR_PIN) return res.status(401).json({ ok: false, error: 'PIN incorrecto' })
      const firma = body.firma
      if (!firma || firma.__test) return res.status(200).json({ ok: true, firmas: await kvGet() })
      const firmas = await kvGet()
      firmas.push(firma)
      await kvSet(firmas)
      return res.status(200).json({ ok: true, firmas })
    }

    if (req.method === 'DELETE') {
      if (pin !== EDITOR_PIN) return res.status(401).json({ ok: false, error: 'PIN incorrecto' })
      const { id } = body
      const all = await kvGet()
      const firmas = all.filter(f => f.id !== id)
      await kvSet(firmas)
      return res.status(200).json({ ok: true, firmas })
    }

    return res.status(405).json({ ok: false, error: 'Method not allowed' })

  } catch (err) {
    console.error('API error:', err)
    return res.status(500).json({ ok: false, error: String(err), firmas: [] })
  }
}
