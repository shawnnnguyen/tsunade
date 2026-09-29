---
name: draft-plans
description: Create or refine the fewest plain, lean implementation plans needed for this repository. Use when turning product requirements into clear POC work without implementing it.
---

# Draft Lean POC Plans

Create the smallest plan, or small set of plans, that proves the requested POC. Write so a developer can understand the whole approach in one reading.

## Write for the reader

- Lead with what will work when the plan is complete.
- Explain the user or system flow before the code structure.
- Use plain English, short sentences and concrete verbs.
- Explain a necessary technical term when it first appears.
- Put file names, types, schemas and failure details inside the step where they matter.
- State an important choice as: problem, chosen change, reason.
- Keep paragraphs short. Use bullets for real lists and tables for useful comparisons.
- Remove repeated decisions, long inventories, formal audit language and speculative edge cases.
- Keep enough technical detail to prevent a likely mistake. Remove detail that merely shows research was done.

A plan is lean when a developer can explain it simply, see the order of work and know how completion will be proved.

## Start from repository truth

Before writing:

1. Read all applicable `AGENTS.md` files.
2. Read the canonical product design and the latest relevant plan.
3. Follow the affected code path through its public contracts, storage and CLI behavior.
4. Inspect the current tests and actual repository verification commands.
5. Check the working tree and preserve unrelated changes.

Use existing names, paths and contracts. Do not invent missing behavior. Mark `[GAP]` only when a missing decision materially changes implementation.

## Keep the plan and code small

Default to one plan. Use two to four plans only when each has an independently useful result or different prerequisite. If two plans must ship and be verified together, merge them. Create a short roadmap only when more than one plan is justified.

Plan the minimum readable code:

- Group related behavior in cohesive modules.
- Split a file only when its responsibilities change or are verified independently.
- Keep one concrete implementation unless an approved replacement boundary requires another.
- Avoid empty layers, forwarding wrappers, registries, factories, plugin systems and one-file directories.
- Keep types near their use and schemas at real trust boundaries.
- Add a dependency only when it materially reduces code or risk.
- Keep future work in `Deferred`; do not build its extension points now.

Use this test for an abstraction:

> If there is one implementation and no approved replacement boundary, keep it concrete.

## Plan format

Use the repository's template when required. Otherwise write:

1. **Goal** — the working result and nearest scope boundary.
2. **Current gap** — the small set of facts that explains why change is needed.
3. **Approach** — the new flow in plain language and its main code boundaries.
4. **Steps** — a short ordered sequence. For each step state:
   - **Change:** what changes and where;
   - **Why:** why this is needed;
   - **Verify:** the observable proof.
5. **Final verification** — exact repository checks plus one focused success and important failure or safety path.
6. **Deferred** — nearby work intentionally postponed.

Add prerequisites, locked decisions or cross-plan risks only when they affect implementation. Do not repeat them in every step or subplan. Use code examples only when they remove ambiguity.

Do not add RED/GREEN/REFACTOR phases, coverage targets, required test counts or large test plans. Verification should be proportionate and may prove several related steps at once.

## Final simplification pass

Before saving:

1. Remove repeated background and decisions.
2. Replace dense technical paragraphs with a simple flow followed by local detail.
3. Merge steps that always change and verify together.
4. Remove file lists that do not guide ownership.
5. Move future behavior to `Deferred`.
6. Confirm that each plan has one observable result.
7. Confirm links, names, dependencies and task order.
8. Confirm only requested planning or skill files changed.

Do not commit, push or implement product code unless the user explicitly asks.
