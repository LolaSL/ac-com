import React, { useState, useContext, useEffect } from "react";
import {
  Row,
  Col,
  Card,
  Form,
  Button,
  Alert,
  Tab,
  Tabs,
  Spinner,
  Modal,
} from "react-bootstrap";
import { FaChartLine } from "react-icons/fa";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import jsPDF from "jspdf";
import axios from "axios";
import { Store } from "../Store";
// import DemoRequestForm from "../components/DemoRequestForm";
import { toast } from "react-toastify";
import { useLocation } from "react-router-dom";
import "./ROICalculatorExperimental.css";
import { FaFileUpload, FaTrash, FaFilePdf } from "react-icons/fa";

export default function ROICalculatorExperimental() {
  const { state, dispatch } = useContext(Store);
  const { userInfo } = state;
  const location = useLocation();
  const btuData = location.state?.btuData;
  // Persisted copy of btuData — survives the window.history.replaceState() call
  // that clears location.state to prevent re-population on refresh.
  const [capturedBtuData, setCapturedBtuData] = useState(null);

  // UI State
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveCalculationName, setSaveCalculationName] = useState("");
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [saveCalculationDescription, setSaveCalculationDescription] =
    useState("");
  const [savedCalculations, setSavedCalculations] = useState([]);
  const [isLoadingSavedCalcs, setIsLoadingSavedCalcs] = useState(false);
  const [activeTab, setActiveTab] = useState("calculator");

  // Calculator Parameters
  const [serviceType, setServiceType] = useState("AC Installation");
  const [equipmentAge, setEquipmentAge] = useState("");
  const [propertyType, setPropertyType] = useState("residential-single");
  const [projectSize, setProjectSize] = useState(5000);
  const [installationTime, setInstallationTime] = useState(7);
  const [teamSize, setTeamSize] = useState(3);
  const [numberOfUnits, setNumberOfUnits] = useState(1);
  const [maintenanceFrequency, setMaintenanceFrequency] = useState(1);
  const [projectsPerMonth, setProjectsPerMonth] = useState(10);
  const [monthsToAnalyze, setMonthsToAnalyze] = useState(12);
  const [tags, setTags] = useState("");

  // Property type configurations
  const propertyConfigs = {
    "residential-single": {
      label: "Residential (Single Unit)",
      description: "Apartment, villa, or individual property",
      costMultiplier: { traditional: 0.15, acCommerce: 0.08 },
      laborCost: { traditional: 500, acCommerce: 300 },
      timeReductionFactor: 0.6,
      minProjectSize: 1000,
      maxProjectSize: 50000,
      minInstallationTime: 1,
      maxInstallationTime: 30,
    },
    "residential-multi": {
      label: "Residential (Multi-Unit)",
      description: "Multi-flat development with bulk pricing",
      costMultiplier: { traditional: 0.12, acCommerce: 0.05 },
      laborCost: { traditional: 400, acCommerce: 200 },
      timeReductionFactor: 0.65,
      minProjectSize: 10000,
      maxProjectSize: 500000,
      minInstallationTime: 14,
      maxInstallationTime: 180,
    },
    "industrial-commercial": {
      label: "Industrial/Commercial Property",
      description: "Large-scale buildings with complex systems",
      costMultiplier: { traditional: 0.18, acCommerce: 0.09 },
      laborCost: { traditional: 800, acCommerce: 400 },
      timeReductionFactor: 0.7,
      minProjectSize: 50000,
      maxProjectSize: 1000000,
      minInstallationTime: 30,
      maxInstallationTime: 365,
    },
  };

  const config = propertyConfigs[propertyType];

  // Service type cost multipliers
  const serviceTypeMultipliers = {
    "AC Installation": { cost: 1.0, time: 1.0, frequency: 1.0 },
    "AC Repair": { cost: 0.6, time: 0.7, frequency: 1.5 },
    "AC Maintenance": { cost: 0.3, time: 0.4, frequency: 3.0 },
    "Gas Ducted Heating": { cost: 1.3, time: 1.2, frequency: 0.8 },
    "Indoor Air Quality": { cost: 1.2, time: 0.9, frequency: 1.2 },
    "Smart Control Automation": { cost: 0.8, time: 0.6, frequency: 1.0 },
    "Electrical Service": { cost: 0.7, time: 0.8, frequency: 1.3 },
  };

  // Check authentication
  useEffect(() => {
    if (!userInfo) {
      toast.warning("Please log in to save ROI calculations");
    } else {
      fetchSavedCalculations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userInfo?.token]);

  // Auto-populate from BTU Calculator data
  useEffect(() => {
    if (btuData && location.state?.fromBTU) {
      // Set property type based on BTU data
      if (btuData.propertyType) {
        setPropertyType(btuData.propertyType);
      }

      // Set project size from estimated cost
      if (btuData.estimatedProjectCost) {
        setProjectSize(Math.round(btuData.estimatedProjectCost));
      }

      // Set installation time from estimate
      if (btuData.estimatedInstallationDays) {
        setInstallationTime(btuData.estimatedInstallationDays);
      }

      // Set number of units for multi-unit properties
      // Use detected flat count (not total rooms) so the multiplier reflects
      // how many independent units/flats are in the development.
      if (btuData.propertyType === "residential-multi") {
        const flatCount =
          btuData.inputParams?.detectedFlats?.length ||
          btuData.numberOfRooms ||
          1;
        setNumberOfUnits(flatCount);
      }

      // Set description with BTU details
      setSaveCalculationDescription(
        `BTU Project: ${btuData.numberOfRooms} room(s), ${
          btuData.totalSquareFootage
        } m², ${btuData.totalBTU.toLocaleString("en-US")} BTU total. Estimated project cost: $${
          btuData.estimatedProjectCost?.toLocaleString() || 0
        }. Installation: ${btuData.estimatedInstallationDays} day(s).`
      );

      // Show success message
      toast.success("BTU Calculator data loaded successfully!");

      // Persist btuData BEFORE clearing location.state so save handlers can use it
      setCapturedBtuData(btuData);

      // Clear the state to prevent re-population on refresh
      window.history.replaceState({}, document.title);
    }
  }, [btuData, location.state]);

  // Fetch saved calculations from backend
  const fetchSavedCalculations = async () => {
    if (!userInfo) return;

    setIsLoadingSavedCalcs(true);
    try {
      const { data } = await axios.get(`/api/roi-calculations`, {
        headers: { authorization: `Bearer ${userInfo.token}` },
      });

      console.log('Fetched calculations:', data.calculations);
      // Debug: Check BTU data in first calculation
      if (data.calculations && data.calculations.length > 0) {
        console.log('First calculation BTU data:', data.calculations[0].btuProjectData);
      }

      setSavedCalculations(data.calculations || []);
      dispatch({
        type: "ROI_SET_SAVED_CALCULATIONS",
        payload: data.calculations || [],
      });
    } catch (error) {
      console.error("Error fetching saved calculations:", error);
      toast.error("Failed to load saved calculations");
    } finally {
      setIsLoadingSavedCalcs(false);
    }
  };

  // Handle opening save modal with auto-generated description from BTU data
  const handleOpenSaveModal = () => {
    // Always auto-generate description with current calculation results
    let description =
      `${serviceType} — ${config.label}. ` +
      `Project value: $${Number(projectSize).toLocaleString()}. ` +
      `Installation: ${installationTime} day(s), ${teamSize}-person team. ` +
      `${projectsPerMonth} project(s)/month over ${monthsToAnalyze} months. ` +
      `Projected savings: $${Number(savingsPerProject).toLocaleString(
        "en-US",
        { maximumFractionDigits: 0 }
      )}/project (${savingsPercentage}%). ` +
      `ROI: ${roi}% | Payback: ${paybackMonths} month(s).`;
    
    // Append BTU data if available
    if (capturedBtuData) {
      description += ` | BTU Data: ${capturedBtuData.numberOfRooms} room(s), ${Number(capturedBtuData.totalSquareFootage).toFixed(2)} m², ${capturedBtuData.totalBTU.toLocaleString()} BTU total.`;
    }
    
    setSaveCalculationDescription(description);
    setShowSaveModal(true);
  };

  // Save calculation to backend
  const handleSaveCalculation = async () => {
    if (!userInfo) {
      toast.error("Please log in to save calculations");
      return;
    }

    if (!saveCalculationName.trim()) {
      toast.error("Please enter a name for this calculation");
      return;
    }

    try {
      dispatch({ type: "ROI_SET_LOADING", payload: true });

      const roiData = {
        name: saveCalculationName,
        description: saveCalculationDescription,
        serviceType,
        equipmentAge,
        projectSize,
        installationTime,
        teamSize,
        projectsPerMonth,
        monthsToAnalyze,
        propertyType,
        numberOfUnits:
          propertyType === "residential-multi" ? numberOfUnits : undefined,
        maintenanceFrequency:
          propertyType === "industrial-commercial"
            ? maintenanceFrequency
            : undefined,
        savingsPerProject: parseFloat(savingsPerProject),
        savingsPercentage: parseFloat(savingsPercentage),
        annualSavings: parseFloat(annualSavings),
        roi: parseFloat(roi),
        paybackMonths,
        // Include BTU data if this calculation was generated from BTU Calculator
        btuProjectData: capturedBtuData
          ? {
              totalBTU: capturedBtuData.totalBTU,
              totalSquareFootage: capturedBtuData.totalSquareFootage,
              numberOfRooms: capturedBtuData.numberOfRooms,
              estimatedProjectCost: capturedBtuData.estimatedProjectCost,
              estimatedInstallationDays: capturedBtuData.estimatedInstallationDays,
              recommendedUnits: capturedBtuData.recommendedUnits?.map((unit) => ({
                name: unit.type || unit.name || unit.model,
                btu: unit.btu,
                price: unit.estimatedCost || unit.price,
                quantity: unit.quantity || 1,
              })),
              rooms: capturedBtuData.rooms?.map((room) => ({
                name: room.name,
                size: room.size,
                btu: room.btu,
                product: {
                  name: room.product?.name || room.product?.model,
                  btu: room.product?.btu,
                  price: room.product?.price,
                  slug: room.product?.slug,
                }
              })),
              // Preserve full BTU input parameters (measurement, options, condensers)
              inputParams: capturedBtuData.inputParams || undefined,
            }
          : undefined,
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      };

      console.log('Saving ROI calculation with data:', roiData);
      console.log('capturedBtuData:', capturedBtuData);
      console.log('btuProjectData being saved:', roiData.btuProjectData);

      const { data } = await axios.post(`/api/roi-calculations`, roiData, {
        headers: { authorization: `Bearer ${userInfo.token}` },
      });

      console.log('Saved calculation response:', data);

      dispatch({ type: "ROI_ADD_CALCULATION", payload: data });
      setSavedCalculations([data, ...savedCalculations]);
      setShowSaveModal(false);
      setSaveCalculationName("");
      setSaveCalculationDescription("");
      setTags("");
      toast.success("Calculation saved successfully!");
    } catch (error) {
      console.error("Error saving calculation:", error);
      toast.error(
        error.response?.data?.message || "Failed to save calculation"
      );
      dispatch({ type: "ROI_SET_ERROR", payload: error.message });
    } finally {
      dispatch({ type: "ROI_SET_LOADING", payload: false });
    }
  };

  // Load a saved calculation
  const handleLoadCalculation = async (calculation) => {
    if (!userInfo) {
      toast.error("Please log in to load calculations");
      return;
    }

    const calculationId = calculation?._id;
    if (!calculationId) {
      toast.error("Unable to load calculation: missing id");
      return;
    }

    try {
      dispatch({ type: "ROI_SET_LOADING", payload: true });

      const { data: freshCalculation } = await axios.get(
        `/api/roi-calculations/${calculationId}`,
        { headers: { authorization: `Bearer ${userInfo.token}` } }
      );

      setServiceType(freshCalculation.serviceType || "AC Installation");
      setEquipmentAge(freshCalculation.equipmentAge || "");
      setPropertyType(freshCalculation.propertyType || "residential-single");
      setProjectSize(Number(freshCalculation.projectSize ?? projectSize));
      setInstallationTime(
        Number(freshCalculation.installationTime ?? installationTime)
      );
      setTeamSize(Number(freshCalculation.teamSize ?? teamSize));
      setProjectsPerMonth(
        Number(freshCalculation.projectsPerMonth ?? projectsPerMonth)
      );
      setMonthsToAnalyze(
        Number(freshCalculation.monthsToAnalyze ?? monthsToAnalyze)
      );

      // Load property-specific fields
      if (
        freshCalculation.propertyType === "residential-multi" &&
        freshCalculation.numberOfUnits
      ) {
        setNumberOfUnits(Number(freshCalculation.numberOfUnits));
      }
      if (
        freshCalculation.propertyType === "industrial-commercial" &&
        freshCalculation.maintenanceFrequency
      ) {
        setMaintenanceFrequency(Number(freshCalculation.maintenanceFrequency));
      }

      setTags(
        Array.isArray(freshCalculation.tags)
          ? freshCalculation.tags.join(", ")
          : freshCalculation.tags || ""
      );
      setSaveCalculationName(freshCalculation.name || "");
      setSaveCalculationDescription(freshCalculation.description || "");

      setActiveTab("calculator");
      window.scrollTo({ top: 0, behavior: "smooth" });
      dispatch({
        type: "ROI_SET_CURRENT_CALCULATION",
        payload: freshCalculation,
      });
      toast.success(`Loaded: ${freshCalculation.name}`);
    } catch (error) {
      console.error("Error loading calculation:", error);
      toast.error(
        error.response?.data?.message || "Failed to load calculation"
      );
    } finally {
      dispatch({ type: "ROI_SET_LOADING", payload: false });
    }
  };

  // Generate PDF report for a saved calculation
  const handleGenerateSavedReport = (calculation) => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 15;
    const lineHeight = 7;
    const margin = 15;
    const maxWidth = pageWidth - margin * 2;

    // Add gradient background header
    doc.setFillColor(0, 102, 255); // Blue background
    doc.rect(0, 0, pageWidth, 50, "F");

    // White text on blue background
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont(undefined, "bold");
    doc.text("AC-COMMERCE", margin, 20);

    doc.setFontSize(14);
    doc.setFont(undefined, "normal");
    doc.text("ROI Calculator Report", margin, 30);

    // Date line
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, 40);
    doc.text(`Saved Calculation: ${calculation.name}`, margin, 47);

    // Reset text color to black
    doc.setTextColor(0, 0, 0);

    // Add decorative line
    doc.setDrawColor(0, 102, 255);
    doc.setLineWidth(1);
    doc.line(margin, 52, pageWidth - margin, 52);

    yPosition = 60;

    // Helper function to add section headers with background
    const addSectionHeader = (title) => {
      if (yPosition > pageHeight - 30) {
        doc.addPage();
        yPosition = 20;
      }
      doc.setFillColor(240, 247, 255); // Light blue background
      doc.rect(margin - 2, yPosition - 5, maxWidth + 4, 12, "F");
      doc.setDrawColor(0, 102, 255);
      doc.rect(margin - 2, yPosition - 5, maxWidth + 4, 12);

      doc.setFont(undefined, "bold");
      doc.setFontSize(12);
      doc.setTextColor(0, 102, 255);
      doc.text(title, margin + 2, yPosition + 2);
      doc.setTextColor(0, 0, 0);
      yPosition += 18;
    };

    // Helper function to add table
    const addTable = (headers, rows) => {
      if (yPosition > pageHeight - 40) {
        doc.addPage();
        yPosition = 20;
      }

      const colWidth = maxWidth / headers.length;
      doc.setFont(undefined, "bold");
      doc.setFontSize(9);
      doc.setFillColor(0, 102, 255);
      doc.setTextColor(255, 255, 255);

      // Header row
      headers.forEach((header, index) => {
        doc.text(header, margin + index * colWidth + 2, yPosition);
      });

      yPosition += lineHeight + 1;

      // Data rows
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, "normal");
      rows.forEach((row, rowIndex) => {
        if (yPosition > pageHeight - 15) {
          doc.addPage();
          yPosition = 20;
          // Repeat header
          doc.setFont(undefined, "bold");
          doc.setFillColor(0, 102, 255);
          doc.setTextColor(255, 255, 255);
          headers.forEach((header, index) => {
            doc.text(header, margin + index * colWidth + 2, yPosition);
          });
          yPosition += lineHeight + 1;
          doc.setTextColor(0, 0, 0);
          doc.setFont(undefined, "normal");
        }

        const bgColor = rowIndex % 2 === 0 ? [245, 245, 245] : [255, 255, 255];
        doc.setFillColor(...bgColor);
        doc.rect(margin, yPosition - 5, maxWidth, lineHeight + 1, "F");

        row.forEach((cell, index) => {
          doc.text(cell.toString(), margin + index * colWidth + 2, yPosition);
        });

        yPosition += lineHeight + 2;
      });

      yPosition += 3;
    };

    // ===== PAGE 1: EXECUTIVE SUMMARY & INPUT PARAMETERS =====

    // FINANCIAL SUMMARY - Highlighted boxes
    addSectionHeader("EXECUTIVE SUMMARY");

    // Create colored boxes for key metrics
    const metrics = [
      {
        label: "Per Project Savings",
        value: `$${calculation.savingsPerProject.toLocaleString("en-US", {
          maximumFractionDigits: 0,
        })}`,
        subtext: `(${calculation.savingsPercentage}% reduction)`,
        color: [76, 205, 196], // Teal
      },
      {
        label: "Total Period Savings",
        value: `$${calculation.annualSavings.toLocaleString("en-US", {
          maximumFractionDigits: 0,
        })}`,
        subtext: `${calculation.monthsToAnalyze} months`,
        color: [255, 107, 107], // Red
      },
      {
        label: "Annual ROI",
        value: `${calculation.roi}%`,
        subtext: "Return on Investment",
        color: [69, 183, 209], // Cyan
      },
      {
        label: "Payback Period",
        value: `${calculation.paybackMonths} months`,
        subtext: "To break even",
        color: [255, 160, 122], // Light Salmon
      },
    ];

    // Draw metric boxes in a 2x2 grid
    let metricsPerRow = 2;
    let boxWidth = (maxWidth - 4) / metricsPerRow;
    let boxHeight = 28;
    let metricIndex = 0;

    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < metricsPerRow; col++) {
        if (metricIndex >= metrics.length) break;

        const metric = metrics[metricIndex];
        const xPos = margin + col * (boxWidth + 2);
        const boxY = yPosition;

        // Draw box background
        doc.setFillColor(...metric.color);
        doc.rect(xPos, boxY, boxWidth, boxHeight, "F");

        // Add white text
        doc.setTextColor(255, 255, 255);
        doc.setFont(undefined, "normal");
        doc.setFontSize(8);
        doc.text(metric.label, xPos + 3, boxY + 5);

        doc.setFont(undefined, "bold");
        doc.setFontSize(13);
        doc.text(metric.value, xPos + 3, boxY + 14);

        doc.setFont(undefined, "normal");
        doc.setFontSize(7);
        doc.text(metric.subtext, xPos + 3, boxY + 22);

        metricIndex++;
      }
      yPosition += boxHeight + 3;
    }

    doc.setTextColor(0, 0, 0);
    yPosition += 8;

    // INPUT PARAMETERS TABLE
    addSectionHeader("INPUT PARAMETERS SUMMARY");

    const paramRows = [
      ["Service Type", calculation.serviceType],
      ["Equipment Age", calculation.equipmentAge || "N/A"],
      ["Project Value", `$${calculation.projectSize.toLocaleString()}`],
      ["Installation Time", `${calculation.installationTime} days`],
      ["Team Size", `${calculation.teamSize} people`],
      ["Projects/Month", calculation.projectsPerMonth.toString()],
      ["Analysis Period", `${calculation.monthsToAnalyze} months`],
    ];

    addTable(["Parameter", "Value"], paramRows);

    yPosition += 5;

    // ===== PAGE 2: COST BREAKDOWN ANALYSIS =====

    // DETAILED COST BREAKDOWN TABLE
    addSectionHeader("COST BREAKDOWN - DETAILED COMPARISON");

    const traditionalCostPerProject =
      calculation.projectSize * 0.15 +
      calculation.installationTime * 500 * calculation.teamSize;
    const acCommerceCostPerProject =
      calculation.projectSize * 0.08 +
      calculation.installationTime * 300 * calculation.teamSize;

    const costBreakdownRows = [
      [
        "Equipment Cost",
        `$${(calculation.projectSize * 0.15).toLocaleString("en-US", {
          maximumFractionDigits: 0,
        })}`,
        `$${(calculation.projectSize * 0.08).toLocaleString("en-US", {
          maximumFractionDigits: 0,
        })}`,
        `$${(
          calculation.projectSize * 0.15 -
          calculation.projectSize * 0.08
        ).toLocaleString("en-US", {
          maximumFractionDigits: 0,
        })}`,
      ],
      [
        "Labor Cost",
        `$${(
          calculation.installationTime *
          500 *
          calculation.teamSize
        ).toLocaleString("en-US", {
          maximumFractionDigits: 0,
        })}`,
        `$${(
          calculation.installationTime *
          300 *
          calculation.teamSize
        ).toLocaleString("en-US", {
          maximumFractionDigits: 0,
        })}`,
        `$${(
          calculation.installationTime * 500 * calculation.teamSize -
          calculation.installationTime * 300 * calculation.teamSize
        ).toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
      ],
      [
        "TOTAL PER PROJECT",
        `$${traditionalCostPerProject.toLocaleString("en-US", {
          maximumFractionDigits: 0,
        })}`,
        `$${acCommerceCostPerProject.toLocaleString("en-US", {
          maximumFractionDigits: 0,
        })}`,
        `$${calculation.savingsPerProject.toLocaleString("en-US", {
          maximumFractionDigits: 0,
        })}`,
      ],
    ];

    addTable(
      ["Cost Item", "Traditional", "AC-Commerce Method", "Savings"],
      costBreakdownRows
    );

    yPosition += 5;

    // SERVICE-SPECIFIC COST ANALYSIS
    addSectionHeader("SERVICE-SPECIFIC COST ANALYSIS");

    const serviceMultipliers = {
      "AC Installation": 1.0,
      "AC Repair": 0.6,
      "AC Maintenance": 0.3,
      "Gas Ducted Heating": 1.1,
      "Indoor Air Quality": 0.8,
      "Smart Control Automation": 0.5,
      "Electrical Service": 0.7,
    };

    const serviceMultiplier =
      serviceMultipliers[calculation.serviceType] || 1.0;
    const serviceAdjustedTraditional =
      traditionalCostPerProject * serviceMultiplier;
    const serviceAdjustedAcCommerce =
      acCommerceCostPerProject * serviceMultiplier;
    const serviceAdjustedSavings =
      serviceAdjustedTraditional - serviceAdjustedAcCommerce;

    const serviceRows = [
      ["Service Type", calculation.serviceType],
      ["Cost Multiplier", `${(serviceMultiplier * 100).toFixed(0)}%`],
      [
        "Traditional Method",
        `$${serviceAdjustedTraditional.toLocaleString("en-US", {
          maximumFractionDigits: 0,
        })}`,
      ],
      [
        "AC-Commerce Method",
        `$${serviceAdjustedAcCommerce.toLocaleString("en-US", {
          maximumFractionDigits: 0,
        })}`,
      ],
      [
        "Savings",
        `$${serviceAdjustedSavings.toLocaleString("en-US", {
          maximumFractionDigits: 0,
        })}`,
      ],
    ];

    addTable(["Metric", "Amount"], serviceRows);

    yPosition += 5;

    // ===== PAGE 3: PROJECTIONS & TIMELINE =====

    // MONTHLY SAVINGS PROJECTION TABLE
    addSectionHeader("12-MONTH SAVINGS PROJECTION");

    const monthlyProjectionRows = [];
    let cumulativeSavings = 0;

    for (
      let month = 1;
      month <= Math.min(12, calculation.monthsToAnalyze);
      month++
    ) {
      const monthlySavings =
        calculation.savingsPerProject * calculation.projectsPerMonth;
      cumulativeSavings += monthlySavings;
      monthlyProjectionRows.push([
        `Month ${month}`,
        calculation.projectsPerMonth.toString(),
        `$${monthlySavings.toLocaleString("en-US", {
          maximumFractionDigits: 0,
        })}`,
        `$${cumulativeSavings.toLocaleString("en-US", {
          maximumFractionDigits: 0,
        })}`,
      ]);
    }

    addTable(
      ["Month", "Projects", "Monthly Savings", "Cumulative Savings"],
      monthlyProjectionRows
    );

    yPosition += 5;

    // ROI TIMELINE TABLE
    addSectionHeader("ROI BREAKEVEN & PAYBACK ANALYSIS");

    const roiTimelineRows = [
      ["Initial Investment", "$0", "Platform setup"],
      [
        "Monthly Burn Rate",
        `$${(
          calculation.savingsPerProject * calculation.projectsPerMonth
        ).toLocaleString("en-US", {
          maximumFractionDigits: 0,
        })}`,
        "Savings/month",
      ],
      [
        "Breakeven Month",
        `Month ${calculation.paybackMonths}`,
        "100% ROI achieved",
      ],
      [
        `${calculation.monthsToAnalyze}-Month ROI`,
        `${calculation.roi}%`,
        "Projected return",
      ],
      [
        `${calculation.monthsToAnalyze}-Month Savings`,
        `$${calculation.annualSavings.toLocaleString("en-US", {
          maximumFractionDigits: 0,
        })}`,
        "Total savings",
      ],
    ];

    addTable(["Metric", "Value", "Description"], roiTimelineRows);

    yPosition += 8;

    // ===== LINKED DATA SECTION =====
    if (calculation.linkedBtuProjectId) {
      addSectionHeader("LINKED BTU PROJECT DATA");

      doc.setFont(undefined, "bold");
      doc.setFontSize(10);
      doc.text("BTU Calculator Integration:", margin + 5, yPosition);
      yPosition += lineHeight + 2;

      doc.setFont(undefined, "normal");
      doc.setFontSize(9);
      doc.text(
        `Project ID: ${calculation.linkedBtuProjectId}`,
        margin + 10,
        yPosition
      );
      yPosition += lineHeight;
    }

    yPosition += 8;

    // RECOMMENDATIONS & INSIGHTS
    addSectionHeader("RECOMMENDATIONS & KEY INSIGHTS");

    const calcPayback = calculation.paybackMonths;
    const calcRoi = parseFloat(calculation.roi);
    const calcServiceMult = serviceMultiplier;

    // Build dynamic insights from saved calculation data
    const insights = [];

    // 1 -- Per-project saving
    insights.push(`[SAVING] Per-Project Saving: AC-Commerce reduces cost by ${calculation.savingsPercentage}% - saving $${calculation.savingsPerProject.toLocaleString("en-US", { maximumFractionDigits: 0 })} per project.`);

    // 2 -- Payback signal
    if (calcPayback <= 6) {
      insights.push(`[LOW RISK] Break-even in ${calcPayback} month${calcPayback !== 1 ? "s" : ""} with ${calculation.roi}% ROI over ${calculation.monthsToAnalyze} months. Prioritise scaling immediately.`);
    } else if (calcPayback <= 12) {
      insights.push(`[MODERATE] Break-even in ${calcPayback} months with ${calculation.roi}% ROI. Scaling project volume will shorten payback.`);
    } else {
      insights.push(`[LONG PAYBACK] Break-even in ${calcPayback} months with ${calculation.roi}% ROI. Increasing monthly project volume is the fastest way to accelerate returns.`);
    }

    // 3 -- Service-type tip
    const calcServiceTips = {
      "AC Installation": `[INSTALLATION] Platform pricing reduces equipment cost vs. traditional procurement for this service type (${(calcServiceMult * 100).toFixed(0)}% cost factor).`,
      "AC Repair": `[REPAIR] Repair jobs run at ~40% of install cost - higher volume is achievable without proportional cost growth (${(calcServiceMult * 100).toFixed(0)}% cost factor).`,
      "AC Maintenance": `[MAINTENANCE] Maintenance has a 3x frequency multiplier - maximises recurring revenue at lower per-visit cost (${(calcServiceMult * 100).toFixed(0)}% cost factor).`,
      "Gas Ducted Heating": `[HEATING] Gas ducted carries a 1.3x cost factor - AC-Commerce discounts are proportionally larger here.`,
      "Indoor Air Quality": `[IAQ] IAQ work combines high value with moderate cost - ${calculation.savingsPercentage}% margin improvement gives strong competitive positioning.`,
      "Smart Control Automation": `[AUTOMATION] Smart control has the shortest time factor (0.6x). Pair with IoT upsells to compound revenue beyond base savings.`,
      "Electrical Service": `[ELECTRICAL] Electrical jobs bundled with HVAC installs absorb team availability without extra mobilisation cost.`,
    };
    if (calcServiceTips[calculation.serviceType]) insights.push(calcServiceTips[calculation.serviceType]);

    // 4 -- Property-type tip
    if (calculation.propertyType === "residential-multi" && calculation.numberOfUnits) {
      insights.push(`[MULTI-UNIT] ${calculation.numberOfUnits} unit${calculation.numberOfUnits !== 1 ? "s" : ""} - AC Commerce's multi-unit platform discount offsets bulk coordination overhead.`);
    } else if (calculation.propertyType === "industrial-commercial") {
      insights.push(`[COMMERCIAL] Maintenance cost drops from 5% to 2% of project value on the AC Commerce platform.`);
    }

    // 5 -- Scale/ROI opportunity
    if (calcRoi >= 100) {
      insights.push(`[SCALE] ROI exceeds 100% - every additional project per month generates over $${calculation.savingsPerProject.toLocaleString("en-US", { maximumFractionDigits: 0 })} in incremental savings.`);
    } else if (calcRoi < 50 && calculation.projectsPerMonth < 5) {
      insights.push(`[VOLUME] ROI is relatively low at current volume (${calculation.projectsPerMonth}/month). Growing to 5+ projects/month will substantially improve the payback curve.`);
    }

    // 6 -- BTU data source
    if (calculation.btuProjectData) {
      const bpd = calculation.btuProjectData;
      insights.push(`[BTU DATA] Equipment costs derived from actual BTU Calculator units ($${(bpd.estimatedProjectCost || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })} project cost, ${bpd.numberOfRooms || "?"} rooms, ${(bpd.totalBTU || 0).toLocaleString("en-US")} BTU).`);
    }

    // 7 -- Recommendations list
    insights.push("");
    insights.push(`RECOMMENDATIONS:`);
    insights.push(`  1. Implement AC-Commerce immediately - payback in ${calcPayback} month${calcPayback !== 1 ? "s" : ""}`);
    insights.push(`  2. Scale project volume to ${Math.max((calculation.projectsPerMonth || 1) + 2, 5)}/month to accelerate ROI`);
    insights.push(`  3. Monitor actual vs. projected savings monthly`);
    insights.push(`  4. Leverage BTU Calculator integration for precise per-project cost data`);
    insights.push(`  5. Schedule quarterly reviews to adjust parameters based on actuals`);

    insights.forEach((insight) => {
      if (yPosition > pageHeight - 20) {
        doc.addPage();
        yPosition = 20;
      }

      if (insight === "") {
        yPosition += 3;
      } else {
        const wrappedText = doc.splitTextToSize(insight, maxWidth - 10);
        doc.setFont(undefined, insight.includes("→") ? "bold" : "normal");
        doc.setFontSize(9);
        doc.text(wrappedText, margin + 5, yPosition);
        yPosition += wrappedText.length * (lineHeight - 0.5) + 2;
      }
    });

    yPosition += 8;

    // Add footer on last page
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.setFont(undefined, "italic");
    doc.text(
      "This report was generated by AC-Commerce ROI Calculator",
      margin,
      pageHeight - 15
    );
    doc.text(
      "For more information, visit: ac-commerce.com | Contact: sales@ac-commerce.com",
      margin,
      pageHeight - 10
    );

    // Page number
    const totalPages = doc.getNumberOfPages();
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(8);
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 5, {
        align: "center",
      });
    }

    // Download
    const filename = `ROI_Report_${calculation.name}_${
      new Date().toISOString().split("T")[0]
    }.pdf`;
    const pdfBlob = doc.output("blob");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(pdfBlob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    toast.success(`Downloaded: ${filename}`);
  };

  // Delete a saved calculation
  const handleDeleteCalculation = async (calculationId) => {
    if (!window.confirm("Are you sure you want to delete this calculation?")) {
      return;
    }

    try {
      await axios.delete(`/api/roi-calculations/${calculationId}`, {
        headers: { authorization: `Bearer ${userInfo.token}` },
      });

      setSavedCalculations(
        savedCalculations.filter((calc) => calc._id !== calculationId)
      );
      dispatch({ type: "ROI_DELETE_CALCULATION", payload: calculationId });
      toast.success("Calculation deleted");
    } catch (error) {
      console.error("Error deleting calculation:", error);
      toast.error("Failed to delete calculation");
    }
  };

  // Clear all form inputs
  const handleClearForm = () => {
    // Keep current property type, only reset numeric values
    const currentConfig = propertyConfigs[propertyType];

    setServiceType("AC Installation");
    setEquipmentAge("");
    // Don't reset propertyType - keep the current selection
    setProjectSize(currentConfig.minProjectSize);
    setInstallationTime(currentConfig.minInstallationTime);
    setTeamSize(1);
    setNumberOfUnits(1);
    setMaintenanceFrequency(1);
    setProjectsPerMonth(1);
    setMonthsToAnalyze(1);
    setSaveCalculationName("");
    setSaveCalculationDescription("");
    setTags("");
    toast.info("Form inputs cleared");
  };

  // Calculation logic with service type and property type multipliers
  const multiplier =
    serviceTypeMultipliers[serviceType] ||
    serviceTypeMultipliers["AC Installation"];

  // Check if this calculation is based on BTU Calculator data
  const isFromBTU = capturedBtuData && capturedBtuData.equipmentCost;

  // Base calculation using property type config (per single unit/project)
  let baseEquipmentTradCost, baseEquipmentAccCost;

  if (isFromBTU) {
    // Use actual equipment cost from BTU Calculator with markup/discount
    // Traditional: Add 15% contractor markup
    // AC Commerce: Platform provides 8% discount
    baseEquipmentTradCost = capturedBtuData.equipmentCost * 1.15;
    baseEquipmentAccCost = capturedBtuData.equipmentCost * 0.92;
  } else {
    // Use project size multiplier for manual calculations
    baseEquipmentTradCost = projectSize * config.costMultiplier.traditional;
    baseEquipmentAccCost = projectSize * config.costMultiplier.acCommerce;
  }

  const baseLaborTradCost =
    installationTime * config.laborCost.traditional * teamSize;
  const baseMaintenanceTradCost =
    propertyType === "industrial-commercial"
      ? (isFromBTU ? capturedBtuData.equipmentCost : projectSize) *
        0.05 *
        maintenanceFrequency
      : 0;

  const baseLaborAccCost =
    installationTime * config.laborCost.acCommerce * teamSize;
  const baseMaintenanceAccCost =
    propertyType === "industrial-commercial"
      ? (isFromBTU ? capturedBtuData.equipmentCost : projectSize) *
        0.02 *
        maintenanceFrequency
      : 0;

  // Calculate per-project costs before multi-unit scaling
  let baseUnitTradCost =
    baseEquipmentTradCost + baseLaborTradCost + baseMaintenanceTradCost;
  let baseUnitAccCost =
    baseEquipmentAccCost + baseLaborAccCost + baseMaintenanceAccCost;

  // Apply multi-unit adjustments if needed
  let traditionalCostPerProject = baseUnitTradCost;
  let acCommerceCostPerProject = baseUnitAccCost;

  if (propertyType === "residential-multi") {
    const coordinationOverhead = 1.05;
    traditionalCostPerProject =
      baseUnitTradCost * numberOfUnits * coordinationOverhead;
    acCommerceCostPerProject =
      baseUnitAccCost * numberOfUnits * coordinationOverhead * 0.9;
  }

  // Apply service type multiplier to final per-project costs
  traditionalCostPerProject = traditionalCostPerProject * multiplier.cost;
  acCommerceCostPerProject = acCommerceCostPerProject * multiplier.cost;

  // For display: breakdown costs should match the final costs shown in comparison
  // Apply same multipliers to component costs for consistency
  const equipmentTradCost =
    baseEquipmentTradCost *
    (propertyType === "residential-multi" ? numberOfUnits * 1.05 : 1) *
    multiplier.cost;
  const laborTradCost =
    baseLaborTradCost *
    (propertyType === "residential-multi" ? numberOfUnits * 1.05 : 1) *
    multiplier.cost;
  const maintenanceTradCost =
    baseMaintenanceTradCost *
    (propertyType === "residential-multi" ? numberOfUnits * 1.05 : 1) *
    multiplier.cost;
  const equipmentAccCost =
    baseEquipmentAccCost *
    (propertyType === "residential-multi" ? numberOfUnits * 1.05 * 0.9 : 1) *
    multiplier.cost;
  const laborAccCost =
    baseLaborAccCost *
    (propertyType === "residential-multi" ? numberOfUnits * 1.05 * 0.9 : 1) *
    multiplier.cost;
  const maintenanceAccCost =
    baseMaintenanceAccCost *
    (propertyType === "residential-multi" ? numberOfUnits * 1.05 * 0.9 : 1) *
    multiplier.cost;

  const savingsPerProject =
    traditionalCostPerProject - acCommerceCostPerProject;
  const savingsPercentage = (
    (savingsPerProject / traditionalCostPerProject) *
    100
  ).toFixed(1);

  // Annual calculations with service frequency adjustments
  const adjustedProjectsPerMonth = Math.round(
    projectsPerMonth * multiplier.frequency
  );
  const projectsPerYear = adjustedProjectsPerMonth * monthsToAnalyze;
  const annualTraditionalCost = traditionalCostPerProject * projectsPerYear;
  const annualAcCommerceCost = acCommerceCostPerProject * projectsPerYear;
  const annualSavings = annualTraditionalCost - annualAcCommerceCost;
  const roi = ((annualSavings / annualAcCommerceCost) * 100).toFixed(1);

  // Monthly breakdown data
  const monthlyData = Array.from({ length: monthsToAnalyze }, (_, i) => ({
    month: `Month ${i + 1}`,
    traditional: traditionalCostPerProject * adjustedProjectsPerMonth * (i + 1),
    acCommerce: acCommerceCostPerProject * adjustedProjectsPerMonth * (i + 1),
  }));

  // Cost distribution data using property type config
  const costDistribution = [
    { name: "Equipment", value: equipmentTradCost },
    { name: "Labor", value: laborTradCost },
    { name: "Overhead", value: projectSize * 0.1 },
    ...(propertyType === "industrial-commercial"
      ? [{ name: "Maintenance", value: maintenanceTradCost }]
      : [{ name: "Other", value: projectSize * 0.05 }]),
  ];

  const acCommerceCostDistribution = [
    { name: "Equipment", value: equipmentAccCost },
    { name: "Labor", value: laborAccCost },
    { name: "Platform Fee", value: projectSize * 0.03 },
    ...(propertyType === "industrial-commercial"
      ? [{ name: "Maintenance", value: maintenanceAccCost }]
      : [{ name: "Other", value: projectSize * 0.03 }]),
  ];

  const COLORS = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A"];

  // Payback period calculation (in months)
  const acCommercePlatformFee = 99; // Assuming $99/month platform fee
  const paybackMonths = Math.ceil(
    (acCommercePlatformFee * 12) / (annualSavings / 12)
  );

  // Download Report Function - PDF Generation with Enhanced Design
  const handleDownloadReport = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 15;
    const lineHeight = 7;
    const margin = 15;
    const maxWidth = pageWidth - margin * 2;

    // Add gradient background header
    doc.setFillColor(0, 102, 255); // Blue background
    doc.rect(0, 0, pageWidth, 50, "F");

    // White text on blue background
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont(undefined, "bold");
    doc.text("AC-COMMERCE", margin, 20);

    doc.setFontSize(14);
    doc.setFont(undefined, "normal");
    doc.text("ROI Calculator Report", margin, 30);

    // Date line
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, 40);

    // Reset text color to black
    doc.setTextColor(0, 0, 0);

    // Add decorative line
    doc.setDrawColor(0, 102, 255);
    doc.setLineWidth(1);
    doc.line(margin, 52, pageWidth - margin, 52);

    yPosition = 60;

    // Helper function to add section headers with background
    const addSectionHeader = (title) => {
      if (yPosition > pageHeight - 30) {
        doc.addPage();
        yPosition = 20;
      }
      doc.setFillColor(240, 247, 255); // Light blue background
      doc.rect(margin - 2, yPosition - 5, maxWidth + 4, 12, "F");
      doc.setDrawColor(0, 102, 255);
      doc.rect(margin - 2, yPosition - 5, maxWidth + 4, 12);

      doc.setFont(undefined, "bold");
      doc.setFontSize(12);
      doc.setTextColor(0, 102, 255);
      doc.text(title, margin + 2, yPosition + 2);
      doc.setTextColor(0, 0, 0);
      yPosition += 18;
    };

    // Helper function to add table
    const addTable = (headers, rows) => {
      if (yPosition > pageHeight - 40) {
        doc.addPage();
        yPosition = 20;
      }

      const colWidth = maxWidth / headers.length;
      doc.setFont(undefined, "bold");
      doc.setFontSize(9);
      doc.setFillColor(0, 102, 255);
      doc.setTextColor(255, 255, 255);

      // Header row
      headers.forEach((header, index) => {
        doc.text(header, margin + index * colWidth + 2, yPosition);
      });

      yPosition += lineHeight + 1;

      // Data rows
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, "normal");
      rows.forEach((row, rowIndex) => {
        if (yPosition > pageHeight - 15) {
          doc.addPage();
          yPosition = 20;
          // Repeat header
          doc.setFont(undefined, "bold");
          doc.setFillColor(0, 102, 255);
          doc.setTextColor(255, 255, 255);
          headers.forEach((header, index) => {
            doc.text(header, margin + index * colWidth + 2, yPosition);
          });
          yPosition += lineHeight + 1;
          doc.setTextColor(0, 0, 0);
          doc.setFont(undefined, "normal");
        }

        const bgColor = rowIndex % 2 === 0 ? [245, 245, 245] : [255, 255, 255];
        doc.setFillColor(...bgColor);
        doc.rect(margin, yPosition - 5, maxWidth, lineHeight + 1, "F");

        row.forEach((cell, index) => {
          doc.text(cell.toString(), margin + index * colWidth + 2, yPosition);
        });

        yPosition += lineHeight + 2;
      });

      yPosition += 3;
    };

    // ===== PAGE 1: EXECUTIVE SUMMARY & INPUT PARAMETERS =====

    // FINANCIAL SUMMARY - Highlighted boxes
    addSectionHeader("EXECUTIVE SUMMARY");

    // Create colored boxes for key metrics
    const metrics = [
      {
        label: "Per Project Savings",
        value: `$${savingsPerProject.toLocaleString("en-US", {
          maximumFractionDigits: 0,
        })}`,
        subtext: `(${savingsPercentage}% reduction)`,
        color: [76, 205, 196], // Teal
      },
      {
        label: "Total Period Savings",
        value: `$${annualSavings.toLocaleString("en-US", {
          maximumFractionDigits: 0,
        })}`,
        subtext: `${monthsToAnalyze} months`,
        color: [255, 107, 107], // Red
      },
      {
        label: "Annual ROI",
        value: `${roi}%`,
        subtext: "Return on Investment",
        color: [69, 183, 209], // Cyan
      },
      {
        label: "Payback Period",
        value: `${paybackMonths} months`,
        subtext: "To break even",
        color: [255, 160, 122], // Light Salmon
      },
    ];

    // Draw metric boxes in a 2x2 grid
    let metricsPerRow = 2;
    let boxWidth = (maxWidth - 4) / metricsPerRow;
    let boxHeight = 28;
    let metricIndex = 0;

    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < metricsPerRow; col++) {
        if (metricIndex >= metrics.length) break;

        const metric = metrics[metricIndex];
        const xPos = margin + col * (boxWidth + 2);
        const boxY = yPosition;

        // Draw box background
        doc.setFillColor(...metric.color);
        doc.rect(xPos, boxY, boxWidth, boxHeight, "F");

        // Add white text
        doc.setTextColor(255, 255, 255);
        doc.setFont(undefined, "normal");
        doc.setFontSize(8);
        doc.text(metric.label, xPos + 3, boxY + 5);

        doc.setFont(undefined, "bold");
        doc.setFontSize(13);
        doc.text(metric.value, xPos + 3, boxY + 14);

        doc.setFont(undefined, "normal");
        doc.setFontSize(7);
        doc.text(metric.subtext, xPos + 3, boxY + 22);

        metricIndex++;
      }
      yPosition += boxHeight + 3;
    }

    doc.setTextColor(0, 0, 0);
    yPosition += 8;

    // INPUT PARAMETERS TABLE
    addSectionHeader("INPUT PARAMETERS SUMMARY");

    const paramRows = [
      ["Service Type", serviceType],
      ["Equipment Age", equipmentAge || "N/A"],
      ["Project Value", `$${projectSize.toLocaleString()}`],
      ["Installation Time", `${installationTime} days`],
      ["Team Size", `${teamSize} people`],
      ["Projects/Month", projectsPerMonth.toString()],
      ["Analysis Period", `${monthsToAnalyze} months`],
    ];

    addTable(["Parameter", "Value"], paramRows);

    yPosition += 5;

    // ===== PAGE 2: COST BREAKDOWN ANALYSIS =====

    // DETAILED COST BREAKDOWN TABLE
    addSectionHeader("COST BREAKDOWN - DETAILED COMPARISON");

    const costBreakdownRows = [
      [
        "Equipment Cost",
        `$${(projectSize * 0.15).toLocaleString("en-US", {
          maximumFractionDigits: 0,
        })}`,
        `$${(projectSize * 0.08).toLocaleString("en-US", {
          maximumFractionDigits: 0,
        })}`,
        `$${(projectSize * 0.15 - projectSize * 0.08).toLocaleString("en-US", {
          maximumFractionDigits: 0,
        })}`,
      ],
      [
        "Labor Cost",
        `$${(installationTime * 500 * teamSize).toLocaleString("en-US", {
          maximumFractionDigits: 0,
        })}`,
        `$${(installationTime * 300 * teamSize).toLocaleString("en-US", {
          maximumFractionDigits: 0,
        })}`,
        `$${(
          installationTime * 500 * teamSize -
          installationTime * 300 * teamSize
        ).toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
      ],
      [
        "TOTAL PER PROJECT",
        `$${traditionalCostPerProject.toLocaleString("en-US", {
          maximumFractionDigits: 0,
        })}`,
        `$${acCommerceCostPerProject.toLocaleString("en-US", {
          maximumFractionDigits: 0,
        })}`,
        `$${savingsPerProject.toLocaleString("en-US", {
          maximumFractionDigits: 0,
        })}`,
      ],
    ];

    addTable(
      ["Cost Item", "Traditional", "AC-Commerce Method", "Savings"],
      costBreakdownRows
    );

    yPosition += 5;

    // SERVICE-SPECIFIC COST ANALYSIS
    addSectionHeader("SERVICE-SPECIFIC COST ANALYSIS");

    const serviceMultipliers = {
      "AC Installation": 1.0,
      "AC Repair": 0.6,
      "AC Maintenance": 0.3,
      "Gas Ducted Heating": 1.1,
      "Indoor Air Quality": 0.8,
      "Smart Control Automation": 0.5,
      "Electrical Service": 0.7,
    };

    const serviceMultiplier = serviceMultipliers[serviceType] || 1.0;
    const serviceAdjustedTraditional =
      traditionalCostPerProject * serviceMultiplier;
    const serviceAdjustedAcCommerce =
      acCommerceCostPerProject * serviceMultiplier;
    const serviceAdjustedSavings =
      serviceAdjustedTraditional - serviceAdjustedAcCommerce;

    const serviceRows = [
      ["Service Type", serviceType],
      ["Cost Multiplier", `${(serviceMultiplier * 100).toFixed(0)}%`],
      [
        "Traditional Method",
        `$${serviceAdjustedTraditional.toLocaleString("en-US", {
          maximumFractionDigits: 0,
        })}`,
      ],
      [
        "AC-Commerce Method",
        `$${serviceAdjustedAcCommerce.toLocaleString("en-US", {
          maximumFractionDigits: 0,
        })}`,
      ],
      [
        "Savings",
        `$${serviceAdjustedSavings.toLocaleString("en-US", {
          maximumFractionDigits: 0,
        })}`,
      ],
    ];

    addTable(["Metric", "Amount"], serviceRows);

    yPosition += 5;

    // ===== PAGE 3: PROJECTIONS & TIMELINE =====

    // MONTHLY SAVINGS PROJECTION TABLE
    addSectionHeader("12-MONTH SAVINGS PROJECTION");

    const monthlyProjectionRows = [];
    let cumulativeSavings = 0;

    for (let month = 1; month <= Math.min(12, monthsToAnalyze); month++) {
      const monthlySavings = savingsPerProject * projectsPerMonth;
      cumulativeSavings += monthlySavings;
      monthlyProjectionRows.push([
        `Month ${month}`,
        projectsPerMonth.toString(),
        `$${monthlySavings.toLocaleString("en-US", {
          maximumFractionDigits: 0,
        })}`,
        `$${cumulativeSavings.toLocaleString("en-US", {
          maximumFractionDigits: 0,
        })}`,
      ]);
    }

    addTable(
      ["Month", "Projects", "Monthly Savings", "Cumulative Savings"],
      monthlyProjectionRows
    );

    yPosition += 5;

    // ROI TIMELINE TABLE
    addSectionHeader("ROI BREAKEVEN & PAYBACK ANALYSIS");

    const roiTimelineRows = [
      ["Initial Investment", "$0", "Platform setup"],
      [
        "Monthly Burn Rate",
        `$${(savingsPerProject * projectsPerMonth).toLocaleString("en-US", {
          maximumFractionDigits: 0,
        })}`,
        "Savings/month",
      ],
      ["Breakeven Month", `Month ${paybackMonths}`, "100% ROI achieved"],
      [`${monthsToAnalyze}-Month ROI`, `${roi}%`, "Projected return"],
      [
        `${monthsToAnalyze}-Month Savings`,
        `$${annualSavings.toLocaleString("en-US", {
          maximumFractionDigits: 0,
        })}`,
        "Total savings",
      ],
    ];

    addTable(["Metric", "Value", "Description"], roiTimelineRows);

    yPosition += 8;

    // ===== LINKED DATA SECTION =====
    if (btuData) {
      addSectionHeader("LINKED BTU PROJECT DATA");

      doc.setFont(undefined, "bold");
      doc.setFontSize(10);
      doc.text("BTU Calculator Integration:", margin + 5, yPosition);
      yPosition += lineHeight + 2;

      doc.setFont(undefined, "normal");
      doc.setFontSize(9);

      if (btuData.projectName) {
        doc.text(
          `Project Name: ${btuData.projectName}`,
          margin + 10,
          yPosition
        );
        yPosition += lineHeight;
      }

      if (btuData.totalBTU) {
        doc.text(
          `Total BTU Required: ${btuData.totalBTU.toLocaleString("en-US")} BTU`,
          margin + 10,
          yPosition
        );
        yPosition += lineHeight;
      }

      if (btuData.numberOfRooms) {
        doc.text(
          `Number of Rooms: ${btuData.numberOfRooms}`,
          margin + 10,
          yPosition
        );
        yPosition += lineHeight;
      }

      if (btuData.totalSquareFootage) {
        doc.text(
          `Total Square Footage: ${btuData.totalSquareFootage.toLocaleString()} sq ft`,
          margin + 10,
          yPosition
        );
        yPosition += lineHeight;
      }

      if (btuData.estimatedProjectCost) {
        doc.text(
          `Estimated Project Cost: $${btuData.estimatedProjectCost.toLocaleString(
            "en-US",
            { maximumFractionDigits: 0 }
          )}`,
          margin + 10,
          yPosition
        );
        yPosition += lineHeight;
      }

      if (btuData.recommendedUnits && btuData.recommendedUnits.length > 0) {
        yPosition += 2;
        doc.setFont(undefined, "bold");
        doc.setFontSize(9);
        doc.text("Recommended Equipment Units:", margin + 10, yPosition);
        yPosition += lineHeight;

        doc.setFont(undefined, "normal");
        doc.setFontSize(8);
        btuData.recommendedUnits.slice(0, 5).forEach((unit, index) => {
          if (yPosition > pageHeight - 15) {
            doc.addPage();
            yPosition = 20;
          }
          doc.text(
            `${index + 1}. ${unit.name || "Unit"} - ${unit.btu || 0} BTU`,
            margin + 15,
            yPosition
          );
          yPosition += lineHeight;
        });

        if (btuData.recommendedUnits.length > 5) {
          doc.text(
            `... and ${btuData.recommendedUnits.length - 5} more units`,
            margin + 15,
            yPosition
          );
          yPosition += lineHeight;
        }
      }

      yPosition += 5;
    }

    // ===== FINAL PAGE: INSIGHTS & RECOMMENDATIONS =====

    addSectionHeader("KEY INSIGHTS & RECOMMENDATIONS");

    // Build dynamic, data-driven insights
    const insights = [];

    // 1 — Per-project saving
    insights.push(`[SAVING] Per-Project Saving: AC-Commerce reduces cost by ${savingsPercentage}% - saving $${savingsPerProject.toLocaleString("en-US", { maximumFractionDigits: 0 })} per project.`);

    // 2 — Payback signal
    if (paybackMonths <= 6) {
      insights.push(`[LOW RISK] Break-even in ${paybackMonths} month${paybackMonths !== 1 ? "s" : ""} with ${roi}% ROI over ${monthsToAnalyze} months. Prioritise scaling immediately.`);
    } else if (paybackMonths <= 12) {
      insights.push(`[MODERATE] Break-even in ${paybackMonths} months with ${roi}% ROI. Scaling project volume will shorten payback.`);
    } else {
      insights.push(`[LONG PAYBACK] Break-even in ${paybackMonths} months with ${roi}% ROI. Increasing monthly project volume is the fastest way to accelerate returns.`);
    }

    // 3 — Service-type tip
    const serviceTips = {
      "AC Installation": `[INSTALLATION] Platform pricing yields ${((1 - config.costMultiplier.acCommerce / config.costMultiplier.traditional) * 100).toFixed(0)}% equipment cost reduction vs. traditional procurement.`,
      "AC Repair": `[REPAIR] Repair jobs run at ~40% of install cost - higher volume is achievable without proportional cost growth.`,
      "AC Maintenance": `[MAINTENANCE] Maintenance has a 3x frequency multiplier - ${adjustedProjectsPerMonth} visits/month maximises recurring revenue at lower per-visit cost.`,
      "Gas Ducted Heating": `[HEATING] Gas ducted carries a 1.3x cost factor - AC-Commerce equipment discounts are proportionally larger here.`,
      "Indoor Air Quality": `[IAQ] IAQ work combines high perceived value with moderate cost - the ${savingsPercentage}% margin improvement gives strong competitive positioning.`,
      "Smart Control Automation": `[AUTOMATION] Smart control has the shortest time factor (0.6x). Pair with IoT upsells to compound revenue beyond base savings.`,
      "Electrical Service": `[ELECTRICAL] Electrical jobs bundled with HVAC installs absorb team availability without extra mobilisation cost.`,
    };
    if (serviceTips[serviceType]) insights.push(serviceTips[serviceType]);

    // 4 — Property-type tip
    if (propertyType === "residential-multi") {
      insights.push(`[MULTI-UNIT] ${numberOfUnits} unit${numberOfUnits !== 1 ? "s" : ""} - bulk coordination overhead (5%) is offset by AC-Commerce's 10% multi-unit platform discount.`);
    } else if (propertyType === "industrial-commercial") {
      insights.push(`[COMMERCIAL] Maintenance cost drops from 5% to 2% of project value on the AC-Commerce platform - a significant recurring saving at commercial scale.`);
    }

    // 5 — Scale opportunity
    if (parseFloat(roi) >= 100) {
      insights.push(`[SCALE] ROI exceeds 100% - every additional project per month generates over $${savingsPerProject.toLocaleString("en-US", { maximumFractionDigits: 0 })} in incremental savings.`);
    } else if (parseFloat(roi) < 50 && projectsPerMonth < 5) {
      insights.push(`[VOLUME] ROI is relatively low at current volume (${projectsPerMonth}/month). Growing to 5+ projects/month will substantially improve the payback curve.`);
    }

    // 6 -- BTU data source
    if (isFromBTU && capturedBtuData) {
      insights.push(`[BTU DATA] Equipment costs are based on actual selected units ($${capturedBtuData.equipmentCost?.toLocaleString("en-US", { maximumFractionDigits: 0 })} equipment, ${capturedBtuData.totalBTU?.toLocaleString("en-US")} BTU total) rather than estimated percentages.`);
    }

    // 7 — Recommendations list
    insights.push("");
    insights.push(`RECOMMENDATIONS:`);
    insights.push(`  1. Implement AC-Commerce immediately — payback in ${paybackMonths} month${paybackMonths !== 1 ? "s" : ""}`);
    insights.push(`  2. Scale project volume to ${Math.max(projectsPerMonth + 2, 5)}/month to accelerate ROI`);
    insights.push(`  3. Monitor actual vs. projected savings monthly`);
    insights.push(`  4. Leverage BTU Calculator integration for precise per-project cost data`);
    insights.push(`  5. Schedule quarterly reviews to adjust parameters based on actuals`);
    insights.push(`  6. Assumption: $99/month platform fee, ${projectsPerMonth} projects/month, ${teamSize}-person team`);

    insights.forEach((insight) => {
      if (yPosition > pageHeight - 20) {
        doc.addPage();
        yPosition = 20;
      }

      if (insight === "") {
        yPosition += 3;
      } else {
        const wrappedText = doc.splitTextToSize(insight, maxWidth - 10);
        doc.setFont(undefined, insight.includes("→") ? "bold" : "normal");
        doc.setFontSize(9);
        doc.text(wrappedText, margin + 5, yPosition);
        yPosition += wrappedText.length * (lineHeight - 0.5) + 2;
      }
    });

    yPosition += 8;

    // Add footer on last page
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.setFont(undefined, "italic");
    doc.text(
      "This report was generated by AC-Commerce ROI Calculator",
      margin,
      pageHeight - 15
    );
    doc.text(
      "For more information, visit: ac-commerce.com | Contact: sales@ac-commerce.com",
      margin,
      pageHeight - 10
    );

    // Page number
    const totalPages = doc.getNumberOfPages();
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(8);
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 5, {
        align: "center",
      });
    }

    // Save PDF with proper download
    const filename = `ROI_Report_${new Date().toISOString().split("T")[0]}.pdf`;
    const pdfBlob = doc.output("blob");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(pdfBlob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    toast.success(`Report generated: ${filename}`);
  };

  // Schedule Demo Function
  // const handleScheduleDemo = () => {
  //   setShowDemoModal(true);
  // };

  return (
    <div className="roi-experimental-page-container">
      {/* Hero */}
      <div className="roi-exp-hero">
        <div className="roi-exp-hero__inner">
          <div className="roi-exp-hero__icon"><FaChartLine /></div>
          <h1 className="roi-exp-hero__title">ROI Calculator</h1>
          <p className="roi-exp-hero__sub">Deep dive into your potential savings with AC-Commerce.</p>
        </div>
      </div>

      <div className="roi-exp-inner">
        <Tabs
          activeKey={activeTab}
          onSelect={(k) => k && setActiveTab(k)}
          className="roi-tabs mb-5"
        >
          {/* Calculator Tab */}
          <Tab eventKey="calculator" title="📊 Calculator">
            <Card className="calculator-card">
              <Card.Body>
                <Row>
                  <Col lg={6} md={12} className="mb-4">
                    <h3 className="section-title">⚙️ Input Parameters</h3>

                    {/* Service Type */}
                    <Form.Group className="mb-4">
                      <Form.Label className="param-label">
                        <strong>Service Type</strong>
                      </Form.Label>
                      <Form.Select
                        value={serviceType}
                        onChange={(e) => setServiceType(e.target.value)}
                        className="mb-2"
                      >
                        <option value="AC Installation">AC Installation</option>
                        <option value="AC Repair">AC Repair</option>
                        <option value="AC Maintenance">AC Maintenance</option>
                        <option value="Gas Ducted Heating">
                          Gas Ducted Heating
                        </option>
                        <option value="Indoor Air Quality">
                          Indoor Air Quality
                        </option>
                        <option value="Smart Control Automation">
                          Smart Control Automation
                        </option>
                        <option value="Electrical Service">
                          Electrical Service
                        </option>
                      </Form.Select>
                      <small className="text-muted">
                        Costs and frequency adjusted for service type
                      </small>
                    </Form.Group>

                    {/* Equipment Age */}
                    <Form.Group className="mb-4">
                      <Form.Label className="param-label">
                        <strong>Equipment Age (Optional)</strong>
                      </Form.Label>
                      <Form.Select
                        value={equipmentAge}
                        onChange={(e) => setEquipmentAge(e.target.value)}
                      >
                        <option value="">Select equipment age</option>
                        <option value="Less than 1 year">
                          Less than 1 year
                        </option>
                        <option value="1-2 years">1-2 years</option>
                        <option value="3-4 years">3-4 years</option>
                        <option value="5-6 years">5-6 years</option>
                        <option value="More than 6 years">
                          More than 6 years
                        </option>
                        <option value="New installation">
                          New installation
                        </option>
                      </Form.Select>
                      <small className="text-muted">
                        Helps refine cost estimates
                      </small>
                    </Form.Group>

                    {/* Property Type */}
                    <Form.Group className="mb-4">
                      <Form.Label className="param-label">
                        <strong>Property Type</strong>
                      </Form.Label>
                      <Form.Select
                        value={propertyType}
                        onChange={(e) => setPropertyType(e.target.value)}
                        className="mb-2"
                      >
                        <option value="residential-single">
                          Residential (Single Unit)
                        </option>
                        <option value="residential-multi">
                          Residential (Multi-Unit)
                        </option>
                        <option value="industrial-commercial">
                          Industrial/Commercial Property
                        </option>
                      </Form.Select>
                      <small className="text-muted">{config.description}</small>
                    </Form.Group>

                    {/* Project Size */}
                    <Form.Group className="mb-4">
                      <Form.Label className="param-label">
                        {propertyType === "industrial-commercial"
                          ? "Total Project Value"
                          : "Average Project Value"}
                        : ${projectSize.toLocaleString()}
                      </Form.Label>
                      <Form.Range
                        value={projectSize}
                        onChange={(e) => setProjectSize(Number(e.target.value))}
                        min={config.minProjectSize}
                        max={config.maxProjectSize}
                        step={1000}
                        className="param-slider"
                      />
                      <small className="text-muted">
                        Range: ${config.minProjectSize.toLocaleString()} - $
                        {config.maxProjectSize.toLocaleString()}
                      </small>
                    </Form.Group>

                    {/* Installation Time */}
                    <Form.Group className="mb-4">
                      <Form.Label className="param-label">
                        {propertyType === "industrial-commercial"
                          ? "Implementation Time"
                          : "Installation Time"}
                        : {installationTime} days
                      </Form.Label>
                      <Form.Range
                        value={installationTime}
                        onChange={(e) =>
                          setInstallationTime(Number(e.target.value))
                        }
                        min={config.minInstallationTime}
                        max={config.maxInstallationTime}
                        step={1}
                        className="param-slider"
                      />
                      <small className="text-muted">
                        Range: {config.minInstallationTime} -{" "}
                        {config.maxInstallationTime} days
                      </small>
                    </Form.Group>

                    {/* Team Size */}
                    <Form.Group className="mb-4">
                      <Form.Label className="param-label">
                        Team Size: {teamSize} people
                      </Form.Label>
                      <Form.Range
                        value={teamSize}
                        onChange={(e) => setTeamSize(Number(e.target.value))}
                        min={1}
                        max={20}
                        step={1}
                        className="param-slider"
                      />
                      <small className="text-muted">Range: 1 - 20 people</small>
                    </Form.Group>

                    {/* Multi-Unit Selector (for residential-multi) */}
                    {propertyType === "residential-multi" && (
                      <Form.Group className="mb-4">
                        <Form.Label className="param-label">
                          Number of Units: {numberOfUnits}
                        </Form.Label>
                        <Form.Range
                          value={numberOfUnits}
                          onChange={(e) =>
                            setNumberOfUnits(Number(e.target.value))
                          }
                          min={2}
                          max={100}
                          step={1}
                          className="param-slider"
                        />
                        <small className="text-muted">
                          Range: 2 - 100 units
                        </small>
                      </Form.Group>
                    )}

                    {/* Maintenance Frequency (for industrial-commercial) */}
                    {propertyType === "industrial-commercial" && (
                      <Form.Group className="mb-4">
                        <Form.Label className="param-label">
                          Annual Maintenance Cycles: {maintenanceFrequency}x
                        </Form.Label>
                        <Form.Range
                          value={maintenanceFrequency}
                          onChange={(e) =>
                            setMaintenanceFrequency(Number(e.target.value))
                          }
                          min={1}
                          max={12}
                          step={1}
                          className="param-slider"
                        />
                        <small className="text-muted">
                          Range: 1 - 12 cycles per year
                        </small>
                      </Form.Group>
                    )}

                    {/* Projects Per Month */}
                    <Form.Group className="mb-4">
                      <Form.Label className="param-label">
                        Projects Per Month: {projectsPerMonth}
                      </Form.Label>
                      <Form.Range
                        value={projectsPerMonth}
                        onChange={(e) =>
                          setProjectsPerMonth(Number(e.target.value))
                        }
                        min={1}
                        max={100}
                        step={1}
                        className="param-slider"
                      />
                      <small className="text-muted">
                        Range: 1 - 100 projects
                      </small>
                    </Form.Group>

                    {/* Analysis Period */}
                    <Form.Group className="mb-4">
                      <Form.Label className="param-label">
                        Analysis Period: {monthsToAnalyze} months
                      </Form.Label>
                      <Form.Range
                        value={monthsToAnalyze}
                        onChange={(e) =>
                          setMonthsToAnalyze(Number(e.target.value))
                        }
                        min={1}
                        max={36}
                        step={1}
                        className="param-slider"
                      />
                      <small className="text-muted">Range: 1 - 36 months</small>
                    </Form.Group>

                    {/* Clear Button */}
                    <Button
                      variant="outline-secondary"
                      size="lg"
                      className="w-100 mb-3 roi-clear-btn"
                      onClick={handleClearForm}
                    >
                      🗑️ Clear All Inputs
                    </Button>
                  </Col>

                  {/* Results */}
                  <Col lg={6} md={12}>
                    <h3 className="section-title">📊 Results Summary</h3>

                    {/* Service Type Info Badge */}
                    <Alert variant="info" className="mb-3 py-2">
                      <small>
                        <strong>Service:</strong> {serviceType}
                        {equipmentAge && ` • Equipment: ${equipmentAge}`}
                        <br />
                        <strong>Adjusted Projects/Month:</strong>{" "}
                        {adjustedProjectsPerMonth}
                        {adjustedProjectsPerMonth !== projectsPerMonth && (
                          <span className="text-muted">
                            {" "}
                            (Base: {projectsPerMonth})
                          </span>
                        )}
                      </small>
                    </Alert>

                    <div className="results-grid">
                      <div className="result-box primary">
                        <div className="result-icon">💰</div>
                        <div className="result-label">Per Project Savings</div>
                        <div className="result-value">
                          $
                          {savingsPerProject.toLocaleString("en-US", {
                            maximumFractionDigits: 0,
                          })}
                        </div>
                        <div className="result-percent">
                          {savingsPercentage}% reduction
                        </div>
                      </div>

                      <div className="result-box success">
                        <div className="result-icon">📈</div>
                        <div className="result-label">Total Period Savings</div>
                        <div className="result-value">
                          $
                          {annualSavings.toLocaleString("en-US", {
                            maximumFractionDigits: 0,
                          })}
                        </div>
                        <div className="result-percent">
                          Over {monthsToAnalyze} months
                        </div>
                      </div>

                      <div className="result-box info">
                        <div className="result-icon">⏱️</div>
                        <div className="result-label">Payback Period</div>
                        <div className="result-value">
                          {paybackMonths} months
                        </div>
                        <div className="result-percent">
                          Break-even timeline
                        </div>
                      </div>

                      <div className="result-box warning">
                        <div className="result-icon">📊</div>
                        <div className="result-label">ROI</div>
                        <div className="result-value">{roi}%</div>
                        <div className="result-percent">
                          Return on investment
                        </div>
                      </div>
                    </div>

                    {/* Detailed Breakdown */}
                    <Card className="breakdown-card mt-4">
                      <Card.Header className="bg-light">
                        <strong>Cost Breakdown (Per Project)</strong>
                      </Card.Header>
                      <Card.Body>
                        <Row>
                          <Col md={6}>
                            <div className="breakdown-section">
                              <h6 className="breakdown-subtitle">
                                Traditional Method
                              </h6>
                              <div className="breakdown-item">
                                <span>Equipment Cost:</span>
                                <span className="cost">
                                  $
                                  {equipmentTradCost.toLocaleString("en-US", {
                                    maximumFractionDigits: 0,
                                  })}
                                </span>
                              </div>
                              <div className="breakdown-item">
                                <span>Labor Cost:</span>
                                <span className="cost">
                                  $
                                  {laborTradCost.toLocaleString("en-US", {
                                    maximumFractionDigits: 0,
                                  })}
                                </span>
                              </div>
                              {propertyType === "industrial-commercial" && (
                                <div className="breakdown-item">
                                  <span>Maintenance/Cycle:</span>
                                  <span className="cost">
                                    $
                                    {maintenanceTradCost.toLocaleString(
                                      "en-US",
                                      {
                                        maximumFractionDigits: 0,
                                      }
                                    )}
                                  </span>
                                </div>
                              )}
                              <div className="breakdown-item breakdown-total">
                                <span>
                                  <strong>Total:</strong>
                                </span>
                                <span className="cost traditional">
                                  <strong>
                                    $
                                    {(
                                      equipmentTradCost +
                                      laborTradCost +
                                      maintenanceTradCost
                                    ).toLocaleString("en-US", {
                                      maximumFractionDigits: 0,
                                    })}
                                  </strong>
                                </span>
                              </div>
                            </div>
                          </Col>
                          <Col md={6}>
                            <div className="breakdown-section">
                              <h6 className="breakdown-subtitle">
                                AC Commerce Platform
                              </h6>
                              <div className="breakdown-item">
                                <span>Equipment Cost:</span>
                                <span className="cost highlight-green">
                                  $
                                  {equipmentAccCost.toLocaleString("en-US", {
                                    maximumFractionDigits: 0,
                                  })}
                                </span>
                              </div>
                              <div className="breakdown-item">
                                <span>Labor Cost:</span>
                                <span className="cost highlight-green">
                                  $
                                  {laborAccCost.toLocaleString("en-US", {
                                    maximumFractionDigits: 0,
                                  })}
                                </span>
                              </div>
                              {propertyType === "industrial-commercial" && (
                                <div className="breakdown-item">
                                  <span>Maintenance/Cycle:</span>
                                  <span className="cost highlight-green">
                                    $
                                    {maintenanceAccCost.toLocaleString(
                                      "en-US",
                                      {
                                        maximumFractionDigits: 0,
                                      }
                                    )}
                                  </span>
                                </div>
                              )}
                              <div className="breakdown-item breakdown-total">
                                <span>
                                  <strong>Total:</strong>
                                </span>
                                <span className="cost highlight-green">
                                  <strong>
                                    $
                                    {(
                                      equipmentAccCost +
                                      laborAccCost +
                                      maintenanceAccCost
                                    ).toLocaleString("en-US", {
                                      maximumFractionDigits: 0,
                                    })}
                                  </strong>
                                </span>
                              </div>
                            </div>
                          </Col>
                        </Row>
                        <hr />
                        <h6 className="breakdown-subtitle">Cost Comparison</h6>
                        <div className="breakdown-item">
                          <span>Traditional Method:</span>
                          <span className="cost traditional">
                            $
                            {traditionalCostPerProject.toLocaleString("en-US", {
                              maximumFractionDigits: 0,
                            })}
                          </span>
                        </div>
                        <div className="breakdown-item">
                          <span>AC Commerce Platform:</span>
                          <span className="cost platform">
                            $
                            {acCommerceCostPerProject.toLocaleString("en-US", {
                              maximumFractionDigits: 0,
                            })}
                          </span>
                        </div>
                        <hr />
                        <div className="breakdown-item highlight">
                          <span>
                            <strong>You Save:</strong>
                          </span>
                          <span className="cost savings">
                            <strong>
                              $
                              {savingsPerProject.toLocaleString("en-US", {
                                maximumFractionDigits: 0,
                              })}
                            </strong>
                          </span>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Tab>

          {/* Charts Tab */}
          <Tab eventKey="charts" title="📈 Charts & Visualization">
            <Card className="chart-card">
              <Card.Body>
                <Row className="mb-5">
                  <Col lg={6} md={12} className="mb-4">
                    <h4 className="chart-title">Cumulative Cost Over Time</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="month"
                          interval={monthsToAnalyze > 12 ? 2 : 0}
                        />
                        <YAxis />
                        <Tooltip
                          formatter={(value) => `$${value.toLocaleString()}`}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="traditional"
                          stroke="#FF6B6B"
                          name="Traditional Method"
                          strokeWidth={2}
                        />
                        <Line
                          type="monotone"
                          dataKey="acCommerce"
                          stroke="#28a745"
                          name="AC-Commerce"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Col>

                  <Col lg={6} md={12} className="mb-4">
                    <h4 className="chart-title">
                      Monthly Savings Accumulation
                    </h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="month"
                          interval={monthsToAnalyze > 12 ? 2 : 0}
                        />
                        <YAxis />
                        <Tooltip
                          formatter={(value) => `$${value.toLocaleString()}`}
                        />
                        <Bar
                          dataKey={(entry) =>
                            entry.traditional - entry.acCommerce
                          }
                          fill="#4ECDC4"
                          name="Monthly Savings"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </Col>
                </Row>

                <Row>
                  <Col lg={6} md={12} className="mb-4">
                    <h4 className="chart-title">
                      Traditional Method Cost Distribution
                    </h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={costDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) =>
                            `${name}: $${value.toLocaleString("en-US", {
                              maximumFractionDigits: 0,
                            })}`
                          }
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {costDistribution.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => `$${value.toLocaleString()}`}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </Col>

                  <Col lg={6} md={12} className="mb-4">
                    <h4 className="chart-title">
                      AC-Commerce Cost Distribution
                    </h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={acCommerceCostDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) =>
                            `${name}: $${value.toLocaleString("en-US", {
                              maximumFractionDigits: 0,
                            })}`
                          }
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {acCommerceCostDistribution.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => `$${value.toLocaleString()}`}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Tab>

          {/* Analysis Tab */}
          <Tab eventKey="analysis" title="🔍 Detailed Analysis">
            <Card className="analysis-card">
              <Card.Body>
                <Row>
                  <Col md={6} className="mb-4">
                    <h4 className="analysis-title">Key Metrics</h4>
                    <div className="metric-list">
                      <div className="metric-item">
                        <strong>Total Projects (Period):</strong>
                        <span>{projectsPerYear}</span>
                      </div>
                      <div className="metric-item">
                        <strong>Average Project Cost (Traditional):</strong>
                        <span>
                          $
                          {traditionalCostPerProject.toLocaleString("en-US", {
                            maximumFractionDigits: 0,
                          })}
                        </span>
                      </div>
                      <div className="metric-item">
                        <strong>Average Project Cost (AC-Commerce):</strong>
                        <span>
                          $
                          {acCommerceCostPerProject.toLocaleString("en-US", {
                            maximumFractionDigits: 0,
                          })}
                        </span>
                      </div>
                      <div className="metric-item">
                        <strong>Cost Per Project Reduction:</strong>
                        <span>{savingsPercentage}%</span>
                      </div>
                      <div className="metric-item highlight">
                        <strong>Total Period Savings:</strong>
                        <span>
                          $
                          {annualSavings.toLocaleString("en-US", {
                            maximumFractionDigits: 0,
                          })}
                        </span>
                      </div>
                      <div className="metric-item highlight">
                        <strong>Payback Period:</strong>
                        <span>{paybackMonths} months</span>
                      </div>
                    </div>
                  </Col>

                  <Col md={6} className="mb-4">
                    <h4 className="analysis-title">
                      Insights & Recommendations
                    </h4>

                    {/* 1 — Per-project savings */}
                    <Alert variant="info">
                      <strong>💡 Per-Project Saving:</strong> Switching to AC-Commerce saves{" "}
                      <strong>
                        $
                        {savingsPerProject.toLocaleString("en-US", {
                          maximumFractionDigits: 0,
                        })}
                      </strong>{" "}
                      per project ({savingsPercentage}% reduction), putting more
                      margin back in every job.
                    </Alert>

                    {/* 2 — Payback risk signal */}
                    <Alert
                      variant={
                        paybackMonths <= 6
                          ? "success"
                          : paybackMonths <= 12
                          ? "warning"
                          : "danger"
                      }
                    >
                      <strong>
                        {paybackMonths <= 6
                          ? "✅ Low-Risk Investment:"
                          : paybackMonths <= 12
                          ? "⚠ Moderate Payback:"
                          : "⏳ Longer Payback:"}
                      </strong>{" "}
                      Break-even in{" "}
                      <strong>{paybackMonths} month{paybackMonths !== 1 ? "s" : ""}</strong>{" "}
                      with a <strong>{roi}% ROI</strong> over{" "}
                      {monthsToAnalyze} months.{" "}
                      {paybackMonths > 12
                        ? "Consider increasing monthly project volume to accelerate returns."
                        : paybackMonths > 6
                        ? "On track — scaling project volume will shorten payback."
                        : "Excellent return profile — prioritise scaling immediately."}
                    </Alert>

                    {/* 3 — Service-type specific tip */}
                    {serviceType === "AC Installation" && (
                      <Alert variant="primary">
                        <strong>🔧 Installation Tip:</strong> AC-Commerce
                        platform pricing typically yields{" "}
                        {(
                          (1 - config.costMultiplier.acCommerce /
                            config.costMultiplier.traditional) *
                          100
                        ).toFixed(0)}
                        % equipment cost reduction vs. traditional procurement
                        for {config.label.toLowerCase()} projects.
                      </Alert>
                    )}
                    {serviceType === "AC Repair" && (
                      <Alert variant="primary">
                        <strong>🔨 Repair Efficiency:</strong> Repair jobs run
                        at ~40% of installation cost. With{" "}
                        {adjustedProjectsPerMonth} adjusted jobs/month your
                        team can handle higher volume without proportional cost
                        growth.
                      </Alert>
                    )}
                    {serviceType === "AC Maintenance" && (
                      <Alert variant="primary">
                        <strong>🗓 Maintenance Volume:</strong> Maintenance
                        contracts have a 3× frequency multiplier — at{" "}
                        {adjustedProjectsPerMonth} visits/month your team
                        maximises recurring revenue at lower per-visit cost.
                      </Alert>
                    )}
                    {serviceType === "Gas Ducted Heating" && (
                      <Alert variant="primary">
                        <strong>🔥 Heating Premium:</strong> Gas ducted heating
                        carries a 1.3× cost factor. AC-Commerce equipment
                        discounts are proportionally larger here — making
                        platform adoption especially impactful.
                      </Alert>
                    )}
                    {serviceType === "Indoor Air Quality" && (
                      <Alert variant="primary">
                        <strong>🌬 IAQ Opportunity:</strong> IAQ work combines
                        high perceived value with moderate cost — your{" "}
                        {savingsPercentage}% margin improvement positions you
                        competitively vs. traditional contractors.
                      </Alert>
                    )}
                    {serviceType === "Smart Control Automation" && (
                      <Alert variant="primary">
                        <strong>🤖 Automation Edge:</strong> Smart control
                        projects have the shortest installation time factor
                        (0.6×). Pair with IoT upsells to compound per-project
                        revenue beyond the base savings shown.
                      </Alert>
                    )}
                    {serviceType === "Electrical Service" && (
                      <Alert variant="primary">
                        <strong>⚡ Electrical Bundling:</strong> Electrical
                        services are often bundled with HVAC installs. Adding
                        this service line on existing projects can absorb team
                        availability without extra mobilisation cost.
                      </Alert>
                    )}

                    {/* 4 — Property-type insight */}
                    {propertyType === "residential-multi" && (
                      <Alert variant="secondary">
                        <strong>🏢 Multi-Unit Advantage:</strong> With{" "}
                        {numberOfUnits} unit{numberOfUnits !== 1 ? "s" : ""}{" "}
                        the bulk coordination overhead (5%) is offset by AC-Commerce                       Commerce's 10% multi-unit platform discount, yielding a
                        net cost advantage over single-unit procurement.
                      </Alert>
                    )}
                    {propertyType === "industrial-commercial" && (
                      <Alert variant="secondary">
                        <strong>🏭 Commercial Maintenance Impact:</strong>{" "}
                        Industrial/commercial properties include ongoing
                        maintenance costs (5% trad → 2% ACC of project value).
                        At this project size that represents a significant
                        recurring saving captured in the figures above.
                      </Alert>
                    )}

                    {/* 5 — Scale opportunity */}
                    {parseFloat(roi) >= 100 && (
                      <Alert variant="success">
                        <strong>📈 Scale Opportunity:</strong> Your ROI exceeds
                        100% — every additional project added per month
                        generates more than $
                        {savingsPerProject.toLocaleString("en-US", {
                          maximumFractionDigits: 0,
                        })}{" "}
                        in incremental savings. Growing project volume is the
                        highest-leverage action available.
                      </Alert>
                    )}
                    {parseFloat(roi) < 50 && projectsPerMonth < 5 && (
                      <Alert variant="warning">
                        <strong>📊 Volume Suggestion:</strong> ROI is
                        relatively low at current volume ({projectsPerMonth}{" "}
                        project{projectsPerMonth !== 1 ? "s" : ""}/month).
                        Increasing throughput to 5+ projects/month will
                        significantly improve your payback curve.
                      </Alert>
                    )}

                    {/* 6 — BTU data source confirmation */}
                    {isFromBTU && (
                      <Alert variant="info">
                        <strong>📐 BTU-Sourced Data:</strong> Equipment costs
                        are based on actual selected units from the BTU
                        Calculator ($
                        {capturedBtuData.equipmentCost?.toLocaleString("en-US", {
                          maximumFractionDigits: 0,
                        })}{" "}
                        equipment, {capturedBtuData.totalBTU?.toLocaleString("de-DE")} BTU
                        total), rather than estimated percentages. This makes
                        the comparison more accurate for this specific project.
                      </Alert>
                    )}

                    {/* 7 — Assumption note */}
                    <Alert variant="light" className="border">
                      <strong>⚠ Assumption Note:</strong> Analysis assumes
                      consistent project volume of {projectsPerMonth}/month,
                      a {teamSize}-person team, and a $99/month platform fee.
                      Actual savings may vary with market pricing and scale.
                    </Alert>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Tab>
        </Tabs>

        {/* Saved Calculations Section */}
        {userInfo && (
          <Card className="saved-calculations-card mt-5">
            <Card.Header className="bg-light">
              <h5 className="mb-0">
                Your Saved Calculations
                {isLoadingSavedCalcs && (
                  <Spinner animation="border" size="sm" className="ms-2" />
                )}
              </h5>
            </Card.Header>
            <Card.Body>
              {savedCalculations.length === 0 ? (
                <p className="text-muted mb-0">
                  No saved calculations yet. Create and save one below!
                </p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm table-hover">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Savings</th>
                        <th>ROI</th>
                        <th>Payback</th>
                        <th>BTU</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {savedCalculations.map((calc) => {
                        const fromBtu =
                          calc.btuProjectData?.totalBTU > 0 ||
                          calc.name?.startsWith("BTU Project:") ||
                          calc.description?.includes("BTU Project:");
                        return (
                        <tr key={calc._id}>
                          <td>{calc.name}</td>
                          <td>
                            $
                            {Number(calc.annualSavings || 0).toLocaleString(
                              "en-US",
                              { maximumFractionDigits: 0 }
                            )}
                          </td>
                          <td>{parseFloat(calc.roi).toFixed(1)}%</td>
                          <td>{calc.paybackMonths} mo</td>
                          <td className="text-center">
                            {fromBtu ? (
                              <span
                                className="badge bg-info"
                                title="Generated from BTU Calculator"
                              >
                                {calc.btuProjectData?.totalBTU
                                  ? `${Number(calc.btuProjectData.totalBTU).toLocaleString("de-DE")} BTU`
                                  : "BTU"}
                              </span>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td>
                            {new Date(calc.createdAt).toLocaleDateString()}
                          </td>
                          <td>
                            <Button
                              size="sm"
                              variant="outline-primary"
                              className="me-2 w-auto roi-action-btn"
                              title="Load calculation"
                              onClick={() => handleLoadCalculation(calc)}
                            >
                              <FaFileUpload />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline-info"
                              className="me-2 w-auto roi-action-btn"
                              title="Download as PDF"
                              onClick={() => handleGenerateSavedReport(calc)}
                            >
                              <FaFilePdf />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline-danger"
                              className="w-auto roi-delete-btn"
                              title="Delete calculation"
                              onClick={() => handleDeleteCalculation(calc._id)}
                            >
                              <FaTrash />
                            </Button>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card.Body>
          </Card>
        )}

        {/* Export/Download Section */}
        <Card className="export-card mt-5">
          <Card.Body className="text-center">
            <h4 className="mb-3">Ready to Get Started?</h4>
            <p className="mb-4">
              Download your personalized ROI report or schedule a demo with our
              team
            </p>
            <Button
              variant="primary"
              size="lg"
              className="me-3 roi-download-btn"
              onClick={handleDownloadReport}
            >
              📥 Download Report
            </Button>
            {userInfo && (
              <Button
                variant="success"
                size="lg"
                className="me-3 roi-save-btn"
                onClick={handleOpenSaveModal}
              >
                💾 Save Calculation
              </Button>
            )}
            {/* <Button
              variant="outline-primary"
              size="lg"
              onClick={handleScheduleDemo}
            >
              📞 Schedule Demo
            </Button> */}
          </Card.Body>
        </Card>

        {/* Authentication Alert */}
        {!userInfo && (
          <Alert variant="info" className="mt-4">
            <strong>💡 Tip:</strong> Sign in to save your ROI calculations and
            track them over time!
          </Alert>
        )}
      </div>

      {/* Save Calculation Modal */}
      <Modal show={showSaveModal} onHide={() => setShowSaveModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Save ROI Calculation</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Calculation Name *</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g., Office Expansion ROI"
                value={saveCalculationName}
                onChange={(e) => setSaveCalculationName(e.target.value)}
                autoFocus
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Add notes about this calculation..."
                value={saveCalculationDescription}
                onChange={(e) => setSaveCalculationDescription(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Tags (comma-separated)</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g., office, 2024, expansion"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </Form.Group>

            <Alert variant="info" className="small">
              <strong>Calculation Summary:</strong>
              <ul className="mb-0 mt-2">
                <li>
                  Annual Savings: $
                  {Number(annualSavings).toLocaleString("en-US", {
                    maximumFractionDigits: 0,
                  })}
                </li>
                <li>ROI: {parseFloat(roi).toFixed(1)}%</li>
                <li>Payback Period: {paybackMonths} month{paybackMonths !== 1 ? "s" : ""}</li>
                <li>Service: {serviceType}</li>
                <li>Property: {config.label}</li>
              </ul>
            </Alert>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSaveModal(false)} className="roi-modal-cancel-btn">
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveCalculation} className="roi-modal-save-btn">
            Save Calculation
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Demo Request Modal */}
      <Modal
        show={showDemoModal}
        onHide={() => setShowDemoModal(false)}
        size="md"
        className="top-modal"
        key={showDemoModal ? "demo-modal-open" : "demo-modal-closed"}
      >
        <Modal.Header closeButton>
          <Modal.Title>Schedule a Demo</Modal.Title>
        </Modal.Header>
        <Modal.Body className="demo-modal-body">
          <p>
            Schedule a demo by filling out the form below or contact our sales
            team at sales@ac-commerce.com
          </p>
          {/* <DemoRequestForm onSuccess={() => setShowDemoModal(false)} /> */}
        </Modal.Body>
      </Modal>
    </div>
  );
}
