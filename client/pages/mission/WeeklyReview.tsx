import React from 'react';

/**
 * Purpose: Summarize the week and reset the next one.
 * Route: /mission/weekly-review
 */
export default function WeeklyReview() {
    return (
        <div className="min-h-screen bg-background text-foreground p-6">
            <div className="max-w-4xl mx-auto space-y-8">
                <header>
                    <h1 className="text-3xl font-bold tracking-tight">Weekly Review</h1>
                    <p className="text-muted-foreground mt-2">Summarize the week and reset the next one.</p>
                </header>

                <div className="grid gap-6 mt-8">
                    {/* Scaffolded Components */}
                    <div className="p-4 rounded-xl border bg-card text-card-foreground shadow-sm">
                        <h3 className="font-semibold text-lg mb-2">Weekly Completion Summary</h3>
                        <p className="text-sm text-muted-foreground">Placeholder for weekly_completion_summary</p>
                    </div>
                    <div className="p-4 rounded-xl border bg-card text-card-foreground shadow-sm">
                        <h3 className="font-semibold text-lg mb-2">Best Subject Improvement Card</h3>
                        <p className="text-sm text-muted-foreground">Placeholder for best_subject_improvement_card</p>
                    </div>
                    <div className="p-4 rounded-xl border bg-card text-card-foreground shadow-sm">
                        <h3 className="font-semibold text-lg mb-2">Most Ignored Subject Card</h3>
                        <p className="text-sm text-muted-foreground">Placeholder for most_ignored_subject_card</p>
                    </div>
                    <div className="p-4 rounded-xl border bg-card text-card-foreground shadow-sm">
                        <h3 className="font-semibold text-lg mb-2">Revision Debt Summary</h3>
                        <p className="text-sm text-muted-foreground">Placeholder for revision_debt_summary</p>
                    </div>
                    <div className="p-4 rounded-xl border bg-card text-card-foreground shadow-sm">
                        <h3 className="font-semibold text-lg mb-2">Mock Impact Summary</h3>
                        <p className="text-sm text-muted-foreground">Placeholder for mock_impact_summary</p>
                    </div>
                    <div className="p-4 rounded-xl border bg-card text-card-foreground shadow-sm">
                        <h3 className="font-semibold text-lg mb-2">Next Week Focus Areas</h3>
                        <p className="text-sm text-muted-foreground">Placeholder for next_week_focus_areas</p>
                    </div>
                    <div className="p-4 rounded-xl border bg-card text-card-foreground shadow-sm">
                        <h3 className="font-semibold text-lg mb-2">Confirm Next Week Plan Cta</h3>
                        <p className="text-sm text-muted-foreground">Placeholder for confirm_next_week_plan_cta</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
