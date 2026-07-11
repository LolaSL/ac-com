import React, { useContext, useEffect, useState } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import "./App.css";
import { BrowserRouter } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Store } from "./Store.js";
import MainLayout from "./layouts/MainLayout.jsx";
import AppRoutes from "./routes/AppRoutes.jsx";
import Footer from "./components/Footer.jsx";
import CookieConsent from "./components/CookieConsent.jsx";
import WhatsAppButton from "./components/WhatsAppButton.jsx";
import TranslatePrompt from "./components/TranslatePrompt.jsx";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.documentElement.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.body.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

function AppContent() {
  const [searchParams] = useSearchParams();
  const ref = searchParams.get("ref");

  useEffect(() => {
    if (ref) {
      localStorage.setItem("referralCode", ref);
    }
  }, [ref]);

  const { state } = useContext(Store);
  const { fullBox } = state;
  const [sidebarIsOpen, setSidebarIsOpen] = useState(false);

  return (
    <>
      <ToastContainer
        position="bottom-center"
        limit={1}
        autoClose={5000}
        closeOnClick
        pauseOnHover
        pauseOnFocusLoss
      />
      <ScrollToTop />
      <MainLayout
        fullBox={fullBox}
        sidebarIsOpen={sidebarIsOpen}
        setSidebarIsOpen={setSidebarIsOpen}
      >
        <AppRoutes />
      </MainLayout>
      <Footer />
      <CookieConsent />
      <WhatsAppButton />
      <TranslatePrompt />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
