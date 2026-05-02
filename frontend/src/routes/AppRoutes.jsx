import React from "react";
import { Routes, Route } from "react-router-dom";
import { publicRoutes } from "./publicRoutes.jsx";
import { protectedRoutes } from "./protectedRoutes.jsx";
import { adminRoutes } from "./adminRoutes.jsx";
import ShippingAddressPage from "../pages/ShippingAddressPage.jsx";
import PaymentMethodPage from "../pages/PaymentMethodPage.jsx";
import PlaceOrderPage from "../pages/PlaceOrderPage.jsx";
import NotFoundPage from "../pages/NotFoundPage.jsx";

function AppRoutes() {
  return (
    <div style={{ width: '100%', padding: 0, margin: 0 }}>
      <Routes>
        {/* Public Routes */}
        {publicRoutes.map((route) => (
          <Route key={route.path} path={route.path} element={route.element} />
        ))}

        {/* Protected Routes */}
        {protectedRoutes.map((route) => (
          <Route key={route.path} path={route.path} element={route.element} />
        ))}

        {/* Admin Routes */}
        {adminRoutes.map((route) => (
          <Route key={route.path} path={route.path} element={route.element} />
        ))}

        {/* Checkout Routes */}
        <Route path="/shipping" element={<ShippingAddressPage />} />
        <Route path="/payment" element={<PaymentMethodPage />} />
        <Route path="/placeorder" element={<PlaceOrderPage />} />

        {/* 404 Catch-all */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  );
}

export default AppRoutes;