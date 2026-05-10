import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HEAD = ROOT / "archive" / "dev-scripts" / "StudyPlanner_HEAD.tsx"
CURRENT = ROOT / "client" / "features" / "study-planner" / "StudyPlanner.tsx"

with open(HEAD, "r", encoding="utf-8") as f:
    head_content = f.read()

with open(CURRENT, "r", encoding="utf-8") as f:
    curr_content = f.read()

# In HEAD, find the section starting from: "  const [beginnerMode, setBeginnerMode] = useState"
# up to the end of the component which is right before "function CalendarView"

start_str = "  const [beginnerMode, setBeginnerMode] = useState(() => {"
end_str = "function CalendarView({"

head_start = head_content.find(start_str)
head_end = head_content.find(end_str)

if head_start == -1 or head_end == -1:
    print("Could not find start/end in HEAD")
    exit(1)

# we need to get everything from head_start up to the last "}" before head_end.
text_to_inject = head_content[head_start:head_end]

# In CURRENT, we replace everything from start_str up to end_str
curr_start = curr_content.find(start_str)
curr_end = curr_content.find(end_str)

if curr_start == -1 or curr_end == -1:
    print("Could not find start/end in CURRENT")
    exit(1)

new_content = curr_content[:curr_start] + text_to_inject + curr_content[curr_end:]

with open(CURRENT, "w", encoding="utf-8") as f:
    f.write(new_content)

print("Successfully injected text from HEAD to CURRENT!")
