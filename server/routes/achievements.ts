import { Router, Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { collections } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

// ========================================
// ACHIEVEMENT DEFINITIONS (Simplified)
// ========================================

const ACHIEVEMENT_DEFINITIONS = [
    // ── GOAL COMPLETION BADGES ──────────────────────────────────
    { id: 'G001', name: 'First Steps', type: 'badge', category: 'goals', tier: 1, criteria_json: JSON.stringify({ field: 'goals_completed', operator: '>=', value: 1 }), display_priority: 15 },
    { id: 'G002', name: 'Goal Crusher', type: 'badge', category: 'goals', tier: 2, criteria_json: JSON.stringify({ field: 'goals_completed', operator: '>=', value: 50 }), display_priority: 25 },
    { id: 'G003', name: 'Unstoppable', type: 'badge', category: 'goals', tier: 3, criteria_json: JSON.stringify({ field: 'goals_completed', operator: '>=', value: 250 }), display_priority: 35 },
    { id: 'G004', name: 'The Centurion', type: 'badge', category: 'goals', tier: 4, criteria_json: JSON.stringify({ field: 'goals_completed', operator: '>=', value: 1000 }), display_priority: 45 },

    // ── FOCUS SESSION BADGES ────────────────────────────────────
    { id: 'F001', name: 'Deep Diver', type: 'badge', category: 'focus', tier: 1, criteria_json: JSON.stringify({ field: 'total_focus_hours', operator: '>=', value: 10 }), display_priority: 10 },
    { id: 'F002', name: 'Focus Master', type: 'badge', category: 'focus', tier: 2, criteria_json: JSON.stringify({ field: 'total_focus_hours', operator: '>=', value: 50 }), display_priority: 20 },
    { id: 'F003', name: 'Zone Warrior', type: 'badge', category: 'focus', tier: 3, criteria_json: JSON.stringify({ field: 'total_focus_hours', operator: '>=', value: 150 }), display_priority: 30 },
    { id: 'F004', name: 'Monk Mode', type: 'badge', category: 'focus', tier: 4, criteria_json: JSON.stringify({ field: 'total_focus_hours', operator: '>=', value: 300 }), display_priority: 40 },
    { id: 'F005', name: 'Legendary Focus', type: 'badge', category: 'focus', tier: 5, criteria_json: JSON.stringify({ field: 'total_focus_hours', operator: '>=', value: 1000 }), display_priority: 50 },

    // ── STREAK BADGES ───────────────────────────────────────────
    { id: 'S001', name: 'Streak Starter', type: 'badge', category: 'streak', tier: 1, criteria_json: JSON.stringify({ field: 'check_in_streak', operator: '>=', value: 3 }), display_priority: 17 },
    { id: 'S002', name: 'Iron Will', type: 'badge', category: 'streak', tier: 2, criteria_json: JSON.stringify({ field: 'check_in_streak', operator: '>=', value: 30 }), display_priority: 27 },

    // ── SPECIAL BADGE ───────────────────────────────────────────
    { id: 'ET006', name: 'Flow State', type: 'badge', category: 'emotional', tier: 1, criteria_json: JSON.stringify({ field: 'total_focus_hours', operator: '>=', value: 1 }), display_priority: 55 },

    // ── TITLES: GOAL COMPLETION ─────────────────────────────────
    { id: 'T005', name: 'Heavy Heart High Effort', type: 'title', category: 'goals', tier: 1, criteria_json: JSON.stringify({ field: 'goals_completed', operator: '>=', value: 10 }), display_priority: 60 },
    { id: 'T006', name: 'Mindset of a Warrior', type: 'title', category: 'goals', tier: 2, criteria_json: JSON.stringify({ field: 'goals_completed', operator: '>=', value: 100 }), display_priority: 61 },
    { id: 'T007', name: 'Exhaustion to Excellence', type: 'title', category: 'goals', tier: 3, criteria_json: JSON.stringify({ field: 'goals_completed', operator: '>=', value: 500 }), display_priority: 62 },
    { id: 'T008', name: 'High Energy Ace', type: 'title', category: 'goals', tier: 4, criteria_json: JSON.stringify({ field: 'goals_completed', operator: '>=', value: 2000 }), display_priority: 63 },

    // ── TITLES: LOGIN STREAKS ───────────────────────────────────
    { id: 'T001', name: 'Top Tier Energy', type: 'title', category: 'streak', tier: 1, criteria_json: JSON.stringify({ field: 'login_streak', operator: '>=', value: 1 }), display_priority: 70 },
    { id: 'T002', name: 'Restless Yet Relentless', type: 'title', category: 'streak', tier: 2, criteria_json: JSON.stringify({ field: 'login_streak', operator: '>=', value: 7 }), display_priority: 71 },
    { id: 'T003', name: 'Strong Comeback', type: 'title', category: 'streak', tier: 3, criteria_json: JSON.stringify({ field: 'login_streak', operator: '>=', value: 14 }), display_priority: 72 },
    { id: 'T004', name: 'Tired But Triumphant', type: 'title', category: 'streak', tier: 4, criteria_json: JSON.stringify({ field: 'login_streak', operator: '>=', value: 60 }), display_priority: 73 },
    { id: 'T009', name: 'Zen Master', type: 'title', category: 'streak', tier: 5, criteria_json: JSON.stringify({ field: 'login_streak', operator: '>=', value: 365 }), display_priority: 74 },
];

// ========================================
// EMOTIONAL MILESTONE TITLES (On-demand)
// ========================================

const EMOTIONAL_TITLES = [
    { id: 'ET001', name: 'Showed Up Tired', description: 'Checked in feeling low but still focused for over 30 minutes — true resilience', trigger: 'low_mood_focus' },
    { id: 'ET002', name: 'Did It Anyway', description: 'Faced multiple tough days this week but kept your focus hours high', trigger: 'low_mood_high_focus' },
    { id: 'ET003', name: 'Quiet Consistency', description: 'Showed up and focused for 5 or more days this week — quiet consistency wins', trigger: 'consistent_focus' },
    { id: 'ET004', name: 'Survived Bad Week', description: 'Kept focusing through a challenging week when your mood was low', trigger: 'bad_week_focus' },
    { id: 'ET005', name: 'Pushed Through Overwhelm', description: 'Your journal showed struggle, but you pushed through and stayed focused', trigger: 'overwhelm_focus' },
];

// ========================================
// DATA FETCHING
// ========================================

async function getUserStats(userId: string) {
    // Total focus hours (completed sessions only)
    const focusPipeline = [
        { $match: { user_id: userId, completed: true } },
        { $group: { _id: null, total: { $sum: '$duration_minutes' } } }
    ];
    const focusResult = await collections.focusSessions().aggregate(focusPipeline).toArray();
    const totalFocusHours = ((focusResult[0]?.total) || 0) / 60;

    // Total goals completed
    const goalsCompleted = await collections.goals().countDocuments({ user_id: userId, completed: true });

    // Get streaks
    const streak = await collections.streaks().findOne({ user_id: userId });
    const checkInStreak = streak?.check_in_streak || 0;
    const loginStreak = streak?.login_streak || 0;

    return {
        total_focus_hours: totalFocusHours,
        goals_completed: goalsCompleted,
        check_in_streak: checkInStreak,
        login_streak: loginStreak,
    };
}

async function getWeeklyMoodData(userId: string) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Get moods from last 7 days
    const moods = await collections.moods()
        .find({ user_id: userId, timestamp: { $gte: sevenDaysAgo } })
        .sort({ timestamp: -1 })
        .toArray();

    const avgMood = moods.length > 0
        ? moods.reduce((sum, m) => sum + m.intensity, 0) / moods.length
        : 3;

    const lowMoodDays = moods.filter(m => m.intensity <= 2).length;

    // Weekly focus hours
    const focusPipeline = [
        { $match: { user_id: userId, completed: true, completed_at: { $gte: sevenDaysAgo } } },
        { $group: { _id: null, total: { $sum: '$duration_minutes' } } }
    ];
    const focusResult = await collections.focusSessions().aggregate(focusPipeline).toArray();
    const weeklyFocusHours = ((focusResult[0]?.total) || 0) / 60;

    // Goals completed this week
    const weeklyGoals = await collections.goals().countDocuments({
        user_id: userId, completed: true, completed_at: { $gte: sevenDaysAgo }
    });

    // Streaks
    const streaks = await collections.streaks().findOne({ user_id: userId }) || {};

    // Check journal for struggle keywords
    const journalEntries = await collections.journal()
        .find({ user_id: userId, timestamp: { $gte: sevenDaysAgo } })
        .toArray();
    const struggleKeywords = ['stress', 'overwhelm', 'tired', 'exhausted', 'burnout', 'sad', 'anxious', 'difficult'];
    const hasStruggleJournal = journalEntries.some(j =>
        struggleKeywords.some(kw => j.content.toLowerCase().includes(kw))
    );

    return {
        avgMood,
        lowMoodDays,
        weeklyFocusHours,
        weeklyGoals,
        checkIns: moods.length,
        hasStruggleJournal,
        streakRecovered: (streaks as any).login_streak >= 2,
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
    const currentRows = await collections.userAchievements()
        .find({ user_id: userId })
        .toArray();
    const currentAchievements = new Map(currentRows.map(a => [a.achievement_id, a.is_active]));

    for (const achievement of ACHIEVEMENT_DEFINITIONS) {
        const criteria = JSON.parse(achievement.criteria_json);
        const qualifies = evaluateCriteria(criteria, stats);
        const hasAchievement = currentAchievements.has(achievement.id);

        if (qualifies && !hasAchievement) {
            await collections.userAchievements().updateOne(
                { user_id: userId, achievement_id: achievement.id },
                { $setOnInsert: { id: uuidv4(), user_id: userId, achievement_id: achievement.id, is_active: true, acquired_at: new Date() } },
                { upsert: true }
            );
            awarded.push(achievement.name);
            console.log(`🏆 [ACHIEVEMENTS] Awarded "${achievement.name}" to user ${userId}`);
        }
    }

    return { awarded, lost };
}

// Evaluate emotional milestones on demand
async function evaluateEmotionalMilestone(userId: string): Promise<{ title: string | null, description: string | null }> {
    const weekData = await getWeeklyMoodData(userId);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Get max single session duration
    const maxResult = await collections.focusSessions()
        .find({ user_id: userId, completed: true, completed_at: { $gte: sevenDaysAgo } })
        .sort({ duration_minutes: -1 })
        .limit(1)
        .toArray();
    const maxSessionMinutes = maxResult[0]?.duration_minutes || 0;

    // Check for "Quiet Consistency" (focused on 5+ distinct days)
    const distinctDays = await collections.focusSessions().aggregate([
        { $match: { user_id: userId, completed: true, completed_at: { $gte: sevenDaysAgo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$completed_at' } } } },
        { $count: 'days' }
    ]).toArray();
    const focusDays = distinctDays[0]?.days || 0;

    // Priority order
    if (weekData.avgMood < 2.5 && weekData.weeklyFocusHours > 5) {
        return { title: 'Survived Bad Week', description: 'You kept focusing through a challenging week when your mood was low.' };
    }
    if (maxSessionMinutes >= 120) {
        return { title: 'Flow State', description: 'You achieved a massive 2+ hour deep work session!' };
    }
    if (weekData.lowMoodDays >= 3 && weekData.weeklyFocusHours >= 5) {
        return { title: 'Did It Anyway', description: 'Multiple tough days, but you still showed up and focused.' };
    }
    if (focusDays >= 5) {
        return { title: 'Quiet Consistency', description: 'You showed up and focused for 5+ days this week. Quiet consistency wins.' };
    }
    if (weekData.lowMoodDays >= 1 && weekData.weeklyFocusHours >= 1) {
        return { title: 'Showed Up Tired', description: 'You checked in feeling low but still focused — true resilience.' };
    }
    if (weekData.hasStruggleJournal && weekData.weeklyFocusHours >= 2) {
        return { title: 'Pushed Through Overwhelm', description: 'Your journal showed struggle, but you pushed through and stayed focused!' };
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

        // Get user achievements with definitions via application-level join
        const userAchievements = await collections.userAchievements()
            .find({ user_id: userId, is_active: true })
            .toArray();

        const achievementIds = userAchievements.map(a => a.achievement_id);
        const definitions = await collections.achievementDefinitions()
            .find({ id: { $in: achievementIds } })
            .toArray();

        const defMap = new Map(definitions.map(d => [d.id, d]));
        const achievements = userAchievements
            .map(ua => {
                const def = defMap.get(ua.achievement_id);
                if (!def) return null;
                return {
                    achievement_id: ua.achievement_id,
                    acquired_at: ua.acquired_at,
                    is_active: ua.is_active,
                    name: def.name,
                    type: def.type,
                    category: def.category,
                    rarity: def.rarity,
                    tier: def.tier,
                    display_priority: def.display_priority,
                };
            })
            .filter(Boolean)
            .sort((a: any, b: any) => (b.display_priority || 0) - (a.display_priority || 0));

        res.json({
            achievements,
            counts: {
                badges: achievements.filter((a: any) => a.type === 'badge').length,
                titles: achievements.filter((a: any) => a.type === 'title').length,
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

        const user = await collections.users().findOne({ id: userId }, { projection: { selected_achievement_id: 1 } });
        const selectedId = user?.selected_achievement_id;

        if (selectedId) {
            const ua = await collections.userAchievements().findOne({ user_id: userId, achievement_id: selectedId, is_active: true });
            if (ua) {
                const def = await collections.achievementDefinitions().findOne({ id: selectedId });
                if (def) {
                    res.json({ title: def.name, type: def.type, selectedId });
                    return;
                }
            }
        }

        // Fall back to highest priority
        const allUa = await collections.userAchievements()
            .find({ user_id: userId, is_active: true })
            .toArray();

        if (allUa.length > 0) {
            const ids = allUa.map(a => a.achievement_id);
            const defs = await collections.achievementDefinitions()
                .find({ id: { $in: ids } })
                .sort({ display_priority: -1 })
                .limit(1)
                .toArray();

            if (defs.length > 0) {
                res.json({ title: defs[0].name, type: defs[0].type, selectedId: defs[0].id });
                return;
            }
        }

        res.json({ title: null });
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
            await collections.users().updateOne({ id: userId }, { $set: { selected_achievement_id: null } });
            res.json({ message: 'Selection cleared', selectedId: null });
            return;
        }

        // Verify user has this achievement
        const ua = await collections.userAchievements().findOne({ user_id: userId, achievement_id: achievementId, is_active: true });
        if (!ua) {
            res.status(400).json({ message: 'You do not have this achievement' });
            return;
        }

        const def = await collections.achievementDefinitions().findOne({ id: achievementId });
        await collections.users().updateOne({ id: userId }, { $set: { selected_achievement_id: achievementId } });

        res.json({
            message: 'Title updated',
            selectedId: achievementId,
            title: def?.name,
            type: def?.type
        });
    } catch (error) {
        console.error('Select achievement error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// DEBUG route
router.get('/debug/duplicates', async (req, res) => {
    try {
        const pipeline = [
            { $group: { _id: '$name', count: { $sum: 1 }, ids: { $push: '$id' } } },
            { $match: { count: { $gt: 1 } } }
        ];
        const result = await collections.achievementDefinitions().aggregate(pipeline).toArray();
        res.json(result);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Get ALL achievement definitions with progress
router.get('/all', requireAuth, async (req: any, res) => {
    try {
        const userId = req.session?.userId;
        await checkAchievements(userId);

        // Get all definitions
        const definitions = await collections.achievementDefinitions()
            .find({})
            .sort({ category: 1, display_priority: -1 })
            .toArray();

        const stats = await getUserStats(userId);

        // Get earned achievements
        const userAchievements = await collections.userAchievements()
            .find({ user_id: userId, is_active: true })
            .toArray();
        const earnedIds = new Set(userAchievements.map(a => a.achievement_id));

        // Get holder counts
        const holderPipeline = [
            { $match: { is_active: true } },
            { $group: { _id: '$achievement_id', count: { $sum: 1 } } }
        ];
        const holderResult = await collections.userAchievements().aggregate(holderPipeline).toArray();
        const countsMap: Record<string, number> = {};
        for (const row of holderResult) {
            countsMap[row._id] = row.count;
        }

        const achievementsWithInfo = definitions.map((achievement: any) => {
            const criteria = JSON.parse(achievement.criteria_json || '{}');
            let currentValue = 0;
            let targetValue = criteria.value || 0;
            let requirementText = '';

            switch (criteria.field) {
                case 'total_focus_hours':
                    currentValue = Math.floor(stats.total_focus_hours);
                    requirementText = `Focus for ${targetValue} total hours in Ekagra mode`;
                    break;
                case 'goals_completed':
                    currentValue = stats.goals_completed;
                    requirementText = `Complete ${targetValue} goals across all time`;
                    break;
                case 'check_in_streak':
                    currentValue = stats.check_in_streak;
                    requirementText = `Maintain a ${targetValue}-day daily check-in streak`;
                    break;
                case 'login_streak':
                    currentValue = stats.login_streak;
                    requirementText = `Log in for ${targetValue} consecutive days`;
                    break;
                default:
                    requirementText = 'Awarded based on your weekly emotional journey';
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
            const titleDef = EMOTIONAL_TITLES.find(t => t.name === milestone.title);
            if (titleDef) {
                await collections.userAchievements().updateOne(
                    { user_id: userId, achievement_id: titleDef.id },
                    { $set: { is_active: true, acquired_at: new Date() }, $setOnInsert: { id: uuidv4(), user_id: userId, achievement_id: titleDef.id } },
                    { upsert: true }
                );
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
    for (const achievement of ACHIEVEMENT_DEFINITIONS) {
        try {
            await collections.achievementDefinitions().updateOne(
                { id: achievement.id },
                {
                    $set: {
                        name: achievement.name,
                        type: achievement.type,
                        category: achievement.category,
                        tier: achievement.tier,
                        criteria_json: achievement.criteria_json,
                        display_priority: achievement.display_priority,
                    },
                    $setOnInsert: { id: achievement.id, created_at: new Date() }
                },
                { upsert: true }
            );
        } catch (e) {
            // Ignore
        }
    }

    for (const title of EMOTIONAL_TITLES) {
        try {
            await collections.achievementDefinitions().updateOne(
                { id: title.id },
                {
                    $set: { name: title.name, description: title.description },
                    $setOnInsert: {
                        id: title.id,
                        type: 'title',
                        category: 'emotional',
                        rarity: 'special',
                        tier: null,
                        criteria_json: '{}',
                        display_priority: 60,
                        created_at: new Date()
                    }
                },
                { upsert: true }
            );
        } catch (e) {
            // Ignore
        }
    }

    console.log('✅ Achievement definitions seeded');
}

export const achievementRoutes = router;
