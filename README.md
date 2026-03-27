# SAFAR (सफ़र) 🌿

**SAFAR** is a holistic wellness and productivity ecosystem designed to help individuals navigate the complexities of student life, mental health, and personal growth. Rooted in the philosophy of **"The Scenic Path,"** SAFAR transforms the digital experience into a continuous landscape of self-discovery, focus, and community support.

---

## 🎨 Design Philosophy: "The Scenic Path"

Unlike rigid, "boxed-in" corporate interfaces, SAFAR treats the digital viewport as a peaceful, winding journey.

- **Editorial Aesthetics**: Leveraging tight geometric typography (**Manrope**) for headlines and high-legibility sans-serif (**Inter**) for body text to create a high-end magazine feel.
- **Tonal Layering**: Depth is achieved through shifts in background tones rather than heavy borders. **1px solid lines are strictly prohibited** for sectioning—boundaries are defined by "islands of content" and physical layer tiers.
- **Glassmorphism**: Floating elements (navigation, modals) utilize semi-transparent surfaces with backdrop-blur effects to maintain a sense of lightness.
- **The "Solar" Accent**: A warm sun-yellow is used sparingly as a high-contrast beacon for critical actions, mimicking a guiding light on the horizon.

---

## 🚀 Key Features

### 🏮 Mehfil (The Real-Time Community)
A safe space for students to share, reflect, and support one another.
- **Intelligent Silos**: Posts (Thoughts) are automatically classified into rooms:
    - **ACADEMIC**: Study strategies, exam prep, and career guidance.
    - **REFLECTIVE**: Deep thoughts, personal stories, and emotional struggles.
- **AI-Powered Mentorship**: Uses **Groq (Llama 3.1)** for real-time moderation, ensuring the community remains supportive while identifying "BULLSHIT" (toxic content) and applying spam strikes.
- **Digital Connections**:
    - **Sandesh**: Meaningful comment threads.
    - **Connecting**: DM requests with time-limited rooms to encourage genuine, focused interactions.

### 🍃 Nishtha (The Wellness Suite)
Holistic tools to track and nurture your mental well-being.
- **Daily Check-In**: Track your mood and intensity to see patterns over time.
- **Personalized Suggestions**: A dynamic engine that offers:
    - **SOS Exercises**: Quick 4-7-8 breathing or grounding techniques when you feel low.
    - **Daily Challenges**: Small, actionable goals (e.g., "Digital Detox Hour").
    - **Mindful Moments**: Curated wisdom to ground your day.
- **Journaling**: A private space for uninhibited reflection.

### ⏳ Study (Deep Work & Focus)
Turn focus into a measurable journey.
- **Focus Sessions**: Logged sessions with break tracking and associated goals. Includes pre/post study mood tracking to see how work affects your state of mind.
- **Flow Stats**: Deep analytics on weekly focus hours, hourly distribution, and daily progress.
- **Focus Overlay**: A persistent UI element that guides you through your deep work blocks.

### 🧘 Meditation
Immersive experiences to help you find your center.
- **Interactive Visualizers**: Tools like the Breathing Visualizer to guide your breathwork practice.
- **Curated Sessions**: Editorial-style meditation experiences designed for peace and clarity.
- **Seamless Support**: Integrated payments via **Razorpay** for premium content or support.

### 🏆 Gamification & Streaks
Stay motivated with visual cues for consistency.
- **Multi-Streaks**: Tracking logins, daily check-ins, and goal completions.
- **Achievements**: Unlock symbolic badges as you progress on your "Scenic Path."

---

## 🛠️ Tech Stack

### Core Technologies
- **Frontend**: React 18 (Vite), TypeScript, Tailwind CSS, Zustand, TanStack Query.
- **Backend**: Express 5 (Runtime: Node.js/Nixpacks).
- **Real-Time**: Socket.IO with **Redis** for persistence and scalability.
- **Database**: MongoDB (Storage), Redis (Token management & caching).

### Essential Services
- **Auth**: JWT (Access + Refresh tokens) with secure middleware.
- **Payments**: Razorpay Integration.
- **AI**: Groq (Llama 3.1) for Community Moderation.
- **i18n**: Multi-language support (**English** & **Hindi**).

---

## 📥 Installation & Setup

### 1. Prerequisites
Ensure you have **Node.js** and **npm** installed. A running **MongoDB** instance and a **Redis** server are required.

### 2. Implementation
```bash
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env` and configure the following:
- `MONGODB_URI`: Your MongoDB connection string.
- `REDIS_URL`: Your Redis connection string.
- `JWT_ACCESS_SECRET` & `JWT_REFRESH_SECRET`: Secure keys for token signing.
- `GROQ_API_KEY`: For community AI moderation.
- `RAZORPAY_KEY_ID`: For meditation payments.

### 4. Run Development Server
```bash
npm run dev
```
The app will be available at `http://localhost:8080`.

---

## 🏗️ Project Structure
```txt
client/      # React SPA (Pages, Components, Contexts, Stores)
server/      # Express API & Socket.IO Handlers
shared/      # Common types and contracts
dist/        # Production build output
```

---

*“Safar – It's not about the destination, it's about the Scenic Path.”*
