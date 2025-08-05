import { useState, useEffect, useRef } from "react";
import { type TagItem } from "./types";

function TagDropdown({
  tags,
  selectedTagId,
  usedTagIds,
  onSelectTag,
  onAddTag,
  onDeleteTag,
}: {
  tags: TagItem[];
  selectedTagId: string;
  usedTagIds: string[];
  onSelectTag: (id: string) => void;
  onAddTag: (name: string) => void;
  onDeleteTag: (id: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ปิด dropdown เมื่อคลิกนอก
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleAdd() {
    const name = newTagName.trim();
    if (!name) return;
    onAddTag(name);
    setNewTagName("");
  }

  return (
    <div
      ref={dropdownRef}
      data-cy="tag-select"
      style={{
        position: "relative",
        width: 220,
        height: "100%",
        userSelect: "none",
      }}
    >
      {/* ปุ่มแสดง tag ที่เลือก และเปิด dropdown */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          border: "1px solid #ccc",
          height: "100%",
          padding: "8px",
          borderRadius: 4,
          display: "flex",
          alignItems: "center", // จัดกลางแนวตั้ง
          justifyContent: "flex-start", // จัดชิดซ้าย
          cursor: "pointer",
          backgroundColor: "#fff",
        }}
      >
        {selectedTagId
          ? tags.find((t) => t.id === selectedTagId)?.name
          : "🏷️Tag (optional)"}
      </div>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            width: "100%",
            border: "1px solid #ccc",
            borderRadius: 4,
            backgroundColor: "#fff",
            boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
            zIndex: 1000,
            padding: 8,
          }}
        >
          {/* Input + ปุ่มเพิ่ม */}
          <div style={{ display: "flex", marginBottom: 8, gap: 6 }}>
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="New tag"
              data-cy="add-tag-input"
              style={{
                flexGrow: 1,
                padding: 6,
                borderRadius: 4,
                height: 60,
                border: "1px solid #ccc",
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAdd();
                }
              }}
            />
            <button
              onClick={handleAdd}
              data-cy="tag-add-button"
              style={{
                padding: "6px 12px",
                backgroundColor: "#28a745",
                height: 60,
                width: 80,
                border: "none",
                borderRadius: 4,
                color: "white",
                cursor: "pointer",
              }}
            >
              Add
            </button>
          </div>

          {/* รายการ tag */}
          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              maxHeight: 200,
              overflowY: "auto",
              borderTop: "1px solid #eee",
            }}
          >
            {tags.map((tag) => {
              // const isUsed = usedTagIds.includes(tag.id);
              return (
                <li
                  key={tag.id}
                  data-cy={`tag-item-${tag.id}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "6px 10px",
                    cursor: "pointer",
                    backgroundColor:
                      tag.id === selectedTagId ? "#007bff" : "transparent",
                    color: tag.id === selectedTagId ? "white" : "black",
                    borderRadius: 4,
                    marginBottom: 2,
                    userSelect: "none",
                  }}
                  onClick={() => {
                    onSelectTag(tag.id);
                    setIsOpen(false);
                  }}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectTag(tag.id);
                      setIsOpen(false);
                    }
                  }}
                >
                  <span style={{ flexGrow: 1 }}>{tag.name}</span>
                  <button
                    data-cy={`delete-tag-${tag.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      const isUsed = usedTagIds.includes(tag.id);
                      if (isUsed) {
                        alert(
                          `Cannot delete tag "${tag.name}" because it is in use.`
                        );
                        return;
                      }
                      onDeleteTag(tag.id);
                      if (tag.id === selectedTagId) {
                        onSelectTag("");
                      }
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      color:
                        tag.id === selectedTagId
                          ? "white"
                          : usedTagIds.includes(tag.id)
                          ? "#999"
                          : "red",
                      fontWeight: "bold",
                      cursor: usedTagIds.includes(tag.id)
                        ? "not-allowed"
                        : "pointer",
                      fontSize: 16,
                      marginLeft: 8,
                    }}
                    aria-label={`Delete tag ${tag.name}`}
                    tabIndex={-1}
                    disabled={usedTagIds.includes(tag.id)}
                  >
                    ×
                  </button>
                </li>
              );
            })}
            {tags.length === 0 && (
              <li
                style={{
                  color: "#999",
                  textAlign: "center",
                  padding: 8,
                }}
              >
                No tags available
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export default TagDropdown;
