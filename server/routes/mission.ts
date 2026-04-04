import express from 'express';
import { collections } from '../db';
import { ObjectId } from 'mongodb';

export const missionRouter = express.Router();

// Mock middleware to simulate auth context for local dev
const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // In production, this would be verifyToken. 
    // We attach a dummy user_id for the MVP read-only mode to work safely.
    (req as any).user = { id: 'usr_mock_123', email: 'test@example.com' };
    next();
};

/**
 * GET /api/mission/today
 * Purpose: Fetch today's mission tasks, due revisions, rescue alerts, and active recovery items.
 */
missionRouter.get('/today', requireAuth, async (req, res) => {
    try {
        const userId = (req as any).user.id;

        // Since this is the Phase 1 MVP (Read-Only Data & Mock Seeding), 
        // we'll explicitly formulate the response matching the frontend expectations.
        // In deeper phases, this joins across missionTasks, revisionItems, backlogEvents, and readinessSnapshots.

        const mockResponse = {
            tasks: [
                { 
                    id: "task_1", 
                    subject: "Mathematics", 
                    topic_name: "Percentage Practice", 
                    estimated_minutes: 45, 
                    priority: "high", 
                    status: "in_progress", 
                    task_type: "practice",
                    source: "mock_recovery",
                    nextAction: "Moves you to Level 4 in Arithmetic" 
                },
                { 
                    id: "task_2", 
                    subject: "English", 
                    topic_name: "Vocab Set 4", 
                    estimated_minutes: 30, 
                    priority: "medium", 
                    status: "not_started", 
                    task_type: "learn",
                    source: "initial_plan"
                },
                { 
                    id: "task_3", 
                    subject: "Reasoning", 
                    topic_name: "Number Series Mock", 
                    estimated_minutes: 20, 
                    priority: "high", 
                    status: "not_started", 
                    task_type: "revision",
                    source: "revision_engine"
                }
            ],
            due_revisions: [
                { 
                    id: "rev_1", 
                    subject: "Static GK", 
                    topic_name: "Folk Dances of India", 
                    risk_level: "high", 
                    due_reason: "missed 2 days ago",
                    estimated_minutes: 15 
                },
                { 
                    id: "rev_2", 
                    subject: "Polity", 
                    topic_name: "Fundamental Rights", 
                    risk_level: "medium", 
                    due_reason: "due today",
                    estimated_minutes: 20 
                }
            ],
            backlog_alert: {
                isBehind: true,
                tasksSkipped: 2,
                revisionsOverdue: 2
            },
            active_recovery: {
                activePlan: "CGL Prelims Mock #5 Recovery",
                diagnosis: "Your last mock dropped in English because speed and reading accuracy fell by 12%.",
                repairActions: [
                    { id: "repair_1", topic: "Time & Work", type: "Accuracy Fix", suggestedMinutes: 30 },
                    { id: "repair_2", topic: "Reading Comprehension", type: "Speed Drill", suggestedMinutes: 20 }
                ]
            },
            readiness_snapshot: {
                score: 84,
                band: "strong",
                reason: "Consistent revision in Maths & Static GK."
            }
        };

        res.json(mockResponse);
    } catch (error) {
        console.error('Error fetching today mission:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * GET /api/mission/plan/active
 */
missionRouter.get('/plan/active', requireAuth, async (req, res) => {
    res.json({
        plan: {
            id: "plan_123",
            target_exam_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
            status: "active"
        },
        readiness_snapshot: {
            score: 80,
            band: "strong"
        }
    });
});

/**
 * GET /api/mission/revision
 */
missionRouter.get('/revision', requireAuth, async (req, res) => {
    res.json({
        items: []
    });
});

// Seed Profile (Mock)
missionRouter.post('/profile', requireAuth, async (req, res) => {
    res.json({ profile_id: 'prof_new_123', saved: true });
});
