# **📜 Mehfil: Self-Moderating Architecture & Implementation Guide**

This document provides a comprehensive technical blueprint to transition "Mehfil" from a randomized feed into a structured, AI-moderated community. It is designed for developers to integrate as a "set-and-forget" system.

## **1\. The "Logic Gate" System**

The core of this approach is an **Intelligence Interceptor** that acts as a middleware between the user's client and your database.

### **The Interceptor Flow**

1. **Identity Verification:** Check the user's is\_shadow\_banned status in the DB.  
2. **Length & Format Check:** Filter out posts under 15 characters (e.g., "Hi", "Yo", "ok") immediately.  
3. **AI Analysis:** Send the content to **Llama-3.1-8B-Instant** via the Groq API.  
4. **Routing Decision:**  
   * **IF ACADEMIC/REFLECTIVE:** Write to the main DB and broadcast via Socket.io to the specific room.  
   * **IF BULLSHIT:** Silently discard or save to temporary storage to track strikes.

## **2\. Database Schema Extensions**

Add these fields to your existing tables to support categorization and automated moderation.

### **Table: thoughts**

| Field | Type | Purpose |
| :---- | :---- | :---- |
| category | Enum | Stores ACADEMIC, REFLECTIVE, or BULLSHIT. |
| ai\_tags | Array | Auto-generated keywords (e.g., \#Anxiety, \#GATE, \#StudyTips). |
| ai\_score | Float | Confidence score of the AI (0.0 \- 1.0). |
| status | String | approved (visible) or flagged (needs review). |
| expires\_at | Timestamp | TTL (Time-to-Live) for bullshit posts to auto-delete. |

### **Table: users**

| Field | Type | Purpose |
| :---- | :---- | :---- |
| spam\_strike\_count | Integer | Tracks how many "Bullshit" posts the user attempted. |
| is\_shadow\_banned | Boolean | If true, posts are "ghosted" (never saved or broadcasted). |

## **3\. The "Gatekeeper" AI Configuration (Groq API)**

Use this **System Prompt** for your Groq API call to ensure strict classification.

**System Prompt:**

You are the Content Architect for "Mehfil," a high-quality community for students.

**Goal:** Classify the user's input into one of three silos:

1. **ACADEMIC:** Study strategies, specific subjects, exam prep, or career guidance.  
2. **REFLECTIVE:** Deep thoughts, sharing stress, mental health vents, or seeking support.  
3. **BULLSHIT:** Low-effort noise, spam, abuse, or irrelevant gibberish.

**Output Requirement:** Respond ONLY with a JSON object:

{  
  "category": "ACADEMIC" | "REFLECTIVE" | "BULLSHIT",  
  "reasoning": "1-sentence explanation",  
  "is\_toxic": boolean,  
  "suggested\_tags": \["tag1", "tag2"\]  
}

## **4\. Shadow-Banning & Automated Purging**

To keep the database lean without manual daily management:

* **The Black Hole Mechanism:** For shadow-banned users, the backend returns a "Success" response. The user sees their post on their screen, but it is never broadcasted or written to permanent storage.  
* **The Volatile Storage:** Use a **TTL (Time To Live)** index in your DB. Any post marked as BULLSHIT should have an expires\_at timestamp. Most databases (MongoDB, Redis, Postgres) can auto-delete these records.  
* **Strike Logic:**  
  * **Strike 1 & 2:** Return warning to user ("Thought doesn't meet community guidelines").  
  * **Strike 3:** Silently flip is\_shadow\_banned \= true.

## **5\. UI Silo Strategy (Frontend)**

In your Mehfil.tsx, implement **Room Switching** to separate context.

### **The "Room" Logic**

* **Default View:** ACADEMIC (to set a productive tone).  
* **Filtering:** Modify your fetch query: WHERE category \= activeRoom.  
* **Visual Distinction:**  
  * **Academic Hall:** Teal/Slate theme. Placeholder: *"Ask a question or share a study insight..."*  
  * **Zen Corner:** Indigo/Purple theme. Placeholder: *"How are you feeling? Share what's on your mind..."*

## **6\. Implementation Checklist**

1. \[ \] **Update Database:** Add the category, strike, and shadow-ban fields.  
2. \[ \] **Groq Integration:** Set up the API client using your Groq key and Llama-3-8B.  
3. \[ \] **Socket.io Interceptor:** Add logic to analyze content before calling socket.broadcast.  
4. \[ \] **Tab Bar UI:** Add buttons in Mehfil.tsx to toggle between Academic and Zen views.  
5. \[ \] **Auto-Purge:** Configure your DB to auto-delete records with an expired expires\_at date.