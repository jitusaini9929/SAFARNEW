import React from 'react';

export function MissionTaskCard(props: any) {
    return (
        <div className="p-4 rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow">
            <h4 className="font-medium">MissionTaskCard</h4>
            <div className="text-xs text-muted-foreground mt-2">
                Fields: subject, topic, estimated_minutes, priority, status, task_source
            </div>
            <div className="flex gap-2 mt-4">
                <button className="px-3 py-1 text-xs bg-primary/10 text-primary rounded-md hover:bg-primary/20">start</button>
                <button className="px-3 py-1 text-xs bg-primary/10 text-primary rounded-md hover:bg-primary/20">mark done</button>
                <button className="px-3 py-1 text-xs bg-primary/10 text-primary rounded-md hover:bg-primary/20">mark partial</button>
                <button className="px-3 py-1 text-xs bg-primary/10 text-primary rounded-md hover:bg-primary/20">skip</button>
                <button className="px-3 py-1 text-xs bg-primary/10 text-primary rounded-md hover:bg-primary/20">reschedule</button>
            </div>
        </div>
    );
}
