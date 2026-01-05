import ProfilePage from "../pages/ProfilePage.jsx";
import EngineerViewPage from "../pages/EngineerViewPage.jsx";
import OrderHistoryPage from "../pages/OrderHistoryPage.jsx";
import OrderPage from "../pages/OrderPage.jsx";
import MapPage from "../pages/MapPage.jsx";
import ServiceProviderProfile from "../pages/ServiceProviderProfile.jsx";
import EarningsPage from "../pages/EarningsPage.jsx";
import HoursPage from "../pages/HoursPage.jsx";
import ProjectsPage from "../pages/ProjectsPage.jsx";
import ServiceProviderMessages from "../components/ServiceProviderMessages.jsx";
import BrowsingHistoryPage from "../pages/BrowsingHistoryPage.jsx";
import UserReviewsPage from "../pages/UserReviewsPage.jsx";
import UserMessagesPage from "../pages/UserMessagesPage.jsx";
import WishlistPage from "../pages/WishlistPage.jsx";
import SellerDashboard from "../pages/SellerDashboard.jsx";
import TotalSellerDashboard from "../pages/TotalSellerDashboard.jsx";
import AdminAllAnnotationsPage from "../pages/AdminAllAnnotationsPage.jsx";
import ProtectedRoute from "../components/ProtectedRoute.js";

export const protectedRoutes = [
  {
    path: "/admin/engineer-view/:id",
    element: (
      <ProtectedRoute adminOnly={true}>
        <EngineerViewPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin/all-annotations",
    element: (
      <ProtectedRoute adminOnly={true}>
        <AdminAllAnnotationsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/profile",
    element: (
      <ProtectedRoute>
        <ProfilePage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/orderhistory",
    element: (
      <ProtectedRoute>
        <OrderHistoryPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/order/:id",
    element: (
      <ProtectedRoute>
        <OrderPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/map",
    element: (
      <ProtectedRoute>
        <MapPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/serviceprovider/profile/:id",
    element: (
      <ProtectedRoute>
        <ServiceProviderProfile />
      </ProtectedRoute>
    ),
  },
  {
    path: "/serviceprovider/earnings",
    element: (
      <ProtectedRoute>
        <EarningsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/serviceprovider/hours",
    element: (
      <ProtectedRoute>
        <HoursPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/serviceprovider/projects",
    element: (
      <ProtectedRoute>
        <ProjectsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/serviceprovider/messages",
    element: (
      <ProtectedRoute>
        <ServiceProviderMessages />
      </ProtectedRoute>
    ),
  },
  {
    path: "/browsing-history",
    element: (
      <ProtectedRoute>
        <BrowsingHistoryPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/my-reviews",
    element: (
      <ProtectedRoute>
        <UserReviewsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/order-messages",
    element: (
      <ProtectedRoute>
        <UserMessagesPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/wishlist",
    element: (
      <ProtectedRoute>
        <WishlistPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/seller/dashboard/:id",
    element: (
      <ProtectedRoute>
        <SellerDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "/seller/total-dashboard",
    element: (
      <ProtectedRoute>
        <TotalSellerDashboard />
      </ProtectedRoute>
    ),
  },
];
