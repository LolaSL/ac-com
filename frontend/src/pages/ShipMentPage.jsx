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
        We offer international shipping for all our air conditioners, outdoor units,
        and ventilation equipment to select countries and regions. Shipping costs are
        calculated automatically at checkout based on your destination and order value.
        For domestic shipments, standard rates apply:
      </p>

      <ul className="fs-5">
        <li>Orders over $5,000: <strong>Free domestic shipping</strong></li>
        <li>Orders over $2,000: $100 domestic shipping</li>
        <li>Orders over $500: $50 domestic shipping</li>
        <li>Orders under $500: $25 domestic shipping</li>
      </ul>

      <p className="fs-5">
        <strong>International shipping rates</strong> vary by destination, package weight, dimensions,
        and service level. Rates are calculated in real-time at checkout and typically range from
        $150–$800 depending on your location and order size. Remote areas or island destinations may
        require additional fees.
      </p>

      <h4>Taxes, Duties, and Customs</h4>
      <p className="fs-5">
        <strong>Domestic customers:</strong> Sales tax is calculated automatically at checkout based on
        your shipping address and applicable local tax rates (typically 6-10% depending on jurisdiction).
      </p>
      <p className="fs-5">
        <strong>International customers:</strong> Prices do not include customs duties, import taxes,
        VAT, GST, or other fees imposed by your country's customs authority. You are responsible for
        all customs charges, import duties, and taxes required by your destination country. These fees
        vary by country and are collected by the carrier or customs authority upon delivery or customs
        clearance. Please check with your local customs office for estimated charges before ordering.
        AC-Commerce is not responsible for customs delays, seized shipments, or refused deliveries due
        to import restrictions or unpaid duties.
      </p>

      <p className="fs-5">
        For shipments to remote areas, islands, or locations requiring special logistics arrangements
        (ferry, air freight, or specialized carriers), please contact us directly for a custom shipping
        quote before placing your order.
      </p>

      <h4>Processing and Delivery Times</h4>
      <p className="fs-5">
        Each item includes an estimated processing time (typically 1-3 business days) before leaving our
        warehouse for preparation and quality checks. Once shipped:
      </p>
      <ul className="fs-5">
        <li><strong>Domestic deliveries:</strong> 1-10 business days (rarely up to 20 business days for remote areas)</li>
        <li><strong>International deliveries:</strong> 5-30 business days depending on destination and customs clearance</li>
        <li><strong>Express shipping:</strong> Available for select destinations at additional cost (2-5 business days)</li>
      </ul>
      <p className="fs-5">
        International delivery times vary based on customs processing, import regulations, and local
        carrier efficiency. Delays beyond our control (customs inspections, regulatory holds, force majeure)
        may extend delivery times. We recommend allowing extra time for international orders during peak
        seasons or holidays.
      </p>

      <h4>Small Items (Under 45 kg / 100 lbs.)</h4>
      <p className="fs-5">
        Smaller HVAC parts, accessories, and components ship via international express carriers
        (DHL, FedEx International, UPS Worldwide, or regional postal services). Domestic shipments
        use FedEx, UPS, USPS, or equivalent. Deliveries are typically curbside or to your doorstep.
        Signature may be required for international shipments. All shipments are FOB (Free on Board)
        Origin/Shipping Point, meaning title and risk transfer to the customer upon delivery to the carrier.
      </p>

      <h4>Large Items & Freight Shipments (Over 45 kg / 100 lbs.)</h4>
      <p className="fs-5">
        Large HVAC units, outdoor condensers, and ventilation equipment ship via freight carriers.
        Domestic shipments use LTL (Less-Than-Truckload) carriers. International freight shipments
        use air freight or ocean freight depending on destination, urgency, and cost preferences.
        All freight shipments are FOB Origin—ownership and risk transfer to the customer upon delivery
        to the carrier. Insurance is available upon request before shipment and is strongly recommended
        for high-value items.
      </p>

      <p className="fs-5">
        <strong>Residential deliveries:</strong> Freight shipments typically require a signature,
        delivery appointment, and someone present to receive the goods. Liftgate service is included
        for items over 68 kg (150 lbs). Deliveries are curbside by default. For in-home delivery,
        room-of-choice delivery, or installation assistance, please contact us before ordering to
        arrange specialized services (additional fees apply).
      </p>
      <p className="fs-5">
        <strong>Commercial deliveries:</strong> Occur during normal business hours (8 AM - 5 PM local time).
        A loading dock or forklift is assumed available. Liftgate service is not included unless requested
        in order notes.
      </p>
      <p className="fs-5">
        <strong>International freight:</strong> May require commercial customs clearance and import broker
        services. Additional documentation (commercial invoice, certificate of origin, import permits) may
        be required by your country. Please consult your local customs broker or freight forwarder for assistance.
      </p>

      <h4>Delivery & Inspection</h4>
      <p className="fs-5">
        You will receive tracking information and carrier contact details via email once your order ships.
        International shipments will include customs documentation and tracking links. On delivery day:
      </p>
      <ul className="fs-5">
        <li>Ensure an adult (18+) is present to sign for and receive the shipment</li>
        <li>Inspect all sides of the package, including corners and bottom, for visible damage</li>
        <li>Note any damage, dents, or punctures on the delivery receipt/POD (Proof of Delivery)</li>
        <li>Take clear photos if damage is evident—this is critical for insurance claims</li>
        <li>If severely damaged, you have the right to refuse delivery (take photos before refusal)</li>
      </ul>
      <p className="fs-5">
        <strong>Important:</strong> All damage claims must be reported within 5 business days of delivery.
        International customers should report damage within 7 business days due to longer communication timelines.
        Failure to note damage on the delivery receipt may void your ability to file a claim. Keep all packaging
        materials until the product is inspected and confirmed undamaged.
      </p>

      <h4>Returns & Refusal Fees</h4>
      <p className="fs-5">
        Return shipping costs for authorized returns are the customer's responsibility, including
        international return shipping which can be substantial. Refused shipments or cancellations
        after an order has been loaded onto a truck or cleared customs will incur all shipping and
        freight charges plus a 25% restocking fee. Special orders, custom items, and certain HVAC
        equipment cannot be canceled or returned. See our Returns Policy for full details and
        jurisdiction-specific consumer rights.
      </p>

      <h4>Installation & Support</h4>
      <p className="fs-5">
        All HVAC equipment must be installed by a licensed and qualified HVAC professional in accordance
        with local building codes, electrical regulations, and safety standards in your country or region.
        Improper installation may void manufacturer warranties and create safety hazards. Visit our blog
        for installation guidance, best practices, and technical resources. Our multilingual support team
        is available to assist with technical questions, shipping inquiries, and product specifications.
        We love seeing completed installations—feel free to share photos with us!
      </p>

      <h4>Important Shipping Notes</h4>
      <p className="fs-5">
        <strong>Address verification:</strong> For fraud prevention, shipping addresses should match your
        payment method billing address or be pre-verified. International orders may require additional
        identity verification.
      </p>
      <p className="fs-5">
        <strong>Delivery types:</strong> Standard delivery is curbside. White-glove delivery (unpacking,
        placement, packaging removal) is available by prior arrangement for an additional fee.
      </p>
      <p className="fs-5">
        <strong>Cancellations:</strong> Once an order has shipped or cleared customs, it cannot be canceled.
        See our Cancellation Policy for pre-shipment cancellation procedures.
      </p>
      <p className="fs-5">
        <strong>Export compliance:</strong> Certain HVAC products may be subject to export controls or
        restrictions. We comply with international trade regulations and reserve the right to decline
        shipments to restricted destinations.
      </p>
      </div>
    </div>
  );
};

export default ShipMentPage;
