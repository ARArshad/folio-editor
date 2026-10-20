import { Layers2 } from 'lucide-react';
export function Brand() {
  return (
    <span className="brand">
      <span className="brand-icon">
        <Layers2 size={22} strokeWidth={1.7} />
      </span>
      folio<span className="brand-dot">.</span>
    </span>
  );
}
export function Avatar({
  name,
  small = false,
}: {
  name: string;
  small?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={`avatar ${small ? 'small' : ''} avatar-${name.slice(0, 1).toLowerCase()}`}
    >
      {name
        .split(' ')
        .map((part) => part[0])
        .join('')}
    </span>
  );
}
