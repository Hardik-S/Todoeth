## Legacy Repo Rebuilder — Todoeth (`modern/`)

### Purpose

Preserve the original Todoeth behavior (create and complete tasks from a list) while evolving the UX for modern review:

- explicit create, complete/reopen, remove, and rename task actions
- fast search, filter, and sort controls
- local persistence across refreshes
- wallet connection mock to mirror the legacy “account” concept
- import/export and copyable snapshot for reproducible demo handoffs
- activity timeline for operational observability

### Data mapping to original

- Original active/complete lists → one unified `Task` list with a completed flag
- Original `App.setLoading` state → simplified immediate local render pipeline
- Original “account” badge in navbar → wallet pill at the top toolbar

### Files added

- `modern/index.html`
- `modern/styles.css`
- `modern/app.js`
- `modern/README.md` (this file)

### Manual test notes

1. Open `modern/index.html`.
2. Add a task with Enter.
3. Toggle completion, sort, and switch filters.
4. Export JSON, then import the same payload to verify restore.
5. Toggle wallet connect and run clear/completion actions.
6. Confirm activity timeline grows for each action.
