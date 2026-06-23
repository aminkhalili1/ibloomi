# iBloomi Website

AI-powered bouquet builder landing page for **ibloomi.nl**

## Project Structure

```
ibloomi/
├── index.html          # Main landing page
├── privacy-policy.html # Privacy policy
├── terms.html          # Terms of use
├── cookies.html        # Cookie policy
├── vercel.json         # Vercel deployment config
├── css/
│   └── style.css       # All styles
├── js/
│   └── main.js         # Interactions & animations
└── images/
    └── logo.png        # iBloomi logo
```

## Deploying to Vercel via GitHub

### Step 1 — Push to GitHub

1. Create a new repository on [github.com](https://github.com)
2. In your terminal, from this folder run:

```bash
git init
git add .
git commit -m "Initial commit: iBloomi website"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ibloomi-website.git
git push -u origin main
```

### Step 2 — Connect to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in (or create a free account)
2. Click **"Add New Project"**
3. Import your GitHub repository
4. Vercel will auto-detect the static site — no build settings needed
5. Click **"Deploy"**

Your site will be live at a `.vercel.app` URL within seconds.

### Step 3 — Connect your domain (ibloomi.nl)

1. In Vercel, go to your project → **Settings → Domains**
2. Add `ibloomi.nl` and `www.ibloomi.nl`
3. Vercel will give you DNS records (usually an A record and CNAME)
4. Go to your domain registrar (where you bought ibloomi.nl) and add those DNS records
5. Wait up to 24–48h for DNS propagation (usually faster)

Vercel handles HTTPS automatically — no SSL setup needed.

## Customization

- **Colors**: Edit CSS variables in `css/style.css` under `:root`
- **Content**: Update text directly in `index.html`
- **Contact form**: The form currently shows a success message. To collect real submissions, integrate with [Formspree](https://formspree.io), [EmailJS](https://emailjs.com), or a Vercel serverless function.

## Tech Stack

- Pure HTML, CSS, JavaScript — no dependencies, no build step
- Google Fonts: DM Serif Display + Inter
- Fully responsive (mobile, tablet, desktop)
- GDPR-ready structure with legal pages
