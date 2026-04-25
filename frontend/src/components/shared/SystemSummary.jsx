import React, { useState } from 'react';
import { Card } from 'react-bootstrap';

// Default: ~8 hours/day cooling, average US electricity rate
const DEFAULT_HOURS_PER_DAY = 8;
const DEFAULT_RATE_PER_KWH = 0.12;
const DEFAULT_SEER = 14; // Fallback if product has no energyEfficiency

function calcMonthlyCost(btu, seer, hoursPerDay, ratePerKwh) {
  // Power in kW = BTU/h ÷ (SEER × 1000)
  // SEER = BTU/h per Watt, so Watts = BTU / SEER, kW = BTU / (SEER * 1000)
  const kw = btu / (seer * 1000);
  return kw * hoursPerDay * 30 * ratePerKwh;
}

export default function SystemSummary({ btuProject, perRoomResults, recommendedUnits }) {
  const [electricityRate, setElectricityRate] = useState(DEFAULT_RATE_PER_KWH);
  const [hoursPerDay, setHoursPerDay] = useState(DEFAULT_HOURS_PER_DAY);

  if (!btuProject) return null;

  // Calculate total product sum from all rooms
  const totalProductSum = perRoomResults?.reduce((sum, room) => {
    const productPrice = room.product?.price || 0;
    const condenserPrice = room.condenser?.price || 0;
    return sum + productPrice + condenserPrice;
  }, 0) || 0;

  // const projectCost = Number(btuProject.estimatedProjectCost || 0);
  // const multiplier = totalProductSum > 0 ? projectCost / totalProductSum : 0;
  // const equipmentCost = Number(btuProject.equipmentCost || 0);
  // const projectFactor =
  //   btuProject.propertyType === 'residential-single'
  //     ? 0.2
  //     : btuProject.propertyType === 'residential-multi'
  //       ? 0.25
  //       : 0.3;

  return (
    <Card className="recommendations-card" style={{ backgroundColor: '#f8f9fa', marginBottom: '2rem' }}>
      <Card.Body>
        <Card.Title className="card-title" style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem' }}>
          🏗️ System Summary
        </Card.Title>
        <div className="row g-3">
            <div className="col-xl col-lg-4 col-md-6">
            <div className="p-3 rounded" style={{ background: 'rgba(102, 126, 234, 0.1)', border: '1px solid rgba(102, 126, 234, 0.2)' }}>
              <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '0.5rem' }}>Rooms</div>
              <div className="text-primary" style={{ fontSize: '1.75rem', fontWeight: '700' }}>
                {btuProject.numberOfRooms || 'N/A'}
              </div>
            </div>
          </div>
            <div className="col-xl col-lg-4 col-md-6">
            <div className="p-3 rounded" style={{ background: 'rgba(102, 126, 234, 0.1)', border: '1px solid rgba(102, 126, 234, 0.2)' }}>
              <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '0.5rem' }}>Total Area</div>
              <div className="text-primary" style={{ fontSize: '1.75rem', fontWeight: '700' }}>
                {btuProject.totalSquareFootage ? `${Number(btuProject.totalSquareFootage).toFixed(2)} m²` : 'N/A'}
              </div>
            </div>
          </div>
          <div className="col-xl col-lg-4 col-md-6">
            <div className="p-3 rounded" style={{ background: 'rgba(102, 126, 234, 0.1)', border: '1px solid rgba(102, 126, 234, 0.2)' }}>
              <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '0.5rem' }}>Total BTU</div>
              <div className="text-primary" style={{ fontSize: '1.75rem', fontWeight: '700' }}>
                {btuProject.totalBTU?.toLocaleString() || 'N/A'}
              </div>
            </div>
          </div>
        
        
          <div className="col-xl col-lg-4 col-md-6">
            <div className="p-3 rounded" style={{ background: 'rgba(102, 126, 234, 0.1)', border: '1px solid rgba(102, 126, 234, 0.2)' }}>
              <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '0.5rem' }}>Units</div>
              <div className="text-primary" style={{ fontSize: '1.75rem', fontWeight: '700' }}>
                {perRoomResults ? perRoomResults.length : (recommendedUnits?.length || 'N/A')}
              </div>
            </div>
          </div>
          <div className="col-xl col-lg-4 col-md-6">
            <div className="p-3 rounded" style={{ background: 'rgba(40, 199, 111, 0.1)', border: '1px solid rgba(40, 199, 111, 0.2)' }}>
              <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '0.5rem' }}>Total Product Sum</div>
              <div className="text-success" style={{ fontSize: '1.75rem', fontWeight: '700' }}>
                ${totalProductSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>
        
        {/* {btuProject.estimatedProjectCost && (
          <div className="mt-4 pt-3 border-top">
            <p style={{ fontSize: '0.95rem', marginBottom: '0.75rem', opacity: 0.9, lineHeight: 1.6 }}>
              This estimated project cost is generated from the BTU project before ROI is calculated. It is a broader project estimate than the product-only total, and the ROI calculator uses this same value as the Average Project Value.
            </p>
            {equipmentCost > 0 && (
              <p style={{ fontSize: '0.95rem', marginBottom: '0.75rem', opacity: 0.95, lineHeight: 1.6 }}>
                BTU calculator formula used: equipment cost ${equipmentCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} divided by {projectFactor} = ${projectCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}. Project type: {btuProject.propertyType || 'custom'}. Compared with the visible product-only total, this estimate is about {multiplier.toFixed(2)}x higher because it represents a broader install budget, not just the listed units.
              </p>
            )}
            <div style={{ fontSize: '0.95rem', marginBottom: '0.5rem', fontWeight: '600' }}>
              💰 Estimated Project Cost:
            </div>
            <div className="text-success" style={{ fontSize: '2rem', fontWeight: '700' }}>
              ${btuProject.estimatedProjectCost.toLocaleString()}
            </div>
          </div>
        )} */}

        {/* Energy Cost Estimator */}
        {perRoomResults && perRoomResults.length > 0 && (() => {
          const roomCosts = perRoomResults
            .filter(r => r.btu && !r.isCondenser && r.product && !r.product.isCondenser)
            .map(r => {
              const seer = r.product?.energyEfficiency || DEFAULT_SEER;
              const monthly = calcMonthlyCost(r.btu, seer, hoursPerDay, electricityRate);
              return { name: r.name, btu: r.btu, seer, monthly };
            });

          // Number duplicate room names
          const nameCounts = {};
          roomCosts.forEach(r => { nameCounts[r.name] = (nameCounts[r.name] || 0) + 1; });
          const nameIdx = {};
          roomCosts.forEach(r => {
            if (nameCounts[r.name] > 1) {
              nameIdx[r.name] = (nameIdx[r.name] || 0) + 1;
              r.displayName = `${r.name} ${nameIdx[r.name]}`;
            } else {
              r.displayName = r.name;
            }
          });

          const totalMonthly = Math.round(roomCosts.reduce((sum, r) => sum + r.monthly, 0) * 100) / 100;
          const totalAnnual = Math.round(totalMonthly * 12 * 100) / 100;

          return (
            <div className="mt-4 pt-3 border-top">
              <div style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '1rem' }}>
                ⚡ Energy Cost Estimator
              </div>
              <div className="row g-2 mb-3">
                <div className="col-auto">
                  <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '2px' }}>
                    Electricity Rate ($/kWh)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="1"
                    value={electricityRate}
                    onChange={(e) => setElectricityRate(Math.max(0.01, parseFloat(e.target.value) || 0.01))}
                    style={{
                      width: '100px', padding: '4px 8px', borderRadius: '6px',
                      border: '1px solid #ccc', fontSize: '0.9rem',
                    }}
                  />
                </div>
                <div className="col-auto">
                  <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '2px' }}>
                    Daily Usage (hours)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max="24"
                    value={hoursPerDay}
                    onChange={(e) => setHoursPerDay(Math.min(24, Math.max(1, parseInt(e.target.value) || 1)))}
                    style={{
                      width: '80px', padding: '4px 8px', borderRadius: '6px',
                      border: '1px solid #ccc', fontSize: '0.9rem',
                    }}
                  />
                </div>
              </div>

              <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #dee2e6', background: 'rgba(102, 126, 234, 0.1)' }}>
                    <th style={{ padding: '6px 8px', textAlign: 'left', color: '#1a1a2e', fontWeight: '700' }}>Room</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right', color: '#1a1a2e', fontWeight: '700' }}>BTU</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right', color: '#1a1a2e', fontWeight: '700' }}>SEER</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right', color: '#1a1a2e', fontWeight: '700' }}>Monthly Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {roomCosts.map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '5px 8px' }}>{r.displayName}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right' }}>{r.btu.toLocaleString()}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right' }}>{r.seer}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: '600' }}>
                        ${r.monthly.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="row g-3 mt-2">
                <div className="col-sm-6">
                  <div className="p-3 rounded" style={{ background: 'rgba(255, 159, 67, 0.1)', border: '1px solid rgba(255, 159, 67, 0.3)' }}>
                    <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>Est. Monthly Cost</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#e67e22' }}>
                      ${totalMonthly.toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className="col-sm-6">
                  <div className="p-3 rounded" style={{ background: 'rgba(255, 107, 107, 0.1)', border: '1px solid rgba(255, 107, 107, 0.3)' }}>
                    <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>Est. Annual Cost</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#e74c3c' }}>
                      ${totalAnnual.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </Card.Body>
    </Card>
  );
}
