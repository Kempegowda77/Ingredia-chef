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

// Smart Dish Category Classifier
export function detectDishCategory(title = "", userIngredients = []) {
  const combined = (title + " " + userIngredients.join(" ")).toLowerCase()
  if (
    combined.includes("coffee") ||
    combined.includes("tea") ||
    combined.includes("chai") ||
    combined.includes("smoothie") ||
    combined.includes("shake") ||
    combined.includes("beverage") ||
    combined.includes("drink") ||
    combined.includes("juice") ||
    combined.includes("lassi") ||
    combined.includes("lemonade") ||
    combined.includes("hot chocolate") ||
    combined.includes("milkshake")
  ) {
    return "beverage"
  }
  if (
    combined.includes("cake") ||
    combined.includes("pancake") ||
    combined.includes("kheer") ||
    combined.includes("halwa") ||
    combined.includes("pudding") ||
    combined.includes("dessert") ||
    combined.includes("sweet")
  ) {
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
You are Ingredia Executive Chef AI, a world-class culinary expert with deep human-like intelligence.
Generate authentic, delicious, logically sound recipes.

${categoryDirective}

# STRICT ZERO-HALLUCINATION RULE (MANDATORY)
The user has provided ONLY these ingredients: [${userIngredientsArr.join(", ")}].
You MUST NOT add or invent any major protein or ingredient (such as Chicken, Paneer, Egg, Fish, Mutton, Meat) unless it is explicitly listed in [${userIngredientsArr.join(", ")}].

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

// Generate Recipe Options based on ingredients & optional main ingredient
export async function getRecipeOptionsFromChefClaude(ingredientsArr, mainIngredient = "") {
  const cleanItems = ingredientsArr.filter(item => Boolean(item) && typeof item === 'string')
  if (cleanItems.length === 0) return []

  const targetSearch = mainIngredient ? mainIngredient.toLowerCase() : cleanItems.map(i => i.toLowerCase()).join(" ")

  // 1. Chicken & Poultry
  if (targetSearch.includes("chicken") || targetSearch.includes("poultry")) {
    return [
      { id: 1, title: "Classic Chicken Curry", rating: "⭐⭐⭐⭐⭐", time: "30 mins", diff: "Easy", cuisine: "Indian", tag: "Protein Rich", desc: "Tender chicken simmered in a rich, spiced onion-tomato gravy." },
      { id: 2, title: "Garlic Butter Chicken Fry", rating: "⭐⭐⭐⭐⭐", time: "20 mins", diff: "Easy", cuisine: "Continental", tag: "Quick & Crispy", desc: "Golden pan-seared chicken bites tossed with garlic, herbs, and lemon." },
      { id: 3, title: "Spicy Chicken Masala", rating: "⭐⭐⭐⭐", time: "25 mins", diff: "Medium", cuisine: "Indian", tag: "Spicy Gravy", desc: "Thick masala gravy infused with aromatic whole spices." }
    ]
  }

  // 2. Pasta & Noodles
  if (targetSearch.includes("pasta") || targetSearch.includes("spaghetti") || targetSearch.includes("noodle") || targetSearch.includes("macaroni")) {
    return [
      { id: 1, title: "Creamy Tomato Garlic Pasta", rating: "⭐⭐⭐⭐⭐", time: "18 mins", diff: "Easy", cuisine: "Italian", tag: "Comfort Food", desc: "Al dente pasta tossed in a rich, garlicky tomato cream sauce." },
      { id: 2, title: "Olive Oil & Garlic Herb Pasta", rating: "⭐⭐⭐⭐", time: "15 mins", diff: "Easy", cuisine: "Italian", tag: "Quick Meal", desc: "Simple yet delicious pasta sautéed with olive oil, garlic, and herbs." },
      { id: 3, title: "Cheesy Baked Pasta", rating: "⭐⭐⭐⭐⭐", time: "22 mins", diff: "Medium", cuisine: "Italian", tag: "Cheesy Delight", desc: "Oven-baked pasta loaded with melted cheese and fresh herbs." }
    ]
  }

  // 3. Eggs
  if (targetSearch.includes("egg") || targetSearch.includes("eggs")) {
    return [
      { id: 1, title: "Fluffy Masala Omelette", rating: "⭐⭐⭐⭐⭐", time: "10 mins", diff: "Easy", cuisine: "Indian", tag: "High Protein", desc: "Whisked eggs folded with finely chopped onions, tomatoes, and green chillies." },
      { id: 2, title: "Spicy Egg Pepper Stir Fry", rating: "⭐⭐⭐⭐", time: "15 mins", diff: "Easy", cuisine: "Indian", tag: "Quick & Savory", desc: "Hard-boiled eggs tossed with crushed black pepper, onions, and curry leaves." },
      { id: 3, title: "Classic Scrambled Egg Toast", rating: "⭐⭐⭐⭐", time: "8 mins", diff: "Easy", cuisine: "Breakfast", tag: "Quick Breakfast", desc: "Soft scrambled eggs served over toasted bread with herbs." }
    ]
  }

  // 4. Bread & Cheese / Sandwiches
  if (targetSearch.includes("bread") || targetSearch.includes("cheese") || targetSearch.includes("sandwich") || targetSearch.includes("toast")) {
    return [
      { id: 1, title: "Golden Grilled Cheese Toast", rating: "⭐⭐⭐⭐⭐", time: "10 mins", diff: "Easy", cuisine: "Continental", tag: "Cheesy & Crispy", desc: "Crispy butter-toasted bread stuffed with gooey melted cheese and herbs." },
      { id: 2, title: "Garlic Butter Cheese Toast", rating: "⭐⭐⭐⭐⭐", time: "12 mins", diff: "Easy", cuisine: "Continental", tag: "Garlic Delight", desc: "Toasted bread brushed with garlic butter and melted cheese." },
      { id: 3, title: "Fresh Tomato Cheese Sandwich", rating: "⭐⭐⭐⭐", time: "8 mins", diff: "Easy", cuisine: "Quick Snack", tag: "Fresh & Healthy", desc: "Layered fresh sliced tomatoes, cheese, and a sprinkle of black pepper." }
    ]
  }

  // 5. Coffee, Tea & Beverages
  if (targetSearch.includes("coffee") || targetSearch.includes("milk") || targetSearch.includes("tea") || targetSearch.includes("chai")) {
    return [
      { id: 1, title: "Creamy Frothy Cold Coffee", rating: "⭐⭐⭐⭐⭐", time: "5 mins", diff: "Easy", cuisine: "Beverage", tag: "Chilled Refreshment", desc: "Rich blended iced coffee topped with fluffy milk foam and cocoa." },
      { id: 2, title: "Artisan South Indian Filter Coffee", rating: "⭐⭐⭐⭐⭐", time: "6 mins", diff: "Easy", cuisine: "Beverage", tag: "Morning Energy", desc: "Strong decoction simmered with hot milk and caramelized sugar." },
      { id: 3, title: "Spiced Masala Milk Chai", rating: "⭐⭐⭐⭐", time: "8 mins", diff: "Easy", cuisine: "Beverage", tag: "Warming Drink", desc: "Fresh milk brewed with crushed ginger, cardamom, and tea leaves." }
    ]
  }

  // 6. Banana, Fruits & Smoothies
  if (targetSearch.includes("banana") || targetSearch.includes("apple") || targetSearch.includes("mango") || targetSearch.includes("berry") || targetSearch.includes("fruit")) {
    return [
      { id: 1, title: "Creamy Banana Protein Smoothie", rating: "⭐⭐⭐⭐⭐", time: "5 mins", diff: "Easy", cuisine: "Beverage", tag: "Healthy Energy", desc: "Blended ripe bananas with milk, honey, and a pinch of cinnamon." },
      { id: 2, title: "Caramelized Honey Banana Delight", rating: "⭐⭐⭐⭐", time: "10 mins", diff: "Easy", cuisine: "Dessert", tag: "Sweet Treat", desc: "Pan-caramelized banana slices drizzled with honey and warm spices." }
    ]
  }

  // 7. Broccoli & Vegetables / Salads
  if (targetSearch.includes("broccoli") || targetSearch.includes("salad") || targetSearch.includes("cucumber") || targetSearch.includes("lettuce")) {
    return [
      { id: 1, title: "Garlic Sautéed Broccoli & Veggies", rating: "⭐⭐⭐⭐⭐", time: "12 mins", diff: "Easy", cuisine: "Healthy", tag: "Superfood", desc: "Tender broccoli florets sautéed with olive oil, minced garlic, and pepper." },
      { id: 2, title: "Fresh Garden Veggie Salad", rating: "⭐⭐⭐⭐", time: "8 mins", diff: "Easy", cuisine: "Salad", tag: "Low Calorie", desc: "Crisp garden vegetables tossed with lemon juice, olive oil, and herbs." }
    ]
  }

  // 8. Rice & Pulao
  if (targetSearch.includes("rice") || targetSearch.includes("pulao") || targetSearch.includes("biryani")) {
    return [
      { id: 1, title: "Fragrant Vegetable Pulao", rating: "⭐⭐⭐⭐⭐", time: "25 mins", diff: "Easy", cuisine: "Indian", tag: "Aromatic Grain", desc: "Basmati rice cooked with whole spices, ghee, and fresh vegetables." },
      { id: 2, title: "Quick Garlic Butter Fried Rice", rating: "⭐⭐⭐⭐", time: "15 mins", diff: "Easy", cuisine: "Asian", tag: "Quick & Flavorful", desc: "Fluffy rice tossed with golden fried garlic, vegetables, and soy seasoning." }
    ]
  }

  // 9. Paneer & Tofu
  if (targetSearch.includes("paneer") || targetSearch.includes("tofu")) {
    const item = targetSearch.includes("paneer") ? "Paneer" : "Tofu"
    return [
      { id: 1, title: `Rich ${item} Butter Masala`, rating: "⭐⭐⭐⭐⭐", time: "25 mins", diff: "Medium", cuisine: "Indian", tag: "Creamy Gravy", desc: `Soft ${item.toLowerCase()} cubes cooked in a silky tomato butter gravy.` },
      { id: 2, title: `Garlic Pepper Sautéed ${item}`, rating: "⭐⭐⭐⭐", time: "15 mins", diff: "Easy", cuisine: "Healthy", tag: "High Protein", desc: `Crispy golden ${item.toLowerCase()} cubes pan-sear with pepper and herbs.` }
    ]
  }

  // 10. Default Dynamic Match based on Primary Main Ingredient
  const primaryItem = mainIngredient || cleanItems[0] || "Pantry"
  const secondaryItem = (!mainIngredient && cleanItems[1]) ? ` & ${cleanItems[1]}` : ""

  return [
    { 
      id: 1, 
      title: `Homestyle ${primaryItem}${secondaryItem} Curry`, 
      rating: "⭐⭐⭐⭐⭐", 
      time: "20 mins", 
      diff: "Easy", 
      cuisine: "Indian", 
      tag: "Hero Dish", 
      desc: `Delicious homestyle dish featuring ${primaryItem.toLowerCase()} cooked with onions, tomatoes, and warm spices.` 
    },
    { 
      id: 2, 
      title: `Sautéed Garlic ${primaryItem} Medley`, 
      rating: "⭐⭐⭐⭐", 
      time: "12 mins", 
      diff: "Easy", 
      cuisine: "Quick Meal", 
      tag: "Healthy & Quick", 
      desc: `Pan-seared ${primaryItem.toLowerCase()} tossed with olive oil, minced garlic, pepper, and fresh lemon.` 
    }
  ]
}

// Generate complete step-by-step recipe with strict zero-hallucination validation
export async function getRecipeFromChefClaude(ingredientsArr, selectedTitle) {
  const targetLanguage = getActiveLanguageName()
  const cleanIngredients = ingredientsArr.filter(item => Boolean(item) && typeof item === 'string')
  const userPrompt = `I have ONLY these base ingredients: [${cleanIngredients.join(", ")}]. Selected dish option: "${selectedTitle || "Specialty"}". Please generate the recipe in ${targetLanguage}.`
  const systemPrompt = buildSystemPrompt(targetLanguage, cleanIngredients, selectedTitle)

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
        const check = validateRecipeIngredients(cleanIngredients, text, selectedTitle)
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
