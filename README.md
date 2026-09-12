# The 14th Step

The 14th Step is a SvelteKit recovery-meeting simulator. The room is meant to
run like a real meeting: people arrive, speak in distinct voices, remember
shared history, and leave room for the user to participate, pass, or listen.

The runnable application is in [app](app/). Start with its
[README](app/README.md) for local commands.

## Start here

- [STATUS.md](STATUS.md) is the current project map: product state, active
  epics, blockers, and the live planning tracks.
- [AGENTS.md](AGENTS.md) contains repository-wide working rules. Nested
  `AGENTS.md` files add rules for the area being changed.
- [plans](plans/) contains the live planning material. The overall product
  plan is [the-14th-step-execplan.md](plans/the-14th-step-execplan.md); the
  meeting-experience and production-recovery tracks have their own plans.
- [PLANS.md](PLANS.md) explains how an ExecPlan is maintained when a task
  actually uses one.

## Product and technical reference

- [original-artifact.jsx](reference/original-artifact.jsx) is the original
  React meeting experience. It is behavioral evidence, not code to copy
  literally.
- [Recovery Meeting Simulator Design Spec](reference/Recovery_Meeting_Simulator_Design_Spec.docx)
  records the early product and architecture proposal. It contains useful
  intent as well as decisions that need current validation.
- [Writing philosophy analysis](reference/writing-philosophy-style-analysis.md)
  collects the editorial standards behind the characters and generated shares.
- [Continuous seam-driven development](reference/continuous-seam-driven-development.md)
  and [the seam-driven development guide](reference/seam-driven-development-guide.txt)
  describe the architectural approach and its supporting tools.

## History

[archive](archive/) contains completed plans, dated handoffs, audits, and
superseded workflow material. It is useful for context but never overrides the
current status and instructions. In particular,
[archive/conductor](archive/conductor/) is a prior planning system and
[archive/implementation-reports](archive/implementation-reports/) contains
completed M13 and M18 reports that no longer describe the current runtime.
