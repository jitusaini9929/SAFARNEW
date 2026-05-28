import { TourConfig } from "@/contexts/GuidedTourContext";

interface TourPromptProps {
    tour: TourConfig;
    featureName: string;
}

export default function TourPrompt({ tour, featureName }: TourPromptProps) {
    // Guided tour prompts are temporarily disabled while the new feedback
    // system is active. Keeping this component as a no-op prevents the
    // floating "?" helper button from appearing.
    void tour;
    void featureName;
    return null;
}
