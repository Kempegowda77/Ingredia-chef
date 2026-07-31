import React from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Search, History as HistoryIcon, Trash2, Sparkles, X, ChevronRight, AlertTriangle, MoreVertical, Calendar, Eye } from "lucide-react"

import { safeGetLocalStorage } from "../security"

export default function History() {
  const { t } = useTranslation()
  const [historyList, setHistoryList] = React.useState([])
  const [searchQuery, setSearchQuery] = React.useState("")
  const [activeRecipeView, setActiveRecipeView] = React.useState(null)
  
  // Three-Dot Menu & Modal Confirmations
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [confirmClearAll, setConfirmClearAll] = React.useState(false)
  const [deleteTargetId, setDeleteTargetId] = React.useState(null)

  React.useEffect(() => {
    loadHistory()
  }, [])

  function loadHistory() {
    const history = safeGetLocalStorage('ingredia_history')
    setHistoryList(history)
  }

  function handleConfirmSingleDelete() {
    if (!deleteTargetId) return
    const updated = historyList.filter(item => item.id !== deleteTargetId)
    setHistoryList(updated)
    localStorage.setItem('ingredia_history', JSON.stringify(updated))
    if (activeRecipeView?.id === deleteTargetId) setActiveRecipeView(null)
    setDeleteTargetId(null)
  }

  function handleConfirmClearAll() {
    setHistoryList([])
    localStorage.setItem('ingredia_history', JSON.stringify([]))
    setActiveRecipeView(null)
    setConfirmClearAll(false)
    setMenuOpen(false)
  }

  const filtered = historyList.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.ingredients && item.ingredients.join(' ').toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <main className="main-content">
      <div className="layout-single-column">
        {/* COMPACT ELEGANT HEADER WITH THREE-DOT OVERFLOW */}
        <div className="flex-header-row mb-6">
          <div>
            <h1 className="section-heading-large flex-heading">
              {t('historyTitle')} <span className="badge-count">{historyList.length}</span>
            </h1>
            <p className="section-subheading">{t('historySub')}</p>
          </div>

          {historyList.length > 0 && (
            <div style={{ position: "relative" }}>
              <button 
                className="user-profile-btn" 
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
                    right: 0, 
                    left: "auto", 
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
                    <Trash2 size={16} /> Clear History
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* FLOATING SEARCH BOX */}
        {historyList.length > 0 && (
          <div className="search-box-glass mb-6">
            <Search size={20} color="#6B7280" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search history by dish title or ingredients..."
              className="search-input-field"
            />
            {searchQuery && (
              <button className="chip-close-btn" onClick={() => setSearchQuery("")}>
                <X size={18} />
              </button>
            )}
          </div>
        )}

        {/* LIST / EMPTY STATES */}
        {historyList.length === 0 ? (
          <div className="empty-state-card">
            <div className="empty-icon-wrapper" style={{ color: "#0F9D58" }}>
              <HistoryIcon size={56} />
            </div>
            <h3 className="section-title">{t('noHistory')}</h3>
            <p className="card-subtitle-text">{t('noHistorySub')}</p>
            <Link to="/" className="btn-pulse-green mt-4">
              <Sparkles size={18} inline /> {t('generateFirst')}
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state-card">
            <h3 className="section-title">No matching history items</h3>
            <p className="card-subtitle-text">Try searching for a different keyword or clear your query.</p>
          </div>
        ) : (
          <div className="history-list-vertical">
            {filtered.map(item => (
              <div 
                key={item.id} 
                className="history-item-card"
                onClick={() => setActiveRecipeView(item)}
              >
                <div className="history-item-left">
                  <div className="history-meta-row">
                    <span className="history-date-chip">
                      <Calendar size={12} inline /> {item.timestamp || "Recent"}
                    </span>
                    <span className="tag-badge">{item.cuisine || "Homestyle"}</span>
                  </div>
                  
                  <h3 className="history-item-title">{item.title}</h3>
                  
                  <div className="history-ingred-pills">
                    {item.ingredients && item.ingredients.map((ing, i) => (
                      <span key={i} className="history-ingred-tag">✓ {ing}</span>
                    ))}
                  </div>
                </div>

                <div className="history-item-right">
                  <button 
                    className="bookmark-btn" 
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteTargetId(item.id)
                    }}
                    title="Delete Entry"
                  >
                    <Trash2 size={16} color="#EF4444" />
                  </button>
                  <Eye size={18} color="#94A3B8" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SINGLE DELETE CONFIRMATION MODAL */}
        {deleteTargetId && (
          <div className="modal-backdrop-glass" onClick={() => setDeleteTargetId(null)}>
            <div className="modal-dialog-card" style={{ maxWidth: "440px" }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-top-bar">
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <AlertTriangle size={22} color="#EF4444" />
                  <h3>Delete History Entry</h3>
                </div>
                <button className="icon-trash-btn" onClick={() => setDeleteTargetId(null)}><X size={18} /></button>
              </div>

              <div className="modal-recipe-body">
                <p>Are you sure you want to remove this culinary history record?</p>
                <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "24px" }}>
                  <button className="try-pill-btn" onClick={() => setDeleteTargetId(null)}>Cancel</button>
                  <button className="btn-primary-add" style={{ background: "#EF4444" }} onClick={handleConfirmSingleDelete}>Delete</button>
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
                  <h3>Clear Cooking History</h3>
                </div>
                <button className="icon-trash-btn" onClick={() => setConfirmClearAll(false)}><X size={18} /></button>
              </div>

              <div className="modal-recipe-body">
                <p>This will permanently clear all generated cooking history items. Continue?</p>
                <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "24px" }}>
                  <button className="try-pill-btn" onClick={() => setConfirmClearAll(false)}>Cancel</button>
                  <button className="btn-primary-add" style={{ background: "#EF4444" }} onClick={handleConfirmClearAll}>Clear All</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW DETAILS DRAWER MODAL */}
        {activeRecipeView && (
          <div className="modal-backdrop-glass" onClick={() => setActiveRecipeView(null)}>
            <div className="modal-dialog-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-top-bar">
                <div>
                  <span className="dish-cuisine-tag">{activeRecipeView.cuisine || "Homestyle"}</span>
                  <h2>{activeRecipeView.title}</h2>
                </div>
                <button className="icon-trash-btn" onClick={() => setActiveRecipeView(null)}>
                  <X size={20} />
                </button>
              </div>

              <div className="modal-recipe-body">
                <pre className="raw-pre">{activeRecipeView.recipeText}</pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
