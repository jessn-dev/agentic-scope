import { simpleGit } from "simple-git";
import { existsSync } from "node:fs";
import { join } from "node:path";

export interface GitState {
  isRepo: boolean;
  branch?: string;
  ahead?: number;
  behind?: number;
  dirtyFiles?: number;
  staged?: number;
  tracking?: string | null;
  error?: string;
}

/** Read-only git state for a repo directory. Never mutates the repo. */
export async function gitStatus(dir: string): Promise<GitState> {
  if (!existsSync(join(dir, ".git"))) return { isRepo: false };
  try {
    const git = simpleGit({ baseDir: dir });
    const status = await git.status();
    return {
      isRepo: true,
      branch: status.current ?? undefined,
      ahead: status.ahead,
      behind: status.behind,
      dirtyFiles: status.modified.length + status.not_added.length + status.deleted.length,
      staged: status.staged.length,
      tracking: status.tracking ?? null,
    };
  } catch (err) {
    return { isRepo: true, error: err instanceof Error ? err.message : String(err) };
  }
}
