// FormHeader.js
import React from 'react';
import { colorScheme } from '../config/Colors';
import Text from '../config/Text';
import Button from './Button';

function FormHeader({ title, onBackClick, onDoneClick, isDoneEnabled }) {
  console.log("FormHeader: Rendering with title:", title, "isDoneEnabled:", isDoneEnabled);

  return (
    <div
      className="w-full border-b py-2"
      style={{
        backgroundColor: colorScheme.secondary.background,
      }}
    >
      <div className="grid grid-cols-4 gap-4 items-center px-4">
        {/* Back Button */}
        <div className="flex justify-center">
          <Text
            type="medium"
            role="secondary"
            isClickable={true}
            onClick={onBackClick}
            style={{
              color: colorScheme.inactive.text,
            }}
          >
            &lt;
          </Text>
        </div>

        {/* Title */}
        <div className="flex justify-center col-span-2">
          <Text type="medium" role="primary">
            {title}
          </Text>
        </div>

        {/* Done Button */}
        <div className="flex justify-center">
          <Button
            label="Done"
            type="secondary"
            onClick={isDoneEnabled ? onDoneClick : undefined}
            disabled={!isDoneEnabled}
          />
        </div>
      </div>
    </div>
  );
}

export default FormHeader;
