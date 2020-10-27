import React from "react";
import ReactSVG from "react-svg";
import { NavLink } from "react-router-dom";
import { TranslatedMessage } from "lib/TranslatedMessage";

import "./Navigation.css";
import GlobalSearch from "./partials/GlobalSearch";
import LanguageChooser from "./partials/LanguageChooser";
import SettingsChooser from "./partials/SettingsChooser";
import config from "client-config.json";

const Navigation = () => {
  const explorerActive = (match, location) => {
    return location.pathname === "/" || /^\/explorer\//.test(location.pathname);
  };

  return (
    <div id="Navigation" className="row align-items-center pl-3">
      <div className="col-auto mt-1 mb-0 mb-md-1 px-0 px-md-1">
        <div className="LogoWrap">
          <img src="/logo.png" alt="KIZUNANO COIN" />
        </div>
      </div>

      <div className="col-md px-0 px-md-2 ml-md-5">
        <ul className="NavigationList nav">
          <li className="nav-item">
            <NavLink
              to="/"
              className="nav-link pr-1 pr-md-3"
              activeClassName="active"
              isActive={explorerActive}
            >
              <TranslatedMessage id="nav.explorer" />
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink
              exact
              to="/network"
              className="nav-link  pr-1 pr-md-3"
              activeClassName="active"
            >
              <TranslatedMessage id="nav.network" />
            </NavLink>
          </li>
          {config.features.nodeStatus && (
            <li className="nav-item">
              <NavLink
                exact
                to="/status"
                className="nav-link  pr-1 pr-md-3"
                activeClassName="active"
              >
                <TranslatedMessage id="nav.status" />
              </NavLink>
            </li>
          )}
        </ul>
      </div>

      <div className="col-lg-4 mb-3 mb-lg-0 px-0 px-md-2 mt-1 mt-lg-0">
        <div className="row">
          <div className="col pr-1">
            <GlobalSearch />
          </div>
          <div className="col-auto px-1">
            <LanguageChooser />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navigation;
