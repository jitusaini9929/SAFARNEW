import type React from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'md-chip-set': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      'md-filter-chip': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & { label?: string; selected?: boolean },
        HTMLElement
      >;
      'md-outlined-text-field': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & { label?: string; value?: string },
        HTMLElement
      >;
      'md-filled-button': React.DetailedHTMLProps<
        React.ButtonHTMLAttributes<HTMLButtonElement>,
        HTMLElement
      >;
      'md-icon-button': React.DetailedHTMLProps<
        React.ButtonHTMLAttributes<HTMLButtonElement>,
        HTMLElement
      >;
      'md-switch': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & { selected?: boolean; disabled?: boolean },
        HTMLElement
      >;
      'md-checkbox': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & { checked?: boolean; disabled?: boolean },
        HTMLElement
      >;
    }
  }
}

export {};
