import { useMemo, useState } from "react";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

interface UseTableOptions<T> {
  data: T[];
  pageSize?: number;
  searchKeys?: (keyof T | ((item: T) => string))[];
  defaultSort?: { key: keyof T; dir: "asc" | "desc" };
}

export function useTable<T extends Record<string, any>>({
  data,
  pageSize = 10,
  searchKeys,
  defaultSort,
}: UseTableOptions<T>) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<keyof T | null>(defaultSort?.key ?? null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(defaultSort?.dir ?? "asc");

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((item) => {
      if (searchKeys) {
        for (const key of searchKeys) {
          const val = typeof key === "function" ? key(item) : item[key];
          if (String(val ?? "").toLowerCase().includes(q)) return true;
        }
        return false;
      }
      for (const val of Object.values(item)) {
        if (typeof val === "string" && val.toLowerCase().includes(q)) return true;
        if (typeof val === "number" && String(val).includes(q)) return true;
      }
      return false;
    });
  }, [data, search, searchKeys]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      let cmp = 0;
      if (typeof aVal === "string" && typeof bVal === "string") {
        cmp = aVal.localeCompare(bVal, "id");
      } else {
        cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginated = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, safePage, pageSize]);

  function toggleSort(key: keyof T) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  }

  function handleSearch(val: string) {
    setSearch(val);
    setPage(1);
  }

  function goTo(p: number) {
    setPage(Math.max(1, Math.min(p, totalPages)));
  }

  return {
    rows: paginated,
    total: data.length,
    totalFiltered: filtered.length,
    search,
    setSearch: handleSearch,
    sortKey,
    sortDir,
    toggleSort,
    page: safePage,
    totalPages,
    goTo,
    next: () => goTo(safePage + 1),
    prev: () => goTo(safePage - 1),
    pageSize,
  };
}

export function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) {
    return <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />;
  }
  if (dir === "asc") {
    return <ArrowUp className="w-3.5 h-3.5 text-primary" />;
  }
  return <ArrowDown className="w-3.5 h-3.5 text-primary" />;
}
