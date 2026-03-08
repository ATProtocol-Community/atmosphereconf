export function CharCount({ value, max }: { value: string; max: number }) {
  const remaining = max - value.length;
  return (
    <span
      className={`text-xs ${remaining <= 20 ? "text-red-500" : "text-muted-foreground"}`}
    >
      {value.length}/{max}
    </span>
  );
}
