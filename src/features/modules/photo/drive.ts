import { GOOGLE_NAMES } from "@/features/sync/google-names";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
const FOLDER_ID_STORAGE_KEY = "photo-folder-id";

function authHeaders(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}` };
}

function readRememberedFolderId(): string | null {
  try {
    return window.localStorage.getItem(FOLDER_ID_STORAGE_KEY);
  } catch {
    return null;
  }
}

function rememberFolderId(folderId: string | null): void {
  try {
    if (folderId === null) window.localStorage.removeItem(FOLDER_ID_STORAGE_KEY);
    else window.localStorage.setItem(FOLDER_ID_STORAGE_KEY, folderId);
  } catch {
    // Storage may be blocked; the folder is found by name next time.
  }
}

/** True when the folder still exists outside the trash; false when it is gone (404) or trashed. */
async function folderIsUsable(accessToken: string, folderId: string): Promise<boolean> {
  const res = await fetch(`${DRIVE_API}/files/${encodeURIComponent(folderId)}?fields=id%2Ctrashed`, {
    headers: authHeaders(accessToken),
  });
  if (res.status === 404) return false;
  if (!res.ok) throw new Error(`Failed to check the photo folder (HTTP ${res.status})`);
  const data = await res.json();
  return data.trashed !== true;
}

/** The oldest non-trashed folder named GOOGLE_NAMES.photoFolder, or null. */
async function findPhotoFolder(accessToken: string): Promise<string | null> {
  const q = `name='${GOOGLE_NAMES.photoFolder}' and mimeType='${FOLDER_MIME_TYPE}' and trashed=false`;
  const res = await fetch(
    `${DRIVE_API}/files?q=${encodeURIComponent(q)}&orderBy=createdTime&fields=files(id%2CcreatedTime)`,
    { headers: authHeaders(accessToken) },
  );
  if (!res.ok) throw new Error(`Failed to find the photo folder (HTTP ${res.status})`);
  const data = await res.json();
  const files: { id: string; createdTime?: string }[] = data.files ?? [];
  if (files.length === 0) return null;
  const time = (file: { createdTime?: string }) => Date.parse(file.createdTime ?? "") || Infinity;
  return files.reduce((oldest, file) => (time(file) < time(oldest) ? file : oldest)).id;
}

async function createPhotoFolder(accessToken: string): Promise<string> {
  const res = await fetch(`${DRIVE_API}/files?fields=id`, {
    method: "POST",
    headers: { ...authHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify({ name: GOOGLE_NAMES.photoFolder, mimeType: FOLDER_MIME_TYPE }),
  });
  if (!res.ok) throw new Error(`Failed to create the photo folder (HTTP ${res.status})`);
  const data = await res.json();
  return data.id;
}

/**
 * The Drive folder that holds the photos. The remembered id is used while the
 * folder exists; otherwise the folder is found by name (the oldest if several)
 * or created. Throws when Drive cannot be reached.
 */
export async function findOrCreatePhotoFolder(accessToken: string): Promise<string> {
  const remembered = readRememberedFolderId();
  if (remembered && (await folderIsUsable(accessToken, remembered))) {
    return remembered;
  }
  const folderId = (await findPhotoFolder(accessToken)) ?? (await createPhotoFolder(accessToken));
  rememberFolderId(folderId);
  return folderId;
}

/** Uploads one photo as `<photoId>.jpg` into the folder. Returns the Drive file id. */
export async function uploadPhoto(
  accessToken: string,
  folderId: string,
  photoId: string,
  blob: Blob,
): Promise<string> {
  const boundary = `photo-${crypto.randomUUID()}`;
  const metadata = { name: `${photoId}.jpg`, mimeType: "image/jpeg", parents: [folderId] };
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
    `--${boundary}\r\nContent-Type: image/jpeg\r\n\r\n`,
    blob,
    `\r\n--${boundary}--\r\n`,
  ]);
  const res = await fetch(`${DRIVE_UPLOAD_API}/files?uploadType=multipart&fields=id`, {
    method: "POST",
    headers: {
      ...authHeaders(accessToken),
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  if (!res.ok) throw new Error(`Failed to upload a photo (HTTP ${res.status})`);
  const data = await res.json();
  return data.id;
}

/** Downloads a photo's bytes. Throws when the request fails. */
export async function downloadPhoto(accessToken: string, driveFileId: string): Promise<Blob> {
  const res = await fetch(`${DRIVE_API}/files/${encodeURIComponent(driveFileId)}?alt=media`, {
    headers: authHeaders(accessToken),
  });
  if (!res.ok) throw new Error(`Failed to download a photo (HTTP ${res.status})`);
  return res.blob();
}

/** Moves a Drive file to the trash (never deletes it). A file that is already gone counts as ok. */
export async function trashDriveFile(accessToken: string, driveFileId: string): Promise<"ok" | "failed"> {
  try {
    const res = await fetch(`${DRIVE_API}/files/${encodeURIComponent(driveFileId)}`, {
      method: "PATCH",
      headers: { ...authHeaders(accessToken), "Content-Type": "application/json" },
      body: JSON.stringify({ trashed: true }),
    });
    if (res.ok || res.status === 404) return "ok";
    console.error("[sync] trashDriveFile failed", res.status);
    return "failed";
  } catch (err) {
    console.error("[sync] trashDriveFile threw", err);
    return "failed";
  }
}
