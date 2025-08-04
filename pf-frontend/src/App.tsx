import { useEffect, useState } from "react";
import axios from "axios";
import { type TodoItem } from "./types";
import dayjs from "dayjs";

function App() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [inputText, setInputText] = useState("");
  const [mode, setMode] = useState<"ADD" | "EDIT">("ADD");
  const [curTodoId, setCurTodoId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [sortOption, setSortOption] = useState<"created" | "due">("created");
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  async function fetchData() {
    const res = await axios.get<TodoItem[]>("api/todo");
    setTodos(res.data);
  }

  useEffect(() => {
    fetchData();
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInputText(e.target.value);
  }

  function handleSubmit() {
    if (!inputText) return;
    if (mode === "ADD") {
      axios
        .put("/api/todo", { todoText: inputText, dueDate })
        .then(() => setInputText(""))
        .then(fetchData)
        .catch((err) => alert(err));
    } else {
      axios
        .patch("/api/todo", {
          id: curTodoId,
          todoText: inputText,
          dueDate,
        })
        .then(() => {
          setInputText("");
          setDueDate("");
          setMode("ADD");
          setCurTodoId("");
        })
        .then(fetchData)
        .catch((err) => alert(err));
    }
  }

  function handleDelete(id: string) {
    axios
      .delete("/api/todo", { data: { id } })
      .then(fetchData)
      .then(() => {
        setMode("ADD");
        setInputText("");
      })
      .catch((err) => alert(err));
  }

  function handleCancel() {
    setMode("ADD");
    setInputText("");
    setCurTodoId("");
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
            alignItems: "start",
            gap: "0.5rem",
            marginBottom: "0.5rem",
          }}
        >
          <input
            type="text"
            onChange={handleChange}
            value={inputText}
            data-cy="input-text"
          />
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            data-cy="input-due-date"
          />
          <button onClick={handleSubmit} data-cy="submit">
            {mode === "ADD" ? "Submit" : "Update"}
          </button>

          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              style={{
                display: "flex",
                gap: "0.5rem",
                alignItems: "center",
                marginBottom: "0.5rem",
              }}
            >
              Sort
            </button>

            {showSortDropdown && (
              <div
                style={{
                  position: "absolute",
                  top: "2.2rem",
                  right: 0,
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
          </div>

          {mode === "EDIT" && (
            <button onClick={handleCancel} className="secondary">
              Cancel
            </button>
          )}
        </div>

        <div data-cy="todo-item-wrapper">
          {sortedTodos.map((item, idx) => {
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
                <div data-cy="todo-item-text">📰{text}</div>
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
  if (!dayjs(dateStr).isValid()) {
    return { date: "N/A", time: "N/A" };
  }
  const dt = dayjs(dateStr);
  const date = dt.format("D/MM/YY");
  const time = dt.format("HH:mm");
  return { date, time };
}

function compareDate(a: TodoItem, b: TodoItem) {
  const da = dayjs(a.createdAt);
  const db = dayjs(b.createdAt);
  return da.isBefore(db) ? -1 : 1;
}

function compareDueDate(a: TodoItem, b: TodoItem) {
  if (!a.dueDate) return 1;
  if (!b.dueDate) return -1;
  const da = dayjs(a.dueDate);
  const db = dayjs(b.dueDate);
  return da.isBefore(db) ? -1 : 1;
}
