import React from "react";
import Image from "react-bootstrap/Image";
import { Link } from "react-router-dom";
import "./AdvancedAC.css";

const AdvancedAC = () => {
  return (
    <div className="site-container mt-3 pt-3">
      <article>
        <h1 className="fs-1 advanced-title">Advanced Air Conditioning 2026</h1>
        <p className="mb-3 p-3 ac-conditioning fs-4">
          As we step into 2026, the HVAC industry is buzzing with advancements
          that promise to make homes more comfortable, energy-efficient, and
          environmentally friendly. From cutting-edge technology to
          eco-conscious solutions, the future of HVAC is here. If you’ve been
          considering upgrading your system, now is the perfect time to explore
          what’s new.
        </p>
        <h3 className="mb-2 p-4 fs-3 text-bold">
          Energy-Efficient Systems: Saving More, Consuming Less
        </h3>
        <p className="mb-3 p-3 ac-conditioning fs-4">
          Energy efficiency is a leading trend in 2026 HVAC. Modern systems
          utilize innovations like variable-speed compressors and advanced
          sensors to maximize comfort while minimizing energy consumption and
          environmental impact. In 2026, energy efficiency is a key focus in
          HVAC. New systems employ technologies such as variable-speed
          compressors and improved heat exchangers to deliver optimal comfort
          with lower energy use and a smaller carbon footprint.
        </p>
        <div className="mb-4 text-center pb-4">
          <Image
            src="/images/ac5.jpg"
            alt="Air Conditioning"
            className="responsive-image-advanced rounded"
            width="600"
            height="400"
          />
        </div>
      </article>
      <article>
        <h3 className="mb-2 p-4 fs-3 text-bold">
          Heat Pumps: The All-Weather Solution
        </h3>
        <p className="mb-3 p-3 ac-conditioning fs-4">
          Heat pumps are becoming a go-to solution for homeowners seeking
          year-round comfort and energy efficiency. With advancements in
          cold-climate heat pump technology, these systems can now effectively
          operate in extreme temperatures, making them a versatile choice for
          any region.
        </p>
        <div className="mb-4 text-center pb-4">
          <Image
            src="/images/ac6.jpg"
            alt="Air Conditioning"
            className="responsive-image-advanced rounded"
            width="600"
            height="400"
          />
        </div>
      </article>
      <article>
        <h3 className="mb-2 p-4 fs-3 text-bold">
          Indoor Air Quality Innovations
        </h3>
        <p className="mb-3 p-3 ac-conditioning fs-4">
          Improving indoor air quality (IAQ) is a top priority for 2026. HVAC
          systems are now integrating air purifiers, UV-C light technology, and
          high-efficiency particulate air (HEPA) filters to remove allergens,
          bacteria, and viruses from your home’s air. These systems ensure a
          healthier living environment for you and your family.
        </p>
        <div className="mb-4 text-center">
          <Image
            src="/images/ac7.jpg"
            alt="Air Conditioning team"
            className="responsive-image-advanced rounded"
            width="600"
            height="400"
          />
        </div>
      </article>
      <article>
        <h3 className="mb-2 p-4 fs-3 text-bold">Why Upgrade in 2026?</h3>
        <p className="mb-3 p-3 ac-conditioning fs-4">
          With these exciting advancements, 2026 is the ideal time to upgrade
          your HVAC system. Whether you’re looking to save on energy costs,
          reduce your environmental impact, or enjoy the convenience of smart
          technology, there’s a solution for every home.
        </p>
        <div className="mb-4 text-center">
          <Image
            src="/images/ac8.jpg"
            alt="Air Conditioning team"
            className="responsive-image-advanced rounded"
            width="600"
            height="400"
          />
        </div>
      </article>
      <div className=" mt-4 mb-4">
        <Link to="/" className="go-to-btn btn-text">
          Back to Home
        </Link>
      </div>
    </div>
  );
};

export default AdvancedAC;
