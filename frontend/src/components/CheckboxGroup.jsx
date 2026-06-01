import React from "react";
import { Form, OverlayTrigger, Tooltip } from "react-bootstrap";
import "./CheckboxGroup.css";

const CheckboxGroup = ({ title, name, options, onChange, labels, tooltips }) => {
  const safeOptions = options || {};
  const groupId = name || title || "group";

  return (
    <div className="checkbox-group">
      <h3>{title}</h3>
      {Object.keys(safeOptions).map((key) => {
        const labelText = labels?.[key] ?? key.replace(/([A-Z])/g, " $1").trim();
        const tip = tooltips?.[key];

        const label = tip ? (
          <span>
            {labelText}{' '}
            <OverlayTrigger
              placement="top"
              overlay={<Tooltip id={`tip-${groupId}-${key}`}>{tip}</Tooltip>}
            >
              <span className="cb-info-icon">i</span>
            </OverlayTrigger>
          </span>
        ) : labelText;

        return (
          <Form.Check
            key={key}
            type="checkbox"
            label={label}
            name={key}
            data-group={groupId}
            checked={safeOptions[key] || false}
            onChange={onChange}
          />
        );
      })}
      <hr />
    </div>
  );
};

export default CheckboxGroup;