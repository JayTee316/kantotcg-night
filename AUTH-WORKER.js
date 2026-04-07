/**
 * KANTO TCG — Auth + Proxy + Collection Worker (ES Module format)
 * Required for D1 database binding
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json', ...CORS }
  });
}
function err(msg, status = 400) { return json({ error: msg }, status); }

async function signJWT(payload, secret) {
  const enc = s => btoa(JSON.stringify(s)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  const header = enc({ alg:'HS256', typ:'JWT' });
  const body = enc(payload);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret),
    { name:'HMAC', hash:'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${header}.${body}`));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  return `${header}.${body}.${sigB64}`;
}

async function verifyJWT(token, secret) {
  try {
    const [header, body, sig] = token.split('.');
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret),
      { name:'HMAC', hash:'SHA-256' }, false, ['verify']);
    const sigBytes = Uint8Array.from(atob(sig.replace(/-/g,'+').replace(/_/g,'/')), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes,
      new TextEncoder().encode(`${header}.${body}`));
    if (!valid) return null;
    const payload = JSON.parse(atob(body.replace(/-/g,'+').replace(/_/g,'/')));
    if (payload.exp && payload.exp < Date.now()/1000) return null;
    return payload;
  } catch { return null; }
}

async function hashPassword(password) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

async function getUser(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace('Bearer ', '');
  if (!token) return null;
  return verifyJWT(token, env.JWT_SECRET);
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    const url = new URL(request.url);
    const path = url.pathname;

    // ── TCGdex proxy ──────────────────────────────────────────────────────
    if (path.startsWith('/proxy/')) {
      const target = 'https://api.tcgdex.net' + path.replace('/proxy','') + url.search;
      try {
        const res = await fetch(target, { headers: { 'User-Agent':'KantoTCG/1.0' } });
        return new Response(await res.text(), {
          status: res.status,
          headers: { 'Content-Type':'application/json', 'Cache-Control':'public, max-age=3600', ...CORS }
        });
      } catch(e) { return json({ error: e.message }, 500); }
    }

    // ── Sign up ───────────────────────────────────────────────────────────
    if (path === '/auth/signup' && request.method === 'POST') {
      const { email, password, display_name } = await request.json();
      if (!email || !password) return err('Email and password required');
      if (password.length < 8) return err('Password must be at least 8 characters');
      const hash = await hashPassword(password);
      try {
        await env.DB.prepare('INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)')
          .bind(email.toLowerCase(), hash, display_name || email.split('@')[0]).run();
        const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email.toLowerCase()).first();
        const token = await signJWT({ id:user.id, email:user.email, name:user.display_name,
          exp: Math.floor(Date.now()/1000) + 86400*30 }, env.JWT_SECRET);
        return json({ token, user: { id:user.id, email:user.email, name:user.display_name } });
      } catch(e) {
        if (e.message?.includes('UNIQUE')) return err('Email already registered');
        return err('Signup failed: ' + e.message, 500);
      }
    }

    // ── Login ─────────────────────────────────────────────────────────────
    if (path === '/auth/login' && request.method === 'POST') {
      const { email, password } = await request.json();
      if (!email || !password) return err('Email and password required');
      const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email.toLowerCase()).first();
      if (!user) return err('Invalid email or password', 401);
      if (user.password_hash !== await hashPassword(password)) return err('Invalid email or password', 401);
      const token = await signJWT({ id:user.id, email:user.email, name:user.display_name,
        exp: Math.floor(Date.now()/1000) + 86400*30 }, env.JWT_SECRET);
      return json({ token, user: { id:user.id, email:user.email, name:user.display_name } });
    }

    // ── Google OAuth callback ─────────────────────────────────────────────
    if (path === '/auth/google/callback' && request.method === 'POST') {
      const { code, redirect_uri } = await request.json();
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ code, client_id: env.GOOGLE_CLIENT_ID,
          client_secret: env.GOOGLE_CLIENT_SECRET, redirect_uri, grant_type: 'authorization_code' })
      });
      const tokens = await tokenRes.json();
      if (!tokens.access_token) return err('Google auth failed', 401);
      const profile = await (await fetch('https://www.googleapis.com/oauth2/v2/userinfo',
        { headers: { Authorization: `Bearer ${tokens.access_token}` } })).json();
      if (!profile.email) return err('Could not get Google profile', 401);
      await env.DB.prepare(`INSERT INTO users (email, google_id, display_name) VALUES (?, ?, ?)
        ON CONFLICT(email) DO UPDATE SET google_id=excluded.google_id,
        display_name=COALESCE(users.display_name,excluded.display_name)`)
        .bind(profile.email, profile.id, profile.name).run();
      const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(profile.email).first();
      const token = await signJWT({ id:user.id, email:user.email, name:user.display_name,
        exp: Math.floor(Date.now()/1000) + 86400*30 }, env.JWT_SECRET);
      return json({ token, user: { id:user.id, email:user.email, name:user.display_name } });
    }

    // ── Get collection ────────────────────────────────────────────────────
    if (path === '/collection' && request.method === 'GET') {
      const user = await getUser(request, env);
      if (!user) return err('Not logged in', 401);
      const { results } = await env.DB.prepare(
        'SELECT * FROM saved_cards WHERE user_id = ? ORDER BY saved_at DESC').bind(user.id).all();
      const total = results.reduce((s,c) => s+(c.price||0), 0);
      return json({ cards: results, total: Math.round(total*100)/100 });
    }

    // ── Save card ─────────────────────────────────────────────────────────
    if (path === '/collection' && request.method === 'POST') {
      const user = await getUser(request, env);
      if (!user) return err('Not logged in', 401);
      const { card_id, card_name, set_name, price, image_url, lang } = await request.json();
      if (!card_id || !card_name) return err('card_id and card_name required');
      await env.DB.prepare(`INSERT INTO saved_cards (user_id,card_id,card_name,set_name,price,image_url,lang)
        VALUES (?,?,?,?,?,?,?) ON CONFLICT(user_id,card_id)
        DO UPDATE SET price=excluded.price, image_url=excluded.image_url`)
        .bind(user.id, card_id, card_name, set_name||'', price||0, image_url||'', lang||'en').run();
      return json({ saved: true });
    }

    // ── Remove card ───────────────────────────────────────────────────────
    if (path.startsWith('/collection/') && request.method === 'DELETE') {
      const user = await getUser(request, env);
      if (!user) return err('Not logged in', 401);
      const card_id = decodeURIComponent(path.replace('/collection/',''));
      await env.DB.prepare('DELETE FROM saved_cards WHERE user_id=? AND card_id=?').bind(user.id, card_id).run();
      return json({ removed: true });
    }

    return new Response('Not found', { status: 404, headers: CORS });
  }
};
