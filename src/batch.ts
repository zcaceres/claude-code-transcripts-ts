import { mkdir } from "node:fs/promises";
import { basename, join } from "node:path";
import type { BatchStats, FailedSession, ProjectInfo } from "./types.js";
import { findAllSessions } from "./sessions.js";
import { generateHtml } from "./generate.js";
import { generateProjectIndex, generateMasterIndex } from "./generate.js";

export type ProgressCallback = (
  projectName: string,
  sessionName: string,
  current: number,
  total: number,
) => void;

/** Generate HTML archive for all sessions in a Claude projects folder */
export async function generateBatchHtml(
  sourceFolder: string,
  outputDir: string,
  options: {
    includeAgents?: boolean;
    progressCallback?: ProgressCallback;
  } = {},
): Promise<BatchStats> {
  const { includeAgents = false, progressCallback } = options;

  await mkdir(outputDir, { recursive: true });

  const projects = await findAllSessions(sourceFolder, includeAgents);

  const totalSessionCount = projects.reduce(
    (sum, p) => sum + p.sessions.length,
    0,
  );
  let processedCount = 0;
  let successfulSessions = 0;
  const failedSessions: FailedSession[] = [];

  for (const project of projects) {
    const projectDir = join(outputDir, project.name);
    await mkdir(projectDir, { recursive: true });

    for (const session of project.sessions) {
      const sessionName = basename(session.path, ".jsonl");
      const sessionDir = join(projectDir, sessionName);

      try {
        await generateHtml(session.path, sessionDir);
        successfulSessions++;
      } catch (e) {
        failedSessions.push({
          project: project.name,
          session: sessionName,
          error: e instanceof Error ? e.message : String(e),
        });
      }

      processedCount++;
      if (progressCallback) {
        progressCallback(
          project.name,
          sessionName,
          processedCount,
          totalSessionCount,
        );
      }
    }

    await generateProjectIndex(project, projectDir);
  }

  await generateMasterIndex(projects, outputDir);

  return {
    total_projects: projects.length,
    total_sessions: successfulSessions,
    failed_sessions: failedSessions,
    output_dir: outputDir,
  };
}
