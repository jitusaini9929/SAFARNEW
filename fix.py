file_path = r'd:\\SAFAR\\sylaabus planner\\StudyPlanner.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Remove the old Exams block which is malformed.
# Let's find the start of the exams view.
exams_marker = '{/* ═══════ EXAMS TAB ═══════ */}'

exams_start = text.find(exams_marker)
if exams_start != -1:
    # We want to remove from exams_start down to the end of the file, minus the ending which should just be:
    #         </div>
    #       </div>
    #       {bulkAddOpen && (
    
    # Let's find where {bulkAddOpen && ( starts
    bulk_start = text.find('{bulkAddOpen && (', exams_start)
    if bulk_start != -1:
        # Before bulk add, we need:
        #         </div>
        #       </div>
        #     </div>
        #   </div>
        # Let's just delete the bad part and append a cleaned up closing.
        text = text[:exams_start] + '        </div>\n      </div>\n\n      ' + text[bulk_start:]
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(text)
        print('Fixed malformed end of file.')
    else:
        print('bulk start not found')
else:
    print('exams marker not found')
