#!/usr/bin/env node
/**
 * Seeds a permanent Google Play "App Access" reviewer account in MongoDB.
 *
 * User schema matches server/routes/auth.ts signup (bcrypt cost 10).
 * Mock data: streaks + sample goals + one study plan (study_plans collection).
 *
 * Usage (from SAFAR repo root on VPS):
 *   node server/scripts/seed-google-tester.js
 *   node server/scripts/seed-google-tester.js --reset-password
 *
 * Requires: MONGODB_URI (and optionally MONGODB_DB_NAME, default "safar")
 * Loads .env_open then .env from process.cwd() if present.
 */

import bcrypt from "bcrypt";
import { MongoClient } from "mongodb";
import { randomUUID } from "crypto";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

const REVIEWER_EMAIL = "safartester@gmail.com";
const REVIEWER_PASSWORD = "SafarTest2026";
const REVIEWER_NAME = "Google Play Reviewer";
const BCRYPT_ROUNDS = 10;
const DEFAULT_AVATAR =
  "https://www.gstatic.com/images/branding/product/1x/avatar_circle_blue_512dp.png";

const RESET_PASSWORD = process.argv.includes("--reset-password");

function loadEnvFiles() {
  const cwd = process.cwd();
  const envOpen = path.join(cwd, ".env_open");
  const envFile = path.join(cwd, ".env");
  if (fs.existsSync(envOpen)) dotenv.config({ path: envOpen });
  if (fs.existsSync(envFile)) dotenv.config({ path: envFile });
}

function normalizeEmail(input) {
  return String(input || "")
    .trim()
    .toLowerCase();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function emailQuery(normalizedEmail) {
  const escaped = escapeRegExp(normalizedEmail);
  const exactRegex = new RegExp(`^${escaped}$`, "i");
  const looseRegex = new RegExp(`^\\s*${escaped}\\s*$`, "i");
  return {
    $or: [{ email: normalizedEmail }, { email: exactRegex }, { email: looseRegex }],
  };
}

function addDaysIso(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

function istDateKey(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

function endOfIstDayUtc(now = new Date()) {
  const key = istDateKey(now);
  const end = new Date(`${key}T23:59:59.999Z`);
  end.setTime(end.getTime() - 5.5 * 60 * 60 * 1000);
  return end;
}

function buildSampleGoals(userId, now) {
  const expiresAt = endOfIstDayUtc(now);
  const samples = [
    {
      title: "Review Polity — Fundamental Rights",
      category: "academic",
      priority: "high",
    },
    {
      title: "25-minute focused study block (Ekagra)",
      category: "personal",
      priority: "medium",
    },
    {
      title: "Log mood check-in after study",
      category: "health",
      priority: "low",
    },
  ];

  return samples.map((sample) => {
    const id = randomUUID();
    const title = sample.title;
    return {
      id,
      user_id: userId,
      text: title,
      title,
      description: "Sample goal for Play Console review",
      category: sample.category,
      priority: sample.priority,
      source: "manual",
      subtasks: [],
      type: "daily",
      completed: false,
      created_at: now,
      completed_at: null,
      started_at: null,
      expires_at: expiresAt,
      lifecycle_status: "active",
      rollover_prompt_pending: false,
      imported_from_goal: false,
      completed_via_focus: false,
      goal_kind: "today",
      unit_type: "binary",
      execution_mode: "manual",
      linked_focus_enabled: false,
      planned_focus_minutes: null,
      target_value: null,
      achieved_value: 0,
      status_value: "not_started",
      carry_forward_mode: "none",
      source_goal_id: null,
      scheduled_date: null,
      missed_at: null,
      rolled_over_at: null,
      abandoned_at: null,
    };
  });
}

function buildSampleStudyPlan(userId) {
  const now = new Date().toISOString();
  const planId = randomUUID();
  const subjectId = randomUUID();
  const chapterId = randomUUID();

  const topic = (name, status = "todo", daysFromNow = 0) => {
    const planned = new Date();
    planned.setUTCDate(planned.getUTCDate() + daysFromNow);
    return {
      id: randomUUID(),
      name,
      status,
      plannedDate: planned.toISOString().slice(0, 10),
      notes: "Demo topic for reviewer",
    };
  };

  return {
    id: planId,
    userId,
    title: "UPSC Prelims — Review Demo Plan",
    examType: "UPSC",
    examDate: addDaysIso(120),
    description: "Pre-seeded study plan so reviewers see a populated Study Planner.",
    dailyGoal: 3,
    offDays: [0],
    subjects: [
      {
        id: subjectId,
        name: "Indian Polity",
        color: "#6750A4",
        weeklyTarget: 5,
        monthlyTarget: 20,
        chapters: [
          {
            id: chapterId,
            name: "Constitution Basics",
            topics: [
              topic("Preamble & Features", "done", -2),
              topic("Fundamental Rights", "in_progress", 0),
              topic("DPSP & Fundamental Duties", "todo", 1),
            ],
          },
        ],
      },
    ],
    features: {
      isPremium: true,
      unlockedAt: now,
    },
    createdAt: now,
    updatedAt: now,
  };
}

async function ensureStreaks(db, userId) {
  const streaks = db.collection("streaks");
  const existing = await streaks.findOne({ user_id: userId });
  if (existing) {
    console.log("  • streaks: already present");
    return;
  }
  const now = new Date();
  await streaks.insertOne({
    id: randomUUID(),
    user_id: userId,
    login_streak: 3,
    check_in_streak: 2,
    goal_completion_streak: 1,
    last_login_date: now,
    last_check_in_date: now,
    last_goal_completion_date: now,
    last_active_date: now,
  });
  console.log("  • streaks: created with sample streak values");
}

async function ensureGoals(db, userId) {
  const goals = db.collection("goals");
  const count = await goals.countDocuments({ user_id: userId });
  if (count > 0) {
    console.log(`  • goals: ${count} already exist — skipping`);
    return;
  }
  const now = new Date();
  const docs = buildSampleGoals(userId, now);
  await goals.insertMany(docs);
  console.log(`  • goals: inserted ${docs.length} sample goals`);
}

async function ensureStudyPlan(db, userId) {
  const plans = db.collection("study_plans");
  const count = await plans.countDocuments({ userId });
  if (count > 0) {
    console.log(`  • study_plans: ${count} already exist — skipping`);
    return;
  }
  const plan = buildSampleStudyPlan(userId);
  await plans.insertOne(plan);
  console.log(`  • study_plans: inserted demo plan "${plan.title}"`);
}

async function main() {
  loadEnvFiles();

  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME || "safar";

  if (!uri) {
    console.error(
      "[seed-google-tester] MONGODB_URI is not set. Export it or add it to .env on the VPS.",
    );
    process.exit(1);
  }

  if (process.env.DEV_MODE === "true") {
    console.error(
      "[seed-google-tester] DEV_MODE=true uses in-memory DB — run against production MongoDB with DEV_MODE unset/false.",
    );
    process.exit(1);
  }

  const normalizedEmail = normalizeEmail(REVIEWER_EMAIL);
  const client = new MongoClient(uri, {
    connectTimeoutMS: 30000,
    serverSelectionTimeoutMS: 30000,
  });

  await client.connect();
  const db = client.db(dbName);

  try {
    await db.command({ ping: 1 });
    console.log(`[seed-google-tester] Connected to MongoDB database "${dbName}"`);

    const users = db.collection("users");
    let user = await users.findOne(emailQuery(normalizedEmail));

    if (!user) {
      const userId = randomUUID();
      const passwordHash = await bcrypt.hash(REVIEWER_PASSWORD, BCRYPT_ROUNDS);
      const doc = {
        id: userId,
        name: REVIEWER_NAME,
        email: normalizedEmail,
        password_hash: passwordHash,
        avatar: DEFAULT_AVATAR,
        exam_type: "UPSC",
        preparation_stage: "Prelims",
        gender: null,
        selected_perk_id: null,
        selected_achievement_id: null,
        created_at: new Date(),
      };
      await users.insertOne(doc);
      user = doc;
      console.log(`[seed-google-tester] Created user ${userId} (${normalizedEmail})`);
    } else {
      console.log(
        `[seed-google-tester] User already exists: ${user.id} (${user.email})`,
      );
      if (RESET_PASSWORD) {
        const passwordHash = await bcrypt.hash(REVIEWER_PASSWORD, BCRYPT_ROUNDS);
        await users.updateOne(
          { id: user.id },
          {
            $set: { password_hash: passwordHash, email: normalizedEmail },
            $unset: { password: "" },
          },
        );
        console.log("  • password_hash: reset (--reset-password)");
      } else {
        console.log(
          "  • password: unchanged (pass --reset-password to set SafarTest2026)",
        );
      }
    }

    const userId = user.id;
    console.log("[seed-google-tester] Ensuring reviewer sample data…");
    await ensureStreaks(db, userId);
    await ensureGoals(db, userId);
    await ensureStudyPlan(db, userId);

    console.log("\n✅ Google Play reviewer account ready");
    console.log("   Email:    ", normalizedEmail);
    console.log("   Password: ", REVIEWER_PASSWORD);
    console.log("   User ID:  ", userId);
    console.log("\nProvide these credentials in Play Console → App content → App access.");
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("[seed-google-tester] Fatal error:", err);
  process.exit(1);
});
