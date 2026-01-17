import React from "react";
import Header from "./Header.jsx";
import Sidebar from "./Sidebar.jsx";

function MainLayout({ children, sidebarIsOpen, setSidebarIsOpen, fullBox }) {
  return (
    <div
      className={
        sidebarIsOpen
          ? fullBox
            ? "site-container active-cont d-flex flex-column full-box"
            : "site-container active-cont d-flex flex-column"
          : fullBox
          ? "site-container d-flex flex-column full-box"
          : "site-container d-flex flex-column"
      }
    >
      <Header
        setSidebarIsOpen={setSidebarIsOpen}
        sidebarIsOpen={sidebarIsOpen}
      />
      <Sidebar
        sidebarIsOpen={sidebarIsOpen}
        setSidebarIsOpen={setSidebarIsOpen}
      />
      <main className="main-content-container">{children}</main>
    </div>
  );
}

export default MainLayout;