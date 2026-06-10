# LondonRental.ca — Design System

**LondonRental.ca** is the dedicated rental marketplace for **London, Ontario only** — run by **Kunal Singh Thakur**, a residential leasing agent with 4+ years in the London market. The product connects landlords and tenants with a hands-on, local-first service: full promotion across Kijiji, Facebook Marketplace, and student housing groups (20,000+ members), inquiry handling, showing coordination, and document collection — while landlords keep control of lease signing and rent collection. Tagline: **"Rentals Made Simple."**

This design system codifies that product's existing visual language into reusable tokens, components, and UI kits.

## Sources

- **Codebase:** `londonrental/main.jsx` — a single-file React app (~1,130 lines) that is the live source of truth for the brand. Contains the palette object `G`, global CSS/keyframes, and all screens (hero, listings grid + filters + maps, multi-step landlord modal, tenant inquiry modal, password-gated admin panel, footer, deployment guide).
- **Assets:** `uploads/logo.jpeg` / `londonrental/logo.jpeg` (primary logo), `londonrental/Kunal.jpeg` (founder photo). Both copied into `assets/`.
- **Live site referenced by the owner:** https://londonrental.ca/

> The reader is not assumed to have access to these; they are recorded here for provenance.

## ⚠️ Brand note: logo vs. product palette

The **logo** is navy + **silver/grey** ("LondonRental" navy, ".ca" grey, "RENTALS MADE SIMPLE" tagline). The **product UI** in the codebase commits to navy + **gold** as a more premium, "luxury real-estate" accent. This system treats **navy + gold as the primary product palette** (it is used consistently across every screen) and keeps the logo's **silver/grey as a documented neutral** (`--silver-*`). If you'd prefer the product to match the logo's silver accent instead of gold, that's a one-token swap — see CAVEATS at the bottom and let me know.

---

## CONTENT FUNDAMENTALS

How LondonRental writes.

- **Voice:** warm, local, and reassuring — a knowledgeable neighbour, not a corporate portal. Confidence without hype.
- **Person:** addresses the reader as **"you"** ("so you can focus on what matters", "You stay in control"). Speaks as **"we"** for the service ("We handle inquiries", "We coordinate showings"). First-person singular only in the About/founder voice (Kunal).
- **Casing:** **Title Case** for headings and buttons ("List Your Property", "What's Included", "Submit My Property"). **UPPERCASE with wide tracking** for eyebrows/section tags and status pills ("FOR LANDLORDS", "AVAILABLE RENTALS", "RENTED").
- **The one recurring proof point:** hyper-local focus — *"London, Ontario only"* / *"one city, done right."* Always lean on the 20,000+ student network and "no upfront cost to landlords."
- **Numbers as headlines:** big single figures carry meaning — **40%** (fee), **20K+** (network), **No Upfront** (cost). Set these large in Playfair gold.
- **Buttons are directive + arrowed:** action verb first, trailing `→` ("Next: What's Included →", "Inquire Now →", "Send Inquiry →"). Back actions use a leading `←`.
- **Reassurance lines** are everywhere money or commitment appears: "Zero financial risk", "No money upfront", "for your complete peace of mind."
- **Microcopy worked examples:** fees are shown concretely ("If rent is $1,800/month, our one-time fee is $720. That's it — forever.").
- **Emoji ARE part of the current voice.** The codebase uses them liberally as inline iconography (🏠 📢 🎯 💼 ⚡ 📸 📅 📁 ✅ 🔑 🐾 🚗). See ICONOGRAPHY for guidance and the recommended path forward.
- **Tone words to reach for:** dedicated, local, professional, simple, fast, peace of mind, control.
- **Avoid:** jargon, aggressive sales pressure, multi-city/"Ontario-wide" claims (the whole pitch is the opposite).

---

## VISUAL FOUNDATIONS

- **Mood:** premium, nocturnal, editorial. Deep navy canvas with gold as the single hero accent — closer to a boutique real-estate brand than a classifieds site.
- **Color:** background is **navy `#0B1F3A`** (`--navy-600`), darkening toward `#060F1C` at the footer. The accent is **gold `#C9922A`** (`--gold-500`) with a lighter `#E5B45A` used as the top stop of gold gradients. Status: green `#1A7A4A` (available/success), red `#C0392B` (rented/danger). Listing *types* get their own accent dots (house=gold, apartment=blue, condo=purple, townhome=teal).
- **Type:** **Playfair Display** for all display/headlines and price figures (serif, weights 700/900) — the `.playfair` class. **DM Sans** for everything else (UI, body, labels). Headlines are tight (`line-height 1.05`), body is relaxed (`1.7–1.8`). Eyebrows are 11px uppercase, `letter-spacing 0.2em`, gold.
- **Backgrounds:** layered, never flat. Hero = diagonal navy gradient + two radial gold/navy glows + a faint 60px gold grid + floating translucent "orbs" that drift (`float` animation). Sections alternate between solid navy, a navy→darker vertical gradient, and `--navy-400` raised panels.
- **Surfaces / cards:** **glassmorphism** — `rgba(255,255,255,0.04)` fill, `1px` hairline border `rgba(255,255,255,0.08–0.12)`, `border-radius 12px`. On hover they **lift** (`translateY(-4px)`), deepen shadow (`0 20px 50px rgba(0,0,0,0.4)`), and the border warms to gold. Gold-wash variants use `rgba(201,146,42,0.06)` fill + gold border for "included/featured" content.
- **Buttons:**
  - *Primary (gold):* gold gradient fill, navy text, weight 600, `radius 4px`, `letter-spacing 0.04em`. Hover = `translateY(-2px)` + gold glow shadow. 
  - *Outline:* transparent, gold `1.5px` border + gold text; hover **inverts** to gold fill + navy text and lifts.
- **Inputs:** translucent `rgba(255,255,255,0.06)` fill, `1px` border `rgba(255,255,255,0.15)`, `radius 6px`, white text. Focus warms the border to gold (add the gold focus ring `--ring-gold`). Labels are 12px uppercase muted with `0.06em` tracking.
- **Pills / chips / tags:** fully rounded (`radius 20px`). Filter chips are gold-filled when active, glass when idle. Status pills are tinted washes with matching colored text + border (green for Available, red for Rented).
- **Motion:** entrances are **fade-up** (`fadeInUp`, 30px rise, 0.4–0.9s, staggered by delay). Ambient **float** on hero orbs. **Spin** on loading dots. Hover/press are transform-based: hover lifts up 2–4px, nothing aggressively scales except a subtle `pulse`. Easing is plain `ease` in the codebase; this system also exposes a refined `--ease-out` for new work. Respect `prefers-reduced-motion`.
- **Hover states:** opacity raise (links 0.85→1), border warm-to-gold, upward lift + shadow. **Press:** color inversion (outline buttons) or settle back down.
- **Borders & dividers:** almost always `1px` hairline at low-opacity white; gold-tinted borders signal accent/featured. Section dividers are `1px rgba(255,255,255,0.06)`.
- **Shadows:** used for *elevation on hover* and on CTAs (gold-tinted glow), rarely at rest. No hard drop shadows — everything soft and large-radius.
- **Transparency & blur:** core to the look. Fixed navbar goes from transparent to `rgba(11,31,58,0.97)` + `blur(20px)` on scroll. Modal scrims are `rgba(5,15,30,0.88)` + `blur(12px)`. Glass cards everywhere.
- **Corner radii:** 4px (buttons) · 6px (inputs/small) · 8px (washes/inner cards) · 12px (cards/modals/panels) · 20px (pills) · 50% (avatars, step dots, icon chips).
- **Signature motifs:** the **3px gold gradient bar** across the top of every modal; the **floating gold-gradient CTA tile** pair on the hero; numbered **step indicator** with green checks for completed steps; price set in Playfair gold; the hand-drawn gold underline swoosh under hero accent words.
- **Imagery:** warm, bright property photography (currently Unsplash placeholders) with a navy bottom-gradient scrim for text legibility. Founder photo is candid, urban, natural light.

---

## ICONOGRAPHY

- **Current state:** the codebase uses **emoji as inline icons everywhere** — feature lists (📢 🎯 💼 ⚡), included-services grid (📸 📅 📁 ✅), hero CTAs (🏘️ 🔑), listing meta (🛏 🚿 🐾 🚗), contact (📧 📍), and decorative confirmation states (🎉 ✅). There is **no SVG icon set, icon font, or sprite** in the source — every glyph is a unicode emoji.
- **Why this matters:** emoji render differently per OS/browser and read as casual. Against the premium navy + gold aesthetic they undercut the boutique feel and aren't brand-tunable (you can't recolor them gold).
- **Recommended system → Lucide** (CDN, `https://unpkg.com/lucide@latest`). Lucide's clean, consistent `~1.5–2px` stroke matches the system's hairline borders and reads "professional real-estate" far better than emoji. Suggested mappings:
  - 📢 promotion → `megaphone` · 🎯 focus → `target` · 💼 representation → `briefcase` · ⚡ fast → `zap`
  - 📸 photos → `camera` · 📅 showings → `calendar-days` · 📁 docs → `folder` · ✅ screening → `check-circle`
  - 🏘️ tenants → `building-2` · 🔑 landlords → `key-round` · 📧 email → `mail` · 📍 location → `map-pin`
  - 🛏 beds → `bed-double` · 🚿 baths → `bath` · 🐾 pets → `paw-print` · 🚗 parking → `car`
  - Render gold (`--gold-500`) on navy, `1.5px` stroke, 18–24px.
- **Substitution flag:** Lucide is a **substitution** — it is *not* present in the source codebase, which uses only emoji. I recommend it but did not rip out emoji from the original; the UI kit demonstrates the Lucide path so you can compare. **Tell me if you'd rather keep emoji** (it is a valid, friendlier choice for a solo-agent local brand) **or commit fully to Lucide**, and I'll standardize one way across all components.
- **Logo / brand marks:** the building-cluster + roofline logomark lives in `assets/logo.jpeg` (raster). A clean vector version doesn't exist yet — if you have one (SVG/PNG with transparency), send it and I'll wire it into the components in place of the raster + the "L" monogram fallback the codebase uses in the navbar/footer.
- **Unicode arrows** (`→` `←`) are intentional and brand-correct in button labels — keep these.

---

## INDEX — what's in this system

**Foundations**
- `styles.css` — entry point (link this); imports everything below.
- `tokens/colors.css` · `typography.css` · `spacing.css` · `effects.css` · `fonts.css`
- `guidelines/*.html` — specimen cards (navy, gold, neutrals, status, type, spacing, radii, elevation, brand logo).

**Components** (`window.LondonRentalDesignSystem_3d2eff`)
- `components/core/` — **Button**, **Badge**, **Card**, **SectionTag**, **Stat**
- `components/forms/` — **Input**, **Select**, **Switch**, **FilterChip**
- `components/overlay/` — **Dialog**, **StepIndicator**
- `components/listings/` — **ListingCard**

**UI kits**
- `ui_kits/website/` — full LondonRental.ca marketing site (hero, listings + filters + maps, 4-step landlord flow, tenant inquiry, admin manager, about/Kunal, footer). See its `README.md`.

**Assets**
- `assets/logo.jpeg` — primary logo · `assets/kunal.jpeg` — founder photo.

**Other**
- `SKILL.md` — Agent-Skills entry point for downloading/using this system in Claude Code.
- `londonrental/main.jsx` — original source codebase (provenance).


