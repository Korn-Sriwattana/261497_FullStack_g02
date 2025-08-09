import "./App.css";
import { useEffect, useMemo, useRef, useState } from "react";
import TagDropdown from "./TagDropdown";
import type { TagItem } from "./TagDropdown";

/** ========= Types ========= */
interface Todo {
  id: string;
  todoText: string;
  isDone: boolean;
  tagId?: string | null;
  dueDate?: string | null;
  createdAt?: string | null;
}
type AuthUser = { id: string; username: string } | null;

/** ========= Utils ========= */
function formatDate(d?: string | null) {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

export default function App() {
  const API = "/api";
  const FETCH_JSON = { "Content-Type": "application/json" };

  // ===== Auth =====
  const [authUser, setAuthUser] = useState<AuthUser>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");

  // ===== Todos & Tags =====
  const [allTodos, setAllTodos] = useState<Todo[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);

  // ===== Form / UI =====
  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState<"ADD" | "EDIT">("ADD");
  const [editingId, setEditingId] = useState("");

  const [taskName, setTaskName] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedTagId, setSelectedTagId] = useState<string>("");

  // ===== Filters / Sort =====
  const [sortBy, setSortBy] = useState<"createdAt" | "dueDate">("createdAt");
  const [statusFilter, setStatusFilter] = useState<"all" | "done" | "notdone">(
    "all"
  );
  const [tagFilterId, setTagFilterId] = useState<string>("");

  const [openMenu, setOpenMenu] = useState<"" | "sort" | "filter">("");

  // ===== Refs =====
  const formRef = useRef<HTMLDivElement | null>(null);
  const firstInputRef = useRef<HTMLInputElement | null>(null);
  const fetchedOnce = useRef(false);
  const controlsRef = useRef<HTMLDivElement | null>(null);

  /** ===== Auth API (fetch + credentials) ===== */
  async function fetchMe() {
    try {
      const res = await fetch(`${API}/auth/me`, { credentials: "include" });
      if (!res.ok) {
        setAuthUser(null);
        return;
      }
      const json = await res.json();
      setAuthUser(json.user ?? null);
    } catch {
      setAuthUser(null);
    }
  }
  async function doRegister() {
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: FETCH_JSON,
        credentials: "include",
        body: JSON.stringify({
          username: authUsername.trim(),
          password: authPassword,
        }),
      });
      if (!res.ok) throw new Error("Register failed");
      alert("Registered! Now login.");
    } catch (e: any) {
      alert(e?.message || "Register failed");
    }
  }
  async function doLogin() {
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: FETCH_JSON,
        credentials: "include",
        body: JSON.stringify({
          username: authUsername.trim(),
          password: authPassword,
        }),
      });
      if (!res.ok) throw new Error("Login failed");
      await fetchMe();
      setAuthOpen(false);
      setAuthPassword("");
      // โหลดข้อมูลหลังล็อกอิน (ถ้า backend ปกป้องด้วย auth)
      await fetchAll();
    } catch (e: any) {
      alert(e?.message || "Login failed");
    }
  }
  async function doLogout() {
    try {
      await fetch(`${API}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      setAuthUser(null);
      await fetchAll(); // เคลียร์ข้อมูล/รีโหลดตามความเหมาะสม
    } catch {
      // ignore
    }
  }

  /** ===== App data fetch ===== */
  const fetchAll = async () => {
    try {
      const [todoRes, tagRes] = await Promise.all([
        fetch(`${API}/todo`, { cache: "no-store", credentials: "include" }),
        fetch(`${API}/tags`, { cache: "no-store", credentials: "include" }),
      ]);
      if (!todoRes.ok || !tagRes.ok) throw new Error("fetch failed");
      const [todosData, tagsData] = await Promise.all([
        todoRes.json(),
        tagRes.json(),
      ]);
      setAllTodos(todosData);
      setTags(tagsData);
    } catch {
      // เงียบไว้ก่อน
    }
  };

  useEffect(() => {
    if (fetchedOnce.current) return;
    fetchedOnce.current = true;
    // ดึง me ก่อน เพื่อให้ cookie พร้อม แล้วค่อยโหลด todo/tags
    fetchMe().finally(fetchAll);
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

  /** ===== Derived ===== */
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
    const ad = a.dueDate
      ? new Date(a.dueDate).getTime()
      : Number.POSITIVE_INFINITY;
    const bd = b.dueDate
      ? new Date(b.dueDate).getTime()
      : Number.POSITIVE_INFINITY;
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

  const getTagName = (id?: string | null) =>
    id ? tags.find((x) => x.id === id)?.name ?? "" : "";

  /** ===== Actions ===== */
  const resetForm = () => {
    setMode("ADD");
    setEditingId("");
    setTaskName("");
    setDueDate("");
    setSelectedTagId("");
  };

  const refreshTodos = async () => {
    try {
      const res = await fetch(`${API}/todo`, {
        cache: "no-store",
        credentials: "include",
      });
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
        headers: FETCH_JSON,
        credentials: "include",
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
        headers: FETCH_JSON,
        credentials: "include",
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
        headers: FETCH_JSON,
        credentials: "include",
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
        headers: FETCH_JSON,
        credentials: "include",
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
      const res = await fetch(`${API}/tags/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error();
      setTags((prev) => prev.filter((t) => t.id !== id));
      if (selectedTagId === id) setSelectedTagId("");
    } catch {}
  };

  /** ===== Render ===== */
  return (
    <main>
      {/* Header with Auth */}

      <div className="header">
        <h1 className="title">Todo List</h1>

        <div>
          {authUser ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span>Hi, {authUser.username}</span>
              <button className="btn-primary" onClick={doLogout}>
                🚪 Logout
              </button>
            </div>
          ) : (
            <button className="btn-primary" onClick={() => setAuthOpen(true)}>
              🔐 Login / Register
            </button>
          )}
        </div>
      </div>

      {/* Auth Modal */}
      {authOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 50,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: 16,
              width: 360,
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <h3 style={{ margin: 0 }}>🔑 Authentication</h3>
            <input
              placeholder="Username"
              value={authUsername}
              onChange={(e) => setAuthUsername(e.target.value)}
              className="input"
            />
            <input
              type="password"
              placeholder="Password"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              className="input"
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={doRegister} className="btn-primary">
                📝 Register
              </button>
              <button onClick={doLogin} className="btn-primary">
                🔓 Login
              </button>
              <button onClick={() => setAuthOpen(false)} className="btn-cancel">
                ✖ Close
              </button>
            </div>
          </div>
        </div>
      )}

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
          <div
            className="menu"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
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
          <div
            className="menu"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
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
              className={`menu-item ${
                statusFilter === "notdone" ? "active" : ""
              }`}
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
              <button
                data-cy="submit"
                className="btn-primary"
                onClick={handleSaveTask}
              >
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
                  <div
                    className={`todo-title ${t.isDone ? "done" : ""}`}
                    data-cy="todo-item"
                  >
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
              <p className="hero-desc">
                Create a task to get started. You can always organize it later.
              </p>
              <button
                className="add-btn"
                data-cy="add-task-btn"
                onClick={() => setShowForm(true)}
              >
                + Add task
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
