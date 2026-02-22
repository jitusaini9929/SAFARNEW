import fs from 'fs';
const path = 'client/global.css';
let css = fs.readFileSync(path, 'utf8');

const typographyVars = `
    /* Fluid Typography Scale */
    --fs-sm: clamp(0.8rem, 0.17vi + 0.76rem, 0.89rem);
    --fs-base: clamp(1rem, 0.34vi + 0.91rem, 1.19rem);
    --fs-lg: clamp(1.25rem, 0.61vi + 1.1rem, 1.58rem);
    --fs-xl: clamp(1.56rem, 1vi + 1.31rem, 2.11rem);
    --fs-2xl: clamp(1.95rem, 1.56vi + 1.56rem, 2.81rem);
    --fs-3xl: clamp(2.44rem, 2.38vi + 1.85rem, 3.75rem);
    --fs-4xl: clamp(3.05rem, 3.54vi + 2.17rem, 5rem);
  }`;

css = css.replace(/--glass-blur:\s*52px;[\s\n]*}/, `--glass-blur: 52px;\n${typographyVars}`);

const newBaseLayer = `@layer base {
  *, *::before, *::after {
    box-sizing: border-box;
    @apply border-border;
  }

  html {
    font-size: 16px;
    -webkit-text-size-adjust: 100%;
  }

  html, body {
    overflow-x: hidden;
    max-width: 100%;
  }

  body {
    @apply bg-background text-foreground font-sans antialiased;
    font-family: 'Poppins', system-ui, -apple-system, sans-serif;
  }

  img, picture, video, canvas, svg, iframe {
    display: block;
    max-width: 100%;
    height: auto;
  }

  /* Prevent iOS zoom on inputs */
  input, textarea, select {
    font-size: 16px;
  }

  :where(p, span, li, h1, h2, h3, h4, h5, h6, a, label, td, th) {
    overflow-wrap: anywhere;
    word-break: normal;
  }

  button {
    overflow-wrap: normal;
    word-break: normal;
  }

  pre, code {
    overflow-x: auto;
    white-space: pre;
  }
}`;

css = css.replace(/@layer base \{[\s\n]*\* \{[\s\n]*@apply border-border;[\s\n]*\}[\s\n]*body \{[\s\n]*@apply bg-background text-foreground font-sans antialiased;[\s\n]*font-family:\s*'Poppins',\s*system-ui,\s*-apple-system,\s*sans-serif;[\s\n]*\}[\s\n]*:where\(p,\s*span,\s*li,\s*h1,\s*h2,\s*h3,\s*h4,\s*h5,\s*h6,\s*a,\s*label,\s*td,\s*th\)\s*\{[\s\n]*overflow-wrap:\s*anywhere;[\s\n]*word-break:\s*normal;[\s\n]*\}[\s\n]*button\s*\{[\s\n]*overflow-wrap:\s*normal;[\s\n]*word-break:\s*normal;[\s\n]*\}[\s\n]*pre,\s*code\s*\{[\s\n]*overflow-x:\s*auto;[\s\n]*white-space:\s*pre;[\s\n]*\}[\s\n]*\}/, newBaseLayer);

fs.writeFileSync(path, css);
console.log('CSS updated successfully.');
