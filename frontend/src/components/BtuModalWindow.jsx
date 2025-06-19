import { useState } from "react";

const BtuModalWindow = () => {
  const [showInfoModal, setShowInfoModal] = useState(false);
  return (
    <div className="btu-modal text-secondary mt-4">
      {showInfoModal && (
        <div
          id="infoModal"
          className="fixed    flex items-center justify-center p-4 "
          onClick={() => setShowInfoModal(false)}
        >
          <div
            className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              How BTU Calculation Works
            </h2>
            <p className="text-gray-700 mb-4">
              BTU (British Thermal Unit) is a measure of heat. This calculator
              provides an estimation based on common factors:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
              <li>
                <strong className="text">Base Calculation:</strong> 600 BTU/m2
                used as a base rule.
              </li>
              <li>
                <strong className="text">
                  Outdoor Unit (Condenser) Location:
                </strong>
                Desired location of outdoor unit.
              </li>
              <li >
                <strong className="text">Number of people:</strong>Each person adds a fixed BTU amount
                (e.g., 600 BTU).
              </li>
              <li>
                <strong className="text">Type of wall:</strong>
                Real wall type.
              </li>
              <li>
                <strong className="text">Insulation:</strong> Poor insulation
                increases BTU needs.
              </li>
              <li>
                <strong className="text">Sun Exposure:</strong> Each window adds
                ~1000 BTU.
              </li>
              <li>
                <strong className="text">Climate:</strong> BTU needs vary by
                temperature zone.
              </li>
            </ul>
            <p className="text-gray-700 mb-4">
              <strong className="text-red-600">Important:</strong> This is an
              estimate. Consult an HVAC expert for precise needs.
            </p>
            <button
              onClick={() => setShowInfoModal(false)}
              className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 transition duration-200"
            >
              Close
            </button>
          </div>
        </div>
      )}
      <button
        onClick={() => setShowInfoModal(true)}
        className="mt-4 w-full bg-gray-200 text-gray-800 py-2 rounded-md font-semibold hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75 transition duration-200 shadow-sm"
      >
        HOW BTU CALCULATION WORKS?
      </button>
    </div>
  );
};

export default BtuModalWindow;
