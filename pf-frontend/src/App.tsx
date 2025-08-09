import "./App.css";
import { useEffect, useMemo, useRef, useState } from "react";
import TagDropdown from "./TagDropdown";
import type { TagItem } from "./TagDropdown";

interface Todo {
  id: string;
  todoText: string;
  isDone: boolean;
  tagId?: string | null;
  dueDate?: string | null;
  createdAt?: string | null;
}

function formatDate(d?: string | null) {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
}

export default function App() {
  const API = "/api";

  const [allTodos, setAllTodos] = useState<Todo[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState<"ADD" | "EDIT">("ADD");
  const [editingId, setEditingId] = useState("");

  const [taskName, setTaskName] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedTagId, setSelectedTagId] = useState<string>("");

  const [sortBy, setSortBy] = useState<"createdAt" | "dueDate">("createdAt");
  const [statusFilter, setStatusFilter] = useState<"all" | "done" | "notdone">("all");
  const [tagFilterId, setTagFilterId] = useState<string>("");

  const [openMenu, setOpenMenu] = useState<"" | "sort" | "filter">("");

  const formRef = useRef<HTMLDivElement | null>(null);
  const firstInputRef = useRef<HTMLInputElement | null>(null);

  const fetchedOnce = useRef(false);
  const controlsRef = useRef<HTMLDivElement | null>(null);

  const fetchAll = async () => {
    const [todoRes, tagRes] = await Promise.all([
      fetch(`${API}/todo`, { cache: "no-store" }),
      fetch(`${API}/tags`, { cache: "no-store" }),
    ]);
    if (!todoRes.ok || !tagRes.ok) throw new Error("fetch failed");
    const [todosData, tagsData] = await Promise.all([todoRes.json(), tagRes.json()]);
    setAllTodos(todosData);
    setTags(tagsData);
  };

  useEffect(() => {
    if (fetchedOnce.current) return;
    fetchedOnce.current = true;
    fetchAll().catch(() => {});
  }, []);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!controlsRef.current?.contains(e.target as Node)) setOpenMenu("");
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  useEffect(() => {
    if (showForm && firstInputRef.current) firstInputRef.current.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setShowForm(false);
        resetForm();
      }
    }
    if (showForm) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showForm]);

  const usedTagIds = useMemo(() => {
    const ids = allTodos.map((t) => t.tagId).filter(Boolean) as string[];
    return Array.from(new Set(ids));
  }, [allTodos]);

  function compareByCreated(a: Todo, b: Todo) {
    const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return da - db;
  }
  function compareByDue(a: Todo, b: Todo) {
    const ad = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
    const bd = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
    return ad - bd;
  }

  const visibleTodos = useMemo(() => {
    let list = [...allTodos];
    if (tagFilterId) list = list.filter((t) => t.tagId === tagFilterId);
    if (statusFilter === "done") list = list.filter((t) => t.isDone);
    else if (statusFilter === "notdone") list = list.filter((t) => !t.isDone);
    if (sortBy === "createdAt") list.sort(compareByCreated);
    else list.sort(compareByDue);
    return list;
  }, [allTodos, tagFilterId, statusFilter, sortBy]);

  const getTagName = (id?: string | null) => (id ? tags.find((x) => x.id === id)?.name ?? "" : "");

  const resetForm = () => {
    setMode("ADD");
    setEditingId("");
    setTaskName("");
    setDueDate("");
    setSelectedTagId("");
  };

  const refreshTodos = async () => {
    try {
      const res = await fetch(`${API}/todo`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data: Todo[] = await res.json();
      setAllTodos(data);
    } catch {}
  };

  const handleSaveTask = async () => {
    const todoText = taskName.trim();
    if (!todoText) return;
    const payload: any = {
      todoText,
      dueDate: dueDate ? `${dueDate}T00:00:00` : null,
      tagId: selectedTagId || null,
    };
    if (mode === "EDIT") payload.id = editingId;
    try {
      const res = await fetch(`${API}/todo`, {
        method: mode === "ADD" ? "PUT" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      resetForm();
      setShowForm(false);
      refreshTodos();
    } catch {}
  };

  const handleStartEdit = (t: Todo) => {
    setMode("EDIT");
    setEditingId(t.id);
    setTaskName(t.todoText ?? "");
    setDueDate(t.dueDate ? String(t.dueDate).slice(0, 10) : "");
    setSelectedTagId(t.tagId ?? "");
    setShowForm(true);
  };

  const handleToggleDone = async (id: string, isDone: boolean) => {
    try {
      const res = await fetch(`${API}/todo/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isDone }),
      });
      if (!res.ok) throw new Error();
      refreshTodos();
    } catch {}
  };

  const handleDeleteTodo = async (id: string) => {
    try {
      await fetch(`${API}/todo`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      refreshTodos();
    } catch {}
  };

  const onSelectTag = (id: string) => setSelectedTagId(id);
  const onAddTag = async (name: string) => {
    try {
      const res = await fetch(`${API}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error();
      setTags((prev) => [...prev, json.data]);
      setSelectedTagId(json.data.id);
    } catch {}
  };
  const onDeleteTag = async (id: string) => {
    try {
      const res = await fetch(`${API}/tags/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error();
      setTags((prev) => prev.filter((t) => t.id !== id));
      if (selectedTagId === id) setSelectedTagId("");
    } catch {}
  };

  return (
    <main>
      <div>
        <h1 className="title">Todo</h1>
      </div>

      {/* controls */}
      <div className="controls" ref={controlsRef}>
        <div
          className="option-btn opt"
          onClick={(e) => {
            e.stopPropagation();
            setOpenMenu(openMenu === "sort" ? "" : "sort");
          }}
        >
          sort by
        </div>
        {openMenu === "sort" && (
          <div className="menu" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
            <button
              className={`menu-item ${sortBy === "createdAt" ? "active" : ""}`}
              onClick={() => {
                setSortBy("createdAt");
                setOpenMenu("");
              }}
            >
              created
            </button>
            <button
              className={`menu-item ${sortBy === "dueDate" ? "active" : ""}`}
              onClick={() => {
                setSortBy("dueDate");
                setOpenMenu("");
              }}
            >
              due date
            </button>
          </div>
        )}

        <div
          className="option-btn opt"
          onClick={(e) => {
            e.stopPropagation();
            setOpenMenu(openMenu === "filter" ? "" : "filter");
          }}
        >
          filter
        </div>
        {openMenu === "filter" && (
          <div className="menu" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
            <div className="menu-section">status</div>
            <button
              className={`menu-item ${statusFilter === "all" ? "active" : ""}`}
              onClick={() => {
                setStatusFilter("all");
                setOpenMenu("");
              }}
            >
              all
            </button>
            <button
              className={`menu-item ${statusFilter === "done" ? "active" : ""}`}
              onClick={() => {
                setStatusFilter("done");
                setOpenMenu("");
              }}
            >
              done
            </button>
            <button
              className={`menu-item ${statusFilter === "notdone" ? "active" : ""}`}
              onClick={() => {
                setStatusFilter("notdone");
                setOpenMenu("");
              }}
            >
              not done
            </button>
            <div className="menu-divider" />
            <div className="menu-section">tag</div>
            <button
              className={`menu-item ${tagFilterId === "" ? "active" : ""}`}
              onClick={() => {
                setTagFilterId("");
                setOpenMenu("");
              }}
            >
              all
            </button>
            {tags.map((t) => (
              <button
                key={t.id}
                className={`menu-item ${tagFilterId === t.id ? "active" : ""}`}
                onClick={() => {
                  setTagFilterId(t.id);
                  setOpenMenu("");
                }}
              >
                {t.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="controls-divider" />

      {!showForm && allTodos.length > 0 && (
        <div className="toolbar">
          <button
            data-cy="add-task-btn"
            className="add-inline-btn"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            + Add Task
          </button>
        </div>
      )}

      {showForm && (
        <div className="form-wrap" ref={formRef}>
          <div className="task-card">
            <input
              data-cy="input-text"
              ref={firstInputRef}
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder="Task name  e.g. homework 1"
              onKeyDown={(e) => e.key === "Enter" && handleSaveTask()}
            />

            <input
              data-cy="input-date"
              type="date"
              className="date-input"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />

            <TagDropdown
              tags={tags}
              selectedTagId={selectedTagId}
              usedTagIds={usedTagIds}
              onSelectTag={onSelectTag}
              onAddTag={onAddTag}
              onDeleteTag={onDeleteTag}
            />

            <div className="row">
              <button
                className="btn-cancel"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
              >
                cancel
              </button>
              <button data-cy="submit" className="btn-primary" onClick={handleSaveTask}>
                {mode === "ADD" ? "add task" : "update"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="list-wrap">
        <ul className="todo-list">
          {visibleTodos.map((t) => (
            <li key={t.id} className="todo-row" data-cy="todo-item-wrapper">
              <div className="left">
                <input
                  type="checkbox"
                  checked={!!t.isDone}
                  onChange={(e) => handleToggleDone(t.id, e.target.checked)}
                />
                <div className="info">
                  <div className={`todo-title ${t.isDone ? "done" : ""}`} data-cy="todo-item">
                    {t.todoText}
                  </div>
                  <div className="todo-meta">
                    {t.tagId && (
                      <span className="tag-pill-sm" data-cy="todo-tag">
                        <span>🏷️</span>
                        {getTagName(t.tagId)}
                      </span>
                    )}
                    {t.dueDate && (
                      <span className="due">
                        <span>📅</span>
                        {formatDate(t.dueDate)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="actions">
                <button
                  className="icon-btn edit"
                  title="Edit"
                  data-cy="todo-item-update"
                  onClick={() => handleStartEdit(t)}
                >
                  ✎
                </button>
                <button
                  className="icon-btn del"
                  title="Delete"
                  data-cy="todo-item-delete"
                  onClick={() => handleDeleteTodo(t.id)}
                >
                  🗑️
                </button>
              </div>
            </li>
          ))}
        </ul>

        {!showForm && allTodos.length === 0 && (
          <div className="right">
            <div className="hero">
              <img className="illus" src="/inbox-illus.png" alt="" />
              <h2 className="hero-title">Add your first todo</h2>
              <p className="hero-desc">Create a task to get started. You can always organize it later.</p>
              <button className="add-btn" data-cy="add-task-btn" onClick={() => setShowForm(true)}>
                + Add task
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
