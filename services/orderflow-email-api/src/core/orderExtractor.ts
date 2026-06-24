import type { ProgressEvent } from "../shared/types.js";

export interface RunExtractionOptions {
  recursive?: boolean;
  inferManual?: boolean;
  progress?: (event: ProgressEvent) => void;
}
