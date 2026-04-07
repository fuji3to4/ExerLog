import type { ExerciseVideo } from "@/lib/types";

const HEADERS = [
  "id",
  "title",
  "description",
  "videoUrl",
  "thumbnailUrl",
  "bodyArea",
  "purpose",
  "durationMinutes",
  "intensity",
] as const;

function escapeCsvField(value: string | number): string {
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateExerciseCsv(exercises: ExerciseVideo[]): string {
  const rows = [
    HEADERS.join(","),
    ...exercises.map((e) => HEADERS.map((h) => escapeCsvField(e[h])).join(",")),
  ];
  return rows.join("\n");
}

export type ParseExerciseCsvResult = {
  exercises: ExerciseVideo[];
  skipped: number;
};

export function parseExerciseCsv(csv: string): ParseExerciseCsvResult {
  const lines = csv
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { exercises: [], skipped: 0 };
  }

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^[\uFEFF"]+|"$/g, ""));
  const exercises: ExerciseVideo[] = [];
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? "";
    });

    const durationMinutes = Number(row.durationMinutes);
    const isValid =
      row.title && row.videoUrl && row.bodyArea && row.purpose && row.intensity && !isNaN(durationMinutes) && durationMinutes > 0;

    if (!isValid) {
      skipped++;
      continue;
    }

    exercises.push({
      id: row.id?.trim() || crypto.randomUUID(),
      title: row.title,
      description: row.description ?? "",
      videoUrl: row.videoUrl,
      thumbnailUrl: row.thumbnailUrl ?? "",
      bodyArea: row.bodyArea,
      purpose: row.purpose,
      durationMinutes,
      intensity: row.intensity as ExerciseVideo["intensity"],
    });
  }

  return { exercises, skipped };
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
