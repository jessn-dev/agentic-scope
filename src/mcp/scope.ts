import { resolve, relative, isAbsolute, sep } from "node:path";

/**
 * Path-scope guard. Resolve `project` against the workspace root and reject
 * anything that escapes it. Stops a client from using the MCP server to read
 * arbitrary host paths (e.g. "/etc/passwd" or "../../secrets").
 *
 * Returns the resolved absolute path when it is inside (or equal to) the root.
 */
export function assertWithinWorkspace(workspaceRoot: string, project: string): string {
  const root = resolve(workspaceRoot);
  const abs = resolve(root, project);
  const rel = relative(root, abs);
  if (rel === "") return abs; // the workspace root itself
  if (rel.startsWith("..") || isAbsolute(rel) || rel.split(sep)[0] === "..") {
    throw new Error(`project path is outside the workspace root: ${project}`);
  }
  return abs;
}
