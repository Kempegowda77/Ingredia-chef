/**
 * Vercel Serverless Function: Secure Hugging Face FLUX.1-schnell Image Generator
 * Protects HF_TOKEN from client-side exposure.
 */

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' })
  }

  try {
    const { prompt } = req.body || {}
    if (!prompt) {
      return res.status(400).json({ success: false, error: 'Prompt parameter is required' })
    }

    // Secure server-side token priority: HF_TOKEN first, fallback to VITE_HF_ACCESS_TOKEN if present
    const hfToken = process.env.HF_TOKEN || process.env.VITE_HF_ACCESS_TOKEN
    if (!hfToken) {
      console.error('[Image Generator API] Missing HF_TOKEN environment variable server-side.')
      return res.status(500).json({ 
        success: false, 
        error: 'Server configuration error: HF_TOKEN is not configured in environment variables.' 
      })
    }

    console.log('[Image Generator API] Invoking FLUX.1-schnell with prompt:', prompt.slice(0, 80) + '...')

    const hfResponse = await fetch('https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hfToken.trim()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: prompt
      })
    })

    if (!hfResponse.ok) {
      const errorText = await hfResponse.text()
      console.error(`[Image Generator API] HuggingFace HTTP ${hfResponse.status}:`, errorText)
      return res.status(hfResponse.status).json({
        success: false,
        error: `Hugging Face API returned ${hfResponse.status}: ${errorText}`
      })
    }

    const arrayBuffer = await hfResponse.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const contentType = hfResponse.headers.get('content-type') || 'image/jpeg'
    const base64Image = `data:${contentType};base64,${buffer.toString('base64')}`

    console.log('[Image Generator API] Image generated successfully! Size:', buffer.length, 'bytes.')
    return res.status(200).json({
      success: true,
      imageUrl: base64Image
    })

  } catch (err) {
    console.error('[Image Generator API] Unexpected internal error:', err)
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error during image generation'
    })
  }
}
