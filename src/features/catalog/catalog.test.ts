import { exerciseCatalog } from "./exercise-catalog.default";

test("catalog matches the planned exercise seed data exactly", () => {
  expect([...exerciseCatalog].sort((left, right) => left.id.localeCompare(right.id))).toEqual([
    {
      id: "breathing-reset-3",
      title: "Breathing Reset",
      description: "A short calming reset for days with lower energy.",
      videoUrl: "https://www.youtube.com/watch?v=example2",
      thumbnailUrl: "/thumbnails/breathing-reset.jpg",
      bodyArea: "full-body",
      purpose: "recovery",
      durationSeconds: 180,
      intensity: "low",
    },
    {
      id: "hip-mobility-6",
      title: "Hip Mobility",
      description: "Gentle standing mobility for hips and lower body comfort.",
      videoUrl: "https://www.youtube.com/watch?v=example5",
      thumbnailUrl: "/thumbnails/hip-mobility.jpg",
      bodyArea: "lower-body",
      purpose: "mobility",
      durationSeconds: 360,
      intensity: "medium",
    },
    {
      id: "neck-mobility-5",
      title: "Neck Mobility",
      description: "Gentle seated mobility work for the neck and shoulders.",
      videoUrl: "https://www.youtube.com/watch?v=example1",
      thumbnailUrl: "/thumbnails/neck-mobility.jpg",
      bodyArea: "upper-body",
      purpose: "mobility",
      durationSeconds: 300,
      intensity: "low",
    },
    {
      id: "shoulder-roll-4",
      title: "Shoulder Rolls",
      description: "A light upper-body warm-up to ease shoulder stiffness.",
      videoUrl: "https://www.youtube.com/watch?v=example4",
      thumbnailUrl: "/thumbnails/shoulder-roll.jpg",
      bodyArea: "upper-body",
      purpose: "warmup",
      durationSeconds: 240,
      intensity: "low",
    },
    {
      id: "seated-calf-raise-5",
      title: "Seated Calf Raise",
      description: "A simple seated movement for light lower-body activation.",
      videoUrl: "https://www.youtube.com/watch?v=example6",
      thumbnailUrl: "/thumbnails/seated-calf-raise.jpg",
      bodyArea: "lower-body",
      purpose: "strength",
      durationSeconds: 300,
      intensity: "high",
    },
    {
      id: "walk-in-place-10",
      title: "Walk in Place",
      description: "A simple standing exercise for light activity.",
      videoUrl: "https://www.youtube.com/watch?v=example3",
      thumbnailUrl: "/thumbnails/walk-in-place.jpg",
      bodyArea: "full-body",
      purpose: "endurance",
      durationSeconds: 600,
      intensity: "medium",
    },
  ].sort((left, right) => left.id.localeCompare(right.id)));
});

test("catalog covers the planned browsing dimensions", () => {
  expect(exerciseCatalog).toHaveLength(6);
  expect(new Set(exerciseCatalog.map((item) => item.bodyArea)).size).toBeGreaterThanOrEqual(2);
  expect(new Set(exerciseCatalog.map((item) => item.purpose)).size).toBeGreaterThanOrEqual(2);
  expect(new Set(exerciseCatalog.map((item) => item.intensity)).size).toBeGreaterThanOrEqual(2);
  expect(new Set(exerciseCatalog.map((item) => item.durationSeconds)).size).toBeGreaterThanOrEqual(2);
});
