import type { ReactNode } from 'react';
import { MdFilledButtonReact } from './MdComponents';

type MdPostButtonProps = {
  children: ReactNode;
  disabled?: boolean;
  className?: string;
  onClick: () => void;
  'aria-label'?: string;
};

/** Filled button wrapper — preserves .composer-btn-share colors from Composer.css */
export function MdPostButton({
  children,
  disabled,
  className = '',
  onClick,
  'aria-label': ariaLabel,
}: MdPostButtonProps) {
  return (
    <MdFilledButtonReact
      type="button"
      disabled={disabled}
      className={className}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      {children}
    </MdFilledButtonReact>
  );
}
