import React, { useContext, useState } from "react";
import "./App.css";
import { BrowserRouter } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Store } from "./Store.js";
import MainLayout from "./layouts/MainLayout.jsx";
import AppRoutes from "./routes/AppRoutes.jsx";
import Footer from "./components/Footer.jsx";

function App() {
  const { state } = useContext(Store);
  const { fullBox } = state;
  const [sidebarIsOpen, setSidebarIsOpen] = useState(false);

  return (
    <BrowserRouter>
      <ToastContainer position="bottom-center" limit={1} />
      <MainLayout
        fullBox={fullBox}
        sidebarIsOpen={sidebarIsOpen}
        setSidebarIsOpen={setSidebarIsOpen}
      >
        <AppRoutes />
      </MainLayout>
      <Footer />
    </BrowserRouter>
  );
}

export default App;