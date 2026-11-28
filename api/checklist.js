const { put, list } = require('@vercel/blob');
const PATH = 'opusmeds/yair-checklist.json';

async function read() {
  const { blobs } = await list({ prefix: PATH, limit: 1 });
  if (!blobs.length) return {};
  const r = await fetch(blobs[0].url + '?t=' + Date.now(), { cache: 'no-store' });
  return r.ok ? r.json() : {};
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    let data = await read();
    if (req.method === 'POST') {
      const inc = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      let n = 0;
      for (const [k, o] of Object.entries(inc)) {
        if (!/^([pkf][cr]\d{1,2}|more)$/.test(k) || !o || typeof o.t !== 'number') continue;
        const v = typeof o.v === 'boolean' ? o.v : String(o.v ?? '').slice(0, 2000);
        if (!data[k] || o.t > data[k].t) data[k] = { v, t: o.t };
        if (++n > 40) break;
      }
      await put(PATH, JSON.stringify(data), {
        access: 'public', addRandomSuffix: false, allowOverwrite: true,
        contentType: 'application/json', cacheControlMaxAge: 60,
      });
    } else if (req.method !== 'GET') {
      return res.status(405).json({ error: 'method' });
    }
    res.status(200).json({ data });
  } catch (e) {
    res.status(500).json({ error: 'store' });
  }
};
