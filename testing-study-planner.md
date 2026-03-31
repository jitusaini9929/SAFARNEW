Study Planner v2 - Manual Test Script
=====================================

Scope
-----
Validate Phase 1-3 behavior for the Study Planner redesign.

Preconditions
-------------
- Logged in with a test user.
- No existing study plans for fresh-start tests.
- Existing plan with subjects/topics for regression tests.

Test Data
---------
- Plan title: Semester Finals Plan
- Exam name: UPSC Prelims 2026
- Exam date: 30+ days in future
- Daily goal: 3
- Off days: Sat, Sun

Bulk Paste sample
-----------------
Math - Algebra - Trigonometry - Calculus
Physics - Kinematics - Current Electricity
Chemistry:
- Atomic Structure
- Chemical Bonding

Entry and Onboarding
--------------------
1) Open /study/planner with no plans
   - Expect empty state with Create Plan CTA
   - No auto-create happens

2) Click Create Plan
   - Expect 4-step wizard with Step 1 of 4

3) Step 1 validation
   - Leave title blank and continue
   - Expect error: Add a plan title
   - Leave exam date blank and continue
   - Expect error: Select an exam date

4) Step 2 validation
   - Set daily goal to 0 and continue
   - Expect error: Daily goal must be greater than 0
   - Set exam date in past and continue
   - Expect error: Exam date must be in the future

5) Step 3 Quick Add
   - Add Subject name, optional chapter, add topics via Add topic
   - Expect topics appear as removable chips
   - Add another subject

6) Step 3 Bulk Paste
   - Switch to Bulk Paste
   - Paste sample block
   - Expect subject + topic counts, invalid line count

7) Step 4 Review
   - Confirm summary values match selections
   - Click Generate Plan
   - On success, land on Today view
   - On failure, allow Continue to Planner

Today View
----------
1) Header actions
   - Edit Plan opens Plan screen
   - Add Topics opens Syllabus screen
   - Build Schedule prompts and runs

2) Summary strip
   - Days left, Completed, Today, Status, Next off day show correct values

3) Today tasks
   - Start -> In Progress
   - Mark Done -> Done
   - Needs Revision -> Needs Revision
   - More -> Move to tomorrow, Remove date, Edit notes, Open in Syllabus

4) Overdue panel
   - Shows overdue count and days overdue
   - Mark Done updates status
   - Move to Tomorrow updates date
   - Skip for now clears date

5) Coming Up panel
   - Mark Done, Move Date, Calendar buttons work

6) Empty state
   - No tasks planned -> shows CTAs

Plan Screen
-----------
1) Save plan settings
   - Update title/exam name/exam date and save

2) Study capacity
   - Update daily goal/off days
   - Toggle include revision topics and keep planned dates

3) Build schedule
   - Confirm dialog appears and runs

4) Clear future dates
   - Confirm dialog clears only future planned dates

5) Reset plan
   - Confirm dialog resets all topics to Not Started and clears dates

Syllabus Screen
--------------
1) Toolbar
   - Search filters topics
   - Filter by subject and status

2) Add subject
   - Creates new subject card

3) Bulk Add modal
   - Add with existing subject
   - Add with new subject
   - Optional chapter creation

4) Topic rows
   - Start, Mark Done, Needs Revision work
   - More -> Edit notes, Remove date, Delete

5) Multi-topic add
   - Add multiple topics (one per line) into a chapter

6) Empty state
   - No subjects -> show CTA to bulk add
   - Filters -> show clear filters action

Calendar Screen
---------------
1) Month navigation
   - Prev/Next month buttons update view

2) Day cells
   - Planned counts visible
   - Done and overdue markers visible
   - Off day marker visible for off days

3) Selected day panel
   - Planned/Done/Missed counts match
   - Mark Done, Needs Revision, Move Date, Remove Date per topic

4) Day actions
   - Move all to next available day
   - Clear this day

Regression
----------
- Existing plans open directly to Today
- Planner still loads with mixed statuses and dates
- No crashes when no subjects or chapters

Notes
-----
Log any API errors and UI mismatches with screenshots and repro steps.
