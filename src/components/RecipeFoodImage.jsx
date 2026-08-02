import React, { useState, useEffect } from 'react'
import { Sparkles, RefreshCw, AlertCircle, Image as ImageIcon } from 'lucide-react'
import { generateRecipeFoodImage, getCachedRecipeImage } from '../utils/imageService'

export default function RecipeFoodImage({ recipe, defaultFallbackImg }) {
  const recipeKey = recipe?.title || recipe?.name || "Recipe"
  const [imageUrl, setImageUrl] = useState(() => getCachedRecipeImage(recipeKey))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true
    const cached = getCachedRecipeImage(recipeKey)
    
    if (cached) {
      setImageUrl(cached)
      setLoading(false)
      setError(null)
      return
    }

    if (!recipe) return

    async function loadImage() {
      setLoading(true)
      setError(null)
      
      const result = await generateRecipeFoodImage(recipe, { forceRefresh: false })
      if (!isMounted) return
      
      if (result.success && result.imageUrl) {
        setImageUrl(result.imageUrl)
        setError(null)
      } else {
        console.warn('[RecipeFoodImage] AI Image generation failed, falling back gracefully:', result.error)
        setError(result.error || 'Failed to generate dish image')
      }
      setLoading(false)
    }

    loadImage()

    return () => {
      isMounted = false
    }
  }, [recipeKey])

  const handleRetry = async () => {
    setLoading(true)
    setError(null)
    const result = await generateRecipeFoodImage(recipe, { forceRefresh: true })
    if (result.success && result.imageUrl) {
      setImageUrl(result.imageUrl)
      setError(null)
    } else {
      setError(result.error || 'Retry failed')
    }
    setLoading(false)
  }

  // 1. Loading Skeleton State
  if (loading) {
    return (
      <div className="recipe-food-image-container loading-skeleton-container" aria-busy="true">
        <div className="skeleton-image-shimmer">
          <div className="skeleton-content-center">
            <Sparkles className="skeleton-icon-pulse" size={36} />
            <p className="skeleton-text">Preparing your dish...</p>
            <span className="skeleton-subtext">Generating AI food photography...</span>
          </div>
        </div>
      </div>
    )
  }

  // 2. Error State with Clean Fallback & Try Again Action
  if (error && !imageUrl) {
    return (
      <div className="recipe-food-image-container error-fallback-container">
        {defaultFallbackImg ? (
          <img 
            src={defaultFallbackImg} 
            alt={recipeKey} 
            className="recipe-food-img fallback-3d-img"
          />
        ) : (
          <div className="fallback-placeholder-box">
            <ImageIcon size={40} className="fallback-placeholder-icon" />
            <p className="fallback-placeholder-title">Dish image unavailable</p>
          </div>
        )}
        
        <div className="image-error-action-overlay">
          <button onClick={handleRetry} className="btn-retry-image">
            <RefreshCw size={16} /> Try Again
          </button>
        </div>
      </div>
    )
  }

  // 3. Success State (Render Generated AI Image or Default Asset)
  const finalSrc = imageUrl || defaultFallbackImg

  return (
    <div className="recipe-food-image-container">
      <img 
        src={finalSrc} 
        alt={recipeKey} 
        className="recipe-food-img" 
        loading="eager"
      />
      
      {imageUrl && (
        <div className="image-badge-overlay">
          <span className="ai-badge">
            <Sparkles size={12} /> AI FLUX.1
          </span>
          <button 
            onClick={handleRetry} 
            className="btn-regenerate-icon" 
            title="Regenerate Image"
            aria-label="Regenerate Image"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
