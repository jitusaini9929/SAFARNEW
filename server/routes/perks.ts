import { Router, Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { collections } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

// ========================================
// PERK DEFINITIONS
// ========================================

const PERK_DEFINITIONS = [
    // ── AURA: Focus Tier ────────────────────────────────
    { id: 'A001', name: 'Silent Flame', description: 'Earned after 10+ hours of focused study', type: 'aura', category: 'focus', rarity: 'common', tier: 1, color_code: '#FF6B35', criteria_json: JSON.stringify({ field: 'total_focus_hours', operator: '>=', value: 10 }), display_priority: 10 },
    { id: 'A002', name: 'Deep Current', description: 'Earned after 50+ hours of focused study', type: 'aura', category: 'focus', rarity: 'uncommon', tier: 2, color_code: '#1E90FF', criteria_json: JSON.stringify({ field: 'total_focus_hours', operator: '>=', value: 50 }), display_priority: 20 },
    { id: 'A003', name: 'Iron Focus', description: 'Earned after 100+ hours of focused study', type: 'aura', category: 'focus', rarity: 'rare', tier: 3, color_code: '#C0C0C0', criteria_json: JSON.stringify({ field: 'total_focus_hours', operator: '>=', value: 100 }), display_priority: 30 },
    { id: 'A004', name: 'Void Walker', description: 'Earned after 250+ hours of focused study', type: 'aura', category: 'focus', rarity: 'epic', tier: 4, color_code: '#8A2BE2', criteria_json: JSON.stringify({ field: 'total_focus_hours', operator: '>=', value: 250 }), display_priority: 40 },
    { id: 'A005', name: 'Eternal Forge', description: 'Earned after 500+ hours of focused study', type: 'aura', category: 'focus', rarity: 'legendary', tier: 5, color_code: '#FFD700', criteria_json: JSON.stringify({ field: 'total_focus_hours', operator: '>=', value: 500 }), display_priority: 50 },

    // ── AURA: Goal Tier ─────────────────────────────────
    { id: 'A006', name: 'Spark', description: 'Complete 10 goals', type: 'aura', category: 'goals', rarity: 'common', tier: 1, color_code: '#32CD32', criteria_json: JSON.stringify({ field: 'goals_completed', operator: '>=', value: 10 }), display_priority: 15 },
    { id: 'A007', name: 'Rising Storm', description: 'Complete 50 goals', type: 'aura', category: 'goals', rarity: 'uncommon', tier: 2, color_code: '#FF4500', criteria_json: JSON.stringify({ field: 'goals_completed', operator: '>=', value: 50 }), display_priority: 25 },
    { id: 'A008', name: 'Adamant Will', description: 'Complete 100 goals', type: 'aura', category: 'goals', rarity: 'rare', tier: 3, color_code: '#DC143C', criteria_json: JSON.stringify({ field: 'goals_completed', operator: '>=', value: 100 }), display_priority: 35 },

    // ── ECHO: Streak-based ──────────────────────────────
    { id: 'E001', name: 'Whisper', description: '7-day login streak', type: 'echo', category: 'streak', rarity: 'common', tier: 1, color_code: '#87CEEB', criteria_json: JSON.stringify({ field: 'login_streak', operator: '>=', value: 7 }), display_priority: 12 },
    { id: 'E002', name: 'Resonance', description: '14-day login streak', type: 'echo', category: 'streak', rarity: 'uncommon', tier: 2, color_code: '#4169E1', criteria_json: JSON.stringify({ field: 'login_streak', operator: '>=', value: 14 }), display_priority: 22 },
    { id: 'E003', name: 'Thunder', description: '30-day login streak', type: 'echo', category: 'streak', rarity: 'rare', tier: 3, color_code: '#9400D3', criteria_json: JSON.stringify({ field: 'login_streak', operator: '>=', value: 30 }), display_priority: 32 },
    { id: 'E004', name: 'Inner Peace', description: '7-day check-in streak', type: 'echo', category: 'mood', rarity: 'common', tier: 1, color_code: '#20B2AA', criteria_json: JSON.stringify({ field: 'check_in_streak', operator: '>=', value: 7 }), display_priority: 11 },
    { id: 'E005', name: 'Emotional Anchor', description: '21-day check-in streak', type: 'echo', category: 'mood', rarity: 'uncommon', tier: 2, color_code: '#FF69B4', criteria_json: JSON.stringify({ field: 'check_in_streak', operator: '>=', value: 21 }), display_priority: 21 },
];

// ========================================
// DATA & EVALUATION
// ========================================

async function getUserStats(userId: string) {
    const focusPipeline = [
        { $match: { user_id: userId, completed: true } },
        { $group: { _id: null, total: { $sum: '$duration_minutes' } } }
    ];
    const focusResult = await collections.focusSessions().aggregate(focusPipeline).toArray();
    const totalFocusHours = ((focusResult[0]?.total) || 0) / 60;

    const goalsCompleted = await collections.goals().countDocuments({ user_id: userId, completed: true });

    const streak = await collections.streaks().findOne({ user_id: userId });

    return {
        total_focus_hours: totalFocusHours,
        goals_completed: goalsCompleted,
        check_in_streak: streak?.check_in_streak || 0,
        login_streak: streak?.login_streak || 0,
        goal_completion_streak: streak?.goal_completion_streak || 0,
    };
}

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

export async function checkPerks(userId: string, trigger?: string): Promise<{ awarded: string[], lost: string[] }> {
    const awarded: string[] = [];
    const lost: string[] = [];
    const stats = await getUserStats(userId);

    const currentPerks = await collections.userPerks().find({ user_id: userId }).toArray();
    const currentPerkMap = new Map(currentPerks.map(p => [p.perk_id, p]));

    for (const perk of PERK_DEFINITIONS) {
        const criteria = JSON.parse(perk.criteria_json);
        const qualifies = evaluateCriteria(criteria, stats);
        const hasPerk = currentPerkMap.get(perk.id);

        if (qualifies && !hasPerk) {
            await collections.userPerks().updateOne(
                { user_id: userId, perk_id: perk.id },
                { $setOnInsert: { id: uuidv4(), user_id: userId, perk_id: perk.id, acquired_at: new Date(), is_active: true, lost_at: null } },
                { upsert: true }
            );
            awarded.push(perk.name);
            console.log(`✨ [PERKS] Awarded "${perk.name}" to user ${userId}`);
        } else if (!qualifies && hasPerk && hasPerk.is_active) {
            // Lost perk (streak-based)
            if (perk.category === 'streak' || perk.category === 'mood') {
                await collections.userPerks().updateOne(
                    { user_id: userId, perk_id: perk.id },
                    { $set: { is_active: false, lost_at: new Date() } }
                );
                lost.push(perk.name);
                console.log(`❌ [PERKS] Revoked "${perk.name}" from user ${userId}`);
            }
        }
    }

    return { awarded, lost };
}

// ========================================
// ROUTES
// ========================================

// Get user perks
router.get('/', requireAuth, async (req: any, res) => {
    try {
        const userId = req.session.userId!;
        await checkPerks(userId);

        const userPerks = await collections.userPerks()
            .find({ user_id: userId, is_active: true })
            .toArray();

        const perkIds = userPerks.map(p => p.perk_id);
        const definitions = await collections.perkDefinitions()
            .find({ id: { $in: perkIds } })
            .toArray();
        const defMap = new Map(definitions.map(d => [d.id, d]));

        const perks = userPerks
            .map(up => {
                const def = defMap.get(up.perk_id);
                if (!def) return null;
                return {
                    perk_id: up.perk_id,
                    acquired_at: up.acquired_at,
                    is_active: up.is_active,
                    name: def.name,
                    description: def.description,
                    type: def.type,
                    category: def.category,
                    rarity: def.rarity,
                    tier: def.tier,
                    color_code: def.color_code,
                    display_priority: def.display_priority,
                };
            })
            .filter(Boolean)
            .sort((a: any, b: any) => (b.display_priority || 0) - (a.display_priority || 0));

        // Get selected perk
        const user = await collections.users().findOne({ id: userId }, { projection: { selected_perk_id: 1 } });

        res.json({ perks, selectedPerkId: user?.selected_perk_id || null });
    } catch (error) {
        console.error('Get perks error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get active perk/title
router.get('/active', requireAuth, async (req: any, res) => {
    try {
        const userId = req.session.userId;
        const user = await collections.users().findOne({ id: userId }, { projection: { selected_perk_id: 1 } });

        if (user?.selected_perk_id) {
            const up = await collections.userPerks().findOne({ user_id: userId, perk_id: user.selected_perk_id, is_active: true });
            if (up) {
                const def = await collections.perkDefinitions().findOne({ id: user.selected_perk_id });
                if (def) {
                    res.json({ perk: { name: def.name, type: def.type, color_code: def.color_code, rarity: def.rarity }, selectedId: user.selected_perk_id });
                    return;
                }
            }
        }

        res.json({ perk: null, selectedId: null });
    } catch (error) {
        console.error('Get active perk error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Select perk
router.post('/select', requireAuth, async (req: any, res) => {
    try {
        const userId = req.session.userId;
        const { perkId } = req.body;

        if (!perkId) {
            await collections.users().updateOne({ id: userId }, { $set: { selected_perk_id: null } });
            res.json({ message: 'Selection cleared' });
            return;
        }

        const up = await collections.userPerks().findOne({ user_id: userId, perk_id: perkId, is_active: true });
        if (!up) {
            res.status(400).json({ message: 'You do not have this perk' });
            return;
        }

        await collections.users().updateOne({ id: userId }, { $set: { selected_perk_id: perkId } });
        const def = await collections.perkDefinitions().findOne({ id: perkId });

        res.json({ message: 'Perk selected', perkId, name: def?.name });
    } catch (error) {
        console.error('Select perk error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get ALL perk definitions with user progress
router.get('/all', requireAuth, async (req: any, res) => {
    try {
        const userId = req.session.userId!;
        await checkPerks(userId);

        const definitions = await collections.perkDefinitions()
            .find({})
            .sort({ category: 1, display_priority: -1 })
            .toArray();

        const stats = await getUserStats(userId);

        const userPerks = await collections.userPerks()
            .find({ user_id: userId, is_active: true })
            .toArray();
        const earnedIds = new Set(userPerks.map(p => p.perk_id));

        // Holder counts
        const holderResult = await collections.userPerks().aggregate([
            { $match: { is_active: true } },
            { $group: { _id: '$perk_id', count: { $sum: 1 } } }
        ]).toArray();
        const countsMap: Record<string, number> = {};
        for (const row of holderResult) countsMap[row._id] = row.count;

        const perksWithInfo = definitions.map((perk: any) => {
            const criteria = JSON.parse(perk.criteria_json || '{}');
            let currentValue = 0;
            let targetValue = criteria.value || 0;
            let requirementText = '';

            switch (criteria.field) {
                case 'total_focus_hours':
                    currentValue = Math.floor(stats.total_focus_hours);
                    requirementText = `Focus for ${targetValue} total hours`;
                    break;
                case 'goals_completed':
                    currentValue = stats.goals_completed;
                    requirementText = `Complete ${targetValue} goals`;
                    break;
                case 'check_in_streak':
                    currentValue = stats.check_in_streak;
                    requirementText = `${targetValue}-day check-in streak`;
                    break;
                case 'login_streak':
                    currentValue = stats.login_streak;
                    requirementText = `${targetValue}-day login streak`;
                    break;
                default:
                    requirementText = perk.description || 'Special criteria';
            }

            return {
                id: perk.id, name: perk.name, description: perk.description,
                type: perk.type, category: perk.category, rarity: perk.rarity,
                tier: perk.tier, color_code: perk.color_code,
                requirement: requirementText,
                holderCount: countsMap[perk.id] || 0,
                earned: earnedIds.has(perk.id),
                progress: targetValue > 0 ? Math.min(100, Math.round((currentValue / targetValue) * 100)) : 0,
                currentValue, targetValue
            };
        });

        res.json({ perks: perksWithInfo });
    } catch (error) {
        console.error('Get all perks error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Seed perk definitions
export async function seedPerkDefinitions() {
    for (const perk of PERK_DEFINITIONS) {
        try {
            await collections.perkDefinitions().updateOne(
                { id: perk.id },
                {
                    $set: {
                        name: perk.name, description: perk.description, type: perk.type,
                        category: perk.category, rarity: perk.rarity, tier: perk.tier,
                        color_code: perk.color_code, criteria_json: perk.criteria_json,
                        display_priority: perk.display_priority,
                    },
                    $setOnInsert: { id: perk.id, created_at: new Date() }
                },
                { upsert: true }
            );
        } catch (e) { /* ignore */ }
    }
    console.log('✅ Perk definitions seeded');
}

export const perkRoutes = router;
