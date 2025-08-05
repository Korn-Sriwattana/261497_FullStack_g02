import { useEffect, useState } from "react";
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
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const [tags, setTags] = useState<TagItem[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<string>("");
  const [filterTagId, setFilterTagId] = useState<string>("");
  const [showStatusFilter, setShowStatusFilter] = useState<
    "ALL" | "DONE" | "UNDONE"
  >("ALL");

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
    } catch (err) {
      alert("Failed to fetch tags");
    }
  }

  useEffect(() => {
    fetchAllTodos();
    fetchData();
    fetchTags();
  }, []);

  useEffect(() => {
    fetchData();
  }, [filterTagId]);

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

  const sortedTodos = [...todos].sort(
    sortOption === "due" ? compareDueDate : compareDate
  );

  return (
    <div className="container">
      <header>
        <h1>Todo App</h1>
      </header>

      <main>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "0.5rem",
            flexWrap: "wrap",
          }}
        >
          <input
            type="text"
            onChange={handleChange}
            value={inputText}
            data-cy="input-text"
            placeholder="New Todo"
          />

          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            data-cy="input-due-date"
          />

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <TagDropdown
              tags={tags}
              usedTagIds={allTodos
                .map((todo) => todo.tagId)
                .filter(Boolean)
                .map(String)}
              selectedTagId={selectedTagId}
              onSelectTag={setSelectedTagId}
              onAddTag={async (name) => {
                try {
                  const res = await axios.post("/api/tags", { name });
                  const newTag = res.data.data;
                  setTags((prev) => [...prev, newTag]);
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
                  const errMsg =
                    error.response?.data?.error || "Failed to delete tag";
                  alert(errMsg);
                }
              }}
            />
          </div>

          <button onClick={handleSubmit} data-cy="submit">
            {mode === "ADD" ? "Submit" : "Update"}
          </button>

          <button
            onClick={() => {
              setShowSortDropdown(!showSortDropdown);
            }}
          >
            Sort
          </button>

          <button
            onClick={() => {
              setShowStatusFilter((prev) =>
                prev === "ALL" ? "DONE" : prev === "DONE" ? "UNDONE" : "ALL"
              );
            }}
          >
            {showStatusFilter === "ALL"
              ? "📋 All"
              : showStatusFilter === "DONE"
              ? "✅ Done"
              : "🕓 Undone"}
          </button>

          {mode === "EDIT" && (
            <button onClick={handleCancel} className="secondary">
              Cancel
            </button>
          )}
        </div>

        {showSortDropdown && (
          <div
            style={{
              position: "absolute",
              top: "6.5rem",
              right: "1rem",
              backgroundColor: "#1e1e1e",
              borderRadius: "10px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.6)",
              zIndex: 10,
            }}
          >
            <div
              style={dropdownItemStyle}
              onClick={() => {
                setSortOption("created");
                setShowSortDropdown(false);
              }}
            >
              📅 Created Date
            </div>
            <div
              style={dropdownItemStyle}
              onClick={() => {
                setSortOption("due");
                setShowSortDropdown(false);
              }}
            >
              📌 Due Date
            </div>
          </div>
        )}

        <div style={{ marginTop: 20 }}>
          <label>
            View Todos by tag🏷️{" "}
            <select
              value={filterTagId}
              data-cy="tag-filter"
              onChange={(e) => setFilterTagId(e.target.value)}
            >
              <option value="">All Todos</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </select>
          </label>
        </div>

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
              const text = item.todoText;
              return (
                <article
                  key={item.id}
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    alignItems: "center",
                  }}
                >
                  <div>({idx + 1})</div>
                  <div>📅{date}</div>
                  <div>⏰{time}</div>
                  <div data-cy="todo-tag">
                    {item.tagId
                      ? "🏷️" +
                          tags.find((tag) => tag.id === item.tagId)?.name ||
                        "No Tag"
                      : ""}
                  </div>
                  <div
                    data-cy="todo-item-text"
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <input
                      type="checkbox"
                      checked={item.isDone}
                      onChange={() => toggleIsDone(item.id, !item.isDone)}
                      title="Mark complete"
                    />
                    <span
                      style={{
                        textDecoration: item.isDone ? "line-through" : "none",
                        opacity: item.isDone ? 0.6 : 1,
                      }}
                    >
                      📰{text}
                    </span>
                  </div>
                  <div>
                    📌 Due:{" "}
                    {item.dueDate ? formatDateTime(item.dueDate).date : "N/A"}
                  </div>
                  <div
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      setMode("EDIT");
                      setCurTodoId(item.id);
                      setInputText(item.todoText);
                      setDueDate(item.dueDate || "");
                      setSelectedTagId(item.tagId || "");
                    }}
                    data-cy="todo-item-update"
                  >
                    {curTodoId !== item.id ? "🖊️" : "✍🏻"}
                  </div>
                  {mode === "ADD" && (
                    <div
                      style={{ cursor: "pointer" }}
                      onClick={() => handleDelete(item.id)}
                      data-cy="todo-item-delete"
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

const dropdownItemStyle: React.CSSProperties = {
  padding: "0.5rem 1rem",
  cursor: "pointer",
  color: "#ddd",
  fontSize: "0.9rem",
  whiteSpace: "nowrap",
};

function formatDateTime(dateStr: string) {
  if (!dayjs(dateStr).isValid()) return { date: "N/A", time: "N/A" };
  const dt = dayjs(dateStr);
  return { date: dt.format("D/MM/YY"), time: dt.format("HH:mm") };
}

function compareDate(a: TodoItem, b: TodoItem) {
  return dayjs(a.createdAt).isBefore(dayjs(b.createdAt)) ? -1 : 1;
}

function compareDueDate(a: TodoItem, b: TodoItem) {
  if (!a.dueDate) return 1;
  if (!b.dueDate) return -1;
  return dayjs(a.dueDate).isBefore(dayjs(b.dueDate)) ? -1 : 1;
}
