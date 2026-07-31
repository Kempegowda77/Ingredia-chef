import React from "react"
import { useTranslation } from "react-i18next"
import { 
  Search, Sparkles, Plus, Check, X, Clock, Flame, 
  ChevronLeft, ChevronRight, Heart, AlertCircle, RotateCcw, Utensils, UtensilsCrossed 
} from "lucide-react"

import { getRecipeOptionsFromChefClaude, getRecipeFromChefClaude } from "../ai"
import { sanitizeHTML, safeGetLocalStorage } from "../security"
import DishChicken3D from "../assets/dish_chicken_3d.png"
import DishPasta3D from "../assets/dish_pasta_3d.png"
import DishSalad3D from "../assets/dish_salad_3d.png"
import DishCurry3D from "../assets/dish_curry_3d.png"
import DishPizza3D from "../assets/dish_pizza_3d.png"
import DishVeggie3D from "../assets/dish_veggie_3d.png"
import DishBeverage3D from "../assets/dish_beverage_3d.png"
import DishSmoothie3D from "../assets/dish_smoothie_3d.png"

export default function Home() {
  const { t } = useTranslation()
  const [Ingred, setIngred] = React.useState(["Chicken", "Onion", "Tomato"])
  const [inputValue, setInputValue] = React.useState("")
  const [showSuggestions, setShowSuggestions] = React.useState(false)
  const [loadingOptions, setLoadingOptions] = React.useState(false)
  const [loadingRecipe, setLoadingRecipe] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState("")
  const [activeCategory, setActiveCategory] = React.useState("all")
  
  // State pipeline: "input" -> "options" -> "recipe" -> "cooking" -> "finished"
  const [viewState, setViewState] = React.useState("input") 
  const [recipeOptions, setRecipeOptions] = React.useState([])
  const [selectedOption, setSelectedOption] = React.useState(null)
  const [recipeText, setRecipeText] = React.useState("")
  const [savedRecipes, setSavedRecipes] = React.useState([])
  const [historyList, setHistoryList] = React.useState([])
  
  // Guided Cooking Player state
  const [currentStepIdx, setCurrentStepIdx] = React.useState(0)

  // Load saved & history from localStorage
  React.useEffect(() => {
    const saved = safeGetLocalStorage('ingredia_saved');
    const history = safeGetLocalStorage('ingredia_history');
    setSavedRecipes(saved);
    setHistoryList(history);
  }, [])

  // Save to history helper
  function saveToHistory(option, recipeContent) {
    try {
      const history = JSON.parse(localStorage.getItem('ingredia_history') || '[]')
      const newEntry = {
        id: Date.now(),
        title: option.title,
        cuisine: option.cuisine,
        time: option.time,
        rating: option.rating,
        diff: option.diff,
        ingredients: [...Ingred],
        recipeText: recipeContent,
        timestamp: new Date().toLocaleString()
      }
      const updated = [newEntry, ...history.filter(h => h.title !== option.title)].slice(0, 30)
      setHistoryList(updated)
      localStorage.setItem('ingredia_history', JSON.stringify(updated))
    } catch (e) {
      console.warn('Failed to save to history:', e)
    }
  }

  // Suggestions Database
  const allSuggestionsDatabase = [
    "Chicken", "Onion", "Tomato", "Garlic", "Ginger", "Potato", "Rice", "Pasta", 
    "Bread", "Cheese", "Butter", "Coffee", "Milk", "Sugar", "Banana", "Strawberry", 
    "Broccoli", "Capsicum", "Carrot", "Egg", "Lemon", "Coriander", "Cumin", "Turmeric"
  ]

  const autocompleteList = inputValue.trim() 
    ? allSuggestionsDatabase.filter(s => 
        s.toLowerCase().includes(inputValue.toLowerCase()) && !Ingred.includes(s)
      ).slice(0, 6)
    : []

  // Categories Filter
  const categories = [
    { id: "all", label: t('categories.all') },
    { id: "mains", label: t('categories.mains') },
    { id: "beverage", label: t('categories.beverage') },
    { id: "smoothie", label: t('categories.smoothie') },
    { id: "breakfast", label: t('categories.breakfast') },
    { id: "pasta", label: t('categories.pasta') },
  ]

  // Popular Ingredients Chips
  const quickPills = [
    { name: "Chicken", emoji: "🥩" },
    { name: "Onion", emoji: "🧅" },
    { name: "Tomato", emoji: "🍅" },
    { name: "Garlic", emoji: "🧄" },
    { name: "Bread", emoji: "🍞" },
    { name: "Coffee", emoji: "☕" },
    { name: "Banana", emoji: "🍌" },
    { name: "Broccoli", emoji: "🥦" },
    { name: "Cheese", emoji: "🧀" },
    { name: "Egg", emoji: "🥚" }
  ]

  function handleAddIngredient(e) {
    if (e) e.preventDefault()
    if (!inputValue.trim()) return

    const newItems = inputValue
      .split(",")
      .map(item => sanitizeHTML(item.trim()))
      .filter(item => item.length > 0 && !Ingred.includes(item))

    if (newItems.length > 0) {
      setIngred(prev => [...prev, ...newItems])
    }
    setInputValue("")
    setShowSuggestions(false)
    setErrorMessage("")
  }

  function handleSelectSuggestion(item) {
    if (!Ingred.includes(item)) {
      setIngred(prev => [...prev, item])
    }
    setInputValue("")
    setShowSuggestions(false)
  }

  function toggleQuickPill(itemName) {
    if (Ingred.includes(itemName)) {
      setIngred(prev => prev.filter(i => i !== itemName))
    } else {
      setIngred(prev => [...prev, itemName])
    }
    setErrorMessage("")
  }

  function removeIngredient(indexToRemove) {
    setIngred(prev => prev.filter((_, index) => index !== indexToRemove))
  }

  function handleTryExample(exampleStr) {
    const items = exampleStr.split(",").map(s => s.trim())
    setIngred(items)
    setErrorMessage("")
  }

  // Fetch Recipe Options
  async function handleFindRecipeOptions() {
    if (Ingred.length === 0) return
    setLoadingOptions(true)
    setErrorMessage("")
    setViewState("options")
    try {
      const options = await getRecipeOptionsFromChefClaude(Ingred)
      setRecipeOptions(options)
    } catch (err) {
      console.error("Error fetching recipe options:", err)
      setErrorMessage("Unable to fetch recipe recommendations right now. Please try again.")
    } finally {
      setLoadingOptions(false)
    }
  }

  // Fetch Full Recipe for selected option
  async function handleSelectRecipeOption(option) {
    setSelectedOption(option)
    setLoadingRecipe(true)
    setErrorMessage("")
    setViewState("recipe")
    try {
      const fullRecipe = await getRecipeFromChefClaude(Ingred, option.title)
      setRecipeText(fullRecipe)
      saveToHistory(option, fullRecipe)
    } catch (err) {
      console.error("Error fetching full recipe:", err)
      setErrorMessage("Failed to generate recipe steps. Please tap retry.")
    } finally {
      setLoadingRecipe(false)
    }
  }

  function toggleSaveRecipe(option, e) {
    if (e) e.stopPropagation()
    let updated = []
    if (savedRecipes.some(r => r.id === option.id)) {
      updated = savedRecipes.filter(r => r.id !== option.id)
    } else {
      updated = [...savedRecipes, option]
    }
    setSavedRecipes(updated)
    localStorage.setItem('ingredia_saved', JSON.stringify(updated))
  }

  function handleStartCooking() {
    setCurrentStepIdx(0)
    setViewState("cooking")
  }

  // Parse ingredient split
  function parseIngredientLists() {
    if (!recipeText) return { userHave: Ingred, aiAdded: [] }
    
    const lines = recipeText.split("\n")
    const aiAddedIdx = lines.findIndex(l => l.includes("Smart Pantry Enhancements:"))
    const stepsIdx = lines.findIndex(l => l.includes("Step-by-Step Directions"))

    let aiItems = []
    if (aiAddedIdx !== -1) {
      const end = stepsIdx !== -1 ? stepsIdx : lines.length
      aiItems = lines.slice(aiAddedIdx + 1, end)
        .filter(l => l.trim().startsWith("- "))
        .map(l => l.trim().replace(/^-\s*⭐?\s*/, ""))
    }

    return {
      userHave: Ingred,
      aiAdded: aiItems.length > 0 ? aiItems : ["Cooking Oil", "Salt", "Black Pepper", "Turmeric Powder", "Garam Masala"]
    }
  }

  // Parse dynamic steps
  function parseRecipeSteps() {
    if (!recipeText) return []
    const lines = recipeText.split("\n")
    const stepsStartIdx = lines.findIndex(l => l.includes("Step-by-Step Directions"))
    const storageIdx = lines.findIndex(l => l.includes("Storage & Reheating Tips:"))
    
    const stepLines = lines.slice(
      stepsStartIdx !== -1 ? stepsStartIdx + 1 : 0,
      storageIdx !== -1 ? storageIdx : lines.length
    ).filter(l => /^\d+\.\s/.test(l.trim()))

    return stepLines.map(line => {
      const clean = line.trim().replace(/^\d+\.\s*/, "").replace(/\*\*/g, "")
      const colonIdx = clean.indexOf(":")
      if (colonIdx !== -1) {
        return {
          title: clean.substring(0, colonIdx).trim(),
          body: clean.substring(colonIdx + 1).trim()
        }
      }
      return { title: "Cooking Action", body: clean }
    })
  }

  function getDishImage(title) {
    const term = (title || "").toLowerCase()
    if (term.includes("coffee") || term.includes("tea") || term.includes("chai")) return DishBeverage3D
    if (term.includes("smoothie") || term.includes("shake")) return DishSmoothie3D
    if (term.includes("chicken") || term.includes("poultry") || term.includes("fry")) return DishChicken3D
    if (term.includes("pasta") || term.includes("spaghetti")) return DishPasta3D
    if (term.includes("salad")) return DishSalad3D
    if (term.includes("curry") || term.includes("soup") || term.includes("masala") || term.includes("pulao")) return DishCurry3D
    if (term.includes("pizza") || term.includes("bake")) return DishPizza3D
    return DishVeggie3D
  }

  const ingredientLists = parseIngredientLists()
  const recipeSteps = parseRecipeSteps()
  const currentDishImg = getDishImage(selectedOption ? selectedOption.title : Ingred.join(" "))

  return (
    <main className="main-content">

      {/* ERROR CARD COMPONENT */}
      {errorMessage && (
        <div className="layout-single-column mb-6">
          <div className="split-card error-card-glass">
            <div className="error-header-row">
              <AlertCircle size={22} color="#EF4444" />
              <h4>Error Encountered</h4>
            </div>
            <p>{errorMessage}</p>
            <button className="btn-primary-add" onClick={handleFindRecipeOptions}>
              <RotateCcw size={16} /> Retry
            </button>
          </div>
        </div>
      )}

      {/* SECTION 1: HERO & INGREDIENT INPUT VIEW */}
      {viewState === "input" && (
        <div className="hero-studio-container">
          
          {/* HERO HEADER */}
          <div className="hero-banner">
            <div className="hero-badge-pill">
              <Sparkles size={14} /> {t('hero.badge')}
            </div>
            <h1 className="hero-headline">{t('hero.headline')}</h1>
            <p className="hero-subheadline">
              {t('hero.subheadline')}
            </p>

            {/* INTERACTIVE SEARCH INPUT WITH AUTOCOMPLETE */}
            <div className="search-input-wrapper">
              <form onSubmit={handleAddIngredient} className="search-box-glass">
                <Search size={20} color="#6B7280" />
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value)
                    setShowSuggestions(true)
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder={t('hero.searchPlaceholder')}
                  className="search-input-field"
                  aria-label="Search ingredients"
                />
                <button type="submit" className="btn-primary-add">
                  <Plus size={16} /> {t('hero.addButton')}
                </button>
              </form>

              {/* AUTOCOMPLETE SUGGESTIONS DROPDOWN */}
              {showSuggestions && autocompleteList.length > 0 && (
                <div className="autocomplete-dropdown">
                  {autocompleteList.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="autocomplete-item"
                      onClick={() => handleSelectSuggestion(item)}
                    >
                      <Plus size={14} color="#22C55E" />
                      <span>{item}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* TRY EXAMPLES */}
            <div className="try-prompts-row">
              <span className="try-label">{t('hero.tryLabel')}</span>
              <button className="try-pill-btn" onClick={() => handleTryExample("Chicken, Rice, Tomato")}>
                🍗 Chicken, Rice, Tomato
              </button>
              <button className="try-pill-btn" onClick={() => handleTryExample("Milk, Coffee, Sugar")}>
                ☕ Milk, Coffee, Sugar
              </button>
              <button className="try-pill-btn" onClick={() => handleTryExample("Pasta, Garlic, Olive oil")}>
                🍝 Pasta, Garlic, Olive oil
              </button>
            </div>
          </div>

          {/* CATEGORY BAR */}
          <div className="categories-pill-bar">
            {categories.map((cat) => (
              <button
                key={cat.id}
                className={`category-pill-btn ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* POPULAR INGREDIENT CHIPS */}
          <div className="quick-add-section">
            <h3 className="section-title">{t('popularIngredients')}</h3>
            <div className="pills-flex-grid">
              {quickPills.map((pill, idx) => {
                const isSelected = Ingred.includes(pill.name)
                return (
                  <button
                    key={idx}
                    type="button"
                    className={`modern-pill-btn ${isSelected ? "pill-selected" : ""}`}
                    onClick={() => toggleQuickPill(pill.name)}
                    aria-pressed={isSelected}
                  >
                    <span>{pill.emoji}</span>
                    <span>{pill.name}</span>
                    {isSelected && <Check size={16} strokeWidth={3} />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* SELECTED INGREDIENTS CARD & HUGE STAT BADGE */}
          {Ingred.length === 0 ? (
            <div className="empty-state-card">
              <div className="empty-icon-wrapper">
                <UtensilsCrossed size={48} />
              </div>
              <h3 className="section-title">Start adding ingredients</h3>
              <p className="card-subtitle-text">Type above or click popular pills to discover recipe recommendations!</p>
            </div>
          ) : (
            <div className="selected-ingredients-card">
              <div className="card-top-header">
                <div>
                  <h3 className="card-title-text">{t('readyIngredients')}</h3>
                  <p className="card-subtitle-text">Ingredia will find matching recipes for your kitchen</p>
                </div>
                
                {/* HUGE STAT BADGE */}
                <div className="stat-badge-huge">
                  <span className="huge-number">{Ingred.length}</span>
                  <span className="huge-label">{t('selected')}</span>
                </div>
              </div>

              {/* Tag Chips */}
              <div className="chips-flex-wrap">
                {Ingred.map((item, index) => (
                  <div key={index} className="active-ingredient-chip">
                    <Check size={14} strokeWidth={3} />
                    <span>{item}</span>
                    <button
                      type="button"
                      className="chip-close-btn"
                      onClick={() => removeIngredient(index)}
                      aria-label={`Remove ${item}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* GENERATE BUTTON */}
              <div className="generate-cta-box">
                <button
                  type="button"
                  className="btn-pulse-green"
                  onClick={handleFindRecipeOptions}
                >
                  <Sparkles size={20} /> {t('findOptions')}
                </button>
              </div>
            </div>
          )}

          {/* RECENTLY VIEWED RECIPES BAR */}
          {historyList.length > 0 && (
            <div className="recent-history-section mt-8">
              <h3 className="section-title mb-4">{t('recentlyViewed')}</h3>
              <div className="recent-cards-flex-row">
                {historyList.slice(0, 4).map((item) => (
                  <div 
                    key={item.id} 
                    className="recent-mini-card"
                    onClick={() => handleSelectRecipeOption(item)}
                  >
                    <img src={getDishImage(item.title)} alt={item.title} className="recent-mini-img" />
                    <div>
                      <h4 className="recent-mini-title">{item.title}</h4>
                      <span className="recent-mini-time"><Clock size={12} inline /> {item.time || "25 mins"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: RECIPE OPTIONS (SKELETON LOADING SHIMMER + CARDS) */}
      {viewState === "options" && (
        <div className="layout-single-column">
          <div className="options-header-container">
            <button className="btn-back-link" onClick={() => setViewState("input")}>
              <ChevronLeft size={18} /> {t('back')}
            </button>
            <h2 className="section-heading-large">{t('optionsHeader')}</h2>
            <p className="section-subheading">{t('optionsSub')}</p>

            {loadingOptions ? (
              /* SKELETON SHIMMER CARDS */
              <div className="skeleton-shimmer-grid">
                <div className="skeleton-card"><div className="skeleton-shimmer-bar"></div></div>
                <div className="skeleton-card"><div className="skeleton-shimmer-bar"></div></div>
                <div className="skeleton-card"><div className="skeleton-shimmer-bar"></div></div>
              </div>
            ) : (
              <div className="food-cards-pinterest-grid">
                {recipeOptions.map((opt) => {
                  const dishImg = getDishImage(opt.title)
                  const isSaved = savedRecipes.some(r => r.id === opt.id)
                  return (
                    <div 
                      key={opt.id} 
                      className="food-recipe-card-3d" 
                      onClick={() => handleSelectRecipeOption(opt)}
                    >
                      <div className="card-image-box">
                        <img src={dishImg} alt={opt.title} className="card-food-img" />
                        <div className="card-top-actions">
                          <button 
                            className={`bookmark-btn ${isSaved ? "saved" : ""}`}
                            onClick={(e) => toggleSaveRecipe(opt, e)}
                            aria-label="Save recipe"
                            title="Save recipe"
                          >
                            <Heart size={18} fill={isSaved ? "#EF4444" : "none"} color={isSaved ? "#EF4444" : "#6B7280"} />
                          </button>
                        </div>
                        <span className="card-cuisine-pill">{opt.cuisine}</span>
                      </div>

                      <div className="card-body-content">
                        <div className="card-rating-row">
                          <span className="stars-badge">{opt.rating}</span>
                          <span className="tag-badge">{opt.tag}</span>
                        </div>
                        
                        <h3 className="card-recipe-title">{opt.title}</h3>
                        <p className="card-recipe-desc">{opt.desc}</p>

                        <div className="card-footer-meta">
                          <span className="meta-pill"><Clock size={14} /> {opt.time}</span>
                          <span className="meta-pill"><Flame size={14} /> 420 kcal</span>
                          <span className="meta-pill"><Utensils size={14} /> {opt.diff}</span>
                          <button className="btn-view-recipe">View Recipe →</button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 3: FULL RECIPE PREVIEW & TRANSPARENT SPLIT */}
      {viewState === "recipe" && (
        <div className="layout-single-column">
          <div className="recipe-detail-card-glass">
            <button className="btn-back-link" onClick={() => setViewState("options")}>
              <ChevronLeft size={18} /> {t('back')}
            </button>

            {loadingRecipe ? (
              <div className="skeleton-shimmer-grid">
                <div className="skeleton-card" style={{ height: "400px" }}><div className="skeleton-shimmer-bar"></div></div>
              </div>
            ) : (
              <div className="recipe-detail-view">
                {/* Header Banner */}
                <div className="dish-header-banner">
                  <img src={currentDishImg} alt="Dish visual" className="dish-banner-img-3d" />
                  <div className="dish-banner-info">
                    <span className="dish-cuisine-tag">{selectedOption?.cuisine || "Homestyle"} Specialty</span>
                    <h2>{selectedOption?.title || "Ingredia Specialty"}</h2>
                    <div className="dish-meta-badges">
                      <span className="stat-pill">{selectedOption?.rating || "⭐⭐⭐⭐⭐"}</span>
                      <span className="stat-pill"><Clock size={14} /> {selectedOption?.time || "25 mins"}</span>
                      <span className="stat-pill"><Utensils size={14} /> Serves 4</span>
                      <span className="stat-pill"><Flame size={14} /> {selectedOption?.diff || "Easy"}</span>
                    </div>
                  </div>
                </div>

                {/* Ingredients Transparency Section */}
                <div className="ingredients-split-grid">
                  <div className="split-card user-have-card">
                    <h4>{t('ingredientsHave')}</h4>
                    <ul className="split-list">
                      {ingredientLists.userHave.map((item, i) => (
                        <li key={i}>✔ {item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="split-card ai-added-card">
                    <h4>{t('ingredientsEnhance')}</h4>
                    <ul className="split-list">
                      {ingredientLists.aiAdded.map((item, i) => (
                        <li key={i}>⭐ {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Start Guided Cooking Mode CTA */}
                <div className="start-cooking-cta">
                  <button className="btn-pulse-green" onClick={handleStartCooking}>
                    {t('startCooking')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 4: INTERACTIVE GUIDED COOKING PLAYER */}
      {viewState === "cooking" && (
        <div className="layout-single-column">
          <div className="guided-cooking-card">
            {/* Top Navigation & Progress */}
            <div className="guided-header-row">
              <button className="btn-back-link" onClick={() => setViewState("recipe")}>
                <X size={18} /> {t('exitCooking')}
              </button>
              <span className="step-counter-text">
                {t('stepOf', { current: currentStepIdx + 1, total: recipeSteps.length || 1 })}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="progress-bar-track">
              <div 
                className="progress-bar-fill"
                style={{ width: `${((currentStepIdx + 1) / (recipeSteps.length || 1)) * 100}%` }}
              ></div>
            </div>

            {/* Focused Step Display */}
            {recipeSteps.length > 0 ? (
              <div className="guided-step-content">
                <div className="guided-step-number">{currentStepIdx + 1}</div>
                <h3 className="guided-step-title">{recipeSteps[currentStepIdx]?.title}</h3>
                <p className="guided-step-instruction">{recipeSteps[currentStepIdx]?.body}</p>

                {/* Navigation Buttons */}
                <div className="guided-nav-buttons">
                  <button 
                    className="btn-guided-secondary" 
                    onClick={() => setCurrentStepIdx(prev => Math.max(0, prev - 1))}
                    disabled={currentStepIdx === 0}
                  >
                    <ChevronLeft size={18} /> {t('back')}
                  </button>

                  {currentStepIdx < recipeSteps.length - 1 ? (
                    <button 
                      className="btn-pulse-green" 
                      onClick={() => setCurrentStepIdx(prev => prev + 1)}
                    >
                      {t('nextStep')} <ChevronRight size={18} />
                    </button>
                  ) : (
                    <button 
                      className="btn-pulse-green" 
                      onClick={() => setViewState("finished")}
                    >
                      {t('finishCooking')}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="guided-step-content">
                <p>Enjoy your meal preparation!</p>
                <button className="btn-pulse-green" onClick={() => setViewState("finished")}>
                  {t('finishCooking')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 5: CELEBRATION FINAL CARD */}
      {viewState === "finished" && (
        <div className="layout-single-column">
          <div className="celebration-card-3d">
            <div className="celebration-icon">🎉</div>
            <h2>{t('readyTitle')}</h2>
            <p className="celebration-subtitle">{t('readySub')}</p>

            <div className="celebration-stats-grid">
              <div className="celeb-stat">
                <span className="stat-label">Prep Time</span>
                <span className="stat-val">10 mins</span>
              </div>
              <div className="celeb-stat">
                <span className="stat-label">Cook Time</span>
                <span className="stat-val">25 mins</span>
              </div>
              <div className="celeb-stat">
                <span className="stat-label">Serves</span>
                <span className="stat-val">4</span>
              </div>
              <div className="celeb-stat">
                <span className="stat-label">Calories</span>
                <span className="stat-val">420 kcal</span>
              </div>
              <div className="celeb-stat">
                <span className="stat-label">Difficulty</span>
                <span className="stat-val">{selectedOption?.diff || "Easy"}</span>
              </div>
              <div className="celeb-stat">
                <span className="stat-label">Rating</span>
                <span className="stat-val">⭐⭐⭐⭐⭐</span>
              </div>
            </div>

            <div className="storage-tips-box">
              <h4>📦 Storage & Reheating Tips</h4>
              <p>• <strong>Refrigerator:</strong> Store in an airtight container for up to 3 days.</p>
              <p>• <strong>Reheating:</strong> Reheat gently in a pan over low flame with 2 tbsp water.</p>
            </div>

            <div className="celebration-actions">
              <button className="btn-pulse-green" onClick={() => setViewState("input")}>
                {t('cookAnother')}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
