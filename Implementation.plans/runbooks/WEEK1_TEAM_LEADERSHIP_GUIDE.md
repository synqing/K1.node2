---
author: Claude Code Agent (Beat Validation Lead)
date: 2025-10-29
status: published
intent: Team leadership guide for Week 1 - how to facilitate metrics learning across the team
---

# Week 1 Team Leadership Guide

## Your Role: Facilitate Learning, Not Answer Questions

You are not lecturing. Your team is learning by doing. Your job is to:

1. **Set up the environment** (they can run eval_single.py)
2. **Keep them on task** (3.5 hours, no distractions)
3. **Ask guiding questions** (not provide answers)
4. **Validate outputs** (ensure they completed each part)
5. **Capture key insights** (what surprised them?)

---

## Pre-Week 1: Your Preparation (30 minutes)

### Do This First

- [ ] Run all three eval_single.py examples yourself
- [ ] Create your own experiment (e.g., different error type)
- [ ] Answer the interpretation questions
- [ ] Read WEEK1_MIREX_METRICS_LEARNING.md completely

**Why:** You need to understand it deeply to facilitate without having answers written down.

### Set Up the Environment

- [ ] Verify all team members can access: `firmware/K1.node2/beats/`
- [ ] Verify dependencies: `pip install mir-eval numpy librosa`
- [ ] Verify test files exist: `ls estimates/0010_test_*.txt`
- [ ] Create shared drive/channel for submitting results

### Communicate to Team

Send this message 1 day before Week 1:

> **Week 1 Starts Tomorrow: MIREX Metrics Learning**
>
> Prep (15 min):
> - Read: firmware/K1.node2/beats/README.md
> - Read: Implementation.plans/runbooks/WEEK1_MIREX_METRICS_LEARNING.md
> - Have pip packages ready: mir-eval, numpy, librosa
>
> Session (3.5 hours):
> - Part 1: Run 3 example evaluations (30 min)
> - Part 2: Create + test your own experiment (60 min)
> - Part 3: Answer analysis questions + make predictions (90 min)
>
> Bring:
> - Laptop with Python/bash access
> - Notebook for recording outputs
> - Curiosity (this is learning, not testing)

---

## Week 1 Facilitation: Hour-by-Hour Plan

### Opening (0:00–0:10, 10 minutes)

**What you do:**
1. Welcome everyone
2. Show the overview:
   - "Today: learn 9 metrics by running them on real beat data"
   - "This is the foundation for Week 2-4 work"
   - "Understand before we build"

3. Run ONE example live (perfect match):
   ```bash
   python eval_single.py --ref data/harmonix/reference/0010_andjusticeforall.txt \
                         --est data/harmonix/reference/0010_andjusticeforall.txt
   ```

4. Ask: "What does F-measure=1.0 mean?" (wait for answers)

**What team does:**
- Listen
- Ask clarifying questions

**Your mindset:** Set tone—learning is expected, perfection is not

---

### Part 1: Three Scenarios (0:10–0:40, 30 minutes)

**What you do:**
1. Team works independently on their laptops
2. Walk around, observe
3. Check each person has:
   - [ ] Terminal open to `firmware/K1.node2/beats/`
   - [ ] Running eval_single.py commands
   - [ ] Recording outputs

4. **When someone finishes each scenario, ask:**
   - "What surprised you?"
   - "Why did that metric change?"
   - "What would Goto mean if it were 0?" (don't answer, guide thinking)

5. **If someone is stuck:**
   - "Can you see data/harmonix/reference/ files?" (path issue)
   - "Did you get an error? What does it say?" (let them debug)
   - "Go to line X in the README" (point to existing docs)

**What team does:**
- Run the three eval_single.py commands
- Record outputs in their notes
- Ask questions when stuck

**Your mindset:** Be available but don't solve problems. Guide them to solutions.

---

### Part 2: Personal Experiment (0:40–1:40, 60 minutes)

**What you do:**
1. Circulate frequently
2. Check progress:
   - [ ] Chose a track?
   - [ ] Created modified beat file?
   - [ ] Ran eval_single.py?
   - [ ] Recording results in table?

3. **Key question when they finish:** "What changed from the reference, and why?"

4. **If stuck on Python:** Provide template code (from WEEK1_TEAM_EXECUTION_CHECKLIST.md)

5. **If confused about results:** Ask: "Which metric changed the most? Why might that be?"

**What team does:**
- Choose their track
- Create one error scenario
- Run eval_single.py
- Fill out results table

**Your mindset:** They should struggle slightly. That's learning happening.

---

### Part 3: Analysis & Homework (1:40–3:10, 90 minutes)

**What you do:**
1. Quiet work time—team at their laptops writing
2. Check in every 15 minutes:
   - "How are the interpretation questions going?"
   - "Made your predictions yet?"

3. **When someone finishes answers, ask:**
   - "Can you explain that answer to me?"
   - "Why did you predict that?"
   - "Did your prediction match reality? What was different?"

4. **If someone says "I don't understand Goto":**
   - Don't explain
   - Ask: "What happened when tempo doubled?" (guide them to the answer)
   - "Look at Part 1 results again. What was Goto? What does that tell you?"

5. **Capture one key insight per person:**
   - "What surprised you about Cemgil vs F-measure?"
   - "If you were debugging an algorithm, how would Goto help?"

**What team does:**
- Answer interpretation questions in writing
- Make predictions on new scenarios
- Test predictions
- Write learning summary

**Your mindset:** This is deep thinking time. Protect it from interruptions.

---

### Closing Debrief (3:10–3:30, 20 minutes)

**What you do:**
1. Gather team
2. Ask each person ONE question:
   - "What was the most surprising metric behavior?"
   - "What confused you, and how did you figure it out?"
   - "If you saw Goto=0.0 in your algorithm, what would you check first?"

3. **Capture insights on whiteboard:**
   - Common surprises (many say "Cemgil was much lower")
   - Common confusions (NaN values, phase metrics)
   - Key lessons learned

4. **Preview Week 2:**
   - "Next week: use this knowledge to build a beat detector"
   - "You'll understand when your algorithm is working vs. broken"
   - "This learning saved you hours of confusion"

5. Collect results files for validation

**What team does:**
- Share key insights
- Listen to others' learning
- Get energized for Week 2

**Your mindset:** Celebrate learning. This is foundation-building work.

---

## Validation Checklist: What Success Looks Like

### Part 1 Success ✅

- [ ] Team ran all three eval_single.py commands without errors
- [ ] Each person recorded the output (copy-paste is fine)
- [ ] Observations mention:
  - "Perfect: F=1, Cemgil=1, Goto=1"
  - "Tempo double: F=0.67, Goto=0"
  - "Jitter: F=0.83, Cemgil=0.63, Goto=0"

### Part 2 Success ✅

- [ ] Each person chose a different track (don't need to, but good)
- [ ] They created a modified beat file (command syntax correct)
- [ ] Metrics changed in their results table
- [ ] They attempted to explain the changes

### Part 3 Success ✅

- [ ] They answered all analysis questions (length OK, clarity > perfection)
- [ ] They made predictions for Scenarios A & B
- [ ] They tested predictions and recorded actual results
- [ ] They wrote a learning summary (~300 words)

### Validation Questions

Ask each person these. If they can answer, Week 1 is working:

1. **"Explain what Goto=0.0 means"**
   - ✅ Good answer: "Algorithm detected the wrong tempo"
   - ❌ Weak answer: "It's bad" (no diagnostic value)

2. **"Why is Cemgil lower than F-measure when you add jitter?"**
   - ✅ Good answer: "Cemgil is stricter (±40ms vs ±70ms)"
   - ❌ Weak answer: "I don't know" (they skipped this learning)

3. **"If F-measure=0.8 but Goto=0.0, what's the problem?"**
   - ✅ Good answer: "Wrong tempo, not just accuracy"
   - ❌ Weak answer: "Algorithm is working but not perfect"

---

## Facilitation Anti-Patterns (Avoid These)

### ❌ Anti-Pattern 1: Lecturing

"Let me explain what Goto means..."

**Why bad:** Team zones out, doesn't build intuition

**Fix:** Ask "What does Goto=1.0 tell you?" (let them figure it out)

---

### ❌ Anti-Pattern 2: Solving Problems

"The command should be `python eval_single.py --ref ...`"

**Why bad:** They don't learn debugging

**Fix:** "What does the error message say? What does that tell you?"

---

### ❌ Anti-Pattern 3: Rushing

"We're behind schedule, skip the predictions"

**Why bad:** Predictions are where learning solidifies

**Fix:** Let Part 1 take longer if needed; skip cleanup, not learning

---

### ❌ Anti-Pattern 4: Not Validating

"Turn in your results, see you next week"

**Why bad:** You don't know if they actually learned

**Fix:** Ask validation questions; spot-check results

---

## Handling Common Issues

### Issue: "I'm confused by NaN values"

**Your response (don't explain, guide):**
- "Look at the output: you have 1532 beats, perfectly matched"
- "NaN means 'not a number'. Why might you not be able to compute a number here?"
- "What do metrics like Information Gain need to exist?" (multiple tempos)
- "If you have one tempo, can you measure phase variation?" (no)

**Result:** They understand NaN is expected for perfect beats

---

### Issue: "My Python command didn't work"

**Your response (don't fix it, guide):**
- "What error did you get?" (read it with them)
- "What file is it looking for?" (point them to the path)
- "Do you have that file?" (`ls data/harmonix/reference/`)
- "Adjust your command to match the actual filename"

**Result:** They debug themselves

---

### Issue: "Why is Goto 0.0 for both tempo and jitter?"

**Your response (excellent question!):**
- "Great question. What do these errors have in common?"
- "Tempo doubling: every beat is off by how much?"
- "Jitter: every beat drifts how much?"
- "What does that do to phase lock?" (both break it)

**Result:** They understand phase lock isn't perfect timing, it's consistency

---

### Issue: "Can I skip Part 3?"

**Your response (firm but kind):**
- "No. Part 1 and 2 teach facts. Part 3 teaches you to think."
- "You can't debug algorithms you don't understand."
- "Spend 90 minutes on this; save 40 hours next week."

**Result:** They invest in deep learning

---

## Success Signals (You'll See These)

### Signal 1: Active Discussion
Team starts asking each other: "What did you get for Goto?"
→ They're engaged, thinking

### Signal 2: "Aha!" Moments
"Oh! That's why Goto mattered"
→ Intuition building

### Signal 3: Linking Concepts
"So if Goto=0 means wrong tempo, then my algorithm is detecting..."
→ Diagnostic thinking developing

### Signal 4: Productive Debugging
"My prediction was wrong. Let me think about why..."
→ They're developing rigor

### Signal 5: Next-Week Readiness
"Now I understand how to tell if my detector is working"
→ Foundation is solid

---

## Post-Week 1: Your Responsibilities

### Immediately After (Same Day)

- [ ] Collect all results files
- [ ] Spot-check 3-5 for completeness
- [ ] Note any validation questions they struggled with
- [ ] Update your notes on team's understanding

### Before Week 2 (Next Day)

- [ ] Review all validation questions
- [ ] Identify anyone struggling with core concepts:
   - If yes: 15-min one-on-one before Week 2
   - If no: ready for Week 2

- [ ] Prepare Week 2 kick-off
   - Remind them of metrics learning
   - Show how Week 2 builds on Week 1
   - Get them excited to implement

### Hand Off to Week 2

Ensure:
- [ ] Team knows: "Week 1 learning prevents debugging hell next week"
- [ ] They can run eval_single.py and batch_evaluate.py
- [ ] They understand Goto diagnosis
- [ ] They're ready to build with confidence

---

## Optional: Group Debrief (If Time)

**Facilitating a team discussion:**

1. **Start with low-stakes question:**
   - "Who got surprised by Cemgil being lower?"

2. **Build on answers:**
   - "Why did that surprise you?"
   - "Who got the same surprise?"
   - "What does that teach us?"

3. **Connect to next phase:**
   - "How will this help you next week?"
   - "When your detector gives Goto=0, you'll know to..."

4. **Celebrate learning:**
   - "You now understand the diagnostics of beat tracking"
   - "Most people skip this and get lost in debugging"
   - "You're building a solid foundation"

---

## One-Page Leadership Mindset

> **Your job is not to teach the answer. Your job is to create the conditions for learning.**
>
> Ask questions. Point to resources. Let them struggle productively. Validate outputs.
>
> The goal: Team walks out of Week 1 understanding why metrics matter and how to interpret them.
>
> You'll know you succeeded when someone says: "So Goto=0 means I'm looking at the wrong problem, not just missing beats?"
>
> That's the insight that prevents weeks of wasted debugging effort.

---

## You've Got This

You're not the expert. You're the guide.

The infrastructure is ready. The materials are written. The examples are provided.

Your job: facilitate the team through deep learning.

See you on the other side of Week 1!

---

**Questions before you start?** See WEEK1_MIREX_METRICS_LEARNING.md

**During Week 1 stuck?** Check the FAQ in WEEK1_TEAM_EXECUTION_CHECKLIST.md

**After Week 1 assessment?** Refer to "Validation Checklist" above
