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
          <p className="prv-hero__sub">How we collect, use, and protect your personal information in compliance with global privacy laws.</p>
        </div>
      </div>
      <div className="prv-inner">

      <p className="fs-5">
        <strong>Effective Date: June 28, 2026</strong>
      </p>
      <p className="fs-5">
        AC-Commerce ("we," "us," or "our") is committed to protecting your privacy and personal data.
        This Privacy Policy explains how we collect, use, store, and protect your information when you
        use our website and services. We comply with applicable data protection laws including the EU
        General Data Protection Regulation (GDPR), UK Data Protection Act 2018, California Consumer
        Privacy Act (CCPA), and other relevant privacy legislation worldwide.
      </p>

      <h4>Information We Collect</h4>
      <p className="fs-5">
        We collect personal information when you:
      </p>
      <ul className="fs-5">
        <li>Create an account or register on our website</li>
        <li>Place an order or make a purchase</li>
        <li>Subscribe to newsletters or marketing communications</li>
        <li>Contact us via email, phone, or support forms</li>
        <li>Participate in surveys, promotions, or competitions</li>
        <li>Interact with our service provider marketplace</li>
        <li>Browse our website (via cookies and analytics)</li>
      </ul>
      <p className="fs-5">
        <strong>Types of data collected may include:</strong>
      </p>
      <ul className="fs-5">
        <li><strong>Identity data:</strong> Name, username, title, date of birth</li>
        <li><strong>Contact data:</strong> Email address, postal address, phone number</li>
        <li><strong>Financial data:</strong> Payment information (processed by PayPal; we do not store card details)</li>
        <li><strong>Transaction data:</strong> Order history, purchase details, delivery information</li>
        <li><strong>Technical data:</strong> IP address, browser type, device information, operating system</li>
        <li><strong>Usage data:</strong> How you use our website, pages visited, time spent, referring URLs</li>
        <li><strong>Marketing data:</strong> Your preferences for receiving communications from us</li>
        <li><strong>Communication data:</strong> Messages sent through our platform, support inquiries</li>
      </ul>
      <p className="fs-5">
        We also collect information about gift recipients or alternate delivery addresses to fulfill orders.
        This information is used solely for order fulfillment and is not used for marketing purposes without
        explicit consent.
      </p>
      <p className="fs-5">
        <strong>Anonymous browsing:</strong> You may visit our site without creating an account, though some
        features require registration.
      </p>

      <h4>How We Use Your Information (Legal Basis)</h4>
      <p className="fs-5">
        We use your personal information for the following purposes, based on the legal grounds indicated:
      </p>
      <ul className="fs-5">
        <li><strong>Contract performance:</strong> To process and fulfill your orders, manage payments, arrange shipping, and provide customer support</li>
        <li><strong>Legitimate interests:</strong> To personalize your experience, recommend relevant products, improve our website, prevent fraud, and analyze usage patterns</li>
        <li><strong>Legal obligation:</strong> To comply with tax laws, accounting requirements, and respond to legal requests</li>
        <li><strong>Consent:</strong> To send marketing communications, newsletters, and promotional offers (you can withdraw consent at any time)</li>
      </ul>
      <p className="fs-5">
        Specifically, we use your data to:
      </p>
      <ul className="fs-5">
        <li>Process transactions securely through PayPal</li>
        <li>Respond to customer service inquiries and support requests</li>
        <li>Send order confirmations, shipping updates, and delivery notifications</li>
        <li>Administer contests, surveys, promotions, or special offers</li>
        <li>Send periodic emails about products, services, or updates (if opted in)</li>
        <li>Improve our website functionality based on usage analytics</li>
        <li>Detect and prevent fraudulent transactions or security threats</li>
        <li>Facilitate communications between customers and HVAC service providers on our platform</li>
        <li>Comply with legal and regulatory obligations</li>
      </ul>

      <h4>Data Security and Protection</h4>
      <p className="fs-5">
        We implement robust technical and organizational security measures to protect your personal
        information from unauthorized access, loss, misuse, alteration, or destruction:
      </p>
      <ul className="fs-5">
        <li><strong>Encryption:</strong> All data transmissions are encrypted using SSL/TLS protocols</li>
        <li><strong>Payment security:</strong> All payment transactions are processed securely through PayPal's PCI-DSS compliant platform. AC-Commerce does not collect, store, or have access to your credit card numbers, banking details, or payment credentials</li>
        <li><strong>Access controls:</strong> Personal data access is restricted to authorized personnel only on a need-to-know basis</li>
        <li><strong>Authentication:</strong> Secure JWT (JSON Web Token) authentication for user sessions</li>
        <li><strong>Regular audits:</strong> We conduct periodic security assessments and vulnerability testing</li>
        <li><strong>Data minimization:</strong> We only collect and retain data necessary for specified purposes</li>
      </ul>
      <p className="fs-5">
        While we strive to use commercially acceptable means to protect your personal data, no method of
        transmission over the internet or electronic storage is 100% secure. We cannot guarantee absolute
        security but will notify affected users of any data breach as required by applicable law.
      </p>

      <h4>Cookies, Local Storage, and Tracking Technologies</h4>
      <p className="fs-5">
        We use cookies, local storage, and similar technologies to operate and improve our website.
        Under GDPR and ePrivacy regulations, we obtain your consent before using non-essential cookies.
      </p>
      <p className="fs-5"><strong>What we store and why:</strong></p>
      <ul className="fs-5">
        <li><strong>Authentication tokens (Essential):</strong> A secure JWT token is saved in browser local storage when you sign in to maintain your logged-in session across pages and visits. Without this, you would need to log in on every page.</li>
        <li><strong>Shopping cart & preferences (Functional):</strong> Your cart contents, language preference, and site settings are stored locally to persist between visits and provide a seamless shopping experience.</li>
        <li><strong>Referral codes (Functional):</strong> If you arrive via a partner referral link, we temporarily store the referral code to properly credit the referring partner and track campaign performance.</li>
        <li><strong>Browsing history (Analytics):</strong> Products you view are recorded to personalize recommendations and improve your experience. This data helps us understand which products interest you.</li>
        <li><strong>Outbound click tracking (Analytics):</strong> When you click links to third-party brand websites (e.g., manufacturer sites), we record the click timestamp and destination to measure referral traffic. We do not track your activity on external sites.</li>
        <li><strong>Cookie consent (Essential):</strong> Once you accept this policy via the cookie banner, your acceptance is saved so the banner is not repeatedly shown.</li>
        <li><strong>Analytics cookies (Analytics):</strong> We may use tools like Google Analytics to understand aggregate usage patterns, traffic sources, and site performance. These cookies do not identify you personally.</li>
      </ul>
      <p className="fs-5">
        <strong>Your control over cookies:</strong> You can manage, disable, or delete cookies through your
        browser settings at any time. Disabling cookies may affect site functionality—some features require
        local storage or cookies to work properly. Clearing browser storage will sign you out and reset
        preferences.
      </p>
      <p className="fs-5">
        <strong>Cookie types:</strong>
      </p>
      <ul className="fs-5">
        <li><strong>Strictly necessary cookies:</strong> Required for website operation (login, cart). Cannot be disabled.</li>
        <li><strong>Functional cookies:</strong> Enhance functionality and personalization. Can be disabled.</li>
        <li><strong>Analytics/performance cookies:</strong> Help us understand site usage. Can be disabled.</li>
        <li><strong>Marketing cookies:</strong> Used for targeted advertising (if applicable). Require explicit consent.</li>
      </ul>

      <h4>Information Sharing and Third Parties</h4>
      <p className="fs-5">
        We do not sell, trade, or rent your personally identifiable information to third parties. We may
        share your information only in the following circumstances:
      </p>
      <ul className="fs-5">
        <li><strong>Service providers:</strong> Trusted third-party companies that assist with website hosting, payment processing (PayPal), shipping and logistics, email delivery, analytics, and customer support. These providers are contractually obligated to protect your data and use it only for the specified services.</li>
        <li><strong>HVAC service providers:</strong> When you use our marketplace to connect with HVAC installers or service providers, we share necessary contact and project information to facilitate the service. These providers have their own privacy policies.</li>
        <li><strong>Legal requirements:</strong> We may disclose information when required by law, court order, subpoena, or to comply with legal processes; to protect our rights, property, or safety; to investigate fraud; or to respond to government requests.</li>
        <li><strong>Business transfers:</strong> In the event of a merger, acquisition, reorganization, or sale of assets, your personal data may be transferred to the acquiring entity, subject to the same privacy protections.</li>
        <li><strong>With your consent:</strong> We may share information for other purposes with your explicit consent.</li>
      </ul>
      <p className="fs-5">
        <strong>International data transfers:</strong> Your information may be transferred to and processed in countries
        outside your country of residence, including countries that may not have the same level of data protection.
        When we transfer data internationally, we implement appropriate safeguards such as Standard Contractual
        Clauses (SCCs) approved by the European Commission or equivalent mechanisms to ensure your data remains
        protected in accordance with applicable law.
      </p>

      <h4>Your Privacy Rights and Choices</h4>
      <p className="fs-5">
        Depending on your location, you have various rights regarding your personal data:
      </p>
      <p className="fs-5"><strong>All users:</strong></p>
      <ul className="fs-5">
        <li><strong>Access:</strong> Request a copy of the personal data we hold about you</li>
        <li><strong>Correction:</strong> Update or correct inaccurate personal information</li>
        <li><strong>Deletion:</strong> Request deletion of your personal data (subject to legal retention requirements)</li>
        <li><strong>Opt-out of marketing:</strong> Unsubscribe from marketing emails via the "My Account" section or unsubscribe links in emails</li>
      </ul>
      <p className="fs-5"><strong>EU/UK/EEA residents (GDPR rights):</strong></p>
      <ul className="fs-5">
        <li><strong>Right to access:</strong> Obtain confirmation of data processing and a copy of your data</li>
        <li><strong>Right to rectification:</strong> Correct inaccurate or incomplete data</li>
        <li><strong>Right to erasure ("right to be forgotten"):</strong> Request deletion in certain circumstances</li>
        <li><strong>Right to restrict processing:</strong> Limit how we use your data</li>
        <li><strong>Right to data portability:</strong> Receive your data in a structured, machine-readable format</li>
        <li><strong>Right to object:</strong> Object to processing based on legitimate interests or for direct marketing</li>
        <li><strong>Right to withdraw consent:</strong> Withdraw consent at any time (does not affect prior lawful processing)</li>
        <li><strong>Right to lodge a complaint:</strong> File a complaint with your national data protection authority</li>
      </ul>
      <p className="fs-5"><strong>California residents (CCPA/CPRA rights):</strong></p>
      <ul className="fs-5">
        <li>Know what personal information we collect, use, and disclose</li>
        <li>Request deletion of personal information (subject to exceptions)</li>
        <li>Opt-out of the "sale" of personal information (we do not sell personal data)</li>
        <li>Non-discrimination for exercising your rights</li>
      </ul>
      <p className="fs-5">
        <strong>To exercise your rights:</strong> Contact us at <a href="mailto:accomhomesupply.support@gmail.com">accomhomesupply.support@gmail.com</a> with subject line "Privacy Rights Request."
        We will respond within 30 days (or as required by applicable law). We may require identity verification before
        processing requests.
      </p>
      <p className="fs-5">
        <strong>Account management:</strong> You can modify your information, email preferences, and delete shipping/billing
        addresses through the "My Account" section. Certain transactional data may be retained for legal, tax, or
        accounting purposes even after account deletion.
      </p>

      <h4>Data Retention</h4>
      <p className="fs-5">
        We retain your personal data only as long as necessary to fulfill the purposes for which it was collected
        or as required by law:
      </p>
      <ul className="fs-5">
        <li><strong>Account data:</strong> Retained while your account is active or as needed to provide services</li>
        <li><strong>Transaction records:</strong> Retained for 7 years for tax, accounting, and legal compliance</li>
        <li><strong>Marketing data:</strong> Retained until you opt-out or withdraw consent</li>
        <li><strong>Analytics data:</strong> Aggregated and anonymized data may be retained indefinitely</li>
        <li><strong>Support communications:</strong> Retained for 3 years for quality assurance and dispute resolution</li>
      </ul>
      <p className="fs-5">
        When data is no longer needed, we securely delete or anonymize it.
      </p>

      <h4>Third-Party Links</h4>
      <p className="fs-5">
        Our website may contain links to third-party websites, manufacturer sites, or service providers with
        independent privacy policies. We are not responsible for the privacy practices or content of these
        external sites. We encourage you to review their privacy policies before providing any personal information.
        Your interactions with third-party sites are governed solely by their terms and policies.
      </p>

      <h4>Contact Us and Data Protection Officer</h4>
      <p className="fs-5">
        For questions, concerns, or requests regarding this Privacy Policy, data protection, or to exercise your
        privacy rights, please contact us:
      </p>
      <p className="fs-5">
        <strong>Email:</strong> <a href="mailto:accomhomesupply.support@gmail.com">accomhomesupply.support@gmail.com</a><br/>
        <strong>Subject Line:</strong> Privacy Inquiry or Data Subject Rights Request
      </p>
      <p className="fs-5">
        <strong>EU/UK Data Protection Officer:</strong> For GDPR-related inquiries, you may contact our Data Protection
        Officer at the same email address with subject line "DPO - GDPR Request."
      </p>
      <p className="fs-5">
        <strong>Supervisory Authority:</strong> If you are located in the EU/EEA or UK and are unsatisfied with our
        response, you have the right to lodge a complaint with your local data protection authority.
      </p>

      <h4>Children's Privacy</h4>
      <p className="fs-5">
        Our website and services are not intended for children under the age of 16 (or the applicable age of digital
        consent in your jurisdiction, which may be 13-16 depending on location). We do not knowingly collect personal
        information from children. If you believe we have inadvertently collected information from a child, please
        contact us immediately at <a href="mailto:accomhomesupply.support@gmail.com">accomhomesupply.support@gmail.com</a>,
        and we will take steps to delete it promptly.
      </p>
      <p className="fs-5">
        Parents or guardians who believe their child has provided personal information to us can request access,
        correction, or deletion of that information.
      </p>

      <h4>Terms and Conditions</h4>
      <p className="fs-5">
        Please review our <a href="/terms-of-use">Terms and Conditions</a> for disclaimers and limitations of liability governing use of our website.
      </p>

      <h4>Your Consent</h4>
      <p className="fs-5">
        By using our website and services, you acknowledge that you have read, understood, and agree to this
        Privacy Policy. If you do not agree with any part of this policy, please do not use our website or services.
      </p>
      <p className="fs-5">
        For processing activities that require consent (such as marketing communications), you have the right to
        withdraw your consent at any time. Withdrawing consent does not affect the lawfulness of processing based
        on consent before withdrawal.
      </p>

      <h4>Changes to This Privacy Policy</h4>
      <p className="fs-5">
        We may update this Privacy Policy from time to time to reflect changes in our practices, technology,
        legal requirements, or other operational reasons. Material changes will be communicated via:
      </p>
      <ul className="fs-5">
        <li>Posting the updated policy on this page with a revised "Effective Date"</li>
        <li>Email notification to registered users (for significant changes)</li>
        <li>Prominent website notice or pop-up (where required by law)</li>
      </ul>
      <p className="fs-5">
        Changes are effective immediately upon posting unless otherwise stated. We encourage you to review this
        Privacy Policy periodically. Continued use of our website after changes constitutes acceptance of the
        updated policy.
      </p>
      <p className="fs-5">
        <strong>Previous versions:</strong> You may request previous versions of this policy by contacting us.
      </p>
      <p className="fs-5">
        <strong>Last Updated: June 28, 2026</strong><br/>
        Previous modification: May 9, 2026
      </p>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
