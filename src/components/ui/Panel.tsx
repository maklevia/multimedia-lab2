import { useId, type ReactNode } from "react";

interface PanelProps {
  step?: string;
  title: string;
  description: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function Panel({
  step,
  title,
  description,
  icon,
  children,
  className = "",
}: PanelProps) {
  const titleId = useId();

  return (
    <section
      className={`panel ${className}`.trim()}
      aria-labelledby={titleId}
    >
      <div className="panel-heading">
        {step ? <div className="step-badge">{step}</div> : null}
        <div className="panel-heading-copy">
          <h2 id={titleId}>{title}</h2>
          <p>{description}</p>
        </div>
        {icon ? <span className="panel-icon">{icon}</span> : null}
      </div>
      <div className="panel-content">{children}</div>
    </section>
  );
}
