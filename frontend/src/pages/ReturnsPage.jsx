import React from 'react';
import { FaUndoAlt } from 'react-icons/fa';
import './ReturnsPage.css';

const ReturnsPage = () => {
  return (
    <div className="ret-page">
      <div className="ret-hero">
        <div className="ret-hero__inner">
          <div className="ret-hero__icon"><FaUndoAlt /></div>
          <h1 className="ret-hero__title">Returns</h1>
          <p className="ret-hero__sub">Our flexible return policy — customer satisfaction is our priority.</p>
        </div>
      </div>
      <div className="ret-inner">
        <p className="fs-5">
          At AC-Commerce, your satisfaction is our top priority. We offer a
          flexible return policy for air conditioners, outdoor units, and
          ventilation equipment that complies with international consumer protection
          standards. If you are not satisfied with your purchase, contact us and
          we will guide you through our return process. Nothing in this policy
          affects your statutory consumer rights under applicable law.
        </p>

        <h4>Return Period and Eligibility</h4>
        <ul className="custom-ul ret-no-justify">
          <li className="fs-5">Only new, unused, and uninstalled items are eligible for return.</li>
          <li className="fs-5">
            <strong>Return timeframes vary by jurisdiction:</strong>
            <ul style={{marginTop: '8px'}}>
              <li>EU customers: 14-day statutory cooling-off period for distance sales (as per EU Consumer Rights Directive)</li>
              <li>UK customers: 14 days under Consumer Contracts Regulations 2013</li>
              <li>Australia customers: Governed by Australian Consumer Law (ACL)</li>
              <li>Other international customers: Generally 14-30 days depending on local law</li>
              <li>Domestic customers: 20 days from receipt</li>
            </ul>
          </li>
          <li className="fs-5">
            An RMA (Return Merchandise Authorization) number is required for all returns.
            Contact us to obtain your RMA before shipping any return.
          </li>
          <li className="fs-5">
            Customers are responsible for return shipping charges, including international
            return freight which can be substantial (often $200-$800+ depending on location
            and item size). Original shipping costs are non-refundable except where required
            by consumer protection laws.
          </li>
        </ul>

        <h4>Non-Returnable Items</h4>
        <p className="fs-5">
          Products must be new, unused, and include all manuals, parts, accessories,
          and original packaging. The following items are <strong>not eligible for return</strong>:
          individual parts, filters, remotes, tools, cleaning products, mini split air
          conditioners (certain models), central air conditioner condensers, 265/277V products,
          460/480V products, DIY mini split line sets, and any item that has been installed,
          attempted to be installed, or shows signs of use.
        </p>
        <p className="fs-5">
          Products purchased as part of a custom quote, volume purchase, or at a discounted
          price (&gt;30% off) may only be returnable if authorized by AC-Commerce and may be
          subject to additional restocking fees (up to 35%). Please contact us before initiating
          a return for these items. Custom-ordered or special-order products are generally
          non-returnable unless defective.
        </p>
        <p className="fs-5">
          <strong>Consumer Rights Exception:</strong> If the product is faulty, not as described,
          or does not meet statutory quality standards, you may have additional rights under your
          local consumer protection laws that supersede these restrictions (e.g., EU Consumer Rights
          Directive, UK Consumer Rights Act 2015, Australian Consumer Law). Contact us to exercise
          these rights.
        </p>

        <h4>How to Return an Item</h4>
        <p className="fs-5">
          We are not responsible for damage or loss during return shipping. You are
          strongly encouraged to purchase shipping insurance, especially for international
          returns. If an item is lost or damaged during return transit, the customer bears
          the responsibility and cost. Track your return shipment and retain proof of
          shipment until your return is processed.
        </p>
        <p className="fs-5">To return an item:</p>
        <ul className="custom-ul">
          <li className="fs-5">Verify that the product meets the return eligibility requirements above.</li>
          <li className="fs-5">
            Contact us via email at <strong>accomhomesupply.support@gmail.com</strong> to
            request an RMA number. Include your order number, reason for return, and photos
            if applicable. Returns without a valid RMA will be refused.
          </li>
          <li className="fs-5">All RMA numbers expire 30 days after issuance (14 days for EU/UK customers exercising statutory rights).</li>
          <li className="fs-5">
            Return items using the same shipping method as the original delivery (freight
            items must return via freight carrier; small parcels via courier service).
          </li>
          <li className="fs-5">
            Securely package the item in original or equivalent packaging. Include all
            accessories, manuals, and documents. Write the RMA number clearly on the outside
            of the package.
          </li>
          <li className="fs-5">
            Ship to the return address provided with your RMA authorization. For international
            returns, ensure proper customs documentation is attached (commercial invoice stating
            "Returned Goods" and original order value).
          </li>
          <li className="fs-5">
            Provide tracking information and proof of insurance (if applicable) via email.
          </li>
        </ul>

        <h4>Refunds and Processing</h4>
        <p className="fs-5">
          Once your return is received and inspected (typically 1-5 business days), refunds
          will be issued to the original payment method:
        </p>
        <ul className="fs-5">
          <li><strong>Domestic returns:</strong> Refunds processed within 5-10 business days after inspection</li>
          <li><strong>International returns:</strong> Refunds processed within 7-14 business days after inspection and customs clearance</li>
          <li><strong>PayPal refunds:</strong> Generally appear within 1-3 business days</li>
          <li><strong>Credit/debit card refunds:</strong> May take 5-10 business days depending on your bank</li>
        </ul>
        <p className="fs-5">
          Refunds are minus original shipping costs (which are non-refundable) and any applicable
          restocking fees, except where prohibited by consumer protection laws. If a product was
          defective, not as described, or did not meet quality standards, you are entitled to a
          full refund including shipping costs under most consumer protection laws.
        </p>
        <p className="fs-5">
          <strong>EU/UK Customers:</strong> Under the Consumer Rights Directive and Consumer Contracts
          Regulations, you are entitled to a full refund within 14 days of exercising your right of
          withdrawal, including standard delivery costs (but not premium or expedited shipping costs
          you chose). Refunds must be processed within 14 days of receiving the returned item.
        </p>

        <h4>Defective or Faulty Items</h4>
        <p className="fs-5">
          If your item is defective, does not work upon receipt, or does not match the product
          description, you have rights under applicable consumer protection laws and manufacturer
          warranties:
        </p>
        <ul className="fs-5">
          <li><strong>Manufacturer warranty:</strong> Contact the manufacturer directly for warranty service,
          replacement parts, or repair. Most HVAC equipment carries 1-10 year manufacturer warranties.</li>
          <li><strong>DOA (Dead on Arrival):</strong> If the product is defective within 30 days of receipt,
          contact us immediately for a replacement or full refund at our discretion.</li>
          <li><strong>Consumer rights:</strong> If the product fails within the first 6-12 months (depending
          on jurisdiction) and the fault existed at the time of delivery, you may be entitled to repair,
          replacement, or refund under statutory consumer guarantees.</li>
        </ul>
        <p className="fs-5">
          AC-Commerce cannot authorize exchanges for manufacturer defects that appear after installation;
          these must be handled through the manufacturer's warranty service. However, if you believe the
          product was faulty at the time of delivery and within statutory guarantee periods, contact us
          to exercise your consumer rights.
        </p>

        <h4>Order Cancellations and Refusals</h4>
        <p className="fs-5">
          Orders that have not yet shipped or cleared customs can be canceled by contacting us
          immediately via email. Once an item has shipped, it cannot be canceled and must follow
          our return procedures. Refused shipments (declining delivery without proper return
          authorization) will incur a <strong>25% restocking fee</strong> plus all shipping,
          freight, and customs charges incurred.
        </p>
        <p className="fs-5">
          <strong>EU/UK Cooling-Off Period:</strong> You have the right to cancel your order within
          14 days of receiving the goods without giving a reason (Consumer Rights Directive/Consumer
          Contracts Regulations). To exercise this right, you must inform us of your decision before
          the 14-day period expires. You then have 14 days to return the goods.
        </p>
        <p className="fs-5">
          Cancellation requests must be sent via email to{" "}
          <strong>accomhomesupply.support@gmail.com</strong>. Include your order number and reason
          for cancellation.
        </p>

        <h4>Special Orders and Custom Products</h4>
        <p className="fs-5">
          Special orders, custom products, and made-to-order items cannot be canceled or returned
          once production has begun or the order has been placed with the manufacturer, except where
          the product is faulty or not as described. This includes custom electrical configurations,
          special voltage units, custom color finishes, and products ordered specifically for your
          project requirements.
        </p>
        <p className="fs-5">
          Products marked as "special order" or "custom" on our website or during phone orders are
          non-returnable. Please verify specifications, compatibility, and requirements carefully
          before purchasing. Contact us prior to ordering if you have any questions or concerns.
        </p>
        <p className="fs-5">
          <strong>Note:</strong> Your statutory consumer rights for faulty or misdescribed goods
          still apply even for special orders.
        </p>

        <h4>Product Compliance & Professional Installation</h4>
        <p className="fs-5">
          AC-Commerce makes reasonable efforts to provide accurate product specifications, but
          customers are responsible for verifying that products comply with all applicable local,
          regional, and national building codes, electrical regulations, safety standards, and
          environmental requirements in their jurisdiction.
        </p>
        <p className="fs-5">
          All HVAC equipment must be installed by a licensed and qualified professional in accordance
          with local regulations and manufacturer instructions. Improper installation, unauthorized
          modifications, or failure to follow installation guidelines may void warranties and return
          eligibility.
        </p>
        <p className="fs-5">
          Returns based solely on regulatory non-compliance (where the customer failed to verify
          compliance before purchase) may be subject to restocking fees and return shipping costs.
          However, if we provided incorrect specifications or the product does not match its description,
          you are entitled to a full refund under consumer protection laws.
        </p>
      </div>
    </div>
  );
};

export default ReturnsPage;
