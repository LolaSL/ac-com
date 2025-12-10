import DashboardPage from "../pages/DashboardPage.jsx";
import ProductListPage from "../pages/ProductListPage.jsx";
import ProductEditPage from "../pages/ProductEditPage.jsx";
import OrderListPage from "../pages/OrderListPage.jsx";
import UserListPage from "../pages/UserListPage.jsx";
import UserEditPage from "../pages/UserEditPage.jsx";
import SellersListPage from "../pages/SellersListPage.jsx";
import SellerEditPage from "../pages/SellerEditPage.jsx";
import ServiceProviderList from "../pages/ServiceProviderList.jsx";
import ServiceProviderEditPage from "../pages/ServiceProviderEditPage.jsx";
import BlogsPage from "../pages/BlogsPage.jsx";
import BlogEditPage from "../pages/BlogEditPage.jsx";
import MessageEditPage from "../pages/MessageEditPage.jsx";
import Users from "../components/UsersProductSales.jsx";
import ServiceProviders from "../components/ServiceProviders.jsx";
import Notifications from "../components/Notifications.jsx";
import AdminRoute from "../components/AdminRoute.js";

export const adminRoutes = [
  {
    path: "/admin/dashboard",
    element: (
      <AdminRoute>
        <DashboardPage />
      </AdminRoute>
    ),
  },
  {
    path: "/admin/products",
    element: (
      <AdminRoute>
        <ProductListPage />
      </AdminRoute>
    ),
  },
  {
    path: "/admin/product/:id",
    element: (
      <AdminRoute>
        <ProductEditPage />
      </AdminRoute>
    ),
  },
  {
    path: "/admin/orders",
    element: (
      <AdminRoute>
        <OrderListPage />
      </AdminRoute>
    ),
  },
  {
    path: "/admin/users",
    element: (
      <AdminRoute>
        <UserListPage />
      </AdminRoute>
    ),
  },
  {
    path: "/admin/user/:id",
    element: (
      <AdminRoute>
        <UserEditPage />
      </AdminRoute>
    ),
  },
  {
    path: "/admin/sellers",
    element: (
      <AdminRoute>
        <SellersListPage />
      </AdminRoute>
    ),
  },
  {
    path: "/admin/sellers/:id",
    element: (
      <AdminRoute>
        <SellerEditPage />
      </AdminRoute>
    ),
  },
  {
    path: "/admin/manage-service-providers",
    element: (
      <AdminRoute>
        <ServiceProviderList />
      </AdminRoute>
    ),
  },
  {
    path: "/admin/manage-service-providers/:id",
    element: (
      <AdminRoute>
        <ServiceProviderEditPage />
      </AdminRoute>
    ),
  },
  {
    path: "/admin/blogs-list",
    element: (
      <AdminRoute>
        <BlogsPage />
      </AdminRoute>
    ),
  },
  {
    path: "/admin/blog/:id",
    element: (
      <AdminRoute>
        <BlogEditPage />
      </AdminRoute>
    ),
  },
  {
    path: "/admin/message/:id/edit",
    element: (
      <AdminRoute>
        <MessageEditPage />
      </AdminRoute>
    ),
  },
  {
    path: "/admin/dashboard/users",
    element: (
      <AdminRoute>
        <Users />
      </AdminRoute>
    ),
  },
  {
    path: "/admin/dashboard/service-providers",
    element: (
      <AdminRoute>
        <ServiceProviders />
      </AdminRoute>
    ),
  },
  {
    path: "/admin/dashboard/notification",
    element: (
      <AdminRoute>
        <Notifications />
      </AdminRoute>
    ),
  },
];