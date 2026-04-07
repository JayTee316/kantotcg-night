/* ═══════════════════════════════════════════════════
   KANTO TCG — Auth + Collection JS
   Included on every page via <script src="auth.js">
   ═══════════════════════════════════════════════════ */

const WORKER_BASE = 'https://raspy-pond-1f00.jayswizzybiz.workers.dev';
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID'; // Set after Google OAuth setup

/* ── Token storage ── */
function getToken() { try { return localStorage.getItem('kanto_token'); } catch { return null; } }
function setToken(t) { try { localStorage.setItem('kanto_token', t); } catch {} }
function clearToken() { try { localStorage.removeItem('kanto_token'); localStorage.removeItem('kanto_user'); } catch {} }
function getUser() { try { return JSON.parse(localStorage.getItem('kanto_user') || 'null'); } catch { return null; } }
function setUser(u) { try { localStorage.setItem('kanto_user', JSON.stringify(u)); } catch {} }

/* ── Saved card cache (per session) ── */
let savedCardIds = new Set();
let savedLoaded = false;

async function loadSavedCards() {
  const token = getToken();
  if (!token || savedLoaded) return;
  try {
    const res = await fetch(`${WORKER_BASE}/collection`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const data = await res.json();
      savedCardIds = new Set(data.cards.map(c => c.card_id));
      savedLoaded = true;
      updateAllHearts();
    }
  } catch {}
}

function isCardSaved(cardId) { return savedCardIds.has(cardId); }

async function toggleSaveCard(cardId, cardName, setName, price, imageUrl, lang, btn) {
  const token = getToken();
  if (!token) { showAuthModal('login'); return; }

  if (isCardSaved(cardId)) {
    // Remove
    btn.textContent = '♡';
    btn.classList.remove('heart-saved');
    savedCardIds.delete(cardId);
    await fetch(`${WORKER_BASE}/collection/${encodeURIComponent(cardId)}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
    });
  } else {
    // Save
    btn.textContent = '♥';
    btn.classList.add('heart-saved');
    savedCardIds.add(cardId);
    await fetch(`${WORKER_BASE}/collection`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ card_id: cardId, card_name: cardName, set_name: setName, price, image_url: imageUrl, lang: lang || 'en' })
    });
  }
}

function updateAllHearts() {
  document.querySelectorAll('.heart-btn[data-card-id]').forEach(btn => {
    const id = btn.dataset.cardId;
    if (isCardSaved(id)) { btn.textContent = '♥'; btn.classList.add('heart-saved'); }
    else { btn.textContent = '♡'; btn.classList.remove('heart-saved'); }
  });
}

/* ── Auth modal ── */
function showAuthModal(mode = 'login') {
  const overlay = document.getElementById('modal-overlay');
  const inner = document.getElementById('modal-inner');
  if (!overlay || !inner) return;

  const isLogin = mode === 'login';
  inner.innerHTML = `
    <div style="text-align:center;margin-bottom:20px">
      <div style="font-family:var(--display);font-size:22px;font-weight:900;color:var(--text);margin-bottom:4px">${isLogin ? 'Sign In' : 'Create Account'}</div>
      <div style="font-size:12px;color:var(--muted);font-weight:500">Kanto TCG Collection Tracker</div>
    </div>

    <!-- Google button -->
    <button onclick="startGoogleAuth()" style="width:100%;display:flex;align-items:center;justify-content:center;gap:10px;background:var(--surface2);border:1px solid var(--border2);color:var(--text);font-family:var(--sans);font-size:13px;font-weight:700;padding:10px;border-radius:var(--r-sm);cursor:pointer;margin-bottom:14px;transition:all 0.12s" onmouseover="this.style.borderColor='#c02818'" onmouseout="this.style.borderColor=''">
      <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.08 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-3.59-13.46-8.66l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
      Continue with Google
    </button>

    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
      <div style="flex:1;height:1px;background:var(--border)"></div>
      <span style="font-size:10px;color:var(--muted2);font-weight:700;text-transform:uppercase;letter-spacing:0.5px">or</span>
      <div style="flex:1;height:1px;background:var(--border)"></div>
    </div>

    <div id="auth-error" style="display:none;background:rgba(192,40,24,0.1);border:1px solid rgba(192,40,24,0.3);border-radius:var(--r-sm);padding:8px 12px;font-size:12px;color:var(--fr-red);font-weight:600;margin-bottom:12px"></div>

    ${!isLogin ? `<input id="auth-name" type="text" placeholder="Display name (optional)" style="width:100%;background:var(--surface);border:1px solid var(--border2);color:var(--text);font-family:var(--sans);font-size:13px;padding:9px 12px;border-radius:var(--r-sm);outline:none;margin-bottom:8px;box-sizing:border-box" onfocus="this.style.borderColor='#c02818'" onblur="this.style.borderColor=''">` : ''}
    <input id="auth-email" type="email" placeholder="Email address" style="width:100%;background:var(--surface);border:1px solid var(--border2);color:var(--text);font-family:var(--sans);font-size:13px;padding:9px 12px;border-radius:var(--r-sm);outline:none;margin-bottom:8px;box-sizing:border-box" onfocus="this.style.borderColor='#c02818'" onblur="this.style.borderColor=''">
    <input id="auth-pass" type="password" placeholder="Password${isLogin ? '' : ' (min 8 characters)'}" style="width:100%;background:var(--surface);border:1px solid var(--border2);color:var(--text);font-family:var(--sans);font-size:13px;padding:9px 12px;border-radius:var(--r-sm);outline:none;margin-bottom:14px;box-sizing:border-box" onfocus="this.style.borderColor='#c02818'" onblur="this.style.borderColor=''" onkeydown="if(event.key==='Enter')submitAuth('${mode}')">

    <button onclick="submitAuth('${mode}')" id="auth-submit-btn" style="width:100%;background:var(--fr-red);color:#fff;border:none;font-family:var(--sans);font-size:13px;font-weight:800;padding:10px;border-radius:var(--r-sm);cursor:pointer;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:12px">
      ${isLogin ? 'Sign In' : 'Create Account'}
    </button>

    <div style="text-align:center;font-size:12px;color:var(--muted)">
      ${isLogin ? 'No account yet?' : 'Already have an account?'}
      <a href="#" onclick="showAuthModal('${isLogin ? 'signup' : 'login'}');return false" style="color:var(--fr-red);font-weight:700;text-decoration:none">
        ${isLogin ? 'Create one' : 'Sign in'}
      </a>
    </div>`;

  overlay.classList.add('open');
  setTimeout(() => document.getElementById('auth-email')?.focus(), 100);
}

async function submitAuth(mode) {
  const email = document.getElementById('auth-email')?.value?.trim();
  const password = document.getElementById('auth-pass')?.value;
  const name = document.getElementById('auth-name')?.value?.trim();
  const errEl = document.getElementById('auth-error');
  const btn = document.getElementById('auth-submit-btn');

  if (!email || !password) { showAuthError('Please fill in all fields'); return; }

  btn.textContent = '…';
  btn.disabled = true;

  try {
    const res = await fetch(`${WORKER_BASE}/auth/${mode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, display_name: name })
    });
    const data = await res.json();
    if (!res.ok) { showAuthError(data.error || 'Something went wrong'); btn.textContent = mode === 'login' ? 'Sign In' : 'Create Account'; btn.disabled = false; return; }
    setToken(data.token);
    setUser(data.user);
    document.getElementById('modal-overlay').classList.remove('open');
    savedLoaded = false;
    updateNavAuth();
    loadSavedCards();
    // Reload collection page if on it
    if (window.loadCollection) loadCollection();
  } catch(e) {
    showAuthError('Connection error — try again');
    btn.textContent = mode === 'login' ? 'Sign In' : 'Create Account';
    btn.disabled = false;
  }
}

function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

/* ── Google OAuth ── */
function startGoogleAuth() {
  if (GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID') {
    showAuthError('Google login not configured yet — use email/password for now');
    return;
  }
  const redirect = `${WORKER_BASE}/auth/google/callback`;
  const state = Math.random().toString(36).slice(2);
  localStorage.setItem('oauth_state', state);
  localStorage.setItem('oauth_redirect', redirect);
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: window.location.origin + '/auth-callback.html',
    response_type: 'code',
    scope: 'openid email profile',
    state,
  });
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

/* ── Nav auth UI ── */
function updateNavAuth() {
  const area = document.getElementById('nav-auth-area');
  if (!area) return;
  const user = getUser();
  if (user) {
    area.innerHTML = `
      <a href="collection.html" style="font-size:12px;font-weight:700;color:var(--muted);text-decoration:none;padding:0 10px;height:52px;display:flex;align-items:center;border-bottom:2px solid transparent;text-transform:uppercase;letter-spacing:0.3px;transition:color 0.12s" onmouseover="this.style.color='var(--text)'" onmouseout="this.style.color='var(--muted)'">♡ My Collection</a>
      <div style="position:relative">
        <button onclick="toggleUserMenu()" style="background:var(--surface);border:1px solid var(--border2);color:var(--text);font-family:var(--sans);font-size:12px;font-weight:700;padding:5px 12px;border-radius:var(--r-sm);cursor:pointer;display:flex;align-items:center;gap:6px">
          <span style="width:22px;height:22px;border-radius:50%;background:var(--fr-red);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;color:#fff">${(user.name||user.email||'?')[0].toUpperCase()}</span>
          ${(user.name||user.email||'').split(' ')[0]}
        </button>
        <div id="user-menu" style="display:none;position:absolute;right:0;top:calc(100%+6px);background:var(--surface2);border:1px solid var(--border2);border-radius:var(--r-lg);min-width:160px;z-index:400;box-shadow:0 8px 24px rgba(0,0,0,0.5);overflow:hidden">
          <a href="collection.html" style="display:block;padding:10px 14px;font-size:12px;font-weight:600;color:var(--text);text-decoration:none;border-bottom:1px solid var(--border)" onmouseover="this.style.background='var(--surface3)'" onmouseout="this.style.background=''">♡ My Collection</a>
          <button onclick="signOut()" style="display:block;width:100%;text-align:left;padding:10px 14px;font-size:12px;font-weight:600;color:var(--muted);background:none;border:none;cursor:pointer" onmouseover="this.style.background='var(--surface3)'" onmouseout="this.style.background=''">Sign Out</button>
        </div>
      </div>`;
  } else {
    area.innerHTML = `
      <button onclick="showAuthModal('login')" style="background:transparent;border:1px solid var(--border2);color:var(--text2);font-family:var(--sans);font-size:11px;font-weight:700;padding:5px 12px;border-radius:var(--r-sm);cursor:pointer;text-transform:uppercase;letter-spacing:0.3px;margin-right:6px;transition:all 0.12s" onmouseover="this.style.borderColor='var(--fr-red)';this.style.color='var(--fr-red)'" onmouseout="this.style.borderColor='';this.style.color='var(--text2)'">Sign In</button>
      <button onclick="showAuthModal('signup')" style="background:var(--fr-red);border:1px solid var(--fr-red-dark);color:#fff;font-family:var(--sans);font-size:11px;font-weight:700;padding:5px 12px;border-radius:var(--r-sm);cursor:pointer;text-transform:uppercase;letter-spacing:0.3px;transition:all 0.12s">Sign Up</button>`;
  }
}

function toggleUserMenu() {
  const m = document.getElementById('user-menu');
  if (m) m.style.display = m.style.display === 'none' ? 'block' : 'none';
}

function signOut() {
  clearToken();
  savedCardIds = new Set();
  savedLoaded = false;
  updateNavAuth();
  if (window.loadCollection) loadCollection();
  const m = document.getElementById('user-menu');
  if (m) m.style.display = 'none';
}

document.addEventListener('click', e => {
  const menu = document.getElementById('user-menu');
  if (menu && !e.target.closest('#user-menu') && !e.target.closest('button[onclick="toggleUserMenu()"]')) {
    menu.style.display = 'none';
  }
});

function initAuth() {
  updateNavAuth();
  if (getToken()) loadSavedCards();
}

// Auto-init if DOM already ready
if (document.readyState !== 'loading') initAuth();
else document.addEventListener('DOMContentLoaded', initAuth);
