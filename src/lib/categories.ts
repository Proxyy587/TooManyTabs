/**
 * Smart categories: files every URL under what the page *is* (docs, video,
 * shopping…), not which site it came from. Runs entirely on-device from the
 * URL and title; nothing is sent anywhere.
 *
 * Order of evidence (first match wins):
 *   1. your own rules ("always file example.com under Work")
 *   2. local/dev hosts (localhost, 127.0.0.1, *.local, *.test)
 *   3. known hosts, most specific first (music.youtube.com before youtube.com)
 *   4. subdomain hints (docs., blog., shop.…)
 *   5. path hints (/docs/, /blog/, /cart…)
 *   6. title hints ("5 min read", "API reference"…)
 *   7. Other
 */

export type CategoryId =
  | "dev"
  | "docs"
  | "work"
  | "ai"
  | "video"
  | "music"
  | "social"
  | "news"
  | "reading"
  | "shopping"
  | "other"

export type CategoryDef = {
  id: CategoryId
  label: string
  /** One-line description used in tooltips and docs. */
  hint: string
}

export const CATEGORIES: CategoryDef[] = [
  { id: "dev", label: "Code", hint: "Repos, issues, PRs, local servers, Q&A" },
  { id: "docs", label: "Docs", hint: "Reference, guides, manuals, wikis" },
  { id: "work", label: "Work", hint: "Mail, calendars, docs editors, project tools" },
  { id: "ai", label: "AI", hint: "Chat assistants and AI tools" },
  { id: "video", label: "Watch", hint: "Video and streaming" },
  { id: "music", label: "Listen", hint: "Music and podcasts" },
  { id: "social", label: "Social", hint: "Feeds, forums and chat" },
  { id: "news", label: "News", hint: "News sites and aggregators" },
  { id: "reading", label: "Read", hint: "Articles, blogs, newsletters" },
  { id: "shopping", label: "Shop", hint: "Stores, carts and product pages" },
  { id: "other", label: "Other", hint: "Everything else" },
]

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<
  CategoryId,
  CategoryDef
>

export function isCategoryId(v: unknown): v is CategoryId {
  return typeof v === "string" && v in CATEGORY_BY_ID
}

/** host (or parent domain) → category. Most specific host wins. */
const HOSTS: Record<string, CategoryId> = {
  // code
  "github.com": "dev",
  "gist.github.com": "dev",
  "gitlab.com": "dev",
  "bitbucket.org": "dev",
  "stackoverflow.com": "dev",
  "stackexchange.com": "dev",
  "serverfault.com": "dev",
  "superuser.com": "dev",
  "npmjs.com": "dev",
  "pypi.org": "dev",
  "crates.io": "dev",
  "codepen.io": "dev",
  "codesandbox.io": "dev",
  "stackblitz.com": "dev",
  "replit.com": "dev",
  "vercel.com": "dev",
  "netlify.com": "dev",
  "app.netlify.com": "dev",
  "console.cloud.google.com": "dev",
  "console.aws.amazon.com": "dev",
  "portal.azure.com": "dev",
  "dash.cloudflare.com": "dev",
  "huggingface.co": "dev",
  "leetcode.com": "dev",
  "regex101.com": "dev",
  "jsfiddle.net": "dev",
  "sentry.io": "dev",
  "neon.tech": "dev",
  "supabase.com": "dev",
  "render.com": "dev",
  "railway.app": "dev",
  "fly.io": "dev",
  "hub.docker.com": "dev",
  "bundlephobia.com": "dev",
  "caniuse.com": "docs",
  // docs & reference
  "developer.mozilla.org": "docs",
  "developer.chrome.com": "docs",
  "developer.apple.com": "docs",
  "developers.google.com": "docs",
  "learn.microsoft.com": "docs",
  "devdocs.io": "docs",
  "readthedocs.io": "docs",
  "readthedocs.org": "docs",
  "gitbook.io": "docs",
  "wikipedia.org": "docs",
  "wikimedia.org": "docs",
  "wiktionary.org": "docs",
  "w3.org": "docs",
  "w3schools.com": "docs",
  "react.dev": "docs",
  "nextjs.org": "docs",
  "vitejs.dev": "docs",
  "vite.dev": "docs",
  "tailwindcss.com": "docs",
  "typescriptlang.org": "docs",
  "nodejs.org": "docs",
  "python.org": "docs",
  "go.dev": "docs",
  "rust-lang.org": "docs",
  "kotlinlang.org": "docs",
  "khanacademy.org": "docs",
  "coursera.org": "docs",
  "udemy.com": "docs",
  "edx.org": "docs",
  "arxiv.org": "docs",
  "scholar.google.com": "docs",
  // work
  "mail.google.com": "work",
  "calendar.google.com": "work",
  "docs.google.com": "work",
  "drive.google.com": "work",
  "sheets.google.com": "work",
  "slides.google.com": "work",
  "meet.google.com": "work",
  "keep.google.com": "work",
  "outlook.live.com": "work",
  "outlook.office.com": "work",
  "office.com": "work",
  "teams.microsoft.com": "work",
  "notion.so": "work",
  "notion.site": "reading",
  "figma.com": "work",
  "linear.app": "work",
  "atlassian.net": "work",
  "atlassian.com": "work",
  "trello.com": "work",
  "asana.com": "work",
  "monday.com": "work",
  "clickup.com": "work",
  "slack.com": "work",
  "app.slack.com": "work",
  "zoom.us": "work",
  "miro.com": "work",
  "airtable.com": "work",
  "dropbox.com": "work",
  "box.com": "work",
  "canva.com": "work",
  "loom.com": "work",
  "calendly.com": "work",
  "hubspot.com": "work",
  "salesforce.com": "work",
  "stripe.com": "work",
  "dashboard.stripe.com": "work",
  // ai
  "chatgpt.com": "ai",
  "chat.openai.com": "ai",
  "openai.com": "ai",
  "platform.openai.com": "ai",
  "claude.ai": "ai",
  "anthropic.com": "ai",
  "console.anthropic.com": "ai",
  "gemini.google.com": "ai",
  "aistudio.google.com": "ai",
  "perplexity.ai": "ai",
  "copilot.microsoft.com": "ai",
  "poe.com": "ai",
  "grok.com": "ai",
  "mistral.ai": "ai",
  "chat.mistral.ai": "ai",
  "chat.deepseek.com": "ai",
  "midjourney.com": "ai",
  "v0.dev": "ai",
  "v0.app": "ai",
  "lovable.dev": "ai",
  "bolt.new": "ai",
  "cursor.com": "ai",
  // video
  "youtube.com": "video",
  "youtu.be": "video",
  "m.youtube.com": "video",
  "vimeo.com": "video",
  "netflix.com": "video",
  "twitch.tv": "video",
  "primevideo.com": "video",
  "disneyplus.com": "video",
  "hulu.com": "video",
  "max.com": "video",
  "tv.apple.com": "video",
  "hotstar.com": "video",
  "jiocinema.com": "video",
  "dailymotion.com": "video",
  "crunchyroll.com": "video",
  "tiktok.com": "video",
  // music & audio
  "music.youtube.com": "music",
  "open.spotify.com": "music",
  "spotify.com": "music",
  "soundcloud.com": "music",
  "music.apple.com": "music",
  "podcasts.apple.com": "music",
  "bandcamp.com": "music",
  "deezer.com": "music",
  "tidal.com": "music",
  "gaana.com": "music",
  "jiosaavn.com": "music",
  "pocketcasts.com": "music",
  "overcast.fm": "music",
  // social
  "twitter.com": "social",
  "x.com": "social",
  "reddit.com": "social",
  "old.reddit.com": "social",
  "facebook.com": "social",
  "instagram.com": "social",
  "threads.net": "social",
  "threads.com": "social",
  "linkedin.com": "social",
  "bsky.app": "social",
  "mastodon.social": "social",
  "discord.com": "social",
  "web.whatsapp.com": "social",
  "web.telegram.org": "social",
  "pinterest.com": "social",
  "tumblr.com": "social",
  "quora.com": "social",
  "producthunt.com": "social",
  "dribbble.com": "social",
  "behance.net": "social",
  // news
  "news.ycombinator.com": "news",
  "news.google.com": "news",
  "nytimes.com": "news",
  "washingtonpost.com": "news",
  "theguardian.com": "news",
  "bbc.com": "news",
  "bbc.co.uk": "news",
  "cnn.com": "news",
  "reuters.com": "news",
  "apnews.com": "news",
  "bloomberg.com": "news",
  "ft.com": "news",
  "wsj.com": "news",
  "economist.com": "news",
  "theverge.com": "news",
  "techcrunch.com": "news",
  "arstechnica.com": "news",
  "wired.com": "news",
  "engadget.com": "news",
  "axios.com": "news",
  "npr.org": "news",
  "aljazeera.com": "news",
  "thehindu.com": "news",
  "indianexpress.com": "news",
  "hindustantimes.com": "news",
  "timesofindia.indiatimes.com": "news",
  "ndtv.com": "news",
  "lobste.rs": "news",
  "techmeme.com": "news",
  // reading
  "medium.com": "reading",
  "substack.com": "reading",
  "dev.to": "reading",
  "hashnode.dev": "reading",
  "hashnode.com": "reading",
  "mirror.xyz": "reading",
  "ghost.io": "reading",
  "wordpress.com": "reading",
  "blogspot.com": "reading",
  "goodreads.com": "reading",
  "getpocket.com": "reading",
  "longreads.com": "reading",
  "aeon.co": "reading",
  "paulgraham.com": "reading",
  "kottke.org": "reading",
  "smashingmagazine.com": "reading",
  "css-tricks.com": "reading",
  // shopping
  "amazon.com": "shopping",
  "amazon.in": "shopping",
  "amazon.co.uk": "shopping",
  "amazon.de": "shopping",
  "ebay.com": "shopping",
  "etsy.com": "shopping",
  "walmart.com": "shopping",
  "target.com": "shopping",
  "bestbuy.com": "shopping",
  "aliexpress.com": "shopping",
  "temu.com": "shopping",
  "shein.com": "shopping",
  "flipkart.com": "shopping",
  "myntra.com": "shopping",
  "ajio.com": "shopping",
  "nykaa.com": "shopping",
  "meesho.com": "shopping",
  "ikea.com": "shopping",
  "apple.com/shop": "shopping",
  "store.steampowered.com": "shopping",
  "zalando.com": "shopping",
  "asos.com": "shopping",
  "uniqlo.com": "shopping",
  "nike.com": "shopping",
  "costco.com": "shopping",
  "wayfair.com": "shopping",
  "newegg.com": "shopping",
  "shopify.com": "shopping",
}

const SUBDOMAIN_HINTS: Array<[RegExp, CategoryId]> = [
  [/^(docs|doc|developer|developers|devdocs|api|reference|learn|wiki|manual|guide|guides|help|support|kb)\./, "docs"],
  [/^(blog|blogs|engineering|journal|posts)\./, "reading"],
  [/^(shop|store|checkout|cart)\./, "shopping"],
  [/^(news)\./, "news"],
  [/^(music|podcasts?|radio)\./, "music"],
  [/^(mail|calendar|meet|drive)\./, "work"],
  [/^(git|ci|jenkins|grafana|kibana|staging|dev)\./, "dev"],
]

const PATH_HINTS: Array<[RegExp, CategoryId]> = [
  [/\/(docs?|documentation|reference|manual|api-reference|guides?|handbook|tutorials?)(\/|$)/i, "docs"],
  [/\/(blog|posts?|articles?|stories|essays?|newsletter)(\/|$)/i, "reading"],
  [/\/(cart|checkout|basket|bag|products?|dp|gp\/product|item|listing|shop)(\/|$)/i, "shopping"],
  [/\/(watch|videos?|embed|live)(\/|$)/i, "video"],
  [/\/(podcasts?|episodes?|album|track|playlist)(\/|$)/i, "music"],
  [/\/(news)(\/|$)/i, "news"],
]

const TITLE_HINTS: Array<[RegExp, CategoryId]> = [
  [/(pull request|merge request|issue #\d+|· GitHub|· GitLab|- Stack Overflow)/i, "dev"],
  [/\b(documentation|api reference|reference guide|user guide|docs)\b/i, "docs"],
  [/\b(\d+\s?min(ute)?s? read|newsletter|op-ed|essay)\b/i, "reading"],
  [/\b(add to cart|buy now|free shipping|best price|% off|deals?)\b/i, "shopping"],
  [/\b(podcast|episode \d+|playlist|official audio|lyrics)\b/i, "music"],
  [/\b(official trailer|full episode|livestream|official video)\b/i, "video"],
  [/\b(breaking news|live updates|headlines)\b/i, "news"],
]

const LOCAL_HOST = /^(localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0|\[::1\]|.+\.(local|test|localhost|internal))$/i

export type CategoryRules = Record<string, CategoryId>

export type Classification = {
  category: CategoryId
  via: "custom" | "local" | "host" | "subdomain" | "path" | "title" | "fallback"
}

/** Lowercased hostname without a leading www., or "" for non-web URLs. */
export function hostOf(url: string): string {
  try {
    const u = new URL(url)
    if (u.protocol !== "http:" && u.protocol !== "https:") return ""
    return u.hostname.toLowerCase().replace(/^www\./, "")
  } catch {
    return ""
  }
}

/** host and each parent domain, most specific first: a.b.c.com → a.b.c.com, b.c.com, c.com */
export function hostChain(host: string): string[] {
  const parts = host.split(".")
  const out: string[] = []
  for (let i = 0; i < parts.length - 1; i++) out.push(parts.slice(i).join("."))
  return out
}

export function classify(url: string, title = "", rules: CategoryRules = {}): Classification {
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return { category: "other", via: "fallback" }
  }
  if (u.protocol === "file:") return { category: "docs", via: "path" }
  if (u.protocol !== "http:" && u.protocol !== "https:") return { category: "other", via: "fallback" }

  const host = u.hostname.toLowerCase().replace(/^www\./, "")
  const chain = hostChain(host)

  for (const h of chain) {
    const custom = rules[h]
    if (custom && isCategoryId(custom)) return { category: custom, via: "custom" }
  }

  if (LOCAL_HOST.test(host) || u.port === "3000" || u.port === "5173" || u.port === "8080") {
    return { category: "dev", via: "local" }
  }

  // host + first path segment lets us express rules like apple.com/shop
  const firstSeg = u.pathname.split("/")[1]
  if (firstSeg) {
    for (const h of chain) {
      const hit = HOSTS[`${h}/${firstSeg.toLowerCase()}`]
      if (hit) return { category: hit, via: "host" }
    }
  }
  for (const h of chain) {
    const hit = HOSTS[h]
    if (hit) return { category: hit, via: "host" }
  }

  for (const [re, cat] of SUBDOMAIN_HINTS) if (re.test(host)) return { category: cat, via: "subdomain" }
  for (const [re, cat] of PATH_HINTS) if (re.test(u.pathname)) return { category: cat, via: "path" }
  for (const [re, cat] of TITLE_HINTS) if (re.test(title)) return { category: cat, via: "title" }

  return { category: "other", via: "fallback" }
}

/** User rules key on the full host (no www.); they also cover its subdomains. */
export function ruleKeyFor(url: string): string {
  return hostOf(url)
}
