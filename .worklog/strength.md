<!-- markdownlint-disable -->

## Solution

**A thesis's strength is its step's strength times the strength of its weakest premise. A starting claim's strength is its rating.** It's a number from 0 to 1, computed in the reconstructed logic.

- **Why:** premises and steps fail differently.
  - **Premises don't add up:** a step needs all its premises, so it's only as strong as the weakest one. Five weak premises are no weaker than one, and splitting a thesis or sharing a premise changes nothing.
  - **Steps add up along a chain:** each non-deductive step is a leap with its own risk, so the leaps multiply. Three abductive steps in a row cost 0.8³ even when every claim is strong.
  - Unrolled, a thesis is as strong as its weakest chain: a starting claim's rating times the strength of every step from it up to the thesis.
- **Step strength:** 1 for a deductive step. For a non-deductive step, the rating of its condition. The reconstruction shows the condition as an implicit premise, but it counts as the step's strength, not as a premise.
- **Starting claim:** a thesis with no premises. There are two kinds:
  - **Explicit:** stated in the article, and rated by the checks (source, kind of backing, scope, relevance).
  - **Implicit:** a premise the reconstruction adds to fill a gap, rated by the checks like an explicit one.
- **Fixed numbers behind categories:** the LLM rates strong, weak or none, never in decimals, and each category has a fixed number:
  - **Starting claim:** strong 0.95, weak 0.6, none 0. A definition is 1: it doesn't limit strength.
  - **Non-deductive step:** strong is the cap of its reasoning type (generalization 0.9, abductive 0.8, analogy 0.7), weak 0.5, none 0. The cap means a non-deductive step never gives certainty, even when its condition is strong.
- **Original logic:** it doesn't show implicit premises, so its theses show the value computed in the reconstructed logic. Otherwise non-deductive steps would be free.
- **Exception, a flaw with no fix:** an inconsistency or an irrelevant conclusion doesn't come from any starting claim, so the thesis is set to 0.
- **Convergence:** reasons of the same type for one conclusion are merged into one step with pooled premises, and the pooled premises count together as one premise, the pool. A pool is rated as a whole, with the same checks applied to the body of evidence. Example: "the roofs are wet" (strong) and "a blurry photo shows a wet street" (weak) form a strong pool, so the photo no longer caps "it rained". A member also used outside the pool counts there on its own.
  - **Abductive:** one step over all the observations, whose condition is "nothing else explains all of them".
  - **Generalization:** the cases form one sample.
  - **Analogy:** one step from several source cases.
  - **Different types:** reasons of different types aren't merged; they're treated as all needed, so the weakest reason decides, which underrates the conclusion.
- **Labels:** strong at 0.7 and above, moderate from 0.45, weak below 0.45, none at 0. The same number can have different causes: a weak fact used directly scores 0.6, and so do two strong abductive steps in a row (0.61). The label says how sure; the weak links say why.
- **What limits a thesis:** the panel lists its weak links, the distinct starting claims, pools and conditions in its support rated weak or none, for example "limited by the pool of [16] and [17] weak, condition of [18] weak".
- **One claim per thesis:** a bundled thesis with one weak part makes every conclusion that uses it weak, even those that need only its strong parts. The reconstruction splits such theses.

## Calibration

Both example maps scored with the rules and numbers above, to check the labels. The results are computed by [strength.py](strength.py) from [strength-inputs.json](strength-inputs.json): `uv run .worklog/strength.py`.

**Inputs:** reasoning types and ratings assigned from the articles alone.
- **SDD** ([sdd-scrum-kanban.txt](sdd-scrum-kanban.txt)):
  - Steps: abductive 7, 10, 11, 14, 18, 20, 21; analogy 15; the rest deductive.
  - Starting claims: weak 1, 6, 16, 17; definition 3; the rest strong.
  - Conditions: weak for 7 and 18; the rest strong.
  - Pools: 16 and 17, the observations of abductive step 18, form one pool, rated weak. 17 is also a premise of 21 on its own.
- **Poetry** ([poetry.txt](poetry.txt)):
  - Steps: abductive 17, 18, 22, 23, 24, 25; analogy 11, 16; the rest deductive.
  - Starting claims: weak 3, 5, 21; definition 4; the rest strong.
  - Conditions: weak for 11, 16, 18, 23; the rest strong.

**Key points:** chosen by the key point rule: conclusions ranked by the number of theses behind them times the number depending on them, cut where a score falls below half of the previous one, at most 7.

**Results:** strength and label, then the weak links; "c18" is the condition of step 18, and "p16+17" is the pool of 16 and 17.
- **SDD:**
  - Key point scores: 18 (10), 11 (9), 5 (8), 20 (7), 10 (6), 14 (6), 15 (5); cut before 2
  - Final conclusion:
    - [22] Living, fitted, measured: 0.24 weak; weak links: 1, 6, 17, p16+17, c7, c18
  - Key points:
    - [5] The tension: frozen vs living: 0.95 strong
    - [10] Pick the lowest rung that fits: 0.76 strong
    - [11] The spec lives in the sprint: 0.76 strong
    - [14] Scrum: DoR as agreement: 0.61 moderate
    - [15] Kanban: the commitment point: 0.53 moderate
    - [18] Fit decides, not presence: 0.30 weak; weak links: p16+17, c18
    - [20] Roll it out as an experiment: 0.24 weak; weak links: p16+17, c18
- **Poetry:**
  - Key point scores: 13 (28), 18 (27), 11 (25), 10 (24), 19 (22), 6 (21); cut before 6
  - Final conclusions:
    - [20] Блоки по силам: 0.15 weak; weak links: 5, c11, c18
    - [27] Таблетки нет, отвечать тебе: 0.15 weak; weak links: 3, 5, 21, c11, c16, c18, c23
  - Key points:
    - [6] Легко, но сложно: 0.60 moderate; weak links: 5
    - [10] Автономия или контроль: 0.60 moderate; weak links: 5
    - [11] Есть точка баланса: 0.30 weak; weak links: 5, c11
    - [13] Универсального метода нет: 0.30 weak; weak links: 5, c11
    - [18] Опора на ценности Agile: 0.15 weak; weak links: 5, c11, c18
    - [19] Ответственность на человеке: 0.15 weak; weak links: 5, c11, c18
  - Other theses:
    - [22] Следить за качеством кода: 0.48 moderate; weak links: 21
    - [23] Ревью через переписывание: 0.24 weak; weak links: 21, c23
    - [26] Архитектура за человеком: 0.60 moderate; weak links: 21

**Findings**

1. **The size of an argument no longer pushes strength toward 0.** SDD 22 scores 0.24 and poetry 27 0.15: weak because of their weak links, not their size. With every rating strong, SDD 22 would score 0.49.
2. **The weakest chain decides.** Poetry 18, 19, 20 and 27 all score 0.15, from the chain that starts at weak starting claim 5 and passes the weak conditions of 11 and 18 (0.6 × 0.5 × 0.5). Further weak links, such as 3, 21, c16 and c23 for 27, don't lower it; the weak-link list shows them.
3. **The overlap is about meaning, not size.** Poetry 6 and 10 (0.60, one weak starting claim used directly) score above SDD 15 (0.53, no weak links, but an analogy after an abductive step). Both are moderate.
4. **Caps by type matter only for a strong analogy or generalization condition.** In both maps only SDD 15 has one: 0.53 instead of 0.61 with a single cap of 0.8, and the label stays moderate.
5. **Bundling spreads weakness.** Poetry 21 bundles six axioms. Only axiom 3 is weak and only 26 uses it, yet 22 and 23 also list 21 as a weak link. Split into separate axioms, 22 would score 0.76 (strong) instead of 0.48 (moderate).
6. **Final conclusions that summarize are deductive.** Both articles end by restating earlier conclusions, so SDD 22 and poetry 27 are deductive steps. Claims that look new in them were argued earlier: "SDD strengthens Agile" comes from SDD 18 ("The data confirms the direction", [sdd:114](sdd-scrum-kanban.txt#L114)), and "work from goals, values and principles" from poetry 18. A summary that adds a claim nothing earlier argues has a gap (a missing premise or a non sequitur), not a different reasoning type.
   - **Map correction (applied to the example):** SDD 22's premises now include all of the article's own takeaways ([sdd:156-160](sdd-scrum-kanban.txt#L156-L160)): 5, 10 and 18 were added to 2, 7, 14, 15, 20 and 21, so that 18 is a direct premise. 2, 7 and 21 stay, because dropping them would leave them as dead ends. Its strength doesn't change: the weakest premise is still 20 (0.24).
   - **The opening question answered with a different comparison** is an irrelevant-conclusion issue in 22's note, not part of its claim, so it doesn't change the reasoning type.
