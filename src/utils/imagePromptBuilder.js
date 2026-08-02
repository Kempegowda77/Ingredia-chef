/**
 * Dynamically builds a photorealistic food photography prompt for Hugging Face FLUX.1-schnell
 * based on the final generated recipe details.
 */
export function buildFoodImagePrompt(recipeObj = {}) {
  const title = recipeObj.title || recipeObj.name || "Gourmet Dish"
  const description = recipeObj.desc || recipeObj.description || ""
  const cuisine = recipeObj.cuisine || "Delicious"
  
  // Extract main ingredients array if available
  let ingredientsText = ""
  if (Array.isArray(recipeObj.ingredients)) {
    ingredientsText = recipeObj.ingredients.slice(0, 5).join(", ")
  } else if (typeof recipeObj.ingredients === "string") {
    ingredientsText = recipeObj.ingredients
  }

  // Clean title for prompt
  const cleanTitle = title.replace(/[^\w\s-]/gi, '').trim()

  return `Photorealistic professional food photography of ${cleanTitle}, a ${cuisine} style dish featuring ${description || ingredientsText || 'gourmet ingredients'}. Served in an authentic ceramic dish on a rustic wooden table, naturally garnished with fresh green herbs. Warm natural lighting, 45-degree angle food photography, restaurant-quality presentation, highly detailed textures. No people, no hands, no text, no labels, no logos.`
}
