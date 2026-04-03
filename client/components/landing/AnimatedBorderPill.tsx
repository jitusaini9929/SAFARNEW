import React, { useId } from 'react';
import { Link } from 'react-router-dom';

interface AnimatedBorderPillProps {
    to: string;
    text: string;
    mode?: 'dark' | 'light';
    className?: string;
}

const AnimatedBorderPill: React.FC<AnimatedBorderPillProps> = ({
    to,
    text,
    mode = 'dark',
    className = '',
}) => {
    const reactId = useId();
    const uid = `updates-pill-${reactId.replace(/[:]/g, '')}`;
    const borderRadius = 12;
    const borderWidth = 2;
    const isDark = mode === 'dark';

    const accentStart = isDark ? '#22d3ee' : '#4f46e5';
    const accentMid = isDark ? '#67e8f9' : '#818cf8';
    const accentEnd = isDark ? '#a5f3fc' : '#a5b4fc';
    const bgColor = isDark ? 'rgba(14, 17, 22, 0.96)' : 'rgba(255, 255, 255, 0.96)';
    const textColor = isDark ? '#ffffff' : '#0f172a';
    const glowBlur = isDark ? '14px' : '10px';
    const glowOpacity = isDark ? 0.9 : 0.55;

    const styleTag = `
      @keyframes ${uid}-spin {
        100% { transform: translate(-50%, -50%) rotate(1turn); }
      }

      .${uid}-rotor {
        animation-name: ${uid}-spin;
        animation-duration: 2.6s;
        animation-timing-function: linear;
        animation-iteration-count: infinite;
      }

      @media (prefers-reduced-motion: reduce) {
        .updates-motion-allow .${uid}-rotor {
          animation-duration: 2.6s !important;
          animation-iteration-count: infinite !important;
        }
      }
    `;

    const rotorGradient = `conic-gradient(
      rgba(0, 0, 0, 0) 0deg,
      ${accentStart} 48deg,
      ${accentMid} 78deg,
      ${accentEnd} 96deg,
      rgba(0, 0, 0, 0) 118deg,
      rgba(0, 0, 0, 0) 360deg
    )`;

    const maskStyle: React.CSSProperties = {
        position: 'absolute',
        inset: 0,
        borderRadius,
        overflow: 'hidden',
        pointerEvents: 'none',
    };

    const rotorStyle: React.CSSProperties = {
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: 320,
        height: 320,
        transform: 'translate(-50%, -50%) rotate(0deg)',
        transformOrigin: 'center',
        backgroundImage: rotorGradient,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        willChange: 'transform',
        backfaceVisibility: 'hidden',
    };

    return (
        <>
            <style>{styleTag}</style>
            <div
                className={`updates-motion-allow ${className}`}
                style={{
                    position: 'relative',
                    width: 110,
                    height: 42,
                    display: 'inline-flex',
                    isolation: 'isolate',
                }}
            >
                <div
                    aria-hidden="true"
                    style={{
                        ...maskStyle,
                        filter: `blur(${glowBlur})`,
                        opacity: glowOpacity,
                        inset: -1,
                        zIndex: 0,
                    }}
                >
                    <div className={`${uid}-rotor`} style={rotorStyle} />
                </div>

                <div
                    aria-hidden="true"
                    style={{
                        ...maskStyle,
                        zIndex: 1,
                    }}
                >
                    <div className={`${uid}-rotor`} style={rotorStyle} />
                </div>

                <Link
                    to={to}
                    style={{
                        position: 'absolute',
                        inset: borderWidth,
                        zIndex: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: borderRadius - borderWidth,
                        background: bgColor,
                        color: textColor,
                        fontSize: 17,
                        fontWeight: 700,
                        lineHeight: 1,
                        textDecoration: 'none',
                        userSelect: 'none',
                        letterSpacing: '-0.01em',
                        boxShadow: isDark
                            ? 'inset 0 1px 0 rgba(255,255,255,0.04)'
                            : 'inset 0 1px 0 rgba(255,255,255,0.7)',
                    }}
                >
                    <span style={{ position: 'relative', zIndex: 2 }}>{text}</span>
                </Link>
            </div>
        </>
    );
};

export default AnimatedBorderPill;
