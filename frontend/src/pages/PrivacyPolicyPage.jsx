import React from "react";
import { Container } from "react-bootstrap";

const PrivacyPolicyPage = () => {
  return (
    <Container className="my-5">
       <h1 className="page-title mb-4">Privacy Policy</h1>

      <h4>Information We Collect</h4>
      <p className="fs-5">
        We collect information when you register on our website, place an order, enter a contest or sweepstakes, respond to a survey, or communicate with us via email or phone. This may include your name, email address, mailing address, phone number, credit card information, or other details. You may also visit our site anonymously.
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
        <li>Process transactions quickly and securely.</li>
        <li>Administer contests, promotions, or surveys.</li>
        <li>Send periodic emails if you have opted in to receive newsletters. You can opt-out at any time.</li>
      </ul>

      <h4>Protection of Your Information</h4>
      <p className="fs-5">
        We implement a variety of security measures to safeguard your personal information. Sensitive data, including credit card information, is transmitted via Secure Socket Layer (SSL) and encrypted in our databases. Access is limited to authorized personnel only.
      </p>

      <h4>Cookies</h4>
      <p className="fs-5">
        We use cookies to enhance your experience, remember items in your cart, understand preferences, and analyze site traffic. You may disable cookies in your browser settings, but some features of the site may not function properly. Orders can still be placed via phone.
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
        Any changes will be posted on this page. Changes apply only to information collected after the modification date. Last modified: December 9, 2025.
      </p>
    </Container>
  );
};

export default PrivacyPolicyPage;
