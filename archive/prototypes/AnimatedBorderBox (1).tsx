import React from "react";

interface AnimatedBorderBoxProps {
  text?: string;
  width?: number;
  height?: number;
  animationDuration?: string;
  mode?: "dark" | "light";
}

const AnimatedBorderBox: React.FC<AnimatedBorderBoxProps> = ({
  text = "updates",
  width = 200,
  height = 60,
  animationDuration = "4s",
  mode = "dark",
}) => {
  const borderRadius = 8;
  const borderWidth = 3;

  const isDark = mode === "dark";

  const borderColor = isDark ? "#1976ed" : "#1a1a1a";
  const borderColorMid = isDark ? "#1976ed" : "#555555";
  const bgColor = isDark ? "#292a2e" : "#f5f5f5";
  const textColor = isDark ? "#e0e0e0" : "#1a1a1a";
  const glowBlur = isDark ? "14px" : "10px";
  const glowOpacity = isDark ? 1 : 0.35;

  const uid = `abb-${mode}`;

  const styleTag = `
    @keyframes ${uid}-spin {
      100% { transform: translate(-50%, -50%) rotate(1turn); }
    }
    .${uid}-pseudo::before {
      content: '';
      position: absolute;
      z-index: -2;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(0deg);
      width: 99999px;
      height: 99999px;
      background-image: conic-gradient(
        rgba(0,0,0,0),
        ${borderColor},
        ${borderColorMid},
        rgba(0,0,0,0) 25%
      );
      background-repeat: no-repeat;
      background-position: 0 0;
      animation: ${uid}-spin ${animationDuration} linear infinite;
    }
    .${uid}-inner::after {
      content: '';
      position: absolute;
      z-index: -1;
      left: ${borderWidth}px;
      top: ${borderWidth}px;
      width: calc(100% - ${borderWidth * 2}px);
      height: calc(100% - ${borderWidth * 2}px);
      background: ${bgColor};
      border-radius: ${borderRadius - 2}px;
    }
  `;

  const containerStyle: React.CSSProperties = {
    position: "relative",
    width,
    height,
  };

  const layerBase: React.CSSProperties = {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius,
    overflow: "hidden",
  };

  return (
    <>
      <style>{styleTag}</style>
      <div style={containerStyle}>
        {/* Glow layer */}
        <div
          className={`${uid}-pseudo`}
          style={{
            ...layerBase,
            filter: `blur(${glowBlur})`,
            opacity: glowOpacity,
            zIndex: 0,
          }}
        />
        {/* Border + content layer */}
        <div
          className={`${uid}-pseudo ${uid}-inner`}
          style={{
            ...layerBase,
            zIndex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontSize: 18,
              fontWeight: 500,
              letterSpacing: "0.1em",
              color: textColor,
              userSelect: "none",
            }}
          >
            {text}
          </span>
        </div>
      </div>
    </>
  );
};

export default AnimatedBorderBox;
