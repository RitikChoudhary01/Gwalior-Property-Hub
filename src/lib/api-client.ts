"use client";

// ============================================================
// Client-side fetch helper — JSON, credentials, typed errors
// ============================================================

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "same-origin",
    headers: init?.body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    ...init,
  });

  const text = await res.text();
  let data: unknown = undefined;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      // non-JSON response
    }
  }

  if (!res.ok) {
    const message =
      (data && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "string"
        ? (data as { error: string }).error
        : `Request failed (${res.status})`);
    throw new ApiError(message, res.status);
  }
  return data as T;
}

/** Uploads a file with progress reporting. Returns the hosted URL. */
export function uploadFile(
  file: File,
  onProgress?: (pct: number) => void
): Promise<{ url: string; name: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    });
    xhr.addEventListener("load", () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve(data);
        else reject(new ApiError(data.error ?? "Upload failed", xhr.status));
      } catch {
        reject(new ApiError("Upload failed", xhr.status));
      }
    });
    xhr.addEventListener("error", () => reject(new ApiError("Upload failed", 0)));
    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });
}
