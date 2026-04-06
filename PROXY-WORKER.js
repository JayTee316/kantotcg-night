/**
 * KANTO TCG — TCGdex CORS Proxy for Cloudflare Workers
 * 
 * DEPLOY VIA INLINE EDITOR (not file upload):
 * 1. Go to workers.cloudflare.com → Create → "Hello World" template
 * 2. Click Deploy, then "Edit code"  
 * 3. Delete all existing code, paste this entire file
 * 4. Click Save and Deploy
 * 5. Your URL: https://YOUR-WORKER-NAME.YOUR-SUBDOMAIN.workers.dev
 */

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
  }

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const url = new URL(request.url)

  // Only allow /proxy/* paths
  if (!url.pathname.startsWith('/proxy/')) {
    return new Response('Not found', { status: 404, headers: corsHeaders })
  }

  // Build the TCGdex URL by stripping /proxy prefix
  const tcgdexPath = url.pathname.replace('/proxy', '')
  const tcgdexUrl = 'https://api.tcgdex.net' + tcgdexPath + url.search

  try {
    const response = await fetch(tcgdexUrl, {
      headers: { 'User-Agent': 'KantoTCG/1.0' }
    })

    const body = await response.text()

    return new Response(body, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
        ...corsHeaders
      }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })
  }
}
