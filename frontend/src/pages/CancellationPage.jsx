import React from "react";
import { FaBan } from "react-icons/fa";
import SupportEmailLink from "../components/SupportEmailLink.jsx";
import "./CancellationPage.css";

const CancellationPage = () => {
  return (
    <div className="cnc-page">
      <div className="cnc-hero">
        <div className="cnc-hero__inner">
          <div className="cnc-hero__icon"><FaBan /></div>
          <h1 className="cnc-hero__title">Cancellation Policy</h1>
          <p className="cnc-hero__sub">We process orders quickly — here's what you need to know about cancellations and your consumer rights.</p>
        </div>
      </div>
      <div className="cnc-inner">

      <p className="fs-5">
        At AC-Commerce, we understand that plans change. This Cancellation Policy explains your rights
        and our procedures for order cancellations. Your statutory consumer rights under applicable law
        remain unaffected by this policy.
      </p>

      <h4>Pre-Shipment Cancellations</h4>
      <p className="fs-5">
        Orders that have <strong>not yet been shipped, loaded onto a truck, or cleared customs</strong> can
        generally be cancelled free of charge. Please contact us immediately if you need to cancel, as we
        process and ship orders quickly to ensure timely delivery.
      </p>
      <p className="fs-5">
        <strong>How to cancel before shipment:</strong>
      </p>
      <ul className="fs-5">
        <li>Send an email to <SupportEmailLink subject="Order Cancellation Request" /> with subject line "Order Cancellation Request"</li>
        <li>Include your order number and reason for cancellation</li>
        <li>We will confirm cancellation within 24 hours (1 business day)</li>
        <li>Full refund will be processed to your original payment method within 5-14 business days</li>
      </ul>
      <p className="fs-5">
        <strong>Important:</strong> Cancellation requests must be submitted via email only. Phone requests
        are not accepted to ensure proper documentation and audit trail.
      </p>

      <h4>Post-Shipment Cancellations and Refusals</h4>
      <p className="fs-5">
        Once an item has been shipped, loaded onto a truck, or cleared customs, the order
        <strong> cannot be cancelled</strong>. In this case, you must follow our Return Policy
        to return the item after delivery.
      </p>
      <p className="fs-5">
        <strong>Refused shipments:</strong> If you refuse delivery without proper authorization or an RMA
        (Return Merchandise Authorization) number, you will be charged:
      </p>
      <ul className="fs-5">
        <li>A <strong>25% restocking fee</strong> of the order value</li>
        <li>All outbound and return shipping/freight charges</li>
        <li>Any customs duties, import taxes, or clearance fees incurred</li>
      </ul>
      <p className="fs-5">
        For international orders, refused shipments may result in charges of $300-$1,000+ depending on
        destination and freight costs. We strongly recommend following proper return procedures rather
        than refusing delivery.
      </p>

      <h4>EU/UK Cooling-Off Period (Distance Selling Rights)</h4>
      <p className="fs-5">
        <strong>For customers in the European Union, United Kingdom, and European Economic Area:</strong>
      </p>
      <p className="fs-5">
        Under the EU Consumer Rights Directive 2011/83/EU and UK Consumer Contracts Regulations 2013,
        you have the right to cancel your order within <strong>14 days</strong> without giving any reason
        ("cooling-off period"). This applies to distance contracts (online purchases).
      </p>
      <p className="fs-5"><strong>How the 14-day period works:</strong></p>
      <ul className="fs-5">
        <li>The 14-day period begins on the day you (or a third party you designate) receive the goods</li>
        <li>You must inform us of your decision to cancel before the 14-day period expires</li>
        <li>You can use our email or a clear written statement of your intention to cancel</li>
        <li>You then have 14 days from notifying us to return the goods</li>
      </ul>
      <p className="fs-5"><strong>Refund under cooling-off rights:</strong></p>
      <ul className="fs-5">
        <li>We will refund all payments received from you, including standard delivery costs (but not premium/express shipping you chose)</li>
        <li>Refund will be processed within 14 days of receiving the returned goods or proof of return</li>
        <li>Refund will be made to the same payment method used for purchase</li>
        <li>You are responsible for the cost of returning the goods unless the product was defective or misdescribed</li>
      </ul>
      <p className="fs-5"><strong>Exceptions to cooling-off rights:</strong></p>
      <ul className="fs-5">
        <li>Goods that have been unsealed, installed, or used after delivery (where product is unsuitable for return due to health/hygiene reasons)</li>
        <li>Custom-made or personalized products</li>
        <li>Sealed goods that have been unsealed and are not suitable for return (e.g., certain electrical items)</li>
      </ul>
      <p className="fs-5">
        <strong>To exercise your right of withdrawal:</strong> Email us at <SupportEmailLink subject="EU/UK Right of Withdrawal" /> with subject line "EU/UK Right of Withdrawal" and include your order number
        and clear statement that you wish to cancel.
      </p>

      <h4>Special Orders and Custom Products</h4>
      <p className="fs-5">
        Special orders, custom-configured products, and made-to-order items <strong>cannot be cancelled</strong>
        once the order has been placed with the manufacturer or production has begun. This includes:
      </p>
      <ul className="fs-5">
        <li>Custom electrical voltage configurations (265V, 277V, 460V, 480V)</li>
        <li>Special-order HVAC equipment not in regular stock</li>
        <li>Products with custom specifications requested by the customer</li>
        <li>Items marked as "special order" or "custom" on our website or order confirmation</li>
      </ul>
      <p className="fs-5">
        We will clearly indicate if a product is a special order before you complete your purchase. Please
        verify all specifications carefully before ordering. Special orders may still be subject to consumer
        protection rights if the product is defective or not as described.
      </p>

      <h4>Other Jurisdictions - Consumer Rights</h4>
      <p className="fs-5">
        Customers in other jurisdictions may have additional cancellation rights under local consumer
        protection laws:
      </p>
      <ul className="fs-5">
        <li><strong>Australia:</strong> Protected by Australian Consumer Law (ACL), including rights to cancel for major failures or false representations</li>
        <li><strong>Canada:</strong> Provincial consumer protection acts may provide cooling-off periods (typically 7-10 days depending on province)</li>
        <li><strong>Other countries:</strong> Contact us to understand your rights under local consumer protection legislation</li>
      </ul>

      <h4>Partial Cancellations</h4>
      <p className="fs-5">
        For orders containing multiple items, you may request cancellation of specific items that have not
        yet shipped. Contact us immediately with your order number and the specific items you wish to cancel.
        Items already shipped cannot be cancelled and must follow return procedures.
      </p>

      <h4>Refund Processing Times</h4>
      <p className="fs-5">
        When a cancellation is approved:
      </p>
      <ul className="fs-5">
        <li><strong>Pre-shipment cancellations:</strong> Refund within 5-10 business days</li>
        <li><strong>EU/UK statutory cancellations:</strong> Refund within 14 days of receiving returned goods</li>
        <li><strong>PayPal refunds:</strong> Typically appear in 1-3 business days</li>
        <li><strong>Credit/debit card refunds:</strong> May take 5-10 business days to appear on your statement</li>
      </ul>

      <h4>Best Practices</h4>
      <p className="fs-5">
        We encourage you to:
      </p>
      <ul className="fs-5">
        <li>Carefully review your order details, shipping address, and product specifications before completing your purchase</li>
        <li>Verify product compatibility with your local electrical standards and building codes</li>
        <li>Contact us immediately if you need to cancel \u2014 the sooner we receive your request, the better chance of cancellation before shipment</li>
        <li>Keep your order confirmation email for reference when requesting cancellations</li>
        <li>Check your email regularly after ordering for shipping notifications and updates</li>
      </ul>
      <p className="fs-5">
        Taking these steps can help avoid unnecessary cancellation fees and complications.
      </p>

      <h4>Contact Information</h4>
      <p className="fs-5">
        For all cancellation requests or questions about this policy, please email:{" "}
        <SupportEmailLink subject="Order Cancellation Request" />
      </p>
      <p className="fs-5">
        <strong>Required information for cancellation requests:</strong>
      </p>
      <ul className="fs-5">
        <li>Your order number (found in order confirmation email)</li>
        <li>Email address used for the order</li>
        <li>Reason for cancellation (optional but helpful)</li>
        <li>Clear statement that you wish to cancel the order</li>
      </ul>
      <p className="fs-5">
        <em>Last Updated: June 28, 2026</em>
      </p>
      </div>
    </div>
  );
};

export default CancellationPage;
