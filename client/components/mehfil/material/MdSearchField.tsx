import { MdOutlinedTextFieldReact } from './MdComponents';

type MdSearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
};

export function MdSearchField({
  value,
  onChange,
  placeholder,
  className = '',
}: MdSearchFieldProps) {
  return (
    <div className={`mehfil-m3-search-field ${className}`.trim()}>
      <MdOutlinedTextFieldReact
        label={placeholder}
        value={value}
        onInput={(e: Event) => {
          const target = e.target as HTMLInputElement & { value: string };
          onChange(target.value ?? '');
        }}
      />
    </div>
  );
}
