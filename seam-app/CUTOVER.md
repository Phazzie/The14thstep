# Cutover checklist (seam-v2 step 11)

The rebuild lives in `seam-app/`. The old app in `app/` is untouched. Swapping them is a separate
pull request that only Trizzy merges, and also needs the Vercel project's root directory changed.

- [x] Intake: name, clean time, mood, what's on your mind, listening only
- [x] Ritual: empty chair, chair opens, silence, reading, introductions
- [x] User introduction, topic choice (10 topics), three share turns, pass
- [x] Hard question, gated on the user having shared
- [x] Closing, "Keep coming back", farewell
- [x] Crisis: intake and every share, authored reply, 988 and 911, phone list page
- [x] Refresh resumes without duplicates
- [x] Privacy and terms (one fine-print page)
- [x] Startup sayings
- [ ] Expand a share (dropped: not worth a second paid call per share; say if you want it back)
- [ ] End-of-meeting AI reflection summary (replaced by the signed slip; say if you want it back)
- [ ] Cross-meeting memory and callbacks (needs a database; deliberately out)
- [ ] XAI_API_KEY set on the new Vercel project (needs Trizzy)
- [ ] One live Grok probe saved as a fixture
