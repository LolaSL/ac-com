import React from "react";
import { FaShieldAlt } from "react-icons/fa";
import "./PrivacyPolicyPage.css";

const PrivacyPolicyPage = () => {
  return (
    <div className="prv-page">
      <div className="prv-hero">
        <div className="prv-hero__inner">
          <div className="prv-hero__icon"><FaShieldAlt /></div>
          <h1 className="prv-hero__title">Privacy Policy</h1>
          <p className="prv-hero__sub">How we collect, use, and protect your personal information.</p>
        </div>
      </div>
      <div className="prv-inner">

      <h4>Information We Collect</h4>
      <p className="fs-5">
        We collect information when you register on our website, place an order, respond to a survey, or communicate with us via email or phone. This may include your name, email address, mailing address, phone number, and other details. You may also visit our site anonymously.
      </p>
      <p className="fs-5">
        We also collect information about gift recipients or other shipment recipients to fulfill orders. This information is not used for marketing purposes.
      </p>

      <h4>How We Use Your Information</h4>
      <p className="fs-5">
        We use the information collected to:
      </p>
      <ul className="fs-5">
        <li>Personalize your site experience and recommend relevant products.</li>
        <li>Respond effectively to customer service requests.</li>
        <li>Process transactions quickly and securely via PayPal.</li>
        <li>Administer surveys or promotions.</li>
        <li>Send periodic emails if you have opted in to receive newsletters. You can opt-out at any time.</li>
      </ul>

      <h4>Protection of Your Information</h4>
      <p className="fs-5">
        We implement a variety of security measures to safeguard your personal information. Payment transactions are processed securely through PayPal — AC-Commerce does not collect, store, or have access to your credit card or banking details. Access to your personal data is limited to authorized personnel only.
      </p>

      <h4>Cookies &amp; Local Storage</h4>
      <p className="fs-5">
        We use browser cookies and local storage to operate and improve this site. Specifically, we store:
      </p>
      <ul className="fs-5">
        <li><strong>Authentication tokens</strong> — a secure JWT token is saved in local storage when you sign in to keep you logged in across sessions.</li>
        <li><strong>Cart &amp; preferences</strong> — your shopping cart and site preferences are saved locally so they persist between visits.</li>
        <li><strong>Referral codes</strong> — if you arrive via a referral link, the referral code is temporarily stored to credit the correct partner.</li>
        <li><strong>Browsing history</strong> — products you view may be recorded to personalise recommendations shown to you.</li>
        <li><strong>Outbound click tracking</strong> — when you click a link to a third-party brand website, we record the click count and timestamp so we can measure the traffic we refer to our partner brands. No personal browsing activity on those external sites is collected by us.</li>
        <li><strong>Cookie consent</strong> — once you accept this policy via the banner, your acceptance is saved in local storage so the banner is not shown again.</li>
      </ul>
      <p className="fs-5">
        You may clear local storage and cookies via your browser settings at any time. Doing so will sign you out and reset your preferences. Some features may not function correctly without local storage enabled.
      </p>

      <h4>Information Sharing</h4>
      <p className="fs-5">
        We do not sell or trade your personally identifiable information. Third-party service providers may assist us in improving our business or services, but they are contractually obligated to protect your information. Information may also be disclosed if required by law or to protect rights and property.
      </p>

      <h4>Opt-Out and Account Management</h4>
      <p className="fs-5">
        You can modify your email subscriptions via the "My Account" section or any email link provided. To delete your account information, remove your shipping addresses, billing addresses, and payment information in "My Account". Certain transactional information may be retained for record-keeping.
      </p>

      <h4>Third-Party Links</h4>
      <p className="fs-5">
        Our site may include links to third-party sites with independent privacy policies. We are not responsible for the content or practices of these sites, but we welcome feedback regarding linked sites.
      </p>

      <h4>Questions and Feedback</h4>
      <p className="fs-5">
        For questions or concerns about privacy, please contact us at <a href="mailto:support@accomhomesupply.com">support@accomhomesupply.com</a>.
      </p>

      <h4>Age Restrictions</h4>
      <p className="fs-5">
        We do not knowingly collect information from individuals under 13. If you believe we have inadvertently collected such information, please contact us to remove it.
      </p>

      <h4>Terms and Conditions</h4>
      <p className="fs-5">
        Please review our <a href="/terms-of-use">Terms and Conditions</a> for disclaimers and limitations of liability governing use of our website.
      </p>

      <h4>Consent</h4>
      <p className="fs-5">
        By using our site, you consent to this Privacy Policy.
      </p>

      <h4>Changes to Our Policy</h4>
      <p className="fs-5">
        Any changes will be posted on this page. Changes apply only to information collected after the modification date. Last modified: May 9, 2026.
      </p>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
