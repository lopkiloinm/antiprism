export interface Project {
  id: string;
  name: string;
  createdAt: number;
  isRoom?: boolean;
}

const STORAGE_KEY_PROJECTS = "antiprism-projects";
const STORAGE_KEY_ROOMS = "antiprism-rooms";

function loadJson<T>(key: string, defaultVal: T): T {
  if (typeof window === "undefined") return defaultVal;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function saveJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function getProjects(): Project[] {
  return loadJson<Project[]>(STORAGE_KEY_PROJECTS, []);
}

export function getRooms(): Project[] {
  return loadJson<Project[]>(STORAGE_KEY_ROOMS, []);
}

export function getAllItems(): Project[] {
  const projects = getProjects();
  const rooms = getRooms();
  const seen = new Set<string>();
  const result: Project[] = [];
  for (const p of projects) {
    if (!seen.has(p.id)) {
      seen.add(p.id);
      result.push({ ...p, isRoom: false });
    }
  }
  for (const r of rooms) {
    if (!seen.has(r.id)) {
      seen.add(r.id);
      result.push({ ...r, isRoom: true });
    }
  }
  return result.sort((a, b) => b.createdAt - a.createdAt);
}

function generateUniqueId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `proj-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function createProject(name: string): Project {
  const projects = getProjects();
  let id: string;
  let attempts = 0;
  do {
    id = generateUniqueId();
    if (++attempts > 10) throw new Error("Failed to generate unique project ID");
  } while (projects.some((p) => p.id === id));

  const project: Project = { id, name, createdAt: Date.now() };
  projects.unshift(project);
  saveJson(STORAGE_KEY_PROJECTS, projects);
  return project;
}

export function addRoom(room: Project): void {
  const rooms = getRooms();
  if (!rooms.some((r) => r.id === room.id)) {
    rooms.unshift({ ...room, isRoom: true });
    saveJson(STORAGE_KEY_ROOMS, rooms);
  }
}

export function deleteProject(id: string): void {
  saveJson(
    STORAGE_KEY_PROJECTS,
    getProjects().filter((p) => p.id !== id)
  );
}

export function deleteRoom(id: string): void {
  saveJson(
    STORAGE_KEY_ROOMS,
    getRooms().filter((r) => r.id !== id)
  );
}

/** Permanently delete all project/room data from IDBFS. Call after deleteProject/deleteRoom. */
export async function deleteProjectDataFromStorage(id: string): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const { mount } = await import("@wwog/idbfs");
    const fs = await mount();
    const path = `/projects/${id}`;
    const exists = await fs.exists(path).catch(() => false);
    if (exists) {
      await fs.rm(path, true);
    }
  } catch (e) {
    console.warn("Failed to delete project data from storage:", e);
  }
}

export function renameProject(id: string, name: string): void {
  const projects = getProjects().map((p) =>
    p.id === id ? { ...p, name } : p
  );
  saveJson(STORAGE_KEY_PROJECTS, projects);
}
