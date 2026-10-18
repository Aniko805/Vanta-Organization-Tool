export type CurateEvent =
  | { type: "status"; message: string }
  | { type: "tab-done"; tab: string }
  | { type: "error"; message: string }
  | { type: "done"; notebookId: string }
  | { type: "noop"; message: string }
  | {
      type: "confirm";
      sections: { id: string; tabName: string; sectionName: string }[];
    }
  | { type: "cooldown"; remainingSeconds: number };
