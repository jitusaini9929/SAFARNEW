# SAFAR Performance Optimization Implementation Document

## Purpose

This document converts the optimization checklist into an implementation-ready plan for developers and DevOps. It is based on the current verified state of the SAFAR app:

- Cloudflare is active
- Static assets such as JS, PNG, and MP3 are returning `cf-cache-status: HIT`
- The main HTML document and refresh/auth flows are dynamic
- Static caching is healthy
- The primary remaining optimization target is **dynamic/API traffic and backend efficiency**

---

# 1. Confirmed Current State

## 1.1 What is already working

### Static delivery and caching
- Cloudflare CDN is active and serving cached static assets
- Verified asset categories:
  - JS bundles
  - PNG images
  - MP3 files
- Browser cache is also working
- Static asset cache headers are in place

### Backend optimizations already done
- `compression()` is enabled
- Polling frequency was reduced
- Hidden-tab polling was reduced/stopped where implemented
- N+1 fetches were removed
- Redis helper exists
- Redis caching is already applied to several hot endpoints
- Pagination is added to several previously unbounded endpoints
- Request and upload size limits were tightened
- Base64 avatar storage was blocked

## 1.2 What this means

The old **437 GiB over 7 days** can no longer be explained mainly by JS/images/audio delivery if static assets are now returning `HIT`.

The remaining likely causes are:

- repeated dynamic API traffic
- repeated auth refresh calls
- repeated `/me` calls
- feed/comments traffic
- analytics event traffic
- backend/database work on uncached dynamic endpoints
- over-fetching or duplicate fetches on the frontend

---

# 2. Optimization Goals

## Primary goals
1. Reduce dynamic origin traffic
2. Reduce backend CPU load
3. Reduce repeated authenticated requests
4. Reduce database read amplification
5. Reduce payload size and duplicate fetches
6. Improve latency on hot endpoints

## Success metrics
Compared to the previous 7-day bad period:

- total bandwidth should drop materially from 437 GiB
- average CPU should drop materially from 64%
- origin traffic should be mostly dynamic, not static
- p95 latency should improve on feed/comments/auth endpoints

---

# 3. Priority A Tasks — Highest Impact Next

## A1. Audit `/refresh` behavior

### Issue
`/refresh` is dynamic, which is normal, but it may still be called too often or retried too aggressively.

### Why it matters
Repeated refresh calls can cause:
- unnecessary origin traffic
- repeated auth work
- increased CPU
- retry storms on auth failure
- multiple tabs multiplying the same load

### What to inspect
- Is `/refresh` called on every page load?
- Is it called on every route change?
- Is it called multiple times on mount?
- Do failed refreshes trigger repeated retries?
- Does each browser tab trigger its own refresh loop?
- Are there repeated `401` responses followed by retry chains?

### Code changes
- ensure only one refresh request runs at a time
- add a retry guard
- prevent infinite retry loops after auth failure
- refresh only when token expiry threshold is reached
- avoid refresh on every route change unless required by your auth design

### Verification
- inspect Network tab for number of `/refresh` calls per page load
- log refresh counts per session
- track `401` rates and retry counts

### Expected impact
- lower bandwidth
- lower auth-related CPU
- less noisy network traffic

---

## A2. Audit `/me` endpoint usage

### Issue
`/me` is a common silent over-fetch endpoint in React apps.

### Why it matters
If `/me` fires repeatedly:
- on app mount
- on route changes
- after every refresh
- from multiple components

it can create constant authenticated traffic and repeated DB reads.

### What to inspect
- how many times `/me` fires per page load
- whether parent and child both fetch current user
- whether route changes remount current-user logic
- whether `/me` is fetched after every successful `/refresh`

### Code changes
- centralize current-user loading into one shared store/provider/hook
- avoid duplicate calls from multiple components
- cache current user client-side briefly
- optionally cache server-side by user ID for 5–15 seconds if safe
- invalidate on profile update / auth state change

### Verification
- count `/me` requests during:
  - fresh login
  - refresh
  - route changes
  - profile update
- ensure only one current-user request is made when expected

### Expected impact
- moderate bandwidth reduction
- moderate DB reduction
- better responsiveness

---

## A3. Add Redis caching to the main community feed

### Issue
The community feed is likely the biggest remaining hot endpoint.

### Why it matters
Even for text-only content, feed endpoints often involve:
- sorting
- author population
- comments/likes metadata
- pagination metadata
- multiple downstream reads

### Recommended caching strategy
- cache page 1 for 30–60 seconds
- cache page 2+ for 60–120 seconds

### Invalidate on
- post create
- post delete
- post edit if feed payload includes changed fields
- like/comment events only if feed includes live counters that must stay fresh

### Code changes
- add Redis cache wrapper around feed read path
- generate cache keys by page/filter
- invalidate the relevant keys on feed-changing writes

### Verification
- compare DB reads before and after
- compare latency before and after
- confirm cache hit rate on feed endpoint

### Expected impact
- major DB read reduction
- major CPU improvement
- lower response times

---

## A4. Add Redis caching to comments first page

### Issue
Comments are another frequent hot path.

### Why it matters
Popular posts can trigger repeated identical reads of page 1 comments.

### Recommended caching strategy
- cache page 1 for each post for 30–60 seconds

### Invalidate on
- comment create
- comment delete
- comment edit if comment payload is returned

### Verification
- compare repeated requests for the same comments page
- compare DB hit frequency before and after

### Expected impact
- medium CPU reduction
- medium DB reduction
- lower latency on active posts

---

## A5. Review analytics/event traffic

### Issue
Analytics traffic may still be a meaningful source of bandwidth and CPU.

### Why it matters
Duplicate event/pageview firing can create unnecessary traffic even in a text-only app.

### What to inspect
- duplicate pageview events
- duplicate event firing on rerender
- hidden-tab analytics behavior
- analytics calls on route changes
- batching vs per-event network sends

### Code changes
- debounce analytics where appropriate
- batch events where possible
- avoid duplicate pageview firing on rerender
- reduce analytics sends for hidden/inactive tabs if acceptable

### Verification
- compare event counts to expected user behavior
- inspect analytics requests in Network tab
- validate no duplicate firing on route transition

### Expected impact
- moderate bandwidth reduction
- moderate CPU reduction

---

# 4. Priority B Tasks — Backend Efficiency Improvements

## B1. Ensure all hot read queries use `.lean()` and field projection

### Issue
Returning full Mongoose documents and full nested objects increases CPU, memory, and payload size.

### Why it matters
Many endpoints only need a small subset of fields.

### Code changes
- use `.lean()` for read-only hot endpoints
- use field selection/projection
- avoid returning unused nested arrays or internal fields

### Example targets
If UI only needs:
- post text
- author name
- createdAt
- like/comment counts

do not return:
- full author object
- internal metadata
- unused arrays
- unrelated large nested fields

### Verification
- compare response payload size before and after
- inspect serialized response fields
- compare endpoint latency before and after

### Expected impact
- lower payload size
- lower CPU
- lower memory usage

---

## B2. Verify indexes for all hot routes

### Issue
You already added some indexes, but remaining hot routes still need review.

### Likely candidates
- feed sort field(s)
- comments by `postId + createdAt`
- friends list queries
- saved posts queries
- login history date range queries
- analytics aggregation filters

### Goal
Every frequent filter/sort path should avoid collection scans.

### Verification
- inspect slow query logs if available
- use explain plans on hot queries
- compare CPU before and after index changes

### Expected impact
- faster DB operations
- lower CPU
- lower p95 latency

---

## B3. Finish strict pagination everywhere

### Issue
Some endpoints may still return more data than needed.

### Must confirm pagination for
- main community feed
- comments
- notifications
- DMs / conversation list
- activity/history
- admin list views
- analytics tables

### Recommended defaults
- feed: 10–20
- comments: 20–30
- admin tables: 20–50

### Verification
- inspect payload sizes
- ensure responses include pagination metadata
- confirm frontend handles `page`, `hasMore`, or equivalent correctly

### Expected impact
- lower payload size
- lower DB cost
- smoother frontend performance

---

## B4. Prevent duplicate fetches at component level

### Issue
Even with backend fixes, frontend over-fetching can still waste bandwidth.

### What to inspect
- same endpoint called by parent and child
- same endpoint called from multiple mounted components
- duplicate `useEffect` requests
- duplicate auth/user calls across routes

### Code changes
- centralize shared data fetches
- memoize where needed
- use a shared query cache if available
- avoid route-change refetch unless data is stale or invalidated

### Verification
- inspect duplicate requests in Network tab
- verify endpoint call counts on page transitions

### Expected impact
- moderate bandwidth reduction
- moderate CPU savings

---

# 5. Priority C Tasks — Optional but Valuable

## C1. Review Cloudflare analytics / cache offload

### Why it matters
Static assets are already confirmed as `HIT`; now you need to measure offload effect over time.

### Ask DevOps / developer to monitor
- cache hit ratio
- bandwidth served by Cloudflare vs origin
- origin request trend after fixes
- top cached assets

### Goal
Confirm the next 7-day period is materially below the old 437 GiB.

---

## C2. Convert the heaviest PNG assets to WebP

### Why it matters
Even with CDN, smaller assets improve:
- first-load speed
- mobile experience
- edge bandwidth usage

### Best candidates
- hero background
- silhouette images
- badge/title graphics
- other large public images

### Approach
- convert the largest 10–20 assets first
- keep filenames/versioning sane for deployment
- verify visual quality after conversion

### Verification
- compare file sizes
- compare first-load transfer size

### Expected impact
- lower first-load bandwidth
- faster page rendering

---

## C3. Lazy-load non-critical images

### Good candidates
- badge grids
- achievement art
- below-the-fold decorative images

### Why it matters
This reduces first-load transfer size and improves perceived performance.

### Verification
- confirm only visible images load initially
- compare first paint / network waterfall before and after

---

## C4. Add rate limiting on hot dynamic endpoints

### Good targets
- auth refresh
- comments
- DMs
- write-heavy routes
- preview endpoints

### Why it matters
Protects the backend from:
- abuse
- accidental frontend loops
- burst traffic

### Verification
- log rate-limited responses
- ensure legitimate UX is not harmed

---

# 6. Owner-Wise Action Plan

## 6.1 You / codebase side
These are primarily application changes.

- audit `/refresh` calls
- audit `/me` calls
- add Redis cache to main feed
- add Redis cache to comments first page
- finish pagination coverage
- tighten `.lean()` and field projection usage
- remove duplicate frontend fetches
- review analytics event duplication
- convert biggest PNGs to WebP
- lazy-load non-critical images

## 6.2 DevOps / infrastructure side
These are monitoring / infrastructure tasks.

- monitor Cloudflare hit ratio
- compare origin bandwidth before vs after
- monitor CPU over next 72 hours and next 7 days
- confirm `/api/*` is not accidentally cached
- confirm Cloudflare proxy/SSL/rules remain correct

---

# 7. Monitoring Plan

## 7.1 Over the next 24–72 hours
Track:
- total requests to `/refresh`
- total requests to `/me`
- request counts for feed/comments
- average CPU
- `401` refresh failures
- p95 latency for hot endpoints

## 7.2 Over the next 7 days
Compare against the previous bad period:
- total bandwidth
- average CPU
- Cloudflare-served vs origin-served traffic
- request count per top endpoint
- slow query logs if available

---

# 8. Healthy Target Outcome

## Current confirmed good state
- static CDN caching works
- browser cache works
- static-origin load should already be much lower

## After the remaining dynamic/API optimizations
Expected healthy direction:
- bandwidth over 7 days materially below the old 437 GiB
- average CPU materially below the old 64%
- better feed/comments latency
- origin traffic mostly dynamic only

## Biggest remaining gains are expected from
1. fixing `/refresh` behavior
2. reducing repeated `/me` calls
3. caching feed/comments
4. finishing pagination and projection cleanup

---

# 9. Final Practical Checklist

## Already done
- [x] Cloudflare static `HIT` confirmed
- [x] static asset cache headers
- [x] compression enabled
- [x] reduced polling
- [x] N+1 removal
- [x] Redis helper added
- [x] several endpoint caches added
- [x] pagination added on several routes
- [x] upload/request hardening
- [x] base64 avatar prevention

## Do next
- [ ] audit `/refresh` frequency and retry behavior
- [ ] audit `/me` request frequency
- [ ] add Redis cache to main community feed
- [ ] add Redis cache to comments first page
- [ ] ensure all hot queries use `.lean()` and projections
- [ ] verify indexes for remaining hot routes
- [ ] finish pagination on every list endpoint
- [ ] remove duplicate frontend fetches
- [ ] audit analytics/event duplication

## Do after that
- [ ] convert biggest PNGs to WebP
- [ ] lazy-load non-critical public images
- [ ] add rate limiting on hot dynamic endpoints
- [ ] review Cloudflare analytics/offload after 7 days

---

# 10. Verification Summary

The optimization effort should be considered successful when:

- static assets consistently return `cf-cache-status: HIT`
- `/refresh` and `/me` are no longer over-firing
- feed/comments show lower latency and lower DB pressure
- the next 7-day bandwidth window is materially below 437 GiB
- average CPU is materially below 64%
- origin traffic is mostly dynamic, not static