import React, { useContext, useState, useEffect, useCallback } from "react";
import { Store } from "../Store";
import { Card, Table, Button, ButtonGroup } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { FaEye, FaPrint } from "react-icons/fa";
import "./Recommendations.css";
import { COMMON_AC_RECOMMENDATIONS } from "./acRecommendationData.js";

export default function Recommendations() {
  const { state } = useContext(Store);
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('All');

  const handlePrint = useCallback(() => {
    const printDate = new Date().toLocaleString();
    const originalTitle = document.title;
    document.title = `HVAC Recommendations - ${printDate}`;
    
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.title = originalTitle;
      }, 100);
    }, 100);
  }, []);

  // Add keyboard shortcut support (Ctrl+P)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        handlePrint();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrint]);

  // Extract BTU/ROI project data
  const btuProject =
    state?.roiData?.currentCalculation?.btuProjectData ||
    state?.btuData?.currentProject ||
    null;

  const perRoomResults =
    Array.isArray(btuProject?.rooms) && btuProject.rooms.length > 0
      ? btuProject.rooms
      : null;

  const recommendedUnits = Array.isArray(btuProject?.recommendedUnits)
    ? btuProject.recommendedUnits
    : [];

  // Helper: safely extract name
  const getName = (obj) =>
    obj?.name ||
    obj?.model ||
    obj?.productName ||
    obj?.type ||
    "—";

  // Helper: safely extract price
  const getPrice = (obj) => {
    const price =
      obj?.price ??
      obj?.cost ??
      obj?.minPrice ??
      obj?.maxPrice ??
      obj?.estimatedCost;

    if (price === undefined || price === null) return "—";

    const num = Number(price);
    if (isNaN(num)) return "—";

    return `$${num.toLocaleString()}`;
  };

  // Helper: get category icon
  const getCategoryIcon = (category) => {
    const icons = {
      'Indoor Unit': '❄️',
      'Outdoor Unit': '🔧',
      'Mounting': '🔩',
      'Refrigerant Piping': '🔄',
      'Drainage': '💧',
      'Electrical': '⚡',
      'Accessories': '🛠️',
      'Consumables': '🧰',
      'Spare Parts': '⚙️'
    };
    return icons[category] || '📦';
  };

  // Analyze calculated products to determine relevant recommendation categories
  const getRelevantCategories = () => {
    if (!btuProject) return new Set(); // No calculations → show nothing

    const categories = new Set();
    
    // Check for condensers in recommendedUnits
    const hasCondenser = recommendedUnits.some(unit => {
      const name = getName(unit).toLowerCase();
      return name.includes('condenser') || name.includes('outdoor') || unit.flatName;
    });
    
    // Check for indoor units (split AC, cassette, etc.)
    const hasIndoorUnits = recommendedUnits.some(unit => {
      const name = getName(unit).toLowerCase();
      return name.includes('split') || name.includes('cassette') || 
             name.includes('wall') || name.includes('indoor') ||
             name.includes('ducted') || name.includes('ac') || 
             !name.includes('condenser'); // Most units without "condenser" are indoor
    });

    // Always include these if ANY HVAC products exist
    if (recommendedUnits.length > 0 || (perRoomResults && perRoomResults.length > 0)) {
      categories.add('Refrigerant Piping');
      categories.add('Drainage');
      categories.add('Electrical');
      categories.add('Accessories');
      categories.add('Consumables');
      categories.add('Spare Parts');
    }

    // Add condenser-specific categories
    if (hasCondenser) {
      categories.add('Outdoor Unit');
      categories.add('Mounting');
    }

    // Add indoor unit categories
    if (hasIndoorUnits) {
      categories.add('Indoor Unit');
    }

    return categories;
  };

  // Get detected system types for display
  const getDetectedSystems = () => {
    if (!btuProject) return [];
    
    const systems = [];
    
    // Check perRoomResults (includes condensers) if available
    if (perRoomResults && perRoomResults.length > 0) {
      const indoorRooms = perRoomResults.filter(room => {
        const roomName = room.name?.toLowerCase() || '';
        const productIsCondenser = room.product?.isCondenser === true;
        return !roomName.includes('condenser') && !productIsCondenser;
      });

      const condenserRooms = perRoomResults.filter(room => {
        const roomName = room.name?.toLowerCase() || '';
        const productIsCondenser = room.product?.isCondenser === true;
        return roomName.includes('condenser') || productIsCondenser;
      });

      if (indoorRooms.length > 0) {
        systems.push({ name: 'Indoor Units', icon: '❄️', count: indoorRooms.length });
      }
      
      if (condenserRooms.length > 0) {
        systems.push({ name: 'Outdoor Condensers', icon: '🔧', count: condenserRooms.length });
      }
    } else {
      // Fallback to recommendedUnits if perRoomResults not available
      const indoorUnits = recommendedUnits.filter(unit => {
        const name = getName(unit).toLowerCase();
        return !(name.includes('condenser') || name.includes('outdoor') || unit.flatName);
      });

      const outdoorUnits = recommendedUnits.filter(unit => {
        const name = getName(unit).toLowerCase();
        return name.includes('condenser') || name.includes('outdoor') || unit.flatName;
      });

      if (indoorUnits.length > 0) {
        systems.push({ name: 'Indoor Units', icon: '❄️', count: indoorUnits.length });
      }
      
      if (outdoorUnits.length > 0) {
        systems.push({ name: 'Outdoor Condensers', icon: '🔧', count: outdoorUnits.length });
      }
    }
    
    // Check for VRF system
    const hasVRF = recommendedUnits.some(unit => {
      const name = getName(unit).toLowerCase();
      return name.includes('vrf') || name.includes('multi');
    }) || (perRoomResults && perRoomResults.length > 5);
    
    if (hasVRF) {
      systems.push({ name: 'VRF/Multi-Split System', icon: '🏢', count: null });
    }
    
    return systems;
  };

  const relevantCategories = getRelevantCategories();
  const detectedSystems = getDetectedSystems();
  
  // Filter recommendations based on selected category
  const getFilteredRecommendations = () => {
    const baseFiltered = relevantCategories.size > 0
      ? COMMON_AC_RECOMMENDATIONS.filter(item => relevantCategories.has(item.category))
      : COMMON_AC_RECOMMENDATIONS;
    
    if (selectedCategory === 'All') {
      return baseFiltered;
    }
    
    return baseFiltered.filter(item => item.category === selectedCategory);
  };

  const filteredRecommendations = getFilteredRecommendations();

  return (
    <div className="recommendations-page-container">
      {/* Page Header */}
      <div className="recommendations-header" style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: '#fff',
        padding: '2.5rem 2rem',
        borderRadius: '16px',
        marginBottom: '2rem',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
      }}>
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
          <div>
            <h1 style={{ 
              fontSize: '2.25rem', 
              fontWeight: '700', 
              marginBottom: '0.5rem',
              textShadow: '2px 2px 4px rgba(0,0,0,0.2)'
            }}>
              🎯 HVAC System Recommendations
            </h1>
            <p style={{ 
              fontSize: '1.1rem', 
              marginBottom: '0',
              opacity: 0.95
            }}>
              Complete installation guide with product recommendations and required accessories
            </p>
            {/* Print-only metadata */}
            <div className="print-only-info" style={{ display: 'none' }}>
              <p style={{ marginTop: '0.75rem', fontSize: '0.9rem', opacity: 0.9 }}>
                <strong>Generated:</strong> {new Date().toLocaleString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric', 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
              <p style={{ fontSize: '0.85rem', opacity: 0.85, margin: '0.25rem 0 0 0' }}>
                AC Commerce - Professional HVAC Solutions | www.accommerce.com
              </p>
            </div>
          </div>
          <div className="d-flex gap-2">
            <Button 
              variant="light" 
              onClick={() => navigate('/measurement')}
              style={{
                fontWeight: '600',
                padding: '0.6rem 1.2rem',
                borderRadius: '8px'
              }}
            >
              ← Back to Measurement
            </Button>
            <Button 
              variant="light" 
              onClick={handlePrint}
              style={{
                fontWeight: '600',
                padding: '0.6rem 1.2rem',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
              title="Print recommendations"
            >
              <FaPrint /> Print
            </Button>
          </div>
        </div>
      </div>

      {/* ============================
          SYSTEM SUMMARY
      ============================= */}
      {btuProject && (
        <Card className="recommendations-card" style={{ backgroundColor: '#f8f9fa' }}>
          <Card.Body>
            <Card.Title className="card-title">
              🏗️ System Summary
            </Card.Title>
            <div className="row g-3">
              <div className="col-lg-3 col-md-6">
                <div className="p-3 rounded" style={{ background: 'rgba(255,255,255,0.1)' }}>
                  <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>Total BTU</div>
                  <div className="text-primary" style={{ fontSize: '1.75rem', fontWeight: '700' }}>
                    {btuProject.totalBTU?.toLocaleString() || 'N/A'}
                  </div>
                </div>
              </div>
              <div className="col-lg-3 col-md-6">
                <div className="p-3 rounded" style={{ background: 'rgba(255,255,255,0.1)' }}>
                  <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>Total Area</div>
                  <div className="text-primary" style={{ fontSize: '1.75rem', fontWeight: '700' }}>
                    {btuProject.totalSquareFootage ? `${btuProject.totalSquareFootage} m²` : 'N/A'}
                  </div>
                </div>
              </div>
              <div className="col-lg-3 col-md-6">
                <div className="p-3 rounded" style={{ background: 'rgba(255,255,255,0.1)' }}>
                  <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>Rooms</div>
                  <div className="text-primary" style={{ fontSize: '1.75rem', fontWeight: '700' }}>
                    {btuProject.numberOfRooms || 'N/A'}
                  </div>
                </div>
              </div>
              <div className="col-lg-3 col-md-6">
                <div className="p-3 rounded" style={{ background: 'rgba(255,255,255,0.1)' }}>
                  <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>Units</div>
                  <div className="text-primary" style={{ fontSize: '1.75rem', fontWeight: '700' }}>
                    {perRoomResults ? perRoomResults.length : (recommendedUnits.length || 'N/A')}
                  </div>
                </div>
              </div>
            </div>
            
            {detectedSystems.length > 0 && (
              <div className="mt-4 pt-3 border-top">
                <div style={{ fontSize: '0.95rem', marginBottom: '0.75rem', fontWeight: '600' }}>
                  🔍 Detected Systems:
                </div>
                <div className="d-flex flex-wrap gap-2">
                  {detectedSystems.map((sys, idx) => (
                    <div 
                      key={idx}
                      className="badge bg-info text-dark"
                      style={{ 
                        fontSize: '0.95rem', 
                        padding: '0.6rem 1.2rem',
                        fontWeight: '500'
                      }}
                    >
                      <span style={{ marginRight: '0.5rem' }}>{sys.icon}</span>
                      {sys.name}
                      {sys.count && <span className="ms-1">({sys.count})</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {btuProject.estimatedProjectCost && (
              <div className="mt-4 pt-3 border-top">
                <div style={{ fontSize: '0.95rem', marginBottom: '0.5rem', fontWeight: '600' }}>
                  💰 Estimated Project Cost:
                </div>
                <div className="text-success" style={{ fontSize: '2rem', fontWeight: '700' }}>
                  ${btuProject.estimatedProjectCost.toLocaleString()}
                </div>
              </div>
            )}
          </Card.Body>
        </Card>
      )}

      {/* ============================
          CALCULATED RECOMMENDATIONS
      ============================= */}
      <Card className="recommendations-card">
        <Card.Body>
          <Card.Title className="card-title">
            ❄️ AC Unit Recommendations (Calculated)
          </Card.Title>

          {/* --- Per-room results table --- */}
          {perRoomResults ? (
            <Table
              className="recommendations-table"
              striped
              bordered
              hover
              responsive
            >
              <thead>
                <tr>
                  <th>Room</th>
                  <th>Room Size</th>
                  <th>Room BTU</th>
                  <th>Optimal Product</th>
                  <th>Product BTU</th>
                  <th>Product Price ($)</th>
                  <th>Product Model</th>
                  <th>View</th>
                </tr>
              </thead>
              <tbody>
                {perRoomResults.map((room, idx) => {
                  // fallback: if room.product doesn't exist, use room itself
                  const product = room.product || room;

                  return (
                    <tr key={idx}>
                      <td>{room.name || `Room ${idx + 1}`}</td>
                      <td>{room.size}</td>
                      <td>{room.btu}</td>
                      <td>{getName(product)}</td>
                      <td>{product.btu || "—"}</td>
                      <td>{getPrice(product)}</td>
                      <td>{product.model || product.name || "—"}</td>
                      <td style={{ textAlign: 'center' }}>
                        {product.slug ? (
                          <a
                            href={`/product/${product.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: '1.2rem', color: '#0d6efd' }}
                            title="View product details"
                          >
                            <FaEye />
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          ) : recommendedUnits.length === 0 ? (
            <div className="recommendations-empty">
              <strong>No recommendations available</strong>
              <p style={{ marginTop: '0.5rem', fontSize: '0.95rem' }}>
                Please complete a BTU or ROI calculation first.
              </p>
            </div>
          ) : (
            /* --- Recommended units table --- */
            <Table
              className="recommendations-table"
              striped
              bordered
              hover
              responsive
            >
              <thead>
                <tr>
                  <th>Name</th>
                  <th>BTU</th>
                  <th>Price</th>
                  <th>Quantity</th>
                </tr>
              </thead>
              <tbody>
                {recommendedUnits.map((unit, idx) => (
                  <tr key={idx}>
                    <td>{getName(unit)}</td>
                    <td>{unit.btu || "—"}</td>
                    <td>{getPrice(unit)}</td>
                    <td>{unit.quantity || 1}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* ============================
          COMMON AC PARTS
      ============================= */}
      {filteredRecommendations.length > 0 && (
        <Card className="recommendations-card">
          <Card.Body>
            <Card.Title className="card-title">
              {relevantCategories.size > 0 
                ? "🛠️ Recommended Installation Parts & Accessories" 
                : "🛠️ Common AC Installations & Spare Parts"}
            </Card.Title>
            {relevantCategories.size > 0 && (
              <div className="mb-4 category-filter-section">
                <p className="text-muted mb-3">
                  <strong>📁 Filter by category:</strong> Click on a category below to view specific recommendations.
                </p>
                <ButtonGroup className="d-flex flex-wrap gap-2">
                  <Button
                    key="all"
                    variant={selectedCategory === 'All' ? 'primary' : 'outline-primary'}
                    onClick={() => setSelectedCategory('All')}
                  >
                    All Categories ({COMMON_AC_RECOMMENDATIONS.filter(item => relevantCategories.has(item.category)).length})
                  </Button>
                  {Array.from(relevantCategories).map((cat, idx) => {
                    const count = COMMON_AC_RECOMMENDATIONS.filter(item => item.category === cat).length;
                    const icon = getCategoryIcon(cat);
                    return (
                      <Button
                        key={idx}
                        variant={selectedCategory === cat ? 'primary' : 'outline-primary'}
                        onClick={() => setSelectedCategory(cat)}
                      >
                        <span style={{ marginRight: '0.5rem' }}>{icon}</span>
                        {cat} ({count})
                      </Button>
                    );
                  })}
                </ButtonGroup>
                {selectedCategory !== 'All' && (
                  <div className="mt-3" style={{ 
                    textAlign: 'center',
                    padding: '0.75rem',
                    background: 'rgba(13, 110, 253, 0.1)',
                    borderRadius: '8px',
                    border: '1px solid rgba(13, 110, 253, 0.2)'
                  }}>
                    <small style={{ color: '#0d6efd', fontWeight: '600', fontSize: '0.9rem' }}>
                      ✓ Showing {filteredRecommendations.length} items in "{selectedCategory}"
                    </small>
                  </div>
                )}
              </div>
            )}

            <Table
              className="recommendations-table"
              striped
              bordered
              hover
              responsive
            >
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Typical Use</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecommendations.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <span style={{ marginRight: '0.5rem' }}>{getCategoryIcon(item.category)}</span>
                      {item.category}
                    </td>
                    <td><strong>{item.name}</strong></td>
                    <td>{item.description}</td>
                    <td>{item.typicalUse}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}

      {/* Page Footer */}
      {btuProject && (
        <div className="recommendations-footer" style={{
          marginTop: '3rem',
          padding: '2rem',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          borderRadius: '16px',
          textAlign: 'center'
        }}>
          <h4 style={{ 
            color: '#1a3c5e', 
            fontWeight: '700', 
            marginBottom: '1rem',
            fontSize: '1.5rem'
          }}>
            🎉 Ready to Get Started?
          </h4>
          <p style={{ 
            color: '#495057', 
            fontSize: '1.05rem',
            marginBottom: '1.5rem',
            maxWidth: '700px',
            margin: '0 auto 1.5rem'
          }}>
            All recommended products and accessories are available in our marketplace. 
            Browse products, compare prices, and connect with certified HVAC service providers.
          </p>
          <div className="d-flex justify-content-center gap-3 flex-wrap">
            <Button 
              variant="primary" 
              size="lg"
              onClick={() => navigate('/search')}
              style={{
                padding: '0.75rem 2rem',
                fontWeight: '600',
                borderRadius: '10px',
                boxShadow: '0 4px 15px rgba(13, 110, 253, 0.3)'
              }}
            >
              🛍️ Browse Products
            </Button>
            <Button 
              variant="outline-primary" 
              size="lg"
              onClick={() => navigate('/roi-calculator')}
              style={{
                padding: '0.75rem 2rem',
                fontWeight: '600',
                borderRadius: '10px'
              }}
            >
              📊 Calculate ROI
            </Button>
            <Button 
              variant="outline-secondary" 
              size="lg"
              onClick={() => navigate('/measurement')}
              style={{
                padding: '0.75rem 2rem',
                fontWeight: '600',
                borderRadius: '10px'
              }}
            >
              📏 New Measurement
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}