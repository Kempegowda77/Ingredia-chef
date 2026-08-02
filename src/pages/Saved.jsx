import React from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Search, Heart, Trash2, Clock, Flame, ArrowRight, Sparkles, X, AlertTriangle, MoreVertical } from "lucide-react"

import DishChicken3D from "../assets/dish_chicken_3d.png"
import DishPasta3D from "../assets/dish_pasta_3d.png"
import DishSalad3D from "../assets/dish_salad_3d.png"
import DishCurry3D from "../assets/dish_curry_3d.png"
import DishPizza3D from "../assets/dish_pizza_3d.png"
import DishVeggie3D from "../assets/dish_veggie_3d.png"
import DishBeverage3D from "../assets/dish_beverage_3d.png"
import DishSmoothie3D from "../assets/dish_smoothie_3d.png"

import { safeGetLocalStorage } from "../security"
import SEO from "../components/SEO"
import {
  loadSavedFromCloud,
  removeRecipeFromCloud,
  clearAllSavedFromCloud
} from "../utils/cloudSync"

export default function Saved() {
  const { t } = useTranslation()
  const [savedRecipes, setSavedRecipes] = React.useState([])
  const [searchQuery, setSearchQuery] = React.useState("")
  
  // Three-Dot Overflow Menu state
  const [menuOpen, setMenuOpen] = React.useState(false)

  // Modal Confirmations
  const [confirmClearAll, setConfirmClearAll] = React.useState(false)
  const [deleteTargetId, setDeleteTargetId] = React.useState(null)

  React.useEffect(() => {
    loadSavedRecipes()
  }, [])

  async function loadSavedRecipes() {
    // Show local cache immediately, then fetch from cloud
    const localData = JSON.parse(localStorage.getItem('ingredia_saved') || '[]');
    setSavedRecipes(localData);
    const cloudData = await loadSavedFromCloud();
    setSavedRecipes(cloudData);
  }

  async function handleConfirmSingleDelete() {
    if (!deleteTargetId) return
    const updated = await removeRecipeFromCloud(deleteTargetId);
    setSavedRecipes(updated)
    setDeleteTargetId(null)
  }

  async function handleConfirmClearAll() {
    setSavedRecipes([])
    await clearAllSavedFromCloud();
    setConfirmClearAll(false)
    setMenuOpen(false)
  }

  function getDishImage(title) {
    const term = (title || "").toLowerCase()
    if (term.includes("coffee") || term.includes("tea")) return DishBeverage3D
    if (term.includes("smoothie")) return DishSmoothie3D
    if (term.includes("chicken") || term.includes("fry")) return DishChicken3D
    if (term.includes("pasta")) return DishPasta3D
    if (term.includes("salad")) return DishSalad3D
    if (term.includes("curry") || term.includes("soup") || term.includes("masala")) return DishCurry3D
    if (term.includes("pizza")) return DishPizza3D
    return DishVeggie3D
  }

  const filtered = savedRecipes.filter(r => 
    r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.cuisine && r.cuisine.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <main className="main-content">
      <SEO 
        title="Saved Recipes | Ingredia Kitchen"
        description="Access and manage your bookmarked favorite recipes saved in Ingredia Kitchen."
        canonical="https://ingredia.vercel.app/saved"
      />
      <div className="layout-single-column">
        {/* ELEGANT COMPACT HEADER WITH THREE-DOT OVERFLOW MENU ON LEFT */}
        <div className="flex-header-row-left mb-4">
          {savedRecipes.length > 0 && (
            <div style={{ position: "relative" }}>
              <button 
                className="icon-dots-btn" 
                onClick={() => setMenuOpen(prev => !prev)}
                aria-label="More Options"
                title="More Options"
              >
                <MoreVertical size={18} />
              </button>

              {menuOpen && (
                <div 
                  className="autocomplete-dropdown" 
                  style={{ 
                    left: 0, 
                    right: "auto", 
                    width: "180px", 
                    top: "110%", 
                    padding: "4px"
                  }}
                  onClick={() => setMenuOpen(false)}
                >
                  <button 
                    className="autocomplete-item" 
                    style={{ color: "#EF4444", gap: "10px" }}
                    onClick={() => setConfirmClearAll(true)}
                  >
                    <Trash2 size={16} /> Clear All Saved
                  </button>
                </div>
              )}
            </div>
          )}

          <div>
            <h1 className="section-heading-large flex-heading">
              {t('savedTitle')} <span className="badge-count">{savedRecipes.length}</span>
            </h1>
            <p className="section-subheading">{t('savedSub')}</p>
          </div>
        </div>

        {/* PREMIUM FLOATING SEARCH COMPONENT */}
        {savedRecipes.length > 0 && (
          <div className="search-box-glass mb-6">
            <Search size={20} color="#6B7280" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search saved recipes by title or cuisine..."
              className="search-input-field"
            />
            {searchQuery && (
              <button className="chip-close-btn" onClick={() => setSearchQuery("")}>
                <X size={18} />
              </button>
            )}
          </div>
        )}

        {/* CONTENT GRID OR EMPTY STATE */}
        {savedRecipes.length === 0 ? (
          <div className="empty-state-card">
            <div className="empty-icon-wrapper" style={{ color: "#EF4444" }}>
              <Heart size={56} />
            </div>
            <h3 className="section-title">{t('noSaved')}</h3>
            <p className="card-subtitle-text">{t('noSavedSub')}</p>
            <Link to="/" className="btn-pulse-green mt-4">
              <Sparkles size={18} inline /> {t('discoverCTA')}
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state-card">
            <h3 className="section-title">No matching recipes found</h3>
            <p className="card-subtitle-text">Try searching for a different keyword or clear your query.</p>
          </div>
        ) : (
          <div className="food-cards-pinterest-grid">
            {filtered.map(recipe => {
              const dishImg = getDishImage(recipe.title)
              return (
                <div key={recipe.id} className="food-recipe-card-3d">
                  <div className="card-image-box">
                    <img src={dishImg} alt={recipe.title} className="card-food-img" />
                    
                    {/* INTEGRATED DELETE BUTTON INSIDE CARD HEADER */}
                    <div className="card-top-actions">
                      <button 
                        className="bookmark-btn saved"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteTargetId(recipe.id)
                        }}
                        aria-label="Remove recipe"
                        title="Remove recipe"
                      >
                        <Trash2 size={18} color="#EF4444" />
                      </button>
                    </div>
                    
                    <span className="card-cuisine-pill">{recipe.cuisine || "Homestyle"}</span>
                  </div>

                  <div className="card-body-content">
                    <div className="card-rating-row">
                      <span className="stars-badge">{recipe.rating || "⭐⭐⭐⭐⭐"}</span>
                      <span className="tag-badge">{recipe.tag || "Saved"}</span>
                    </div>

                    <h3 className="card-recipe-title">{recipe.title}</h3>
                    <p className="card-recipe-desc">{recipe.desc || "Bookmarked recipe specialty."}</p>

                    <div className="card-footer-meta">
                      <span className="meta-pill"><Clock size={14} /> {recipe.time || "25 mins"}</span>
                      <span className="meta-pill"><Flame size={14} /> 420 kcal</span>
                      <Link to="/" className="btn-view-recipe">
                        Cook <ArrowRight size={14} inline />
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* SINGLE RECIPE DELETE CONFIRMATION MODAL */}
        {deleteTargetId && (
          <div className="modal-backdrop-glass" onClick={() => setDeleteTargetId(null)}>
            <div className="modal-dialog-card" style={{ maxWidth: "440px" }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-top-bar">
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <AlertTriangle size={22} color="#EF4444" />
                  <h3>Remove Saved Recipe</h3>
                </div>
                <button className="icon-trash-btn" onClick={() => setDeleteTargetId(null)}><X size={18} /></button>
              </div>

              <div className="modal-recipe-body">
                <p>Are you sure you want to remove this recipe from your saved collection?</p>
                <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "24px" }}>
                  <button className="try-pill-btn" onClick={() => setDeleteTargetId(null)}>Cancel</button>
                  <button className="btn-primary-add" style={{ background: "#EF4444" }} onClick={handleConfirmSingleDelete}>Remove</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CLEAR ALL CONFIRMATION MODAL */}
        {confirmClearAll && (
          <div className="modal-backdrop-glass" onClick={() => setConfirmClearAll(false)}>
            <div className="modal-dialog-card" style={{ maxWidth: "440px" }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-top-bar">
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <AlertTriangle size={22} color="#EF4444" />
                  <h3>Clear All Saved Recipes</h3>
                </div>
                <button className="icon-trash-btn" onClick={() => setConfirmClearAll(false)}><X size={18} /></button>
              </div>

              <div className="modal-recipe-body">
                <p>This will permanently remove all bookmarked recipes from your saved collection. Continue?</p>
                <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "24px" }}>
                  <button className="try-pill-btn" onClick={() => setConfirmClearAll(false)}>Cancel</button>
                  <button className="btn-primary-add" style={{ background: "#EF4444" }} onClick={handleConfirmClearAll}>Clear All</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
