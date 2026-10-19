import { avatarTone, initials } from '../../utils/format';

const SIZES = { xs: 24, sm: 30, md: 36, lg: 44, xl: 64, xxl: 88 };

export default function Avatar({
  name = '',
  src = null,
  size = 'md',
  tone,
  status,
  className = '',
  ring = false,
}) {
  const pixels = SIZES[size] || SIZES.md;
  const toneIndex = tone ?? avatarTone(name);
  return (
    <span
      className={`avatar avatar--${size} avatar--tone-${toneIndex} ${ring ? 'avatar--ring' : ''} ${className}`.trim()}
      style={{ width: pixels, height: pixels }}
      title={name}
    >
      {src ? (
        <img src={src} alt={name} className="avatar__img" />
      ) : (
        <span className="avatar__initials" aria-hidden="true">
          {initials(name)}
        </span>
      )}
      {status ? <span className={`avatar__status avatar__status--${status}`} aria-label={status} /> : null}
    </span>
  );
}

export function AvatarGroup({ people = [], max = 4, size = 'sm' }) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <span className="avatar-group">
      {shown.map((person) => (
        <Avatar
          key={person.id || person.name}
          name={person.name}
          src={person.avatar}
          size={size}
          className="avatar-group__item"
        />
      ))}
      {rest > 0 ? (
        <span className={`avatar avatar--${size} avatar-group__more`} title={`${rest} more`}>
          +{rest}
        </span>
      ) : null}
    </span>
  );
}
