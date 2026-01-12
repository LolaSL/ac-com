/**
 * VRF System Calculation Utilities
 * Provides helper functions for VRF system capacity calculation,
 * indoor unit connections, and system validation
 */

/**
 * Calculate total capacity of all indoor units
 * @param {Array} indoorUnits - Array of indoor unit objects with capacity property
 * @returns {number} Total capacity in BTU
 */
export const calculateTotalIndoorCapacity = (indoorUnits) => {
    if (!indoorUnits || !Array.isArray(indoorUnits)) return 0;
    return indoorUnits.reduce((total, unit) => total + (unit.capacity || 12000), 0);
};

/**
 * Validate VRF system capacity
 * VRF systems typically allow 80-110% oversizing depending on design
 * @param {number} outdoorCapacity - Outdoor unit capacity in BTU
 * @param {number} totalIndoorCapacity - Total indoor units capacity in BTU
 * @param {number} oversizingRatio - Allowed oversizing ratio (default 0.9 = 90% rule)
 * @returns {Object} Validation result with isValid and message
 */
export const validateVRFCapacity = (
    outdoorCapacity,
    totalIndoorCapacity,
    oversizingRatio = 0.9
) => {
    const minOutdoor = totalIndoorCapacity * oversizingRatio;
    const maxOutdoor = totalIndoorCapacity * 1.1;

    if (outdoorCapacity < minOutdoor) {
        return {
            isValid: false,
            message: `Outdoor unit (${outdoorCapacity} BTU) is undersized. Minimum recommended: ${Math.round(minOutdoor)} BTU`,
        };
    }

    if (outdoorCapacity > maxOutdoor) {
        return {
            isValid: false,
            message: `Outdoor unit (${outdoorCapacity} BTU) exceeds maximum oversizing (${Math.round(maxOutdoor)} BTU)`,
        };
    }

    return {
        isValid: true,
        message: `System capacity is properly sized`,
        utilizationRatio: (totalIndoorCapacity / outdoorCapacity * 100).toFixed(1) + "%",
    };
};

/**
 * Calculate number of refrigerant lines needed
 * Typically: 2 lines per system + 1 ground line (if needed)
 * @param {number} numberOfIndoorUnits - Number of indoor units
 * @returns {Object} Line calculation details
 */
export const calculateRefrigerantLines = (numberOfIndoorUnits = 0) => {
    const mainLines = 2; // Liquid and vapor lines
    const additionalLines = Math.ceil(numberOfIndoorUnits / 8); // Additional lines for complex systems
    const totalLines = mainLines + additionalLines;

    return {
        mainSupplyVaporLine: 1,
        mainReturnLiquidLine: 1,
        additionalBranchLines: additionalLines,
        totalLines: totalLines,
        estimatedPipeSize: numberOfIndoorUnits <= 4 ? "5/8\" - 3/4\"" : "3/4\" - 1\"",
    };
};

/**
 * Estimate BTU per room based on area and condition factors
 * @param {number} roomArea - Room area in square feet
 * @param {Object} factors - Environmental factors affecting BTU needs
 * @returns {number} Estimated BTU requirement
 */
export const estimateRoomBTU = (
    roomArea,
    factors = {
        climate: "moderate", // 'hot', 'moderate', 'cold'
        insulation: "average", // 'poor', 'average', 'good'
        sunExposure: "moderate", // 'low', 'moderate', 'high'
    }
) => {
    // Base: 20 BTU per square foot for moderate climate
    let baseRatio = 20;

    // Climate adjustment
    if (factors.climate === "hot") baseRatio = 25;
    if (factors.climate === "cold") baseRatio = 15;

    // Insulation adjustment
    if (factors.insulation === "poor") baseRatio *= 1.2;
    if (factors.insulation === "good") baseRatio *= 0.8;

    // Sun exposure adjustment
    if (factors.sunExposure === "high") baseRatio *= 1.15;
    if (factors.sunExposure === "low") baseRatio *= 0.85;

    const baseBTU = roomArea * baseRatio;

    // Round to nearest standard unit size (9000, 12000, 15000, 18000, 24000, 30000, 36000, 42000, 48000)
    const standardSizes = [9000, 12000, 15000, 18000, 24000, 30000, 36000, 42000, 48000];
    return standardSizes.reduce((prev, curr) =>
        Math.abs(curr - baseBTU) < Math.abs(prev - baseBTU) ? curr : prev
    );
};

/**
 * Select appropriate outdoor condenser size based on total indoor capacity
 * @param {number} totalIndoorCapacity - Total capacity of all indoor units
 * @returns {number} Recommended outdoor unit capacity
 */
export const selectOutdoorCondenserSize = (totalIndoorCapacity) => {
    const standardSizes = [18000, 24000, 30000, 36000, 42000, 48000, 54000, 60000];

    // Find smallest standard size that accommodates indoor units with at least 90% utilization
    return standardSizes.find((size) => size >= totalIndoorCapacity * 0.9) || 60000;
};

/**
 * Generate system design summary
 * @param {Object} outdoorUnit - Outdoor unit data
 * @param {Array} indoorUnits - Array of indoor units
 * @returns {Object} System summary
 */
export const generateSystemSummary = (outdoorUnit, indoorUnits = []) => {
    const totalIndoor = calculateTotalIndoorCapacity(indoorUnits);
    const validation = validateVRFCapacity(outdoorUnit.capacity || 0, totalIndoor);
    const refrigLines = calculateRefrigerantLines(indoorUnits.length);

    return {
        outdoorCapacity: outdoorUnit.capacity || 0,
        numberOfIndoorUnits: indoorUnits.length,
        totalIndoorCapacity: totalIndoor,
        capacityValidation: validation,
        refrigerantLines: refrigLines,
        systemType: outdoorUnit.type || "VRF",
        estimatedEfficiency: validation.utilizationRatio,
    };
};

/**
 * Calculate ductwork size for VRF-Ducted system
 * @param {number} indoorUnitCapacity - Indoor unit capacity in BTU
 * @returns {Object} Recommended duct dimensions
 */
export const calculateDuctSize = (indoorUnitCapacity) => {
    // Approximate CFM = BTU / 1000 (at 1000 CFM per 12,000 BTU)
    const cfm = (indoorUnitCapacity / 12000) * 1000;

    // Calculate duct area needed (typical velocity 400 FPM)
    const ductArea = cfm / 400;
    const diameter = Math.sqrt((ductArea * 4) / Math.PI);

    return {
        estimatedCFM: Math.round(cfm),
        estimatedDuctDiameter: (diameter * 12).toFixed(1) + '"',
        recommendedVelocity: "400 FPM",
        ductArea: ductArea.toFixed(2) + ' sq in',
    };
};

const VRFCalculations = {
    calculateTotalIndoorCapacity,
    validateVRFCapacity,
    calculateRefrigerantLines,
    estimateRoomBTU,
    selectOutdoorCondenserSize,
    generateSystemSummary,
    calculateDuctSize,
};

export default VRFCalculations;
