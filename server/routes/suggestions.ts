import { Router } from 'express';
import { collections } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

// ═══════════════════════════════════════════════════════════
// SUGGESTION CONTENT POOLS
// ═══════════════════════════════════════════════════════════

const SOS_EXERCISES = [
    { title: '4-7-8 Breathing', description: 'Breathe in for 4s, hold for 7s, exhale for 8s. Repeat 4 times.', duration: '2 min', icon: '🫁' },
    { title: '5-4-3-2-1 Grounding', description: 'Name 5 things you see, 4 you touch, 3 you hear, 2 you smell, 1 you taste.', duration: '3 min', icon: '🌿' },
    { title: 'Body Scan Reset', description: 'Close your eyes. Slowly scan from head to toes, releasing tension anywhere you find it.', duration: '5 min', icon: '🧘' },
    { title: 'Cold Water Splash', description: 'Splash cold water on your face or hold ice cubes. Activates your dive reflex to calm anxiety.', duration: '1 min', icon: '💧' },
];

const MOOD_SUGGESTIONS: Record<string, { title: string; description: string; action: string; link: string; icon: string }[]> = {
    low: [
        { title: 'Quick Gratitude', description: 'Write down 3 things you\'re grateful for right now. Small wins count.', action: 'Open Journal', link: '/nishtha/journal', icon: '📝' },
        { title: 'Movement Break', description: 'A 5-minute walk or stretch releases tension and boosts endorphins.', action: 'Start Timer', link: '/nishtha/focus', icon: '🚶' },
        { title: 'Talk It Out', description: 'Share how you feel in Mehfil. You\'re not alone in this.', action: 'Go to Mehfil', link: '/nishtha/mehfil', icon: '💬' },
    ],
    neutral: [
        { title: 'Set a Micro-Goal', description: 'Pick one small task you can finish in 15 minutes. Momentum builds confidence.', action: 'Set Goal', link: '/nishtha/goals', icon: '🎯' },
        { title: 'Mindful Focus Session', description: 'Try a 25-minute Pomodoro to get into flow state.', action: 'Start Focus', link: '/nishtha/focus', icon: '⏱️' },
        { title: 'Reflect & Plan', description: 'Write a quick journal entry about what you want to accomplish today.', action: 'Open Journal', link: '/nishtha/journal', icon: '📖' },
    ],
    high: [
        { title: 'Ride the Wave', description: 'You\'re feeling great! Channel this energy into a deep focus session.', action: 'Start Focus', link: '/nishtha/focus', icon: '🌊' },
        { title: 'Help Someone', description: 'Share an encouraging thought in Mehfil. Your energy can uplift others.', action: 'Go to Mehfil', link: '/nishtha/mehfil', icon: '🤝' },
        { title: 'Level Up Goals', description: 'Feeling motivated? Set a challenging new goal to push yourself.', action: 'Set Goal', link: '/nishtha/goals', icon: '🚀' },
    ],
};

const DAILY_CHALLENGES = [
    { title: 'Digital Detox Hour', description: 'Go 1 hour without checking social media. Use that time to focus or rest.', difficulty: 'Easy' },
    { title: 'Gratitude Sprint', description: 'Write 5 things you\'re grateful for in under 2 minutes. GO!', difficulty: 'Easy' },
    { title: 'Deep Work Block', description: 'Complete a 45-minute uninterrupted focus session today.', difficulty: 'Medium' },
    { title: 'Mindful Meals', description: 'Eat one meal today without screens. Just you and the food.', difficulty: 'Medium' },
    { title: 'Random Act of Kindness', description: 'Do something kind for someone today—a compliment, a note, a helping hand.', difficulty: 'Easy' },
    { title: 'Journal Deep Dive', description: 'Write a journal entry of at least 200 words about how your week has been.', difficulty: 'Medium' },
    { title: 'The 3-Goal Challenge', description: 'Set and complete 3 goals before the day ends.', difficulty: 'Hard' },
    { title: 'Breathwork Master', description: 'Do 3 separate breathing exercises throughout the day (morning, afternoon, evening).', difficulty: 'Medium' },
    { title: 'No Complaints Day', description: 'Go the entire day without complaining. Replace complaints with solutions.', difficulty: 'Hard' },
    { title: 'Early Bird Focus', description: 'Complete a focus session before 9 AM tomorrow morning.', difficulty: 'Hard' },
    { title: 'Connect & Listen', description: 'Have a meaningful conversation with someone today. Really listen.', difficulty: 'Easy' },
    { title: 'Stretch Your Limits', description: 'Try a 60-minute focus session. Push past your usual limit.', difficulty: 'Hard' },
    { title: 'Mood Check Marathon', description: 'Do 3 mood check-ins today: morning, afternoon, and evening.', difficulty: 'Easy' },
    { title: 'Zero Procrastination Hour', description: 'Pick your hardest task and work on it first thing. Eat the frog!', difficulty: 'Medium' },
];

const MINDFUL_MOMENTS = [
    { quote: 'You don\'t have to see the whole staircase. Just take the first step.', author: 'Martin Luther King Jr.' },
    { quote: 'The present moment is filled with joy and happiness. If you are attentive, you will see it.', author: 'Thich Nhat Hanh' },
    { quote: 'Almost everything will work again if you unplug it for a few minutes, including you.', author: 'Anne Lamott' },
    { quote: 'Your calm mind is the ultimate weapon against your challenges.', author: 'Bryant McGill' },
    { quote: 'Rest when you\'re weary. Refresh and renew, then get back to work.', author: 'Ralph Marston' },
    { quote: 'You are never too old to set another goal or to dream a new dream.', author: 'C.S. Lewis' },
    { quote: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
    { quote: 'Believe you can and you\'re halfway there.', author: 'Theodore Roosevelt' },
    { quote: 'In the middle of difficulty lies opportunity.', author: 'Albert Einstein' },
    { quote: 'What lies behind us and what lies before us are tiny matters compared to what lies within us.', author: 'Ralph Waldo Emerson' },
];

const SLEEP_ROUTINE = [
    { step: 1, title: 'Screens Off', description: 'Put away all screens and dim the lights.', time: '30 min before bed' },
    { step: 2, title: 'Warm Drink', description: 'Have a caffeine-free warm drink like chamomile tea or warm milk.', time: '25 min before bed' },
    { step: 3, title: 'Quick Journal', description: 'Write 3 good things that happened today and 1 intention for tomorrow.', time: '20 min before bed' },
    { step: 4, title: 'Body Relaxation', description: 'Lie down and tense then release each muscle group from toes to head.', time: '10 min before bed' },
    { step: 5, title: 'Box Breathing', description: 'Breathe in 4s, hold 4s, out 4s, hold 4s. Repeat until drowsy.', time: '5 min before bed' },
];

// ═══════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════

function getTimeOfDayGreeting(): { greeting: string; period: string } {
    const hour = new Date().getHours();
    if (hour < 5) return { greeting: 'Still up?', period: 'night' };
    if (hour < 12) return { greeting: 'Good morning', period: 'morning' };
    if (hour < 17) return { greeting: 'Good afternoon', period: 'afternoon' };
    if (hour < 21) return { greeting: 'Good evening', period: 'evening' };
    return { greeting: 'Time to wind down', period: 'night' };
}

function getMoodCategory(intensity: number): 'low' | 'neutral' | 'high' {
    if (intensity <= 2) return 'low';
    if (intensity <= 3) return 'neutral';
    return 'high';
}

function getDailyChallenge(): typeof DAILY_CHALLENGES[0] {
    // Use day-of-year to rotate challenges deterministically
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - startOfYear.getTime();
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
    return DAILY_CHALLENGES[dayOfYear % DAILY_CHALLENGES.length];
}

function getMindfulMoment(): typeof MINDFUL_MOMENTS[0] {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - startOfYear.getTime();
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
    return MINDFUL_MOMENTS[dayOfYear % MINDFUL_MOMENTS.length];
}

// ═══════════════════════════════════════════════════════════
// MAIN ENDPOINT
// ═══════════════════════════════════════════════════════════

router.get('/personalized', requireAuth, async (req: any, res) => {
    try {
        const userId = req.session.userId;
        const { greeting, period } = getTimeOfDayGreeting();

        // ── Fetch user's latest mood ──
        const latestMood = await collections.moods()
            .find({ user_id: userId })
            .sort({ timestamp: -1 })
            .limit(1)
            .toArray();
        const currentMoodIntensity = latestMood[0]?.intensity ?? 3;
        const currentMoodLabel = latestMood[0]?.mood ?? 'neutral';
        const moodCategory = getMoodCategory(currentMoodIntensity);

        // ── Fetch user's active goals ──
        const activeGoals = await collections.goals().countDocuments({
            user_id: userId, completed: false, lifecycle_status: { $ne: 'expired' }
        });
        const completedToday = await collections.goals().countDocuments({
            user_id: userId,
            completed: true,
            completed_at: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
        });

        // ── Fetch user's focus stats ──
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const focusPipeline = [
            { $match: { user_id: userId, completed: true, completed_at: { $gte: sevenDaysAgo } } },
            { $group: { _id: null, total: { $sum: '$duration_minutes' }, count: { $sum: 1 } } }
        ];
        const focusResult = await collections.focusSessions().aggregate(focusPipeline).toArray();
        const weeklyFocusHours = Math.round(((focusResult[0]?.total) || 0) / 60 * 10) / 10;
        const weeklyFocusSessions = focusResult[0]?.count || 0;

        // ── Get user name ──
        const user = await collections.users().findOne(
            { id: userId },
            { projection: { name: 1 } }
        );
        const firstName = (user?.name || 'friend').split(' ')[0];

        // ── Build response ──
        const response: any = {
            greeting: `${greeting}, ${firstName}`,
            period,
            mood: {
                intensity: currentMoodIntensity,
                label: currentMoodLabel,
                category: moodCategory,
            },
            stats: {
                activeGoals,
                completedToday,
                weeklyFocusHours,
                weeklyFocusSessions,
            },
            // Mood-based recommendations
            moodSuggestions: MOOD_SUGGESTIONS[moodCategory] || MOOD_SUGGESTIONS.neutral,
            // Daily challenge
            dailyChallenge: getDailyChallenge(),
            // Mindful moment
            mindfulMoment: getMindfulMoment(),
            // SOS exercises (always returned, shown conditionally on frontend)
            sosExercises: SOS_EXERCISES,
            // Focus boost tips
            focusBoost: {
                show: activeGoals > 0 || weeklyFocusSessions > 0,
                message: weeklyFocusHours > 0
                    ? `You've focused ${weeklyFocusHours} hours this week across ${weeklyFocusSessions} sessions. ${weeklyFocusHours >= 10 ? 'Incredible pace! Keep it up.' : 'Every minute counts. Let\'s build on this.'}`
                    : 'No focus sessions this week yet. Start with a quick 15-minute session to build momentum!',
                weeklyHours: weeklyFocusHours,
                weeklySessions: weeklyFocusSessions,
            },
        };

        // Sleep wind-down (show after 8 PM or if mood is exhausted/tired)
        const isLateEvening = period === 'night' || new Date().getHours() >= 20;
        const isTired = currentMoodLabel.toLowerCase().includes('tired') ||
            currentMoodLabel.toLowerCase().includes('exhausted') ||
            currentMoodIntensity <= 1;
        if (isLateEvening || isTired) {
            response.sleepWindDown = SLEEP_ROUTINE;
        }

        // SOS flag (frontend decides visibility, but this helps)
        response.showSOS = moodCategory === 'low';

        res.json(response);
    } catch (error) {
        console.error('Error generating personalized suggestions:', error);
        res.status(500).json({ message: 'Failed to generate suggestions' });
    }
});

export const suggestionsRoutes = router;
