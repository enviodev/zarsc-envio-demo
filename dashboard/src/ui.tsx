import type { ReactNode } from "react";
import { ISSUER, shortAddress } from "./format";
import { useNav } from "./nav";

export function Section({
  title,
  subtitle,
  aside,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={["card", className].filter(Boolean).join(" ")}>
      <header className="card-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {aside}
      </header>
      {children}
    </section>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

/** A wallet address linking to its page here, tagged when it is the issuer. */
export function WalletLink({ id }: { id: string }) {
  const { hrefTo, linkTo } = useNav();
  const route = { view: "wallet", address: id } as const;
  return (
    <span className="person">
      <a href={hrefTo(route)} onClick={linkTo(route)} title={id}>
        {shortAddress(id)}
      </a>
      {id === ISSUER && <span className="tag issuer">Issuer</span>}
    </span>
  );
}
