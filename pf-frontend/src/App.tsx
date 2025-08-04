import { useEffect, useState } from "react";
import axios from "axios";
import { type TodoItem, type TagItem, type TagOption} from "./types";
import dayjs from "dayjs";
import TagDropdown from "./TagDropdown";
function App() {
  const [todos, setTodos] = useState<TodoItem[]>([]);       // todos ที่แสดง (filtered)
  const [allTodos, setAllTodos] = useState<TodoItem[]>([]); // todos ทั้งหมด (ไม่กรอง)
  const [inputText, setInputText] = useState("");
  const [mode, setMode] = useState<"ADD" | "EDIT">("ADD");
  const [curTodoId, setCurTodoId] = useState("");

  const [tags, setTags] = useState<TagItem[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<string>("");
  const [filterTagId, setFilterTagId] = useState<string>("");

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

  // เมื่อ filterTagId เปลี่ยน ให้โหลด todo ใหม่
  useEffect(() => {
    fetchData();
  }, [filterTagId]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInputText(e.target.value);
  }

  function handleSubmit() {
  if (!inputText) return;
    if (mode === "ADD") {
      axios
        .request({
          url: "/api/todo",
          method: "put",
          data: { todoText: inputText, tagId: selectedTagId || null },
        })
        .then(async () => {
          setInputText("");
          setSelectedTagId("");
          await fetchAllTodos();
          await fetchData();
        })
        .catch((err) => alert(err));
    } else {
      axios
        .request({
          url: "/api/todo",
          method: "patch",
          data: { id: curTodoId, todoText: inputText, tagId: selectedTagId || null },
        })
        .then(async () => {
          setInputText("");
          setSelectedTagId("");
          setMode("ADD");
          setCurTodoId("");
          await fetchAllTodos();
          await fetchData();
        })
        .catch((err) => alert(err));
    }
  }

  function handleDelete(id: string) {
    axios
      .delete("/api/todo", { data: { id } })
      .then(async () => {
      await fetchAllTodos(); // โหลด todo ทั้งหมดใหม่
      await fetchData();     // โหลด todo ตาม filter ใหม่
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
  return (
    <div className="container">
      <header>
        <h1>Todo App</h1>
      </header>
      <main>
        <div style={{ display: "flex", alignItems: "start" }}>
          <input
            type="text"
            onChange={handleChange}
            value={inputText}
            data-cy="input-text"
            placeholder="New Todo"
          />
         
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <TagDropdown
            tags={tags}
            usedTagIds={allTodos.map((todo) => todo.tagId).filter(Boolean).map(String)}
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

              // ถ้ากำลัง filter tag ที่ถูกลบอยู่ ให้เปลี่ยนเป็น all todos
              if (filterTagId === id) {
                setFilterTagId("");
              }
            } catch (error: any) {
              const errMsg = error.response?.data?.error || "Failed to delete tag";
              alert(errMsg);
            }
          }}
          />
          </div>

          <button onClick={handleSubmit} data-cy="submit">
            {mode === "ADD" ? "Submit" : "Update"}
          </button>
          {mode === "EDIT" && (
            <button onClick={handleCancel} className="secondary">
              Cancel
            </button>
          )}
        </div>
        {/* Dropdown กรอง todo ตาม tag */}
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
          {todos.sort(compareDate).map((item, idx) => {
            const { date, time } = formatDateTime(item.createdAt);
            const text = item.todoText;
            return (
              <article
                key={item.id}
                style={{
                  display: "flex",
                  gap: "0.5rem",
                }}
              >
                <div>({idx + 1})</div>
                <div>📅{date}</div>
                <div>⏰{time}</div>
                <div data-cy="todo-tag">
                  {item.tagId
                    ? "🏷️" + tags.find(tag => tag.id === item.tagId)?.name || "No Tag"
                    : ""}
                </div>
                <div data-cy="todo-item-text">📰{text}</div>
                <div
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    setMode("EDIT");
                    setCurTodoId(item.id);
                    setInputText(item.todoText);
                    setSelectedTagId(item.tagId || "")
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
