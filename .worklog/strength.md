<!-- markdownlint-disable -->

## Calibration

Both example maps scored with the rules and numbers in [plan-01.md → Strength](plan-01.md#strength), to check how the numbers behave. The results are computed by [strength.py](strength.py) from [strength-inputs.json](strength-inputs.json): `uv run .worklog/strength.py`.

**Inputs:** reasoning types and ratings assigned from the articles alone.
- **SDD** ([sdd-scrum-kanban.txt](sdd-scrum-kanban.txt)):
  - Steps: abductive 7, 10, 11, 14, 18, 20, 21; analogy 15; the rest deductive.
  - Starting claims: weak 1, 6, 16, 17; definition 3; the rest supported.
  - Implicit conditions: weak for 7 and 18; the rest strong.
  - Pools: 16 and 17, the observations of abductive step 18, form one pool: two weak members, 0.82. 17 is also a premise of 21 on its own.
- **Poetry** ([poetry.txt](poetry.txt)):
  - Steps: abductive 17, 18, 22, 23, 24, 25; analogy 11, 16; the rest deductive.
  - Starting claims: weak 3, 5, 21; definition 4; the rest supported.
  - Implicit conditions: weak for 11, 16, 18, 23; the rest strong.

**Key points:** chosen by the key point rule: conclusions ranked by the number of theses behind them times the number depending on them, cut where a score falls below half of the previous one, at most 7.

**Results:** strength of each thesis.
- **SDD:**
  - Key point scores: 18 (10), 11 (9), 5 (8), 20 (7), 10 (6), 14 (6), 15 (5); cut before 2
  - Final conclusion:
    - [22] Living, fitted, measured: 0.38
  - Key points:
    - [5] The tension: frozen vs living: 0.95
    - [10] Pick the lowest rung that fits: 0.76
    - [11] The spec lives in the sprint: 0.76
    - [14] Scrum: DoR as agreement: 0.61
    - [15] Kanban: the commitment point: 0.53
    - [18] Fit decides, not presence: 0.48
    - [20] Roll it out as an experiment: 0.38
- **Poetry:**
  - Key point scores: 13 (28), 18 (27), 11 (25), 10 (24), 19 (22), 6 (21); cut before 6
  - Final conclusions:
    - [20] Блоки по силам: 0.34
    - [27] Таблетки нет, отвечать тебе: 0.27
  - Key points:
    - [6] Легко, но сложно: 0.60
    - [10] Автономия или контроль: 0.60
    - [11] Есть точка баланса: 0.42
    - [13] Универсального метода нет: 0.42
    - [18] Опора на ценности Agile: 0.34
    - [19] Ответственность на человеке: 0.34
  - Other theses:
    - [22] Следить за качеством кода: 0.48
    - [23] Ревью через переписывание: 0.38
    - [26] Архитектура за человеком: 0.60

**Findings**

1. **The size of an argument doesn't push strength toward 0.** SDD 22 scores 0.38 and poetry 27 0.27: lower than a sound argument of the same shape because of their weak ratings, not their size. With every starting claim supported and every implicit condition strong, SDD 22 would score 0.49 and poetry 27 0.43.
2. **The weakest chain decides.** Poetry 27's 0.27 comes from one chain: the weak implicit condition of 16 (0.6), then the analogy 16 and the abductive steps 17 and 24 (0.6 × 0.7 × 0.8 × 0.8). Poetry 18, 19 and 20 score 0.34, from weak starting claim 5 through the analogy 11 and the abductive step 18 (0.6 × 0.7 × 0.8).
3. **Weak ratings don't add up, even along a chain.** The chain behind poetry 18 has three weak ratings (starting claim 5 and the implicit conditions of 11 and 18), yet it scores 0.34, the same as with 5 alone. Only step strengths add up.
4. **The overlap is about meaning, not size.** Poetry 6 and 10 (0.60, one weak starting claim used directly) score above SDD 15 (0.53, nothing rated weak, but an analogy after an abductive step). The number says how sure, not why.
5. **Step strength by type matters wherever an analogy is in the chain.** With one strength of 0.8 for every non-deductive type, SDD 15 would score 0.61 instead of 0.53, poetry 11 and 13 0.48 instead of 0.42, poetry 18–20 0.38 instead of 0.34, and poetry 27 0.31 instead of 0.27.
6. **Bundling spreads weakness.** Poetry 21 bundles six axioms. Only axiom 3 is weak and only 26 uses it, yet 22 and 23 also rest on 21, which is rated weak as a whole. Split into separate axioms, 22 would score 0.76 instead of 0.48.
7. **Final conclusions that summarize are deductive.** Both articles end by restating earlier conclusions, so SDD 22 and poetry 27 are deductive steps. Claims that look new in them were argued earlier: "SDD strengthens Agile" comes from SDD 18 ("The data confirms the direction", [sdd:114](sdd-scrum-kanban.txt#L114)), and "work from goals, values and principles" from poetry 18. A summary that adds a claim nothing earlier argues has a gap (a missing premise or a non sequitur), not a different reasoning type.
   - **Map correction (applied to the example):** SDD 22's premises now include all of the article's own takeaways ([sdd:156-160](sdd-scrum-kanban.txt#L156-L160)): 5, 10 and 18 were added to 2, 7, 14, 15, 20 and 21, so that 18 is a direct premise. 2, 7 and 21 stay, because dropping them would leave them as dead ends. Its strength doesn't change: the weakest premise is still 20 (0.38).
   - **The opening question answered with a different comparison** is an irrelevant-conclusion issue in 22's note, not part of its claim, so it doesn't change the reasoning type.
8. **A larger pool doesn't get past a weak implicit condition.** The SDD pool of 16 and 17 scores 0.82, above either member (0.6), yet 18 stays at 0.48: its implicit condition is weak (fit is judged after the fact), and that's now the weakest part.
