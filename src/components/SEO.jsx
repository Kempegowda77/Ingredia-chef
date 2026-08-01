import React from 'react';

export default function SEO({ 
  title = "Ingredia - Smart Kitchen AI Recipe Generator & Guided Cooking Companion",
  description = "Turn your available pantry ingredients into delicious, restaurant-quality recipes instantly with Ingredia.",
  keywords = "recipe generator, AI chef, ingredient recipe finder, smart kitchen assistant, home cooking",
  canonical = "https://ingredia.vercel.app/"
}) {
  React.useEffect(() => {
    // Update Page Title
    if (title) {
      document.title = title;
    }

    // Helper to update meta property/name
    const setMetaTag = (selector, content) => {
      const el = document.querySelector(selector);
      if (el) {
        el.setAttribute('content', content);
      }
    };

    if (description) {
      setMetaTag('meta[name="description"]', description);
      setMetaTag('meta[property="og:description"]', description);
      setMetaTag('meta[name="twitter:description"]', description);
    }

    if (title) {
      setMetaTag('meta[property="og:title"]', title);
      setMetaTag('meta[name="twitter:title"]', title);
    }

    if (keywords) {
      setMetaTag('meta[name="keywords"]', keywords);
    }

    // Update canonical link
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (canonicalLink && canonical) {
      canonicalLink.setAttribute('href', canonical);
    }
  }, [title, description, keywords, canonical]);

  return null;
}
