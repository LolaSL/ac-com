import React from "react";
import { Routes, Route } from "react-router-dom";
import { publicRoutes } from "./publicRoutes.jsx";
import { protectedRoutes } from "./protectedRoutes.jsx";
import { adminRoutes } from "./adminRoutes.jsx";
import ShippingAddressPage from "../pages/ShippingAddressPage.jsx";
import PaymentMethodPage from "../pages/PaymentMethodPage.jsx";
import PlaceOrderPage from "../pages/PlaceOrderPage.jsx";
import Container from "react-bootstrap/Container";

function AppRoutes() {
  return (
    <Container fluid className="no-padding">
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
      </Routes>
    </Container>
  );
}

export default AppRoutes;