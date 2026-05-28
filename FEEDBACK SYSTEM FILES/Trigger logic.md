I’ll give you a **real trigger system** — not random popups, but **behavior-based logic** that actually gets responses.

🧠 CORE PRINCIPLE
=================

> ❗Never ask for feedback randomly❗Ask when the user just felt something

That “something” = your trigger.

🔥 1. PRIMARY TRIGGERS (High Conversion)
========================================

These should be your **main feedback entry points**

⏱ TRIGGER #1: After Timer Session Ends
--------------------------------------

### 🎯 Why:

User just completed effort → strong emotional moment

### ✅ Logic:

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   IF timer_completed >= 1  AND session_duration >= 15 min  AND feedback_not_shown_today  THEN show feedback prompt   `

### 💬 Prompt:

> “That was a solid focus session 💪Anything we can improve?”

👉 This will be your **highest quality feedback source**

🎯 TRIGGER #2: After Goal Completion
------------------------------------

### 🎯 Why:

User feels productive → more willing to respond

### ✅ Logic:

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   IF goals_completed_today >= 1  AND first_goal_completion_today  THEN show rating prompt   `

### 💬 Prompt:

> “Nice work completing your goal 🎯Was this helpful?”

⭐ ⭐ ⭐ ⭐ ⭐

📅 TRIGGER #3: After 3–5 Days of Usage
--------------------------------------

### 🎯 Why:

User has enough experience to give meaningful feedback

### ✅ Logic:

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   IF user_days_active >= 3  AND feedback_never_given  THEN show feedback modal on login   `

### 💬 Prompt:

> “You’ve been using SAFAR for a few days 👀What’s working? What’s not?”

🧨 2. NEGATIVE TRIGGERS (Even MORE Important)
=============================================

These give you **real problems users face**

❌ TRIGGER #4: User Drops Off Mid-Flow
-------------------------------------

Example:

*   Opens check-in → doesn’t complete
    

### ✅ Logic:

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   IF checkin_started == true  AND not_completed  AND user_idle > 10 sec  THEN show micro prompt   `

### 💬 Prompt:

> “Something unclear?”

👉 Keep it VERY subtle (not intrusive)

⚠️ TRIGGER #5: Repeated Behavior Failure
----------------------------------------

Example:

*   User starts timer but quits early multiple times
    

### ✅ Logic:

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   IF timer_started >= 3  AND completed < 1  THEN trigger feedback   `

### 💬 Prompt:

> “Is something making it hard to stay focused?”

👉 This is GOLD for product improvement

😐 3. PASSIVE TRIGGERS (Low Pressure)
=====================================

💬 TRIGGER #6: Floating Button (Always Available)
-------------------------------------------------

No logic needed, but:

### Enhancement:

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   IF user_idle_dashboard > 20 sec  THEN pulse feedback button once   `

👉 Gentle reminder, not annoying

🧩 TRIGGER #7: Inside Empty States
----------------------------------

Example:

*   No goals set
    
*   No planner data
    

### 💬 Prompt:

> “What would make this useful for you?”

👉 Feels natural, not forced

🚫 4. WHEN NOT TO SHOW FEEDBACK (VERY IMPORTANT)
================================================

Avoid killing UX.

❌ NEVER SHOW:
-------------

### 1\. Immediately after login

👉 User hasn’t done anything yet

### 2\. During active focus session

👉 Breaks flow

### 3\. Too frequently

✅ Add Cooldown Logic:
---------------------

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   feedback_shown_limit = 1 per day  feedback_cooldown = 48–72 hours   `

🧠 5. SMART PRIORITY SYSTEM
===========================

If multiple triggers fire:

Priority Order:
---------------

1.  After Timer (strongest)
    
2.  After Goal completion
    
3.  After 3–5 day usage
    
4.  Passive prompts
    

👉 Show only ONE at a time

🔥 6. ADVANCED (High Impact)
============================

🎯 Adaptive Feedback Trigger
----------------------------

Track behavior:

### Example:

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   IF user_uses_timer_often  THEN ask timer-related feedback  IF user_uses_planner_more  THEN ask planner-related feedback   `

👉 Makes feedback feel **relevant**

⚡ FINAL SYSTEM (Simple Version)
===============================

Implement just this first:

### ✅ MUST HAVE:

*   After timer session
    
*   After goal completion
    
*   After 3 days usage
    
*   Floating button
    

### ❌ IGNORE rest for now

🧩 FINAL INSIGHT
================

> ❗Bad feedback systems interrupt users❗Great ones feel like part of the experience