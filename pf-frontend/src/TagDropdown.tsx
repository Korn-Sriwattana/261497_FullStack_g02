import { useEffect, useRef, useState } from "react";

export interface TagItem {
  id: string;
  name: string;
}

interface Props {
  tags: TagItem[];
  selectedTagId: string;
  usedTagIds: string[];
  onSelectTag: (id: string) => void;
  onAddTag: (name: string) => void | Promise<void>;
  onDeleteTag: (id: string) => void | Promise<void>;
}

export default function TagDropdown({
  tags,
  selectedTagId,
  usedTagIds,
  onSelectTag,
  onAddTag,
  onDeleteTag,
}: Props) {
  const [open, setOpen] = useState(false);
  const [newTag, setNewTag] = useState("");
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const selectedName =
    selectedTagId ? tags.find((t) => t.id === selectedTagId)?.name ?? "" : "";

  const handleAdd = async () => {
    const name = newTag.trim();
    if (!name) return;
    await onAddTag(name);
    setNewTag("");
  };

  return (
    <div className="tagdd" ref={wrapRef}>
      <button
        type="button"
        className={`input-like ${selectedName ? "" : "placeholder"}`}
        data-cy="tag-select"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        {selectedName || "Select tag"}
      </button>

      {open && (
        <div
          className="tagdd-panel"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="tagdd-addrow">
            <input
              className="tagdd-input"
              data-cy="add-tag-input"
              placeholder="New tag name"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
              }}
            />
            <button
              className="tagdd-addbtn"
              data-cy="tag-add-button"
              onClick={handleAdd}
            >
              Add
            </button>
          </div>

          <ul className="tagdd-list">
            {tags.length === 0 && <li className="tagdd-empty">No tags</li>}

            {tags.map((t) => {
              const active = selectedTagId === t.id;
              const used = usedTagIds.includes(t.id);

              const disabledAttr = used ? ({ disabled: true } as any) : ({} as any);

              return (
                <li
                  key={t.id}
                  className="tagdd-item"
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <button
                    type="button"
                    className={`tag-pill ${active ? "active" : ""}`}
                    data-cy={`tag-item-${t.id}`}
                    onClick={() => {
                      onSelectTag(t.id);
                      setOpen(false);
                    }}
                  >
                    <span className="tag-pill-text">{t.name}</span>

                    <span
                      {...disabledAttr} // <- ทำให้มี attribute disabled จริงใน DOM เมื่อ used === true
                      className={`tag-pill-x-in ${used ? "disabled" : ""}`}
                      title={used ? "This tag is used by todos" : "Delete tag"}
                      role="button"
                      tabIndex={0}
                      data-cy={`tag-item-del-${t.id}`}
                      aria-disabled={used}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!used) onDeleteTag(t.id);
                      }}
                      onKeyDown={(e) => {
                        if (!used && (e.key === "Enter" || e.key === " ")) {
                          e.preventDefault();
                          e.stopPropagation();
                          onDeleteTag(t.id);
                        }
                      }}
                    >
                      ×
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
