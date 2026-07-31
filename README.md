# 🍳 Ingredia — Smart AI Kitchen Assistant 🧑‍🍳

> *Transform ingredients in your fridge into chef-quality recipes using AI, Google OAuth, and instant translations.*

![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-7.3-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Auth-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![Vercel](https://img.shields.io/badge/Vercel-Deploy-000000?style=for-the-badge&logo=vercel&logoColor=white)
![Multilingual](https://img.shields.io/badge/i18n-10+_Languages-0F9D58?style=for-the-badge)

---

## ✨ Overview

**Ingredia** is a modern, high-performance web application designed for home chefs. Simply type or select ingredients you currently have, and Ingredia uses AI to craft complete, step-by-step gourmet recipes in seconds.

---

## 🔥 Key Features

- 🤖 **AI Recipe Generation**: Creates step-by-step recipes tailored to your exact ingredients.
- 🔐 **Google & Email Authentication**: Seamless sign-in with Google OAuth or Email/Password via Firebase.
- 🌍 **10+ Languages**: Supports English, Spanish, French, German, Hindi, Japanese, Chinese, Italian, Portuguese & Korean.
- 🎨 **Glassmorphism UI & Dark Mode**: Sleek Apple & Airbnb inspired UI with fluid dark/light theme switching.
- 💾 **Saved Recipes & History**: Easily bookmark favorite recipes and revisit your cooking history.
- 📱 **Progressive Web App (PWA)**: Fully installable on Mobile and Desktop for fast offline access.

---

## 🛠️ Tech Stack

- ⚛️ **Frontend**: React 19 + Vite 7
- 🎨 **Styling**: Modern CSS Glassmorphism + Framer Motion
- 🔒 **Auth**: Firebase Authentication (Google OAuth + Email)
- 🧠 **AI**: Anthropic Claude & HuggingFace LLM APIs
- 🌐 **Deployment**: Vercel (SPA Rewrites enabled)

---

## 🚀 Quick Start

### 1️⃣ Clone & Install

```bash
git clone https://github.com/YourUsername/chef_claude.git
cd chef_claude
npm install
```

### 2️⃣ Environment Variables (`.env`)

```env
VITE_ANTHROPIC_API_KEY=your_key_here
VITE_FIREBASE_API_KEY=AIzaSyASoV1ww9FWaOJlBB6gJhdWI5CqedTPm8s
VITE_FIREBASE_AUTH_DOMAIN=ingredia-chef.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=ingredia-chef
```

### 3️⃣ Run Locally

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 🌐 Deploy to Vercel

1. Push your code to GitHub.
2. Connect repository on [Vercel Dashboard](https://vercel.com).
3. Set root directory to `chef_claude` and click **Deploy**!
4. Add your live Vercel URL to **Firebase Authorized Domains**.

---

## 📜 License

Distributed under the **MIT License**. Free to use and customize! ❤️
