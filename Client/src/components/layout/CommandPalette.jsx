import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import Icon from '../ui/Icon';
import Avatar from '../ui/Avatar';
import useLockBodyScroll from '../../hooks/useLockBodyScroll';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { flatNavForRole } from '../../config/navigation';
import { searchDirectory } from '../../utils/selectors';

export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate();
  const { role, user } = useAuth();
  const { employees } = useData();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  useLockBodyScroll(open);

  const pages = useMemo(() => flatNavForRole(role), [role]);

  const filteredPages = useMemo(() => {
    if (!query.trim()) return pages.slice(0, 5);
    const term = query.toLowerCase();
    return pages.filter((page) => page.label.toLowerCase().includes(term)).slice(0, 5);
  }, [pages, query]);

  const people = useMemo(() => {
    if (role === 'employee') {
      return employees.filter((employee) => employee.id === user?.id && (query.trim() ? employee.name.toLowerCase().includes(query.toLowerCase()) : true));
    }
    return searchDirectory(employees, query, 5);
  }, [employees, query, role, user?.id]);

  const total = filteredPages.length + people.length;

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActive(0);
    const timer = setTimeout(() => inputRef.current?.focus(), 40);
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  if (!open) return null;

  const choosePage = (page) => {
    onClose();
    navigate(page.to);
  };

  const choosePerson = (person) => {
    onClose();
    if (role === 'hr') navigate(`/employees?focus=${person.id}`);
    else if (role === 'manager') navigate(`/team?focus=${person.id}`);
    else navigate('/profile');
  };

  const onKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((value) => (total ? (value + 1) % total : 0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((value) => (total ? (value - 1 + total) % total : 0));
    } else if (event.key === 'Enter' && total) {
      event.preventDefault();
      if (active < filteredPages.length) choosePage(filteredPages[active]);
      else choosePerson(people[active - filteredPages.length]);
    }
  };

  return createPortal(
    <div
      className="cmd-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="cmd" role="dialog" aria-modal="true" aria-label="Search StaffSync">
        <div className="cmd__search">
          <Icon name="search" size={18} />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search people, pages, actions…"
            aria-label="Search"
          />
          <span className="kbd">Esc</span>
        </div>
        <div className="cmd__results">
          {filteredPages.length > 0 ? (
            <div className="cmd__group">
              <p className="cmd__group-label">Go to</p>
              {filteredPages.map((page, index) => (
                <button
                  key={page.to}
                  type="button"
                  className={`cmd__item ${active === index ? 'is-active' : ''}`.trim()}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choosePage(page)}
                >
                  <span className="cmd__item-icon">
                    <Icon name={page.icon} size={16} />
                  </span>
                  <span className="cmd__item-text">
                    <span className="cmd__item-title">{page.label}</span>
                    <span className="cmd__item-sub">{page.section}</span>
                  </span>
                  <Icon name="arrowRight" size={14} className="cmd__enter" />
                </button>
              ))}
            </div>
          ) : null}

          {people.length > 0 ? (
            <div className="cmd__group">
              <p className="cmd__group-label">{query ? 'People' : 'Quick access'}</p>
              {people.map((person, index) => {
                const itemIndex = filteredPages.length + index;
                return (
                  <button
                    key={person.id}
                    type="button"
                    className={`cmd__item ${active === itemIndex ? 'is-active' : ''}`.trim()}
                    onMouseEnter={() => setActive(itemIndex)}
                    onClick={() => choosePerson(person)}
                  >
                    <Avatar name={person.name} src={person.avatar} size="sm" />
                    <span className="cmd__item-text">
                      <span className="cmd__item-title">{person.name}</span>
                      <span className="cmd__item-sub">
                        {person.jobTitle} · {person.department}
                      </span>
                    </span>
                    <Icon name="arrowRight" size={14} className="cmd__enter" />
                  </button>
                );
              })}
            </div>
          ) : null}

          {total === 0 ? (
            <div className="cmd__empty">
              <Icon name="search" size={20} />
              <p>No results for “{query}”</p>
              <span>Try a name, department or page title.</span>
            </div>
          ) : null}
        </div>
        <div className="cmd__footer">
          <span><span className="kbd">↑</span><span className="kbd">↓</span> to navigate</span>
          <span><span className="kbd">↵</span> to open</span>
          <span className="cmd__footer-brand">StaffSync search</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
