import React from 'react';

function GiftCardShape(props) {
  return (
    <rect
      width="500"
      height="300"
      rx="24"
      {...props}
    />
  );
}

export default GiftCardShape;
