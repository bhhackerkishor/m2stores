export function toCsv(headers: string[], rows: Array<Array<string | number | null | undefined>>): string {
  const esc = (v: string | number | null | undefined) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
}

/** Minimal RFC-4180-ish CSV parser (quotes + commas + newlines). No dependencies. */
export function parseCsv(text: string): { headers: string[]; rows: string[][]; errors: string[] } {
  const errors: string[] = [];
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  const pushField = () => {
    cur.push(field);
    field = "";
  };
  const pushRow = () => {
    // skip fully-empty rows
    if (!(cur.length === 1 && cur[0].trim() === "")) rows.push(cur);
    cur = [];
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      if (field === "") inQuotes = true;
      else field += c;
    } else if (c === ",") {
      pushField();
    } else if (c === "\n") {
      pushField();
      pushRow();
    } else if (c === "\r") {
      // ignore, \n handles it
    } else {
      field += c;
    }
  }
  pushField();
  pushRow();
  if (rows.length === 0) {
    errors.push("Empty CSV file");
    return { headers: [], rows: [], errors };
  }
  const headers = rows[0].map((h) => h.trim());
  return { headers, rows: rows.slice(1), errors };
}
