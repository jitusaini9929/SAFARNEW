import React from 'react';

export function RevisionCard(props: any) {
    return (
        <div className="p-4 rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow">
            <h4 className="font-medium">RevisionCard</h4>
            <div className="text-xs text-muted-foreground mt-2">
                Fields: topic, subject, due_reason, risk_level, estimated_minutes
            </div>
            <div className="flex gap-2 mt-4">
                <button className="px-3 py-1 text-xs bg-primary/10 text-primary rounded-md hover:bg-primary/20">start revision</button>
                <button className="px-3 py-1 text-xs bg-primary/10 text-primary rounded-md hover:bg-primary/20">complete</button>
                <button className="px-3 py-1 text-xs bg-primary/10 text-primary rounded-md hover:bg-primary/20">snooze</button>
            </div>
        </div>
    );
}
