import { useEffect, useRef, useState } from "react";

export type TagItem = { id: string; name: string };

type Props = {
  tags: TagItem[];
  selectedTagId: string;
  usedTagIds: string[];
  onSelectTag: (id: string) => void;
  onAddTag: (name: string) => void;
  onDeleteTag: (id: string) => void;
};

export default function TagDropdown(props: Props) {
  const {
    tags,
    selectedTagId,
    usedTagIds,
    onSelectTag,
    onAddTag,
    onDeleteTag,
  } = props;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const selected = tags.find((t) => t.id === selectedTagId);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  return (
    <div className="tagdd-wrap" ref={wrapRef}>
      <button
        type="button"
        data-cy="tag-select"
        className={`input-like ${!selected ? "placeholder" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
      >
        {selected ? selected.name : "choose tag"}
      </button>

      {open && (
        <div className="tagdd-panel">
          <div className="tagdd-add">
            <input
              data-cy="add-tag-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="new tag name"
            />
            <button
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
              return (
                <li key={t.id} data-cy={`tag-item-${t.id}`}>
                  <button
                    data-cy="tag-item"
                    className="tagdd-item-btn"
                    onClick={() => {
                      onSelectTag(t.id);
                      setOpen(false);
                    }}
                  >
                    {t.name}
                  </button>
                  <button
                    data-cy={`tag-item-del-${t.id}`}
                    className="tagdd-del-btn"
                    onClick={() => onDeleteTag(t.id)}
                    disabled={used}
                    title={used ? "Tag is used by some todos" : "Delete tag"}
                  >
                    ✖
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
