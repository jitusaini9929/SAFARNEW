# Nistha Sanctuary Rewards - Implementation Tables

## 1. AURA TITLES (Dynamic/Temporary)

| Perk ID | Title Name | Icon Suggestion | Criteria Logic | Rolling Window | Data Source | Display Priority |
|---------|------------|----------------|----------------|----------------|-------------|-----------------|
| A001 | The Resilient | ⚡ | `login_streak >= 7` | 7 days | `streaks.login_streak` | High |
| A002 | The Unwavering | 👑 | `login_streak >= 30` | 30 days | `streaks.login_streak` | Highest |
| A003 | Midnight Scholar | 🌙 | 70% of activity between 22:00-02:00 | 7 days | `user_activity.created_at` timestamps | Medium |
| A004 | Early Riser | 🌅 | 70% of activity between 05:00-09:00 | 7 days | `user_activity.created_at` timestamps | Medium |
| A005 | The Balanced | 🧠 | `check_in_streak >= 7` | 7 days | `streaks.check_in_streak` | High |
| A006 | Goal Guardian | 🎯 | `goal_completion_streak >= 7` | 7 days | `streaks.goal_completion_streak` | High |
| A007 | The Steadfast | 💎 | All 3 streaks (login, check-in, goal) >= 7 simultaneously | 7 days | All `streaks` columns | Highest |
| A008 | Deep Work Monk | 🧘 | 5+ completed focus sessions in last 7 days | 7 days | `focus_sessions` (completed=true) | Medium |

**Notes:**
- These titles are **recalculated daily** and can be lost if streaks break
- Users can have multiple active titles simultaneously
- Higher priority titles should be displayed more prominently

---

## 2. ECHOES/ARTIFACTS (Permanent Achievements)

### 2A. Focus Time Progression

| Perk ID | Badge Name | Tier | Rarity | Total Hours Required | Color Code | Icon |
|---------|-----------|------|--------|---------------------|------------|------|
| E001 | Focus Initiate | 1 | Common | 10 | #6B7280 (Gray) | 🕐 |
| E002 | Focus Adept | 2 | Uncommon | 50 | #10B981 (Green) | 🕑 |
| E003 | Deep Work Disciple | 3 | Rare | 100 | #3B82F6 (Blue) | 🕒 |
| E004 | Concentration Master | 4 | Epic | 250 | #8B5CF6 (Purple) | 🕓 |
| E005 | Flow State Master | 5 | Legendary | 500 | #F59E0B (Gold) | 👁️ |

**SQL Query:**
```sql
SELECT SUM(duration_minutes) / 60 as total_hours 
FROM focus_sessions 
WHERE user_id = ? AND completed = true;
```

---

### 2B. Goal Achievement Progression

| Perk ID | Badge Name | Tier | Rarity | Goals Required | Color Code | Icon |
|---------|-----------|------|--------|---------------|------------|------|
| E006 | Goal Starter | 1 | Common | 10 | #6B7280 | 🎯 |
| E007 | Goal Achiever | 2 | Uncommon | 100 | #10B981 | 🏹 |
| E008 | Goal Crusher | 3 | Rare | 1,000 | #3B82F6 | 💪 |
| E009 | Vision Architect | 4 | Epic | 5,000 | #8B5CF6 | 🏛️ |
| E010 | Dream Weaver | 5 | Legendary | 10,000 | #F59E0B | ✨ |

**Sincerity Filter Applied:**
```sql
SELECT COUNT(*) FROM goals 
WHERE user_id = ? 
AND completed = true 
AND TIMESTAMPDIFF(MINUTE, created_at, completed_at) >= 5;
```

---

### 2C. Emotional Intelligence Progression

| Perk ID | Badge Name | Tier | Rarity | Requirements | Color Code | Icon |
|---------|-----------|------|--------|-------------|------------|------|
| E011 | Self-Aware Seeker | 1 | Common | 30 mood check-ins | #6B7280 | 💭 |
| E012 | Emotional Navigator | 2 | Uncommon | 100 mood check-ins | #10B981 | 🧭 |
| E013 | Mindful Observer | 3 | Rare | 365 mood check-ins (1 year) | #3B82F6 | 👁️ |
| E014 | Inner Voice Listener | 3 | Rare | 50 journal entries | #3B82F6 | 📓 |
| E015 | Reflection Master | 4 | Epic | 200 journal entries | #8B5CF6 | 📚 |
| E016 | Soul Cartographer | 5 | Legendary | 500 journal entries + 1000 check-ins | #F59E0B | 🗺️ |

---

## 3. SEASONAL & LIMITED PERKS

| Perk ID | Badge Name | Type | Criteria | Availability Window | Max Recipients | Icon |
|---------|-----------|------|----------|-------------------|----------------|------|
| S001 | Season of Grit Survivor | Monthly | 80%+ daily activity during January 2026 | Jan 1-31, 2026 | Unlimited | 🔥 |
| S002 | Season of Clarity Pioneer | Monthly | 80%+ daily activity during February 2026 | Feb 1-28, 2026 | Unlimited | 🌟 |
| S003 | Foundation Builder | One-Time | Joined during beta (before official launch) | Pre-Launch Only | Unlimited | 🏗️ |
| S004 | Clarity Pioneer | Quantity | First user to achieve 30-day streak | First only | 1 | 👑 |
| S005 | Elite 100 | Quantity | Top 100 users by 30-day streak | Rolling | 100 | 💯 |
| S006 | Seasonal Champion | Quarterly | Top 1% by activity points in quarter | Each quarter | ~1% of users | 🏆 |
| S007 | New Year's Resolve | Annual | Maintain streak through Jan 1-7 | Jan 1-7 yearly | Unlimited | 🎊 |
| S008 | Year-End Reflection | Annual | 10+ journal entries in Dec | December yearly | Unlimited | 📖 |

**Activity Score Formula:**
```
Activity Score = (login_days × 1) + (goals_completed × 2) + (focus_hours × 5) + (journal_entries × 3)
```

---

## 4. DATABASE SCHEMA

### Table: `perk_definitions`

```sql
CREATE TABLE perk_definitions (
    id VARCHAR(10) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    type ENUM('aura', 'echo', 'seasonal') NOT NULL,
    category ENUM('focus', 'goals', 'mood', 'streak', 'special') NOT NULL,
    rarity ENUM('common', 'uncommon', 'rare', 'epic', 'legendary') NULL,
    tier INT NULL,
    icon VARCHAR(10),
    color_code VARCHAR(20),
    criteria_json JSON NOT NULL,
    is_limited BOOLEAN DEFAULT false,
    limited_type ENUM('time', 'quantity', NULL),
    available_from DATE NULL,
    available_until DATE NULL,
    max_recipients INT NULL,
    display_priority INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Example Criteria JSON:**
```json
{
  "type": "streak",
  "field": "login_streak",
  "operator": ">=",
  "value": 7,
  "rolling_window_days": 7
}
```

---

### Table: `user_perks`

```sql
CREATE TABLE user_perks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    perk_id VARCHAR(10) NOT NULL,
    acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    lost_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (perk_id) REFERENCES perk_definitions(id),
    UNIQUE KEY unique_user_perk (user_id, perk_id)
);
```

---

## 5. SINCERITY SCORING RULES

| Rule ID | Violation Type | Detection Logic | Penalty |
|---------|---------------|-----------------|---------|
| SIN-01 | Rapid Goal Spam | 5+ goals completed within 5 seconds | No perk XP for those goals |
| SIN-02 | Instant Completion | Goal completed < 5 min after creation | Goal doesn't count toward perks |
| SIN-03 | Batch Gaming | >3 goals completed within 10 min window | Only first 3 count |
| SIN-04 | Abandoned Focus | Focus session ended <80% of planned duration | Session doesn't count |
| SIN-05 | Empty Journal | Journal entry <20 characters | Entry doesn't count toward perks |

**Implementation:**
```javascript
function isGoalSincere(goal) {
    const timeActive = goal.completed_at - goal.created_at;
    return timeActive >= 5 * 60 * 1000; // 5 minutes in ms
}
```

---

## 6. DISPLAY RECOMMENDATIONS

### Where to Show Perks:

1. **Profile Page** (Primary)
   - Active Aura titles (max 3 displayed)
   - Top 6 Echo badges by rarity
   - All seasonal perks (with "LIMITED" badge)

2. **Dashboard Welcome**
   - Currently active highest-priority Aura title
   - "Just earned!" notification for new perks

3. **Perks Collection Page**
   - Full gallery view
   - Progress bars for next milestone
   - Locked/unavailable perks shown as silhouettes

4. **Achievement Toast Notifications**
   - Pop-up when perk is earned
   - Celebratory animation

---

## 7. IMPLEMENTATION PHASES

### Phase 1: Foundation (Week 1-2)
- [ ] Create database tables
- [ ] Implement basic `checkPerks()` function
- [ ] Add perk definitions to database
- [ ] Build sincerity scoring logic

### Phase 2: Core Features (Week 3-4)
- [ ] Aura titles (dynamic checking)
- [ ] Echo badges (milestone tracking)
- [ ] User perks display on profile

### Phase 3: Advanced (Week 5-6)
- [ ] Seasonal perks system
- [ ] Limited quantity tracking
- [ ] Perks collection gallery
- [ ] Achievement notifications

### Phase 4: Polish (Week 7-8)
- [ ] Badge/icon design
- [ ] Animations and celebrations
- [ ] Analytics dashboard
- [ ] User testing and refinement

---

## 8. SAMPLE PERK AWARD TRIGGERS

```javascript
// Called after goal completion
async function onGoalComplete(userId, goalId) {
    if (!isGoalSincere(goal)) return;
    
    await checkPerks(userId, 'goal_complete');
}

// Called after focus session
async function onFocusSessionEnd(userId, sessionId) {
    if (!isFocusSessionValid(session)) return;
    
    await checkPerks(userId, 'focus_complete');
}

// Daily cron job
async function dailyPerkCheck() {
    const activeUsers = await getActiveUsers();
    
    for (const user of activeUsers) {
        await checkPerks(user.id, 'daily_check');
    }
}
```

---

## 9. NEXT STEPS / DECISIONS NEEDED

1. **Sincerity Metric**: Approve the 5-minute minimum rule? Adjust threshold?
2. **Limited Tags**: Prefer time-based (seasons) or quantity-based (first 100)?
3. **Visibility**: Confirm display locations (profile, dashboard, dedicated page)?
4. **Icons**: Use emoji or custom SVG icons?
5. **Notifications**: In-app only or also email for milestone achievements?
6. **Public Display**: Should perks be visible to other users on profiles?

---

**Total Perks Defined:** 34
- Aura Titles: 8
- Echo Badges: 18
- Seasonal/Limited: 8