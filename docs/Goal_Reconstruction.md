Below is a **detailed product + logic design** for a goal creation system that is internally strong, handles edge cases, and still feels simple to users.

Goal System Design
==================

1\. Product objective
---------------------

The goal system must help users do 5 things well:

1.  Create a goal quickly
    
2.  Understand what the goal means
    
3.  Track progress without losing partial work
    
4.  Continue unfinished work without confusion
    
5.  See accurate history and analytics
    

The system must **not** overload one field like created\_at to decide everything.

2\. Core product principle
==========================

A goal is not just “something created at time X.”

A goal has **three separate layers**:

Layer A — Definition
--------------------

What the user intends to do.

Example:

*   “Solve 20 MCQs”
    
*   “Study for 2 hours”
    
*   “Finish resume”
    
*   “Practice DSA daily”
    

Layer B — Schedule
------------------

When the system expects it to happen.

Example:

*   today only
    
*   tomorrow only
    
*   by 10 April
    
*   every day
    
*   every weekday
    

Layer C — Execution
-------------------

What actually happened.

Example:

*   started at 3:20 PM
    
*   did 8/20
    
*   completed on 4 April
    
*   missed yesterday
    
*   carried remaining to today
    

Your current confusion is happening because these three are mixed.

3\. The model you should adopt
==============================

Use **Goal Template + Goal Instance + Progress Log**

This is the cleanest architecture.

3.1 Goal Template
-----------------

This is the master object.It describes the goal rule or setup.

A template may be:

*   a one-time goal definition
    
*   a daily goal definition
    
*   a recurring goal definition
    

### Fields

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   GoalTemplate {    id: string    user_id: string    title: string    description?: string    goal_type: "one_time" | "daily" | "recurring"    unit_type: "binary" | "count" | "duration_minutes" | "checklist"    target_value?: number    checklist_items?: ChecklistItem[]    schedule_type: "today" | "specific_date" | "date_range" | "recurring_rule"    scheduled_date?: string           // YYYY-MM-DD    start_date?: string               // YYYY-MM-DD    due_date?: string                 // YYYY-MM-DD    repeat_rule?: {      frequency: "daily" | "weekly" | "custom"      interval?: number      days_of_week?: number[]         // 0-6    }    carry_forward_mode: "none" | "remaining" | "full" | "ask"    auto_create_next_instance: boolean    timezone: string    created_at: string    updated_at: string    archived_at?: string  }   `

3.2 Goal Instance
-----------------

This is the actual occurrence that user works on.

Examples:

*   Today’s study goal
    
*   April 2 instance of “Solve MCQs daily”
    
*   One-time goal currently active
    
*   April 3 carry-forward version of unfinished work
    

### Fields

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   GoalInstance {    id: string    template_id?: string    user_id: string    title_snapshot: string    description_snapshot?: string    instance_type: "one_time" | "daily" | "recurring_occurrence"    unit_type: "binary" | "count" | "duration_minutes" | "checklist"    target_value?: number    achieved_value?: number    checklist_snapshot?: ChecklistItem[]    scheduled_date?: string           // for daily/recurring    window_start_at?: string    window_end_at?: string    status:      | "not_started"      | "in_progress"      | "completed"      | "partial"      | "missed"      | "cancelled"      | "expired"      | "rolled_over"    completion_percent: number    started_at?: string    completed_at?: string    closed_at?: string    closed_reason?:      | "completed"      | "expired"      | "cancelled"      | "rolled_over"      | "replaced"    source_instance_id?: string       // for carry forward lineage    rollover_delta?: number           // how much moved from previous instance    created_at: string    updated_at: string  }   `

3.3 Progress Log
----------------

This is optional but highly recommended.

It stores actual work actions.

### Fields

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   ProgressLog {    id: string    instance_id: string    user_id: string    action_type: "increment" | "decrement" | "timer_add" | "check_item" | "uncheck_item" | "manual_edit"    delta_value?: number    note?: string    created_at: string  }   `

Why this matters:

*   allows undo/history
    
*   helps analytics
    
*   helps debugging
    
*   shows real effort even if goal was not completed
    

4\. Goal categories you should expose to users
==============================================

Do not expose technical complexity.

User should only see 3 types:

A. One-time goal
----------------

“Finish whenever I complete it”

Use for:

*   finish assignment
    
*   build login page
    
*   revise chapter 3
    

### Behavior

*   does not expire at midnight
    
*   stays active until:
    
    *   completed
        
    *   manually cancelled
        
    *   due date passes
        
*   partial progress stays saved
    

B. Today goal
-------------

“For today only”

Use for:

*   study 3 hours today
    
*   solve 15 questions today
    
*   revise physics today
    

### Behavior

*   tied to one calendar date, not 24 hours from creation time
    
*   valid till end of that day in user timezone
    
*   partial progress preserved
    
*   after day end, status becomes:
    
    *   completed
        
    *   partial
        
    *   missed
        

C. Repeat goal
--------------

“Do this regularly”

Use for:

*   daily study
    
*   solve 2 DSA problems every day
    
*   gym weekdays
    
*   write journal nightly
    

### Behavior

*   one template creates multiple instances
    
*   each scheduled day gets its own instance
    
*   history preserved per day
    
*   unfinished work can roll forward depending on setting
    

5\. The most important logic change
===================================

created\_at should only mean:
-----------------------------

**when the record was created**

It must not decide:

*   expiry
    
*   success
    
*   goal day
    
*   carry forward
    
*   daily reset
    

Use these instead:

*   scheduled\_date for day-based meaning
    
*   window\_start\_at / window\_end\_at for active period
    
*   completed\_at for finish time
    
*   due\_date for due deadlines
    
*   repeat\_rule for future generation
    

6\. Validity rules
==================

This is where your system becomes stable.

6.1 One-time goal validity
--------------------------

### If no due date

*   active until completed or cancelled
    

### If due date exists

*   active until due date ends
    
*   after due date:
    
    *   if achieved 100% → completed
        
    *   if achieved > 0 but < 100% → partial / expired
        
    *   if achieved = 0 → missed / expired
        

### Example

Created: 2 Apr 1 PMCompleted: 4 Apr 1 PM

Correct UX:

*   Created on 2 Apr
    
*   Completed on 4 Apr
    
*   Took 2 days
    
*   Status: Completed
    

No issue here. This is a one-time goal, not daily.

6.2 Today goal validity
-----------------------

### Rule

A today goal belongs to one **calendar date** in user timezone.

Not 24 hours from creation time.

### Example

Created: 2 Apr 8 PMThis still belongs to 2 Apr only.

At end of 2 Apr:

*   if done fully → completed
    
*   if partial → partial
    
*   if untouched → missed
    

### Important

Do not discard progress.

If user did 50%, record that.

6.3 Recurring goal validity
---------------------------

Each occurrence is its own instance.

Example:

*   template: Study 2 hours daily
    
*   instance Apr 2
    
*   instance Apr 3
    
*   instance Apr 4
    

At end of Apr 2:

*   save status for Apr 2 only
    
*   Apr 3 is separate
    

This avoids “48 hour daily goal” confusion entirely.

7\. Carry-forward logic
=======================

This is where many products fail.

You need explicit carry-forward modes.

7.1 Carry-forward mode = none
-----------------------------

### Meaning

Yesterday stays in history. Today starts fresh.

### Use case

User wants each day independent.

### Example

Apr 2 target: 20 MCQsDone: 8

At day end:

*   Apr 2 status = partial
    
*   Apr 3 instance = fresh target 20
    
*   the remaining 12 is not automatically moved
    

7.2 Carry-forward mode = remaining
----------------------------------

### Meaning

Only unfinished amount moves to next instance.

### Example

Apr 2 target: 20Done: 8Remaining: 12

On Apr 3:

*   Apr 2 saved as partial 8/20
    
*   Apr 3 may become:
    
    *   fresh 20 + carry 12, or
        
    *   only remaining 12
        

You should pick one rule clearly.

### Best choice

Use:

*   recurring daily target stays same
    
*   carry amount is shown separately
    

So Apr 3 displays:

*   Today target: 20
    
*   Carry from yesterday: 12
    

Why?Because otherwise analytics and intent become messy.

7.3 Carry-forward mode = full
-----------------------------

### Meaning

Entire goal recreates next day even if partially done.

### Use case

Habit-like goals where each day has same requirement.

Example:“Study 2 hours every day”

If only 1 hour done on Apr 2:

*   Apr 2 saved as partial
    
*   Apr 3 still asks for full 2 hours
    

This is often correct for true daily goals.

7.4 Carry-forward mode = ask
----------------------------

### Meaning

On next day, system prompts:

*   Continue unfinished goal?
    
*   Carry remaining?
    
*   Start fresh?
    

This is the safest premium UX choice.

8\. Recommended product behavior
================================

This is the model I recommend for most users.

One-time goal
-------------

*   no midnight reset
    
*   optional due date
    
*   progress preserved
    
*   completion based on actual finish
    

Today goal
----------

*   tied to calendar date
    
*   closes at end of day
    
*   progress preserved
    
*   can manually “continue tomorrow”
    

Repeat goal
-----------

*   template + daily instances
    
*   each day independent
    
*   partial history preserved
    
*   carry-forward configurable
    

9\. User-facing creation flow
=============================

Keep the creation UX extremely simple.

Step 1 — Goal title
-------------------

Field:

*   “What do you want to do?”
    

Examples:

*   Solve 20 MCQs
    
*   Study for 2 hours
    
*   Finish project proposal
    

Step 2 — Goal kind
------------------

User selects one:

*   **One-time**
    
    *   complete whenever done
        
*   **Today**
    
    *   just for today
        
*   **Repeat**
    
    *   repeats automatically
        

This is the most important UX decision.

Step 3 — How progress is measured
---------------------------------

User selects one:

*   Complete / Not complete
    
*   Number
    
*   Time
    
*   Checklist
    

### Mapping

*   Complete / Not complete → binary
    
*   Number → count
    
*   Time → duration\_minutes
    
*   Checklist → checklist
    

Step 4 — Set target
-------------------

Depending on measure type:

### Binary

No target input needed

### Count

Target numberExample: 20 questions

### Time

Target durationExample: 120 minutes

### Checklist

Add checklist items

Step 5 — Schedule
-----------------

Depends on goal kind.

### One-time

*   Start now
    
*   Due date optional
    

### Today

*   auto set scheduled date = today
    

### Repeat

*   every day
    
*   weekdays
    
*   custom days
    

Step 6 — Unfinished behavior
----------------------------

Show only if Today or Repeat.

Options:

*   End for the day
    
*   Move remaining
    
*   Ask me next day
    

Step 7 — Create
---------------

That’s it.

Do not show:

*   expiry timestamps
    
*   internal statuses
    
*   created\_at semantics
    
*   weird duration math
    

10\. Goal detail screen UX
==========================

A goal detail page should answer:

1.  What is this goal?
    
2.  What is the target?
    
3.  How much has been done?
    
4.  What is its current status?
    
5.  What happens if it is unfinished?
    

Example display
---------------

**Solve 20 MCQs**Today goalTarget: 20Progress: 8 / 20Status: In progressEnds: Today at 11:59 PMIf unfinished: Ask tomorrow

Buttons:

*   +1 progress
    
*   Edit progress
    
*   Mark complete
    
*   Skip today
    
*   Continue tomorrow
    

11\. History UX
===============

History should not lie.

Do not overwrite yesterday with today.

Each record should remain true.

Example history:

### April 2

Solve 20 MCQsProgress: 8 / 20Status: Partially done

### April 3

Solve 20 MCQsProgress: 20 / 20Status: Completed

### April 4

Solve 20 MCQsProgress: 0 / 20Status: Missed

This is emotionally fair and analytically useful.

12\. Suggested status model
===========================

Keep internal and external statuses separate.

User-facing statuses
--------------------

Only show these in UI:

*   Not started
    
*   In progress
    
*   Completed
    
*   Partially done
    
*   Missed
    

Internal statuses
-----------------

Use richer states in backend:

*   not\_started
    
*   in\_progress
    
*   completed
    
*   partial
    
*   missed
    
*   expired
    
*   cancelled
    
*   rolled\_over
    
*   archived
    

13\. State transitions
======================

13.1 One-time goal transitions
------------------------------

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   created -> not_started  not_started -> in_progress  in_progress -> completed  in_progress -> cancelled  in_progress -> expired (if due date passes)  expired -> reopened (optional)   `

13.2 Today goal transitions
---------------------------

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   created -> not_started  not_started -> in_progress  in_progress -> completed  in_progress -> partial (at day close if incomplete)  not_started -> missed (at day close if untouched)  partial -> closed  missed -> closed   `

13.3 Recurring goal transitions
-------------------------------

For each instance:

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   instance_created -> not_started  not_started -> in_progress  in_progress -> completed  in_progress -> partial (day close)  not_started -> missed (day close)  partial -> rolled_over (if carry forward happens)   `

Important:rolled\_over should not erase partial.It only indicates the system created a new linked instance.

14\. The daily closing job
==========================

You likely need a scheduled backend job.

This runs after day end per user timezone.

Responsibilities
----------------

For every open daily or recurring instance whose window\_end\_at has passed:

### If fully completed

*   set status = completed
    
*   set closed\_reason = completed
    

### If some progress exists

*   set status = partial
    
*   set closed\_reason = expired
    

### If no progress

*   set status = missed
    
*   set closed\_reason = expired
    

Then depending on template:

*   create next instance if recurring
    
*   apply carry-forward mode if needed
    

15\. Carry-forward creation rules
=================================

When creating a next-day instance:

none
----

Create normal next instance only

remaining
---------

If previous target was 20 and achieved 8:

*   remaining = 12
    
*   store on new instance as:
    
    *   rollover\_delta = 12
        

Recommended:Do not change fresh daily target silently.Instead show:

*   today target: 20
    
*   carry-over: 12
    

This is clearer.

full
----

Create next standard instance with full target again

ask
---

Create a pending decision object or show morning prompt

Example prompt:“Yesterday’s goal was 8/20. Continue remaining 12 today?”

Actions:

*   carry remaining
    
*   start fresh
    
*   dismiss
    

16\. Duration logic
===================

This is one of your pain points.

You should show different duration labels depending on goal type.

For one-time goals
------------------

Show:

*   created on
    
*   completed on
    
*   active for X days / hours
    

Example:Created: Apr 2, 1:00 PMCompleted: Apr 4, 1:00 PMDuration: 2 days

This is correct and acceptable.

For today goals
---------------

Do not show:

*   “took 48 hours”
    

Show:

*   Scheduled for Apr 2
    
*   Completed on Apr 2or
    
*   Partial on Apr 2
    

Today goals are day-bounded, not elapsed-time-bound.

For recurring goals
-------------------

Do not show total elapsed duration per template as primary metric.

Show:

*   Apr 2 completed
    
*   Apr 3 missed
    
*   current streak 3
    
*   completion rate 72%
    

17\. Progress models by unit type
=================================

Binary
------

Example:

*   Submit assignment
    

Fields:

*   achieved\_value = 0 or 1
    
*   complete button only
    

Count
-----

Example:

*   Solve 20 questions
    

Fields:

*   target\_value = 20
    
*   achieved\_value = 0..20+
    

UI:

*   +1
    
*   +5
    
*   edit manually
    

Duration
--------

Example:

*   Study 120 minutes
    

Fields:

*   target\_value = 120
    
*   achieved\_value = accumulated minutes
    

Can come from:

*   manual entry
    
*   timer session sync
    

This is powerful if you have focus sessions in your app.

Checklist
---------

Example:

*   Resume work
    
    *   Fix summary
        
    *   Edit projects
        
    *   Export PDF
        

Completion percent based on checked items.

18\. Editing behavior
=====================

Define this clearly or users will get confused.

Editing a template
------------------

Changes future behavior

Example:“Study daily” target changed from 2 hours to 3 hours.

Question:

*   Apply only to future instances?
    
*   Apply today too?
    

Best UX:

*   this instance only
    
*   future instances only
    
*   this and future
    

Editing an instance
-------------------

Changes only today / that record

Example:Today’s target was 20 MCQs, change to 15.

This should not rewrite history of previous days.

19\. Skip behavior
==================

Users need a clean way to intentionally not do a goal.

Add a **Skip** action.

### Skip means

“I am not doing this, but don’t count it as confusion.”

Internal status:

*   cancelled or skipped
    

UI label:

*   Skipped
    

Use for:

*   sick day
    
*   off day
    
*   deliberate pause
    

This is better than forcing missed.

20\. Edge cases and rules
=========================

Edge case 1
-----------

User creates today goal at 11:50 PM

### Rule

Still valid for today only.

At creation show:“Only 10 minutes left today. Continue tomorrow if needed?”

Optional smart UX:suggest one-time goal instead.

Edge case 2
-----------

User changes timezone

### Rule

Use timezone snapshot at instance creation time.Do not retroactively shift historical instances.

Edge case 3
-----------

User creates repeating goal after today is half gone

### Rule

Ask:

*   start today
    
*   start tomorrow
    

Default suggestion:start tomorrow if late in day

Edge case 4
-----------

User completes more than target

Example:22/20 MCQs

### Rule

Allow overachievement

*   achieved = 22
    
*   completion percent capped visually at 100%
    
*   store overflow for analytics
    

Edge case 5
-----------

User partially completes and marks complete manually

### Rule

Allow manual complete only if user explicitly confirms.

Example prompt:“You’ve completed 8/20. Mark as complete anyway?”

Edge case 6
-----------

User deletes a template with existing history

### Rule

Do not delete instances.Archive template only.

History must remain.

Edge case 7
-----------

Recurring goal paused for a week

### Rule

Template can be paused.No instances created during pause.

Edge case 8
-----------

User reopens completed goal

### Rule

Allow reopen only for one-time goals or current-day instances.Do not casually reopen old daily history.

21\. Recommended analytics model
================================

Because you are storing template + instance + logs, analytics becomes much cleaner.

For one-time goals
------------------

*   total completed
    
*   average completion time
    
*   overdue completion count
    

For daily goals
---------------

*   daily completion rate
    
*   partial completion count
    
*   missed count
    
*   average progress %
    

For recurring goals
-------------------

*   streak
    
*   longest streak
    
*   weekly completion rate
    
*   missed days
    
*   carry-forward usage
    

For all goals
-------------

*   effort logged
    
*   consistency trend
    
*   completed vs partial vs missed split
    

22\. Suggested database relationships
=====================================

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   users    -> goal_templates        -> goal_instances            -> progress_logs   `

Optional:

*   checklist\_items table
    
*   carry\_forward\_events table
    
*   goal\_notifications table
    

23\. Suggested API design
=========================

Templates
---------

*   POST /goals/templates
    
*   GET /goals/templates
    
*   PATCH /goals/templates/:id
    
*   POST /goals/templates/:id/archive
    

Instances
---------

*   GET /goals/instances?date=today
    
*   GET /goals/instances/:id
    
*   PATCH /goals/instances/:id
    
*   POST /goals/instances/:id/complete
    
*   POST /goals/instances/:id/skip
    
*   POST /goals/instances/:id/reopen
    
*   POST /goals/instances/:id/carry-forward
    

Progress
--------

*   POST /goals/instances/:id/progress
    
*   GET /goals/instances/:id/progress-logs
    

24\. Suggested UI information architecture
==========================================

A. Goal creation modal
----------------------

Simple, guided, short

Sections:

*   Goal name
    
*   Goal kind
    
*   Progress type
    
*   Target
    
*   Schedule
    
*   If unfinished
    

B. Today page
-------------

Shows active instances for today

Sections:

*   Today goals
    
*   Repeat goals due today
    
*   Continue unfinished (if ask mode)
    
*   Completed today
    

C. Goal history page
--------------------

Shows timeline of instances

Filters:

*   all
    
*   completed
    
*   partial
    
*   missed
    
*   skipped
    

D. Goal template page
---------------------

For recurring/master setup

Shows:

*   title
    
*   type
    
*   repeat rule
    
*   carry-forward mode
    
*   completion stats
    

25\. Best default product choices
=================================

If you want a system that works for most users without overwhelming them, use these defaults:

Default 1
---------

Goal types:

*   One-time
    
*   Today
    
*   Repeat
    

Default 2
---------

Today goals use calendar-day expiry, not 24-hour rolling expiry.

Default 3
---------

Partial progress is always saved.

Default 4
---------

Repeat goals create separate daily instances.

Default 5
---------

Default carry-forward for repeat goals = ask

Default 6
---------

created\_at is audit only.

These 6 choices alone will remove most confusion.

26\. What you should not do
===========================

Do not do these:

### 1\. Do not use completed\_at - created\_at as the main truth for all goals

It is valid only for one-time goals.

### 2\. Do not silently discard partial work

Users hate this.

### 3\. Do not overwrite yesterday’s goal with today’s version

History becomes fake.

### 4\. Do not make every goal a daily goal

Some goals naturally span multiple days.

### 5\. Do not hide carry-forward logic completely

Users should at least know what happens if unfinished.

27\. Example scenarios
======================

Scenario A — One-time goal
--------------------------

User creates:“Finish portfolio”

*   Type: one-time
    
*   Due date: Apr 10
    

On Apr 2 they do some workOn Apr 4 they complete it

### Record

*   created\_at = Apr 2 1 PM
    
*   completed\_at = Apr 4 1 PM
    
*   status = completed
    
*   duration display = 2 days
    

Correct.

Scenario B — Today goal
-----------------------

User creates:“Study 3 hours today”at Apr 2 6 PM

They study 90 mins only.

At end of day:

*   achieved = 90
    
*   target = 180
    
*   status = partial
    

On Apr 3:

*   yesterday stays partial
    
*   user may create fresh today goal or carry remaining if configured
    

Correct.

Scenario C — Repeat goal
------------------------

User creates:“Solve 20 MCQs daily”carry mode = ask

Apr 2:

*   done 8
    
*   status partial
    

Apr 3 morning prompt:“You solved 8/20 yesterday. Continue remaining 12 today?”

User chooses yes

Apr 3 instance:

*   fresh daily target 20
    
*   carry-over 12 shown separately
    

This is a strong UX.

28\. Migration advice from your current system
==============================================

You likely already have goals with:

*   created\_at
    
*   completed\_at
    

You can migrate safely.

For existing completed goals
----------------------------

If no schedule exists:

*   convert to one\_time
    

For existing open goals
-----------------------

If they seem day-based:

*   infer as today only if product explicitly used thatOtherwise:
    
*   convert to one\_time
    

Add new fields gradually
------------------------

Phase 1:

*   add goal\_type
    
*   add scheduled\_date
    
*   add status
    
*   add target\_value
    
*   add achieved\_value
    

Phase 2:

*   add templates
    
*   add recurring support
    
*   add carry-forward rules
    

Phase 3:

*   add progress logs
    
*   add analytics
    

29\. The simplest possible mental model for users
=================================================

This should be your product copy:

One-time
--------

“Finish this whenever you complete it.”

Today
-----

“This is only for today.”

Repeat
------

“This comes back automatically.”

If unfinished
-------------

“You can end it for today, move it forward, or decide tomorrow.”

That feels simple, even if backend is complex.

30\. Final recommended design statement
=======================================

Your goal system should be built on this rule:

> A goal is not defined by when it was created.A goal is defined by what kind of commitment it is, when it is scheduled for, and how progress is preserved across time.