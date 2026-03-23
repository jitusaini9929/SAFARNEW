// Add this to server/index.ts after importing requireAuth and other route mounts.

import planRouter from "../sylaabus planner/plan.routes";

// Planner routes are already protected internally via requireAuth, so no wrapper middleware needed here.
app.use("/api/plans", planRouter);

// Implemented endpoints:
//
// GET    /api/plans
// POST   /api/plans
// GET    /api/plans/:planId
// PATCH  /api/plans/:planId
// DELETE /api/plans/:planId
//
// POST   /api/plans/:planId/subjects
// DELETE /api/plans/:planId/subjects/:subjectId
//
// POST   /api/plans/:planId/subjects/:subjectId/chapters
// DELETE /api/plans/:planId/subjects/:subjectId/chapters/:chapterId
//
// POST   /api/plans/:planId/subjects/:subjectId/chapters/:chapterId/topics
// PATCH  /api/plans/:planId/topics/:topicId
// DELETE /api/plans/:planId/topics/:topicId
//
// GET    /api/plans/:planId/calendar
// GET    /api/plans/:planId/analytics           (paid)
// POST   /api/plans/:planId/auto-distribute     (paid)
// POST   /api/plans/:planId/upgrade             (demo helper)
