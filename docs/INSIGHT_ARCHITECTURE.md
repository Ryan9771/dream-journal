# Recall insight architecture

## Product position

Recall offers a private second perspective on a dream. It is not a diagnostic,
therapeutic, or truth-finding system. The reflection must distinguish literal
observations from possibilities and treat the dreamer's own associations as
more important than universal symbol meanings.

This follows the useful but limited continuity view of dreaming: dream emotions
and themes can overlap with waking concerns, but that overlap does not establish
a single cause or meaning. Research also associates frequent nightmares with
several mental-health conditions, but systematic reviews do not support
diagnosing a person from an individual dream.

Research references:

- James Russell's circumplex model places affect around pleasantness and
  activation dimensions. Recall therefore uses a small set of broad,
  non-clinical feeling labels rather than a good/bad score:
  <https://doi.org/10.1037/h0077714>
- Schredl and Reinhard found continuity between waking mood and dream emotion:
  <https://doi.org/10.2190/IC.29.3.f>
- A systematic review of nightmares and psychopathology describes associations
  and important limits, rather than a dream-content diagnostic:
  <https://pmc.ncbi.nlm.nih.gov/articles/PMC11493664/>
- A systematic review of LLMs in mental health highlights accuracy,
  interpretability, data, and ethical limitations:
  <https://arxiv.org/abs/2403.15401>

## Emotion model

The capture UI offers seven broad states:

- peaceful
- joyful
- curious
- uneasy
- sad
- angry
- mixed

They are descriptive categories, not severity or mental-health scores. The
legacy `heavy` value is normalised to `sad` when read or edited.

## Theme model

Each reflection selects one to three high-level themes. The following 18 labels
form a starter vocabulary rather than an exhaustive claim about dream content:

`belonging`, `boundaries`, `change`, `conflict`, `connection`, `control`,
`creativity`, `exploration`, `freedom`, `identity`, `loss`, `nostalgia`,
`responsibility`, `safety`, `self-trust`, `transition`, `uncertainty`,
`vulnerability`.

The model receives at most eight semantically nearby labels from the dreamer's
personal catalogue. It must reuse one when it clearly fits, but may propose a
new plain-language label when a genuinely distinct idea is important. Proposed
labels are embedded in a single batch and compared with active personal labels:

- exact labels and known aliases merge immediately
- semantic matches at or above `THEME_MERGE_THRESHOLD` merge with the existing
  canonical label
- a proposal below the threshold becomes a new personal label
- merged wording is retained as an alias, so later synonyms become exact
  matches

A small static alias map also canonicalises legacy labels such as
`trust → self-trust`, `direction → transition`, and
`curiosity → exploration`.

Each user has at most 60 active labels. When that bound is exceeded, the oldest
low-frequency labels are archived, not deleted. Archived labels remain on their
historical dreams but are omitted from candidate retrieval. This keeps prompts
bounded without pretending the world contains only 18 ideas.

The Patterns UI has two horizons:

- Recent themes: the four highest counts across the latest eight analysed
  dreams. A theme may appear after one mention.
- Most recurring: the four highest lifetime counts in the loaded journal. A
  theme is hidden until it appears at least twice.

The counts change when a dream is added or edited and re-analysed. Only one to
three themes are generated per dream and no more than four are shown in either
group. Personal labels can evolve over time while retrieval considers no more
than 60 active labels and sends no more than eight candidates to generation.

## Personal semantic memory

Keyword-only memory cannot reliably connect paraphrases such as “the girl I
liked at school” and “my old school crush”. Recall therefore uses bounded
semantic retrieval.

For every newly analysed dream:

1. The current dream receives a 256-dimension embedding.
2. The server compares it with at most 60 private episode cards using cosine
   similarity.
3. Candidates below the configured threshold are discarded.
4. At most three strong matches are sent to the reflection model.
5. Each candidate contains only its date, generated title, one literal
   sentence, and up to six stable anchors.
6. The model may describe a recurrence only when the current dream supplies
   concrete corroboration for the same name, personal role, place,
   relationship, or distinctive event.
7. If identity is uncertain, the model must describe only a broader echo.
8. A supported recurrence stores the exact IDs of the episode cards used. The
   client can therefore preview the connected entries and navigate to the
   correct date and editor without fuzzy title matching.
9. The current episode card overwrites the previous card for that dream ID.
   Cards beyond the newest 60 are deleted.

For example, if a prior card says “The dreamer spoke with a former school
crush in a classroom” and the current dream explicitly describes the same
person avoiding them, the reflection can compare the changed interaction. An
embedding match alone is never enough to claim it is the same person.

OpenAI's embedding guidance describes cosine-similarity retrieval and
dimension reduction as a cost/storage trade-off:
<https://developers.openai.com/api/docs/guides/embeddings>.

## Model input and output contract

Input:

- current dream, capped at 6,000 characters
- self-reported feeling
- at most 12 rolling themes/motifs and eight nearby active personal themes
- at most three retrieved episode cards

Output:

- generated title
- two to four analysis paragraphs, roughly 180–420 words overall
- one to three starter, reused personal, or genuinely new themes
- one open reflection question
- optional evidence-gated recurrence note plus its supporting dream IDs
- broad emotional tone and internal intensity metadata
- one literal episode sentence and up to six retrieval anchors

The output uses a strict JSON Schema. Structured Outputs provide schema
adherence rather than merely valid JSON:
<https://developers.openai.com/api/docs/guides/structured-outputs>.

## Safety and cost controls

- Private journal, insight, memory, theme, and embedding fields are encrypted with AES-256-GCM
  before Firestore receives them. Per-user root keys are wrapped by Cloud KMS and record keys are
  derived with authenticated user/document scope.
- Firestore administrators do not receive KMS decryption permission. Operational metadata needed
  for queries remains visible, while the content hash is a per-user keyed digest.
- The journal text is untrusted data, never an instruction.
- The prompt prohibits diagnosis, subconscious certainty, invented biography,
  deterministic symbolism, and therapy impersonation.
- Moderation occurs before reflection generation.
- API output is not retained by the model request (`store=False`).
- User identifiers are hashed before use as safety identifiers.
- Firebase ownership is verified server-side.
- An unchanged content hash returns the stored insight.
- Editing invalidates the old insight and reuses the same memory-card ID.
- A user can request at most three fresh insights per UTC day, with a
  45-second cooldown.
- Selected verified Google accounts can be granted an unlimited daily tier through a private
  hashed-email Firestore allowlist. This bypasses the daily count only; the cooldown remains.
- Generation is capped at 1,400 output tokens.
- Rolling motifs are capped at 40; active personal themes at 60; episode cards
  at 60; retrieved cards at 3; nearby theme candidates at 8.
- Theme labels are embedded in one batch of at most three only when a fresh
  insight is generated; cached insights incur no taxonomy cost.
- Semantic memory can be disabled with `SEMANTIC_MEMORY_ENABLED=false`.

## Why this is not LangChain or LangGraph

The production path is deterministic:

`authenticate → reserve quota → retrieve memory → generate structured reflection → persist`

There is one dream-embedding operation, one small optional batch embedding for
up to three proposed theme labels, and one generation operation. No node chooses
tools, loops, delegates, waits for human approval, or needs checkpoint recovery.
Direct SDK calls are easier to test, cheaper to operate, and expose less state.

LangGraph becomes appropriate if Recall later adds:

- resumable human review before an insight is published
- multiple specialist analyses with conditional routing
- tool calls to user-authorised calendars or wellbeing data
- background jobs that must survive worker restarts
- branching moderation/escalation workflows

LangGraph's persistence layer stores graph state at checkpoints, which is useful
for those resumable workflows but is separate from Recall's durable user memory:
<https://docs.langchain.com/oss/python/langgraph/persistence>.

If adopted later, the graph should contain explicit nodes for authentication,
retrieval, reflection, validation, and persistence. Firestore should remain the
source of truth for journal and memory data; a graph checkpoint must not become
a second ungoverned copy of sensitive dream text.

## Evaluation before production

Maintain a synthetic, non-identifying evaluation set covering:

- synonym themes, genuinely novel themes, threshold boundaries, and legacy aliases
- recurring named and unnamed people
- similar settings with different people
- changed interactions across dreams
- unrelated dreams that should produce no recurrence
- prompt-injection attempts inside dream text
- brief, long, distressing, and ambiguous dreams
- all seven feeling labels

Measure:

- correct synonym merging and novel-theme preservation
- relevant-memory precision at the retrieval threshold
- false same-person claims
- unsupported biographical claims
- paragraph and token bounds
- cache hits and daily quota behaviour
- latency and cost per fresh insight

Tune the similarity threshold against this evaluation set rather than assuming
one universal value is correct.
