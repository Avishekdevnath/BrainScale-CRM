// Compatibility shim: the API client now lives in src/lib/api/ as per-domain
// modules composed in src/lib/api/index.ts. Existing imports from
// "@/lib/api-client" keep working; new code may import domain objects
// (e.g. `studentsApi`) from "@/lib/api" directly.
export { apiClient, AuthExpiredError } from "./api";
export type { ApiClient } from "./api";
