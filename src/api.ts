import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { API_BASE_URL, ANTHROPIC_VERSION } from "./constants.js";

/** Get access token from macOS keychain */
export async function getAccessTokenFromKeychain(): Promise<string | null> {
  if (process.platform !== "darwin") return null;

  try {
    const proc = Bun.spawn(
      [
        "security",
        "find-generic-password",
        "-a",
        process.env.USER || "",
        "-s",
        "Claude Code-credentials",
        "-w",
      ],
      { stdout: "pipe", stderr: "pipe" },
    );

    const stdout = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    if (exitCode !== 0) return null;

    const creds = JSON.parse(stdout.trim());
    return creds?.claudeAiOauth?.accessToken || null;
  } catch {
    return null;
  }
}

/** Get organization UUID from ~/.claude.json */
export async function getOrgUuidFromConfig(): Promise<string | null> {
  const configPath = join(homedir(), ".claude.json");
  try {
    const content = await readFile(configPath, "utf-8");
    const config = JSON.parse(content);
    return config?.oauthAccount?.organizationUuid || null;
  } catch {
    return null;
  }
}

/** Build API request headers */
export function getApiHeaders(
  token: string,
  orgUuid: string,
): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "anthropic-version": ANTHROPIC_VERSION,
    "Content-Type": "application/json",
    "x-organization-uuid": orgUuid,
  };
}

/** Fetch list of sessions from the API */
export async function fetchSessions(
  token: string,
  orgUuid: string,
): Promise<Record<string, unknown>> {
  const headers = getApiHeaders(token, orgUuid);
  const response = await fetch(`${API_BASE_URL}/sessions`, {
    headers,
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<Record<string, unknown>>;
}

/** Fetch a specific session from the API */
export async function fetchSession(
  token: string,
  orgUuid: string,
  sessionId: string,
): Promise<Record<string, unknown>> {
  const headers = getApiHeaders(token, orgUuid);
  const response = await fetch(
    `${API_BASE_URL}/session_ingress/session/${sessionId}`,
    { headers, signal: AbortSignal.timeout(60000) },
  );
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<Record<string, unknown>>;
}
