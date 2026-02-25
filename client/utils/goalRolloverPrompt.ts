import { dataService } from "@/utils/dataService";
import { toast } from "sonner";

let promptFlowRunning = false;

export async function runGoalRolloverPromptFlow(userId?: string | null) {
    if (typeof window === "undefined" || promptFlowRunning || !userId) return;

    const todayKey = new Date().toISOString().split("T")[0];
    const sessionKey = `goal-rollover-prompt:${userId}:${todayKey}`;
    if (sessionStorage.getItem(sessionKey) === "done") return;

    promptFlowRunning = true;
    try {
        const prompts = await dataService.getGoalRolloverPrompts();
        if (!prompts.length) {
            sessionStorage.setItem(sessionKey, "done");
            return;
        }

        for (const goal of prompts) {
            const shouldRetry = window.confirm(`You missed "${goal.text}" goal yesterday, would you like to reschedule it for today?`);
            if (shouldRetry) {
                await dataService.respondToGoalRollover(goal.id, "retry");
                toast.success(`Rolled over "${goal.text}" for today.`);
            } else {
                await dataService.respondToGoalRollover(goal.id, "archive");
                toast.info(`Archived "${goal.text}" as abandoned.`);
            }
        }

        sessionStorage.setItem(sessionKey, "done");
    } catch (error) {
        console.error("Goal rollover prompt flow failed:", error);
    } finally {
        promptFlowRunning = false;
    }
}
