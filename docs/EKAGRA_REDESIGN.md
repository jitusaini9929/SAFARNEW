**Premium, clean, student-first product UI**

**This is a practical layout you can directly implement in React**.

🎯 Core Design Principles (follow these strictly)
=================================================

1.  **One screen = one purpose**
    
2.  **Big numbers → motivation**
    
3.  **Actions → always visible**
    
4.  **Graphs → only in analytics**
    
5.  **Never overload a single card**
    

🟢 1. SESSIONS PAGE (Live Control Panel)
========================================

🧱 Layout Structure
-------------------

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   --------------------------------------------------  | Header: "Focus Sessions"       [ + New Session ]|  --------------------------------------------------  | Summary Strip (small cards)                 |  | [ Running ] [ Paused ] [ Resumable Time ]  |  --------------------------------------------------  | Main Timer (Hero Section)                  |  |------------------------------------------|  |   Session Title                          |  |   25:32 (BIG TIMER)                      |  |   [Pause] [Complete] [Switch]            |  --------------------------------------------  | Sessions Drawer / List (below or right)   |  |------------------------------------------|  | Running                                  |  | Paused                                   |  | Ready                                    |  --------------------------------------------   `

🔹 Summary Strip (Top)
----------------------

3 small cards (horizontal):

*   🟢 Running: 1
    
*   🟡 Paused: 3
    
*   🔵 Resumable: 1h 50m
    

👉 Style:

*   small cards
    
*   light background
    
*   minimal text
    
*   subtle icons
    

🔹 Main Timer (Hero)
--------------------

This is the **center of attention**

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   --------------------------------  DSA Revision (small text)     25:32   ← BIG (very large)  [ Pause ]  [ Complete ]  [ Switch ]  --------------------------------   `

### Style:

*   big bold font (like 48px+)
    
*   minimal distractions
    
*   progress ring or bar (optional)
    

🔹 Sessions List (below or side panel)
--------------------------------------

Each session card:

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   [Paused]  DSA Practice  18m left • Last active 20m ago  [Resume] [Switch] [Discard]   `

### Visual rules:

*   Running → green border
    
*   Paused → yellow badge
    
*   Ready → gray
    

💡 UX Detail
------------

*   Clicking session = auto-switch
    
*   Switching = auto-pause current
    

🔵 2. TASK HISTORY PAGE (Daily Report)
======================================

🧱 Layout Structure
-------------------

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   --------------------------------------------------  | Header: "Today's Progress"                    |  --------------------------------------------------  | Big Stats Row (MOST IMPORTANT)               |  |----------------------------------------------|  | 2h 40m   |   4   |   3   |   35m             |  | Focused  | Done  | Goals | Avg Session      |  ----------------------------------------------  | Insight Line                                |  | "You focused 30m more than yesterday"       |  --------------------------------------------------  | History List                                |  |----------------------------------------------|  | Session cards (timeline style)              |  ----------------------------------------------   `

🔹 Big Stats Row (Hero)
-----------------------

4 blocks:

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   2h 40m     4       3       35m  Focused    Done    Goals   Avg   `

### Style:

*   BIG numbers
    
*   labels small
    
*   centered
    
*   clean spacing
    

👉 This is what gives dopamine.

🔹 Insight Line
---------------

One line only:

*   “You did better than yesterday 🔥”or
    
*   “Your focus improved today”
    

👉 Keep it human, not robotic.

🔹 History List
---------------

Each item:

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   DSA Revision  42m • Completed at 6:20 PM • 2 pauses   `

Optional:

*   small timeline dot on left
    

❌ Avoid:
--------

*   graphs here
    
*   too many stats
    
*   percentages
    

🟣 3. ANALYTICS PAGE (Deep Insights)
====================================

🧱 Layout Structure
-------------------

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   --------------------------------------------------  | Header: "Analytics"                          |  --------------------------------------------------  | Focus Trend Graph (MAIN)                     |  --------------------------------------------------  | 2 Column Grid                               |  |---------------------------------------------|  | Streaks        | Session Quality            |  | Behavior       | Goal Distribution          |  ----------------------------------------------  | Weekly Comparison / Insights                |  --------------------------------------------------   `

🔹 1. Focus Trend Graph (TOP)
-----------------------------

Line graph:

*   X-axis: days
    
*   Y-axis: focus time
    

Title:👉 “Your Focus Over Time”

### Must be:

*   simple
    
*   smooth line
    
*   no clutter
    

🔹 2. Streaks Card
------------------

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   🔥 Current Streak: 5 days  🏆 Best Streak: 12 days   `

Optional:

*   calendar heatmap
    

🔹 3. Session Quality
---------------------

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   Avg Session: 32m  Longest: 58m  Shortest: 12m   `

🔹 4. Behavior Insights
-----------------------

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   Interruptions: 8  Switches: 5  Sessions/day: 4   `

🔹 5. Goal Distribution
-----------------------

Pie chart:

*   DSA → 40%
    
*   Aptitude → 30%
    
*   Revision → 30%
    

🔹 6. Weekly Insight (Bottom)
-----------------------------

Simple text:

*   “You focused 25% more than last week”
    
*   “Your consistency improved”
    

🎨 Visual Design System (IMPORTANT)
===================================

Colors
------

*   Running → Green (#22c55e)
    
*   Paused → Yellow (#facc15)
    
*   Completed → Blue (#3b82f6)
    
*   Neutral → Gray
    

Typography
----------

*   Timer → very large (48–64px)
    
*   Main stats → large (24–32px)
    
*   Labels → small (12–14px)
    

Spacing
-------

*   Cards: 16–24px padding
    
*   Sections: 24–32px gap
    
*   Keep LOTS of whitespace
    

🧠 Component Breakdown (React)
==============================

Sessions Page
-------------

*   SessionSummaryStrip
    
*   MainTimerCard
    
*   SessionList
    
*   SessionCard
    

Task History Page
-----------------

*   DailyStats
    
*   InsightBanner
    
*   HistoryList
    
*   HistoryItem
    

Analytics Page
--------------

*   FocusTrendChart
    
*   StreakCard
    
*   SessionQualityCard
    
*   BehaviorCard
    
*   GoalDistributionChart
    

🔥 Final UX Flow
================

User opens app:

### Step 1 → Sessions

👉 resumes session

### Step 2 → completes work

### Step 3 → Task History

👉 sees “2h done” → dopamine

### Step 4 → Analytics

👉 sees improvement → motivation

🚀 Final Design Summary
=======================

Sessions
--------

👉 DOING

*   timer
    
*   active sessions
    
*   actions
    

Task History
------------

👉 FEELING PROGRESS

*   today stats
    
*   completed list
    

Analytics
---------

👉 IMPROVEMENT

*   trends
    
*   behavior
    
*   insights