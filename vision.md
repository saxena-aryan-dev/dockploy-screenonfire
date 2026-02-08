# Vision - ScreenOnFire Complete Codebase Reference

This file serves as a comprehensive reference for Claude Code sessions. It documents the full architecture, every feature, how everything connects, and a changelog of session modifications.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Directory Structure](#directory-structure)
4. [Application Architecture](#application-architecture)
5. [Pages & Routes](#pages--routes)
6. [API Endpoints](#api-endpoints)
7. [Library Modules](#library-modules-lib)
8. [Custom Hooks](#custom-hooks)
9. [Components](#components)
10. [Database Schema](#database-schema-prisma)
11. [Authentication System](#authentication-system)
12. [AI Integration](#ai-integration)
13. [Image Optimization Pipeline](#image-optimization-pipeline)
14. [Deployment & Infrastructure](#deployment--infrastructure)
15. [Environment Variables](#environment-variables)
16. [Known Architecture Debt](#known-architecture-debt)
17. [Session Changelog](#session-changelog)

---

## Project Overview

**ScreenOnFire** is a movie discovery and recommendation platform built with Next.js 14. It provides:
- Movie browsing with search, filters, genres, and regional content (Indian/Bollywood/Hindi)
- AI-powered chat assistant ("CineSensei") for personalized movie recommendations
- ML-based recommendation engine with weighted feature scoring
- User watchlists, likes/dislikes, ratings, reviews
- Threaded discussion forums per movie with emoji reactions
- Streaming provider lookup (25+ services)
- AI-generated movie reviews
- PWA support with offline image caching

**Live URL:** `https://screenonfire.in`
**Database:** PostgreSQL (via Prisma ORM + Supabase)
**Auth:** Google OAuth only (NextAuth v5)
**AI:** Google Gemini 2.5 Flash
**Movie Data:** TMDB API

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router, standalone output) |
| Language | TypeScript (strict mode) |
| UI Library | React 18 |
| Styling | Tailwind CSS v3 + tailwindcss-animate |
| Component Library | shadcn/ui (47 components) |
| Animation | Framer Motion |
| Auth | NextAuth v5 (next-auth@5.0.0-beta.30) + Google OAuth |
| ORM | Prisma 5 |
| Database | PostgreSQL (Supabase-hosted) |
| Supabase Client | @supabase/supabase-js (legacy, partial use) |
| AI | Google Gemini 2.5 Flash (@google/genai) |
| AI SDK | Vercel AI SDK (ai@5) |
| Movie API | TMDB (The Movie Database) |
| Icons | lucide-react |
| Fonts | Inter (Google Fonts) |
| Container | Docker (node:20-alpine) |
| Hosting | VPS via Dokploy + Traefik reverse proxy |

---

## Directory Structure

```
lookism/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (AuthProvider, FloatingChat, SW, PerfMonitor)
│   ├── page.tsx                  # Landing page → CinematicLanding
│   ├── loading.tsx               # Global loading (returns null)
│   ├── globals.css               # Global styles, dark theme, animations
│   ├── discover/
│   │   └── page.tsx              # Full movie discovery (search, filter, browse)
│   ├── watchlist/
│   │   └── page.tsx              # User's saved movies (auth required)
│   ├── movies/
│   │   └── [id]/
│   │       └── page.tsx          # Movie details (cast, trailers, streaming, similar)
│   ├── recommendations/
│   │   └── page.tsx              # AI recommendation engine UI
│   └── api/                      # API routes (15 files, 47 endpoints)
│       ├── auth/[...nextauth]/route.ts
│       ├── chat/route.ts
│       ├── discussions/route.ts
│       ├── likes/route.ts
│       ├── ml-recommendations/route.ts
│       ├── movie-review/route.ts
│       ├── preferences/route.ts
│       ├── profile/route.ts
│       ├── ratings/route.ts
│       ├── reactions/route.ts
│       ├── reviews/route.ts
│       ├── seen/route.ts
│       ├── tmdb/route.ts
│       ├── tmdb-image/route.ts
│       └── watchlist/route.ts
├── components/                   # React components
│   ├── ui/                       # 47 shadcn/ui primitives
│   ├── auth/                     # Auth components
│   │   ├── auth-modal.tsx        # Canonical auth modal (open/onOpenChange)
│   │   └── google-sign-in-button.tsx
│   ├── providers/
│   │   └── auth-provider.tsx     # NextAuth SessionProvider wrapper
│   ├── cinematic-landing.tsx     # Main landing page + discovery (largest component)
│   ├── simple-landing.tsx        # Alternative simpler landing
│   ├── floating-chat-button.tsx  # Global AI chat (CineSensei)
│   ├── movie-grid.tsx            # Responsive movie card grid
│   ├── movie-card.tsx            # Individual movie card
│   ├── popular-movies-carousel.tsx # Horizontal featured carousel
│   ├── enhanced-recommender-ui.tsx # Premium recommendation interface
│   ├── two-pane-recommender-ui.tsx # Two-pane recommendation interface
│   ├── ai-review-modal.tsx       # AI review display modal
│   ├── optimized-image.tsx       # Smart image with lazy load + caching
│   ├── user-menu.tsx             # Authenticated user dropdown
│   ├── auth-buttons.tsx          # Sign-in button (unauthenticated)
│   ├── auth-modal.tsx            # Adapter: isOpen/onClose → open/onOpenChange
│   ├── lazy-components.tsx       # Dynamic imports (AuthModal)
│   ├── performance-monitor.tsx   # Web Vitals tracker
│   ├── service-worker-initializer.tsx # SW registration
│   └── theme-provider.tsx        # next-themes wrapper
├── hooks/                        # Custom React hooks
│   ├── useMovieActions.ts        # Watchlist/like/dislike with optimistic updates
│   ├── useScrollAnimation.ts     # Scroll progress, scrollY, IntersectionObserver
│   ├── use-toast.ts              # Toast notification state manager
│   ├── use-mobile.tsx            # Mobile detection hook
│   └── use-mobile.ts             # Mobile detection (duplicate)
├── lib/                          # Core utilities & services
│   ├── auth.ts                   # NextAuth config (Google OAuth, JWT, PrismaAdapter)
│   ├── auth-middleware.ts        # requireAuth() for protected API routes
│   ├── prisma.ts                 # Prisma client singleton
│   ├── supabase.ts               # Supabase client (legacy, used by some pages)
│   ├── tmdb-supabase.ts          # Client-side TMDB wrapper (~1000 lines, 30+ functions)
│   ├── tmdb-server.ts            # Server-side TMDB wrapper (retry logic)
│   ├── ml-recommender.ts         # ML recommendation engine (757 lines, 2-phase scoring)
│   ├── prompts.ts                # AI system prompts & context building
│   ├── cache.ts                  # In-memory TTL cache
│   ├── ultra-fast-image.ts       # Aggressive image preloader + cache
│   ├── service-worker.ts         # SW lifecycle management
│   ├── performance.ts            # Performance monitoring + Web Vitals
│   ├── date.ts                   # Date utility (getYear)
│   └── utils.ts                  # Tailwind cn() helper
├── prisma/
│   └── schema.prisma             # Database schema (15 models)
├── public/
│   ├── sw.js                     # Service worker (image caching)
│   ├── logo.png                  # App icon
│   └── manifest.json             # PWA manifest
├── scripts/
│   ├── startup.sh                # Production startup (DB push + server start)
│   ├── test-connection.js        # Supabase connection tester
│   ├── production-migrate.sh     # Production DB migration
│   └── setup-database.sh         # Database setup
├── Dockerfile                    # Multi-stage Docker build
├── next.config.mjs               # Next.js config (standalone, security headers, image domains)
├── tailwind.config.ts            # Tailwind config (dark mode, custom theme)
├── tsconfig.json                 # TypeScript config
├── package.json                  # Dependencies
└── CLAUDE.md                     # Claude Code instructions
```

---

## Application Architecture

### High-Level Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                      BROWSER                             │
│                                                          │
│  ┌──────────────────────────────────────────────┐       │
│  │ Next.js App (React 18)                        │       │
│  │                                                │       │
│  │  AuthProvider (NextAuth SessionProvider)       │       │
│  │    ├── CinematicLanding / SimpleLanding       │       │
│  │    ├── Discover Page                           │       │
│  │    ├── Movie Detail Page                       │       │
│  │    ├── Watchlist Page                          │       │
│  │    ├── Recommendations Page                    │       │
│  │    └── FloatingChatButton (global)            │       │
│  │                                                │       │
│  │  Hooks:                                        │       │
│  │    useMovieActions → /api/watchlist, /api/likes│       │
│  │    useSession → NextAuth session               │       │
│  │    useScrollY → scroll animations              │       │
│  └──────────────────────────────────────────────┘       │
│                         │                                │
│  ┌──────────────────────┼───────────────────────┐       │
│  │ Image Pipeline       │                        │       │
│  │ ultra-fast-image.ts ←→ sw.js (Service Worker)│       │
│  │ OptimizedImage component                      │       │
│  └──────────────────────┼───────────────────────┘       │
│                         │                                │
└─────────────────────────┼────────────────────────────────┘
                          │ fetch()
                          ▼
┌─────────────────────────────────────────────────────────┐
│               NEXT.JS API ROUTES (Server)                │
│                                                          │
│  /api/auth/[...nextauth]  ←→  Google OAuth               │
│  /api/tmdb                ←→  TMDB API (+ CORS proxy)   │
│  /api/tmdb-image          ←→  TMDB CDN (image proxy)    │
│  /api/chat                ←→  Gemini AI (streaming)      │
│  /api/movie-review        ←→  Gemini AI (streaming)      │
│  /api/ml-recommendations  ←→  ML Engine + TMDB API       │
│  /api/watchlist           ←→  Prisma → PostgreSQL        │
│  /api/likes               ←→  Prisma → PostgreSQL        │
│  /api/discussions         ←→  Prisma → PostgreSQL        │
│  /api/reactions           ←→  Prisma → PostgreSQL        │
│  /api/ratings             ←→  Prisma → PostgreSQL        │
│  /api/reviews             ←→  Prisma → PostgreSQL        │
│  /api/seen                ←→  Prisma → PostgreSQL        │
│  /api/profile             ←→  Prisma → PostgreSQL        │
│  /api/preferences         ←→  Prisma → PostgreSQL        │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  EXTERNAL SERVICES                        │
│                                                          │
│  PostgreSQL (Supabase)    ← User data, watchlists, etc. │
│  TMDB API                 ← Movie data, search, discover │
│  TMDB CDN (image.tmdb.org)← Movie posters, backdrops    │
│  Google OAuth             ← Authentication               │
│  Google Gemini 2.5 Flash  ← AI chat, AI reviews         │
│  cors.eu.org              ← CORS proxy fallback          │
└─────────────────────────────────────────────────────────┘
```

### Request Flow Examples

**User searches for "Inception":**
```
Search input → CinematicLanding.handleSearch()
  → searchMovies("Inception") [lib/tmdb-supabase.ts]
  → fetch("/api/tmdb?path=/3/search/movie&query=Inception")
  → /api/tmdb/route.ts:
    1. Try direct TMDB API with Bearer token
    2. If fails → try cors.eu.org proxy
    3. If fails → return mock data
  → Response: { results: TMDBMovie[], total_pages, total_results }
  → Update state → MovieGrid re-renders with results
```

**User adds movie to watchlist:**
```
Click heart icon → useMovieActions.addToWatchlist(movie)
  → Optimistic UI update (add to Set immediately)
  → fetch("/api/watchlist", { method: "POST", body: { movieId, movieTitle, posterUrl } })
  → /api/watchlist/route.ts:
    1. Check session (requireAuth)
    2. Check duplicate (findUnique)
    3. Create record (prisma.watchlistItem.create)
  → If error: revert optimistic update
  → If success: UI already showing updated state
```

**User opens AI chat:**
```
Click floating chat → Type message → Send
  → fetch("/api/chat", { method: "POST", body: { messages, stream: true } })
  → /api/chat/route.ts:
    1. Build prompt with CineSensei personality [lib/prompts.ts]
    2. Send to Gemini 2.5 Flash (temp: 0.6, maxTokens: 2048)
    3. Stream response via SSE
  → FloatingChatButton parses SSE chunks
  → Text appears progressively in chat bubble
```

---

## Pages & Routes

### `/` — Landing Page
- **Component:** `CinematicLanding`
- **Auth:** Not required
- **Features:**
  - Full-viewport hero with parallax scroll effect
  - Sticky header with Movies/Series toggle, sort options, search
  - Featured movie banner (auto-rotating, 5s intervals) with trailer/watchlist/info buttons
  - Movie grid with genre filters, rating filters, sorting
  - Popular movies carousel (top 10 with rank badges)
  - Content type switching: Movies ↔ TV Series
  - Sort modes: Popular, Trending, Top-Rated, Indian
  - Load more pagination
  - Auth modal for sign-in

### `/discover` — Full Discovery Interface
- **Component:** Custom page component
- **Auth:** Optional (required for watchlist actions)
- **Features:**
  - Search bar with real-time results
  - Advanced filters: genres, min rating, region (All/Indian/Bollywood/Hindi), sort
  - 7 browsing tabs: Popular, Top Rated, Search, Discover, Indian, Bollywood, Hindi
  - Hero section with featured movie (navigation arrows)
  - Watch trailer (YouTube), add to watchlist, more info buttons
  - Image preloading (ultra-fast-image) across multiple resolutions
  - Supabase Auth integration (legacy — see architecture debt)

### `/movies/[id]` — Movie Details
- **Component:** Custom page component
- **Auth:** Not required
- **Features:**
  - Hero with backdrop + poster + metadata
  - 5 tabs: Cast & Crew, Synopsis, Where to Watch, Trailers, Similar Titles
  - **Cast & Crew:** Grid of actors (20 max) + key crew (director, producer, writer)
  - **Synopsis:** Full overview, director, release date, runtime, rating, tagline
  - **Where to Watch:** 25+ streaming providers with direct search URLs (Netflix, Prime, Disney+, HBO Max, Apple TV+, etc.)
  - **Trailers:** YouTube thumbnails with play buttons
  - **Similar Titles:** Grid/list toggle view
  - AI Review button (streams review from Gemini)
  - Like/Dislike buttons
  - Data loaded in parallel: `Promise.allSettled([details, credits, videos, similar, watchProviders])`

### `/watchlist` — User Watchlist
- **Component:** Custom page component
- **Auth:** Required
- **Features:**
  - Grid of saved movies with posters
  - Remove button (trash icon) on hover
  - Empty state with "Discover Movies" CTA
  - Loading skeletons (10 cards)
  - Unauthenticated view: sign-in prompt

### `/recommendations` — AI Recommendations
- **Component:** `EnhancedRecommenderUI`
- **Auth:** Not required (but benefits from user data)
- **Features:**
  - Movie search with debounced TMDB calls (300ms)
  - Select movies you like → tune 7 weight sliders
  - Weights: Genre, Rating, Director, Cast, Cinematography, Keywords, Year
  - ML engine generates scored recommendations with reasons
  - Sort: Relevance, Rating, Year, Popularity
  - Grid density toggle
  - Match score badges (0-100%)

---

## API Endpoints

### Authentication
| Endpoint | Methods | Auth | Description |
|----------|---------|------|-------------|
| `/api/auth/[...nextauth]` | GET, POST | N/A | NextAuth handler (Google OAuth) |

### AI Services
| Endpoint | Methods | Auth | Description |
|----------|---------|------|-------------|
| `/api/chat` | POST | No | AI chat with CineSensei (Gemini, streaming SSE) |
| `/api/movie-review` | POST | No | AI movie review generation (Gemini, streaming SSE) |
| `/api/ml-recommendations` | GET, POST | No | ML-based movie recommendations (2-phase scoring) |

### Movie Data (TMDB Proxy)
| Endpoint | Methods | Auth | Description |
|----------|---------|------|-------------|
| `/api/tmdb` | GET, OPTIONS | No | TMDB API proxy with retry + CORS proxy fallback + mock data |
| `/api/tmdb-image` | GET, OPTIONS | No | TMDB image proxy with 24h cache + retry (3 attempts) |

### User Data (Prisma → PostgreSQL)
| Endpoint | Methods | Auth | Description |
|----------|---------|------|-------------|
| `/api/watchlist` | GET, POST, DELETE | Session | User watchlist management |
| `/api/likes` | GET, POST, DELETE | Session | Movie likes/dislikes (mutual exclusion) |
| `/api/seen` | GET, POST, DELETE | No* | Mark movies as watched |
| `/api/ratings` | GET, POST, PUT, DELETE | No* | Movie ratings (0-10 scale, upsert) |
| `/api/reviews` | GET, POST, PUT, DELETE | No* | User movie reviews |
| `/api/discussions` | GET, POST, PUT, DELETE | No* | Threaded discussions per movie |
| `/api/reactions` | GET, POST, DELETE | No* | Discussion reactions (like, love, haha, wow, sad, angry) |
| `/api/profile` | GET, POST, PUT, DELETE | No* | User profile with stats |
| `/api/preferences` | GET, POST, PUT, DELETE | No* | User preferences (genres, languages, theme) |

*These endpoints use `userId` query params instead of session auth.

### Streaming Endpoints (SSE)
Both `/api/chat` and `/api/movie-review` support SSE streaming:
```
Content-Type: text/event-stream
Format: data: {"text":"chunk","done":false}\n\n
Final:  data: {"done":true}\n\n
Error:  data: {"error":"message"}\n\n
```

### TMDB Proxy Resilience Chain
```
1. Direct TMDB API (Bearer token) → Cache: 1h
2. CORS proxy (cors.eu.org)       → Cache: 30min
3. Mock data fallback              → Cache: 1min

Response headers: X-Data-Source: 'tmdb-direct' | 'cors-proxy' | 'mock-data'
Retry: 3 attempts, exponential backoff (300ms, 600ms, 1200ms)
```

---

## Library Modules (`lib/`)

### `auth.ts` — NextAuth Configuration
- **Provider:** Google OAuth (sole provider)
- **Adapter:** PrismaAdapter → PostgreSQL
- **Session:** JWT strategy, 30-day maxAge
- **Callbacks:** JWT populates id/email/name/picture; Session maps from JWT with null-safe `?? ""`
- **Secret:** `AUTH_SECRET || NEXTAUTH_SECRET`
- **Key:** `allowDangerousEmailAccountLinking: true` (safe with single provider)
- **Exports:** `authOptions`, `auth()`, `signIn()`, `signOut()`, `handlers`

### `auth-middleware.ts` — API Route Protection
- `requireAuth()` → returns `{ session, user }` or 401 response
- Used by `/api/watchlist`, `/api/likes`

### `prisma.ts` — Database Client
- Singleton PrismaClient (prevents connection pool exhaustion in dev hot-reload)
- Dev: logs queries, errors, warnings
- Prod: errors only

### `supabase.ts` — Supabase Client (Legacy)
- Client-side Supabase access
- Used by `discover/page.tsx` and `simple-landing.tsx` for auth + watchlist
- **Architecture debt:** should be migrated to NextAuth/Prisma

### `tmdb-supabase.ts` — Client-Side TMDB Wrapper (~1000 lines)
- Routes all requests through `/api/tmdb` proxy
- 30+ exported functions for movies, TV series, search, discover, regional content
- Key types: `TMDBMovie`, `TMDBMovieDetails`, `TMDBGenre`, `MovieResponse`
- Movie functions: `getPopularMovies`, `getTopRatedMovies`, `searchMovies`, `discoverMovies`, `getSimilarMovies`, `getMovieCredits`, `getMovieVideos`, `getMovieWatchProviders`
- Regional: `getIndianMovies`, `getBollywoodMovies`, `getHindiMovies`
- TV Series: `getPopularSeries`, `getTopRatedSeries`, `searchSeries`, `getSeriesDetails`
- Utils: `getImageUrl(path, size)`, `formatRuntime(minutes)`, `validateImageUrl(url)`
- All functions have mock data fallbacks

### `tmdb-server.ts` — Server-Side TMDB Wrapper
- Direct TMDB API calls with Bearer token
- Retry logic (2 retries, exponential backoff: 500ms, 3000ms)
- Used by ML recommender to fetch detailed movie data (cast, crew, runtime)
- Exports: `fetchFromTMDBServer`, `getMovieDetailsServer`, `getSimilarMoviesServer`, `getPopularMoviesServer`, `getTopRatedMoviesServer`, `discoverMoviesServer`

### `ml-recommender.ts` — ML Recommendation Engine (757 lines)
- **Two-phase algorithm:**
  1. **Quick scoring** (no API calls): genre, rating, year, popularity, keywords → top 50-100 candidates
  2. **Detailed scoring** (with API): fetch cast/crew/runtime, recalculate with full features
- **Similarity metrics:**
  - Genre: Jaccard similarity
  - Rating: penalizes large differences
  - Director/Cast: commonality scoring
  - Keywords: extracted from title + overview
  - Year/era: decade similarity
  - Cinematography: cosine similarity of feature vectors
- **Advanced features:**
  - Franchise detection (prevents 20 Harry Potter recommendations)
  - Diversity selection (greedy algorithm with diversity penalty)
  - TMDB Similar boost (25% amplification)
  - Caching (30-min TTL for movie details)
  - Adaptive thresholds based on user weight preferences
- **Exports:** `extractMovieFeatures`, `generateRecommendations`, `generateUserProfile`

### `prompts.ts` — AI System Prompts
- `SYSTEM_PROMPT`: CineSensei personality (witty movie critic, <200 words)
- `buildChatPrompt(history, userData)`: injects user's top 10 likes, watchlist, recently watched
- `buildReviewPrompt(movieTitle)`: structured review format with rating

### `cache.ts` — In-Memory TTL Cache
- `apiCache.set(key, data, ttlSeconds)` (default 5 min)
- `apiCache.get(key)` → returns null if expired
- Auto-cleanup every 10 minutes (browser only)

### `ultra-fast-image.ts` — Image Preloading
- Singleton `ultraFastImageLoader`
- `preloadImages(urls)`: batch preload
- `backgroundPreload(urls)`: non-blocking queue (batches of 5, 50ms delay)
- `loadImage(url)`: deduped loading with timeout
- `getCachedImage(url)`: instant retrieval
- Coordinates with service worker for persistent caching
- Memory cleanup on page unload

### `service-worker.ts` — SW Lifecycle
- `registerServiceWorker()`: registers `/sw.js`
- `preloadImagesViaServiceWorker(urls)`: message-based preloading
- `isServiceWorkerReady()`: status check

### `performance.ts` — Performance Monitoring
- Web Vitals: CLS, LCP, FID tracking
- `perf.mark()`, `perf.measure()`, `perf.trackApiCall()`, `perf.trackComponentRender()`
- Memory logging (30s intervals)
- Only logs slow operations (>100ms)

### `date.ts` — Date Utility
- `getYear(dateString)`: returns year string or "—" for invalid dates

### `utils.ts` — CSS Utility
- `cn(...inputs)`: merges Tailwind classes (clsx + tailwind-merge)

---

## Custom Hooks

### `useMovieActions` — Watchlist/Like/Dislike Manager
- **File:** `hooks/useMovieActions.ts`
- **Uses:** NextAuth session, fetch to `/api/watchlist` and `/api/likes`
- **State:** `watchlist: Set<number>`, `likes: Set<number>`, `dislikes: Set<number>`, `loading: Set<number>`
- **Features:**
  - Loads user data on mount (parallel fetch)
  - Optimistic UI updates with error rollback
  - Like/dislike mutual exclusion (liking removes dislike, vice versa)
  - Auth check with `onAuthRequired` callback
- **Returns:** `isInWatchlist()`, `isLiked()`, `isDisliked()`, `isLoading()`, `addToWatchlist()`, `removeFromWatchlist()`, `likeMovie()`, `dislikeMovie()`

### `useScrollAnimation` — Scroll Tracking
- **File:** `hooks/useScrollAnimation.ts`
- `useScrollProgress()`: scroll 0-1 (page-level)
- `useScrollY()`: raw scroll position
- `useInView(threshold)`: IntersectionObserver for element visibility

### `use-toast` — Toast Notifications
- **File:** `hooks/use-toast.ts`
- Reducer-based toast state management
- TOAST_LIMIT: 1, auto-remove delay

### `use-mobile` — Mobile Detection
- **File:** `hooks/use-mobile.tsx` and `hooks/use-mobile.ts`
- Detects mobile viewport

---

## Components

### Core Page Components

**CinematicLanding** (`cinematic-landing.tsx`) — Main landing + discovery
- Largest component (~800+ lines)
- Hero with parallax, featured banner with auto-rotation, movie grid, filters
- Movies/Series toggle, 4 sort modes, genre checkboxes, rating filters
- Uses: MovieGrid, PopularMoviesCarousel, UserMenu, AuthButtons, AuthModal, OptimizedImage

**EnhancedRecommenderUI** (`enhanced-recommender-ui.tsx`) — Premium recommendation UI
- Movie search with keyboard navigation
- 7 weight sliders, sort/density controls
- ML recommendation results with match scores and reasons
- Sub-components: MovieCard, SelectedChip, MoviePicker, WeightSlider, Toolbar

**TwoPaneRecommenderUI** (`two-pane-recommender-ui.tsx`) — Alternative recommendation UI
- Desktop: fixed two-pane layout
- Mobile: floating filter button + bottom sheet
- Same feature set as EnhancedRecommenderUI

### Movie Display Components

**MovieGrid** (`movie-grid.tsx`) — Responsive movie card grid
- 2-5 columns responsive
- Framer Motion staggered animation
- Loading skeletons, empty state

**MovieCard** (`movie-card.tsx`) — Individual movie card
- Poster with hover zoom, rating badge, watchlist heart
- Click → navigate to `/movies/[id]`
- Uses: OptimizedImage, getImageUrl, getYear

**PopularMoviesCarousel** (`popular-movies-carousel.tsx`) — Horizontal featured carousel
- Top 10 with rank badges, snap scroll
- Wide cards: poster + title + rating + overview + actions
- Mark as watched, add to watchlist

**OptimizedImage** (`optimized-image.tsx`) — Smart image component
- IntersectionObserver lazy loading
- Cache-first via ultraFastImageLoader
- Fallback chain: cached → direct → /api/tmdb-image proxy → placeholder
- Blur loading effect, error state with film emoji

### AI Components

**FloatingChatButton** (`floating-chat-button.tsx`) — Global AI chat
- Fixed bottom-right button on all pages
- Sheet modal with full chat interface
- CineSensei personality with suggested prompts
- Streaming responses (parses SSE JSON lines)
- Markdown support in messages
- Clear chat, retry on error

**AiReviewModal** (`ai-review-modal.tsx`) — AI review display
- Dialog modal for streaming AI movie reviews
- Markdown formatting (bold, italic, headers)
- Loading spinner during generation

### Auth Components

**AuthProvider** (`providers/auth-provider.tsx`) — Session context
- Wraps app with NextAuth SessionProvider
- Exports: `useSession`, `signIn`, `signOut`

**AuthModal** (`auth/auth-modal.tsx`) — Canonical auth dialog
- Google-only sign-in with GoogleSignInButton
- Interface: `{ open, onOpenChange }`

**AuthModal Adapter** (`auth-modal.tsx`) — Legacy interface adapter
- Converts `{ isOpen, onClose }` → `{ open, onOpenChange }`

**GoogleSignInButton** (`auth/google-sign-in-button.tsx`) — Google OAuth button
- Official Google branding SVG
- Calls `signIn("google", { callbackUrl: "/" })`
- Loading spinner, error callback

**AuthButtons** (`auth-buttons.tsx`) — Sign-in button
- Single "Sign In" button (yellow)
- Triggers parent callback

**UserMenu** (`user-menu.tsx`) — Authenticated user dropdown
- Avatar with initials fallback
- Dropdown: name/email, My Watchlist link, Sign Out
- Uses NextAuth `signOut()`

### Utility Components

**LazyComponents** (`lazy-components.tsx`) — Dynamic imports
- `AuthModal` loaded via `next/dynamic` (SSR disabled)

**PerformanceMonitor** (`performance-monitor.tsx`) — Web Vitals
- Invisible component, tracks CLS/LCP/FID, logs memory

**ServiceWorkerInitializer** (`service-worker-initializer.tsx`) — PWA setup
- Registers service worker on mount

**ThemeProvider** (`theme-provider.tsx`) — Dark mode
- Wraps next-themes provider

### Shadcn/UI Components (47 total)
accordion, alert, alert-dialog, aspect-ratio, avatar, badge, breadcrumb, button, calendar, card, carousel, chart, checkbox, collapsible, command, context-menu, dialog, drawer, dropdown-menu, form, hover-card, input, input-otp, label, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner, switch, table, tabs, textarea, toast, toaster, toggle, toggle-group, tooltip

---

## Database Schema (Prisma)

### Models

**User** — Core user account
```
id, email (unique), name?, image?, emailVerified?, password?, createdAt, updatedAt
Relations: watchlist, likes, dislikes, seen, reviews, ratings, discussions, reactions, accounts, sessions
```

**Account** — OAuth accounts (NextAuth)
```
id, userId, type, provider, providerAccountId, refresh_token?, access_token?, expires_at?, token_type?, scope?, id_token?, session_state?
Unique: [provider, providerAccountId]
```

**Session** — Database sessions (unused with JWT strategy)
```
id, sessionToken (unique), userId, expires
```

**WatchlistItem** — Saved movies
```
id, userId, movieId (Int), movieTitle, posterUrl?, addedAt
Unique: [userId, movieId]
```

**MovieLike** / **MovieDislike** — Movie preferences
```
id, userId, movieId (Int), movieTitle, likedAt/dislikedAt
Unique: [userId, movieId]
```

**SeenMovie** — Watched history
```
id, userId, movieId (Int), movieTitle, watchedAt
Unique: [userId, movieId]
```

**MovieRating** — User ratings
```
id, userId, movieId (Int), movieTitle, rating (Float 0-10), ratedAt, updatedAt
Unique: [userId, movieId]
```

**MovieReview** — User reviews
```
id, userId, movieId (Int), movieTitle, content (Text), rating?, helpful (default 0), createdAt, updatedAt
```

**Discussion** — Threaded forum posts
```
id, movieId (Int), userId, content (Text), parentId? (self-ref), createdAt, updatedAt
Relations: user, parent, replies (self-ref), reactions
```

**DiscussionReaction** — Emoji reactions
```
id, discussionId, userId, type (String: like/love/haha/wow/sad/angry), createdAt
Unique: [discussionId, userId, type]
```

**MovieCache** — TMDB data cache
```
id (Int, TMDB movie ID), title, originalTitle?, overview?, releaseDate?, runtime?, voteAverage?, voteCount?, popularity?, posterPath?, backdropPath?, adult, originalLanguage?, genres (String[]), lastUpdated
```

**UserPreference** — User settings
```
id, userId (unique), favoriteGenres (Int[]), preferredLanguages (String[]), emailNotifications, theme ("dark"/"light"), createdAt, updatedAt
```

**SearchHistory** — Search analytics
```
id, userId?, query, results (Int), searchedAt
```

**MovieView** — View tracking
```
id, userId?, movieId (Int), viewedAt
```

---

## Authentication System

### Current Setup
- **Provider:** Google OAuth only (no email/password)
- **Library:** NextAuth v5 (next-auth@5.0.0-beta.30)
- **Adapter:** PrismaAdapter (stores users in PostgreSQL)
- **Session Strategy:** JWT (30-day expiry, no database sessions)
- **Sign-in flow:** Click "Sign In" → AuthModal opens → GoogleSignInButton → `signIn("google")` → Google OAuth → callback → JWT issued → session available via `useSession()`

### Key Configuration
```typescript
// lib/auth.ts
GoogleProvider({
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  allowDangerousEmailAccountLinking: true,  // Safe with single provider
})
session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 }
secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
```

### JWT Token Contents
```typescript
token.id      → user database ID
token.email   → user email
token.name    → user display name
token.picture → Google profile picture URL
```

### Session Callback (null-safe)
```typescript
session.user.id    = (token.id as string) ?? ""
session.user.email = (token.email as string) ?? ""
session.user.name  = (token.name as string) ?? ""
session.user.image = (token.picture as string) ?? ""
```

---

## AI Integration

### CineSensei Chat (`/api/chat`)
- **Model:** Gemini 2.5 Flash
- **Temperature:** 0.6
- **Max Tokens:** 2048
- **Personality:** Witty, knowledgeable movie critic
- **Context:** User's top 10 liked movies, watchlist items, recently watched (via `buildChatPrompt`)
- **Streaming:** SSE with JSON chunks

### AI Movie Reviews (`/api/movie-review`)
- **Model:** Gemini 2.5 Flash
- **Temperature:** 0.5
- **Max Tokens:** 2048
- **Format:** Rating (stars), strengths, weaknesses, verdict, target audience (150-200 words)

### ML Recommendations (`/api/ml-recommendations`)
- **Algorithm:** 2-phase weighted similarity scoring
- **7 Feature Weights:** Genre, Rating, Director, Cast, Cinematography, Keywords, Year
- **Processing:** Quick-score 300+ candidates → detailed-score top 50 → diversity selection → top 20 results
- **Caching:** Movie details cached 30 minutes to minimize TMDB API calls
- **Output:** Sorted recommendations with match scores and human-readable reasons

---

## Image Optimization Pipeline

```
1. Component renders OptimizedImage
2. IntersectionObserver triggers when near viewport
3. Check ultraFastImageLoader memory cache
4. If cached → instant render
5. If not → try direct TMDB CDN URL
6. If fails → try /api/tmdb-image proxy (with 3 retries, exponential backoff)
7. If fails → show placeholder
8. On success → cache in memory + service worker

Background preloading:
- CinematicLanding preloads all visible movie posters at multiple sizes
- Sizes: w185, w342, w500, w780, w1280, original
- Service worker caches images for offline access
- Memory cache cleaned on page unload
```

---

## Deployment & Infrastructure

### Docker Build (Multi-stage)
```
Stage 1 (deps):    node:20-alpine, npm install, prisma copy
Stage 2 (builder): Copy deps, NEXT_PUBLIC_* env vars, prisma generate, next build
Stage 3 (runner):  Standalone output, prisma runtime, startup script, port 3000
```

### Production Startup (`scripts/startup.sh`)
1. Attempt `prisma db push` (30s timeout, non-blocking)
2. If DB unavailable: warn but continue
3. Start Next.js server (`node server.js` on `0.0.0.0:3000`)

### Infrastructure
- **VPS:** Dokploy (Docker orchestration)
- **Reverse Proxy:** Traefik (terminates HTTPS)
- **Domain:** screenonfire.in (with www → non-www redirect)
- **Internal:** HTTP on port 3000
- **Build:** `NEXT_PUBLIC_*` vars hardcoded in Dockerfile (inlined at build time)

### Next.js Config Highlights
- `output: 'standalone'` for Docker
- Image domains: `image.tmdb.org`, `images.unsplash.com`
- Image formats: WebP, AVIF
- Security headers: `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`
- Static asset cache: 1 year (`immutable`)
- gzip compression enabled
- Radix UI + lucide-react tree-shaking optimization
- ESLint and TypeScript errors ignored in builds

---

## Environment Variables

### Required for Production
```env
# Database
DATABASE_URL=postgresql://...

# Supabase (client-side, hardcoded in Dockerfile)
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# TMDB
TMDB_API_KEY=...
TMDB_ACCESS_TOKEN=eyJ...   (or TMDB_READ_TOKEN)
NEXT_PUBLIC_TMDB_ACCESS_TOKEN=eyJ...  (hardcoded in Dockerfile)

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# NextAuth
AUTH_SECRET=<random>
AUTH_URL=https://screenonfire.in
AUTH_TRUST_HOST=true
NEXTAUTH_SECRET=<same as AUTH_SECRET>
NEXTAUTH_URL=https://screenonfire.in

# AI
GEMINI_API_KEY=...
```

### Google Cloud Console
- **Authorized JavaScript origins:** `https://screenonfire.in`
- **Authorized redirect URIs:** `https://screenonfire.in/api/auth/callback/google`

---

## Known Architecture Debt

| Issue | Severity | Location | Notes |
|-------|----------|----------|-------|
| Dual auth systems | **HIGH** | `simple-landing.tsx`, `discover/page.tsx` | These pages use Supabase Auth (`supabase.auth.getSession()`, `onAuthStateChange()`) instead of NextAuth. Needs migration. |
| Inconsistent sign-out | **HIGH** | `user-menu.tsx` vs `discover/page.tsx` vs `simple-landing.tsx` | UserMenu uses NextAuth `signOut()`, others use `supabase.auth.signOut()`. |
| Unused Prisma models | LOW | `schema.prisma` | `Session`, `VerificationToken` exist but JWT strategy doesn't use DB sessions. |
| `User.password` field | LOW | `schema.prisma` | Nullable password field remains. Harmless for Google OAuth. |
| Duplicate mobile hook | LOW | `hooks/use-mobile.tsx` + `hooks/use-mobile.ts` | Two files for same purpose. |
| Some API routes lack session auth | MEDIUM | `/api/seen`, `/api/ratings`, `/api/reviews`, etc. | Use `userId` param instead of session verification. |
| `scripts/startup.sh` is dead code | MEDIUM | `scripts/startup.sh` | References `prisma db push` but Prisma CLI is not in standalone output. Script is copied into Docker image but never used (CMD is `node server.js`). |
| No automated DB migration | **HIGH** | Deployment pipeline | Schema changes require manual SQL on VPS. No CI/CD step or migration container exists. |

---

## Session Changelog

### Session: 2026-02-08 — Google OAuth Migration & Deployment Fixes

**What Was Done:**
Replaced email/password authentication with Google OAuth (Google-only login).

**Commits:**

| Commit | Description |
|--------|-------------|
| `80e10e1` | Fix Dockerfile for Dokploy deployment |
| `4d56084` | Replace email/password auth with Google OAuth login |
| `4a0d4ea` | Fix PKCE cookie error behind reverse proxy (wrong approach) |
| `6edf96e` | Remove custom PKCE cookie config causing OAuth failure |
| `d78eb68` | Enable `allowDangerousEmailAccountLinking` for existing users |
| `14666f1` | Harden auth: null-safe session callback, remove bcryptjs |
| `8756763` | Fix Prisma schema: rename `avatar` → `image`, add `emailVerified` |

**Files Created:**
- `components/auth/google-sign-in-button.tsx`
- `vision.md`

**Files Deleted:**
- `components/auth/login-form.tsx`
- `components/auth/signup-form.tsx`
- `app/api/auth/register/route.ts`
- `lib/auth-utils.ts`

**Key Bugs Resolved:**

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| `redirect_uri_mismatch` | URI not in Google Console | Added redirect URI |
| `InvalidCheck: pkceCodeVerifier` | Custom cookie `sameSite: "none"` blocked by Chrome behind Traefik | Removed custom cookie config |
| `OAuthAccountNotLinked` | Existing email user tried Google login | `allowDangerousEmailAccountLinking: true` |
| `Unknown argument 'image'` (Prisma) | PrismaAdapter expected `image` field, schema had `avatar` | Renamed `avatar` → `image`, added `emailVerified` |

**Dependencies Removed:** `bcryptjs`, `@types/bcryptjs`

---

### Session: 2026-02-09 — Full Codebase Documentation + Database Schema Fix

**What Was Done:**
1. Read entire codebase (4 parallel exploration agents) and documented all functionality, structure, and connections in vision.md (936 lines).
2. Diagnosed and fixed a critical database schema mismatch that was breaking Google OAuth sign-in.
3. Discovered and documented a key limitation of Next.js standalone Docker output.

**Commits:**

| Commit | Description |
|--------|-------------|
| `8471cfe` | Attempted fix: Changed Dockerfile CMD to run `prisma db push` before `node server.js` — **FAILED** (Prisma CLI not available in standalone output) |
| `0c1d175` | Reverted Dockerfile CMD back to `CMD ["node", "server.js"]` |

**Critical Bug: `The column 'User.image' does not exist in the current database`**

- **Symptom:** Server error on every Google OAuth sign-in attempt. NextAuth PrismaAdapter tried to write to `User.image` column, but the live database still had the old `avatar` column.
- **Root Cause:** In session 2026-02-08, the Prisma schema was updated (`avatar` → `image`, added `emailVerified`) in commit `8756763`, but `prisma db push` was never executed against the live database. The Docker container only runs `node server.js` — it never migrates the database.
- **First Fix Attempt (FAILED):** Changed Dockerfile CMD to:
  ```
  CMD ["sh", "-c", "npx prisma db push --accept-data-loss --skip-generate 2>&1 || echo 'DB push failed, continuing...'; node server.js"]
  ```
  This failed with `sh: prisma: not found` because **Next.js standalone output does NOT include the Prisma CLI binary** — it only bundles the Prisma Client runtime engine. The standalone output is a minimal production bundle; CLI tools are stripped.
- **Actual Fix:** VPS Claude Code ran direct SQL against the live PostgreSQL database:
  ```sql
  ALTER TABLE "User" RENAME COLUMN "avatar" TO "image";
  ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified" TIMESTAMP;
  ```
- **Dockerfile reverted** back to `CMD ["node", "server.js"]` (commit `0c1d175`).

**Key Lesson Learned: Schema Migration in Standalone Docker**

> **Prisma CLI (`prisma db push`, `prisma migrate`) is NOT available in Next.js standalone output.**
> The standalone build only includes the Prisma Client runtime (query engine), not the CLI binary.
> For future schema changes, the database must be migrated separately:
> - Option A: Run `prisma db push` locally with `DATABASE_URL` pointing to production
> - Option B: Run direct SQL (`ALTER TABLE ...`) on the VPS
> - Option C: Add a separate migration container/step in the Docker Compose or CI/CD pipeline
> - The `scripts/startup.sh` approach (running prisma db push on container start) will NOT work with standalone output

**Other Issues Verified by VPS Claude Code:**
- All environment variables confirmed present and correct (DATABASE_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, AUTH_SECRET, NEXTAUTH_URL, GEMINI_API_KEY, TMDB tokens)
- Google OAuth callback URL matches Google Cloud Console config
- Database connection working after SQL fix
- Container running and healthy on port 3000
