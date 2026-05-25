# YouTube Default Thumbnail Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically use YouTube default thumbnails when an exercise has a YouTube URL and no custom thumbnail, while keeping playback as a lightweight external link and leaving non-YouTube videos as simple text-only cards.

**Architecture:** Add one shared URL helper that extracts a YouTube video ID and resolves the default thumbnail URL. Reuse that helper in form preview and UI rendering, but persist only explicit custom thumbnails. A blank `thumbnailUrl` means “derive from YouTube at render time when possible,” which avoids stale saved thumbnails when the user later changes `videoUrl` and keeps existing stored records working without a database migration.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Vitest, React Testing Library, Dexie, static export on GitHub Pages

---

## File Structure

### Shared thumbnail resolution

- Create: `src\lib\video\youtube.ts` - parse YouTube URLs, extract video IDs, build default thumbnail URLs, and expose a single thumbnail resolver for exercise records.
- Create: `src\lib\video\youtube.test.ts` - focused unit coverage for supported YouTube URL formats, invalid URLs, and custom-thumbnail precedence.

### Exercise entry and import flow

- Modify: `src\features\settings\components\exercise-form-modal.tsx` - preview the derived YouTube thumbnail when the field is blank, while preserving blank storage unless the user enters a custom thumbnail.
- Create: `src\features\settings\exercise-form-modal.test.tsx` - verify derived preview for YouTube URLs, preservation of manual thumbnails, and no image for non-YouTube URLs.

### Exercise presentation

- Modify: `src\features\today\components\recommended-exercise-card.tsx` - render a thumbnail preview above or alongside existing card content when a resolved thumbnail URL exists.
- Modify: `src\features\today\recommended-exercise-card.test.tsx` - verify cards still link correctly and render the resolved thumbnail without changing the existing watch CTA behavior.
- Modify: `src\features\library\components\library-screen.tsx` - add thumbnail rendering to the library route’s own card markup using the same shared resolver as the Today card.
- Modify: `src\features\library\library-screen.test.tsx` - verify the library route shows the shared thumbnail fallback for a YouTube exercise whose stored `thumbnailUrl` is blank.
- Modify: `src\features\library\components\exercise-detail-screen.tsx` - render the resolved thumbnail in the detail header while keeping the external watch button instead of embedding playback.
- Modify: `src\app\exercises\[exerciseId]\page.test.tsx` - verify the detail page shows the thumbnail for YouTube-backed exercises and still shows the external video action.
- Modify: `src\app\globals.css` - add thumbnail layout and responsive image styles for cards and detail view, without changing the current text-only fallback for missing thumbnails.

### Optional UI copy polish

- Modify: `src\features\i18n\messages\en.ts` - add helper text only if the implementation introduces new visible form guidance.
- Modify: `src\features\i18n\messages\ja.ts` - add the matching Japanese helper text only if the implementation introduces new visible form guidance.

## Task 1: Build the shared YouTube thumbnail resolver

**Files:**
- Create: `src\lib\video\youtube.ts`
- Create: `src\lib\video\youtube.test.ts`
- Check: `src\lib\types.ts`

- [ ] **Step 1: Write the failing resolver tests**

```ts
import { describe, expect, test } from "vitest";

import { getYouTubeThumbnailUrl, getYouTubeVideoId, resolveExerciseThumbnailUrl } from "./youtube";

describe("getYouTubeVideoId", () => {
  test("reads a standard watch URL", () => {
    expect(getYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  test("reads a short youtu.be URL", () => {
    expect(getYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  test("returns null for a non-YouTube URL", () => {
    expect(getYouTubeVideoId("https://example.com/video.mp4")).toBeNull();
  });
});

test("prefers a custom thumbnail over a derived YouTube thumbnail", () => {
  expect(
    resolveExerciseThumbnailUrl({
      id: "1",
      title: "Test",
      description: "",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      thumbnailUrl: "https://cdn.example.com/custom.jpg",
      bodyArea: "upper-body",
      purpose: "mobility",
      durationMinutes: 5,
      intensity: "low",
    }),
  ).toBe("https://cdn.example.com/custom.jpg");
});
```

- [ ] **Step 2: Run the focused helper tests**

Run: `npm run test -- src\lib\video\youtube.test.ts`  
Expected: FAIL because the helper module does not exist yet.

- [ ] **Step 3: Implement the minimal resolver**

```ts
import type { ExerciseVideo } from "@/lib/types";

const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"]);

export function getYouTubeVideoId(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.toLowerCase();

    if (!YOUTUBE_HOSTS.has(host)) {
      return null;
    }

    if (host === "youtu.be") {
      return url.pathname.split("/").filter(Boolean)[0] ?? null;
    }

    if (url.pathname === "/watch") {
      return url.searchParams.get("v");
    }

    const match = url.pathname.match(/^\/(embed|shorts)\/([^/?#]+)/);
    return match?.[2] ?? null;
  } catch {
    return null;
  }
}

export function getYouTubeThumbnailUrl(rawUrl: string): string | null {
  const videoId = getYouTubeVideoId(rawUrl);
  return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
}

export function resolveExerciseThumbnailUrl(exercise: Pick<ExerciseVideo, "videoUrl" | "thumbnailUrl">): string | null {
  return exercise.thumbnailUrl.trim() || getYouTubeThumbnailUrl(exercise.videoUrl);
}
```

- [ ] **Step 4: Re-run the helper tests**

Run: `npm run test -- src\lib\video\youtube.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit the shared resolver**

```bash
git add src/lib/video/youtube.ts src/lib/video/youtube.test.ts
git commit -m "feat: add youtube thumbnail resolver"
```

## Task 2: Preview derived thumbnails in the form without persisting them

**Files:**
- Modify: `src\features\settings\components\exercise-form-modal.tsx`
- Create: `src\features\settings\exercise-form-modal.test.tsx`
- Check: `src\features\settings\components\exercise-form-modal.tsx`

- [ ] **Step 1: Write the failing form tests**

```tsx
test("shows a derived thumbnail preview when the video URL is a YouTube link and the field is blank", async () => {
  const user = userEvent.setup();

  renderWithLanguage(<ExerciseFormModal exercise={null} onSaved={vi.fn()} onCancel={vi.fn()} />, {
    initialLanguage: "en",
  });

  await user.type(screen.getByLabelText(/video url/i), "https://youtu.be/dQw4w9WgXcQ");

  expect(screen.getByLabelText(/thumbnail/i)).toHaveValue("");
  expect(screen.getByRole("img", { name: /thumbnail preview/i })).toHaveAttribute(
    "src",
    "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
  );
});

test("keeps a manual thumbnail and shows that image instead of the derived preview", async () => {
  const user = userEvent.setup();

  renderWithLanguage(<ExerciseFormModal exercise={null} onSaved={vi.fn()} onCancel={vi.fn()} />, {
    initialLanguage: "en",
  });

  await user.type(screen.getByLabelText(/thumbnail/i), "https://cdn.example.com/manual.jpg");
  await user.type(screen.getByLabelText(/video url/i), "https://www.youtube.com/watch?v=dQw4w9WgXcQ");

  expect(screen.getByLabelText(/thumbnail/i)).toHaveValue("https://cdn.example.com/manual.jpg");
  expect(screen.getByRole("img", { name: /thumbnail preview/i })).toHaveAttribute(
    "src",
    "https://cdn.example.com/manual.jpg",
  );
});

test("shows no preview for a non-YouTube URL when the thumbnail field is blank", async () => {
  const user = userEvent.setup();

  renderWithLanguage(<ExerciseFormModal exercise={null} onSaved={vi.fn()} onCancel={vi.fn()} />, {
    initialLanguage: "en",
  });

  await user.type(screen.getByLabelText(/video url/i), "https://example.com/video.mp4");

  expect(screen.queryByRole("img", { name: /thumbnail preview/i })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the focused form tests**

Run: `npm run test -- src\features\settings\exercise-form-modal.test.tsx`  
Expected: FAIL because the form does not show any derived preview yet.

- [ ] **Step 3: Implement the minimal derived-preview behavior**

```tsx
const resolvedThumbnailUrl = form.thumbnailUrl.trim() || getYouTubeThumbnailUrl(form.videoUrl) || "";
const shouldShowThumbnailPreview = resolvedThumbnailUrl.length > 0;

{shouldShowThumbnailPreview ? (
  <div className="exercise-form-modal__thumbnail-preview">
    <img src={resolvedThumbnailUrl} alt={t("settings_form_thumbnail_preview_alt")} />
  </div>
) : null}
```

Keep `handleSubmit` unchanged so it saves only `form.thumbnailUrl.trim()`. If the URL is not YouTube and the field is blank, show no preview. Do not add embed logic in this task.

- [ ] **Step 4: Re-run the focused form tests**

Run: `npm run test -- src\features\settings\exercise-form-modal.test.tsx`  
Expected: PASS

- [ ] **Step 5: Commit the form preview changes**

```bash
git add src/features/settings/components/exercise-form-modal.tsx src/features/settings/exercise-form-modal.test.tsx
git commit -m "feat: preview derived youtube thumbnails in exercise form"
```

## Task 3: Render thumbnails in cards and detail view with graceful fallback

**Files:**
- Modify: `src\features\today\components\recommended-exercise-card.tsx`
- Modify: `src\features\today\recommended-exercise-card.test.tsx`
- Modify: `src\features\library\components\library-screen.tsx`
- Modify: `src\features\library\library-screen.test.tsx`
- Modify: `src\features\library\components\exercise-detail-screen.tsx`
- Modify: `src\app\exercises\[exerciseId]\page.test.tsx`
- Modify: `src\app\globals.css`

- [ ] **Step 1: Write the failing presentation tests**

```tsx
const exercise = {
  id: "blank-youtube-thumb",
  title: "Blank Thumbnail Exercise",
  description: "",
  videoUrl: "https://youtu.be/dQw4w9WgXcQ",
  thumbnailUrl: "",
  bodyArea: "upper-body",
  purpose: "mobility",
  durationMinutes: 5,
  intensity: "low",
} as const;

test("renders a derived thumbnail image when a YouTube exercise has no stored thumbnail", () => {
  renderWithLanguage(
    <RecommendedExerciseCard exercise={exercise} result={null} watchHref="/watch" onLog={vi.fn()} />,
  );

  expect(screen.getByRole("img", { name: /blank thumbnail exercise/i })).toHaveAttribute(
    "src",
    "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
  );
});
```

```tsx
test("library shows the shared thumbnail fallback for a blank-thumbnail YouTube exercise", async () => {
  await appDb.exercises.clear();
  await appDb.exercises.add({
    id: "blank-youtube-thumb",
    title: "Blank Thumbnail Exercise",
    description: "",
    videoUrl: "https://youtu.be/dQw4w9WgXcQ",
    thumbnailUrl: "",
    bodyArea: "upper-body",
    purpose: "mobility",
    durationMinutes: 5,
    intensity: "low",
  });

  renderWithLanguage(<LibraryScreen />, { initialLanguage: "en" });

  expect(await screen.findByRole("img", { name: /blank thumbnail exercise/i })).toBeInTheDocument();
});

test("exercise detail page shows a derived thumbnail and keeps the external watch action", async () => {
  await appDb.exercises.clear();
  await appDb.exercises.add({
    id: "blank-youtube-thumb",
    title: "Blank Thumbnail Exercise",
    description: "",
    videoUrl: "https://youtu.be/dQw4w9WgXcQ",
    thumbnailUrl: "",
    bodyArea: "upper-body",
    purpose: "mobility",
    durationMinutes: 5,
    intensity: "low",
  });

  renderWithLanguage(await ExerciseDetailPage({ params: Promise.resolve({ exerciseId: "blank-youtube-thumb" }) }));

  expect(await screen.findByRole("img", { name: /blank thumbnail exercise/i })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /動画を見る/i })).toHaveAttribute(
    "href",
    expect.stringContaining("youtube"),
  );
});
```

- [ ] **Step 2: Run the focused presentation tests**

Run: `npm run test -- src\features\today\recommended-exercise-card.test.tsx src\app\exercises\[exerciseId]\page.test.tsx src\features\library\library-screen.test.tsx`  
Expected: FAIL because neither the cards, the library route, nor the detail view render derived thumbnail images yet.

- [ ] **Step 3: Implement the minimal thumbnail rendering**

```tsx
const thumbnailUrl = resolveExerciseThumbnailUrl(exercise);

return (
  <article className="card recommendation-card" aria-labelledby={headingId}>
    {thumbnailUrl ? (
      <div className="recommendation-card__thumbnail">
        <img src={thumbnailUrl} alt={exercise.title} loading="lazy" />
      </div>
    ) : null}
    ...
  </article>
);
```

```tsx
const thumbnailUrl = resolveExerciseThumbnailUrl(exercise);

return (
  <article key={exercise.id} className="card recommendation-card" aria-labelledby={headingId}>
    {thumbnailUrl ? (
      <div className="recommendation-card__thumbnail">
        <img src={thumbnailUrl} alt={exercise.title} loading="lazy" />
      </div>
    ) : null}
    ...
  </article>
);
```

```tsx
const thumbnailUrl = resolveExerciseThumbnailUrl(exercise);

{thumbnailUrl ? (
  <div className="exercise-detail__thumbnail">
    <img src={thumbnailUrl} alt={exercise.title} />
  </div>
) : null}
```

```css
.recommendation-card__thumbnail img,
.exercise-detail__thumbnail img {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 1rem;
  object-fit: cover;
}
```

If `resolveExerciseThumbnailUrl` returns `null`, keep the current text-only layout. Do not embed the player.

- [ ] **Step 4: Re-run the focused presentation tests**

Run: `npm run test -- src\features\today\recommended-exercise-card.test.tsx src\app\exercises\[exerciseId]\page.test.tsx src\features\library\library-screen.test.tsx`  
Expected: PASS

- [ ] **Step 5: Commit the presentation update**

```bash
git add src/features/today/components/recommended-exercise-card.tsx src/features/today/recommended-exercise-card.test.tsx src/features/library/components/library-screen.tsx src/features/library/library-screen.test.tsx src/features/library/components/exercise-detail-screen.tsx src/app/exercises/[exerciseId]/page.test.tsx src/app/globals.css
git commit -m "feat: show youtube thumbnails in exercise views"
```

## Task 4: Run regression checks and finalize the change

**Files:**
- Modify: `src\features\i18n\messages\en.ts` (only if new helper copy was added)
- Modify: `src\features\i18n\messages\ja.ts` (only if new helper copy was added)
- Check: `package.json`

- [ ] **Step 1: Add any required localized helper text**

```ts
settings_form_thumbnail_url_hint: "Leave blank to auto-use the YouTube thumbnail when possible",
settings_form_thumbnail_preview_alt: "Thumbnail preview",
```

```ts
settings_form_thumbnail_url_hint: "空欄の場合は、可能ならYouTubeのサムネイルを自動利用します",
settings_form_thumbnail_preview_alt: "サムネイルのプレビュー",
```

Add `settings_form_thumbnail_preview_alt` if the form renders a preview image. Add the hint key only if the implementation introduces visible helper text.

- [ ] **Step 2: Run the targeted regression suite**

Run: `npm run test -- src\lib\video\youtube.test.ts src\features\settings\exercise-form-modal.test.tsx src\features\today\recommended-exercise-card.test.tsx src\app\exercises\[exerciseId]\page.test.tsx src\features\library\library-screen.test.tsx`  
Expected: PASS

- [ ] **Step 3: Run the repository validation commands**

Run: `npm run test && npm run lint && npm run build`  
Expected: PASS

- [ ] **Step 4: Commit the regression-safe finish**

```bash
git add src/features/i18n/messages/en.ts src/features/i18n/messages/ja.ts
git commit -m "test: cover youtube thumbnail fallback flow"
```

Skip any `git add` entries for files that were not changed in this task.
