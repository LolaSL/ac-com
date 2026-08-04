import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Table, Button, ButtonGroup } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaEye } from 'react-icons/fa';
import { getName, getCategoryIcon } from './productHelpers';
import { COMMON_AC_RECOMMENDATIONS } from '../acRecommendationData.js';

export default function InstallationAccessories({ perRoomResults, recommendedUnits }) {
  const { t } = useTranslation();
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
      {t("recommendations.installationAccessories.allCategories")} ({totalRelevantCount})
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
              <h2 className="insta-mobile-drawer__title">{t("recommendations.installationAccessories.filterDrawerTitle")}</h2>
              <button
                type="button"
                className="insta-mobile-drawer__close"
                onClick={() => setShowMobileFilters(false)}
              >
                {t("recommendations.installationAccessories.close")}
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
            ? t("recommendations.installationAccessories.titleFiltered")
            : t("recommendations.installationAccessories.titleDefault")}
        </Card.Title>
        {relevantCategories.size > 0 && (
          <div className="mb-4 category-filter-section">
            <p className="text-muted mb-3">
              <strong>{t("recommendations.installationAccessories.filterHint")}</strong>
            </p>
            <div className="insta-mobile-toolbar">
              <div className="insta-mobile-toolbar__summary">
                {selectedCategory === 'All'
                  ? `${t("recommendations.installationAccessories.allCategories")} (${totalRelevantCount})`
                  : `${selectedCategory} (${filteredRecommendations.length})`}
              </div>
              <button
                type="button"
                className="insta-mobile-filter-btn"
                onClick={() => setShowMobileFilters(true)}
              >
                {t("recommendations.installationAccessories.filters")}
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
                  {t("recommendations.installationAccessories.showing", { count: filteredRecommendations.length, category: selectedCategory })}
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
              <th>{t("recommendations.installationAccessories.table.category")}</th>
              <th>{t("recommendations.installationAccessories.table.name")}</th>
              <th>{t("recommendations.installationAccessories.table.description")}</th>
              <th>{t("recommendations.installationAccessories.table.typicalUse")}</th>
              <th>{t("recommendations.installationAccessories.table.view")}</th>
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
                    title={t("recommendations.installationAccessories.viewCategoryTitle", { category: item.category })}
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
