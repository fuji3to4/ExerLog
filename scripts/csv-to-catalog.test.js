const { parseCsvToCatalog } = require("./csv-to-catalog");

const HEADER =
  "id,title,description,videoUrl,thumbnailUrl,bodyArea,purpose,durationMinutes,intensity";

test("parses a valid CSV into ExerciseVideo rows", () => {
  const csv = [
    HEADER,
    "walk-1,Walk,A short walk.,https://example.com/v,/thumb.jpg,full-body,endurance,10,medium",
  ].join("\n");

  const { rows, errors } = parseCsvToCatalog(csv);

  expect(errors).toEqual([]);
  expect(rows).toEqual([
    {
      id: "walk-1",
      title: "Walk",
      description: "A short walk.",
      videoUrl: "https://example.com/v",
      thumbnailUrl: "/thumb.jpg",
      bodyArea: "full-body",
      purpose: "endurance",
      durationMinutes: 10,
      intensity: "medium",
    },
  ]);
});

test("strips a leading UTF-8 BOM before parsing", () => {
  const csv =
    "\uFEFF" +
    [
      HEADER,
      "walk-1,Walk,A short walk.,https://example.com/v,/thumb.jpg,full-body,endurance,10,medium",
    ].join("\n");

  const { rows, errors } = parseCsvToCatalog(csv);

  expect(errors).toEqual([]);
  expect(rows).toHaveLength(1);
  expect(rows[0].id).toBe("walk-1");
});

test("reports missing required fields", () => {
  const csv = [
    HEADER,
    ",Walk,A short walk.,https://example.com/v,/thumb.jpg,,endurance,10,medium",
  ].join("\n");

  const { rows, errors } = parseCsvToCatalog(csv);

  expect(rows).toEqual([]);
  expect(errors).toEqual(['row 2: missing "id", missing "bodyArea"']);
});

test("allows a blank description and thumbnailUrl", () => {
  const csv = [
    HEADER,
    "walk-1,Walk,,https://example.com/v,,full-body,endurance,10,medium",
  ].join("\n");

  const { rows, errors } = parseCsvToCatalog(csv);

  expect(errors).toEqual([]);
  expect(rows).toEqual([
    {
      id: "walk-1",
      title: "Walk",
      description: "",
      videoUrl: "https://example.com/v",
      thumbnailUrl: "",
      bodyArea: "full-body",
      purpose: "endurance",
      durationMinutes: 10,
      intensity: "medium",
    },
  ]);
});

test("reports an invalid intensity value", () => {
  const csv = [
    HEADER,
    "walk-1,Walk,A short walk.,https://example.com/v,/thumb.jpg,full-body,endurance,10,extreme",
  ].join("\n");

  const { errors } = parseCsvToCatalog(csv);

  expect(errors).toEqual([
    'row 2: invalid "intensity" value "extreme" (must be low, medium, or high)',
  ]);
});

test("reports a non-numeric durationMinutes value", () => {
  const csv = [
    HEADER,
    "walk-1,Walk,A short walk.,https://example.com/v,/thumb.jpg,full-body,endurance,abc,medium",
  ].join("\n");

  const { errors } = parseCsvToCatalog(csv);

  expect(errors).toEqual([
    'row 2: invalid "durationMinutes" value "abc" (must be a positive number)',
  ]);
});

test("reports duplicate ids", () => {
  const csv = [
    HEADER,
    "walk-1,Walk,A short walk.,https://example.com/v,/thumb.jpg,full-body,endurance,10,medium",
    "walk-1,Walk 2,Another walk.,https://example.com/v2,/thumb2.jpg,full-body,endurance,5,low",
  ].join("\n");

  const { rows, errors } = parseCsvToCatalog(csv);

  expect(rows).toHaveLength(1);
  expect(errors).toEqual(['row 3: duplicate "id" value "walk-1"']);
});

test("reports a row with an unescaped comma that adds an extra column past the header", () => {
  // The trailing ", extra note" simulates an unescaped comma accidentally
  // added inside the last field, producing one more column than the header.
  const csv = [
    HEADER,
    "walk-1,Walk,A short walk.,https://example.com/v,/thumb.jpg,full-body,endurance,10,medium,extra note",
  ].join("\n");

  const { rows, errors } = parseCsvToCatalog(csv);

  expect(rows).toEqual([]);
  expect(errors).toContain(
    'row 2: has more columns than the header (check for an unescaped comma)'
  );
});

test("collects errors from multiple bad rows", () => {
  const csv = [
    HEADER,
    "walk-1,Walk,A short walk.,https://example.com/v,/thumb.jpg,full-body,endurance,10,extreme",
    "walk-2,Walk 2,Another walk.,https://example.com/v2,/thumb2.jpg,full-body,endurance,abc,low",
  ].join("\n");

  const { errors } = parseCsvToCatalog(csv);

  expect(errors).toEqual([
    'row 2: invalid "intensity" value "extreme" (must be low, medium, or high)',
    'row 3: invalid "durationMinutes" value "abc" (must be a positive number)',
  ]);
});
