import { AlertTriangle, Check, Info, X } from "lucide-react";
import type { Notice } from "../../types/ui";

interface NoticeToastProps {
  notice: Notice | null;
  onDismiss: () => void;
}

export default function NoticeToast({
  notice,
  onDismiss,
}: NoticeToastProps) {
  if (!notice) return null;

  return (
    <div
      className={`toast toast-${notice.kind}`}
      role="status"
      aria-live="polite"
    >
      {notice.kind === "success" ? (
        <Check size={17} />
      ) : notice.kind === "error" ? (
        <AlertTriangle size={17} />
      ) : (
        <Info size={17} />
      )}
      <span>{notice.text}</span>
      <button
        type="button"
        className="toast-close"
        onClick={onDismiss}
        aria-label="Dismiss notification"
      >
        <X size={15} />
      </button>
    </div>
  );
}
