import React from 'react';

export function ReadinessScoreWidget(props: any) {
    return (
        <div className="p-4 rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow">
            <h4 className="font-medium">ReadinessScoreWidget</h4>
            <div className="text-xs text-muted-foreground mt-2">
                Fields: score, band, reason, delta_from_last_week
            </div>
            
        </div>
    );
}
