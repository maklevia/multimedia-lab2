export type NoticeKind = "success" | "error" | "info";

export interface Notice {
  kind: NoticeKind;
  text: string;
}
