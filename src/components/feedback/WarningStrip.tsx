import { AlertTriangle } from "lucide-react";

interface WarningStripProps {
  warnings: string[];
}

export default function WarningStrip({ warnings }: WarningStripProps) {
  if (warnings.length === 0) return null;

  return (
    <div className="warning-strip" role="status">
      <AlertTriangle size={16} />
      <div>
        {warnings.map((warning) => (
          <p key={warning}>{warning}</p>
        ))}
      </div>
    </div>
  );
}
