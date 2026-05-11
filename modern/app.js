const TASKS_STORAGE_KEY = "legacy-rebuilder.todoeth-tasks-v1";
const ACTIVITY_STORAGE_KEY = "legacy-rebuilder.todoeth-activity-v1";
const WALLET_STORAGE_KEY = "legacy-rebuilder.todoeth-wallet-v1";

const taskListEl = () => document.getElementById("task-list");
const emptyStateEl = () => document.getElementById("empty-state");
const activityListEl = () => document.getElementById("activity-list");
const walletPillEl = () => document.getElementById("wallet-pill");

const state = {
  tasks: [],
  filter: "all",
  sort: "newest",
  search: "",
  hideCompleted: false,
  defaultFilter: "all",
  walletConnected: false,
  wallet: "",
  activity: [],
};

function formatAddress(value) {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function randomHexAddress() {
  const hex = crypto.getRandomValues(new Uint8Array(20))
    .reduce((acc, byte) => `${acc}${byte.toString(16).padStart(2, "0")}`, "")
    .padEnd(40, "0");
  return `0x${hex.slice(0, 40)}`;
}

function uid() {
  return `task-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function nowISO() {
  return new Date().toISOString();
}

function persist() {
  localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(state.tasks));
  localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(state.activity));
  localStorage.setItem(
    WALLET_STORAGE_KEY,
    JSON.stringify({
      connected: state.walletConnected,
      wallet: state.wallet,
      defaultFilter: state.defaultFilter,
    }),
  );
}

function restore() {
  const tasksRaw = localStorage.getItem(TASKS_STORAGE_KEY);
  const activityRaw = localStorage.getItem(ACTIVITY_STORAGE_KEY);
  const walletRaw = localStorage.getItem(WALLET_STORAGE_KEY);

  state.tasks = tasksRaw ? JSON.parse(tasksRaw) : [];
  state.activity = activityRaw ? JSON.parse(activityRaw) : [];

  if (walletRaw) {
    const walletState = JSON.parse(walletRaw);
    state.walletConnected = Boolean(walletState.connected);
    state.wallet = walletState.wallet || "";
    state.defaultFilter = walletState.defaultFilter || "all";
  }
}

function updateStats() {
  const total = state.tasks.length;
  const completed = state.tasks.filter((task) => task.completed).length;
  const active = total - completed;
  document.getElementById("stat-total").textContent = String(total);
  document.getElementById("stat-active").textContent = String(active);
  document.getElementById("stat-completed").textContent = String(completed);
  const walletBadge = state.walletConnected
    ? `Wallet: ${formatAddress(state.wallet)}`
    : "Wallet: not connected";
  walletPillEl().textContent = walletBadge;
}

function addActivity(message) {
  state.activity.unshift({
    at: nowISO(),
    message,
  });
  state.activity = state.activity.slice(0, 25);
  renderActivity();
  persist();
}

function createTask(content) {
  const value = content.trim();
  if (!value) {
    return;
  }

  const task = {
    id: uid(),
    content: value,
    completed: false,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };

  state.tasks.unshift(task);
  addActivity(`Created task "${value}"`);
  if (document.getElementById("auto-filter").checked) {
    state.filter = "active";
    document.getElementById("filter-select").value = "active";
    document.getElementById("default-filter").value = "active";
    state.defaultFilter = "active";
  }
  render();
}

function removeTask(taskId) {
  const task = state.tasks.find((candidate) => candidate.id === taskId);
  if (!task) {
    return;
  }
  state.tasks = state.tasks.filter((candidate) => candidate.id !== taskId);
  addActivity(`Removed task "${task.content}"`);
  render();
}

function renameTask(taskId, next) {
  const task = state.tasks.find((candidate) => candidate.id === taskId);
  if (!task || !next.trim()) {
    return;
  }
  const previous = task.content;
  task.content = next.trim();
  task.updatedAt = nowISO();
  addActivity(`Renamed task "${previous}" -> "${task.content}"`);
  render();
}

function setCompleted(taskId, checked) {
  const task = state.tasks.find((candidate) => candidate.id === taskId);
  if (!task) {
    return;
  }
  task.completed = checked;
  task.updatedAt = nowISO();
  addActivity(
    `${checked ? "Completed" : "Reopened"} task "${task.content}"`,
  );
  render();
}

function sortTasks(tasks) {
  const cloned = [...tasks];
  if (state.sort === "oldest") {
    cloned.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  } else if (state.sort === "za") {
    cloned.sort((a, b) =>
      b.content.localeCompare(a.content, undefined, { sensitivity: "base" }),
    );
  } else if (state.sort === "az") {
    cloned.sort((a, b) =>
      a.content.localeCompare(b.content, undefined, { sensitivity: "base" }),
    );
  } else {
    cloned.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  return cloned;
}

function filteredTasks() {
  const keyword = state.search.trim().toLowerCase();
  return sortTasks(state.tasks).filter((task) => {
    const filterPass =
      state.filter === "all" ||
      (state.filter === "active" && !task.completed) ||
      (state.filter === "completed" && task.completed);

    const searchPass = !keyword || task.content.toLowerCase().includes(keyword);
    const hiddenPass =
      state.hideCompleted && task.completed ? false : true;
    return filterPass && searchPass && hiddenPass;
  });
}

function renderTasks() {
  const list = taskListEl();
  const tasks = filteredTasks();
  list.replaceChildren();

  if (tasks.length === 0) {
    emptyStateEl().style.display = "block";
  } else {
    emptyStateEl().style.display = "none";
  }

  for (const task of tasks) {
    const item = document.createElement("li");
    item.className = `task-item${task.completed ? " completed" : ""}`;

    const check = document.createElement("input");
    check.type = "checkbox";
    check.checked = task.completed;
    check.setAttribute("aria-label", `Mark ${task.content} completed`);
    check.addEventListener("change", (event) =>
      setCompleted(task.id, event.target.checked),
    );

    const content = document.createElement("div");
    content.className = "task-content";
    content.textContent = task.content;
    content.title = task.content;

    const meta = document.createElement("div");
    meta.className = "task-meta";
    const updated = new Date(task.updatedAt).toLocaleString();
    meta.textContent = `created ${new Date(task.createdAt).toLocaleDateString()} • updated ${updated}`;

    const rename = document.createElement("button");
    rename.type = "button";
    rename.textContent = "Rename";
    rename.addEventListener("click", () => {
      const next = prompt("Rename task", task.content);
      if (next) {
        renameTask(task.id, next);
      }
    });

    const del = document.createElement("button");
    del.type = "button";
    del.textContent = "Delete";
    del.classList.add("danger");
    del.addEventListener("click", () => removeTask(task.id));

    const actions = document.createElement("div");
    actions.append(rename, del);
    actions.className = "task-actions";

    item.append(check, content, meta, actions);
    list.append(item);
  }
}

function renderActivity() {
  const timeline = activityListEl();
  timeline.replaceChildren();
  for (const entry of state.activity) {
    const li = document.createElement("li");
    li.className = "activity-entry";

    const time = document.createElement("time");
    time.dateTime = entry.at;
    time.textContent = new Date(entry.at).toLocaleTimeString();

    const msg = document.createElement("span");
    msg.textContent = entry.message;

    li.append(time, msg);
    timeline.append(li);
  }
}

function markAllCompleted() {
  state.tasks = state.tasks.map((task) => ({
    ...task,
    completed: true,
    updatedAt: nowISO(),
  }));
  addActivity("Marked all tasks as completed");
  render();
}

function clearCompleted() {
  const count = state.tasks.filter((task) => task.completed).length;
  if (!count) {
    return;
  }
  state.tasks = state.tasks.filter((task) => !task.completed);
  addActivity(`Cleared ${count} completed task${count === 1 ? "" : "s"}`);
  render();
}

function seedDemo() {
  if (state.tasks.length > 0) {
    return;
  }
  state.tasks = [
    {
      id: uid(),
      content: "Bootstrap wallet session and fetch task feed",
      completed: false,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    },
    {
      id: uid(),
      content: "Ship lightweight UX controls for legacy task list",
      completed: false,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    },
    {
      id: uid(),
      content: "Document modern path in repository README",
      completed: false,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    },
  ];
  addActivity("Seeded demo tasks");
  render();
}

function connectWallet() {
  if (state.walletConnected) {
    state.walletConnected = false;
    state.wallet = "";
    addActivity("Disconnected wallet mock");
  } else {
    state.wallet = randomHexAddress();
    state.walletConnected = true;
    addActivity(`Connected wallet mock ${state.wallet}`);
  }
  persist();
  updateStats();
}

function snapshotPayload() {
  return {
    tasks: state.tasks,
    activity: state.activity,
    selectedFilter: state.filter,
    sort: state.sort,
    search: state.search,
    hideCompleted: state.hideCompleted,
    walletConnected: state.walletConnected,
    wallet: state.wallet,
    createdAt: nowISO(),
  };
}

async function exportJson() {
  const blob = new Blob([JSON.stringify(snapshotPayload(), null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `todoeth-modern-${Date.now()}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  addActivity("Exported snapshot JSON");
}

async function copySnapshot() {
  try {
    const text = JSON.stringify(snapshotPayload(), null, 2);
    await navigator.clipboard.writeText(text);
    addActivity("Copied snapshot to clipboard");
  } catch {
    addActivity("Clipboard copy blocked by browser");
  }
}

function importDialog() {
  const raw = window.prompt("Paste Todoeth JSON snapshot");
  if (!raw) {
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.tasks)) {
      throw new Error("Payload missing task list");
    }
    state.tasks = parsed.tasks
      .filter((candidate) => candidate && candidate.id && candidate.content)
      .map((candidate) => ({
        id: candidate.id,
        content: String(candidate.content).slice(0, 140),
        completed: Boolean(candidate.completed),
        createdAt: candidate.createdAt || nowISO(),
        updatedAt: candidate.updatedAt || candidate.createdAt || nowISO(),
      }));
    if (Array.isArray(parsed.activity)) {
      state.activity = parsed.activity.slice(-25);
    } else {
      state.activity = [];
    }
    addActivity("Imported snapshot from JSON");
    render();
  } catch (error) {
    addActivity(`Import failed: ${error.message}`);
  }
}

function handleFilterChange(nextFilter) {
  state.filter = nextFilter;
  document.getElementById("filter-select").value = nextFilter;
  document.getElementById("default-filter").value = nextFilter;
  state.defaultFilter = nextFilter;
  render();
}

function handleSortChange(nextSort) {
  state.sort = nextSort;
  render();
}

function handleSearch(value) {
  state.search = value;
  render();
}

function bindEvents() {
  document.getElementById("composer-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const input = document.getElementById("task-input");
    createTask(input.value);
    input.value = "";
    input.focus();
  });

  document.getElementById("filter-select").addEventListener("change", (event) => {
    handleFilterChange(event.target.value);
  });

  document.getElementById("sort-select").addEventListener("change", (event) => {
    handleSortChange(event.target.value);
  });

  document.getElementById("default-filter").addEventListener("change", (event) => {
    state.defaultFilter = event.target.value;
    persist();
  });

  document.getElementById("hide-completed").addEventListener("change", (event) => {
    state.hideCompleted = event.target.checked;
    render();
  });

  document.getElementById("search-input").addEventListener("input", (event) => {
    handleSearch(event.target.value);
  });

  document.getElementById("mark-all-complete").addEventListener("click", markAllCompleted);
  document.getElementById("clear-completed").addEventListener("click", clearCompleted);
  document.getElementById("seed-button").addEventListener("click", seedDemo);
  document.getElementById("wallet-toggle").addEventListener("click", connectWallet);
  document.getElementById("export-button").addEventListener("click", exportJson);
  document.getElementById("snapshot-button").addEventListener("click", copySnapshot);
  document.getElementById("import-button").addEventListener("click", importDialog);
  document.getElementById("clear-log").addEventListener("click", () => {
    state.activity = [];
    renderActivity();
    persist();
    addActivity("Cleared activity log");
  });
}

function render() {
  renderTasks();
  renderActivity();
  updateStats();
  persist();
}

function init() {
  restore();
  bindEvents();
  if (!state.activity.length) {
    addActivity("Legacy-modern surface loaded");
  }
  document.getElementById("filter-select").value = state.defaultFilter || "all";
  document.getElementById("default-filter").value = state.defaultFilter || "all";
  state.filter = state.defaultFilter || "all";
  document.getElementById("sort-select").value = state.sort || "newest";
  render();
}

init();

window.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    document.getElementById("search-input").focus();
  }
});
