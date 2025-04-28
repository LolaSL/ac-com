import React from "react";

import Image from "react-bootstrap/Image";
import { Link } from "react-router-dom";

const AdvancedAC = () => {
  return (
    <div className="site-container mt-3 pt-3">
      <article>
        <h2>Advanced Air Conditioning 2025</h2>
        <h3 className="mb-3 p-3">
          As we step into 2025, the HVAC industry is buzzing with advancements
          that promise to make homes more comfortable, energy-efficient, and
          environmentally friendly. From cutting-edge technology to
          eco-conscious solutions, the future of HVAC is here. If you’ve been
          considering upgrading your system, now is the perfect time to explore
          what’s new.
        </h3>
        <h3 className="mb-3 p-3">
          Energy-Efficient Systems: Saving More, Consuming Less
        </h3>
        <h4 className="mb-3 p-3 ac-conditioning">
          Energy efficiency is a leading trend in 2025 HVAC. Modern systems
          utilize innovations like variable-speed compressors and advanced
          sensors to maximize comfort while minimizing energy consumption and
          environmental impact. In 2025, energy efficiency is a key focus in
          HVAC. New systems employ technologies such as variable-speed
          compressors and improved heat exchangers to deliver optimal comfort
          with lower energy use and a smaller carbon footprint.
        </h4>
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
        <h3 className="mb-2 p-4">Heat Pumps: The All-Weather Solution</h3>
        <h4 className="mb-3 p-3 ac-conditioning">
          Heat pumps are becoming a go-to solution for homeowners seeking
          year-round comfort and energy efficiency. With advancements in
          cold-climate heat pump technology, these systems can now effectively
          operate in extreme temperatures, making them a versatile choice for
          any region.
        </h4>
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
        <h3 className="mb-2 p-4">Indoor Air Quality Innovations</h3>
        <h4 className="mb-3 p-3 ac-conditioning">
          Improving indoor air quality (IAQ) is a top priority for 2025. HVAC
          systems are now integrating air purifiers, UV-C light technology, and
          high-efficiency particulate air (HEPA) filters to remove allergens,
          bacteria, and viruses from your home’s air. These systems ensure a
          healthier living environment for you and your family.
        </h4>
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
        <h3 className="mb-2 p-4">Why Upgrade in 2025?</h3>
        <h4 className="mb-3 p-3 ac-conditioning">
          With these exciting advancements, 2025 is the ideal time to upgrade
          your HVAC system. Whether you’re looking to save on energy costs,
          reduce your environmental impact, or enjoy the convenience of smart
          technology, there’s a solution for every home.
        </h4>
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
        <Link to="/" className="btn btn-secondary">
          Back to Home
        </Link>
      </div>
    </div>
  );
};

export default AdvancedAC;
