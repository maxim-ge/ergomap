<!-- markdownlint-disable -->

## Solution

**A thesis's strength is its step's strength times the weakest of its premises and its implicit condition. A starting claim's strength is its rating.** It's a number from 0 to 1, computed in the reconstructed logic.

- **Why:** what a step needs and the step itself fail differently.
  - **Premises and implicit conditions don't add up:** a step needs all of them, so it's only as strong as the weakest one. Five weak premises are no weaker than one, and splitting a thesis or sharing a premise changes nothing.
  - **Steps add up along a chain:** each non-deductive step is a leap with its own risk, so the step strengths multiply. Three abductive steps in a row cost 0.8³ even when everything they rest on is strong.
  - Unrolled, a thesis is as strong as its weakest chain: the rating of a starting claim or implicit condition, times the strength of every step from it up to the thesis.
- **Step strength:** fixed by the reasoning type: deductive 1, generalization 0.9, abductive 0.8, analogy 0.7. It's the built-in risk of that kind of step, the same for every step of the type.
- **Implicit condition:** what a non-deductive step relies on. It's rated by its reasoning type's criteria and shown on its step, not as a node, but in the calculation it joins the premises: a weak condition limits the conclusion the way a weak premise does.
- **Starting claim:** a thesis with no premises. There are two kinds:
  - **Explicit:** stated in the article, and rated by the checks (source, kind of backing, scope, relevance).
  - **Implicit premise:** a premise the reconstruction adds to fill a gap, rated by the checks like an explicit one.
- **Fixed numbers behind ratings:** the LLM rates strong, weak or none, never in decimals. Starting claims and implicit conditions share one scale: strong 0.95, weak 0.6, none 0. A definition is 1: it doesn't limit strength.
- **Original logic:** it doesn't show implicit premises or conditions, so its theses show the value computed in the reconstructed logic. Otherwise non-deductive steps would be free.
- **Exception, a flaw with no fix:** an inconsistency or an irrelevant conclusion doesn't come from any starting claim, so the thesis is set to 0.
- **Convergence:** reasons of the same type for one conclusion are merged into one step with pooled premises, and the pooled premises count together as one premise, the pool. A pool is rated as a whole, with the same checks applied to the body of evidence. Example: "the roofs are wet" (strong) and "a blurry photo shows a wet street" (weak) form a strong pool, so the photo no longer caps "it rained". A member also used outside the pool counts there on its own.
  - **Abductive:** one step over all the observations, whose implicit condition is "nothing else explains all of them".
  - **Generalization:** the cases form one sample.
  - **Analogy:** one step from several source cases.
  - **Different types:** reasons of different types aren't merged; they're treated as all needed, so the weakest reason decides, which underrates the conclusion.
- **Labels:** deferred. For now a thesis shows only its strength.
- **One claim per thesis:** a bundled thesis with one weak part makes every conclusion that uses it weak, even those that need only its strong parts. The reconstruction splits such theses.

## Calibration

Both example maps scored with the rules and numbers above, to check how the numbers behave. The results are computed by [strength.py](strength.py) from [strength-inputs.json](strength-inputs.json): `uv run .worklog/strength.py`.

**Inputs:** reasoning types and ratings assigned from the articles alone.
- **SDD** ([sdd-scrum-kanban.txt](sdd-scrum-kanban.txt)):
  - Steps: abductive 7, 10, 11, 14, 18, 20, 21; analogy 15; the rest deductive.
  - Starting claims: weak 1, 6, 16, 17; definition 3; the rest strong.
  - Implicit conditions: weak for 7 and 18; the rest strong.
  - Pools: 16 and 17, the observations of abductive step 18, form one pool, rated weak. 17 is also a premise of 21 on its own.
- **Poetry** ([poetry.txt](poetry.txt)):
  - Steps: abductive 17, 18, 22, 23, 24, 25; analogy 11, 16; the rest deductive.
  - Starting claims: weak 3, 5, 21; definition 4; the rest strong.
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

1. **The size of an argument doesn't push strength toward 0.** SDD 22 scores 0.38 and poetry 27 0.27: lower than a sound argument of the same shape because of their weak ratings, not their size. With every rating strong, SDD 22 would score 0.49 and poetry 27 0.43.
2. **The weakest chain decides.** Poetry 27's 0.27 comes from one chain: the weak implicit condition of 16 (0.6), then the analogy 16 and the abductive steps 17 and 24 (0.6 × 0.7 × 0.8 × 0.8). Poetry 18, 19 and 20 score 0.34, from weak starting claim 5 through the analogy 11 and the abductive step 18 (0.6 × 0.7 × 0.8).
3. **Weak ratings don't add up, even along a chain.** The chain behind poetry 18 has three weak ratings (starting claim 5 and the implicit conditions of 11 and 18), yet it scores 0.34, the same as with 5 alone. Only step strengths add up.
4. **The overlap is about meaning, not size.** Poetry 6 and 10 (0.60, one weak starting claim used directly) score above SDD 15 (0.53, nothing rated weak, but an analogy after an abductive step). The number says how sure, not why.
5. **Step strength by type matters wherever an analogy is in the chain.** With one strength of 0.8 for every non-deductive type, SDD 15 would score 0.61 instead of 0.53, poetry 11 and 13 0.48 instead of 0.42, poetry 18–20 0.38 instead of 0.34, and poetry 27 0.31 instead of 0.27.
6. **Bundling spreads weakness.** Poetry 21 bundles six axioms. Only axiom 3 is weak and only 26 uses it, yet 22 and 23 also rest on 21, which is rated weak as a whole. Split into separate axioms, 22 would score 0.76 instead of 0.48.
7. **Final conclusions that summarize are deductive.** Both articles end by restating earlier conclusions, so SDD 22 and poetry 27 are deductive steps. Claims that look new in them were argued earlier: "SDD strengthens Agile" comes from SDD 18 ("The data confirms the direction", [sdd:114](sdd-scrum-kanban.txt#L114)), and "work from goals, values and principles" from poetry 18. A summary that adds a claim nothing earlier argues has a gap (a missing premise or a non sequitur), not a different reasoning type.
   - **Map correction (applied to the example):** SDD 22's premises now include all of the article's own takeaways ([sdd:156-160](sdd-scrum-kanban.txt#L156-L160)): 5, 10 and 18 were added to 2, 7, 14, 15, 20 and 21, so that 18 is a direct premise. 2, 7 and 21 stay, because dropping them would leave them as dead ends. Its strength doesn't change: the weakest premise is still 20 (0.38).
   - **The opening question answered with a different comparison** is an irrelevant-conclusion issue in 22's note, not part of its claim, so it doesn't change the reasoning type.
