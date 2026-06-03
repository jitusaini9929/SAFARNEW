import sscCglTier1 from "./ssc-cgl-tier1.json";
import railwayNtpc from "./railway-ntpc.json";
import bankPoPrelims from "./bank-po-prelims.json";
import jeeMains from "./jee-mains.json";
import neetUg from "./neet-ug.json";

export interface ExamTemplateChapter {
  name: string;
  topics: string[];
}

export interface ExamTemplateSubject {
  name: string;
  color: string;
  chapters: ExamTemplateChapter[];
}

export interface ExamTemplate {
  id: string;
  name: string;
  examBody: string;
  category: string;
  description: string;
  estimatedTopics: number;
  recommendedDailyGoal: number;
  tags: string[];
  subjects: ExamTemplateSubject[];
}

export interface ExamTemplateSummary {
  id: string;
  name: string;
  examBody: string;
  category: string;
  description: string;
  estimatedTopics: number;
  recommendedDailyGoal: number;
  tags: string[];
}

/** Bundled at build time — avoids readFileSync paths that break in dist/server. */
const TEMPLATES: Record<string, ExamTemplate> = {
  "ssc-cgl-tier1": sscCglTier1 as ExamTemplate,
  "railway-ntpc": railwayNtpc as ExamTemplate,
  "bank-po-prelims": bankPoPrelims as ExamTemplate,
  "jee-mains": jeeMains as ExamTemplate,
  "neet-ug": neetUg as ExamTemplate,
};

function loadTemplate(id: string): ExamTemplate | null {
  return TEMPLATES[id] ?? null;
}

export function getAvailableTemplates(): ExamTemplateSummary[] {
  const summaries: ExamTemplateSummary[] = [];

  for (const template of Object.values(TEMPLATES)) {
    summaries.push({
      id: template.id,
      name: template.name,
      examBody: template.examBody,
      category: template.category,
      description: template.description,
      estimatedTopics: template.estimatedTopics,
      recommendedDailyGoal: template.recommendedDailyGoal,
      tags: template.tags,
    });
  }

  return summaries;
}

export function getTemplateById(id: string): ExamTemplate | null {
  return loadTemplate(id);
}
