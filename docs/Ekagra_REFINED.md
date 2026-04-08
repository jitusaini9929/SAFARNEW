The problem is :the surrounding systems — **History, Sessions, Analytics** — are behaving like separate unfinished products instead of extensions of the same timer flow. The current implementation also mixes task history, session state, and analytics pipelines in ways that can drift apart.

So the solution is:

Keep the main Ekagra mode UI almost untouched.
----------------------------------------------

But rebuild the **logic contract** for:

*   Session
    
*   History
    
*   Analytics
    

Everything should be derived from **one single source of truth**.

The actual root problem
=======================

Right now your system seems to have multiple concepts floating around:

*   timer state
    
*   task state
    
*   goal linkage
    
*   live session state
    
*   focus session logs
    
*   history records
    
*   analytics summaries
    

That creates mismatch like:

*   timer says one thing
    
*   history says another
    
*   session overlay says another
    
*   analytics shows something else
    

This happens when different parts are tracking reality separately.

You need one central rule:
--------------------------

Timer is the live controller
============================

Session is the truth record
===========================

History is a view of session records
====================================

Analytics is an aggregate of session records
============================================

That is the backbone.

If you enforce this, everything becomes much cleaner.

New clean architecture without changing the main UI
===================================================

1\. Main Ekagra screen
----------------------

Keep as is visually.

Its job should only be:

*   choose focus item
    
*   choose duration
    
*   start/pause/reset
    
*   show current task
    
*   show current mode
    

It should **not** be responsible for maintaining separate business truths for history and analytics.

It only controls the live state.

2\. Define one canonical object
===============================

You need one single record type behind all surrounding features:

FocusSession
------------

Suggested fields:

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   type FocusSession = {    id: string    userId: string    title: string                  // what the user focused on    linkedGoalId?: string | null    linkedGoalTitle?: string | null    sessionType: 'focus' | 'short_break' | 'long_break'    plannedMinutes: number    actualMinutes: number    status: 'active' | 'paused' | 'completed' | 'ended_early'    startedAt?: string | null    pausedAt?: string | null    resumedAt?: string | null    completedAt?: string | null    endedAt?: string | null    createdAt: string    updatedAt: string    interruptionCount: number    pauseCount: number    source: 'quick' | 'goal_import' | 'manual_task'    dayKey: string                 // YYYY-MM-DD based on user's local timezone  }   `

This record becomes the truth.

3\. Strict ownership rules
==========================

Timer owns:
-----------

*   countdown
    
*   running / paused display
    
*   active session ID
    
*   current mode
    

Session record owns:
--------------------

*   startedAt
    
*   endedAt
    
*   completedAt
    
*   actualMinutes
    
*   status
    
*   linked goal
    
*   title
    
*   dayKey
    

History owns:
-------------

*   nothingIt only reads sessions.
    

Analytics owns:
---------------

*   nothingIt only aggregates sessions.
    

This is the most important change.

4\. Fix the terminology
=======================

Right now “task”, “goal”, “session”, “history” overlap too much.

You should define them like this:

Task
----

The label shown in timer inputExample: “Maths”, “Physical Chemistry”

Goal
----

Optional linked object from Goals section

Session
-------

One actual timed run

History
-------

A list of past sessions

Analytics
---------

Math derived from past sessions

Once you lock these meanings, edge cases reduce fast.

The logic contract you should enforce
=====================================

A. When user types task and presses Start
-----------------------------------------

Create a FocusSession immediately:

*   status = active
    
*   startedAt = now
    
*   plannedMinutes = current timer minutes
    
*   actualMinutes = 0
    
*   title = current task input
    
*   sessionType = focus
    
*   dayKey = user local date
    

This session is now the source of truth.

B. When timer is paused
-----------------------

Do not create another object.

Just update same session:

*   status = paused
    
*   increment pauseCount
    
*   store pausedAt
    

C. When resumed
---------------

Same session:

*   status = active
    
*   resumedAt = now
    

D. When timer ends normally
---------------------------

Update session:

*   status = completed
    
*   completedAt = now
    
*   endedAt = now
    
*   actualMinutes = plannedMinutes
    

This session is now eligible for:

*   history
    
*   analytics
    
*   goal contribution
    

E. When user stops before completion
------------------------------------

Update session:

*   status = ended\_early
    
*   endedAt = now
    
*   actualMinutes = elapsed minutes
    

This should still go to history.And analytics should count it differently from completed.

Do **not** discard it unless it never really started.

F. When session is reset before actually starting
-------------------------------------------------

Only then you may remove draft/live state without recording a real session.

What to do with “discarded”
===========================

Internally, your current system uses discarded.

That is okay for backend if needed, but for product logic I strongly suggest:

Use only:

*   active
    
*   paused
    
*   completed
    
*   ended\_early
    

Reason:“discarded” pollutes history and analytics logic.

For example:

*   should discarded count in interruptions?
    
*   should it show in history?
    
*   should it affect average session length?
    

It creates ambiguity.

Instead:

Rule
----

If session started meaningfully, store it as ended\_early.If session never meaningfully started, delete draft / ignore.

Much cleaner.

Simplify Sessions panel
=======================

Your current Sessions modal has:

*   Running
    
*   Paused
    
*   Resumable Time
    
*   active session control area
    
*   multiple empty sections
    

It feels like internal admin tooling, not a user feature.

Sessions panel should become:
-----------------------------

“Focus Sessions”
================

Two sections only:

1\. Current
-----------

Show only if session exists

*   title
    
*   timer state
    
*   duration left / elapsed
    
*   Resume / Pause / End
    

2\. Saved for later
-------------------

List paused sessions

*   title
    
*   planned duration
    
*   time already spent
    
*   Resume
    
*   End
    

That’s it.

Remove:

*   “Ready”
    
*   resumable-time summary block
    
*   too many counters at top
    
*   empty sections when there is nothing
    

Because users do not care about session system categories.They care about:

*   what is active now
    
*   what can I resume later
    

Simplify History panel
======================

Your current history mixes:

*   open
    
*   completed
    
*   closed
    
*   daily report
    
*   goals
    
*   avg session
    
*   timeline
    

This is too much for a side drawer.

History should become:
----------------------

“Focus History”
===============

Top summary:

*   Focused today
    
*   Sessions done today
    
*   Avg completed session
    

Then tabs:

*   Today
    
*   7 days
    
*   All
    

Each history row should be session-based, not task-based.

A row should show:
------------------

*   title
    
*   date/time
    
*   actual minutes
    
*   status chip
    
*   linked goal if any
    

Example:

*   Maths — 25m — Completed
    
*   Physical Chemistry — 12m — Ended early
    
*   Maths — 25m — Completed
    

This is far more accurate than trying to merge tasks + sessions into one list.

Important fix:
==============

History should not show raw tasks
---------------------------------

It should show **session outcomes**.

Because one task can have many sessions.That is likely one reason your mapping feels inaccurate.

For example:

*   Task “Maths”
    
*   Session 1 = 25m completed
    
*   Session 2 = 10m ended early
    
*   Session 3 = 25m completed
    

If history only shows “Maths created today”, it loses truth.

Simplify Analytics massively
============================

Your analytics page visually is decent, but logically it is trying to infer too much, and some metrics are weak or unreliable.

From the file, current analytics derives many values from recent sessions and hardcoded values like a 240-minute daily goal.

That is where trust breaks.

Only show analytics that are directly provable from session records.
--------------------------------------------------------------------

Keep these:

### Today

*   Total focus time
    
*   Completed sessions
    
*   Ended early sessions
    
*   Total break time
    

### This week

*   Focus minutes by day
    
*   Completion rate
    
*   Avg session length
    
*   Current streak
    

### Work patterns

*   Most focused task names
    
*   Best time of day
    
*   Pause rate
    
*   Finish rate
    

Remove or demote:

*   overly clever insights text unless backed strongly
    
*   anything based on too few sessions
    
*   hardcoded daily goal
    
*   weak “goal distribution” if labels are messy or unlabeled
    

Exact metric rules you should use
=================================

Here is the correct mapping.

History mapping
---------------

History includes:

*   completed sessions
    
*   ended\_early sessions
    
*   paused sessions only in Sessions panel, not History by default
    

History should not include:

*   draft tasks
    
*   task creation events
    
*   unstarted entries
    

Analytics mapping
-----------------

### totalFocusMinutes

Sum of actualMinutes for sessions where sessionType = focus and status is:

*   completed
    
*   ended\_early
    

### totalBreakMinutes

Sum of actualMinutes for sessions where sessionType is:

*   short\_break
    
*   long\_breakand status is completed or ended\_early
    

### completedSessions

Count of focus sessions with status = completed

### earlyEndedSessions

Count of focus sessions with status = ended\_early

### avgSessionLength

Average of actualMinutes for completed focus sessions only

### completionRate

completed focus sessions / all started focus sessions

### streak

A day counts only if at least 1 completed focus session exists

### topTasks

Group by normalized title

### interruptions

This should not mean “not completed”It should mean something explicit:

*   pauseCount > 0or
    
*   manually ended early
    

Pick one definition and keep it consistent.

Why your current analytics feels wrong
======================================

Because some of it is probably mixing:

*   task list state
    
*   session list state
    
*   completed flag
    
*   imported goals
    
*   recent session subset
    
*   legacy stats endpoint logic
    

So a user sees:

*   3 done in history
    
*   4 sessions in analytics
    
*   0 minutes somewhere elseand trust breaks.
    

That mismatch is deadly.

The one rule that will save this feature
========================================

Every panel must read from the same session table.
--------------------------------------------------

Meaning:

### Timer

writes session data

### History

reads session data

### Sessions

reads open/paused session data

### Analytics

aggregates session data

No separate interpretation layer per page.

Suggested UI behavior without changing your design
==================================================

Main page
---------

Keep visually same.

Only add one tiny status line below task field if needed:

*   Not started
    
*   Running session
    
*   Paused session saved
    
*   Linked to goal: Maths Revision
    

This will improve clarity without redesign.

Sessions modal
--------------

Use as operational control only.

Show:

*   Current session
    
*   Paused sessions
    

Buttons:

*   Resume
    
*   Pause
    
*   End
    

No extra analytics-like cards unless truly useful.

History drawer
--------------

Use as review only.

Show:

*   today summary
    
*   filter tabs
    
*   session rows
    

No mixing with open session management.

Analytics page
--------------

Use only for trustworthy trends.

If data is sparse, say:

*   “Not enough focus sessions this week yet.”
    

That is better than filling boxes with misleading values.

Very important: unify task title logic
======================================

That circled task field in your screenshot is probably another source of inconsistency.

You need one rule:

When session starts
-------------------

Freeze the task title into the session record.

Even if the current task input changes later, the session history remains tied to the title at the moment the session started.

Otherwise analytics/history drift.

Suggested implementation phases
===============================

Phase 1 — data truth cleanup
----------------------------

1.  Create one canonical FocusSession shape
    
2.  Make timer create/update only that
    
3.  Stop history from reading tasks directly
    
4.  Stop analytics from mixing task and session sources
    

Phase 2 — sessions cleanup
--------------------------

1.  Replace discarded with ended\_early for real started sessions
    
2.  Show only Current + Saved for later in sessions modal
    
3.  Remove low-value empty sections
    

Phase 3 — history cleanup
-------------------------

1.  Make history session-based
    
2.  Separate history from session control
    
3.  Show actual minutes, not just task names
    

Phase 4 — analytics cleanup
---------------------------

1.  Recompute only from session table
    
2.  Remove hardcoded daily goal unless configurable
    
3.  Keep only metrics with strong truth
    

The clean product contract
==========================

This is the simplest version:

Ekagra Timer
------------

“What is happening right now?”

Sessions
--------

“What can I still resume or control?”

History
-------

“What have I already done?”

Analytics
---------

“What patterns can I learn from?”

If each one only answers that one question, the whole feature will stop feeling broken.

My strongest recommendation
===========================

Do **not** try to fix this by patching each panel separately.

Instead do this first:

write one session truth model
-----------------------------

Then force:

*   history
    
*   sessions
    
*   analytics
    

to derive from it.

That one backend/frontend contract will solve most of the inconsistency.

In the file : { EKAGRA_REFINED.json } There is a **full ruthless implementation spec** for Ekagra only:

*   exact state machine
    
*   exact session schema
    
*   exact mapping rules for timer/history/sessions/analytics
    
*   exact empty states
    
*   exact button behavior for every edge case.Use that and implement the new ekagra mode that is simpler and seamless.