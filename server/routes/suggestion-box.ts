import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { collections } from "../db";
import { requireAdmin, requireAuth } from "../middleware/auth";

const router = Router();

const MAX_CONTENT_LENGTH = 2000;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

const normalizeContent = (value: unknown) =>
  String(value ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_CONTENT_LENGTH);

const toPublicSubmission = (submission: any, votedIds: Set<string>) => ({
  id: String(submission.id || ""),
  content: String(submission.content || ""),
  userName: String(submission.user_name || "User"),
  voteCount: Number(submission.vote_count || 0),
  hasVoted: votedIds.has(String(submission.id || "")),
  createdAt: submission.created_at ? new Date(submission.created_at).toISOString() : null,
});

router.use(requireAuth);

router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const limit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(Number(req.query.limit) || DEFAULT_LIMIT)));

    const submissions = await collections.suggestionBoxSubmissions()
      .find({ status: { $ne: "hidden" } })
      .sort({ vote_count: -1, created_at: -1 })
      .limit(limit)
      .project({
        _id: 0,
        id: 1,
        content: 1,
        user_name: 1,
        vote_count: 1,
        created_at: 1,
      })
      .toArray();

    const submissionIds = submissions.map((submission: any) => String(submission.id || "")).filter(Boolean);
    const votes = submissionIds.length
      ? await collections.suggestionBoxVotes()
        .find({ user_id: userId, submission_id: { $in: submissionIds } })
        .project({ _id: 0, submission_id: 1 })
        .toArray()
      : [];
    const votedIds = new Set(votes.map((vote: any) => String(vote.submission_id || "")));

    return res.json({ submissions: submissions.map((submission: any) => toPublicSubmission(submission, votedIds)) });
  } catch (error) {
    console.error("List suggestion box submissions error:", error);
    return res.status(500).json({ message: "Failed to load suggestion box" });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const content = normalizeContent(req.body?.content);

    if (content.length < 3) {
      return res.status(400).json({ message: "Suggestion must be at least 3 characters." });
    }

    const user = await collections.users().findOne(
      { id: userId },
      { projection: { _id: 0, id: 1, name: 1, email: 1 } },
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const now = new Date();
    const submission = {
      id: uuidv4(),
      user_id: userId,
      user_name: String(user.name || "User"),
      user_email: String(user.email || ""),
      content,
      vote_count: 0,
      status: "open",
      created_at: now,
      updated_at: now,
    };

    await collections.suggestionBoxSubmissions().insertOne(submission);

    return res.status(201).json({
      submission: toPublicSubmission(submission, new Set()),
    });
  } catch (error) {
    console.error("Create suggestion box submission error:", error);
    return res.status(500).json({ message: "Failed to submit suggestion" });
  }
});

router.post("/:submissionId/vote", async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const submissionId = String(req.params.submissionId || "").trim();
    if (!submissionId) {
      return res.status(400).json({ message: "Submission id is required" });
    }

    const submission = await collections.suggestionBoxSubmissions().findOne(
      { id: submissionId, status: { $ne: "hidden" } },
      { projection: { _id: 0, id: 1 } },
    );

    if (!submission) {
      return res.status(404).json({ message: "Suggestion not found" });
    }

    const existingVote = await collections.suggestionBoxVotes().findOne({
      submission_id: submissionId,
      user_id: userId,
    });

    const now = new Date();
    let hasVoted = false;
    if (existingVote) {
      await collections.suggestionBoxVotes().deleteOne({ submission_id: submissionId, user_id: userId });
      await collections.suggestionBoxSubmissions().updateOne(
        { id: submissionId, vote_count: { $gt: 0 } },
        { $inc: { vote_count: -1 }, $set: { updated_at: now } },
      );
    } else {
      await collections.suggestionBoxVotes().insertOne({
        id: uuidv4(),
        submission_id: submissionId,
        user_id: userId,
        created_at: now,
      });
      await collections.suggestionBoxSubmissions().updateOne(
        { id: submissionId },
        { $inc: { vote_count: 1 }, $set: { updated_at: now } },
      );
      hasVoted = true;
    }

    const updated = await collections.suggestionBoxSubmissions().findOne(
      { id: submissionId },
      { projection: { _id: 0, vote_count: 1 } },
    );

    return res.json({
      hasVoted,
      voteCount: Number(updated?.vote_count || 0),
    });
  } catch (error: any) {
    if (Number(error?.code) === 11000) {
      return res.status(409).json({ message: "Vote already recorded" });
    }
    console.error("Vote suggestion box submission error:", error);
    return res.status(500).json({ message: "Failed to update vote" });
  }
});

router.get("/admin", requireAdmin, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(Number(req.query.limit) || DEFAULT_LIMIT)));
    const submissions = await collections.suggestionBoxSubmissions()
      .find({})
      .sort({ vote_count: -1, created_at: -1 })
      .limit(limit)
      .project({
        _id: 0,
        id: 1,
        content: 1,
        user_id: 1,
        user_name: 1,
        user_email: 1,
        vote_count: 1,
        status: 1,
        created_at: 1,
        updated_at: 1,
      })
      .toArray();

    return res.json({ submissions });
  } catch (error) {
    console.error("Admin list suggestion box submissions error:", error);
    return res.status(500).json({ message: "Failed to load admin suggestion box" });
  }
});

export const suggestionBoxRoutes = router;

