import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SearchInput({ value, onChange, placeholder = "Cari..." }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 pl-9 pr-8 text-sm"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export function TablePagination({
  page,
  totalPages,
  total,
  totalFiltered,
  goTo,
  next,
  prev,
}: {
  page: number;
  totalPages: number;
  total: number;
  totalFiltered: number;
  goTo: (p: number) => void;
  next: () => void;
  prev: () => void;
}) {
  if (totalPages <= 1 && totalFiltered === total) return null;

  return (
    <div className="flex items-center justify-between border-t px-5 py-3 text-sm">
      <p className="text-muted-foreground">
        {totalFiltered !== total
          ? `${totalFiltered} dari ${total}`
          : `${total} item`}
      </p>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={page <= 1}
          onClick={prev}
          className="h-8 w-8"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            // Show pages around current
            let pageNum: number;
            if (totalPages <= 7) {
              pageNum = i + 1;
            } else if (page <= 4) {
              pageNum = i + 1;
            } else if (page >= totalPages - 3) {
              pageNum = totalPages - 6 + i;
            } else {
              pageNum = page - 3 + i;
            }

            // Show first/last with dots jika perlu
            if (i === 0 && pageNum > 1) {
              return (
                <span key="dots-start" className="text-muted-foreground px-1">
                  ... {pageNum}
                </span>
              );
            }
            if (i === 6 && pageNum < totalPages) {
              return (
                <span key="dots-end" className="text-muted-foreground px-1">
                  ... {pageNum}
                </span>
              );
            }

            return (
              <Button
                key={pageNum}
                variant={pageNum === page ? "default" : "ghost"}
                size="icon-sm"
                onClick={() => goTo(pageNum)}
                className={`h-8 w-8 text-xs ${pageNum === page ? "" : ""}`}
              >
                {pageNum}
              </Button>
            );
          })}
        </div>

        <Button
          variant="ghost"
          size="icon-sm"
          disabled={page >= totalPages}
          onClick={next}
          className="h-8 w-8"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
