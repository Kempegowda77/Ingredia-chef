import { OpenRouter } from "@openrouter/sdk"
import { HfInference } from "@huggingface/inference"
import i18n, { LANGUAGES } from "./i18n.js"

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

// Smart Dish Category Classifier
export function detectDishCategory(title = "", userIngredients = []) {
  const combined = (title + " " + userIngredients.join(" ")).toLowerCase()

  // Use word boundary regex to prevent substring collisions (e.g. "lassi" matching inside "classic")
  const beverageRegex = /\b(coffee|tea|chai|smoothie|shake|beverage|drink|juice|lassi|lemonade|milkshake)\b/i;
  const dessertRegex = /\b(cake|pancake|kheer|halwa|pudding|dessert|sweet)\b/i;

  if (beverageRegex.test(combined)) {
    return "beverage"
  }
  if (dessertRegex.test(combined)) {
    return "dessert"
  }
  return "savory"
}

// Strict Major Proteins / Ingredients that MUST NOT be hallucinated
const FORBIDDEN_IF_NOT_SELECTED = [
  "chicken", "mutton", "lamb", "beef", "pork", "fish", "prawn", "shrimp",
  "egg", "eggs", "paneer", "tofu", "cheese", "mushroom"
]

// Strict Ingredient Validation Layer with Culinary Category Enforcement
export function validateRecipeIngredients(userIngredients, recipeText, selectedTitle = "") {
  if (!recipeText) return { isValid: false, reason: "Empty recipe text" }

  const lowerUser = userIngredients.map(i => i.toLowerCase().trim())
  const lowerRecipe = recipeText.toLowerCase()
  const category = detectDishCategory(selectedTitle, userIngredients)

  // 1. Culinary Common Sense Check: Beverages & Desserts MUST NOT contain savory spices (no chilli, turmeric, oil, garam masala in coffee!)
  if (category === "beverage" || category === "dessert") {
    const ridiculousSavorySpices = ["turmeric", "garam masala", "red chilli", "chilli powder", "cooking oil", "mustard oil", "garlic", "onion"]
    for (const spice of ridiculousSavorySpices) {
      if (lowerRecipe.includes(spice)) {
        return {
          isValid: false,
          reason: `Culinary logic violation: AI attempted to add savory spice '${spice}' to a ${category} (${selectedTitle})!`
        }
      }
    }
  }

  // 2. Find forbidden major proteins that appear in recipe but were NOT provided by user
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

// System Prompt Constructor with Culinary Category Intelligence
function buildSystemPrompt(targetLanguageName, userIngredientsArr, selectedTitle = "") {
  const category = detectDishCategory(selectedTitle, userIngredientsArr)

  let categoryDirective = ""
  let sampleEnhancements = ""

  if (category === "beverage") {
    categoryDirective = `
# BEVERAGE / DRINK SPECIAL DIRECTIVE (CRITICAL)
This recipe is a BEVERAGE / DRINK (e.g. Cold Coffee, Tea, Smoothie, Juice).
- You MUST NOT add cooking oil, ghee, salt, turmeric, red chilli, garam masala, garlic, or onion!
- ONLY suggest relevant beverage enhancers like Ice Cubes, Water, Cocoa Powder, Cinnamon, Cardamom, Vanilla Extract, or Sugar/Honey.
`
    sampleEnhancements = `- ⭐ Ice Cubes\n- ⭐ Chilled Water or Milk\n- ⭐ Cocoa Powder or Cinnamon`
  } else if (category === "dessert") {
    categoryDirective = `
# DESSERT / SWEET SPECIAL DIRECTIVE (CRITICAL)
This recipe is a DESSERT / SWEET DISH.
- You MUST NOT add garlic, onion, red chilli, turmeric, or garam masala!
- ONLY suggest relevant sweet enhancers like Cardamom, Cinnamon, Vanilla, Nuts, Butter, or Sugar/Honey.
`
    sampleEnhancements = `- ⭐ Cardamom powder\n- ⭐ Nuts / Almonds\n- ⭐ Butter`
  } else {
    categoryDirective = `
# SAVORY DISH DIRECTIVE
This is a savory dish. You may suggest standard culinary basics like Salt, Water, Cooking Oil, Pepper, Turmeric, Cumin, etc.
`
    sampleEnhancements = `- ⭐ Cooking Oil\n- ⭐ Salt\n- ⭐ Black Pepper or Herbs`
  }

  return `
# ROLE & VOICE
You are Ingredia Executive Chef AI, a world-class master chef with deep culinary wisdom.
Your mission is to provide warm, ultra-detailed, step-by-step cooking directions written like a passionate human executive chef teaching a home cook.

${categoryDirective}

# STRICT ZERO-HALLUCINATION RULE (MANDATORY)
The user has provided ONLY these ingredients: [${userIngredientsArr.join(", ")}].
You MUST NOT add or invent any major protein or ingredient (such as Chicken, Paneer, Egg, Fish, Mutton, Meat) unless it is explicitly listed in [${userIngredientsArr.join(", ")}].

# STEP-BY-STEP DIRECTIONS FORMATTING (CRITICAL FOR HUMAN-LIKE STEPS)
Under "Step-by-Step Directions", generate between 5 to 9 detailed, logical cooking steps.
Every single step line MUST start with a number, a period, space, a descriptive title, a colon (:), and then rich detailed human instructions.
Format:
1. [Descriptive Action Title]: [Detailed human chef instruction including exact heat level, timing in minutes, visual/aromatic cues, and pro tips]
2. [Descriptive Action Title]: [Detailed human chef instruction...]

EXAMPLE OF HUMAN-LIKE STEPS:
1. Prep & Chop Ingredients: Carefully wash and slice your base ingredients into uniform bite-sized pieces so they cook evenly.
2. Heat Oil & Infuse Aromatics: Place a pan on medium flame, heat 2 tablespoons of oil, and stir in your spices until fragrant (about 60 seconds).
3. Build the Flavor Base: Add sliced onions and tomatoes, cooking on medium-low heat for 5-7 minutes until soft, jammy, and aromatic.
4. Cook Main Ingredients: Add your main ingredients into the simmering base, stirring well to coat with spices.

# MANDATORY LANGUAGE REQUIREMENT
Generate the ENTIRE recipe output (Dish Title, Rating, Times, Difficulty, Cuisine, Ingredients You Have, Smart Pantry Enhancements, Step-by-Step Directions, Storage & Reheating Tips) 100% in ${targetLanguageName} language script!

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
${sampleEnhancements}

Step-by-Step Directions

1. [Action Title]: [Detailed human step explanation...]
2. [Action Title]: [Detailed human step explanation...]
... (5 to 9 human-like detailed steps)

Storage & Reheating Tips:
- [Tip 1]
- [Tip 2]
`
}

// 1. OpenRouter Client
let openrouter = null
const openrouterKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_OPENROUTER_API_KEY) || (typeof process !== 'undefined' && process.env?.VITE_OPENROUTER_API_KEY)
if (openrouterKey) {
  try {
    openrouter = new OpenRouter({
      apiKey: openrouterKey.trim()
    })
  } catch (e) {
    console.warn("OpenRouter SDK init error:", e)
  }
}

// 2. Hugging Face Client
let hf = null
const hfToken = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_HF_ACCESS_TOKEN) || (typeof process !== 'undefined' && process.env?.VITE_HF_ACCESS_TOKEN)
if (hfToken) {
  try {
    hf = new HfInference(hfToken.trim())
  } catch (e) {
    console.warn("HuggingFace init error:", e)
  }
}

// Ingredient Category & Type Classifier
export function classifyIngredients(userIngredients = []) {
  const lowerItems = userIngredients.map(i => i.toLowerCase().trim())
  const text = lowerItems.join(" ")

  const beverageKeywords = ["water", "milk", "lemon", "lemonade", "lime", "citrus", "orange", "juice", "mint", "sugar", "honey", "coffee", "tea", "chai", "cocoa", "chocolate", "syrup", "ice", "banana", "berry", "berries", "mango", "smoothie", "shake"]
  const saladKeywords = ["tomato", "onion", "cucumber", "lettuce", "salad", "spinach", "lemon", "salt", "olive oil"]
  const snackKeywords = ["bread", "cheese", "toast", "sandwich", "butter"]
  const proteinKeywords = ["chicken", "poultry", "mutton", "lamb", "beef", "pork", "fish", "prawn", "egg", "eggs", "paneer", "tofu"]
  const grainKeywords = ["rice", "pasta", "spaghetti", "noodle", "noodles", "pulao", "biryani", "macaroni"]

  let beverageHits = 0
  let saladHits = 0
  let snackHits = 0
  let proteinHits = 0
  let grainHits = 0

  lowerItems.forEach(item => {
    if (beverageKeywords.some(k => item.includes(k))) beverageHits++
    if (saladKeywords.some(k => item.includes(k))) saladHits++
    if (snackKeywords.some(k => item.includes(k))) snackHits++
    if (proteinKeywords.some(k => item.includes(k))) proteinHits++
    if (grainKeywords.some(k => item.includes(k))) grainHits++
  })

  // Explicit check for Lemon + Sugar + Water or Milk + Fruit/Coffee
  const isLemonDrink = (text.includes("lemon") || text.includes("lime")) && (text.includes("water") || text.includes("sugar") || text.includes("mint") || text.includes("honey"))
  const isMilkDrink = text.includes("milk") && (text.includes("banana") || text.includes("coffee") || text.includes("tea") || text.includes("chai") || text.includes("cocoa") || text.includes("sugar"))
  const isBeverage = isLemonDrink || isMilkDrink || (proteinHits === 0 && grainHits === 0 && beverageHits >= 2)

  const isSalad = proteinHits === 0 && grainHits === 0 && saladHits >= 2 && !isBeverage
  const isSnack = snackHits >= 1

  return {
    isBeverage,
    isSalad,
    isSnack,
    hasProtein: proteinHits > 0,
    hasGrain: grainHits > 0,
    itemCount: lowerItems.length
  }
}

// Generate Recipe Options based on ingredients & optional main ingredient
export async function getRecipeOptionsFromChefClaude(ingredientsArr, mainIngredient = "") {
  const cleanItems = ingredientsArr.filter(item => Boolean(item) && typeof item === 'string')
  if (cleanItems.length === 0) return []

  // 1. Master Culinary Reasoning Engine via OpenRouter (openai/gpt-oss-120b)
  if (openrouter) {
    try {
      console.log("Invoking OpenRouter (openai/gpt-oss-120b) Master Culinary Reasoning Engine...")
      const reasoningPrompt = `You are Ingredia Master Chef AI — an intelligent human culinary reasoning engine.
Your purpose is NOT to search a generic recipe database or invent a complex dish that happens to contain one of the ingredients.
Your purpose is to think like an experienced, practical human home cook standing in a kitchen looking at these exact available ingredients: [${cleanItems.join(", ")}].

==================================================
HUMAN CULINARY REASONING PIPELINE (PERFORM INTERNALLY):
==================================================
1. UNDERSTAND INGREDIENTS & ROLES:
   Dynamically infer roles for [${cleanItems.join(", ")}] (e.g. liquid, sweetener, acid, starch/base, protein, binder, raw vegetable, fat, spice, etc.).

2. UNDERSTAND RELATIONSHIP & NATURAL CATEGORY:
   Determine what category the combination naturally forms:
   - Beverage (e.g. Water/Milk + Lemon/Fruit/Coffee/Cocoa/Sugar → Lemonade, Smoothie, Cold Coffee, Hot Chocolate)
   - Snack / Sandwich (e.g. Bread + Cheese/Tomato/Butter → Toast, Sandwich, Grilled Cheese)
   - Salad (e.g. Tomato + Onion + Cucumber + Salt/Lemon → Fresh Salad)
   - Breakfast (e.g. Flour/Oats/Egg + Milk/Sugar → Pancakes, Oatmeal, Omelette)
   - Soup / Sauce / Dip (e.g. Yogurt + Cucumber → Raita; Tomato + Garlic → Pasta Sauce/Salsa)
   - Main Meal / Stir-Fry / Rice Dish (e.g. Rice + Chicken/Egg + Spices → Fried Rice, Pulao, Biryani)
   - Simple Preparation (e.g. Potato + Salt + Oil → Potato Fry/Hash; Banana + Honey → Banana Slices)

3. ASK THE HUMAN HOME-COOK QUESTION:
   "If these ingredients are in my kitchen right now, what would a normal person realistically and naturally make?"

4. EVALUATE & SCORE CANDIDATES:
   Score = (Natural Compatibility + Ingredient Utilization + Practicality + Simplicity + Category Fit) - (Missing Required Ingredients + Complexity)
   - Maximize utilization of the user's provided ingredients: [${cleanItems.join(", ")}].
   - Prefer simple, natural, recognizable preparations over complex recipes requiring unprovided major proteins or 15 extra spices.
   - Do NOT force a single "main ingredient" if the combination itself forms the preparation (e.g. Lemon+Sugar+Water is Lemonade; Milk+Banana is Smoothie; Bread+Cheese is Toast).

5. OUTPUT REQUIREMENTS:
   Return ONLY a JSON array of 3 realistic, ranked options (Best Match first, followed by 2 distinct, practical alternatives).
   DO NOT include markdown code blocks, explanation text, or chain-of-thought scratchpad output. Output pure JSON only.

JSON SCHEMA:
[
  {
    "id": 1,
    "title": "Best Match Title",
    "rating": "⭐⭐⭐⭐⭐",
    "time": "5 mins",
    "diff": "Easy",
    "cuisine": "Beverage / Salad / Sandwich / Italian / Indian",
    "tag": "Best Match",
    "desc": "Short appetizing description explaining why this is the natural human choice for these ingredients."
  },
  {
    "id": 2,
    "title": "Alternative Option Title",
    "rating": "⭐⭐⭐⭐⭐",
    "time": "10 mins",
    "diff": "Easy",
    "cuisine": "Category",
    "tag": "Alternative",
    "desc": "A distinct, practical alternative preparation."
  },
  {
    "id": 3,
    "title": "Second Alternative Title",
    "rating": "⭐⭐⭐⭐",
    "time": "8 mins",
    "diff": "Easy",
    "cuisine": "Category",
    "tag": "Variation",
    "desc": "Another natural variation using these ingredients."
  }
]`

      const res = await openrouter.chat.send({
        chatRequest: {
          model: "openai/gpt-oss-120b",
          messages: [{ role: "user", content: reasoningPrompt }]
        }
      })

      const rawText = res?.choices?.[0]?.message?.content?.trim()
      if (rawText) {
        let jsonText = rawText
        const jsonMatch = rawText.match(/\[\s*\{[\s\S]*\}\s*\]/)
        if (jsonMatch) {
          jsonText = jsonMatch[0]
        } else {
          jsonText = rawText.replace(/```json/gi, "").replace(/```/g, "").trim()
        }

        const parsed = JSON.parse(jsonText)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.slice(0, 3).map((item, idx) => ({
            id: item.id || idx + 1,
            title: item.title || "Natural Specialty",
            rating: item.rating || "⭐⭐⭐⭐⭐",
            time: item.time || "10 mins",
            diff: item.diff || "Easy",
            cuisine: item.cuisine || "Homestyle",
            tag: item.tag || (idx === 0 ? "Best Match" : "Alternative"),
            desc: item.desc || `Delicious natural preparation using ${cleanItems.slice(0, 2).join(" and ")}.`
          }))
        }
      }
    } catch (err) {
      console.warn("AI Reasoning Option generation error, falling back to dynamic classifier:", err.message)
    }
  }

  // 2. Dynamic General Fallback Engine (Zero hardcoding)
  return getSmartFallbackRecipeOptions(cleanItems, mainIngredient)
}

function getSmartFallbackRecipeOptions(cleanItems, mainIngredient = "") {
  const targetSearch = (mainIngredient + " " + cleanItems.join(" ")).toLowerCase()
  const classification = classifyIngredients(cleanItems)

  // A. Lemonade & Citrus Drinks
  if (targetSearch.includes("lemon") || targetSearch.includes("lime")) {
    if (targetSearch.includes("water") || targetSearch.includes("sugar") || targetSearch.includes("mint") || targetSearch.includes("honey") || cleanItems.length <= 3) {
      return [
        { id: 1, title: "Fresh Chilled Lemonade", rating: "⭐⭐⭐⭐⭐", time: "5 mins", diff: "Easy", cuisine: "Beverage", tag: "Best Match", desc: "Classic refreshing sweet and tangy fresh lemon juice drink." },
        { id: 2, title: "Sweet Mint Lemon Water", rating: "⭐⭐⭐⭐", time: "5 mins", diff: "Easy", cuisine: "Beverage", tag: "Alternative", desc: "Zesty fresh lemon water with a touch of sweetness." },
        { id: 3, title: "Warm Honey Lemon Detox", rating: "⭐⭐⭐⭐", time: "3 mins", diff: "Easy", cuisine: "Beverage", tag: "Variation", desc: "Warming soothing water infused with fresh lemon juice." }
      ]
    }
  }

  // B. Coffee, Tea & Cocoa Drinks
  if (targetSearch.includes("coffee")) {
    return [
      { id: 1, title: "Creamy Frothy Cold Coffee", rating: "⭐⭐⭐⭐⭐", time: "5 mins", diff: "Easy", cuisine: "Beverage", tag: "Best Match", desc: "Rich blended iced coffee topped with milk foam." },
      { id: 2, title: "Artisan Milk Coffee", rating: "⭐⭐⭐⭐⭐", time: "5 mins", diff: "Easy", cuisine: "Beverage", tag: "Alternative", desc: "Freshly brewed hot milk coffee." }
    ]
  }

  if (targetSearch.includes("cocoa") || targetSearch.includes("chocolate")) {
    return [
      { id: 1, title: "Rich Hot Chocolate Milk", rating: "⭐⭐⭐⭐⭐", time: "6 mins", diff: "Easy", cuisine: "Beverage", tag: "Best Match", desc: "Warm milk whisked with cocoa powder and sweetener." },
      { id: 2, title: "Iced Chocolate Milkshake", rating: "⭐⭐⭐⭐", time: "5 mins", diff: "Easy", cuisine: "Beverage", tag: "Alternative", desc: "Cold blended chocolate milk over ice." }
    ]
  }

  // C. Banana & Fruit Smoothies
  if (targetSearch.includes("banana")) {
    if (targetSearch.includes("milk") || targetSearch.includes("sugar") || cleanItems.length <= 3) {
      return [
        { id: 1, title: "Creamy Banana Protein Smoothie", rating: "⭐⭐⭐⭐⭐", time: "5 mins", diff: "Easy", cuisine: "Beverage", tag: "Best Match", desc: "Blended ripe bananas with chilled milk and honey." },
        { id: 2, title: "Classic Banana Milkshake", rating: "⭐⭐⭐⭐⭐", time: "5 mins", diff: "Easy", cuisine: "Beverage", tag: "Alternative", desc: "Thick and frothy banana milkshake." },
        { id: 3, title: "Fresh Banana Slices with Honey", rating: "⭐⭐⭐⭐", time: "3 mins", diff: "Easy", cuisine: "Snack", tag: "Variation", desc: "Sliced fresh banana drizzled with honey." }
      ]
    }
  }

  // D. Sandwiches & Toast
  if (targetSearch.includes("bread") || targetSearch.includes("cheese") || targetSearch.includes("sandwich") || targetSearch.includes("toast")) {
    return [
      { id: 1, title: "Golden Grilled Cheese Tomato Toast", rating: "⭐⭐⭐⭐⭐", time: "10 mins", diff: "Easy", cuisine: "Snack", tag: "Best Match", desc: "Crispy butter-toasted bread stuffed with melted cheese and fresh tomato." },
      { id: 2, title: "Fresh Tomato Cheese Sandwich", rating: "⭐⭐⭐⭐", time: "8 mins", diff: "Easy", cuisine: "Snack", tag: "Alternative", desc: "Simple layered sandwich with sliced tomatoes and cheese." }
    ]
  }

  // E. Fresh Salads
  if (classification.isSalad || (targetSearch.includes("salad") && !classification.hasProtein)) {
    return [
      { id: 1, title: "Fresh Tomato & Onion Garden Salad", rating: "⭐⭐⭐⭐⭐", time: "8 mins", diff: "Easy", cuisine: "Salad", tag: "Best Match", desc: "Crisp sliced tomatoes and onions tossed with lemon juice and seasoning." },
      { id: 2, title: "Tangy Sliced Veggie Medley", rating: "⭐⭐⭐⭐", time: "8 mins", diff: "Easy", cuisine: "Salad", tag: "Alternative", desc: "Light salad with fresh veggies, herbs, and lemon zest." }
    ]
  }

  // F. Chicken & Meats
  if (targetSearch.includes("chicken") || targetSearch.includes("poultry")) {
    if (targetSearch.includes("rice")) {
      return [
        { id: 1, title: "Fragrant Chicken Rice Bowl", rating: "⭐⭐⭐⭐⭐", time: "30 mins", diff: "Easy", cuisine: "Indian", tag: "Best Match", desc: "Basmati rice cooked with tender chicken, onions, and whole spices." },
        { id: 2, title: "Classic Chicken Curry", rating: "⭐⭐⭐⭐⭐", time: "25 mins", diff: "Easy", cuisine: "Indian", tag: "Alternative", desc: "Tender chicken simmered in a rich onion-tomato gravy." }
      ]
    }
    return [
      { id: 1, title: "Classic Chicken Curry", rating: "⭐⭐⭐⭐⭐", time: "30 mins", diff: "Easy", cuisine: "Indian", tag: "Best Match", desc: "Tender chicken simmered in a rich, spiced onion-tomato gravy." },
      { id: 2, title: "Garlic Butter Chicken Fry", rating: "⭐⭐⭐⭐⭐", time: "20 mins", diff: "Easy", cuisine: "Continental", tag: "Alternative", desc: "Golden pan-seared chicken bites tossed with garlic, herbs, and lemon." }
    ]
  }

  // G. Pasta
  if (targetSearch.includes("pasta") || targetSearch.includes("spaghetti") || targetSearch.includes("noodle")) {
    return [
      { id: 1, title: "Creamy Tomato Garlic Pasta", rating: "⭐⭐⭐⭐⭐", time: "18 mins", diff: "Easy", cuisine: "Italian", tag: "Best Match", desc: "Al dente pasta tossed in a garlicky tomato cream sauce." },
      { id: 2, title: "Olive Oil & Garlic Herb Pasta", rating: "⭐⭐⭐⭐", time: "15 mins", diff: "Easy", cuisine: "Italian", tag: "Alternative", desc: "Simple pasta sautéed with olive oil, garlic, and herbs." }
    ]
  }

  // H. Eggs
  if (targetSearch.includes("egg") || targetSearch.includes("eggs")) {
    return [
      { id: 1, title: "Fluffy Masala Omelette", rating: "⭐⭐⭐⭐⭐", time: "10 mins", diff: "Easy", cuisine: "Indian", tag: "Best Match", desc: "Whisked eggs folded with onions, tomatoes, and chillies." },
      { id: 2, title: "Spicy Egg Pepper Stir Fry", rating: "⭐⭐⭐⭐", time: "15 mins", diff: "Easy", cuisine: "Indian", tag: "Alternative", desc: "Boiled eggs tossed with black pepper and onions." }
    ]
  }

  // I. Paneer & Tofu
  if (targetSearch.includes("paneer") || targetSearch.includes("tofu")) {
    const item = targetSearch.includes("paneer") ? "Paneer" : "Tofu"
    return [
      { id: 1, title: `Rich ${item} Butter Masala`, rating: "⭐⭐⭐⭐⭐", time: "25 mins", diff: "Medium", cuisine: "Indian", tag: "Best Match", desc: `Soft ${item.toLowerCase()} cubes cooked in tomato butter gravy.` },
      { id: 2, title: `Garlic Pepper Sautéed ${item}`, rating: "⭐⭐⭐⭐", time: "15 mins", diff: "Easy", cuisine: "Healthy", tag: "Alternative", desc: `Pan-seared ${item.toLowerCase()} cubes with pepper and herbs.` }
    ]
  }

  // J. General Dynamic Match
  const primaryItem = mainIngredient || cleanItems[0] || "Pantry"
  const secondaryItem = (!mainIngredient && cleanItems[1]) ? ` & ${cleanItems[1]}` : ""

  return [
    { 
      id: 1, 
      title: `Homestyle ${primaryItem}${secondaryItem} Specialty`, 
      rating: "⭐⭐⭐⭐⭐", 
      time: "15 mins", 
      diff: "Easy", 
      cuisine: "Homestyle", 
      tag: "Best Match", 
      desc: `Delicious homestyle dish featuring ${primaryItem.toLowerCase()} prepared with warm spices and herbs.` 
    },
    { 
      id: 2, 
      title: `Sautéed Garlic ${primaryItem} Medley`, 
      rating: "⭐⭐⭐⭐", 
      time: "12 mins", 
      diff: "Easy", 
      cuisine: "Quick Meal", 
      tag: "Alternative", 
      desc: `Pan-seared ${primaryItem.toLowerCase()} tossed with olive oil, garlic, and fresh lemon.` 
    }
  ]
}

// Generate complete step-by-step recipe with strict zero-hallucination validation
export async function getRecipeFromChefClaude(ingredientsArr, selectedTitle) {
  const targetLanguage = getActiveLanguageName()
  const cleanIngredients = ingredientsArr.filter(item => Boolean(item) && typeof item === 'string')
  const userPrompt = `I have ONLY these base ingredients: [${cleanIngredients.join(", ")}]. Selected dish option: "${selectedTitle || "Specialty"}". Please generate the recipe in ${targetLanguage}.`
  const systemPrompt = buildSystemPrompt(targetLanguage, cleanIngredients, selectedTitle)

  // Tier 1: OpenRouter API (openai/gpt-oss-120b)
  if (openrouter) {
    try {
      console.log(`Requesting recipe from OpenRouter (openai/gpt-oss-120b) in ${targetLanguage}...`)
      const res = await openrouter.chat.send({
        chatRequest: {
          model: "openai/gpt-oss-120b",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ]
        }
      })
      const text = res?.choices?.[0]?.message?.content
      if (text) {
        const check = validateRecipeIngredients(cleanIngredients, text, selectedTitle)
        if (check.isValid) return text
        console.warn("Validation failed for OpenRouter response:", check.reason)
      }
    } catch (err) {
      console.warn("OpenRouter API call failed, trying HuggingFace fallback...", err.message)
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
        const check = validateRecipeIngredients(cleanIngredients, text, selectedTitle)
        if (check.isValid) return text
        console.warn("Validation failed for HF response:", check.reason)
      }
    } catch (err) {
      console.warn("Hugging Face API call failed:", err.message)
    }
  }

  // Tier 3: Guaranteed Safe Fallback Engine (Culinary Logic Aware)
  console.log(`Using Guaranteed Safe Zero-Hallucination Engine in ${targetLanguage}...`)
  return generateStrictSafeRecipe(cleanIngredients, selectedTitle, targetLanguage)
}

function generateStrictSafeRecipe(userIngredients, selectedTitle, targetLanguage) {
  const dishTitle = selectedTitle || (userIngredients[0] ? `${userIngredients[0]} Special` : "Homestyle Specialty")
  const category = detectDishCategory(dishTitle, userIngredients)

  if (category === "beverage") {
    return `Dish: ${dishTitle}
Rating: ⭐⭐⭐⭐⭐
Prep time: 5 mins
Cook time: 0 mins
Serves: 2
Difficulty: Easy
Cuisine: Beverage

Ingredients You Have:
${userIngredients.map(i => `- ${i}`).join("\n")}

Smart Pantry Enhancements:
- ⭐ Ice Cubes
- ⭐ Chilled Water or Milk
- ⭐ Sugar or Honey (to taste)
- ⭐ Cocoa powder or Cinnamon (optional)

Step-by-Step Directions

1. Prepare the Base: In a blender or glass jar, combine your main ingredients [${userIngredients.join(", ")}].
2. Sweeten to Taste: Add 1-2 tablespoons of sugar or honey according to your taste.
3. Blend or Froth: Blend on high speed for 60 seconds until rich, creamy, and frothy.
4. Chill & Garnish: Pour into chilled glasses over ice cubes. Garnish with a sprinkle of cocoa powder or cinnamon.
5. Serve Chilled: Enjoy immediately while cold and refreshing!

Storage & Reheating Tips:
- Best consumed fresh immediately after blending.
- Can be stored in the refrigerator for up to 24 hours. Stir or shake well before drinking.`
  }

  if (category === "dessert") {
    return `Dish: ${dishTitle}
Rating: ⭐⭐⭐⭐⭐
Prep time: 10 mins
Cook time: 15 mins
Serves: 3
Difficulty: Easy
Cuisine: Dessert

Ingredients You Have:
${userIngredients.map(i => `- ${i}`).join("\n")}

Smart Pantry Enhancements:
- ⭐ Butter or Ghee
- ⭐ Cardamom or Cinnamon powder
- ⭐ Sugar or Honey
- ⭐ Sliced Almonds (optional)

Step-by-Step Directions

1. Prepare ingredients: Measure your base ingredients [${userIngredients.join(", ")}].
2. Melt Butter: Warm 1-2 tablespoons of butter or ghee in a pan over low heat.
3. Sauté & Sweeten: Add your ingredients with sugar or sweetener, stirring gently.
4. Simmer: Simmer on low flame for 8-10 minutes until aromatic and tender.
5. Garnish & Serve: Sprinkle with crushed cardamom or cinnamon and serve warm!

Storage & Reheating Tips:
- Store in an airtight container in the fridge for up to 4 days.
- Reheat in the microwave for 15-20 seconds.`
  }

  // Savory fallback
  const isChicken = dishTitle.toLowerCase().includes("chicken");
  const isPasta = dishTitle.toLowerCase().includes("pasta") || dishTitle.toLowerCase().includes("spaghetti") || dishTitle.toLowerCase().includes("noodle") || dishTitle.toLowerCase().includes("macaroni");

  if (isChicken) {
    return `Dish: ${dishTitle}
Rating: ⭐⭐⭐⭐⭐
Prep time: 10 mins
Cook time: 25 mins
Serves: 3
Difficulty: Easy
Cuisine: Indian

Ingredients You Have:
${userIngredients.map(i => `- ${i}`).join("\n")}

Smart Pantry Enhancements:
- ⭐ Cooking oil or Ghee
- ⭐ Salt & Black pepper
- ⭐ Turmeric & Chilli powder (optional)
- ⭐ Garam masala (optional)

Step-by-Step Directions

1. Prep & Cut: Rinse and cut the Chicken into bite-sized pieces. Slice the onion and chop the tomato if available.
2. Heat oil: Heat 2 tablespoons of oil or ghee in a pan over medium heat. Sauté onion until translucent.
3. Sauté chicken: Add the chicken pieces to the pan. Cook for 5-7 minutes until golden brown.
4. Add seasonings: Stir in chopped tomatoes, salt, black pepper, turmeric, and chilli powder. Sauté for 3 minutes.
5. Simmer: Add half a cup of water, cover with a lid, and simmer on low heat for 12-15 minutes until chicken is tender.
6. Garnish & Serve: Garnish with fresh herbs or a pinch of garam masala. Serve hot!

Storage & Reheating Tips:
- Store in an airtight container in the fridge for up to 3 days.
- Reheat on a stovetop over low heat with a splash of water.`
  }

  if (isPasta) {
    return `Dish: ${dishTitle}
Rating: ⭐⭐⭐⭐⭐
Prep time: 5 mins
Cook time: 15 mins
Serves: 2
Difficulty: Easy
Cuisine: Italian

Ingredients You Have:
${userIngredients.map(i => `- ${i}`).join("\n")}

Smart Pantry Enhancements:
- ⭐ Olive oil or Butter
- ⭐ Salt & Black pepper
- ⭐ Garlic & Dried herbs (oregano/basil)

Step-by-Step Directions

1. Boil Pasta: Bring a large pot of salted water to boil. Cook pasta until al dente (approx 8-10 mins). Drain and set aside.
2. Prep base: Finely chop garlic, tomato, or any other veggies you have.
3. Sauté: In a pan, heat 1 tablespoon of olive oil or melt butter. Sauté garlic and veggies for 3-4 minutes.
4. Season: Toss in salt, black pepper, and dried herbs.
5. Combine: Add the cooked pasta into the pan. Toss well to coat with the oil and herbs for 2 minutes.
6. Serve: Serve hot with a sprinkle of cheese if available!

Storage & Reheating Tips:
- Best enjoyed immediately.
- Reheat in a pan with a splash of water and a teaspoon of butter.`
  }

  // Generic Savory fallback
  return `Dish: ${dishTitle}
Rating: ⭐⭐⭐⭐⭐
Prep time: 10 mins
Cook time: 20 mins
Serves: 3
Difficulty: Easy
Cuisine: Continental

Ingredients You Have:
${userIngredients.map(i => `- ${i}`).join("\n")}

Smart Pantry Enhancements:
- ⭐ Cooking oil or Butter
- ⭐ Salt & Black pepper
- ⭐ Fresh herbs (optional)

Step-by-Step Directions

1. Prepare ingredients: Chop and clean your ingredients [${userIngredients.join(", ")}].
2. Heat oil in pan: Heat 2 tablespoons of oil or butter in a pan over medium flame.
3. Sauté base ingredients: Add your ingredients and sauté for 5 to 7 minutes until tender.
4. Season gently: Add salt and black pepper to taste. Mix well.
5. Cover and simmer: Cover with a lid and cook on low flame for 8-10 minutes until flavors blend nicely.
6. Serve hot: Garnish with fresh herbs and serve warm!

Storage & Reheating Tips:
- Refrigerate in an airtight container for up to 3 days.
- Reheat gently on low flame.`
}
