import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TEMPLATE_FILES: Record<string, string> = {
  "ssc-cgl-tier1": "ssc-cgl-tier1.json",
  "railway-ntpc": "railway-ntpc.json",
  "bank-po-prelims": "bank-po-prelims.json",
  "jee-mains": "jee-mains.json",
  "neet-ug": "neet-ug.json",
};

const templateCache = new Map<string, ExamTemplate>();

function loadTemplate(id: string): ExamTemplate | null {
  if (templateCache.has(id)) return templateCache.get(id)!;

  const filename = TEMPLATE_FILES[id];
  if (!filename) return null;

  try {
    const filePath = join(__dirname, filename);
    const raw = readFileSync(filePath, "utf-8");
    const template = JSON.parse(raw) as ExamTemplate;
    templateCache.set(id, template);
    return template;
  } catch (error) {
    console.error(`[TEMPLATES] Failed to load template "${id}":`, error);
    return null;
  }
}

export function getAvailableTemplates(): ExamTemplateSummary[] {
  const summaries: ExamTemplateSummary[] = [];

  for (const id of Object.keys(TEMPLATE_FILES)) {
    const template = loadTemplate(id);
    if (!template) continue;

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
