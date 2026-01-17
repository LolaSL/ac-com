import HomeBannerPage from "../pages/HomeBannerPage.jsx";
import ProductPage from "../pages/ProductPage.jsx";
import CartPage from "../pages/CartPage.jsx";
import SearchPage from "../pages/SearchPage.jsx";
import SignInPage from "../pages/SignInPage.jsx";
import SignUpPage from "../pages/SignUpPage.jsx";
import ForgetPasswordPage from "../pages/ForgetPasswordPage.jsx";
import ResetPasswordPage from "../pages/ResetPasswordPage.jsx";
import SellerPage from "../pages/SellerPage.jsx";
import FeaturedPage from "../pages/FeaturedPage.jsx";
import ContactPage from "../pages/ContactPage.jsx";
import AboutUs from "../pages/AboutUs.jsx";
import Measurement from "../pages/Measurement.jsx";
import BlogList from "../pages/BlogList.jsx";
import BlogDetails from "../pages/BlogDetails.jsx";
import Offers from "../pages/Offers.jsx";
import AdvancedAC from "../pages/AdvancedAC.jsx";
import AdminLoginPage from "../pages/AdminLoginPage.jsx";
import ServiceProviderLogin from "../pages/ServiceProviderLogin.jsx";
import ServiceProviderRegister from "../pages/ServiceProviderRegister.jsx";
import ShipMentPage from "../pages/ShipMentPage.jsx";
import ReturnsPage from "../pages/ReturnsPage.jsx";
import CancellationPage from "../pages/CancellationPage.jsx";
import PrivacyPolicyPage from "../pages/PrivacyPolicyPage.jsx";
import TermsOfUsePage from "../pages/TermsOfusepage.jsx";
import OurNetworkPage from "../pages/OurNetworkPage.jsx";
import ROICalculatorExperimental from "../pages/ROICalculatorExperimental.jsx";

export const publicRoutes = [
  { path: "/", element: <HomeBannerPage /> },
  { path: "/product/:slug", element: <ProductPage /> },
  { path: "/products", element: <FeaturedPage /> },
  { path: "/cart", element: <CartPage /> },
  { path: "/search", element: <SearchPage /> },
  { path: "/signin", element: <SignInPage /> },
  { path: "/signup", element: <SignUpPage /> },
  { path: "/admin-login", element: <AdminLoginPage /> },
  { path: "/forget-password", element: <ForgetPasswordPage /> },
  { path: "/reset-password/:token", element: <ResetPasswordPage /> },
  { path: "/serviceprovider/login", element: <ServiceProviderLogin /> },
  { path: "/serviceprovider/register", element: <ServiceProviderRegister /> },
  { path: "/sellers", element: <OurNetworkPage /> },
  { path: "/sellers/:id", element: <SellerPage /> },
  { path: "/about-us", element: <AboutUs /> },
  { path: "/uploadfile", element: <Measurement /> },
  { path: "/contact", element: <ContactPage /> },
  { path: "/blogs", element: <BlogList /> },
  { path: "/blogs/:id", element: <BlogDetails /> },
  { path: "/advanced-ac", element: <AdvancedAC /> },
  { path: "/offers", element: <Offers /> },
  { path: "/roi-calculator", element: <ROICalculatorExperimental /> },
  { path: "/shipment", element: <ShipMentPage /> },
  { path: "/returns", element: <ReturnsPage /> },
  { path: "/cancellation-policy", element: <CancellationPage /> },
  { path: "/privacy-policy", element: <PrivacyPolicyPage /> },
  { path: "/terms-of-use", element: <TermsOfUsePage /> },
];
