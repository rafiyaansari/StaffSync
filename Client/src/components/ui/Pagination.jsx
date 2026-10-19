import Icon from './Icon';

function pageItems(page, pageCount) {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }
  const items = new Set([1, pageCount, page, page - 1, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((value) => items.add(value));
  if (page >= pageCount - 2) [pageCount - 1, pageCount - 2, pageCount - 3].forEach((value) => items.add(value));

  const sorted = [...items].filter((value) => value >= 1 && value <= pageCount).sort((a, b) => a - b);
  const result = [];
  sorted.forEach((value, index) => {
    if (index > 0 && value - sorted[index - 1] > 1) result.push(`gap-${value}`);
    result.push(value);
  });
  return result;
}

export default function Pagination({
  page,
  pageCount,
  onChange,
  total,
  pageSize,
  label = 'items',
}) {
  if (pageCount <= 1 && !total) return null;

  const from = total ? (page - 1) * pageSize + 1 : 0;
  const to = total ? Math.min(page * pageSize, total) : 0;

  return (
    <div className="pagination">
      {total ? (
        <p className="pagination__summary">
          <strong>{from}</strong>–<strong>{to}</strong> of <strong>{total}</strong> {label}
        </p>
      ) : (
        <span />
      )}
      {pageCount > 1 ? (
        <div className="pagination__controls">
          <button
            type="button"
            className="pagination__arrow"
            onClick={() => onChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            <Icon name="chevronLeft" size={15} />
          </button>
          {pageItems(page, pageCount).map((item) =>
            typeof item === 'string' ? (
              <span className="pagination__gap" key={item}>
                …
              </span>
            ) : (
              <button
                type="button"
                key={item}
                className={`pagination__page ${item === page ? 'is-active' : ''}`.trim()}
                onClick={() => onChange(item)}
                aria-current={item === page ? 'page' : undefined}
              >
                {item}
              </button>
            ),
          )}
          <button
            type="button"
            className="pagination__arrow"
            onClick={() => onChange(page + 1)}
            disabled={page >= pageCount}
            aria-label="Next page"
          >
            <Icon name="chevronRight" size={15} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
