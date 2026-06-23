const KV_KEY = 'rk_firmas_notaria_v1'

async function kvGet() {
  const url = process.env.KV_REST_API_URL
  const token = process.env.KV_REST_API_TOKEN
  if (!url || !token) throw new Error('KV vars missing: url=' + !!url + ' token=' + !!token)
  const res = await fetch(`${url}/get/${KV_KEY}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('KV GET failed: ' + res.status)
  const json = await res.json()
  if (!json.result) return []
  return JSON.parse(json.result)
}

async function kvSet(data) {
  const url = process.env.KV_REST_API_URL
  const token = process.env.KV_REST_API_TOKEN
  if (!url || !token) throw new Error('KV vars missing')
  const res = await fetch(`${url}/set/${KV_KEY}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(JSON.stringify(data)),
  })
  if (!res.ok) throw new Error('KV SET failed: ' + res.status)
}

async function parseBody(req) {
  return new Promise((resolve) => {
    if (req.body && typeof req.body === 'object') { resolve(req.body); return }
    let data = ''
    req.on('data', chunk => { data += chunk })
    req.on('end', () => {
      try { resolve(JSON.parse(data)) } catch { resolve({}) }
    })
    req.on('error', () => resolve({}))
  })
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-rk-pin')

  if (req.method === 'OPTIONS') return res.status(200).end()

  const EDITOR_PIN = process.env.RK_FIRMAS_PIN || '1976'
  const pin = req.headers['x-rk-pin']

  if (req.method === 'GET') {
    try {
      const firmas = await kvGet()
      return res.status(200).json({ ok: true, firmas })
    } catch (err) {
      console.error('[GET] KV error:', err.message)
      // Devolver array vacío con info del error para no romper la app
      return res.status(200).json({ ok: true, firmas: [], _debug: err.message })
    }
  }

  try {
    const body = await parseBody(req)

    if (req.method === 'POST') {
      if (pin !== EDITOR_PIN) return res.status(401).json({ ok: false, error: 'PIN incorrecto' })
      const firma = body.firma
      if (!firma || firma.__test) {
        try { const firmas = await kvGet(); return res.status(200).json({ ok: true, firmas }) }
        catch { return res.status(200).json({ ok: true, firmas: [] }) }
      }
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
    console.error('[API] Error:', err.message)
    return res.status(500).json({ ok: false, error: err.message, firmas: [] })
  }
}
