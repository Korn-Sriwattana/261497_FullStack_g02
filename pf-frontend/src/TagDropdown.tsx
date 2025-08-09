import { useEffect, useRef, useState } from "react";

export type TagItem = { id: string; name: string };

type Props = {
  tags: TagItem[];
  selectedTagId: string;        // "" ได้ถ้ายังไม่เลือก
  usedTagIds: string[];
  onSelectTag: (id: string) => void;
  onAddTag: (name: string) => void;
  onDeleteTag: (id: string) => void;
};

export default function TagDropdown({
  tags,
  selectedTagId,
  usedTagIds,
  onSelectTag,
  onAddTag,
  onDeleteTag,
}: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const selected = selectedTagId ? tags.find((t) => t.id === selectedTagId) : undefined;

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  return (
    <div className="tagdd" ref={wrapRef}>
      <button
        type="button"
        data-cy="tag-select"
        className={`input-like ${!selected ? "placeholder" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        title={selected ? selected.name : "choose tag"}
      >
        {selected ? selected.name : "choose tag"}
      </button>

      {open && (
        <div className="tagdd-panel">
          <div className="tagdd-addrow">
            <input
              className="tagdd-input"
              data-cy="add-tag-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="new tag name"
            />
            <button
              className="tagdd-addbtn"
              data-cy="tag-add-button"
              onClick={() => {
                const v = name.trim();
                if (!v) return;
                onAddTag(v);
                setName("");
              }}
            >
              add
            </button>
          </div>

          <ul className="tagdd-list">
            {tags.map((t) => {
              const used = usedTagIds.includes(t.id);
              const active = selectedTagId === t.id;
              return (
                <li
                  key={t.id}
                  data-cy={`tag-item-${t.id}`}
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <button
                    data-cy="tag-item"
                    className={`menu-item ${active ? "active" : ""}`}
                    style={{ flex: 1 }}
                    onClick={() => {
                      onSelectTag(t.id);
                      setOpen(false);
                    }}
                    title={t.name}
                  >
                    {t.name}
                  </button>
                  <button
                    data-cy={`tag-item-del-${t.id}`}
                    className={`tag-pill-x-in ${used ? "disabled" : ""}`}
                    onClick={() => onDeleteTag(t.id)}
                    disabled={used}
                    title={used ? "Tag is used by some todos" : "Delete tag"}
                  >
                    ❌
                  </button>
                </li>
              );
            })}
            {tags.length === 0 && <li className="tagdd-empty">no tags</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
