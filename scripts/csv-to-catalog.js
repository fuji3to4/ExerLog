"use strict";

const Papa = require("papaparse");

const REQUIRED_STRING_FIELDS = ["id", "title", "videoUrl", "bodyArea", "purpose"];

const VALID_INTENSITIES = ["low", "medium", "high"];

function parseCsvToCatalog(csvText) {
  const withoutBom = csvText.replace(/^\uFEFF/, "");
  const parsed = Papa.parse(withoutBom, {
    header: true,
    skipEmptyLines: true,
  });

  const rows = [];
  const errors = [];
  const seenIds = new Set();

  if (parsed.errors.length > 0) {
    parsed.errors.forEach((err) => {
      const rowNumber = typeof err.row === "number" ? err.row + 2 : undefined;
      errors.push(
        rowNumber !== undefined ? `row ${rowNumber}: ${err.message}` : err.message
      );
    });
  }

  parsed.data.forEach((record, index) => {
    const rowNumber = index + 2; // +1 for header row, +1 for 0-based index
    const rowErrors = [];

    if (record.__parsed_extra && record.__parsed_extra.length > 0) {
      rowErrors.push(`has more columns than the header (check for an unescaped comma)`);
    }

    for (const field of REQUIRED_STRING_FIELDS) {
      if (!record[field] || record[field].trim() === "") {
        rowErrors.push(`missing "${field}"`);
      }
    }

    if (!VALID_INTENSITIES.includes(record.intensity)) {
      rowErrors.push(
        `invalid "intensity" value "${record.intensity}" (must be low, medium, or high)`
      );
    }

    const durationMinutes = Number(record.durationMinutes);
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      rowErrors.push(
        `invalid "durationMinutes" value "${record.durationMinutes}" (must be a positive number)`
      );
    }

    if (record.id) {
      if (seenIds.has(record.id)) {
        rowErrors.push(`duplicate "id" value "${record.id}"`);
      }
      seenIds.add(record.id);
    }

    if (rowErrors.length > 0) {
      errors.push(`row ${rowNumber}: ${rowErrors.join(", ")}`);
      return;
    }

    rows.push({
      id: record.id,
      title: record.title,
      description: record.description || "",
      videoUrl: record.videoUrl,
      thumbnailUrl: record.thumbnailUrl || "",
      bodyArea: record.bodyArea,
      purpose: record.purpose,
      durationMinutes,
      intensity: record.intensity,
    });
  });

  return { rows, errors };
}

module.exports = { parseCsvToCatalog };
