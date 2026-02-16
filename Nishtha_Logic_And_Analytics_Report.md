# **Nishtha: Logic Improvement & Analytics Architecture Report**

## **1\. Core Logic "Course Correction"**

Currently, the system treats "Weekly" goals as "Daily" goals with a different label. This confuses students who expect a weekly goal to last 7 days. Below is the corrected logic flow to make the system reliable.

### **A. The "True Weekly" Goal Logic**

**Problem:** Weekly goals expire at 11:59 PM on the day created.

**Correction:** Weekly goals must persist until the end of the current week (Sunday).

**New Server-Side Logic (Pseudo-code):**

function calculateExpiry(goalType: 'daily' | 'weekly') {  
  const NOW\_IST \= getCurrentTimeIST();  
    
  if (goalType \=== 'daily') {  
    // Expires at 11:59:59 PM TODAY  
    return endOfDay(NOW\_IST);   
  }   
    
  if (goalType \=== 'weekly') {  
    // Expires at 11:59:59 PM on the coming SUNDAY  
    return endOfWeek(NOW\_IST, { weekStartsOn: 1 }); // Assuming Monday start  
  }  
}

### **B. The "11 PM Freeze" Refinement**

**Current:** Creation is blocked between 11:01 PM \- 11:59 PM.

**Refinement:** \* **Daily Goals:** Keep blocked. This forces students to sleep or reflect.

* **Weekly Goals:** *Allow* creation during this window.  
* **Reasoning:** A student might be planning their *next* week on a Sunday night at 11:30 PM. Blocking weekly planning causes frustration.

### **C. The "Rollover" Feature (Student-Friendly)**

**New Logic:** If a goal expires but isn't completed:

1. Do not just delete it or mark it "failed" silently.  
2. Move it to a "Backlog" or "Missed" state.  
3. On the next login, ask: *"You missed 'Finish Anatomy Chapter 3'. Do you want to try again today?"*  
4. If "Yes" \-\> Clone goal with new created\_at (Today).  
5. If "No" \-\> Archive as "Abandoned".

## **2\. Analytics Architecture: What to Log?**

To generate a meaningful Monthly Report, you need to log **events**, not just current states.

### **Data Points to Capture (Database Schema Additions)**

#### **1\. The GoalActivityLog Collection**

Instead of just overwriting completed: true, create a separate log entry every time an action happens.

* event\_type: "CREATED" | "COMPLETED" | "ABANDONED" | "ROLLED\_OVER"  
* goal\_id: Reference ID  
* goal\_type: "daily" | "weekly"  
* timestamp: IST Timestamp  
* day\_of\_week: "Monday", "Tuesday"... (Helps find productive days)  
* hour\_of\_day: 0-23 (Helps find productive hours)

#### **2\. The FocusSessionLog (Enhanced)**

* duration: Minutes  
* associated\_goal\_id: (Optional) Did they focus on a specific goal?  
* interrupted: Boolean (Did they stop the timer early?)

#### **3\. The MoodSnapshot**

* mood\_score: 1-5  
* pre\_study\_mood: Mood before starting a session.  
* post\_study\_mood: Mood after finishing.

## **3\. The Monthly Report: "The Nishtha Scorecard"**

This is the feature that will be shared with the student. It shouldn't just be a graph; it should be a narrative.

**Report Generation Logic:** Run this calculation on the 1st of every month for the previous month's data.

### **Section A: The Executive Summary (The "Grades")**

| Metric | Calculation Formula | Feedback Message (Example) |
| :---- | :---- | :---- |
| **Consistency Score** | (Days Logged In / Total Days in Month) \* 100 | "You showed up 25/30 days. That's 'A' tier consistency\!" |
| **Completion Rate** | (Goals Completed / Goals Created) \* 100 | "You complete 80% of what you plan. Great realistic planning." |
| **Focus Depth** | Total Focus Minutes / Days Active | "Average 45 mins/day. Let's aim for 60 next month." |

### **Section B: The "Self-Discovery" Insights**

Using the logs defined in Section 2, generate these specific insights:

**1\. "Your Power Hour"**

* *Logic:* Group GoalActivityLog (COMPLETED) by hour\_of\_day. Find the peak.  
* *Output:* "You destroy tasks between **8 PM and 10 PM**. Protect this time\!"

**2\. "The Mood Connection"**

* *Logic:* Correlate MoodSnapshot with Completion Rate for that day.  
* *Output:* "When you feel **'Anxious'**, your completion rate drops by 40%. Try a 5-min breathing session first."

**3\. "The Sunday Scaries"**

* *Logic:* Compare completion rates by day\_of\_week.  
* *Output:* "You often miss goals on **Fridays**. Maybe plan lighter loads for the weekend?"

### **Section C: The Badge Summary**

* **"The Finisher":** Completed 100% of Weekly Goals.  
* **"Early Bird":** Completed 5 goals before 9 AM.  
* **"Night Owl":** Completed 10 goals after 10 PM.

## **4\. Technical Implementation Steps**

### **Step 1: Update Server Goal Route (server/routes/goals.ts)**

Implement the date-fns library to handle the weekly expiry properly.

import { endOfDay, endOfWeek, isBefore, set } from 'date-fns';  
import { utcToZonedTime } from 'date-fns-tz';

// Timezone constant  
const IST\_TIMEZONE \= 'Asia/Kolkata';

// In your POST /goals route:  
const now \= new Date();  
const zonedNow \= utcToZonedTime(now, IST\_TIMEZONE);

let expiresAt;

if (type \=== 'weekly') {  
    // Set to next Sunday 23:59:59 IST  
    expiresAt \= endOfWeek(zonedNow, { weekStartsOn: 1 }); // 1 \= Monday  
} else {  
    // Set to Today 23:59:59 IST  
    expiresAt \= endOfDay(zonedNow);  
}

### **Step 2: Create the Aggregation Endpoint**

Create a new route GET /analytics/monthly-report.

This endpoint should not calculate on the fly every time.

* **Best Practice:** Calculate this *once* at the end of the month and store it in a MonthlyReports collection.  
* **On Request:** Just fetch the stored JSON.

### **Step 3: Frontend Visualization**

* Use a **Radar Chart** for skills (Consistency, Focus, Completion, Mood).  
* Use a **Heatmap** (GitHub style) for daily activity intensity.

## **5\. Summary of Benefits**

1. **Trust:** Students will trust the app because weekly goals won't disappear arbitrarily.  
2. **Insight:** Instead of just "checking boxes," students learn *how* they work best (Time of day/Mood).  
3. **Retention:** The Monthly Report gives them a reason to stay for 30 days to see their "Grade."