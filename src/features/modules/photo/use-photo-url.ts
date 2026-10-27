"use client";

import { useEffect, useState } from "react";

import { trySilentRefresh } from "@/features/sync/google-auth";
import { downloadPhoto } from "./drive";
import { getPhotoBlob, getPhotoFile, storeFetchedBlob } from "./repository";

export type PhotoUrlState =
  | { status: "loading" }
  | { status: "ready"; url: string }
  | { status: "not-uploaded" }
  | { status: "signed-out" }
  | { status: "failed" };

const LOADING: PhotoUrlState = { status: "loading" };

async function resolve(photoId: string, recordId: string): Promise<{ status: "ready"; blob: Blob } | PhotoUrlState> {
  const local = await getPhotoBlob(photoId);
  if (local?.blob) return { status: "ready", blob: local.blob };
  const file = await getPhotoFile(photoId);
  if (!file?.driveFileId) return { status: "not-uploaded" };
  const token = await trySilentRefresh();
  if (!token) return { status: "signed-out" };
  try {
    const blob = await downloadPhoto(token.accessToken, file.driveFileId);
    await storeFetchedBlob(photoId, recordId, blob);
    return { status: "ready", blob };
  } catch {
    return { status: "failed" };
  }
}

/**
 * The device's copy of a photo, else the Drive copy (fetched and stored on the device).
 * The object URL is revoked on unmount; a failed photo is retried on the next mount.
 */
export function usePhotoUrl(photoId: string, recordId: string): PhotoUrlState {
  const [loaded, setLoaded] = useState<{ key: string; state: PhotoUrlState } | null>(null);
  const key = `${recordId}|${photoId}`;

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    resolve(photoId, recordId)
      .catch((): PhotoUrlState => ({ status: "failed" }))
      .then((result) => {
        if (cancelled) return;
        if ("blob" in result) {
          objectUrl = URL.createObjectURL(result.blob);
          setLoaded({ key, state: { status: "ready", url: objectUrl } });
        } else {
          setLoaded({ key, state: result });
        }
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [photoId, recordId, key]);

  return loaded?.key === key ? loaded.state : LOADING;
}
