/**
 * INGREDIA - CYBERSECURITY ENGINE
 * Implement strict sanitation, XSS prevention, and secure LocalStorage parsers.
 */

// 1. Strict XSS Sanitizer for HTML/Script injection
export function sanitizeHTML(str) {
  if (typeof str !== "string") return "";
  // Strip script tags, event handlers, and basic HTML structures to prevent malicious execution
  return str
    .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, "")
    .replace(/on\w+="[^"]*"/g, "")
    .replace(/on\w+='[^']*'/g, "")
    .replace(/<[^>]*>/g, "")
    .trim();
}

// 2. Safe LocalStorage JSON parser
export function safeGetLocalStorage(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    
    // Validate that it matches the expected array structure
    if (Array.isArray(parsed)) {
      return parsed.map(item => {
        if (item && typeof item === "object") {
          // Sanitize every text field to prevent stored XSS attacks
          const sanitized = { ...item };
          if (typeof sanitized.title === "string") sanitized.title = sanitizeHTML(sanitized.title);
          if (typeof sanitized.desc === "string") sanitized.desc = sanitizeHTML(sanitized.desc);
          if (typeof sanitized.cuisine === "string") sanitized.cuisine = sanitizeHTML(sanitized.cuisine);
          if (Array.isArray(sanitized.ingredients)) {
            sanitized.ingredients = sanitized.ingredients.map(i => sanitizeHTML(String(i)));
          }
          return sanitized;
        }
        return item;
      });
    }
    return fallback;
  } catch (err) {
    console.warn(`[Security Alert] LocalStorage tampering detected on key: ${key}`, err);
    return fallback;
  }
}

// 3. API Key Validator
export function validateApiKey(key, type = "anthropic") {
  if (!key || typeof key !== "string") return false;
  const clean = key.trim();
  
  if (type === "anthropic") {
    // Anthropic API keys start with 'sk-ant-api' and are 108 characters
    return /^sk-ant-api\d{2}-[a-zA-Z0-9_\-]{80,100}$/.test(clean);
  }
  
  if (type === "huggingface") {
    // HuggingFace tokens start with 'hf_'
    return /^hf_[a-zA-Z0-9]{34,40}$/.test(clean);
  }
  
  return false;
}
