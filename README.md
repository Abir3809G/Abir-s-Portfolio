# Abir — Animated Portfolio Website

Fully static, fast, animated portfolio (dark theme) — free hosted on **GitHub Pages**, with its own **self-service admin panel** so you can add/edit/remove content (links, ventures, skills, experience) anytime, without asking anyone to touch code.

## Files

- `index.html` — the public site (share this link with everyone)
- `admin.html` — your private content editor (only for you)
- `data.json` — all the site's content lives here (name, skills, experience, business links, etc.) — this is what `admin.html` edits
- `style.css`, `script.js`, `admin.js` — styling & logic
- `assets/profile.jpg` — your photo (extracted & optimized from your CV)

## 1. Host it free on GitHub Pages

1. Go to github.com → **New repository** → name it anything (e.g. `portfolio`) → Public → Create.
2. On the repo page, click **Add file → Upload files**, drag in *all* the files/folders above (keep `assets/profile.jpg` inside an `assets` folder), then **Commit changes**.
3. Go to **Settings → Pages**. Under "Build and deployment", set Source = **Deploy from a branch**, Branch = `main`, folder = `/ (root)` → **Save**.
4. Wait ~1 minute. Your site goes live at:
   `https://<your-github-username>.github.io/<repo-name>/`
5. Share this link with anyone — that's your public interface.

## 2. Set up your private admin panel

The admin panel (`admin.html`) edits `data.json` directly inside your GitHub repo, using GitHub's API. You never touch code — just fill forms and click Save.

1. On GitHub: click your profile photo (top-right) → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
2. Give it a name, set **Resource owner** = your account, **Repository access** = "Only select repositories" → choose this one repo.
3. Under **Permissions → Repository permissions**, set **Contents = Read and write**. Leave everything else as "No access".
4. Generate the token and copy it (starts with `github_pat_...`). GitHub only shows it once.
5. Open your site's `admin.html` in the browser (e.g. `https://<username>.github.io/<repo-name>/admin.html`).
6. Fill in: your GitHub username, repo name, branch (`main`), and paste the token → **Connect & Load**.
7. Now edit anything — add/remove business ventures & links, edit skills, experience, education, profile info — then hit **Save to GitHub** at the bottom. Your live site updates within about a minute.

**Important:** `admin.html` is not password-protected on its own — anyone who has your token could edit the site. The token is saved only in *your* browser (localStorage), never uploaded anywhere but GitHub. Don't share the token with anyone, don't post screenshots containing it, and you can revoke/regenerate it anytime from GitHub settings if needed. Don't share the `admin.html` link publicly — only share `index.html`.

## 3. Changing your photo

Upload a new image into the `assets/` folder in your GitHub repo (via "Add file → Upload files"), then in `admin.html` update the **Photo path** field to match the new filename (e.g. `assets/newphoto.jpg`) and Save.

## 4. Day/night theme

The site automatically switches between a light theme (6:00 AM – 6:00 PM Bangladesh time) and a dark theme (6:00 PM – 6:00 AM), based on the real Bangladesh clock — not the visitor's device. A small sun/moon button in the nav lets any visitor override it just for their own browsing session (resets to the automatic schedule on their next visit).

## 5. Adding more contact/social links

Open `admin.html`, go to the **Connect / social links** panel, and click **+ Add social link**. Pick a type (WhatsApp, Facebook, Instagram, LinkedIn, Telegram, Email, Behance, or a generic Website), fill in the label and the number/URL, and Save — it appears immediately as an icon button in the Contact section and the footer.

## 6. Achievements (stat row)

The 4-number stat row under the "Who I Am" section (years experience, roles, ventures, HSC GPA). Manage the value/label pairs from `admin.html`'s **Achievements** panel — add or remove as many as you like.

## 7. Work / Projects gallery

The "Portfolio / Work Gallery" section shows one card per category (Graphic Design, Motion Video Editing, Visa Documentation Samples). Clicking a card opens that category below with a lightbox for full-size viewing. To add a real piece: upload the image to `assets/work/` in your GitHub repo (create that folder on upload), then in `admin.html`'s **Work / Projects gallery** panel add it with its image path, a title, and an optional link. An empty category shows a friendly "coming soon" card instead of looking broken.

## 8. Email button

Clicking "Email" or the email icon copies your address to the clipboard as a fallback (with a small on-screen confirmation) in addition to trying to open the visitor's mail app — mail-app behavior depends on their device having one configured, which a static site can't control, so the copy fallback means the address is always in their clipboard either way.

## 9. Performance notes

The site is built with plain HTML/CSS/JS — no heavy frameworks — so it loads fast on GitHub Pages' CDN. Animations use CSS transforms and `IntersectionObserver` (GPU-friendly, no jank). Only one image (your photo) is loaded besides fonts/icons.
