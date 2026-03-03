const PIP_NUDGE_DISMISSED_KEY = "pip_nudge_dismissed";

export function shouldShowPiPNudge(): boolean {
    if (!document.pictureInPictureEnabled) return false;

    const isTouchDevice = navigator.maxTouchPoints > 1;
    if (!isTouchDevice) return false;

    try {
        if (sessionStorage.getItem(PIP_NUDGE_DISMISSED_KEY) === "1") return false;
    } catch {
        // Ignore storage issues and allow the nudge.
    }

    return true;
}

export function dismissPiPNudgeSession(): void {
    try {
        sessionStorage.setItem(PIP_NUDGE_DISMISSED_KEY, "1");
    } catch {
        // Ignore storage failures.
    }
}

export function clearPiPNudgeSessionDismissal(): void {
    try {
        sessionStorage.removeItem(PIP_NUDGE_DISMISSED_KEY);
    } catch {
        // Ignore storage failures.
    }
}
