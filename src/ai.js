import Anthropic from "@anthropic-ai/sdk"
import { HfInference } from "@huggingface/inference"
import i18n, { LANGUAGES } from "./i18n"

// Helper to get active language name
function getActiveLanguageName() {
  const currentCode = i18n.language || localStorage.getItem('ingredia_lang') || 'en'
  const langObj = LANGUAGES.find(l => l.code === currentCode || currentCode.startsWith(l.code))
  return langObj ? `${langObj.label} (${langObj.native})` : "English"
}

// Pre-approved pantry items
const ALLOWED_PANTRY = [
  "salt", "water", "oil", "cooking oil", "ghee", "butter", "black pepper", "pepper",
  "turmeric", "turmeric powder", "red chilli", "chilli powder", "cumin", "cumin powder",
  "coriander powder", "garam masala", "ginger-garlic paste", "ginger garlic paste",
  "lemon", "lemon juice", "coriander leaves", "cilantro", "sugar", "honey"
]

// Strict Major Proteins / Ingredients that MUST NOT be hallucinated
const FORBIDDEN_IF_NOT_SELECTED = [
  "chicken", "mutton", "lamb", "beef", "pork", "fish", "prawn", "shrimp",
  "egg", "eggs", "paneer", "tofu", "cheese", "mushroom"
]

// Strict Ingredient Validation Layer
export function validateRecipeIngredients(userIngredients, recipeText) {
  if (!recipeText) return { isValid: false, reason: "Empty recipe text" }

  const lowerUser = userIngredients.map(i => i.toLowerCase().trim())
  const lowerRecipe = recipeText.toLowerCase()

  // Find forbidden items that appear in recipe but were NOT provided by user
  for (const forbidden of FORBIDDEN_IF_NOT_SELECTED) {
    const userHasIt = lowerUser.some(u => u.includes(forbidden) || forbidden.includes(u))
    if (!userHasIt && lowerRecipe.includes(forbidden)) {
      return {
        isValid: false,
        reason: `Hallucinated ingredient detected: '${forbidden}'. User only provided: [${userIngredients.join(", ")}]`
      }
    }
  }

  return { isValid: true, reason: null }
}

// System Prompt Constructor with Zero-Hallucination Directive
function buildSystemPrompt(targetLanguageName, userIngredientsArr) {
  return `
# ROLE & VOICE
You are Ingredia Culinary Engine, an executive chef and food safety expert.
Generate restaurant-quality recipes in a warm, practical, and clear style.

# STRICT ZERO-HALLUCINATION RULE (MANDATORY)
The user has provided ONLY these ingredients: [${userIngredientsArr.join(", ")}].
You MUST NOT add or invent any major protein or ingredient (such as Chicken, Paneer, Egg, Fish, Mutton, Meat) unless it is explicitly listed in [${userIngredientsArr.join(", ")}].
You may ONLY add standard pantry basics: Salt, Water, Cooking Oil, Ghee, Pepper, Turmeric, Red Chilli, Garam Masala, Ginger-Garlic Paste, and Lemon Juice.

# MANDATORY LANGUAGE REQUIREMENT
Generate the ENTIRE recipe output (Dish Title, Rating, Times, Difficulty, Cuisine, Ingredients You Have, Smart Pantry Enhancements, Step-by-Step Directions, Storage & Reheating Tips) 100% in ${targetLanguageName} language script!

# FOOD SAFETY & DONENESS RULES
- Never tell users to wash raw chicken or meat.
- Cook poultry until internal temperature of 75°C (165°F) and juices run clear.

# OUTPUT FORMAT
Always format the recipe in ${targetLanguageName} as:

Dish: [Recipe Title]
Rating: ⭐⭐⭐⭐⭐
Prep time: [X] mins
Cook time: [X] mins
Serves: [X]
Difficulty: [Easy/Medium/Hard]
Cuisine: [Indian/Italian/Continental/Asian/Beverage]

Ingredients You Have:
${userIngredientsArr.map(i => `- ${i}`).join("\n")}

Smart Pantry Enhancements:
- ⭐ Cooking Oil
- ⭐ Salt
- ⭐ Turmeric powder
- ⭐ Red chilli powder

Step-by-Step Directions

1. [Step Title]: [Step instructions]
2. [Step Title]: [Step instructions]
... (3 to 12 natural steps)

Storage & Reheating Tips:
- [Tip 1]
- [Tip 2]
`
}

// 1. Anthropic Client
let anthropic = null
if (import.meta.env.VITE_ANTHROPIC_API_KEY) {
  try {
    anthropic = new Anthropic({
      apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY.trim(),
      dangerouslyAllowBrowser: true
    })
  } catch (e) {
    console.warn("Anthropic SDK init error:", e)
  }
}

// 2. Hugging Face Client
let hf = null
if (import.meta.env.VITE_HF_ACCESS_TOKEN) {
  try {
    hf = new HfInference(import.meta.env.VITE_HF_ACCESS_TOKEN.trim())
  } catch (e) {
    console.warn("HuggingFace init error:", e)
  }
}

// Generate Recipe Options based on ingredients
export async function getRecipeOptionsFromChefClaude(ingredientsArr) {
  const cleanItems = ingredientsArr.filter(item => Boolean(item) && typeof item === 'string')
  const ingredStr = cleanItems.join(" ").toLowerCase()

  if (ingredStr.includes("chicken")) {
    return [
      { id: 1, title: "Chicken Curry", rating: "⭐⭐⭐⭐⭐", time: "30 mins", diff: "Easy", cuisine: "Indian", tag: "Protein Rich", desc: "Classic rich gravy curry cooked with onions, tomatoes, and Indian spices on low flame." },
      { id: 2, title: "Dry Chicken Fry", rating: "⭐⭐⭐⭐", time: "20 mins", diff: "Easy", cuisine: "Indian", tag: "Quick & Crispy", desc: "Pan-sear chicken bites tossed with garlic, chilli flakes, and fresh lemon juice." },
      { id: 3, title: "Chicken Masala", rating: "⭐⭐⭐⭐", time: "25 mins", diff: "Medium", cuisine: "Indian", tag: "Spicy Gravy", desc: "Thick, rich onion-tomato masala gravy ideal for dipping roti or naan." },
    ]
  }

  if (ingredStr.includes("coffee") || ingredStr.includes("milk") || ingredStr.includes("tea")) {
    return [
      { id: 1, title: "Artisan Filter Coffee", rating: "⭐⭐⭐⭐⭐", time: "5 mins", diff: "Easy", cuisine: "Beverage", tag: "Morning Energy", desc: "Rich frothy coffee simmered with milk and caramelized sugar." },
      { id: 2, title: "Creamy Cold Coffee", rating: "⭐⭐⭐⭐", time: "4 mins", diff: "Easy", cuisine: "Beverage", tag: "Chilled Refreshment", desc: "Blended iced coffee topped with milk foam and cocoa dusting." },
    ]
  }

  return [
    { id: 1, title: `${cleanItems[0] || "Special"} Home Curry`, rating: "⭐⭐⭐⭐⭐", time: "25 mins", diff: "Easy", cuisine: "Indian", tag: "Homestyle", desc: "Homestyle curry cooked with onions, tomatoes, and warm spices." },
    { id: 2, title: `Sautéed ${cleanItems[0] || "Veggie"} Stir Fry`, rating: "⭐⭐⭐⭐", time: "15 mins", diff: "Easy", cuisine: "Quick Meal", tag: "Healthy", desc: "Quick pan-sear with garlic, herbs, and lemon juice." },
  ]
}

// Generate complete step-by-step recipe with strict zero-hallucination validation
export async function getRecipeFromChefClaude(ingredientsArr, selectedTitle) {
  const targetLanguage = getActiveLanguageName()
  const cleanIngredients = ingredientsArr.filter(item => Boolean(item) && typeof item === 'string')
  const userPrompt = `I have ONLY these base ingredients: [${cleanIngredients.join(", ")}]. Selected dish option: "${selectedTitle || "Specialty"}". Please generate the recipe in ${targetLanguage}.`
  const systemPrompt = buildSystemPrompt(targetLanguage, cleanIngredients)

  // Tier 1: Anthropic API
  if (anthropic) {
    try {
      console.log(`Requesting strict recipe from Anthropic Claude in ${targetLanguage}...`)
      const msg = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 1200,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }]
      })
      if (msg && msg.content && msg.content[0] && msg.content[0].text) {
        const text = msg.content[0].text
        const check = validateRecipeIngredients(cleanIngredients, text)
        if (check.isValid) return text
        console.warn("Validation failed for Anthropic response:", check.reason)
      }
    } catch (err) {
      console.warn("Anthropic API call failed, trying HuggingFace fallback...", err.message)
    }
  }

  // Tier 2: Hugging Face API
  if (hf) {
    try {
      console.log(`Requesting strict recipe from HuggingFace in ${targetLanguage}...`)
      const response = await hf.chatCompletion({
        model: "mistralai/Mistral-7B-Instruct-v0.3",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 1200
      })
      if (response && response.choices && response.choices[0] && response.choices[0].message) {
        const text = response.choices[0].message.content
        const check = validateRecipeIngredients(cleanIngredients, text)
        if (check.isValid) return text
        console.warn("Validation failed for HF response:", check.reason)
      }
    } catch (err) {
      console.warn("Hugging Face API call failed:", err.message)
    }
  }

  // Tier 3: Guaranteed Safe Fallback Engine (Strictly match provided ingredients)
  console.log(`Using Guaranteed Safe Zero-Hallucination Engine in ${targetLanguage}...`)
  return generateStrictSafeRecipe(cleanIngredients, selectedTitle, targetLanguage)
}

function generateStrictSafeRecipe(userIngredients, selectedTitle, targetLanguage) {
  const dishTitle = selectedTitle || (userIngredients[0] ? `${userIngredients[0]} Special` : "Homestyle Specialty")

  return `Dish: ${dishTitle}
Rating: ⭐⭐⭐⭐⭐
Prep time: 10 mins
Cook time: 20 mins
Serves: 3
Difficulty: Easy
Cuisine: Indian

Ingredients You Have:
${userIngredients.map(i => `- ${i}`).join("\n")}

Smart Pantry Enhancements:
- ⭐ Cooking oil or Ghee
- ⭐ Salt
- ⭐ Turmeric powder
- ⭐ Red chilli powder
- ⭐ Garam masala

Step-by-Step Directions

1. Prepare ingredients: Chop and clean your ingredients [${userIngredients.join(", ")}].
2. Heat oil in pan: Heat 2 tablespoons of oil or ghee in a pan over medium flame.
3. Sauté base ingredients: Add your ingredients and sauté for 5 to 7 minutes until tender.
4. Add spices: Lower flame, add salt, turmeric powder, and red chilli powder. Mix well.
5. Cover and simmer: Cover with a lid and cook on low flame for 10 minutes until flavors blend nicely.
6. Serve hot: Garnish and serve warm!

Storage & Reheating Tips:
- Refrigerate in an airtight container for up to 3 days.
- Reheat gently on low flame with 2 tablespoons of water.`
}
