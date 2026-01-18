import { Router, Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

// ========================================
// ACHIEVEMENT DEFINITIONS (Simplified)
// ========================================

const ACHIEVEMENT_DEFINITIONS = [
    // FOCUS BADGES - Based on total focus hours
    { id: 'F001', name: 'Focus Initiate', type: 'badge', category: 'focus', tier: 1, criteria_json: JSON.stringify({ field: 'total_focus_hours', operator: '>=', value: 10 }), display_priority: 10 },
    { id: 'F002', name: 'Focus Adept', type: 'badge', category: 'focus', tier: 2, criteria_json: JSON.stringify({ field: 'total_focus_hours', operator: '>=', value: 50 }), display_priority: 20 },
    { id: 'F003', name: 'Deep Work Disciple', type: 'badge', category: 'focus', tier: 3, criteria_json: JSON.stringify({ field: 'total_focus_hours', operator: '>=', value: 100 }), display_priority: 30 },
    { id: 'F004', name: 'Concentration Master', type: 'badge', category: 'focus', tier: 4, criteria_json: JSON.stringify({ field: 'total_focus_hours', operator: '>=', value: 250 }), display_priority: 40 },
    { id: 'F005', name: 'Flow State Legend', type: 'badge', category: 'focus', tier: 5, criteria_json: JSON.stringify({ field: 'total_focus_hours', operator: '>=', value: 500 }), display_priority: 50 },

    // GOAL BADGES - Based on goals completed
    { id: 'G001', name: 'Goal Starter', type: 'badge', category: 'goals', tier: 1, criteria_json: JSON.stringify({ field: 'goals_completed', operator: '>=', value: 10 }), display_priority: 10 },
    { id: 'G002', name: 'Goal Achiever', type: 'badge', category: 'goals', tier: 2, criteria_json: JSON.stringify({ field: 'goals_completed', operator: '>=', value: 50 }), display_priority: 20 },
    { id: 'G003', name: 'Goal Crusher', type: 'badge', category: 'goals', tier: 3, criteria_json: JSON.stringify({ field: 'goals_completed', operator: '>=', value: 100 }), display_priority: 30 },
    { id: 'G004', name: 'Vision Architect', type: 'badge', category: 'goals', tier: 4, criteria_json: JSON.stringify({ field: 'goals_completed', operator: '>=', value: 500 }), display_priority: 40 },
    { id: 'G005', name: 'Dream Weaver', type: 'badge', category: 'goals', tier: 5, criteria_json: JSON.stringify({ field: 'goals_completed', operator: '>=', value: 1000 }), display_priority: 50 },
];

// ========================================
// EMOTIONAL MILESTONE TITLES (On-demand)
// ========================================

const EMOTIONAL_TITLES = [
    { id: 'ET001', name: 'Showed Up Tired', description: 'Checked in with low energy but still completed goals', trigger: 'low_mood_with_goals' },
    { id: 'ET002', name: 'Did It Anyway', description: 'Multiple low mood days with high focus hours', trigger: 'low_mood_high_focus' },
    { id: 'ET003', name: 'Solid Comeback', description: 'Missed your streak but came back stronger', trigger: 'streak_recovery' },
    { id: 'ET004', name: 'Survived Bad Week', description: 'Kept working despite a challenging week', trigger: 'bad_week_survived' },
    { id: 'ET005', name: 'Pushed Through Overwhelm', description: 'Stayed productive during stressful times', trigger: 'overwhelm_pushed' },
    { id: 'ET006', name: 'A Jolly Week', description: 'Consistently positive mood throughout the week', trigger: 'jolly_week' },
];

// ========================================
// DATA FETCHING
// ========================================

async function getUserStats(userId: string) {
    // Total focus hours (completed sessions only)
    const focusResult = await db.execute({
        sql: 'SELECT COALESCE(SUM(duration_minutes), 0) as total FROM focus_sessions WHERE user_id = ? AND completed = 1',
        args: [userId]
    });
    const totalFocusHours = ((focusResult.rows[0] as any).total || 0) / 60;

    // Total goals completed
    const goalsResult = await db.execute({
        sql: 'SELECT COUNT(*) as count FROM goals WHERE user_id = ? AND completed = 1',
        args: [userId]
    });
    const goalsCompleted = (goalsResult.rows[0] as any).count || 0;

    return {
        total_focus_hours: totalFocusHours,
        goals_completed: goalsCompleted,
    };
}

async function getWeeklyMoodData(userId: string) {
    // Get moods from last 7 days
    const moodsResult = await db.execute({
        sql: `SELECT mood, intensity, notes, timestamp FROM moods 
              WHERE user_id = ? AND timestamp >= datetime('now', '-7 days')
              ORDER BY timestamp DESC`,
        args: [userId]
    });
    const moods = moodsResult.rows as any[];

    // Calculate average mood intensity
    const avgMood = moods.length > 0
        ? moods.reduce((sum, m) => sum + m.intensity, 0) / moods.length
        : 3;

    // Count low mood days (intensity <= 2)
    const lowMoodDays = moods.filter(m => m.intensity <= 2).length;

    // Get focus hours this week
    const focusResult = await db.execute({
        sql: `SELECT COALESCE(SUM(duration_minutes), 0) as total FROM focus_sessions 
              WHERE user_id = ? AND completed = 1 AND completed_at >= datetime('now', '-7 days')`,
        args: [userId]
    });
    const weeklyFocusHours = ((focusResult.rows[0] as any).total || 0) / 60;

    // Get goals completed this week
    const goalsResult = await db.execute({
        sql: `SELECT COUNT(*) as count FROM goals 
              WHERE user_id = ? AND completed = 1 AND completed_at >= datetime('now', '-7 days')`,
        args: [userId]
    });
    const weeklyGoals = (goalsResult.rows[0] as any).count || 0;

    // Check for streak recovery (simplified: check if user logged in today after missing yesterday)
    const streaksResult = await db.execute({
        sql: 'SELECT login_streak, check_in_streak, goal_completion_streak FROM streaks WHERE user_id = ?',
        args: [userId]
    });
    const streaks = streaksResult.rows[0] as any || {};

    // Check journal for struggle keywords
    const journalResult = await db.execute({
        sql: `SELECT content FROM journal 
              WHERE user_id = ? AND timestamp >= datetime('now', '-7 days')`,
        args: [userId]
    });
    const struggleKeywords = ['stress', 'overwhelm', 'tired', 'exhausted', 'burnout', 'sad', 'anxious', 'difficult'];
    const hasStruggleJournal = (journalResult.rows as any[]).some(j =>
        struggleKeywords.some(kw => j.content.toLowerCase().includes(kw))
    );

    return {
        avgMood,
        lowMoodDays,
        weeklyFocusHours,
        weeklyGoals,
        checkIns: moods.length,
        hasStruggleJournal,
        streakRecovered: streaks.login_streak >= 2, // Simplified check
    };
}

// ========================================
// CORE ACHIEVEMENT LOGIC
// ========================================

function evaluateCriteria(criteria: any, stats: any): boolean {
    const { field, operator, value } = criteria;
    const statValue = stats[field];
    if (statValue === undefined) return false;

    switch (operator) {
        case '>=': return statValue >= value;
        case '>': return statValue > value;
        case '==': return statValue === value;
        case '<=': return statValue <= value;
        case '<': return statValue < value;
        default: return false;
    }
}

export async function checkAchievements(userId: string): Promise<{ awarded: string[], lost: string[] }> {
    const awarded: string[] = [];
    const lost: string[] = [];

    const stats = await getUserStats(userId);

    // Get user's current achievements
    const currentResult = await db.execute({
        sql: 'SELECT achievement_id, is_active FROM user_achievements WHERE user_id = ?',
        args: [userId]
    });
    const currentAchievements = new Map((currentResult.rows as any[]).map(a => [a.achievement_id, a.is_active]));

    for (const achievement of ACHIEVEMENT_DEFINITIONS) {
        const criteria = JSON.parse(achievement.criteria_json);
        const qualifies = evaluateCriteria(criteria, stats);
        const hasAchievement = currentAchievements.has(achievement.id);

        if (qualifies && !hasAchievement) {
            // Award new achievement
            await db.execute({
                sql: `INSERT OR IGNORE INTO user_achievements (id, user_id, achievement_id, is_active) VALUES (?, ?, ?, 1)`,
                args: [uuidv4(), userId, achievement.id]
            });
            awarded.push(achievement.name);
            console.log(`🏆 [ACHIEVEMENTS] Awarded "${achievement.name}" to user ${userId}`);
        }
    }

    return { awarded, lost };
}

// Evaluate emotional milestones on demand
async function evaluateEmotionalMilestone(userId: string): Promise<{ title: string | null, description: string | null }> {
    const weekData = await getWeeklyMoodData(userId);

    // Priority order as per user spec
    if (weekData.streakRecovered && weekData.weeklyGoals > 0) {
        return { title: 'Solid Comeback', description: 'You missed your streak but came back stronger!' };
    }

    if (weekData.avgMood < 2.5 && weekData.weeklyGoals > 0) {
        return { title: 'Survived Bad Week', description: 'You kept working despite a challenging week.' };
    }

    if (weekData.lowMoodDays >= 3 && weekData.weeklyFocusHours >= 5) {
        return { title: 'Did It Anyway', description: 'Multiple tough days, but you still focused.' };
    }

    if (weekData.lowMoodDays >= 1 && weekData.weeklyGoals >= 3) {
        return { title: 'Showed Up Tired', description: 'You checked in tired but still got things done.' };
    }

    if (weekData.hasStruggleJournal && weekData.weeklyFocusHours >= 3) {
        return { title: 'Pushed Through Overwhelm', description: 'Your journal shows struggle, but you persisted!' };
    }

    if (weekData.avgMood >= 4.0 && weekData.checkIns >= 5) {
        return { title: 'A Jolly Week', description: 'Consistently positive vibes this week!' };
    }

    return { title: null, description: null };
}

// ========================================
// API ROUTES
// ========================================

// Get all achievements for current user
router.get('/', requireAuth, async (req: any, res) => {
    try {
        const userId = req.session.userId;
        await checkAchievements(userId!);

        const result = await db.execute({
            sql: `SELECT ua.achievement_id, ua.acquired_at, ua.is_active,
                         ad.name, ad.type, ad.category, ad.rarity, ad.tier, ad.display_priority
                  FROM user_achievements ua
                  JOIN achievement_definitions ad ON ua.achievement_id = ad.id
                  WHERE ua.user_id = ? AND ua.is_active = 1
                  ORDER BY ad.display_priority DESC`,
            args: [userId]
        });

        res.json({
            achievements: result.rows,
            counts: {
                badges: (result.rows as any[]).filter(a => a.type === 'badge').length,
                titles: (result.rows as any[]).filter(a => a.type === 'title').length,
            }
        });
    } catch (error) {
        console.error('Get achievements error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get active title (for dashboard display)
router.get('/active-title', requireAuth, async (req: any, res) => {
    try {
        const userId = req.session.userId;

        const userResult = await db.execute({
            sql: `SELECT selected_achievement_id FROM users WHERE id = ?`,
            args: [userId]
        });

        const selectedId = (userResult.rows[0] as any)?.selected_achievement_id;

        if (selectedId) {
            const result = await db.execute({
                sql: `SELECT ad.name, ad.type, ad.rarity
                      FROM user_achievements ua
                      JOIN achievement_definitions ad ON ua.achievement_id = ad.id
                      WHERE ua.user_id = ? AND ua.achievement_id = ? AND ua.is_active = 1`,
                args: [userId, selectedId]
            });

            if (result.rows.length > 0) {
                const achievement = result.rows[0] as any;
                res.json({ title: achievement.name, type: achievement.type, selectedId });
                return;
            }
        }

        // Fall back to highest priority achievement
        const result = await db.execute({
            sql: `SELECT ad.name, ad.type, ad.rarity, ua.achievement_id
                  FROM user_achievements ua
                  JOIN achievement_definitions ad ON ua.achievement_id = ad.id
                  WHERE ua.user_id = ? AND ua.is_active = 1
                  ORDER BY ad.display_priority DESC
                  LIMIT 1`,
            args: [userId]
        });

        if (result.rows.length > 0) {
            const achievement = result.rows[0] as any;
            res.json({ title: achievement.name, type: achievement.type, selectedId: achievement.achievement_id });
        } else {
            res.json({ title: null });
        }
    } catch (error) {
        console.error('Get active title error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Select an achievement as active title
router.post('/select', requireAuth, async (req: any, res) => {
    try {
        const userId = req.session.userId;
        const { achievementId } = req.body;

        if (!achievementId) {
            await db.execute({
                sql: `UPDATE users SET selected_achievement_id = NULL WHERE id = ?`,
                args: [userId]
            });
            res.json({ message: 'Selection cleared', selectedId: null });
            return;
        }

        // Verify user has this achievement
        const userAchievement = await db.execute({
            sql: `SELECT ua.*, ad.name, ad.type FROM user_achievements ua 
                  JOIN achievement_definitions ad ON ua.achievement_id = ad.id
                  WHERE ua.user_id = ? AND ua.achievement_id = ? AND ua.is_active = 1`,
            args: [userId, achievementId]
        });

        if (userAchievement.rows.length === 0) {
            res.status(400).json({ message: 'You do not have this achievement' });
            return;
        }

        await db.execute({
            sql: `UPDATE users SET selected_achievement_id = ? WHERE id = ?`,
            args: [achievementId, userId]
        });

        const achievement = userAchievement.rows[0] as any;
        res.json({
            message: 'Title updated',
            selectedId: achievementId,
            title: achievement.name,
            type: achievement.type
        });
    } catch (error) {
        console.error('Select achievement error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get ALL achievement definitions with progress
router.get('/all', requireAuth, async (req: any, res) => {
    try {
        const userId = req.session?.userId;

        // IMPORTANT: Check and award achievements based on current stats FIRST
        await checkAchievements(userId);

        // Get all definitions
        const definitions = await db.execute({
            sql: `SELECT id, name, description, type, category, rarity, tier, criteria_json, display_priority 
                  FROM achievement_definitions ORDER BY category, display_priority DESC`,
            args: []
        });

        // Get user's stats
        const stats = await getUserStats(userId);

        // Get user's earned achievements
        const userAchievements = await db.execute({
            sql: `SELECT achievement_id FROM user_achievements WHERE user_id = ? AND is_active = 1`,
            args: [userId]
        });
        const earnedIds = new Set((userAchievements.rows as any[]).map(a => a.achievement_id));

        // Get holder counts
        const holderCounts = await db.execute({
            sql: `SELECT achievement_id, COUNT(*) as count FROM user_achievements WHERE is_active = 1 GROUP BY achievement_id`,
            args: []
        });
        const countsMap: Record<string, number> = {};
        for (const row of holderCounts.rows) {
            countsMap[(row as any).achievement_id] = (row as any).count;
        }

        // Build response
        const achievementsWithInfo = definitions.rows.map((achievement: any) => {
            const criteria = JSON.parse(achievement.criteria_json);
            let currentValue = 0;
            let targetValue = criteria.value || 0;
            let requirementText = '';

            switch (criteria.field) {
                case 'total_focus_hours':
                    currentValue = Math.floor(stats.total_focus_hours);
                    requirementText = `${targetValue} hours of focus time`;
                    break;
                case 'goals_completed':
                    currentValue = stats.goals_completed;
                    requirementText = `${targetValue} goals completed`;
                    break;
                default:
                    requirementText = 'Special achievement';
            }

            return {
                id: achievement.id,
                name: achievement.name,
                description: achievement.description,
                type: achievement.type,
                category: achievement.category,
                rarity: achievement.rarity,
                tier: achievement.tier,
                requirement: requirementText,
                holderCount: countsMap[achievement.id] || 0,
                earned: earnedIds.has(achievement.id),
                progress: targetValue > 0 ? Math.min(100, Math.round((currentValue / targetValue) * 100)) : 0,
                currentValue,
                targetValue
            };
        });

        res.json({ achievements: achievementsWithInfo });
    } catch (error) {
        console.error('Get all achievements error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Evaluate emotional milestone (on-demand)
router.post('/evaluate-week', requireAuth, async (req: any, res) => {
    try {
        const userId = req.session.userId;
        const milestone = await evaluateEmotionalMilestone(userId);

        if (milestone.title) {
            // Award the emotional title
            const titleDef = EMOTIONAL_TITLES.find(t => t.name === milestone.title);
            if (titleDef) {
                await db.execute({
                    sql: `INSERT OR REPLACE INTO user_achievements (id, user_id, achievement_id, is_active, acquired_at) 
                          VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)`,
                    args: [uuidv4(), userId, titleDef.id]
                });
                console.log(`🎭 [EMOTIONAL] Awarded "${milestone.title}" to user ${userId}`);
            }
        }

        res.json(milestone);
    } catch (error) {
        console.error('Evaluate week error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Seed achievement definitions (run once on startup)
export async function seedAchievementDefinitions() {
    // Seed badge definitions
    for (const achievement of ACHIEVEMENT_DEFINITIONS) {
        try {
            await db.execute({
                sql: `INSERT OR IGNORE INTO achievement_definitions 
                      (id, name, type, category, tier, criteria_json, display_priority) 
                      VALUES (?, ?, ?, ?, ?, ?, ?)`,
                args: [
                    achievement.id,
                    achievement.name,
                    achievement.type,
                    achievement.category,
                    achievement.tier,
                    achievement.criteria_json,
                    achievement.display_priority,
                ]
            });
        } catch (e) {
            // Ignore if already exists
        }
    }

    // Seed emotional titles
    for (const title of EMOTIONAL_TITLES) {
        try {
            await db.execute({
                sql: `INSERT OR IGNORE INTO achievement_definitions 
                      (id, name, description, type, category, rarity, tier, criteria_json, display_priority) 
                      VALUES (?, ?, ?, 'title', 'emotional', 'special', NULL, '{}', 60)`,
                args: [title.id, title.name, title.description]
            });
        } catch (e) {
            // Ignore if already exists
        }
    }

    console.log('✅ Achievement definitions seeded');
}

export const achievementRoutes = router;
