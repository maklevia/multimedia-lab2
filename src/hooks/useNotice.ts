import { useCallback, useEffect, useState } from "react";
import type { Notice, NoticeKind } from "../types/ui";

export interface NoticeController {
  notice: Notice | null;
  notify: (kind: NoticeKind, text: string) => void;
  dismiss: () => void;
}

export function useNotice(): NoticeController {
  const [notice, setNotice] = useState<Notice | null>(null);

  const notify = useCallback((kind: NoticeKind, text: string) => {
    setNotice({ kind, text });
  }, []);

  const dismiss = useCallback(() => {
    setNotice(null);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(
      () => setNotice(null),
      notice.kind === "error" ? 6500 : 3800,
    );
    return () => window.clearTimeout(timer);
  }, [notice]);

  return { notice, notify, dismiss };
}
