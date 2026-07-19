import { useRef, useState, useCallback } from "react";
import { CheckCircle2, XCircle, Plus, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface FeatureListEditorProps {
  label: string;
  variant: "included" | "excluded";
  values: string[];
  onChange: (values: string[]) => void;
  lang?: "id" | "en";
}

export function FeatureListEditor({
  label,
  variant,
  values,
  onChange,
  lang = "id",
}: FeatureListEditorProps) {
  const [input, setInput] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const dragOverIndex = useRef<number | null>(null);

  const handleAdd = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (values.includes(trimmed)) return;
    onChange([...values, trimmed]);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleRemove = (index: number) => {
    onChange(values.filter((_, i) => i !== index));
  };

  // ─── Drag & Drop ──────────────────────────────────────

  const reorder = useCallback(
    (from: number, to: number) => {
      const copy = [...values];
      const [moved] = copy.splice(from, 1);
      copy.splice(to, 0, moved);
      onChange(copy);
    },
    [values, onChange]
  );

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    dragOverIndex.current = index;
  };

  const handleDragEnd = () => {
    const from = dragIndex;
    const to = dragOverIndex.current;
    if (from !== null && to !== null && from !== to) {
      reorder(from, to);
    }
    setDragIndex(null);
    dragOverIndex.current = null;
  };

  // ─── Visual ──────────────────────────────────────────

  const isGreen = variant === "included";
  const Icon = isGreen ? CheckCircle2 : XCircle;
  const iconColor = isGreen ? "text-green-500" : "text-red-400";
  const borderColor = isGreen ? "border-green-200" : "border-red-200";
  const bgColor = isGreen ? "bg-green-50/50" : "bg-red-50/50";

  return (
    <div className={`rounded-lg border ${borderColor} ${bgColor} p-3 space-y-2`}>
      {/* Header */}
      <div className="flex items-center gap-2 text-sm font-medium">
        <Icon className={`w-4 h-4 ${iconColor}`} />
        <span>{label}</span>
        <span className="text-xs text-muted-foreground">({values.length})</span>
      </div>

      {/* Input + tombol tambah */}
      <div className="flex gap-1.5">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={lang === "id" ? "Ketik fitur lalu Enter..." : "Type feature then Enter..."}
          className="h-8 text-xs"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={`shrink-0 ${isGreen ? "hover:text-green-600" : "hover:text-red-500"}`}
          onClick={handleAdd}
          disabled={!input.trim()}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Daftar fitur — drag-and-drop */}
      {values.length > 0 && (
        <ul className="space-y-1">
          {values.map((val, i) => (
            <li
              key={`${i}-${val}`}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDragEnd={handleDragEnd}
              className={`
                flex items-center gap-1.5 text-xs rounded-md px-2 py-1.5
                transition-all duration-150 select-none
                ${dragIndex === i ? "opacity-40 ring-2 ring-primary/30 shadow-sm" : "bg-white/80"}
                ${dragOverIndex.current === i && dragIndex !== i ? "ring-2 ring-primary/50 scale-[1.01]" : ""}
                group cursor-default
              `}
            >
              {/* Drag handle */}
              <span className="cursor-grab active:cursor-grabbing shrink-0 text-slate-300 hover:text-slate-500 touch-none">
                <GripVertical className="w-3.5 h-3.5" />
              </span>

              <Icon className={`w-3.5 h-3.5 ${iconColor} shrink-0`} />
              <span className="flex-1 leading-tight">{val}</span>

              {/* Hapus — muncul saat hover */}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-slate-400 hover:text-red-500"
                onClick={() => handleRemove(i)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {values.length === 0 && (
        <p className="text-xs text-muted-foreground italic px-1">
          Belum ada fitur. Ketik di atas lalu tekan Enter.
        </p>
      )}
    </div>
  );
}
