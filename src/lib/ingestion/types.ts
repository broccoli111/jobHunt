export { type RawJobPosting } from "@/types";

export interface IngestionAdapter {
  name: string;
  fetchJobs(): Promise<import("@/types").RawJobPosting[]>;
}
