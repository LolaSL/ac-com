import React from 'react';
import { Card } from 'react-bootstrap';
import { getName } from './productHelpers';

export default function DetectedSystems({ btuProject, perRoomResults, recommendedUnits }) {
  if (!btuProject) return null;

  // Get detected system types for display
  const getDetectedSystems = () => {
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
    } else if (recommendedUnits) {
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
    const hasVRF = (recommendedUnits && recommendedUnits.some(unit => {
      const name = getName(unit).toLowerCase();
      return name.includes('vrf') || name.includes('multi');
    })) || (perRoomResults && perRoomResults.length > 5);
    
    if (hasVRF) {
      systems.push({ name: 'VRF/Multi-Split System', icon: '🏢', count: null });
    }
    
    return systems;
  };

  const detectedSystems = getDetectedSystems();

  if (detectedSystems.length === 0) return null;

  return (
    <Card className="recommendations-card" style={{ marginBottom: '2rem' }}>
      <Card.Body>
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
      </Card.Body>
    </Card>
  );
}
