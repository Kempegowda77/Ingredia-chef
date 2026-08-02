import { buildFoodImagePrompt } from './imagePromptBuilder'

const IMAGE_CACHE_PREFIX = 'ingredia_recipe_img_'

/**
 * Gets cached image URL for a given recipe key if available.
 */
export function getCachedRecipeImage(recipeKey) {
  if (!recipeKey) return null
  try {
    const key = IMAGE_CACHE_PREFIX + recipeKey.trim().toLowerCase()
    return localStorage.getItem(key)
  } catch (e) {
    console.warn('[Image Cache] Storage read error:', e)
    return null
  }
}

/**
 * Caches an image URL for a recipe key.
 */
export function setCachedRecipeImage(recipeKey, imageUrl) {
  if (!recipeKey || !imageUrl) return
  try {
    const key = IMAGE_CACHE_PREFIX + recipeKey.trim().toLowerCase()
    localStorage.setItem(key, imageUrl)
  } catch (e) {
    console.warn('[Image Cache] Storage write error:', e)
  }
}

/**
 * Calls backend API /api/generate-image to generate AI food image via FLUX.1-schnell.
 */
export async function generateRecipeFoodImage(recipeObj = {}, options = {}) {
  const recipeKey = recipeObj.title || recipeObj.name || recipeObj.id || "default_recipe"
  
  // Check cache unless forceRefresh is true
  if (!options.forceRefresh) {
    const cached = getCachedRecipeImage(recipeKey)
    if (cached) {
      console.log('[Image Service] Using cached AI food image for:', recipeKey)
      return { success: true, imageUrl: cached, fromCache: true }
    }
  }

  // Generate dynamic prompt from recipe details
  const prompt = buildFoodImagePrompt(recipeObj)
  console.log('[Image Service] Requesting AI food image from backend server...')

  try {
    const res = await fetch('/api/generate-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt, recipeTitle: recipeKey })
    })

    const data = await res.json()

    if (res.ok && data.success && data.imageUrl) {
      setCachedRecipeImage(recipeKey, data.imageUrl)
      return { success: true, imageUrl: data.imageUrl, fromCache: false }
    } else {
      console.error('[Image Service] Image generation server response error:', data.error || 'Unknown error')
      return { success: false, error: data.error || `HTTP ${res.status} Error` }
    }
  } catch (err) {
    console.error('[Image Service] Network call error:', err.message)
    return { success: false, error: err.message || 'Network error connecting to image API' }
  }
}
