import { ObjectId } from 'mongodb';

export type ExamType = 'ssc_cgl' | 'ssc_chsl' | 'ssc_mts' | 'ssc_gd' | 'ssc_steno';
export type LanguagePreference = 'english' | 'hindi' | 'bilingual';
export type CurrentStage = 'beginner' | 'early_prepared' | 'inconsistent_intermediate' | 'serious_intermediate' | 'mock_focused';
export type PlanStatus = 'draft' | 'active' | 'needs_rebalance' | 'backlog_detected' | 'completed' | 'archived';
export type TaskType = 'learn' | 'practice' | 'revision' | 'mock' | 'repair' | 'formula_review' | 'speed_drill';
export type TaskSource = 'initial_plan' | 'revision_engine' | 'mock_recovery' | 'backlog_rescue' | 'manual_admin_override';
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';
export type TaskStatus = 'not_started' | 'in_progress' | 'done' | 'partial' | 'skipped' | 'rescheduled';
export type SessionEndReason = 'completed' | 'user_stopped' | 'timeout' | 'interrupted' | 'switched_task';
export type SessionCompletionState = 'done' | 'partial' | 'skipped';
export type RevisionRiskLevel = 'high' | 'medium' | 'low';
export type RevisionStatus = 'due' | 'completed' | 'overdue' | 'snoozed';
export type RevisionDueReason = 'spaced_interval' | 'low_confidence' | 'mock_weakness' | 'overdue_carry_forward';
export type ReadinessBand = 'critical' | 'weak' | 'stable' | 'strong';
export type BacklogEventStatus = 'detected' | 'preview_generated' | 'accepted' | 'dismissed';

export interface UserMissionProfile {
    _id?: ObjectId;
    id: string;
    user_id: string;
    exam_type: ExamType;
    target_exam_date: Date;
    daily_hours_weekday: number;
    daily_hours_weekend: number;
    preferred_study_slots: string[];
    off_days: string[];
    language_preference: LanguagePreference;
    current_stage: CurrentStage;
    subject_confidence: Record<string, number>;
    uses_external_mocks: boolean;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}

export interface MissionPlan {
    _id?: ObjectId;
    id: string;
    user_id: string;
    profile_id: string;
    status: PlanStatus;
    start_date: Date;
    end_date: Date;
    target_exam_date: Date;
    generation_version: string;
    last_rebalanced_at: Date;
    last_backlog_rescue_at: Date;
    readiness_snapshot_id: string | null;
    created_at: Date;
    updated_at: Date;
}

export interface MissionTask {
    _id?: ObjectId;
    id: string;
    plan_id: string;
    user_id: string;
    date: Date;
    subject: string;
    topic_id: string;
    topic_name: string;
    task_type: TaskType;
    source: TaskSource;
    priority: TaskPriority;
    estimated_minutes: number;
    status: TaskStatus;
    linked_revision_item_id: string | null;
    linked_mock_id: string | null;
    sequence_index: number;
    completion_confidence: number | null;
    notes_summary: string | null;
    created_at: Date;
    updated_at: Date;
}

export interface FocusSession {
    _id?: ObjectId;
    id: string;
    user_id: string;
    task_id: string | null;
    started_at: Date;
    ended_at: Date | null;
    planned_minutes: number;
    actual_minutes: number | null;
    break_count: number;
    end_reason: SessionEndReason | null;
    completion_state: SessionCompletionState | null;
    confidence_after_session: number | null;
    notes: string | null;
    created_at: Date;
    updated_at: Date;
}

export interface RevisionItem {
    _id?: ObjectId;
    id: string;
    user_id: string;
    plan_id: string;
    subject: string;
    topic_id: string;
    topic_name: string;
    origin_task_id: string | null;
    last_completed_at: Date | null;
    next_due_date: Date;
    interval_stage: number;
    risk_level: RevisionRiskLevel;
    status: RevisionStatus;
    due_reason: RevisionDueReason;
    snooze_count: number;
    created_at: Date;
    updated_at: Date;
}

export interface MockResult {
    _id?: ObjectId;
    id: string;
    user_id: string;
    plan_id: string | null;
    mock_name: string;
    date_taken: Date;
    overall_score: number;
    overall_accuracy: number | null;
    section_scores: Record<string, any>;
    section_time_spent: Record<string, any>;
    topic_accuracy: Record<string, any>;
    topic_error_flags: Record<string, any>;
    raw_input_version: string;
    created_at: Date;
    updated_at: Date;
}

export interface MockRecoveryPlan {
    _id?: ObjectId;
    id: string;
    user_id: string;
    mock_result_id: string;
    risk_summary: Record<string, any>;
    weak_topics: Record<string, any>;
    careless_error_topics: Record<string, any>;
    recommended_actions: Record<string, any>;
    three_day_plan: Record<string, any>;
    accepted_at: Date | null;
    created_at: Date;
}

export interface ReadinessSnapshot {
    _id?: ObjectId;
    id: string;
    user_id: string;
    plan_id: string;
    score: number;
    band: ReadinessBand;
    coverage_score: number;
    consistency_score: number;
    revision_health_score: number;
    mock_health_score: number;
    backlog_risk_score: number;
    top_risks: any[];
    top_strengths: any[];
    computed_at: Date;
}

export interface BacklogEvent {
    _id?: ObjectId;
    id: string;
    user_id: string;
    plan_id: string;
    missed_days_count: number;
    overdue_revision_count: number;
    open_priority_task_count: number;
    detected_at: Date;
    status: BacklogEventStatus;
    rescue_plan_preview: Record<string, any> | null;
    accepted_at: Date | null;
}
