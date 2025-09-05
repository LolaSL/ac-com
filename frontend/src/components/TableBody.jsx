import React from 'react';

const TableBody = ({ data, renderRow }) => {
  return (
    <tbody>
      {data.map((item, index) => renderRow(item, index))}
    </tbody>
  );
};

export default TableBody;