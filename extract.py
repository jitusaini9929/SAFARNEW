import re

log_path = r'C:\Users\kumar\.gemini\antigravity\brain\801e20e9-e85b-4c8f-8b91-b4f61181f28e\.system_generated\logs\overview.txt'

with open(log_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Find all view_file outputs for StudyPlanner.tsx
parts = text.split("File Path: ile:///d:/SAFAR/sylaabus%20planner/StudyPlanner.tsx")
print(f"Found {len(parts) - 1} occurrences of viewing StudyPlanner.")

for i, p in enumerate(parts[1:]):
    m = re.search(r'Showing lines (\d+) to (\d+)', p)
    if m:
        start, end = int(m.group(1)), int(m.group(2))
        print(f"Occurrence {i+1}: lines {start} to {end}")
        
        if end - start > 5000:
            print("Found massive view! Extracting...")
            # extract lines
            lines_start = p.find('The following code has been modified')
            if lines_start != -1:
                lines_start = p.find('\n', lines_start) + 1
                lines_end = p.find('The above content does NOT show the entire file contents')
                if lines_end == -1:
                    lines_end = p.find('`\n', lines_start) # Or end of tool response
                
                content = p[lines_start:lines_end]
                extracted = []
                for line in content.split('\n'):
                    # remove line numbers like "1: " or "1234: "
                    if re.match(r'^\d+: ', line):
                        extracted.append(line.split(' ', 1)[1])
                    elif line.strip() != "":
                        # Might be tool boundaries or something else, but let's see
                        pass 
                
                with open('extracted_study_planner.tsx', 'w', encoding='utf-8') as out:
                    out.write('\n'.join(extracted))
                print('Wrote extracted_study_planner.tsx with', len(extracted), 'lines')

