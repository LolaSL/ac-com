import React from "react";
import { FaTruck } from "react-icons/fa";
import "./ShipMentPage.css";

const ShipMentPage = () => {
  return (
    <div className="shp-page">
      <div className="shp-hero">
        <div className="shp-hero__inner">
          <div className="shp-hero__icon"><FaTruck /></div>
          <h1 className="shp-hero__title">Shipping, Tax &amp; Delivery</h1>
          <p className="shp-hero__sub">Everything you need to know about shipping, taxes, and delivery options.</p>
        </div>
      </div>
      <div className="shp-inner">

      <p className="fs-5">
        We’ve made shipping simple for all our air conditioners, outdoor units,
        and ventilation equipment. For orders within the Contiguous United
        States, shipping is calculated automatically based on your order value:
      </p>

      <ul className="fs-5">
        <li>Orders over $5,000: $100 shipping</li>
        <li>Orders over $2,000: $50 shipping</li>
        <li>Orders over $500: $25 shipping</li>
        <li>Orders under $500: $10 shipping</li>
      </ul>

      <h4>Sales Tax</h4>
      <p className="fs-5">
        All orders are subject to a flat <strong>15% sales tax</strong>, which
        is calculated automatically at checkout based on your items subtotal.
        Tax is displayed separately and included in your final order total
        before payment is completed.
      </p>

      <p className="fs-5">
        For shipments to Alaska, Hawaii, Puerto Rico, or areas requiring special
        arrangements (such as ferry or air freight), please contact us directly
        for a custom shipping quote. At this time, we do not ship outside the
        United States.
      </p>

      <p className="fs-5">
        Each item includes an estimated processing time before leaving our
        warehouse, which covers preparation and shipment. Once shipped, delivery
        generally takes 1–10 business days depending on your location and the
        warehouse the item ships from. On rare occasions, delivery may take up
        to 20 business days.
      </p>

      <h4>Small Items (Under 100 lbs.)</h4>
      <p className="fs-5">
        Most smaller HVAC parts, accessories, and components ship via FedEx,
        UPS, or USPS. Deliveries are typically curbside. Liftgate service may be
        included for heavier residential shipments. All shipments are FOB (Free
        on Board) Origin/Shipping Point.
      </p>

      <h4>Large Items & Freight Shipments</h4>
      <p className="fs-5">
        Most large HVAC units, outdoor condensers, and ventilation equipment
        ship via LTL (Less-Than-Truckload) freight carriers such as TForce,
        Estes, R&L Carriers, Ward Trucking, or Daylight Transport. All freight
        shipments are FOB Origin, and ownership transfers to the customer upon
        shipment. Insurance is available at the buyer’s request before the order
        ships.
      </p>

      <p className="fs-5">
        Freight shipments generally require a signature and delivery appointment
        for residential addresses. Liftgate service is included for items over
        150 lbs. Deliveries are curbside by default; for in-home delivery or
        special arrangements, please contact us before ordering. Commercial
        deliveries occur during normal business hours without liftgate service
        unless requested in the order notes.
      </p>

      <h4>Delivery & Inspection</h4>
      <p className="fs-5">
        You will receive tracking information and carrier contact details via
        email once your order ships. On delivery day, ensure an adult is present
        to receive and inspect the item. Please inspect all sides, including the
        bottom, for any damage. Note any issues on the delivery receipt. If an
        item is damaged beyond repair, refuse delivery and take clear photos.
        All damage must be reported within 5 business days.
      </p>

      <h4>Returns & Fees</h4>
      <p className="fs-5">
        Shipping fees for authorized returns are the customer’s responsibility.
        Refused shipments or cancellations after an order has been loaded will
        incur freight charges plus a 25% restocking fee. Special orders cannot
        be canceled.
      </p>

      <h4>Installation & Support</h4>
      <p className="fs-5">
        Installation must be performed by a qualified HVAC professional. Visit
        our blog for installation tips and guidance. If you encounter any
        issues, our support team is always available. Feel free to share photos
        of your completed installations—we love seeing our products in action!
      </p>

      <h4>Special Notes</h4>
      <p className="fs-5">
        Alternate shipping addresses must match your credit card verification
        details. Standard delivery is curbside. White-glove delivery is
        available by prior arrangement. Once an order has shipped, it cannot be
        canceled.
      </p>
      </div>
    </div>
  );
};

export default ShipMentPage;
