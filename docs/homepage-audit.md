---
name: homepage-audit
description: Perform comprehensive, production-grade audits of website homepages. Use this skill whenever someone asks to review, analyze, critique, assess, or get feedback on a homepage or landing page. Trigger on phrases like "check my homepage", "review this website", "audit this landing page", "what do you think of [url]", "analyze [website]", "is this homepage good", or any request to evaluate web design, UX, conversion optimization, or overall homepage quality. Also use when someone shares a URL and asks for feedback, even if they don't explicitly say "audit" or "review". This skill provides brutal honesty with actionable improvements using industry standards.
---

# Homepage Audit

A ruthless, production-grade assessment framework for evaluating website homepages across every dimension that matters. No hand-holding, no participation trophies—just objective analysis against industry standards.

## Core Principle

**Production-grade means:**
- Measurable against quantitative benchmarks (load time, contrast ratios, viewport coverage)
- Compared against documented best practices (WCAG, Core Web Vitals, conversion optimization research)
- Evaluated for business outcomes, not aesthetic preferences
- Rated on user behavior data, not designer opinions

## Workflow

### 1. Initial Fetch & Context Gathering

```bash
# Fetch the homepage
web_fetch <url>

# If the page is complex or has responsive design, also capture viewport info
# Check for viewport meta tag, responsive CSS, mobile-specific elements
```

**What to extract immediately:**
- HTML structure (semantic tags, heading hierarchy, form elements)
- CSS (inline styles, external stylesheets, media queries)
- JavaScript (inline scripts, external files, blocking vs async)
- Images (sources, formats, lazy loading, alt text)
- Meta tags (title, description, Open Graph, viewport)
- Performance indicators (resource count, file sizes visible in HTML)

### 2. Analysis Framework

Assess across **10 dimensions** with numerical scores (0-10) and specific findings.

#### DIMENSION 1: First Impression (0-10)

**Above-the-fold clarity (0-3)**
- Can you understand what they do in 3 seconds? 
- Is the value proposition a clear sentence, or marketing fluff?
- Grade: 3 = crystal clear, 2 = requires thinking, 1 = vague, 0 = incomprehensible

**Visual hierarchy (0-3)**
- Is there ONE dominant element that captures attention?
- Does the eye follow a clear path (F/Z pattern)?
- Is white space used strategically?
- Grade: 3 = perfect hierarchy, 2 = decent, 1 = cluttered, 0 = chaos

**Emotional hook (0-2)**
- Does imagery/design trigger immediate emotional response?
- Is it aspirational, trustworthy, exciting, or just... there?
- Grade: 2 = strong emotional resonance, 1 = generic but pleasant, 0 = no impact

**Hero section effectiveness (0-2)**
- Does it combine message + visual + CTA effectively?
- Is the CTA prominent and action-oriented?
- Grade: 2 = all elements working together, 1 = missing pieces, 0 = no clear hero

**Scoring rubric:**
- 9-10: Exceptional—would use as a case study
- 7-8: Strong—minor improvements only
- 5-6: Adequate—needs work but functional
- 3-4: Weak—major issues
- 0-2: Broken—fundamental problems

#### DIMENSION 2: Information Architecture (0-10)

**Scanability (0-3)**
- Can you understand the full offering by scanning headers alone?
- Are sections clearly labeled with descriptive headers?
- Check: Read only H1, H2, H3 tags—does it make sense?
- Grade: 3 = complete story in headers, 2 = mostly clear, 1 = vague headers, 0 = no structure

**Logical flow (0-3)**
- Does it answer questions in order: What is it? → Why care? → How it works? → Proof? → Action?
- Are there confusing jumps or missing pieces?
- Grade: 3 = perfect flow, 2 = mostly logical, 1 = some gaps, 0 = random order

**Navigation clarity (0-2)**
- Primary nav: 5-7 items max? Descriptive labels?
- CTAs distinct from navigation?
- Grade: 2 = clean and clear, 1 = acceptable, 0 = confusing/bloated

**Content depth (0-2)**
- Progressive disclosure—basics first, depth on demand?
- No walls of text forcing commitment upfront?
- Grade: 2 = perfect balance, 1 = mostly good, 0 = info overload or too sparse

#### DIMENSION 3: Trust & Credibility (0-10)

**Social proof quality (0-4)**
- Real brand logos (not fake/unlicensed)?
- Specific numbers, not "thousands of happy customers"?
- Authentic testimonials with real names, faces, titles?
- Recent/relevant case studies?
- Grade each element 0-1, sum for total

**Transparency markers (0-3)**
- Contact info clearly visible?
- Team photos (real humans, not stock)?
- Physical location if relevant?
- Grade: 3 = all present, 2 = most present, 1 = minimal, 0 = anonymous

**Risk reduction (0-3)**
- Money-back guarantee?
- Free trial without CC?
- Clear privacy/security indicators?
- Grade: 3 = multiple risk reversals, 2 = some, 1 = minimal, 0 = none

#### DIMENSION 4: Visual Design (0-10)

**Design system coherence (0-3)**
- Consistent typography (3-4 font weights max)?
- Harmonious color palette (primary + 1-2 accents)?
- Consistent spacing rhythm?
- Check: Do components look like they're from the same design system?
- Grade: 3 = tight system, 2 = mostly consistent, 1 = inconsistent, 0 = chaotic

**Modern but timeless (0-3)**
- Avoids dated trends (parallax overuse, hero sliders, skeuomorphism)?
- Clean, purposeful, not gimmicky?
- Micro-interactions enhance UX, not distract?
- Grade: 3 = timeless design, 2 = mostly modern, 1 = some dated elements, 0 = very dated

**Brand personality (0-2)**
- Visual style matches target audience?
- Memorable and differentiated?
- Grade: 2 = strong personality, 1 = generic but fine, 0 = no personality

**Technical execution (0-2)**
- Proper image formats (WebP support)?
- No obvious rendering issues?
- Grade: 2 = flawless, 1 = minor issues, 0 = broken elements

#### DIMENSION 5: Content Quality (0-10)

**Clarity over cleverness (0-3)**
- Simple words vs jargon?
- Active voice, direct statements?
- Benefit-focused vs feature-focused?
- Grade: 3 = clear and compelling, 2 = mostly clear, 1 = some jargon, 0 = incomprehensible

**Scannable copy (0-3)**
- Short paragraphs (2-3 lines max)?
- Strategic use of bullets/bold?
- Callouts for key points?
- Grade: 3 = perfectly scannable, 2 = mostly good, 1 = some walls of text, 0 = dense blocks

**CTA quality (0-2)**
- Action verbs, specific outcomes ("Start free trial" not "Submit")?
- Multiple CTAs at logical decision points?
- Grade: 2 = excellent CTAs, 1 = acceptable, 0 = weak/generic

**Copy length appropriateness (0-2)**
- Right amount for the complexity of offering?
- Not too sparse, not overwhelming?
- Grade: 2 = perfect balance, 1 = slightly off, 0 = way too much/little

#### DIMENSION 6: Technical Performance (0-10)

**HTML structure (0-2)**
- Semantic HTML5 tags (header, nav, main, section, article)?
- Proper heading hierarchy (single H1, logical H2-H6)?
- Check the actual HTML structure in the fetched content
- Grade: 2 = semantic and clean, 1 = mostly correct, 0 = div soup

**Performance indicators (0-3)**
- Viewport meta tag present and correct?
- Image lazy loading attributes?
- Async/defer on non-critical scripts?
- CSS not blocking render?
- Grade each 0.75, sum for total

**SEO basics (0-2)**
- Meta title (50-60 chars, compelling)?
- Meta description (150-160 chars, actionable)?
- Open Graph tags for social sharing?
- Grade: 2 = all optimized, 1 = present but weak, 0 = missing/poor

**Accessibility foundations (0-3)**
- Alt text on images (check actual alt attributes)?
- Sufficient color contrast (look for light text on light bg)?
- Form labels present and descriptive?
- Grade: 3 = fully accessible markup, 2 = mostly there, 1 = some issues, 0 = major problems

#### DIMENSION 7: Responsive Design (0-10)

**Mobile-first indicators (0-4)**
- Viewport meta tag configured correctly?
- Media queries present in CSS (if you can see them)?
- No horizontal scrolling (check viewport width references)?
- Touch-friendly sizing (buttons appear adequate from markup)?
- Grade each element 0-1, sum for total

**Responsive patterns (0-3)**
- Collapsible navigation for mobile?
- Flexible grid systems (flexbox/grid)?
- Fluid images (max-width: 100%)?
- Grade: 3 = fully responsive patterns, 2 = mostly responsive, 1 = some responsive, 0 = fixed width

**Mobile-specific UX (0-3)**
- Click-to-call links (tel: href on phone numbers)?
- Simplified forms (appropriate input types)?
- No hover-dependent interactions?
- Grade: 3 = mobile-optimized, 2 = mobile-friendly, 1 = barely works, 0 = broken on mobile

#### DIMENSION 8: Conversion Architecture (0-10)

**CTA strategy (0-4)**
- One dominant CTA per section?
- Repeated at natural decision points?
- Different CTAs for different awareness levels?
- Low-barrier options for hesitant visitors?
- Grade each 0-1, sum for total

**Value ladder (0-3)**
- Free → Low commitment → High commitment paths visible?
- Lead magnets for email capture?
- Multiple entry points to funnel?
- Grade: 3 = sophisticated funnel, 2 = basic funnel, 1 = single CTA, 0 = no clear path

**Objection handling (0-3)**
- FAQ addresses real concerns?
- Comparison with alternatives?
- "Why us" differentiation?
- Grade: 3 = comprehensive objection handling, 2 = some, 1 = minimal, 0 = none

#### DIMENSION 9: Typography & Readability (0-10)

**Font choices (0-2)**
- 2-3 font families max?
- Web-safe or properly loaded?
- Appropriate for brand?
- Grade: 2 = excellent choices, 1 = acceptable, 0 = poor choices

**Hierarchy & sizing (0-3)**
- Clear size differentiation between heading levels?
- Body text 16px minimum (check computed styles if visible)?
- Appropriate line height (1.4-1.6 for body)?
- Grade: 3 = perfect hierarchy, 2 = good, 1 = weak, 0 = broken

**Readability (0-3)**
- Line length 50-75 characters ideal (check paragraph widths)?
- Sufficient color contrast (4.5:1 minimum for body text)?
- No walls of centered text?
- Grade: 3 = highly readable, 2 = readable, 1 = some issues, 0 = hard to read

**Text treatment (0-2)**
- No excessive ALL CAPS?
- Strategic use of bold/italic?
- Proper spacing around text blocks?
- Grade: 2 = well-crafted, 1 = acceptable, 0 = poor treatment

#### DIMENSION 10: Fatal Flaws Check (Pass/Fail per item)

These are **instant disqualifications** that override all other scores:

- [ ] Auto-playing video/audio with sound
- [ ] Aggressive popup on page load (before any interaction)
- [ ] Broken images or 404 links visible
- [ ] Horizontal scrolling on standard viewport
- [ ] Text illegible due to color contrast
- [ ] No mobile viewport meta tag
- [ ] Critical content requires JavaScript to display
- [ ] Intrusive cookie banners blocking content
- [ ] Misleading/deceptive claims
- [ ] Inaccessible forms (no labels)

**If ANY fatal flaw exists:** Final score caps at 5/10 regardless of other scores.

## Scoring & Reporting

### Calculate Total Score

Sum all dimension scores (max 90 points from dimensions 1-9), then:

1. Calculate raw percentage: (Total / 90) × 100
2. Apply fatal flaw penalty if applicable (cap at 50%)
3. Convert to 0-10 scale: (Percentage / 10)

**Rating bands:**
- 9.0-10.0: World-class — Top 1% of homepages
- 8.0-8.9: Excellent — Top 5%, minor tweaks only
- 7.0-7.9: Strong — Top 20%, some improvements needed
- 6.0-6.9: Above average — Functional but needs work
- 5.0-5.9: Average — Major improvements needed
- 4.0-4.9: Below average — Fundamental issues
- 3.0-3.9: Poor — Significant redesign required
- 0.0-2.9: Broken — Start from scratch

### Report Structure

**Executive Summary (3-4 sentences)**
- Overall score and rating band
- Primary strength (what they did best)
- Primary weakness (biggest opportunity)
- Business impact assessment

**Dimensional Breakdown**
For each dimension:
- Score with context (e.g., "6/10 - Above average but room for improvement")
- Specific findings (what you observed)
- Critical issues (what's actively hurting performance)
- Quick wins (easy improvements with high impact)
- Long-term opportunities (strategic improvements)

**Priority Fixes (Ranked by Impact)**
List 5-10 actionable improvements, each with:
- **Issue**: What's wrong
- **Impact**: Why it matters (conversion, trust, UX, SEO, etc.)
- **Fix**: Specific solution
- **Effort**: Low/Medium/High
- **Expected improvement**: Quantified if possible

**Code-Level Observations**
- HTML structure issues (semantic tags, heading hierarchy)
- CSS problems (blocking render, missing media queries)
- Image optimization opportunities
- Script loading issues
- Meta tag improvements

**Responsive Design Analysis**
- Desktop experience observations
- Mobile experience predictions (based on markup)
- Tablet/mid-size viewport considerations
- Specific responsive issues found in code

**The Brutal Truth Section**
No sugar-coating. What would make you immediately leave this site? What screams "amateur hour"? What's actively costing them conversions?

## Tone & Style

- **Direct, not diplomatic**: "This CTA is weak" not "The CTA could be more compelling"
- **Specific, not vague**: "Change 'Learn More' to 'Start Your Free 14-Day Trial'" not "Consider a more action-oriented CTA"
- **Evidence-based**: Reference actual HTML/CSS/content observed, not assumptions
- **Industry standards**: Cite benchmarks (Core Web Vitals, WCAG, conversion research) when relevant
- **Business-focused**: Frame issues in terms of lost conversions, reduced trust, poor SEO, etc.

## Quality Standards

**Do not:**
- Give participation trophies ("looks nice!" when it doesn't)
- Suggest subjective preferences as requirements
- Nitpick trivial aesthetic choices
- Recommend complete redesigns without strong justification
- Use vague language ("could be better", "might want to consider")

**Do:**
- Point out actual usability problems
- Cite measurable issues (contrast ratios, load indicators, missing alt text)
- Recommend fixes with expected outcomes
- Acknowledge what's working well (with specifics)
- Prioritize by business impact, not personal taste

## Example Assessment Output

```
HOMEPAGE AUDIT: example.com
Overall Score: 6.2/10 - Above average, significant improvement opportunities

EXECUTIVE SUMMARY
The homepage communicates value clearly but suffers from weak trust signals, poor mobile optimization, and conversion leaks. Strongest asset is the clear messaging and visual hierarchy in the hero section. Biggest liability is the generic "Submit" CTAs and complete absence of social proof. Estimated conversion loss: 40-60% compared to optimized baseline.

DIMENSIONAL BREAKDOWN

1. First Impression: 7/10 - Strong
   ✓ Value proposition clear within 3 seconds
   ✓ Clean visual hierarchy with dominant hero
   ✗ Hero CTA says "Get Started" (vague, no urgency)
   ✗ No emotional hook beyond generic stock photo
   
   Quick wins:
   - Change hero CTA to "Start Your Free Trial - No Credit Card Required"
   - Replace stock photo with real customer/product screenshot
   
2. Information Architecture: 6/10 - Above average
   ✓ Logical flow: Problem → Solution → How It Works → Pricing
   ✗ Navigation has 9 items (too many, causes decision fatigue)
   ✗ "Solutions" and "Products" are redundant in nav
   
   Quick wins:
   - Consolidate nav to 6 items max
   - Add descriptive subtext under main nav items
   
[... continue for all dimensions ...]

PRIORITY FIXES (Ranked by Impact)

1. ADD SOCIAL PROOF IMMEDIATELY (Impact: High, Effort: Low)
   Issue: Zero testimonials, logos, or case studies
   Impact: 35-50% conversion loss from lack of trust signals
   Fix: Add 3-logo bar below hero + 2 testimonials with photos/names
   Expected lift: +25-40% conversions

2. FIX MOBILE VIEWPORT (Impact: Critical, Effort: Low)
   Issue: Missing viewport meta tag causes zoom-out on mobile
   Impact: 60% of traffic can't read content properly
   Fix: Add <meta name="viewport" content="width=device-width, initial-scale=1">
   Expected lift: Prevents immediate mobile bounces

[... continue with 5-10 priority fixes ...]

CODE-LEVEL OBSERVATIONS
- No semantic HTML5 tags (all divs)
- H1 appears twice on page (SEO issue)
- Images lack alt text entirely
- 4 blocking CSS files in <head>
- No lazy loading on below-fold images

RESPONSIVE DESIGN ANALYSIS
Desktop: Clean layout, appropriate spacing
Mobile (predicted): BROKEN - no viewport meta, fixed-width containers
Evidence: No media queries found, px-based widths throughout

THE BRUTAL TRUTH
The biggest problem isn't design—it's that you're asking visitors to trust you with zero proof. No logos, no testimonials, no case studies. Just "trust us" with a generic CTA. Your mobile experience is completely broken (no viewport meta tag), so 60% of visitors see a zoomed-out mess. And your CTAs are textbook examples of what not to do: "Learn More", "Submit", "Get Started"—these are conversion killers. Fix the trust signals and mobile experience before worrying about anything else.
```

## When to Use This Skill

Trigger on:
- "Review my homepage"
- "What do you think of [URL]"
- "Audit this landing page"
- "Is this homepage good?"
- "Check out my site"
- "Feedback on my website"
- Any URL shared with request for evaluation
- "How can I improve my homepage"
- "Why isn't my site converting"
- "Homepage critique"

Do NOT use for:
- Full website audits (multi-page)
- Technical SEO audits (different scope)
- Accessibility compliance reports (requires specialized tools)
- Brand identity design (different focus)
- Backend/API reviews
