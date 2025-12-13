import ProfilePage from "../pages/ProfilePage.jsx";
import OrderHistoryPage from "../pages/OrderHistoryPage.jsx";
import OrderPage from "../pages/OrderPage.jsx";
import MapPage from "../pages/MapPage.jsx";
import ServiceProviderProfile from "../pages/ServiceProviderProfile.jsx";
import EarningsPage from "../pages/EarningsPage.jsx";
import HoursPage from "../pages/HoursPage.jsx";
import ProjectsPage from "../pages/ProjectsPage.jsx";
import MessagesPage from "../pages/MessagesPage.jsx";
import BrowsingHistoryPage from "../pages/BrowsingHistoryPage.jsx";
import UserReviewsPage from "../pages/UserReviewsPage.jsx";
import UserMessagesPage from "../pages/UserMessagesPage.jsx";
import ProtectedRoute from "../components/ProtectedRoute.js";

export const protectedRoutes = [
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
        <MessagesPage />
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
];
