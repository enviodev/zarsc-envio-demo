import { useEffect, useState, type MouseEvent } from "react";

/** Paths, relative to the app's base:
 *    /                    overview
 *    /insights            issuer insights
 *    /wallet, /wallet/<address>   one wallet
 */
export type Route = { view: "overview" | "insights" } | { view: "wallet"; address?: string };

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export function parseRoute(pathname: string): Route {
  const rel = pathname.startsWith(BASE) ? pathname.slice(BASE.length) : pathname;
  const [first, second] = rel.split("/").filter(Boolean).map(decodeURIComponent);
  if (first === "wallet") return { view: "wallet", address: second };
  if (first === "insights") return { view: "insights" };
  return { view: "overview" };
}

export function routePath(route: Route): string {
  if (route.view === "overview") return `${BASE}/`;
  const tail = route.view === "wallet" && route.address ? `/${encodeURIComponent(route.address)}` : "";
  return `${BASE}/${route.view}${tail}`;
}

export function useRoute() {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.pathname));

  useEffect(() => {
    const onPop = () => setRoute(parseRoute(window.location.pathname));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = (next: Route, { replace = false } = {}) => {
    const path = routePath(next);
    if (path !== window.location.pathname) {
      window.history[replace ? "replaceState" : "pushState"](null, "", path);
    }
    setRoute(next);
    if (!replace) window.scrollTo({ top: 0 });
  };

  /** onClick for an <a href>: client-side navigation, but modifier clicks still open a new tab. */
  const linkTo = (next: Route) => (e: MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    navigate(next);
  };

  return { route, navigate, linkTo };
}
