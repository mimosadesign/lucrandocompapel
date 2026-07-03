import * as React from "react";
import { Input } from "@/components/ui/input";

interface MoneyInputProps
  extends Omit<React.ComponentProps<"input">, "value" | "onChange"> {
  value: number;
  onChange: (n: number) => void;
}

/**
 * Numeric input that preserves the user's raw text (including trailing commas)
 * so typing "12," doesn't get instantly parsed back to 12. Accepts both
 * comma and dot as decimal separators (Brazilian locale friendly).
 */
export function MoneyInput({
  value,
  onChange,
  className,
  ...props
}: MoneyInputProps) {
  const [text, setText] = React.useState(() =>
    value ? String(value).replace(".", ",") : "",
  );
  const lastEmittedRef = React.useRef<number>(value);

  React.useEffect(() => {
    if (value !== lastEmittedRef.current) {
      setText(value ? String(value).replace(".", ",") : "");
      lastEmittedRef.current = value;
    }
  }, [value]);

  return (
    <Input
      inputMode="decimal"
      {...props}
      className={className}
      value={text}
      onChange={(e) => {
        let t = e.target.value.replace(/[^\d.,]/g, "");
        // keep only the first decimal separator
        const firstSep = t.search(/[.,]/);
        if (firstSep !== -1) {
          const before = t.slice(0, firstSep + 1);
          const after = t.slice(firstSep + 1).replace(/[.,]/g, "");
          t = before + after;
        }
        setText(t);
        const n = parseFloat(t.replace(",", ".")) || 0;
        lastEmittedRef.current = n;
        onChange(n);
      }}
    />
  );
}
