# Incremental meeting notes for the mentor demo

These three fictional meeting records extend the existing AI Project Intelligence & Risk Advisor sample project (AIPI-DEMO-26). They do not describe actual internship meetings, defects, approvals or test results. The original six files in `sample_documents/` remain unchanged.

| File | Meeting date | Purpose |
| --- | --- | --- |
| AI_Project_Meeting_Notes_01_Initial_Project_Review.docx | 2026-10-05 | Baseline review, scope and assigned validation work |
| AI_Project_Meeting_Notes_02_Progress_and_Blockers.docx | 2026-10-07 | Existing B-01/B-02 blockers and pending DEC-01 |
| AI_Project_Meeting_Notes_03_Export_Readiness_Update.docx | 2026-10-08 | New B-03 export font checklist blocker and T-19 action |

The third note assigns T-19 to Arjun Das, due 2026-10-09. It relates to existing risk R-07 without changing that risk's rating or the T-13 evidence-check deadline. It does not claim that earlier blockers are resolved. The first two notes are supplementary historical context; they need not be uploaded for the short demo below.

## Recommended presentation sequence

1. Create a **new workspace** for the demo. Keep your existing workspaces intact.
2. Upload all six PDF/DOCX/TXT/CSV files in `sample_documents/` together. Do not upload its README. Wait for indexing and automatic analysis to finish. If a request fails, use Retry; do not describe an error state as Ready.
3. Show Overview, the nine identified sample risks, health and actions. Ask **What is the highest risk in my project?**, **What is the overall health score?**, and **What are the current blockers?** The highest stated severity can be shared by several risks; the assistant should not invent a unique winner.
4. Ask **Which tasks are blocked by the export font?** The initial dataset does not establish this blocker, so the answer should report that the information is unavailable.
5. Upload only `AI_Project_Meeting_Notes_03_Export_Readiness_Update.docx` into the **same workspace**. Do not upload all three notes together if demonstrating before/after behavior.
6. Wait for processing and automatic analysis. Earlier results may remain visible with a stale label while new results are prepared. Use Refresh/Retry only if needed.
7. Ask **Which tasks are blocked by the export font?** Show the concise answer, then expand **View source** to verify B-03 and Arjun Das against the new note.
8. Open **Blockers & Actions** and review B-03. In **Documentation Studio → Action Items**, search for **T-19**. Show the refreshed health result without promising that its number must change: the formula may already be at a dimension's cap/floor.
9. Download both PDF and Word from Overview. Review B-03/T-19 and their evidence in the report.
10. Switch to another workspace and back to demonstrate isolation. The new note and its insights belong only to the workspace where it was uploaded.

The backend now skips byte-identical uploads of the same format within one workspace, including after restart. A renamed byte-identical file is also skipped. Existing records created before this update do not have fingerprints and are not retroactively altered. Edited documents are separate evidence: this application does not automatically resolve every chronological contradiction across historical documents. Use dated, explicit updates and inspect source details when statements disagree.
