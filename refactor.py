import re

file_path = r'd:\SAFAR\sylaabus planner\StudyPlanner.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update PlannerSection and PlannerView types
content = content.replace(
    'type PlannerSection = "today" | "plan" | "syllabus" | "calendar";',
    'type PlannerSection = "today" | "syllabus" | "calendar";'
)
content = content.replace(
    'type PlannerView = PlannerSection | "kanban" | "exams" | "revisions";',
    'type PlannerView = PlannerSection;'
)

# 2. Add showSettings state
content = content.replace(
    'const [isExamDateEditorOpen, setIsExamDateEditorOpen] = useState(false);',
    'const [isExamDateEditorOpen, setIsExamDateEditorOpen] = useState(false);\n  const [showSettings, setShowSettings] = useState(false);'
)

# 3. Update handleViewChange
old_hvc = '''  function handleViewChange(next: PlannerView) {
    setView(next);
    // Only update URL for routable sections; exams/revisions/kanban are internal-only views
    const routable: PlannerSection[] = ["today", "plan", "syllabus", "calendar"];
    if (routable.includes(next as PlannerSection)) {
      navigate(`/study/planner/${planId}/${next}`, { replace: true });
    }
  }'''
new_hvc = '''  function handleViewChange(next: PlannerView) {
    setView(next);
    navigate(`/study/planner/${planId}/${next}`, { replace: true });
  }'''
content = content.replace(old_hvc, new_hvc)

# 4. Update Header to use Settings button instead of Edit Plan
old_btn = '''              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleViewChange("plan")}
                className="text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-full bg-white/80 dark:bg-[#202225]/80 border border-[#c0c4d1] dark:border-[#2b2c2c] text-[#4b5563] dark:text-[#acabaa] transition-colors"
              >
                Edit Plan
              </motion.button>'''
new_btn = '''              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowSettings(!showSettings)}
                className="text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-full bg-white/80 dark:bg-[#202225]/80 border border-[#c0c4d1] dark:border-[#2b2c2c] text-[#4b5563] dark:text-[#acabaa] transition-colors flex items-center gap-2"
              >
                ⚙ Settings
              </motion.button>'''
content = content.replace(old_btn, new_btn)

# 5. Update Action Controls View Tabs
old_tabs = '''              {([
                ["today", "Today"],
                ["plan", "Plan"],
                ["syllabus", "Syllabus"],
                ["calendar", "Calendar"],
                ["exams", "Exams"],
                ["revisions", "Revisions"],
              ] as Array<[PlannerView, string]>).map(([value, label]) => ('''
new_tabs = '''              {([
                ["today", "Today"],
                ["syllabus", "Syllabus"],
                ["calendar", "Calendar"],
              ] as Array<[PlannerView, string]>).map(([value, label]) => ('''
content = content.replace(old_tabs, new_tabs)

# 6. Replace string refs
content = content.replace('handleViewChange("plan")', 'setShowSettings(true)')
content = content.replace('{view === "plan" && (', '{showSettings && (')

# 7. Move exams logic to calendar view
# We will do this by simply replacing `{view === "exams" && (` with nothing if we want to remove it, but we need to inject it.
# Actually, the python script will just wipe out kanban, revisions, and exams fully here, and we'll insert a simplified exam card component manually or via another pass.

# Remove the text view === "kanban" block. We'll find it using regex.
kanban_pattern = re.compile(r'\{\s*/\* ═══════ KANBAN TAB\s?(?:═══════)? \*/\s*\}')
content = re.sub(r'\{\s*view === "kanban" && \(\s*<motion\.div.*?</motion\.div>\s*\)\s*\}', '', content, flags=re.DOTALL)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
