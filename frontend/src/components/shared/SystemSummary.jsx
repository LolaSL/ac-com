import React from 'react';
import { Card } from 'react-bootstrap';

export default function SystemSummary({ btuProject, perRoomResults, recommendedUnits }) {
  if (!btuProject) return null;

  return (
    <Card className="recommendations-card" style={{ backgroundColor: '#f8f9fa', marginBottom: '2rem' }}>
      <Card.Body>
        <Card.Title className="card-title" style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem' }}>
          🏗️ System Summary
        </Card.Title>
        <div className="row g-3">
          <div className="col-lg-3 col-md-6">
            <div className="p-3 rounded" style={{ background: 'rgba(102, 126, 234, 0.1)', border: '1px solid rgba(102, 126, 234, 0.2)' }}>
              <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '0.5rem' }}>Total BTU</div>
              <div className="text-primary" style={{ fontSize: '1.75rem', fontWeight: '700' }}>
                {btuProject.totalBTU?.toLocaleString() || 'N/A'}
              </div>
            </div>
          </div>
          <div className="col-lg-3 col-md-6">
            <div className="p-3 rounded" style={{ background: 'rgba(102, 126, 234, 0.1)', border: '1px solid rgba(102, 126, 234, 0.2)' }}>
              <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '0.5rem' }}>Total Area</div>
              <div className="text-primary" style={{ fontSize: '1.75rem', fontWeight: '700' }}>
                {btuProject.totalSquareFootage ? `${btuProject.totalSquareFootage} m²` : 'N/A'}
              </div>
            </div>
          </div>
          <div className="col-lg-3 col-md-6">
            <div className="p-3 rounded" style={{ background: 'rgba(102, 126, 234, 0.1)', border: '1px solid rgba(102, 126, 234, 0.2)' }}>
              <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '0.5rem' }}>Rooms</div>
              <div className="text-primary" style={{ fontSize: '1.75rem', fontWeight: '700' }}>
                {btuProject.numberOfRooms || 'N/A'}
              </div>
            </div>
          </div>
          <div className="col-lg-3 col-md-6">
            <div className="p-3 rounded" style={{ background: 'rgba(102, 126, 234, 0.1)', border: '1px solid rgba(102, 126, 234, 0.2)' }}>
              <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '0.5rem' }}>Units</div>
              <div className="text-primary" style={{ fontSize: '1.75rem', fontWeight: '700' }}>
                {perRoomResults ? perRoomResults.length : (recommendedUnits?.length || 'N/A')}
              </div>
            </div>
          </div>
        </div>
        
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
  );
}
