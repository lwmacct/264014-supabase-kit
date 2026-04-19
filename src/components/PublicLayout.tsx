import type { ReactNode } from "react";
import { useViewportBackground } from "../app/useViewportBackground";
import "./PublicLayout.css";

export function PublicLayout({
  children,
  centered = false,
}: {
  children: ReactNode;
  centered?: boolean;
}) {
  useViewportBackground({
    color: "var(--shell-public-bg-color)",
    image: "var(--shell-public-bg-image)",
  });

  return (
    <div className={`public-layout${centered ? " is-centered" : ""}`}>
      <div className="public-layout-backdrop" aria-hidden="true">
        <span className="public-layout-orb is-primary" />
        <span className="public-layout-orb is-secondary" />
      </div>
      <div className="public-layout-body">{children}</div>
    </div>
  );
}
