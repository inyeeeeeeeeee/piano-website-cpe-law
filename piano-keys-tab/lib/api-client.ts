"use client";

/** Tiny fetch helpers that throw `Error(message)` using the API error envelope. */

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function request<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    body: init?.body !== undefined && typeof init.body !== "string" ? JSON.stringify(init.body) : init?.body,
  });
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json().catch(() => null) : null;
  if (!res.ok) {
    const message =
      data && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "string"
        ? (data as { error: string }).error
        : `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
  }
  return data as T;
}

export function getJson<T = unknown>(url: string): Promise<T> {
  return request<T>(url);
}

export function postJson<T = unknown>(url: string, body?: unknown): Promise<T> {
  return request<T>(url, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });
}

export function putJson<T = unknown>(url: string, body?: unknown): Promise<T> {
  return request<T>(url, { method: "PUT", body: body === undefined ? undefined : JSON.stringify(body) });
}

export function patchJson<T = unknown>(url: string, body?: unknown): Promise<T> {
  return request<T>(url, { method: "PATCH", body: body === undefined ? undefined : JSON.stringify(body) });
}

export function deleteJson<T = unknown>(url: string): Promise<T> {
  return request<T>(url, { method: "DELETE" });
}
