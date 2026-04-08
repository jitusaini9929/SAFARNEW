Study Planner v2 Product Spec - REDESIGN
========================================

Product intent
--------------

The planner must help a student do 4 things well:

1.  Create a study plan fast
    
2.  Understand what to do today
    
3.  Track progress without friction
    
4.  Recover when they fall behind
    

Everything else is secondary.

Core product rules
==================

Rule 1
------

The planner home is **Today**, not Tree, not Kanban, not Calendar.

Rule 2
------

The first-time experience is a guided setup flow, not silent auto-creation.

Rule 3
------

All visible states must match backend logic:

*   Not Started
    
*   In Progress
    
*   Done
    
*   Needs Revision
    

Rule 4
------

Planning logic must be visible and explainable:

*   exam date
    
*   daily goal
    
*   off days
    
*   lock existing dates
    
*   include revision needed
    

Rule 5
------

Editing syllabus is an admin task, not the main experience.

New navigation structure
========================

Use only these top-level sections:

*   **Today**
    
*   **Plan**
    
*   **Syllabus**
    
*   **Calendar**
    

Optional later:

*   **Insights** for premium only
    

Do not use “Tree” and “Kanban” as top-level nav labels.

User journeys
=============

First-time user
---------------

Open planner → Setup Wizard → Generate Plan → Land on Today

Returning user
--------------

Open planner → Today

User falling behind
-------------------

Today → overdue panel → reschedule or regenerate

User editing content
--------------------

Today or Plan → Syllabus

Shared data model in UI
=======================

These are the main entities the UI should clearly represent.

Plan
----

*   id
    
*   title
    
*   examName / examType
    
*   examDate
    
*   dailyGoal
    
*   offDays
    
*   lockExistingDates
    
*   includeRevisionNeeded
    
*   isPremium
    
*   progressSummary
    

Subject
-------

*   id
    
*   name
    

Chapter
-------

*   id
    
*   name
    
*   subjectId
    

Topic
-----

*   id
    
*   title
    
*   subjectId
    
*   chapterId
    
*   status
    
*   plannedDate
    
*   notes
    
*   optional effort estimate
    

Calendar Day
------------

*   date
    
*   planned topics
    
*   done count
    
*   overdue count
    

Status system
=============

Use these exact labels everywhere.

Not Started
-----------

Has not been studied yet

In Progress
-----------

Started, not finished

Done
----

Completed

Needs Revision
--------------

Completed once, needs another pass

Do not hide Needs Revision from any view if it exists in backend logic.

Screen 1: Planner Entry / Empty State
=====================================

This replaces silent auto-create.

When shown
----------

User has no plan

Goal
----

Force a deliberate start and explain value

Layout
------

### Header

**Create your first study plan**

Subtext:“Build a realistic study schedule for your exam and track what to study each day.”

### Main CTA

**Create Plan**

### Secondary helper text

“You’ll set your exam date, subjects, and daily study target.”

Actions
-------

*   Create Plan → opens Setup Wizard
    
*   Back / close if needed
    

Do not do
---------

*   auto-create a plan
    
*   auto-redirect into a fake default plan
    

Screen 2: Setup Wizard
======================

4-step flow. Progress indicator at top.

Wizard layout rules
-------------------

*   Keep it centered
    
*   One main action per step
    
*   Back button visible after step 1
    
*   Save draft automatically if helpful
    
*   Show step count: Step 1 of 4
    

Step 1: Goal
------------

### Purpose

Define what the plan is for

### Fields

*   Plan title
    
    *   placeholder: “Semester Finals Plan”
        
*   Exam / Goal name
    
    *   placeholder: “UPSC Prelims 2026” or “DSA Placement Prep”
        
*   Exam date
    
*   Optional description
    

### Copy

“Set your target first. Your schedule will be built backward from this date.”

### Buttons

*   Primary: **Continue**
    
*   Secondary: Cancel
    

### Validation

*   title required
    
*   exam date required
    

### Error messages

*   “Add a plan title”
    
*   “Select an exam date”
    

Step 2: Capacity
----------------

### Purpose

Collect realistic planning constraints

### Fields

*   Daily target
    
    *   label: “How many topics can you realistically study per day?”
        
    *   input: number
        
*   Study days per week
    
    *   optional simplified selector
        
*   Off days
    
    *   chips or weekday toggles: Mon Tue Wed Thu Fri Sat Sun
        
*   Include Needs Revision in planning
    
    *   toggle
        
*   Keep already planned dates
    
    *   toggle
        
*   Optional: revision buffer / final revision days later
    

### Copy

“Tell us how much you can realistically study. A realistic plan is better than an ambitious one you won’t follow.”

### Buttons

*   Back
    
*   Continue
    

### Validation

*   daily goal must be > 0
    
*   exam date must still be in future
    

Step 3: Syllabus Input
----------------------

### Purpose

Make content entry fast and non-intimidating

### Entry modes

Use tabs or segmented controls:

*   **Quick Add**
    
*   **Bulk Paste**
    
*   **Template Import** later if needed
    

### Quick Add mode

Fields:

*   Subject name
    
*   Chapter name optional
    
*   Topic input
    
*   Add topic button
    
*   Add another topic inline
    

### Bulk Paste mode

Large textarea

Placeholder:

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   Math  - Algebra  - Trigonometry  - Calculus  Physics  - Kinematics  - Current Electricity   `

### Parsed preview

After paste, show:

*   subjects detected
    
*   topics detected
    
*   invalid lines if any
    

### Copy

“Add your subjects and topics. Start simple. You can refine chapters and notes later.”

### Buttons

*   Back
    
*   Continue
    

### Validation

At least 1 subject and 1 topic

### Important UX rule

Do not force chapter creation if the user does not care.Chapters can be optional.

Step 4: Review & Generate
-------------------------

### Purpose

Confirm setup before scheduling

### Show summary card

*   Plan title
    
*   Exam name
    
*   Exam date
    
*   Days left
    
*   Daily goal
    
*   Off days
    
*   Subjects count
    
*   Topics count
    
*   Revision mode
    
*   Keep existing dates yes/no
    

### Plain-language explanation

“We will schedule unfinished topics from today until your exam date, skipping your off days.”

### Buttons

*   Back
    
*   **Generate Plan**
    

### After click

*   Show generating state
    
*   Call planner generation logic
    
*   On success → Today screen
    
*   On failure → clear error banner
    

Screen 3: Today Home
====================

This is the main planner screen.

Purpose
-------

Immediately answer:

*   what should I study today
    
*   what is overdue
    
*   am I on track
    

Layout
------

### A. Top header

Left:

*   Plan title
    
*   Exam name
    

Right:

*   quick actions dropdown or buttons:
    
    *   Edit Plan
        
    *   Add Topics
        
    *   Rebuild Plan
        

B. Summary strip
----------------

4–5 compact cards

### Card 1

**Days left**Example: 23 days

### Card 2

**Completed**Example: 18 / 74 topics

### Card 3

**Today**Example: 3 tasks planned

### Card 4

**Status**Example:

*   On track
    
*   Slightly behind
    
*   Behind by 6 topics
    

### Card 5 optional

**Next off day**Example: Sunday

C. Primary panel: Today’s Tasks
-------------------------------

### Title

**Today’s Study Tasks**

### If tasks exist

Each task row/card shows:

*   Topic title
    
*   Subject
    
*   Chapter optional
    
*   planned date = today
    
*   current status badge
    
*   notes indicator if present
    

### Main actions on each card

*   **Start**
    
*   **Mark Done**
    
*   **Needs Revision**
    
*   overflow menu:
    
    *   Move to tomorrow
        
    *   Remove date
        
    *   Edit notes
        
    *   Open in Syllabus
        

### Behavior

*   Start → status becomes In Progress
    
*   Mark Done → status becomes Done
    
*   Needs Revision → status becomes Needs Revision
    
*   Move to tomorrow → plannedDate updated
    
*   Remove date → plannedDate null
    

### Empty state

“No tasks planned for today.”CTA options:

*   View upcoming
    
*   Rebuild plan
    
*   Add topics
    

D. Overdue panel
----------------

### Title

**Overdue**

### Why this matters

This must be visible, not buried.

### Show

*   number of overdue topics
    
*   first few overdue items
    
*   days overdue if possible
    

### Actions

*   **Reschedule Overdue**
    
*   **Mark Done**
    
*   **Skip for now**
    

### If none

Hide or show subtle “No overdue topics”

E. Upcoming panel
-----------------

### Title

**Coming Up**

Show next 5–7 topics with dates.

### Actions

*   Move date
    
*   Mark done
    
*   Open calendar
    

F. Quick actions row
--------------------

Buttons:

*   **Add Topics**
    
*   **Edit Syllabus**
    
*   **Open Calendar**
    
*   **Rebuild Plan**
    

Screen 4: Plan Screen
=====================

This is the settings and planning control center.

Purpose
-------

Let users understand and control schedule generation

Sections
--------

A. Exam Settings card
---------------------

Fields:

*   Plan title
    
*   Exam / goal name
    
*   Exam date
    

Action:

*   Save Changes
    

B. Study Capacity card
----------------------

Fields:

*   daily goal
    
*   off days selector
    
*   include Needs Revision
    
*   keep already planned dates
    

Action:

*   Save Changes
    

Helper text:“These settings affect how your schedule is generated.”

C. Planning Explanation card
----------------------------

Show clear bullets:

*   “Only unfinished topics are scheduled.”
    
*   “Done topics are never scheduled again.”
    
*   “Off days are skipped.”
    
*   “Needs Revision topics are included only if this option is enabled.”
    
*   “If ‘Keep already planned dates’ is on, existing scheduled topics stay where they are.”
    

This card is not decoration.It reduces user distrust.

D. Plan Actions card
--------------------

Buttons:

*   **Generate / Rebuild Schedule**
    
*   **Reschedule Overdue**
    
*   **Clear Future Dates**
    
*   **Reset Plan** if appropriate and safe
    

### Confirmation dialogs

For destructive actions:

*   “This will remove planned dates for future topics.”
    
*   “This will rebuild your schedule using current settings.”
    

E. Progress Snapshot card
-------------------------

Show:

*   completed count
    
*   in progress count
    
*   not started count
    
*   needs revision count
    
*   overdue count
    

Optional small progress bar

Screen 5: Syllabus Screen
=========================

This is the editing/admin area.

Purpose
-------

Manage study content without overwhelming first-time users

Layout
------

### A. Toolbar

*   Search topics
    
*   Filter by subject
    
*   Filter by status
    
*   Add Subject
    
*   Bulk Add
    

B. Subject list
---------------

Each subject is a card or accordion.

Subject header shows:

*   subject name
    
*   topic count
    
*   progress %
    

Actions:

*   Add Chapter
    
*   Add Topic
    
*   Rename
    
*   Delete
    

C. Chapter section
------------------

Inside expanded subject:

*   chapter list
    
*   chapter name
    
*   topic count
    

Actions:

*   Add Topic
    
*   Rename
    
*   Delete
    

If user does not use chapters, topics can sit directly under subject.

D. Topic rows
-------------

Each topic row shows:

*   topic title
    
*   status badge
    
*   planned date if any
    
*   notes icon
    
*   quick actions
    

Quick actions:

*   Mark In Progress
    
*   Mark Done
    
*   Needs Revision
    
*   Edit Date
    
*   Edit Notes
    
*   Delete
    

Do not show 9 controls at once.Use overflow menu for lower priority actions.

E. Bulk Add modal
-----------------

### Fields

*   Subject selector or new subject input
    
*   optional chapter
    
*   textarea for one-topic-per-line input
    

### Example

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   Limits  Differentiation  Integration   `

### Action

**Add Topics**

This is crucial for reducing setup pain.

Screen 6: Calendar Screen
=========================

Purpose
-------

Date overview and rescheduling

Layout
------

### A. Month header

*   previous month
    
*   current month label
    
*   next month
    

### B. Calendar grid

Each day cell shows:

*   task count
    
*   done count
    
*   overdue marker
    
*   selected state
    

Do not cram detailed topic lists into cells.

C. Selected day side panel or drawer
------------------------------------

When a date is clicked, show:

*   planned topics
    
*   done topics
    
*   missed topics
    

Actions per topic:

*   Mark done
    
*   Move date
    
*   Remove date
    
*   Needs revision
    

Actions for day:

*   Move all to next available day
    
*   Clear this day
    

D. Calendar legend
------------------

*   planned
    
*   done
    
*   overdue
    
*   off day
    

If off days matter in planning, users must see them here too.

Optional Screen 7: Insights
===========================

Only after the planner is understandable.

Purpose
-------

Retention and premium upsell

Show only useful metrics
------------------------

*   completion trend
    
*   consistency streak
    
*   subject-wise completion
    
*   overdue trend
    
*   upcoming workload
    

Do not prioritize this now.

Component behavior spec
=======================

1\. Planner layout shell
------------------------

Common layout for all planner screens.

### Contains

*   top nav / header
    
*   planner subnav
    
*   main content area
    
*   loading / error handling
    

### Mobile behavior

*   stacked sections
    
*   sticky bottom primary CTA only where needed
    
*   calendar side panel becomes bottom sheet
    

2\. TaskCard component
----------------------

### Props

*   topic title
    
*   subject name
    
*   chapter name optional
    
*   status
    
*   planned date
    
*   notes present
    
*   overdue boolean
    

### Actions

*   Start
    
*   Mark Done
    
*   Needs Revision
    
*   More menu
    

### Visual states

*   overdue emphasized
    
*   done subdued
    
*   in-progress visible but not alarming
    

3\. SummaryCard component
-------------------------

Reusable for:

*   days left
    
*   completed
    
*   overdue
    
*   today count
    
*   on-track status
    

4\. EmptyState component
------------------------

Reusable with:

*   title
    
*   description
    
*   primary action
    
*   optional secondary action
    

You need this across the planner.

State flow spec
===============

Boot logic
----------

### Old behavior

No planId → fetch list → redirect to first or auto-create plan

### New behavior

No plans:

*   show Empty State screen
    

Has plans but no specific planId:

*   open last opened or most recent plan
    
*   then land on Today
    

Do not auto-create

Data loading flow
-----------------

On planner load
---------------

Fetch:

*   plan details
    
*   summary counts
    
*   today tasks
    
*   overdue tasks
    
*   upcoming tasks
    
*   calendar summary lazily if needed
    

Avoid loading everything at once if it hurts performance.

When user changes topic status
------------------------------

Update optimistically if safe:

*   topic status
    
*   local counters
    
*   Today list
    
*   Overdue list if affected
    

Re-fetch only the affected slices when needed, not the entire planner blindly.

When user rebuilds plan
-----------------------

*   show confirmation
    
*   run generate endpoint
    
*   refresh:
    
    *   today
        
    *   upcoming
        
    *   overdue
        
    *   calendar summary
        
    *   progress snapshot
        

Show success toast:“Your study schedule has been rebuilt.”

API/UI contract suggestions
===========================

Your UI should stop thinking in raw CRUD terms and start thinking in screen-based data.

Prefer endpoints or selectors for:
----------------------------------

*   today tasks
    
*   overdue tasks
    
*   upcoming tasks
    
*   progress summary
    
*   plan settings
    
*   syllabus tree
    
*   calendar map
    

Even if backed by same models, the frontend should consume data shaped for the screen.

Error handling spec
===================

Global error banner
-------------------

Use for:

*   failed to load plan
    
*   failed to generate schedule
    
*   failed to save settings
    

Inline errors
-------------

Use for:

*   invalid form field
    
*   failed topic update
    
*   failed date move
    

Empty error copy examples
-------------------------

*   “Couldn’t load your study plan.”
    
*   “Couldn’t rebuild the schedule. Try again.”
    
*   “Couldn’t update this topic.”
    

Do not use vague “Something went wrong” everywhere.

Loading states spec
===================

First load
----------

Skeletons for:

*   summary cards
    
*   today list
    
*   overdue list
    

Wizard actions
--------------

Button loading:

*   “Generating...”
    
*   “Saving...”
    

Topic actions
-------------

Inline loading for row action, not whole page spinner

Copy spec
=========

Use simple student language.

Replace these
-------------

*   Auto-distribute → **Build Schedule**
    
*   Tree View → **Syllabus**
    
*   Kanban View → **Status Board** or remove
    
*   Patch topic → **Update topic**
    
*   Lock existing dates → **Keep already planned dates**
    
*   Include revision needed → **Include revision topics**
    

Design hierarchy spec
=====================

Primary emphasis
----------------

*   Today’s tasks
    
*   overdue
    
*   days left
    
*   on-track status
    

Secondary emphasis
------------------

*   syllabus structure
    
*   notes
    
*   chapter metadata
    
*   analytics
    

Layout rule
-----------

One dominant action per screen.

### Today

Mark Done

### Plan

Build Schedule

### Syllabus

Add Topics

### Calendar

Reschedule

What to remove or demote immediately
====================================

Remove as top-level views
-------------------------

*   Tree
    
*   Kanban
    

Demote
------

*   Calendar from primary to supporting
    
*   analytics until later
    

Hide from first-time users
--------------------------

*   advanced settings unless needed
    
*   deep hierarchy management until after onboarding
    

MVP implementation order
========================

Phase 1
-------

*   remove auto-create
    
*   build Empty State
    
*   build Setup Wizard
    
*   create Today screen
    
*   reroute planner default to Today
    

Phase 2
-------

*   build Plan screen
    
*   expose off days and revision options
    
*   rebuild schedule action
    
*   improve summary counts
    

Phase 3
-------

*   rebuild Syllabus screen for low-friction entry
    
*   bulk add topics
    
*   cleaner topic row actions
    

Phase 4
-------

*   simplify Calendar
    
*   add reschedule flows
    
*   optional Status Board if still needed
    

Phase 5
-------

*   premium insights
    

Acceptance criteria
===================

A first-time user should be able to:

Within 2 minutes
----------------

Create a plan and set exam date

Within 5 minutes
----------------

Add enough syllabus to get started

In 1 click
----------

Generate a schedule

In under 5 seconds
------------------

See what to study today

In under 2 clicks
-----------------

Mark a topic done

Without confusion
-----------------

Understand why a topic was scheduled on a date

If not, the design still failed.

My blunt dev recommendation
===========================

Do not start by “improving the current UI.”

Start by changing the **product structure**:

*   new entry
    
*   new default route
    
*   new first-time flow
    
*   new home screen
    

Because your current issue is not cosmetic.It is architectural UX confusion.

The exact new route structure to would use
==========================================

*   /study/planner
    
    *   if no plans → Empty State
        
    *   if plan exists → redirect to /study/planner/:planId/today
        
*   /study/planner/:planId/today
    
*   /study/planner/:planId/plan
    
*   /study/planner/:planId/syllabus
    
*   /study/planner/:planId/calendar
    

Optional later:

*   /study/planner/:planId/insights
    

This alone will force cleaner thinking in your app.