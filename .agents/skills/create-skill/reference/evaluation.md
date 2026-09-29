# Skill Evaluation

Read this when creating an important Skill, materially changing behavior, or diagnosing unreliable activation or output.

## Evaluate activation separately

The description controls whether the Skill loads. Create realistic queries labelled `should_trigger` or `should_not_trigger`.

- Include explicit and implicit requests, short and detailed prompts, casual language, and typos.
- Make negative cases near misses that share relevant words but need a different capability.
- Start lean, then grow toward roughly 8-10 positive and 8-10 negative queries when routing quality matters.
- Run queries multiple times when the harness permits because activation is nondeterministic.
- Improve wording from training failures, then check fresh or held-back queries to avoid overfitting.

Do not broaden the description merely to maximize activation. False activation consumes context and can redirect unrelated work.

For a Skill suite, evaluate routing across the whole suite:

- Prompts that should activate the lifecycle Skill.
- Direct prompts for every focused Skill.
- Near misses that mention the product but require another Skill or no Skill.
- Multi-step prompts that should move from the lifecycle Skill into more than one focused Skill.

Check that focused descriptions do not compete for the same ordinary request. A lifecycle Skill should route the work without copying every focused workflow into context.

## Evaluate task outcomes

Start with two or three realistic tasks. Each case should contain:

```json
{
  "id": "stable-case-id",
  "prompt": "A realistic user request",
  "expected_output": "A human-readable description of success",
  "files": [],
  "assertions": ["A specific, observable requirement"]
}
```

Run each case in a clean context with the Skill and against a baseline without it. For an update, compare against the previous Skill version. Keep inputs and permissions identical.

Grade each assertion as pass or fail with concrete evidence. Use deterministic checks for file existence, schemas, counts, commands, or other mechanical facts. Use blind model comparison and human review for clarity, usefulness, judgment, or polish.

Record latency and token use when the harness exposes them. A Skill should deliver enough quality improvement to justify its context and execution cost.

## Learn from traces

Review the full execution path, not only the final answer. Look for:

- Missed or false activations.
- Instructions the agent ignored or misunderstood.
- Repeated exploration that a clearer default could remove.
- Recreated deterministic logic that belongs in a tested script.
- Rules that caused unnecessary work.
- Assertions that pass both variants and therefore prove no Skill value.
- Unnecessary focused Skills whose removal would not change a decision or outcome.

Revise the smallest underlying cause. Do not accumulate one-off rules for individual prompts. Re-run all cases and stop when the important failures are resolved or further changes produce no meaningful gain.
