# Analyze reasoning

Part of the ergomap skill: read it when the user asks to analyze reasoning, right after writing the data (SKILL.md).

Add `analysis` to the data. Write explanations, reasons, conditions and definitions in the article's language; quote the article verbatim. You pick names (reasoning types, verdicts, ratings), never numbers: the viewer computes every strength.

## Issues

`issues`: places where the reasoning fails or is weak. Find them in the original logic. Each issue:

- `type`, one of:
  - `non-sequitur`: the conclusion doesn't follow, and no plausible unstated premise would make it follow
  - `missing-premise`: it follows only with a premise the article doesn't state but plausibly relies on
  - `circular`: a premise already assumes the conclusion
  - `equivocation`: one term used for two concepts, so an inference connects claims about different things
  - `straw-man`: an opposing view restated in a weaker form, then refuted
  - `inconsistency`: two theses that can't both be true
  - `irrelevant-conclusion`: the conclusion answers a different question than the one the article posed
- `severity`: `flaw` if some conclusion doesn't follow as stated, `weakness` if the reasoning holds, but less firmly than the article presents it
- `target` and `theses`: `inference` (the conclusion and, optionally, the premises at fault), `thesis` (one), `pair` (two), `concept` (also `concept`: a term from Concepts), or `argument` (the whole argument)
- `explanation`: one or two sentences
- `quote`: a short verbatim quote from the article that shows the issue. Required: an issue you can't quote is an issue you shouldn't report

Hasty generalization, post hoc, questionable cause, ignored alternative and weak analogy are not issue types: they make the implicit condition of a step weak or none (Steps and verdicts), and the name goes in that rating's reason, for example "post hoc: no alternative ruled out".

## Reconstructed logic

`reconstructed`: every thesis of the reconstructed logic, the original made explicit. Theses keep their ids; a thesis with the same id inherits `label`, `text`, `note` and `section` from the original, so give only what changes. New theses, the implicit premises, take the next free numbers and need a `label`, a `text` and usually a `section`. `from` is never inherited: write it for every conclusion.

- Fix: one minimal change that repairs one issue and keeps the author's conclusion: state an implicit premise, change a conclusion's premises, or reword a thesis. Mark every thesis a fix added or changed with `"fixes": ["<issue id>"]`. A premise that only restates the step ("if the premises hold, the conclusion holds") is not a fix
- Implicit premises: a gap with a plausible fix gets a new starting claim, judged like any other
- Convergence: reasons of the same type for one conclusion, each sufficient alone (several observations explained by one cause, several source cases for one analogy), are one step; list them in `pool`, which must be a subset of `from`. Members resting on the same source count as one, so list only one of them. Not for generalization: its cases are already one step's premises. Reasons of different types for one conclusion are separate steps: give `steps: [{ from, type, condition, pool }, …]` instead of `from`
- Summaries: a final conclusion that restates earlier conclusions is deductive. A claim in it that nothing earlier argues is a gap, not another type
- A flaw with no fix (an inconsistency or an irrelevant conclusion, say) stays: set `"flaw": "<issue id>"` on the conclusion it breaks, and its strength becomes 0

## Steps and verdicts

Every conclusion has a `type`, `deductive` by default:

- `deductive`: follows necessarily. No condition
- `generalization`: from cases to a general claim. Condition: the cases are enough and representative. Strong: many varied cases, not hand-picked, no known counterexamples, a conclusion no broader than the cases; weak: few or similar cases; none: one case behind a general claim
- `abductive`: from an effect, observed or wanted, to the cause or action that best accounts for it. Condition: nothing else fits as well, and its other consequences hold up. Strong: the main alternatives ruled out (for a wanted effect: compared, side effects acceptable); weak: alternatives not checked; none: an alternative fits better or an observation contradicts it. A prediction from cause to effect is deductive
- `analogy`: what holds for one case holds for another. Condition: the cases are alike in the respect that matters. Strong: they share the features that matter, no relevant difference known; weak: similar in general, relevance not shown; none: a difference that matters is known

Every non-deductive step gets `"condition": { "text", "rating": "strong" | "weak" | "none", "reason" }`. The reason is a few words; it is shown as the weakest link when it limits a conclusion, so make it say what's missing.

Every starting claim gets a `verdict` and a `reason` that points to its backing in the article, or says there is none. Check the source (named and checkable? an expert on this exact point?), the kind of backing (study, case, anecdote, bare assertion), the scope (does it cover as much as the claim says?) and relevance; the author's own hedges count against a claim that goes beyond them.

- `supported`: a checkable source that covers the claim's scope, or common knowledge nobody disputes; a value judgment most readers accept
- `weak`: some backing that falls short on at least one check; a contested value judgment
- `unsupported`: only the author's assertion
- `false`: contradicted by the article itself
- `definition`: a definition; not rated

## Concepts

`concepts`: up to 7 terms the reader needs to follow the argument: `{ "term", "senses": [{ "definition", "theses" }] }`. A term the article uses in two senses lists both, each with the theses that use it; that's where equivocations show.

## Optimized logic

`optimized`: the reconstructed logic reduced to the fewest starting claims that keep every final conclusion at the same strength (Check strength). Only ids from the reconstructed logic; each inherits everything but `from` and `pool`, so most entries are just `{ "id": 3 }` or `{ "id": 29, "from": [11, 27] }`. A conclusion may take an earlier conclusion instead of the steps between, if its claim still follows. Every conclusion keeps the premises its claim needs (Validate in SKILL.md). A final conclusion with strength 0 stays as it is.

## Check strength

The viewer computes strength; compute it yourself to check the optimized logic and to know which links are weakest:

- A starting claim: supported 0.95, weak 0.6, unsupported 0, false 0, definition 1
- A conclusion: step strength × the weakest of its premises and its condition. Step strength: deductive 1, generalization 0.9, abductive 0.8, analogy 0.7. Condition: strong 0.95, weak 0.6, none 0
- A pool, and separate steps of one conclusion: 0.95 × (1 − (1 − s₁/0.95)(1 − s₂/0.95)…), each s at most 0.95
- A conclusion with a `flaw`: 0

The viewer chooses the key points itself: conclusions ranked by the theses behind them times the theses depending on them.

```json
"analysis": {
  "issues": [{ "id": "i1", "type": "non-sequitur", "severity": "flaw", "target": "inference", "theses": [28, 29], "explanation": "…", "quote": "…" }],
  "concepts": [{ "term": "Spec level", "senses": [{ "definition": "A rung of the ladder", "theses": [11, 16] }, { "definition": "A level of abstraction", "theses": [17] }] }],
  "reconstructed": [
    { "id": 25, "verdict": "unsupported", "reason": "The fit is read off the good outcome." },
    { "id": 27, "verdict": "weak", "reason": "One unnamed practitioner's experiment." },
    { "id": 29, "from": [11, 26, 27], "pool": [26, 27], "type": "abductive", "condition": { "text": "Nothing but the fit explains the outcomes.", "rating": "weak", "reason": "fit is judged after the fact" }, "fixes": ["i1"] }
  ],
  "optimized": [{ "id": 27 }, { "id": 29, "from": [11, 27] }]
}
```
