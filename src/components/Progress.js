// src/components/Progress.js

import React from 'react';
import { textColors } from '../config/Colors';
import Text from '../config/Text';

function Progress({ currentStep, totalSteps }) {
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1); // Generate steps [1, 2, 3]

  return (
    <div
      className="w-full flex justify-between items-center"
      style={{
        height: '10%',
        padding: '5%',
        gap: '2.5%',
      }}
    >
      {steps.map((step) => {
        const isActive = step <= currentStep;
        const backgroundColor = isActive
          ? textColors.white
          : 'rgba(255, 255, 255, 0.2)';
        const textColor = isActive
          ? textColors.primary 
          : 'rgba(255, 255, 255, 0.2)'; 

        return (
          <div
            key={step}
            className="flex-1 flex items-center justify-center mx-1 rounded-lg py-[4%]"
            style={{
              backgroundColor,
              transition: 'background-color 0.3s ease, color 0.3s ease',
              textAlign: 'center',
              fontWeight: 'bold',
            }}
          >
            <Text
              type="large"
              style={{
                color: textColor,
              }}
            >
              {step}
            </Text>
          </div>
        );
      })}
    </div>
  );
}

export default Progress;
