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
          ventilation equipment. If you are not satisfied with your purchase,
          contact us and we will guide you through our easy return process.
        </p>

        <h4>Important Highlights</h4>
        <ul className="custom-ul ret-no-justify">
          <li className="fs-5">Only new, unused items are eligible for return.</li>
          <li className="fs-5">Items must be returned within 20 days of receipt.</li>
          <li className="fs-5">
            An RMA (Return Merchandise Authorization) number is required for all returns.
          </li>
          <li className="fs-5">
            Customers are responsible for all shipping charges, both to and from
            our warehouses. Although items are shipped using AC-Commerce's
            “Simply Free Shipping,” actual return shipping/freight costs are the
            responsibility of the customer.
          </li>
        </ul>

        <h4>What is Eligible for Return?</h4>
        <p className="fs-5">
          Products must be new, unused, and include all manuals, parts, and
          accessories. The following items are{" "}
          <strong>not eligible for return</strong>: parts, filters, remotes,
          tools, cleaning products, mini split air conditioners, central air
          conditioner condensers, 265/277V products, 460/480V products, and DIY
          mini split line sets. Any item that has been installed or attempted to
          be installed is also ineligible.
        </p>
        <p className="fs-5">
          Products purchased as part of a quote, volume purchase, or at a
          discounted price are only eligible for return if authorized by Total
          Home Supply and may be subject to restocking fees. Please contact us at{" "}
          <strong>(630) 446 8851</strong> to request authorization for these returns.
        </p>

        <h4>How to Return an Item</h4>
        <p className="fs-5">
          We are not responsible for damage or loss during return shipping.
          Customers are responsible for purchasing insurance on returned items. If
          an item is lost or damaged during return shipping, the customer bears
          the responsibility.
        </p>
        <p className="fs-5">To return an item:</p>
        <ul className="custom-ul">
          <li className="fs-5">Verify that the product meets the return requirements above.</li>
          <li className="fs-5">
            Contact us to obtain an RMA number. Returns without a valid RMA number will be refused.
          </li>
          <li className="fs-5">All RMA numbers expire 30 days after issuance.</li>
          <li className="fs-5">
            Return items using the same method as the original delivery. Freight
            items must be returned via a freight carrier.
          </li>
          <li className="fs-5">
            Include tracking information, insurance, and ensure the item is
            securely packaged. Damaged or poorly packaged items may be refused.
          </li>
        </ul>

        <h4>Refunds</h4>
        <p className="fs-5">
          Once your return is received and inspected, refunds will be issued to
          the original payment method. Refunds are minus original shipping costs,
          which are not refundable. Inspection usually takes 1–3 business days,
          with refunds processed within 2–7 additional business days depending on
          your bank.
        </p>

        <h4>Defective Items</h4>
        <p className="fs-5">
          If your item does not work upon receipt, contact the product
          manufacturer for a service call or replacement parts. AC-Commerce
          cannot authorize exchanges for defective items; this must be handled by
          the manufacturer.
        </p>

        <h4>Order Cancellations</h4>
        <p className="fs-5">
          Orders not yet loaded on a truck or shipped can be canceled by
          contacting us immediately. Once an item has shipped, it cannot be
          canceled and must follow our return procedures. Refused shipments will
          incur a 25% restocking fee plus all shipping/freight charges.
          Cancellation requests must be sent via email to{" "}
          <strong>accomhomesupply.support@gmail.com</strong>.
        </p>

        <h4>Special Orders</h4>
        <p className="fs-5">
          Special orders cannot be canceled or returned. This includes custom
          items or products listed as special order on our website or when ordered
          by phone. Contact us prior to purchasing a special-order item to ensure
          it meets your needs.
        </p>

        <h4>Product Usage &amp; Installation</h4>
        <p className="fs-5">
          AC-Commerce is not responsible for confirming local code
          compliance. Customers must verify that products meet all local, state,
          and federal codes and have items installed by a qualified installer.
          Improper installation or usage is the responsibility of the customer.
        </p>
      </div>
    </div>
  );
};

export default ReturnsPage;
