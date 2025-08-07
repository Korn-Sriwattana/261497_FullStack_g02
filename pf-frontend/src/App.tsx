import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { type TodoItem, type TagItem } from "./types";
import dayjs from "dayjs";
import TagDropdown from "./TagDropdown";

function App() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [allTodos, setAllTodos] = useState<TodoItem[]>([]);
  const [inputText, setInputText] = useState("");
  const [mode, setMode] = useState<"ADD" | "EDIT">("ADD");
  const [curTodoId, setCurTodoId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [sortOption, setSortOption] = useState<"created" | "due">("created");
  const [tags, setTags] = useState<TagItem[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<string>("");
  const [filterTagId, setFilterTagId] = useState<string>("");
  const [showStatusFilter, setShowStatusFilter] = useState<"ALL" | "DONE" | "UNDONE">("ALL");

  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAllTodos();
    fetchData();
    fetchTags();
  }, []);

  useEffect(() => {
    fetchData();
  }, [filterTagId]);

  async function fetchAllTodos() {
    try {
      const res = await axios.get<TodoItem[]>("/api/todo");
      setAllTodos(res.data);
    } catch {
      alert("Failed to fetch all todos");
    }
  }

  async function fetchData() {
    const url = filterTagId ? `/api/todo?tagId=${filterTagId}` : "/api/todo";
    try {
      const res = await axios.get<TodoItem[]>(url);
      setTodos(res.data);
    } catch {
      alert("Failed to fetch todos");
    }
  }

  async function fetchTags() {
    try {
      const res = await axios.get<TagItem[]>("/api/tags");
      setTags(res.data);
    } catch {
      alert("Failed to fetch tags");
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInputText(e.target.value);
  }

  function handleSubmit() {
    if (!inputText) return;
    const data = {
      id: curTodoId,
      todoText: inputText,
      dueDate,
      tagId: selectedTagId || null,
    };
    const method = mode === "ADD" ? "put" : "patch";
    axios
      .request({ url: "/api/todo", method, data })
      .then(async () => {
        setInputText("");
        setDueDate("");
        setSelectedTagId("");
        setMode("ADD");
        setCurTodoId("");
        await fetchAllTodos();
        await fetchData();
      })
      .catch((err) => alert(err));
  }

  function handleDelete(id: string) {
    axios
      .delete("/api/todo", { data: { id } })
      .then(async () => {
        await fetchAllTodos();
        await fetchData();
        setMode("ADD");
        setInputText("");
      })
      .catch((err) => alert(err));
  }

  function handleCancel() {
    setMode("ADD");
    setInputText("");
    setCurTodoId("");
    setDueDate("");
    setSelectedTagId("");
  }

  function toggleIsDone(id: string, isDone: boolean) {
    axios
      .patch("/api/todo/status", { id, isDone })
      .then(() => fetchData())
      .catch(() => alert("Failed to update status"));
  }

  const sortedTodos = [...todos].sort(sortOption === "due" ? compareDueDate : compareDate);

  return (
    <div className="container" style={{ padding: "1rem", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <header>
        <h1 style={{ fontSize: "2rem" }}>📋 Todo App</h1>
      </header>

      <main style={{ width: "100%", maxWidth: "800px" }}>
        {/* ✅ Input + Date + Tag + Add */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.5rem",
            marginBottom: "1.5rem",
          }}
        >
          <input
            data-cy="input-text"
            type="text"
            onChange={handleChange}
            value={inputText}
            placeholder="New Todo"
            style={{ ...inputStyle, minWidth: "200px" }}
          />

          <input
            data-cy="due-date"
            type="date"
            ref={dateInputRef}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            style={{ ...inputStyle, minWidth: "160px" }}
          />

          <TagDropdown
            data-cy="tag-select"
            tags={tags}
            usedTagIds={allTodos.map((todo) => todo.tagId).filter(Boolean).map(String)}
            selectedTagId={selectedTagId}
            onSelectTag={setSelectedTagId}
            onAddTag={async (name) => {
              try {
                const res = await axios.post("/api/tags", { name });
                setTags((prev) => [...prev, res.data.data]);
              } catch {
                alert("Failed to add tag");
              }
            }}
            onDeleteTag={async (id) => {
              try {
                await axios.delete(`/api/tags/${id}`);
                setTags((prev) => prev.filter((t) => t.id !== id));
                await fetchAllTodos();
                await fetchData();
                if (filterTagId === id) setFilterTagId("");
              } catch (error: any) {
                const errMsg = error.response?.data?.error || "Failed to delete tag";
                alert(errMsg);
              }
            }}
          />

          <button data-cy="submit" onClick={handleSubmit} style={buttonStyle}>
            📨 {mode === "ADD" ? "Add" : "Update"}
          </button>

          {mode === "EDIT" && (
            <button data-cy="cancel" onClick={handleCancel} style={secondaryButtonStyle}>
              ❌ Cancel
            </button>
          )}
        </div>

        {/* 🔽 Filter + Sort */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "1rem", marginBottom: 10 }}>
          <label>
            View by Tag 🏷️{" "}
            <select
              data-cy="filter-tag"
              value={filterTagId}
              onChange={(e) => setFilterTagId(e.target.value)}
              style={inputStyle}
            >
              <option value="">All Todos</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Sort by{" "}
            <select
              data-cy="sort-select"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as "created" | "due")}
              style={inputStyle}
            >
              <option value="created">📅 Created</option>
              <option value="due">📌 Due</option>
            </select>
          </label>
        </div>

        {/* 📝 Todo List */}
        <div data-cy="todo-item-wrapper">
          {sortedTodos
            .filter((item) =>
              showStatusFilter === "ALL"
                ? true
                : showStatusFilter === "DONE"
                ? item.isDone
                : !item.isDone
            )
            .map((item, idx) => {
              const { date, time } = formatDateTime(item.createdAt);
              return (
                <article
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "0.5rem",
                    padding: "0.6rem 1rem",
                    borderRadius: "12px",
                    border: "1px solid #ccc",
                  }}
                >
                  <div>({idx + 1})</div>
                  <div>📅 {date}</div>
                  <div>⏰ {time}</div>
                  <div>
                    {item.tagId && `🏷️${tags.find((t) => t.id === item.tagId)?.name || "No Tag"}`}
                  </div>
                  <div style={{ flex: 1 }}>
                    <input
                      type="checkbox"
                      checked={item.isDone}
                      onChange={() => toggleIsDone(item.id, !item.isDone)}
                      title="Mark complete"
                    />
                    <span
                      style={{
                        marginLeft: 8,
                        textDecoration: item.isDone ? "line-through" : "none",
                        opacity: item.isDone ? 0.6 : 1,
                      }}
                    >
                      📰 {item.todoText}
                    </span>
                  </div>
                  <div>
                    📌 Due: {item.dueDate ? formatDateTime(item.dueDate).date : "N/A"}
                  </div>
                  <div
                    data-cy="edit-button"
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      setMode("EDIT");
                      setCurTodoId(item.id);
                      setInputText(item.todoText);
                      setDueDate(item.dueDate || "");
                      setSelectedTagId(item.tagId || "");
                    }}
                  >
                    {curTodoId !== item.id ? "🖊️" : "✍🏻"}
                  </div>
                  {mode === "ADD" && (
                    <div
                      data-cy="delete-button"
                      style={{ cursor: "pointer" }}
                      onClick={() => handleDelete(item.id)}
                    >
                      🗑️
                    </div>
                  )}
                </article>
              );
            })}
        </div>
      </main>
    </div>
  );
}

export default App;

const inputStyle: React.CSSProperties = {
  padding: "0.4rem 0.8rem",
  borderRadius: "10px",
  border: "1px solid #ccc",
  fontSize: "0.9rem",
};

const buttonStyle: React.CSSProperties = {
  border: "none",
  borderRadius: "20px",
  padding: "0.5rem 1rem",
  cursor: "pointer",
  fontSize: "0.9rem",
  backgroundColor: "#cddc39",
};

const secondaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  backgroundColor: "#f44336",
};

function formatDateTime(dateStr: string) {
  if (!dayjs(dateStr).isValid()) return { date: "N/A", time: "N/A" };
  const dt = dayjs(dateStr);
  return {
    date: dt.format("DD/MM/YYYY"),
    time: dt.format("HH:mm"),
  };
}

function compareDate(a: TodoItem, b: TodoItem) {
  return dayjs(a.createdAt).isBefore(dayjs(b.createdAt)) ? -1 : 1;
}

function compareDueDate(a: TodoItem, b: TodoItem) {
  if (!a.dueDate) return 1;
  if (!b.dueDate) return -1;
  return dayjs(a.dueDate).isBefore(dayjs(b.dueDate)) ? -1 : 1;
}
