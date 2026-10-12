<!-- markdownlint-disable -->

# Plan

## Terminology

### Core logic terms

- **Thesis:** one claim.
- **Premise:** a thesis that a conclusion follows from. A conclusion's premises are the theses it follows from.
- **Conclusion:** a thesis with premises; it needs all of them.
- **Inference:** a conclusion together with its premises; one step of reasoning.
- **Starting claim:** a thesis with no premises; the article takes it as given.
- **Final conclusion:** a conclusion that nothing else follows from.
- **Implicit premise:** a premise the author relies on but doesn't state. There are two kinds: one that fills a gap in a step (a missing premise), and the condition of a non-deductive step. The original logic doesn't show them; the reconstructed logic adds them, including the condition of every non-deductive step.

### Argument structure

- **Key point:** a conclusion that carries the argument: much of the reasoning gathers in it, and much of the reasoning toward the final conclusions continues from it.
- **Foundation:** a starting claim that many conclusions depend on.
- **Concept:** a term that several theses use and that the reader needs to understand to follow the argument.

### Reasoning types

- **Reasoning type:** the rule by which an inference gets from its premises to its conclusion. A deductive rule guarantees the conclusion when the premises are true; every other rule also needs an implicit premise, its condition. The reconstructed logic states the implicit premise, and it limits the conclusion's strength like any other premise. A type is recognized by matching the step's premises to a rule.

#### Deductive

The conclusion follows necessarily from the premises.

- Rule: if A then B; A → B.
- Implicit premise: none.
- Typical issues: non sequitur, missing premise.
- Example: "If it rains, the street gets wet. It's raining. So the street is wet."
- Fails (non sequitur): "If it rains, the street gets wet. The street is wet. So it rained." A street cleaner could have wet it.

#### Generalization (inductive)

From cases to a general claim.

- Rule: cases 1…n have P → such cases have P.
- Implicit premise: the cases are enough and representative.
- Typical issue: hasty generalization.
- Example: "Every swan I've seen is white. So swans are white."
- Fails (hasty generalization): all the swans seen were in Europe, and black swans live in Australia.

#### Abductive (best explanation or best action)

From a given effect, observed or wanted, to the cause that best accounts for it.

- Rule: effect E is observed or wanted; C would bring about E → C.
- Implicit premise: no other cause fits E as well, and C's other consequences hold up. For an observed effect: not chance, another cause or the reverse direction, and C's other consequences match what's observed. For a wanted effect: no better action, and the side effects are acceptable.
- Typical issues: post hoc, questionable cause, ignored alternative.
- Example, observed effect: "The grass is wet this morning. Rain overnight would explain it. So it rained."
- Fails (questionable cause): the sprinklers ran overnight.
- Fails (post hoc): "I took a vitamin and my cold went away, so the vitamin cured it." Colds go away on their own.
- Example, wanted effect: "I want to be at work by 9. The train gets me there by 8:45. So I'll take the train."
- Fails (ignored alternative): cycling gets there by 8:30 and costs nothing.
- Not this type: a prediction from cause to effect, which is deductive.

#### Analogy

What holds for one case holds for another.

- Rule: A has P; B is like A → B has P.
- Implicit premise: A and B are alike in the respect that matters for P.
- Typical issue: weak analogy.
- Example: "My old car of this model ran 300,000 km. My new car is the same model. So it will run 300,000 km too."
- Fails (weak analogy): the new one has a different engine, and the engine is what matters for mileage.

### Strength

- **Strength:** how firmly a thesis holds, on one scale for every thesis: strong / weak / none.
- **Rule:** a thesis is as strong as its weakest premise, explicit or implicit.
  - A starting claim has no premises; its strength comes from its verdict (Starting claim strength, below).
  - A deductive step adds no implicit premise. A non-deductive step adds one, its condition, rated by its reasoning type's criteria (Implicit premise strength, below).
- **Generalization:** its cases count together as one premise, the sample, so a doubtful case weakens the sample rather than capping the conclusion on its own.
- **A gap no plausible premise closes, or another flaw with no fix:** the conclusion is none.
- **Independent reasons for one conclusion:** treated as all needed. This underrates rather than overrates, which is the safer error for an audit.
- **Examples:**
  - "Copper is a metal (strong). Metals conduct electricity (strong). So copper conducts": deductive, no implicit premise, strong. If "copper is a metal" were weak, the conclusion would be weak.
  - "80% of 2,000 randomly chosen viewers liked the film. So most viewers like it": the implicit premise "the viewers are representative" is strong, so the conclusion is strong. "3 friends liked it. So people like it": the implicit premise is weak, so the conclusion is weak.
  - "The grass is wet; the sprinklers were off, and the roofs are wet too. So it rained": the implicit premise "no other cause fits as well" is strong. The same without checking the sprinklers: weak.

### Starting claim strength

- **Assessment:** a starting claim's verdict measures how well its backing in the article matches what the claim says. The same backing can make a modest claim supported and a sweeping one weak.
- **Checks** for a factual claim:
  - **Source:** named and checkable, or anonymous? When the source is an expert: competent on this exact point, and other experts don't disagree.
  - **Kind of backing:** a controlled study, a case, an anecdote, or a bare assertion?
  - **Scope:** does the backing cover as much as the claim says?
  - **Relevance:** is the backing about the same thing as the claim?
  - The author's own hedges ("unverified", "a single project") count against a claim that goes beyond them.
- **Verdicts:**
  - **Supported:** a checkable source that covers the claim's scope, or common knowledge nobody disputes. Example: "Water boils at 100 °C at sea level."
  - **Weak:** some backing, but it falls short on at least one check. Example: "Remote teams are more productive", backed by one company's survey.
  - **Unsupported:** only the author's assertion. Example: "Most startups fail because of bad hiring", with no backing.
  - **False:** contradicted by the article itself or, if outside sources are used, by a checked source. Example: "The Great Wall of China is visible from space with the naked eye."
- **Strength:** the verdict mapped to the scale: supported → strong, weak → weak, unsupported or false → none.
- **Expert backing:** "A cardiologist says this drug lowers blood pressure" is supported; "A cardiologist says this tax policy is good" is weak, because the expertise doesn't cover the claim.
- **Definitions:** not rated, and they don't limit strength. Example: "A sprint is a fixed time box." Using a term in two senses is an equivocation issue.
- **Value judgments:** supported if most readers would accept them, weak if contested. Examples: "Code should be readable" is supported; "Tabs are better than spaces" is weak.
- **Reason:** every verdict has a short reason that points to the backing in the article, or says there is none.

### Implicit premise strength

- **Implicit premise strength:** the implicit premise of a non-deductive step is rated by its reasoning type's criteria below, not by the starting claim checks. In the reconstructed logic it's shown as a thesis marked added; in the original logic, its rating is shown with the conclusion.
  - Example: "Every swan I've seen is white → swans are white" becomes "Every swan I've seen is white" + "The swans I've seen are representative of all swans" (added, weak: all of them were in Europe) → "swans are white".
- **Generalization:** strong with many varied cases, not hand-picked, no known counterexamples, and a conclusion no broader than the cases ("most", not "all"); weak with few or similar cases; none with a single case behind a general claim.
- **Abductive:** strong when the main alternatives are ruled out and the cause explains all the observations, or, for a wanted effect, when the alternatives were compared and the side effects are acceptable; weak when the alternatives weren't checked; none when an alternative fits better or an observation contradicts the cause.
- **Analogy:** strong when the two cases share the features that matter for P and no relevant difference is known; weak when they're similar in general but the relevance isn't shown; none when a difference that matters is known.

### Graph

The map shows the logic as a graph:
- **Node:** a thesis, with its number and label.
- **Arrow:** from a premise to the conclusion that follows from it. A conclusion's incoming arrows are its inference.
- **Ends:** a starting claim has no incoming arrows, and a final conclusion has no outgoing ones.
- **Implicit premises:** shown only in the reconstructed and optimized logic, marked as added.
- **Strength, verdicts and issues:** shown as marks on nodes and arrows; how they look is described in What the reader sees → Map view.
- **Key points and concepts:** listed in the Summary view; each one opens the graph at its theses.

### Audit

- **Issue:** a place where the reasoning fails or is weak. It targets an inference, a thesis, a concept, a pair of theses or the whole argument.
- **Issue type:** the kind of problem, from a fixed list:
  - **Non sequitur:** the conclusion doesn't follow from its premises, and no plausible implicit premise would make it follow.
  - **Missing premise:** the conclusion follows only with a premise the article doesn't state but plausibly relies on. The reconstructed logic states it as an implicit premise.
  - **Circular reasoning:** a premise already assumes the conclusion.
  - **Equivocation:** one term used for two different concepts, so an inference connects claims about different things.
  - **Questionable cause:** a cause is asserted without ruling out other explanations.
  - **Post hoc:** an outcome that came after a change is taken as caused by it.
  - **Hasty generalization:** a general claim drawn from too few cases.
  - **Straw man:** an opposing view restated in a weaker form, then refuted.
  - **Inconsistency:** two theses that can't both be true.
  - **Irrelevant conclusion:** the conclusion answers a different question than the one the article posed.
- **Severity:** flaw or weakness.
  - **Flaw:** breaks the reasoning; some conclusion doesn't follow as stated.
  - **Weakness:** the reasoning holds, but less firmly than the article presents it.
- **Verdict:** for a starting claim: supported / weak / unsupported / false. For a key point: holds / weak / doesn't hold.

### Logic versions

- **Original logic:** the reasoning as the author gives it.
- **Reconstructed logic:** the original made explicit. Every issue that has a fix is repaired, and issues with no fix stay visible. Each implicit premise it adds gets a rating: one that fills a gap is linked to the issue it fixes and gets a verdict like any other starting claim; a condition is rated by its reasoning type's criteria.
- **Fix:** one minimal change that repairs one issue and keeps the author's conclusion: state an implicit premise, split a thesis, change a conclusion's premises, or reword a thesis. Some issues have none, for example an inconsistency or an irrelevant conclusion. A premise that only restates the step ("if the premises hold, the conclusion holds") is not a fix.
- **Optimized logic:** the reconstructed logic reduced to the fewest starting claims that still yield the same final conclusions. Final conclusions that don't hold stay as they are; only the support of the ones that hold is reduced.

## Goal

Extend ergomap from an argument map to an argument analysis. A page shows:
- Key points (up to 7)
- Key concepts (up to 7)
- Premise validation
- Original logic
- Fixed logic
- Optimized logic: the same conclusions with fewer premises

Examples refer to the theses in [examples/sdd-scrum-kanban.json](../examples/sdd-scrum-kanban.json).


## Overview

The six items group into three parts:
1. **Summary:** key points and key concepts
2. **Audit:** issues (fallacies, gaps) and premise validation
3. **Logic:** original, fixed and optimized, as three states of one map

The audit adds one item to the goal: an explicit list of issues. Every fix in the fixed logic points to the issue it fixes; without the list, the fixed logic is a black box. The audit covers both halves of judging an argument:
- **Issues:** does each conclusion follow from its premises?
- **Premise validation:** are the premises true?

The plan describes the parts in four layers, each in its own terms: what the reader sees, how the analysis is made, data, and the viewer implementation.

## What the reader sees

The page answers the reader's questions, bottom line first:
1. What does the article claim, and does it hold up? → key points, each with a verdict
2. Which terms does it rest on? → key concepts
3. How does it argue? → the map
4. Where does the reasoning break? → issues, marked on the map
5. What would a sound version look like? → the fixed and optimized maps

### Summary view

Opens first. The sketch uses the SDD article; verdicts and counts are illustrative.

```
SDD in Scrum and Kanban
Source: Spec-Driven Development in Scrum and Kanban · Jaroslaw Wasowski

[ Summary ]   Map

Key points
  ✓ Holds   The real tension is a frozen spec vs a living one
  ✓ Holds   Pick the lowest SDD level that fits the problem
  ✓ Holds   The spec lives inside the sprint, as a DoR agreement
  ! Weak    Fitting the level decides the outcome
            The success cases aren't about AI agents; "fit" is judged after the fact
  ✓ Holds   Measure instead of trusting perception

Key concepts
  SDD            a contract first, an agent builds from it      ! two senses
  Spec level     spec-first / spec-anchored / spec-as-source    ! two senses
  Living spec    a contract that matures inside the sprint
  ...

Issues: 4 flaws, 4 weaknesses · Premises: 7 supported, 3 weak, 1 unsupported
  Flaw   Doesn't follow (non sequitur)       a mandate failure taken as proof of "fit"
  Flaw   Circular                            "fit" is judged by the outcome
  ...
```

- **Key points:** each has a verdict: Holds / Weak / Doesn't hold. Anything other than "Holds" gets a one-line reason.
- **Key concepts:** a term used in two senses is marked, and both senses are shown.
- **Issues:** ordered by severity. The plain name comes first and the textbook name second. Opening an issue shows the explanation, a quote from the article and the theses involved.
- Every item opens the map at the relevant place.

### Map view

- The map as now, with marks added:
  - **Premise:** how well supported it is, shown by border and icon, not by color alone
  - **Conclusion with a broken step:** a warning badge
  - **Broken link:** a dashed red line
- A switch changes between Original, Fixed and Optimized; nodes stay in place.
  - **Fixed:** added premises, including the condition of every non-deductive step, and split theses are marked "added", and each change names the issue it fixes. The only marks left are weak premises.
  - **Optimized:** theses not needed for the key points fade out, and a counter shows the reduction, for example "22 → 15 theses, 11 → 7 premises".
- The panel for a selected thesis also shows:
  - **For a premise:** its verdict and the reason
  - **For any thesis:** the issues that touch it
  - **For a conclusion:** its strength, for example "as strong as its weakest premise: [16]", and in the original logic its step's type and strength, for example "Generalization, weak: three hand-picked cases"

### Pages without analysis

They work as now: the page opens on the map, with no Summary view.

## How the analysis is made

### Key points and concepts

- **Key points:** up to 7. Each is a conclusion in the map, not a free-standing summary, so it opens in the map and its verdict comes from the analysis. Key points also define what the optimized logic must preserve.
- **Key point verdict:** the key point's strength in the fixed logic. Supported → Holds, weak → Weak, unsupported or false → Doesn't hold.
- **Key concepts:** up to 7. Each has a term, a one-line definition and the theses that use it. This is where equivocations live: "SDD" (an agent building from a spec vs any kind of spec) and "level" (rung vs abstraction). An issue can point at a concept.

### Issues

- An issue can target:
  - **Inference** (a conclusion and the theses it follows from): the non sequitur 17 → 18, the questionable cause 6 → 7
  - **Premise:** "after" taken as "because of" in 16
  - **Concept:** "level", "SDD"
  - **Pair of theses:** 5 vs 18 each name a different deciding factor
  - **Whole argument:** the opening question answered with a different comparison in 22
- Each issue has:
  - a type from a fixed list
  - a severity (flaw vs weakness)
  - an explanation
  - a short quote from the article

  The quote is required, because without it the LLM will produce plausible but false accusations. The quote is what makes an issue checkable.

### Premise validation

- Premises are validated differently depending on their kind:
  - **Fact:** supported / weak / unsupported / false
  - **Definition:** not true or false, only checked for consistent use (handled through concepts)
  - **Authority or value judgment:** flagged as such
- **Basis of validation:** checking only against the article, or also against outside sources with links (see Open questions). Outside fact-checking needs web search in the skill, and that's where the risk of invented facts is highest.
- **Strength:** a conclusion needs all of its premises, so it is as strong as its weakest required premise. That turns validation into the answer readers care about: which key points survive.

### Logic versions

- **Original:** what we have now, faithful to the author. The skill's "stay faithful" rule applies only here.
- **Fixed:** the author's conclusions made valid with minimal changes, each change linked to an issue. There are two ways to close a gap: state the hidden premise the author relies on, or weaken the conclusion. Preferred: state the hidden premise, because the conclusion stays the author's and the new premise goes through validation like any other.
  - Example: 16 bundles a fact ("quality improved in three contexts") with an assertion ("those specs matched the problem's scale"). Fixed splits them, and the assertion fails validation because the article never states the levels. That makes the circular "fit" visible as weak evidence instead of hiding it inside one thesis.
- **Optimized:** "same conclusions" needs a definition. Proposed: the key-point conclusions, not every intermediate step (see Open questions).
  - Built from Fixed, not Original, or it minimizes a broken argument.
  - Premises that failed validation are dropped first. If a key point can't be reached without a failed premise, that's a finding to show, not something to hide.

## Data

- **Key point:** `{ text, theses: [18] }`
- **Key concept:** `{ term, definition, theses }`; a term used in two senses needs both senses.
- **Issues:** a top-level list with typed targets rather than a field on each thesis, because an issue can target an inference, a concept, a pair of theses or the whole argument.
- **Premise verdict:** stored with each premise.
- **Caps:** `maxItems: 7` for key points and key concepts.
- **Versions:** see decision 5.
- To be drafted:
  - Phase 1: issues and premise verdicts on the original map
  - Later phases: key points, key concepts, fixed and optimized versions

## Viewer implementation

- Two views, Summary and Map (decision 1). The view and the version are in the URL, for example `#fixed/t18`.
- The differences between versions are computed from shared thesis ids (decision 5).
- All versions are laid out together once, so nodes stay in place when switching.
- Conclusion strength is computed by the viewer from premise verdicts, not stored.
- Marks never rely on color alone.
- Data without analysis renders as now.

## Skill

To be drafted: changes to [skill/SKILL.md](../skill/SKILL.md) for the audit steps and, depending on decision 6, the two modes.

## Decisions

Open unless marked decided; the recommended option is first.

### What the reader sees

1. Page structure:
   1. Two views, Summary and Map, opening on Summary (recommended)
   2. One scrolling page with the summary above the map (on phones, panning and zooming the map fights with page scrolling)
   3. Map only, with the summary in the side panel when nothing is selected
2. Issue names:
   1. Plain name first, textbook name in parentheses (recommended)
   2. Textbook names only
3. How to show the versions:
   1. One map with a version switch and stable positions (recommended)
   2. Graphs side by side (doesn't fit on screen and breaks on phones)

### How the analysis is made

4. Issue types (decided): hasty generalization, ignored alternative and weak analogy are not supported. They name the weak end of a scale as if it were a yes/no: a generalization from 3 cases is weaker than one from 2,000, not "hasty" while the other is "fine". The strength of a generalization, an abductive step or an analogy is ranked instead; how to rank it is still open.

### Data

5. How to store the versions:
   1. Each version is a complete list of theses, with ids shared across versions, and the viewer computes the differences (recommended: each version validates on its own, and it's easy for the LLM to write)
   2. Fixed and optimized as edit operations on the original (compact, but hard to write and validate)
   3. A separate data file per version

### Skill

6. What the skill does:
   1. Two modes: map only (as now) and full analysis (recommended: the analysis costs several times more tokens and isn't always wanted)
   2. Always the full analysis

## Phasing

1. Issues and premise verdicts: marks on the original map and the issues list in the Summary view
2. Key points and key concepts
3. Fixed and optimized versions

## Open questions

- Premise validation: only the article, or outside sources too?
- Optimized logic: preserve only the key-point conclusions, or every conclusion?
- Strength: how do authority and value-judgment premises count?
