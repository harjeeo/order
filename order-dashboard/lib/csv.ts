// Minimal RFC4180-ish CSV parser — handles quoted fields, embedded commas
// and escaped quotes ("") since menu item names/add-ons can contain commas.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  // Normalise line endings so \r\n and \r don't produce blank extra rows.
  const input = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function toCsv(rows: string[][]): string {
  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}

export function downloadCsv(filename: string, csvText: string) {
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// "Half:100;Full:180" -> [{ name: "Half", price: 100 }, { name: "Full", price: 180 }]
export function parsePricedList(value: string): { name: string; price: number }[] {
  if (!value?.trim()) return [];
  return value
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [name, price] = part.split(":").map((s) => s.trim());
      return { name: name ?? "", price: Number(price) || 0 };
    })
    .filter((v) => v.name);
}
