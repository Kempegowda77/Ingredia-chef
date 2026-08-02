import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Custom dev server middleware to serve /api/generate-image during local development
function apiDevServerPlugin() {
  return {
    name: 'api-dev-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/generate-image' && req.method === 'POST') {
          let body = ''
          req.on('data', chunk => { body += chunk })
          req.on('end', async () => {
            try {
              const env = loadEnv(server.config.mode, process.cwd(), '')
              const hfToken = env.HF_TOKEN || env.VITE_HF_ACCESS_TOKEN || process.env.HF_TOKEN || process.env.VITE_HF_ACCESS_TOKEN

              if (!hfToken) {
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json')
                return res.end(JSON.stringify({
                  success: false,
                  error: 'Server configuration error: HF_TOKEN is not configured in environment variables.'
                }))
              }

              const parsed = JSON.parse(body || '{}')
              const { prompt } = parsed

              if (!prompt) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                return res.end(JSON.stringify({ success: false, error: 'Prompt parameter is required' }))
              }

              console.log('[Dev API Server] Invoking FLUX.1-schnell with prompt:', prompt.slice(0, 80) + '...')

              const hfResponse = await fetch('https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${hfToken.trim()}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ inputs: prompt })
              })

              if (!hfResponse.ok) {
                const errorText = await hfResponse.text()
                console.error(`[Dev API Server] HuggingFace HTTP ${hfResponse.status}:`, errorText)
                res.statusCode = hfResponse.status
                res.setHeader('Content-Type', 'application/json')
                return res.end(JSON.stringify({
                  success: false,
                  error: `Hugging Face API returned ${hfResponse.status}: ${errorText}`
                }))
              }

              const arrayBuffer = await hfResponse.arrayBuffer()
              const buffer = Buffer.from(arrayBuffer)
              const contentType = hfResponse.headers.get('content-type') || 'image/jpeg'
              const base64Image = `data:${contentType};base64,${buffer.toString('base64')}`

              console.log('[Dev API Server] Image generated successfully! Size:', buffer.length, 'bytes.')
              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json')
              return res.end(JSON.stringify({ success: true, imageUrl: base64Image }))

            } catch (err) {
              console.error('[Dev API Server] Error in dev middleware:', err)
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              return res.end(JSON.stringify({ success: false, error: err.message }))
            }
          })
          return
        }
        next()
      })
    }
  }
}

export default defineConfig({
  plugins: [react(), apiDevServerPlugin()],
})
