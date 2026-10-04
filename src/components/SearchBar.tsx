import { Search } from "lucide-react";

export function SearchBar({ value, onChange, autoFocus }: { value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  return (
    <label className="flex w-full max-w-xl items-center gap-3 rounded-full bg-elevated px-5 py-3 ring-primary transition focus-within:ring-2">
      <Search className="h-5 w-5 text-muted-foreground" />
      <input
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search for an album, artist or genre"
        className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </label>
  );
}
