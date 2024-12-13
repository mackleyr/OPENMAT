import React, { useState } from "react";
import { colorScheme, textColors } from "../config/Colors";
import Text from "../config/Text";

function Button({
  label,
  type = "primary",
  icon,
  iconRole = "primary",
  onClick,
  disabled = false,
}) {
  const [isHovered, setIsHovered] = useState(false);

  const isPrimary = type === "primary";

  // Determine background color
  const backgroundColor = disabled
    ? colorScheme.inactive.background
    : isHovered
      ? (isPrimary ? colorScheme.primary.hover : colorScheme.secondary.hover)
      : (isPrimary ? colorScheme.primary.background : colorScheme.secondary.background);

  // Determine text color
  const currentTextColor = disabled
    ? textColors.inactiveText
    : isHovered
      ? textColors.white
      : isPrimary
        ? textColors.white
        : textColors.mainColor;

  // Determine icon color
  const currentIconColor = disabled
    ? textColors.inactiveText
    : (isHovered || iconRole === "white")
      ? textColors.white
      : textColors.mainColor;

  return (
    <button
      onClick={disabled ? undefined : onClick}
      onMouseEnter={disabled ? undefined : () => setIsHovered(true)}
      onMouseLeave={disabled ? undefined : () => setIsHovered(false)}
      className="flex items-center justify-center gap-2 rounded-full transition-all duration-200"
      style={{
        backgroundColor,
        border: `3px solid ${isPrimary ? "transparent" : colorScheme.secondary.border}`,
        width: "100%",
        paddingBlock: "10%",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {icon && (
        <img
          src={icon}
          alt=""
          className="h-6 w-6"
          style={{
            filter: currentIconColor === textColors.white ? "invert(1)" : "none",
          }}
        />
      )}
      <Text
        type="medium"
        style={{ color: currentTextColor }}
        className="text-center"
      >
        {label}
      </Text>
    </button>
  );
}

export default Button;
