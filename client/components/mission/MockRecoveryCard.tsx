import React from 'react';

export function MockRecoveryCard(props: any) {
    return (
        <div className="p-4 rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow">
            <h4 className="font-medium">MockRecoveryCard</h4>
            <div className="text-xs text-muted-foreground mt-2">
                Fields: topic, problem_type, repair_action, suggested_minutes
            </div>
            
        </div>
    );
}
