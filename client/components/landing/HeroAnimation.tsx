import React, { useEffect, useRef, useCallback } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

// ─── Constants ───────────────────────────────────────────────────────────────
// Pivot center in SVG viewBox coordinates (bottom-centre of 889×500)
const PX = 482.7;
const PY = 500;
const ANIM_MS = 1050; // 30% faster than original 1.5s

// Cubic ease-in-out
function ease(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ─── Full SVG markup ─────────────────────────────────────────────────────────
// Exactly matches the reference HTML structure.
// Key difference: the rotation is on the SVG `transform` ATTRIBUTE (not CSS),
// using `rotate(angle, cx, cy)` which is native SVG and 100% reliable.
// The moon-group has a static `rotate(180, cx, cy)` to sit opposite the sun.
const SVG_MARKUP = `<svg id="topo-world" xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 889 500" preserveAspectRatio="xMidYMid slice">
  <defs>
    <!-- Ray gradient: golden near the sun, shifts to cool periwinkle blue as it spreads outward.
         Night mode: JS fades sun-group opacity to 0, so hardcoded colours are safe. -->
    <linearGradient id="rayGrad" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%"   stop-color="#ffd080" stop-opacity="0.30"/>
      <stop offset="35%"  stop-color="#ffd080" stop-opacity="0.15"/>
      <stop offset="65%"  stop-color="#93b8f8" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#6ea6ff" stop-opacity="0"/>
    </linearGradient>
    <path id="single-ray" d="M -15,0 L 15,0 L 150,1000 L -150,1000 Z" fill="url(#rayGrad)"/>
    <radialGradient id="moonGlowGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="var(--c-moon)" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="var(--c-moon)" stop-opacity="0"/>
    </radialGradient>
    <g id="big_tree">
      <path d="M470 425s-14 52-22 75h-1s15-57 23-75" fill="var(--c-g12)"/>
      <path d="M464 500s4-30 8-41c0 0-6 12-9 41z" fill="var(--c-g13)"/>
      <path d="M463 500s4-46 7-61c0 0-6 17-8 61z" fill="var(--c-g13)"/>
      <path d="M444 500s11-43 18-58c0 0-11 17-20 58z" fill="var(--c-g12)"/>
      <path d="M489 423s-31 53-48 77h-1s33-59 49-77" fill="var(--c-g13)"/>
    </g>
    <g id="half_tree">
      <path d="m492 281-3 1-3-3-3-7-7 1-3-6q-2-3-6-2l-6 3-2 1q-4 1-7-3-2-4-6-3t-6 6q-3-4-10-3l-1 1-1 2-2 7-10 4q-5 5-3 10c1 3 5 7 3 9l-2 2q-1 3 3 7l-7 3q-3 3-2 6l-10-1q-6 0-11 3-6 5-2 10-6-1-12 2-7 4-6 9l1 3c1 4-4 6-5 9q0 5 5 7l9 2 3 1 1 5q2 5 6 8 7 2 10-2 3-1 5 2l3 5 3 1q4-3 7-3l2 2h7l6-4 6-2 2 2q4 1 7-3 3-2 5 1l4 3q4 2 8-1 5-4 9-2l4 5q4 4 9 1l3-3c3-2 10-2 13 0v-96z" fill="var(--c-g3)"/>
      <linearGradient id="treeGradA" x1="383" x2="448.3" y1="331.2" y2="331.2" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="var(--c-g4)"/><stop offset="1" stop-color="var(--c-g3)" stop-opacity="0"/></linearGradient>
      <path d="m430 298 1 6q-2 5-7 7-5 1-9 4l-2 4 2 5-3 6-6 2q-11 1-21 5l-2 2 2 3 4 1-4 4q-2 3-1 5l3 2q3 1 2 6v7l2 1 6-3q4-3 6-1l1 3 2 4h5l2-3q2-2 4-1l6 2q3-1 2-6 0-5 3-8h1q1-1 3 1 3 3 8 2 1-5-2-8 2-1-1-3l-4-1-2-5q0-2 3-5l5-3q4-2 7-6t2-8l-2-3 1-6q-1-4-6-7l-1-8c0-7-11-4-10 3" fill="url(#treeGradA)"/>
      <linearGradient id="treeGradB" x1="450.9" x2="450.9" y1="375.2" y2="237.5" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="var(--c-g4)"/><stop offset="1" stop-color="var(--c-g3)" stop-opacity="0"/></linearGradient>
      <path d="M500 338q-3-5-8-5-6 2-10 7-5 5-11 5c-4-1-7-6-11-6l-5 3q-5 3-11 3l-3-1q-3-4 1-6 5-3 8-2 5 0 7-3 2-4-1-9-4-4-3-9v-1h2l10 5 10 5q6 0 9-5 0-3 2-5 3-1 7 2 3 4 7 2v-27q-10 0-18 9l-6 6q-4 2-8 0c-3-2-4-8-8-8s-7 6-11 4q-3-3 0-7l7-6q0-2-2-3l-4-2-1-3-1-6q-1-3-5-3-2 2-2 6v7q-4 2-9 2-5 2-5 6 1 3 6 4 4 2 2 5l-1 1q-2 3 0 7l6 4q4 3 3 6-2 4-6 4l-7-1h-11l5 9q3 4 1 9l-18-1q-4 0-5 2c-1 4 8 3 8 7 1 4-6 5-5 8q3 3 8-1l10-5 2 9q4 5 9 4l7-5c6-1 10 9 16 8q3 0 5-4 4-3 7-1l3 5q1 3 4 1l1-1q2-7 6-12l2-2q3-1 6 1 4-1 3-4-3-3 6-2z" fill="url(#treeGradB)"/>
      <path d="m449 394-1 3-2 9-1-9 1-8 3-7v-13l-2 10-4 18-1 12-3 12q1-18-1-35c0-2-2-12 2-17 4-4-2-12-1-18 1-5 3-4 5-9v-11l1-16q-4 6-3 14 1 7-1 14l-4 7 1 15-2 8v15q2 22 0 45v18q4 22 2 45h4v-33l-2-8q-5-25 7-47l2-4 1-3q-1-10 7-16-6 2-8 9" fill="var(--c-wood)"/>
      <path d="m454 358-6-3q-5 1-9 5l-4 1q-1 3 2 5l4 5c-4-1-6 4-4 6l-5 1v4l4 1c2 1-1 5 1 6l5 1c3 1 2 6 5 6l4-2 5 2q2 2 5 1l1-2h6l6 2 1-1 1-3q2-3 8-1 4 1 7-3l-2-4c0-3 7-3 8-6 1-4-7-5-7-9l1-5-6-1c-3-1-2-5-5-6q-4 0-7 2l-3-3q-4-3-8 0-4 4-8 1" fill="var(--c-g5)"/>
      <linearGradient id="treeGradC" x1="491.2" x2="446.3" y1="346" y2="394.3" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="var(--c-g3)"/><stop offset="1" stop-color="var(--c-g5)" stop-opacity="0"/></linearGradient>
      <path d="M447 374q4 4 2 7l-4 3v5l2-1 4-2 5-1 3 5q4 4 9 1l3-4q7-6 16-8l1-1-2-4q-2 1-4-2v-5q-1-3-5-3l-7 5q-3-2-5-6-3-3-7-1-2 4-5 5l-6-1q-4 4 0 8" fill="url(#treeGradC)"/>
      <path d="m439 348 7-5 5-4v-9l2-1 5-4-3 3-3 2c-1 3 2 7 0 10l-5 3z" fill="var(--c-wood)"/>
      <path d="m430 329 7 1 1 1q3 0 3 3l2 6q0 2-1 0l-4-8-5-1zl-4-8z" fill="var(--c-wood)"/>
    </g>
    <g id="giant_tree">
      <!-- Translated 6px inward each to eliminate the center seam artifact -->
      <use href="#half_tree" transform="translate(6, 0)" />
      <use href="#half_tree" transform="translate(994, 0) scale(-1, 1)" />
    </g>
    <linearGradient id="M" x1="288.2" x2="288.2" y1="212.9" y2="78.9" gradientUnits="userSpaceOnUse">
      <stop offset=".4" stop-color="var(--c-grad)" stop-opacity="0"/>
      <stop offset="1" stop-color="var(--c-grad)"/>
    </linearGradient>
    <g id="sun">
      <circle cx="288.2" cy="169.6" r="45.2" fill="var(--c-sun)" transform="rotate(-22 288 170)"/>
      <circle cx="288.2" cy="167.4" r="33.9" fill="url(#M)"/>
    </g>
    <g id="scene_no_sun">
      <path d="M55 344q18-6 26 7c-1-8 14-26 39-21 16 4 11 19 11 22 4-2 12-1 16 1q6 5 3 11l6-1q5-1 7 4v7q5-3 12-1 6 1 4 6c43 3 86 4 118 7 3 4-136-3-201-2q-23 1-45-3l-10-4c-2-3-3-24 14-33" fill="var(--c-cloud)"/>
      <path d="m500 385-98 13q-25 2-52 2l-35-2-52 5q-30 0-59-7-18-5-38-6-25 1-49 8-56 12-115 17h498z" fill="var(--c-dist)"/>
      <path d="m158 406 11-19 4 6 1-1 2 3 2-1 4 2 3-3 3 4 1-1 4 3 3-2 2 3 2-1 1 1 3-1 4 3 1-1 4 3 2-2 1 1 4-5 3 5 2-1 2 1h2l3 2h2l3 4z" fill="var(--c-m1)"/>
      <path d="M500 391c-8-4-24-5-30 1-5-5-16-5-22 0-6-4-16-3-22 1l-4 3-6-1q-12-2-17 7c-7-5-21-2-24 5q-8-4-19-1-9 2-17 6 0-3-5-4l-7 1-44 8c70 15 146 18 217 7z" fill="var(--c-m2)"/>
      <linearGradient id="t" x1="341.3" x2="341.3" y1="396.3" y2="426.3" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="var(--c-g1)"/><stop offset="1" stop-color="var(--c-g2)" stop-opacity="0"/></linearGradient>
      <path d="M469 404c-13-9-31-7-46-1-16 5-30 12-46 13q-16 0-31-2c-30-2-60 5-90 7l-43 1s135 18 200 7 56-25 56-25" fill="url(#t)"/>
      <path d="M0 364c21 6 41-10 62-9 22 1 41 11 61 20 89 41 192 48 287 27q21-7 42-6c19 2 29 16 48 17v87H0z" fill="var(--c-g1)"/>
      <linearGradient id="u" x1="0" x2="233.8" y1="397.8" y2="397.8" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="var(--c-g1)"/><stop offset="1" stop-color="var(--c-g2)" stop-opacity="0"/></linearGradient>
      <path d="M212 416q-13-2-26-1-27 1-55-2-16-1-30-11l-2-3q-1-3 2-3 26 5 51 2 4 0 5-3-33-7-63-25-11-9-26-9l-14 4c-17 6-37 11-54 4v50a539 539 0 0 0 234 9q-10-10-22-12" fill="url(#u)"/>
      <path d="M116 426q-16-4-27-9-7-5-18-9l-16-3q-30-4-55-13v15z" fill="var(--c-m3)"/>
      <path d="M69 420c22 3 44 6 65 1l22-5c11 0 22 4 33 4 10-1 19-6 30-6q10 1 19 4l23 3 50 4q11 2 22-1l12-4q10-1 19 2 18 6 35-1c7-3 16-12 24-13q12-1 24 3 19 4 39 0-17 8-36 11c-82 15-164 30-247 34l-44-1c-35-3-62-14-90-35" fill="var(--c-m3)"/>
      <path d="m109 403-2 1-1 2v3l1 2q0 2-2 2c-2 1 2 8 5 7l5-2q5 3 12 2 3-2 2-5l-2-2-1-7-3-4-3-4q-2-3-8-2z" fill="var(--c-g3)"/>
      <linearGradient id="v" x1="111.5" x2="118.3" y1="415.7" y2="398" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="var(--c-g4)"/><stop offset="1" stop-color="var(--c-g3)" stop-opacity="0"/></linearGradient>
      <path d="M111 403v3l-2 2v2l1 3-1 1-1 2h1l3-1 3 1q2-1 1-3v-2l1-1h1l2-2-1-2h-1l-1-4-2 1-2-2z" fill="url(#v)"/>
      <linearGradient id="w" x1="120.1" x2="122" y1="406.4" y2="419.1" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="var(--c-g4)"/><stop offset="1" stop-color="var(--c-g3)" stop-opacity="0"/></linearGradient>
      <path d="M121 410v2l-4 3 1 2h3l1 1h3l1-1-1-2v-4q-1-3-4-1" fill="url(#w)"/>
      <path d="m119 414-3 4-2-6h-1l2 7v8h2l-1-8 1-2z" fill="var(--c-wood)"/>
      <path d="m378 392-2 1-2 3 1 4 1 2q1 3-3 3c-3 1 2 11 7 9l7-1c6 0 10 4 16 1q4-2 3-6l-3-3-1-9-5-6-3-5q-5-5-11-3c-3 3-2 7-5 10" fill="var(--c-g3)"/>
      <linearGradient id="x" x1="382" x2="391.3" y1="409" y2="384.8" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="var(--c-g4)"/><stop offset="1" stop-color="var(--c-g3)" stop-opacity="0"/></linearGradient>
      <path d="m381 392 1 4-3 3-1 1v1l2 4-2 2v2l1 1 3-2 4 1h1q2-2 1-4v-2l1-2h2l2-2q1-1-1-3h-1c-2-1 0-4-2-5h-3l-2-2z" fill="url(#x)"/>
      <linearGradient id="y" x1="393.7" x2="396.3" y1="396.2" y2="413.6" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="var(--c-g4)"/><stop offset="1" stop-color="var(--c-g3)" stop-opacity="0"/></linearGradient>
      <path d="m395 401-1 3-5 5 2 2h4l2 1 3 1 2-2-2-3 1-3v-2q-3-4-6-2" fill="url(#y)"/>
      <path d="M392 407q-3 1-4 6l-3-9h-1l2 9 1 11h2l-1-10 2-3z" fill="var(--c-wood)"/>
      <path d="M131 408q-2-1-2 2v1l-1 3q-2 2-1 3v1l1 2h4l3 1 2 1 3-1v-1h1l3-2v-5l-2-2-1-2v-1l-3-1q0-2-3-2l-2 2z" fill="var(--c-g5)"/>
      <linearGradient id="z" x1="128.5" x2="141.5" y1="415.4" y2="415.4" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="var(--c-g3)"/><stop offset="1" stop-color="var(--c-g5)" stop-opacity="0"/></linearGradient>
      <path d="m136 410-1 1h-2l-1 1-1 2-2 2v2h2v1l1 1 1-1 2 1 3 1v-2l1-1h1l1-2q1 0 0 0l-1-1v-3h-2v-1z" fill="url(#z)"/>
      <path d="m138 417-3 3v-7l-1 4v-2l-2-3 1 3 1 2v5l2 10-1-9v-2l1-2z" fill="var(--c-wood)"/>
      <path d="M284 403q-2 0-3 2l1 2-2 3q-2 2-1 4v1l1 2 2 1 3-1 3 2 3 1 3-2 1-1 4-1q2-2 1-4l-1-1 1-2-2-2-3-2v-1l-2-2-4-2-3 2z" fill="var(--c-g5)"/>
      <linearGradient id="A" x1="280.7" x2="296.3" y1="411.9" y2="411.9" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="var(--c-g3)"/><stop offset="1" stop-color="var(--c-g5)" stop-opacity="0"/></linearGradient>
      <path d="m289 405-1 1-2 1-1 1-1 3-2 1-1 2 1 1h2v1l1 1h1q1-1 3 1h3l1-2v-1h1l2-2-1-1v-4h-3v-1z" fill="url(#A)"/>
      <path d="m292 414-4 4 1-8v-1l-2 5v-3l-2-3 1 3 1 3v6l2 12h1l-2-11v-2l2-2z" fill="var(--c-wood)"/>
      <path d="m408 399-3 1v2l-1 4q-2 2-1 3v1l1 2 2 1h3l3 1 3 1q2 1 3-2l1-1 4-1q2-2 1-4h-1l1-3-3-2-2-2v-1l-3-2q-1-2-3-2l-3 2z" fill="var(--c-g5)"/>
      <linearGradient id="B" x1="404.5" x2="420.2" y1="407.2" y2="407.2" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="var(--c-g3)"/><stop offset="1" stop-color="var(--c-g5)" stop-opacity="0"/></linearGradient>
      <path d="m413 401-1 1h-3v2l-1 2-2 2-1 1v2l3-1v2h2l3 1h3l1-1v-2h1l2-2-1-1v-4h-3v-1q-2-2-3-1" fill="url(#B)"/>
      <path d="M415 409q1 0 0 0l-3 4 1-8h-1l-1 4v-3l-2-3 1 4 1 3v5l2 12-1-11v-2l1-2z" fill="var(--c-wood)"/>
      <path d="m255 421-4-3-7 2q-3 2-7-1l-2-3q-3-4-7-2l-7 4c-8 3-17-5-24 0l-7 6 71 5z" fill="var(--c-g6)"/>
      <path d="M208 423q-3-4-8-3h-9l-6-2c-3 0-7 4-10 3l-5-4q-4 1-7 4-3 2-8 0-8 1-15 7c22 2 48 2 68-5" fill="var(--c-g7)"/>
      <path d="M0 395c56 18 114 37 173 30l39-4q20 1 39 4 33 5 68 4l41-1q20 0 39 4l101 16v52H0z" fill="var(--c-g8)"/>
      <linearGradient id="C" x1="444.6" x2="-20.1" y1="454.1" y2="454.1" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="var(--c-g9)"/><stop offset="1" stop-color="var(--c-g8)" stop-opacity="0"/></linearGradient>
      <path d="M0 408q22 15 46 24 21 7 43 7 44 0 87-8 17-3 32-2c17 0 34 6 50 10 52 12 105 14 157 15q8 0 12 4-2 4-7 4c-67 5-134-2-201-10q-21-4-41-1 26 2 50 12-1 4-6 4c-31 2-63 0-91 12-18 8-41 21-60 21H0z" fill="url(#C)"/>
      <path d="M0 402c29 20 67 27 103 32q9 2 11 5c0 4-28 2-27 4 1 6 37 1 71 11 33 10 140 36 202 46H0z" opacity="0.3" fill="var(--c-g10)"/>
      <path d="M105 423c10 3 23 6 22 10 0 2-17 4-24 5-17 2-65 8-63 23 2 20 126 30 185 33q9-11 20-20c-16-2-178-9-176-19 1-7 65-14 66-20 1-4-2-9-30-12" fill="var(--c-dirt1)"/>
      <linearGradient id="D" x1="190.3" x2="40.7" y1="469.4" y2="469.4" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="var(--c-dirt2)"/><stop offset="1" stop-color="var(--c-dirt1)" stop-opacity="0"/></linearGradient>
      <path d="m133 471-9-4-14 1-14-2-28-9q8 10 22 14l2 2-1 1 2 2h3l15 1c12 1 24 6 37 5l10-2 16-3c1-4-10-4-12-4-9 0-20 2-29-2" fill="url(#D)"/>
      <linearGradient id="E" x1="91.8" x2="63.4" y1="481.5" y2="453.1" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="var(--c-dirt2)"/><stop offset="1" stop-color="var(--c-dirt1)" stop-opacity="0"/></linearGradient>
      <path d="M97 470H87q-5 0-11-4l-6-4-5-3-3-4q-1-3 2-5-4-2-6 1l-1 5q2 3 1 5l-3 8 10 1q2 4 6 6h13l6 2q9 2 17-1 4-3-2-4z" fill="url(#E)"/>
      <path d="M64 441q-3-1-3 2v2q0 3-3 5-2 2-1 5l1 1 1 3 3 1 3-1 4 2 4 1q3 1 4-2l1-1h1l5-2q3-2 1-5l-1-1v-3q1-1-2-3-3 0-3-2v-2l-4-2q-2-4-5-3l-3 3z" fill="var(--c-g5)"/>
      <linearGradient id="F" x1="59.8" x2="80.1" y1="451.9" y2="451.9" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="var(--c-g3)"/><stop offset="1" stop-color="var(--c-g5)" stop-opacity="0"/></linearGradient>
      <path d="m71 443-2 2-2 1h-1v1l-2 3-3 2-1 2 1 2h3v2l2 1v-1l4 1q3 2 4 1l1-2 1-3h1l3-1v-1l-2-1v-5h-4v-2z" fill="url(#F)"/>
      <path d="m74 455-5 5 2-11h-1l-2 5v-3l-2-4h-1l2 4 1 4v7q0 8 3 16l-2-14v-3l2-3z" fill="var(--c-wood)"/>
      <path d="M240 471c3-2-4-6-7-6q-6 0-8 4-4-4-8 1l-1-4h-3l-2 3-2-6q-1-4-4-3l-3 1q-4 5-4 11l-2-3q-6 0-11 5 0-3-5-4l-6 2q-5 3-8 8v1s51 5 74-10M0 440q5-4 11 0c6 4 7 21 8 27 3-4 8-11 14-9 3 1 2 8 1 11 4-4 13-4 15-1q1 5-1 10 3-6 11-6c4 1 4 7 2 9q1-6 9-8 7 0 10 5-1-4 4-7c11-1 16 16 26 29H0z" fill="var(--c-m2)"/>
      <path d="m0 494 90-17q15-4 32-4c32 0 65 13 96 3 21-7 38-24 59-30q14-4 28-5l38-3q37-3 69-20 9-6 19-7l15-1 16-7c13-5 25-3 38-8v105H0z" fill="var(--c-g7)"/>
      <path d="M500 406v94H0c42-9 104-21 149-22h43c39-3 73-18 107-31a742 742 0 0 1 113-30l27-1 32-8c19-3 23-2 29-2" fill="var(--c-g2)"/>
      <linearGradient id="G" x1="287.6" x2="287.6" y1="554" y2="391.5" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="var(--c-g15)"/><stop offset="1" stop-color="var(--c-g2)" stop-opacity="0"/></linearGradient>
      <path d="M308 491c47-10 91-32 138-33 8 4-22 17-12 27 1 1 27-10 39-13 17-5 20-8 27-1v29H75c23-5 51-5 74-10q11-2 23-2c9 1 18 6 28 6q11 0 22-5l43-15q39-11 75-30 12-7 26-10l16 1c22 2 44-5 65-12 14-5 31-14 53-15v5c-22 6-31 22-41 21-58-4-89 25-132 42-8 3-22 14-19 15" fill="url(#G)"/>
      <path d="m288 475 15 25h1s-9-19-16-25" fill="var(--c-g11)"/>
      <path d="m373 453-30 47h-2s18-37 32-47" fill="var(--c-g12)"/>
      <path d="m296 476 9 24s-6-21-9-24" fill="var(--c-g11)"/>
      <path d="m357 453-14 47h-1s10-41 15-47" fill="var(--c-g12)"/>
      <path d="M362 476q-1-1-10 24h-1s5-20 11-24m129 0s-7 6-13 24h-1s6-20 14-24" fill="var(--c-g11)"/>
      <path d="m323 437-17 63h2s15-55 15-63" fill="var(--c-g12)"/>
      <path d="M316 425s14 52 22 75c0 0-15-57-22-75m6 75s-4-30-8-41c0 0 6 12 9 41z" fill="var(--c-g13)"/>
      <path d="M323 500s-4-46-7-61c0 0 6 17 8 61zm15 0s-5-49-10-67c0 0 9 20 12 67z" fill="var(--c-g13)"/>
      <path d="M304 455s23 22 30 45h-2s-4-16-28-45m58-6-11 51h-1s4-33 12-51" fill="var(--c-g11)"/>
      <path d="m499 453-30 47h-2s18-37 32-47" fill="var(--c-g12)"/>
      <path d="m483 453-14 47h-1s10-41 15-47" fill="var(--c-g12)"/>
      <path d="m488 449-11 51h-1s5-33 12-51" fill="var(--c-g11)"/>
      <path d="m345 467-3 33h-2z" fill="var(--c-g13)"/>
      <path d="M297 423s31 53 48 77h1s-33-59-49-77" fill="var(--c-g11)"/>
      <path d="m336 430 9 70h2s-5-50-11-70" fill="var(--c-g11)"/>
      <path d="M470 425s-14 52-22 75h-1s15-57 23-75" fill="var(--c-g12)"/>
      <path d="M464 500s4-30 8-41c0 0-6 12-9 41z" fill="var(--c-g13)"/>
      <path d="M463 500s4-46 7-61c0 0-6 17-8 61z" fill="var(--c-g13)"/>
      <path d="M444 500s11-43 18-58c0 0-11 17-20 58z" fill="var(--c-g12)"/>
      <path d="M489 423s-31 53-48 77h-1s33-59 49-77" fill="var(--c-g13)"/>
      <path d="m450 430-9 70h-2s5-50 11-70" fill="var(--c-g11)"/>
      <path d="M443 480s-9 12-13 20h-1s6-15 14-20m-76-18 35 38h1s-20-30-36-38m68 18-7 20h-1s5-17 8-20m-51-18 19 38h1s-15-33-20-38" fill="var(--c-g12)"/>
      <path d="M361 480q1-1 12 20h1s-7-16-13-20" fill="var(--c-g13)"/>
      <path d="M418 439s-8 42-14 61h-1s9-47 15-61m6 61s1-24 4-33c0 0-5 10-5 33zm-2 0s0-37 2-50c0 0-4 15-3 50zm-19 0s1-40 4-55c0 0-6 16-5 55z" fill="var(--c-g12)"/>
      <path d="M431 463s-21 19-25 37h2s2-13 23-37m-68-4 15 41h2s-8-27-17-41m43-22s-13 44-22 63h-1s13-48 23-63" fill="var(--c-g13)"/>
      <path d="m369 443-2 57h-1s0-40 3-57m10 16 10 41h1s-4-27-11-41m14 5 6 36h1zm5 16 11 20h1s-5-15-12-20m64 0 11 20h1s-5-15-12-20m-56 0 5 20s-3-17-5-20m63 0 5 20s-3-17-5-20" fill="var(--c-g11)"/>
      <path d="M392 321q1-3-3-4-5-2-9 0 2-5-6-6l-8 3c1-4-1-15-11-16-17-1-26 11-26 18q0-4-6-5l-3 1-6 6q-4-3-10-3-6 1-7 6l-36 4c27-1 174 0 172-2 0-2-23 0-41-2" fill="var(--c-cloud)"/>
      <path d="m442 493-5 1h-15q-6 1-9 6h40q-4-6-11-7" fill="var(--c-rock1)"/>
      <path d="M447 496h-4l-2-2-3 1q-2 2-4 1h-4l-4 1h-5q-5 0-8 3h37z" fill="var(--c-rock2)"/>
      <path d="m28 425-4 1q-4 5 0 11v3l-1 1q-3 2-2 6l1 1q1 1-1 4 1 3 4 3l2-2 6 4 7-3 6 2q4 2 6 1l5-5h3q3 1 3-3l-2-5-2-3 1-3 1-4-1-4-2-1-1-6q-2-2-5-2l-3-4q-2-4-6-3l-3 2-4-1q-4-1-7 2v6z" fill="var(--c-g3)"/>
      <linearGradient id="K" x1="32.7" x2="44.2" y1="447" y2="417" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="var(--c-g4)"/><stop offset="1" stop-color="var(--c-g3)" stop-opacity="0"/></linearGradient>
      <path d="M32 426v4l-3 4-1 1v1q3 3 2 6l-2 2-1 3 2 1 4-2 5 1h1q3-2 1-5v-3l2-1 2-1q2 0 3-3 1-2-2-3l-2-1-1-6-3 1h-1l-3-3q-3 1-3 4" fill="url(#K)"/>
      <linearGradient id="L" x1="47.3" x2="50.5" y1="431.1" y2="452.7" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="var(--c-g4)"/><stop offset="1" stop-color="var(--c-g3)" stop-opacity="0"/></linearGradient>
      <path d="m49 436-1 5-6 5q0 3 2 3h4l3 2h4l2-1-2-4 1-4v-3q-3-4-7-3" fill="url(#L)"/>
      <path d="m45 444-5 7-4-11q-1 0 0 0l2 12 1 14h2l-1-13 3-4z" fill="var(--c-wood)"/>
      <path d="M422 500s26-67 27-74z" fill="var(--c-g12)"/>
      <path d="M429 500s-3-53-2-59c0 0 4 54 3 59z" fill="var(--c-g13)"/>
      <path d="M454 452s-12 33-13 48h2zm12 16s-14 22-15 32h2s0-3 13-32" fill="var(--c-g14)"/>
      <path d="M422 430s15 60 20 70h1s-15-57-21-70" fill="var(--c-g14)"/>
      <path d="M416 449c0 7 18 51 18 51h1z" fill="var(--c-g11)"/>
      <path d="m457 495 2 1h7q3 1 4 4h-18q2-4 5-5" fill="var(--c-rock1)"/>
      <path d="m455 498 1 1v-2l2 1 2 1v-1h1l2 1h2q3 0 4 2h-17z" fill="var(--c-rock2)"/>
      <path d="M177 274q-1-2 2-4 4-1 6 1-1-4 5-5l6 3c-1-4 1-11 8-12 12-1 20 7 19 13q0-3 5-4l2 1q4 3 4 5 3-3 8-3l5 4 27 4c-20-1-129 0-128-2z" fill="var(--c-cloud)"/>
    </g>
  </defs>

  <rect width="889" height="500" fill="var(--c-sky)"/>
  <!-- Starfield: outer group rotates very slowly (300s/rev) on the compositor.
       Zero JS cost — SMIL animateTransform runs off the main thread. -->
  <g>
    <animateTransform attributeName="transform" type="rotate"
      from="0 444.5 200" to="360 444.5 200"
      dur="300s" repeatCount="indefinite"/>
    <g id="starfield" style="opacity:var(--stars-opacity,0)"></g>
  </g>

  <!-- CELESTIAL PIVOT — rotated via SVG transform attribute (JS), NOT CSS -->
  <!-- Shift the entire orbit off-center horizontally for 'Rule of Thirds' -->
  <g transform="translate(150, 0)">
    <g id="celestial-pivot" transform="rotate(0, 482.7, 500)">
      <g id="sun-group" opacity="1">
        <g transform="translate(482.7,169.6)">
          <g id="rays-container" opacity="0.6">
            <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="120s" repeatCount="indefinite"/>
            <use href="#single-ray" transform="rotate(0)"/>
            <use href="#single-ray" transform="rotate(30)"/>
            <use href="#single-ray" transform="rotate(60)"/>
            <use href="#single-ray" transform="rotate(90)"/>
            <use href="#single-ray" transform="rotate(120)"/>
            <use href="#single-ray" transform="rotate(150)"/>
            <use href="#single-ray" transform="rotate(180)"/>
            <use href="#single-ray" transform="rotate(210)"/>
            <use href="#single-ray" transform="rotate(240)"/>
            <use href="#single-ray" transform="rotate(270)"/>
            <use href="#single-ray" transform="rotate(300)"/>
            <use href="#single-ray" transform="rotate(330)"/>
          </g>
        </g>
        <use href="#sun" transform="translate(194.5,0)"/>
      </g>
      <!-- Moon: static rotate(180) puts it on opposite side of orbit -->
      <g id="moon-group" transform="rotate(180, 482.7, 500)" opacity="0">
        <g transform="translate(482.7,169.6)">
          <circle cx="0" cy="0" r="90" fill="url(#moonGlowGrad)"/>
          <circle cx="0" cy="0" r="45.2" fill="var(--c-moon)"/>
          <circle cx="10" cy="-10" r="10" fill="var(--c-moon-crater)"/>
          <circle cx="-15" cy="15" r="8" fill="var(--c-moon-crater)"/>
          <circle cx="8" cy="22" r="14" fill="var(--c-moon-crater)"/>
          <circle cx="-18" cy="-8" r="5" fill="var(--c-moon-crater)"/>
        </g>
      </g>
    </g>
  </g>

  <!-- Landscape ON TOP — celestial bodies set behind mountains -->
  <use href="#scene_no_sun" transform="translate(194.5,0) scale(-1,1)"/>
  <use href="#scene_no_sun" transform="translate(1194.5,0) scale(-1,1)"/>
  <use href="#scene_no_sun" transform="translate(194.5,0)"/>
  
  <!-- Left Tree independently placed and completed using mirror duplication -->
  <use href="#giant_tree" transform="translate(-165, 120) scale(0.7)"/>
  
  <!-- Right Tree independently placed, shifted rightwards to decouple from the CTA button -->
  <!-- Scaled by 0.7 (30% reduction) and recalculate translate to anchor at x:760, y:400 -->
  <use href="#giant_tree" transform="translate(410, 123.5) scale(0.7)"/>
  
  <g class="foreground-sprigs">
    <use href="#big_tree" transform="translate(194.5,500) scale(2.2) translate(-460,-500)"/>
    <use href="#big_tree" transform="translate(694.5,500) scale(-1.8,1.8) translate(-460,-500)"/>
  </g>
</svg>`;

// ─── Component ───────────────────────────────────────────────────────────────
const HeroAnimation: React.FC = () => {
    const { theme } = useTheme();
    const containerRef = useRef<HTMLDivElement>(null);
    const starsReady = useRef(false);

    // Animation state — survives re-renders, cancellable
    const animRef = useRef<number | null>(null);
    const curAngle = useRef(0);   // current pivot angle
    const curSunOp = useRef(1);   // current sun opacity
    const curMoonOp = useRef(0);  // current moon opacity

    // ── Populate stars once ──────────────────────────────────────────────
    useEffect(() => {
        if (starsReady.current) return;
        const sf = containerRef.current?.querySelector<SVGGElement>('#starfield');
        if (!sf) return;
        starsReady.current = true;

        let html = '';
        for (let i = 0; i < 70; i++) {
            const x = (Math.random() * 889).toFixed(1);
            const y = (Math.random() * 250).toFixed(1);
            const r = (0.2 + Math.random() * 0.9).toFixed(2);
            const delay = (Math.random() * 6).toFixed(2);
            if (Math.random() > 0.8) {
                html += `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" class="star-twinkle" style="animation-delay:${delay}s"/>`;
            } else {
                const op = (0.15 + Math.random() * 0.55).toFixed(2);
                html += `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity="${op}"/>`;
            }
        }
        sf.innerHTML = html;
    }, []);

    // ── Animate pivot on theme change ────────────────────────────────────
    const animateTo = useCallback((toNight: boolean) => {
        // Cancel any running animation
        if (animRef.current !== null) cancelAnimationFrame(animRef.current);

        const root = containerRef.current;
        if (!root) return;

        const pivot = root.querySelector<SVGGElement>('#celestial-pivot');
        const sunG  = root.querySelector<SVGGElement>('#sun-group');
        const moonG = root.querySelector<SVGGElement>('#moon-group');
        if (!pivot || !sunG || !moonG) return;

        const startAngle  = curAngle.current;
        const startSunOp  = curSunOp.current;
        const startMoonOp = curMoonOp.current;
        const endAngle  = toNight ? 180 : 0;
        const endSunOp  = toNight ? 0 : 1;
        const endMoonOp = toNight ? 1 : 0;
        const t0 = performance.now();

        function tick(now: number) {
            const t = Math.min((now - t0) / ANIM_MS, 1);
            const e = ease(t);

            const angle  = startAngle  + (endAngle  - startAngle)  * e;
            const sunOp  = startSunOp  + (endSunOp  - startSunOp)  * e;
            const moonOp = startMoonOp + (endMoonOp - startMoonOp) * e;

            // SVG native rotate — 100% reliable, no CSS transform-origin needed
            pivot.setAttribute('transform', `rotate(${angle}, ${PX}, ${PY})`);
            sunG.setAttribute('opacity', String(sunOp));
            moonG.setAttribute('opacity', String(moonOp));

            curAngle.current = angle;
            curSunOp.current = sunOp;
            curMoonOp.current = moonOp;

            if (t < 1) {
                animRef.current = requestAnimationFrame(tick);
            } else {
                animRef.current = null;
            }
        }

        animRef.current = requestAnimationFrame(tick);
    }, []);

    // ── React to theme changes ───────────────────────────────────────────
    const isFirstRender = useRef(true);
    useEffect(() => {
        const isNight = theme === 'dark';
        if (isFirstRender.current) {
            // On first render, snap to correct position (no animation)
            isFirstRender.current = false;
            const root = containerRef.current;
            if (root && isNight) {
                const pivot = root.querySelector<SVGGElement>('#celestial-pivot');
                const sunG  = root.querySelector<SVGGElement>('#sun-group');
                const moonG = root.querySelector<SVGGElement>('#moon-group');
                if (pivot) pivot.setAttribute('transform', `rotate(180, ${PX}, ${PY})`);
                if (sunG)  sunG.setAttribute('opacity', '0');
                if (moonG) moonG.setAttribute('opacity', '1');
                curAngle.current = 180;
                curSunOp.current = 0;
                curMoonOp.current = 1;
            }
            return;
        }
        animateTo(isNight);
    }, [theme, animateTo]);

    // ── Cleanup ──────────────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            if (animRef.current !== null) cancelAnimationFrame(animRef.current);
        };
    }, []);

    const isNight = theme === 'dark';

    return (
        <div
            ref={containerRef}
            className={isNight ? 'hero-scene night-mode' : 'hero-scene'}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'hidden' }}
        >
            <style>{`
                .hero-scene {
                    --spd: ${ANIM_MS}ms;
                    /* Day palette */
                    --stars-opacity: 0;
                    --c-sky:#e7f1fb; --c-cloud:#f7faf3; --c-dist:#cfdff6;
                    --c-m1:#10567a; --c-m2:#1f7689; --c-m3:#17527a;
                    --c-g1:#62b48e; --c-g2:#88d180; --c-g3:#378d74;
                    --c-g4:#3b967b; --c-g5:#429b7d; --c-g6:#88d77e;
                    --c-g7:#469b60; --c-g8:#73be7b; --c-g9:#459a5f;
                    --c-g10:#8ad485; --c-g11:#47a269; --c-g12:#1b3d28;
                    --c-g13:#265739; --c-g14:#53a36e; --c-g15:#a7eb8c;
                    --c-dirt1:#f7d2a8; --c-dirt2:#cba990;
                    --c-wood:#6e604a; --c-rock1:#b5ab99; --c-rock2:#a59c8b;
                    --c-sun:#ffd080; --c-ray-color:#ffd080;
                    --c-moon:#e2e8f0; --c-moon-crater:rgba(0,0,0,.1);
                    --c-grad:#fff;
                    background: var(--c-sky);
                    transition: background var(--spd) ease;
                }
                .hero-scene.night-mode {
                    --stars-opacity: 1;
                    --c-sky:#080c17; --c-cloud:#141f30; --c-dist:#0d1526;
                    --c-m1:#061d2b; --c-m2:#0b2930; --c-m3:#081d2e;
                    --c-g1:#102a20; --c-g2:#153829; --c-g3:#081a13;
                    --c-g4:#0a1f17; --c-g5:#0c241a; --c-g6:#1a4231;
                    --c-g7:#112e22; --c-g8:#17382a; --c-g9:#102e21;
                    --c-g10:#1b4533; --c-g11:#133627; --c-g12:#05120d;
                    --c-g13:#091a13; --c-g14:#153829; --c-g15:#1c4a36;
                    --c-dirt1:#29211c; --c-dirt2:#1f1814;
                    --c-wood:#14110e; --c-rock1:#24211e; --c-rock2:#1a1816;
                    --c-sun:#e2e8f0; --c-ray-color:transparent;
                    --c-grad:#020617;
                }
                .hero-scene #topo-world {
                    position:absolute; width:100%; height:100%;
                    top:0; left:0; display:block;
                }
                /* Landscape colour transitions */
                .hero-scene #topo-world path,
                .hero-scene #topo-world rect,
                .hero-scene #topo-world circle,
                .hero-scene #topo-world stop,
                .hero-scene #starfield {
                    transition: fill var(--spd) ease,
                                stop-color var(--spd) ease,
                                opacity var(--spd) ease;
                }
                /* Star twinkle */
                @keyframes twinkle {
                    0%   { opacity:.08; transform:scale(.6); }
                    100% { opacity:.9;  transform:scale(1.4); }
                }
                .star-twinkle {
                    animation: twinkle 4s ease-in-out infinite alternate;
                    transform-box: fill-box;
                    transform-origin: center;
                }
                
                @media (max-width: 768px) {
                    .hero-scene .foreground-sprigs {
                        display: none;
                    }
                }
            `}</style>

            <div dangerouslySetInnerHTML={{ __html: SVG_MARKUP }}/>
        </div>
    );
};

export default HeroAnimation;
