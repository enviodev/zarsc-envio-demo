import { createContext, useContext, type MouseEvent } from "react";
import type { Route } from "./router";

export type Nav = {
  hrefTo: (route: Route) => string;
  linkTo: (route: Route) => (e: MouseEvent) => void;
  navigate: (route: Route) => void;
};

export const NavContext = createContext<Nav>({ hrefTo: () => "#", linkTo: () => () => {}, navigate: () => {} });
export const useNav = () => useContext(NavContext);
