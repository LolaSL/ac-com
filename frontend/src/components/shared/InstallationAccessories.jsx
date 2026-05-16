import React, { useState } from 'react';
import { Card, Table, Button, ButtonGroup } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaEye } from 'react-icons/fa';
import { getName, getCategoryIcon } from './productHelpers';
import { COMMON_AC_RECOMMENDATIONS } from '../acRecommendationData.js';

export default function InstallationAccessories({ perRoomResults, recommendedUnits }) {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Analyze calculated products to determine relevant recommendation categories
  const getRelevantCategories = () => {
    const categories = new Set();
    
    if (!perRoomResults && (!recommendedUnits || recommendedUnits.length === 0)) {
      return categories;
    }
    
    // Check for condensers in recommendedUnits
    const hasCondenser = recommendedUnits && recommendedUnits.some(unit => {
      const name = getName(unit).toLowerCase();
      return name.includes('condenser') || name.includes('outdoor') || unit.flatName;
    });
    
    // Check for indoor units (split AC, cassette, etc.)
    const hasIndoorUnits = recommendedUnits && recommendedUnits.some(unit => {
      const name = getName(unit).toLowerCase();
      return name.includes('split') || name.includes('cassette') || 
             name.includes('wall') || name.includes('indoor') ||
             name.includes('ducted') || name.includes('ac') || 
             !name.includes('condenser');
    });

    // Always include these if ANY HVAC products exist
    if ((recommendedUnits && recommendedUnits.length > 0) || (perRoomResults && perRoomResults.length > 0)) {
      categories.add('Refrigerant Piping');
      categories.add('Drainage');
      categories.add('Electrical');
      categories.add('Accessories');
      categories.add('Consumables');
      categories.add('Spare Parts');
      categories.add('Controller');
      categories.add('Filters');
      categories.add('Power Cords');
    }

    // Add condenser-specific categories
    if (hasCondenser) {
      categories.add('Mounting');
      categories.add('Fan Motor');
      categories.add('Fans');
    }

    // Add indoor unit categories
    if (hasIndoorUnits) {
      categories.add('Knobs');
    }

    return categories;
  };

  const relevantCategories = getRelevantCategories();
  
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
  const totalRelevantCount = COMMON_AC_RECOMMENDATIONS.filter(item => relevantCategories.has(item.category)).length;

  const allCategoriesButton = (
    <Button
      key="all"
      variant="light"
      className={`insta-filter-btn${selectedCategory === 'All' ? ' insta-filter-btn--active' : ''}`}
      onClick={() => {
        setSelectedCategory('All');
        setShowMobileFilters(false);
      }}
    >
      All Categories ({totalRelevantCount})
    </Button>
  );

  const categoryButtons = Array.from(relevantCategories).map((cat, idx) => {
    const count = COMMON_AC_RECOMMENDATIONS.filter(item => item.category === cat).length;
    const icon = getCategoryIcon(cat);
    return (
      <Button
        key={idx}
        variant="light"
        className={`insta-filter-btn${selectedCategory === cat ? ' insta-filter-btn--active' : ''}`}
        onClick={() => {
          setSelectedCategory(cat);
          setShowMobileFilters(false);
        }}
      >
        <span style={{ marginRight: '0.5rem' }}>{icon}</span>
        {cat} ({count})
      </Button>
    );
  });

  if (filteredRecommendations.length === 0) return null;

  return (
    <>
      {showMobileFilters && (
        <div
          className="insta-mobile-overlay"
          onClick={() => setShowMobileFilters(false)}
        >
          <div
            className="insta-mobile-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="insta-mobile-drawer__header">
              <h2 className="insta-mobile-drawer__title">Filter Categories</h2>
              <button
                type="button"
                className="insta-mobile-drawer__close"
                onClick={() => setShowMobileFilters(false)}
              >
                Close
              </button>
            </div>
            <div className="insta-mobile-drawer__body">
              <div className="insta-mobile-button-group">
                {allCategoriesButton}
                {categoryButtons}
              </div>
            </div>
          </div>
        </div>
      )}
    <Card className="recommendations-card common-parts-section" style={{ marginTop: '2rem' }}>
      <Card.Body>
        <Card.Title className="card-title" style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem' }}>
          {relevantCategories.size > 0 
            ? "🛠️ Recommended Installation Parts & Accessories" 
            : "🛠️ Common AC Installations & Spare Parts"}
        </Card.Title>
        {relevantCategories.size > 0 && (
          <div className="mb-4 category-filter-section">
            <p className="text-muted mb-3">
              <strong>📁 Filter by category:</strong> Click on a category below to view specific recommendations.
            </p>
            <div className="insta-mobile-toolbar">
              <div className="insta-mobile-toolbar__summary">
                {selectedCategory === 'All'
                  ? `All Categories (${totalRelevantCount})`
                  : `${selectedCategory} (${filteredRecommendations.length})`}
              </div>
              <button
                type="button"
                className="insta-mobile-filter-btn"
                onClick={() => setShowMobileFilters(true)}
              >
                Filters
              </button>
            </div>
            <ButtonGroup className="flex-wrap gap-2 insta-desktop-button-group">
              {allCategoriesButton}
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

        {selectedCategory !== 'All' && (
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
              <th>View</th>
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
                <td style={{ textAlign: 'center' }}>
                  <Link
                    to={`/search?category=${encodeURIComponent(item.category)}&query=all&price=all&rating=all&order=newest&page=1`}
                    title={`View ${item.category} products`}
                    style={{ color: '#0d6efd', fontSize: '1.1rem' }}
                  >
                    <FaEye />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
        )}
      </Card.Body>
    </Card>
    </>
  );
}
