# Pre-rendering Follow-up Plan

**Current Status**: ❌ Disabled
**Reason**: CORS blocks manifest fetch during headless crawl
**Impact**: Search bots see SPA (with meta tags), not pre-rendered HTML
**SEO**: ~50% of potential vs 100% with pre-rendering

---

## Why Pre-rendering Matters

### Without Pre-rendering (Current State)
Search bots see:
```html
<div id="root"></div>
<script src="/static/js/main.js"></script>
```

Google's crawler *will* render JavaScript, but:
- Takes longer (delay in indexing)
- Not all bots render JS (Bing, social scrapers)
- Slower Core Web Vitals score
- Estimated SEO: 5/10

### With Pre-rendering (Target State)
Search bots see:
```html
<div id="root">
  <header><h1>Pepper Through the Years</h1></header>
  <div>Loading Pepper's photos...</div>
  ... or actual gallery content ...
</div>
<script src="/static/js/main.js"></script>
```

Benefits:
- Immediate indexing (no JS render delay)
- All bots see content
- Better Core Web Vitals
- Estimated SEO: 9/10

**Difference**: 2-4 weeks faster indexing, better rankings

---

## The CORS Problem

When `npm run build` runs react-snap:

1. **Webpack builds** the React app successfully
2. **react-snap launches** headless Chrome at `http://localhost:45678`
3. **React app loads** and tries to fetch manifest
4. **MinIO responds** with CORS error:
   ```
   Access to fetch at 'http://minio-xxx.sslip.io/pepper-photos/manifest.json'
   from origin 'http://localhost:45678' has been blocked by CORS policy
   ```
5. **App renders** error state ("Failed to load photos")
6. **react-snap saves** error page HTML
7. **Search bots see** error page instead of gallery

---

## Solution Options

### Option A: Fix MinIO CORS (Recommended)

Add `localhost:45678` to allowed origins:

```bash
# Via MinIO Console (http://your-minio:9001)
# Navigate to: Buckets → pepper-photos → Configuration → CORS

# Add CORS rule:
{
  "CORSRules": [
    {
      "AllowedOrigins": [
        "http://localhost:45678",           # For react-snap
        "http://localhost:3000",             # For development
        "https://your-production-domain.com" # For production
      ],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag", "Content-Length"]
    }
  ]
}
```

**Then**:
```bash
# Re-enable pre-rendering in package.json
"postbuild": "react-snap",  # Was: "postbuild:prerender"

# Rebuild
npm run build

# Verify build/index.html has gallery content (not error page)
cat build/index.html | grep "Pepper Through the Years"
```

---

### Option B: Mock Manifest for Build

Create a lightweight mock manifest for pre-rendering:

```bash
# Create public/manifest-mock.json
{
  "photos": [],
  "timeline": []
}
```

```javascript
// In src/services/PhotoService.ts
// Add check for mock mode
if (process.env.REACT_APP_USE_MOCK_MANIFEST) {
  // Fetch from public/manifest-mock.json instead
  manifestUrl = '/manifest-mock.json';
}
```

```json
// In package.json postbuild
"postbuild": "REACT_APP_USE_MOCK_MANIFEST=true react-snap"
```

**Pros**:
- No CORS changes needed
- Pre-rendered HTML shows loading state (better than error)
- Works immediately

**Cons**:
- Doesn't show actual gallery content
- Loading state isn't as good as full content
- Extra complexity

---

### Option C: Server-side Pre-rendering

Move pre-rendering to server/CI:

```bash
# Instead of client-side react-snap, use Puppeteer on server with env vars
# scripts/prerender-server.js

const puppeteer = require('puppeteer');

async function prerender() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Set environment for production domain (CORS allowed)
  await page.goto('https://your-production-domain.com');

  // Wait for app to load
  await page.waitForSelector('.gallery-loaded', { timeout: 10000 });

  // Save HTML
  const html = await page.content();
  fs.writeFileSync('build/index.html', html);

  await browser.close();
}
```

**Pros**:
- Renders against production (CORS allowed)
- Gets real gallery content
- No mock needed

**Cons**:
- Requires server/CI setup
- More complex deployment
- Must run after hosting, not during build

---

### Option D: Dynamic Rendering (Fallback)

Use service like Prerender.io or Rendertron:

- Detects bot user-agents
- Serves pre-rendered HTML to bots
- Serves SPA to users
- No build-time changes needed

**Pros**:
- Works with current setup
- Handles CORS automatically
- Always fresh content

**Cons**:
- Requires external service
- Monthly cost (~$20-100)
- Another dependency

---

### Option E: Migrate to Next.js (Long-term)

Replace CRA with Next.js:

```bash
# Built-in SSG/SSR
# pages/index.tsx
export async function getStaticProps() {
  const manifest = await fetchFromMinIO(); // Server-side, no CORS
  return { props: { photos: manifest.photos } };
}
```

**Pros**:
- Best-in-class SEO
- No CORS issues (server-side fetch)
- Built-in image optimization
- Better performance

**Cons**:
- 2-3 days migration effort
- Learning curve
- More infrastructure

---

## Recommended Path

**Immediate** (this week):
1. Deploy current version with meta tags + structured data
   - Gets 50% SEO benefit immediately
   - All performance wins active

**Short-term** (next sprint):
2. Fix MinIO CORS (Option A - easiest)
3. Re-enable react-snap: `"postbuild": "react-snap"`
4. Test build, verify HTML has content
5. Redeploy with full 100% SEO

**Long-term** (6-12 months):
6. Consider Next.js migration for ultimate SEO + performance

---

## Testing Pre-rendering

When you re-enable react-snap:

```bash
# 1. Clean build
rm -rf build
npm run build

# 2. Check for CORS errors in output
# Should see: "✅ crawled 1 out of 1 (/)"
# NOT: "Access to fetch... blocked by CORS policy"

# 3. Verify pre-rendered HTML
cat build/index.html | grep -A 10 '<div id="root">'

# Should contain actual content like:
# <div id="root"><div class="..."><header><h1>Pepper Through...

# NOT just:
# <div id="root"></div>

# 4. Test with search bot simulator
curl -A "Googlebot" http://localhost:5000  # Using serve -s build

# 5. Validate with Google Rich Results Test
# https://search.google.com/test/rich-results
```

---

## Success Criteria

Pre-rendering is working when:

- [ ] `npm run build` completes with no CORS errors
- [ ] `build/index.html` contains `<div id="root">` with child elements
- [ ] Social share debuggers show content preview
- [ ] Google Rich Results Test passes
- [ ] Lighthouse SEO score >90

---

## Monitoring Post-Deployment

Once pre-rendering is enabled:

**Week 1**:
- Check Google Search Console for crawl stats
- Verify no increase in crawl errors
- Monitor indexing status

**Week 2-4**:
- Compare indexing speed vs previous deploy
- Check if appearing in "dog timeline" searches
- Monitor organic traffic growth

**Expected**:
- 2-3x faster indexing
- Better keyword rankings
- 50% → 100% SEO potential realized

---

## Current Workaround

Until pre-rendering is fixed, the site still benefits from:

✅ **Structured Data**: Bots read JSON-LD even without rendered content
✅ **Meta Tags**: Title, description, OG tags all indexed
✅ **Performance**: All optimizations active
✅ **Sitemap**: Basic discovery aid

**This is enough for partial SEO**. Not ideal, but functional.

---

## Questions?

1. **Do I need pre-rendering?**
   - For best SEO: Yes
   - For functional site: No (current state works)

2. **What's the ROI?**
   - With pre-rendering: 2-4 weeks to first search traffic
   - Without: 6-8 weeks (Google must render JS)

3. **Can I deploy now?**
   - Yes! Performance wins alone justify it
   - Add pre-rendering in next iteration

---

**Summary**: Pre-rendering is disabled but fixable. Deploy now, fix CORS next sprint.
