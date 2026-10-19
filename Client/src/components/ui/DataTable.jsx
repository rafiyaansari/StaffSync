import { useEffect, useMemo, useState } from 'react';
import Icon from './Icon';
import Pagination from './Pagination';
import EmptyState from './EmptyState';

function compare(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

/**
 * Lightweight table with optional sorting and pagination.
 * Columns: { key, label, sortable, align, width, render, sortValue, className }
 */
export default function DataTable({
  columns,
  rows,
  rowKey = 'id',
  pageSize = 8,
  initialSort = null,
  onRowClick,
  emptyState,
  ariaLabel = 'Data table',
  pagination = true,
  className = '',
  dense = false,
  footer,
}) {
  const [sort, setSort] = useState(initialSort);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [rows.length, pageSize]);

  const sorted = useMemo(() => {
    if (!sort?.key) return rows;
    const column = columns.find((item) => item.key === sort.key);
    const getValue = (row) =>
      column?.sortValue ? column.sortValue(row) : row[sort.key];
    return [...rows].sort((a, b) => {
      const delta = compare(getValue(a), getValue(b));
      return sort.direction === 'desc' ? -delta : delta;
    });
  }, [rows, sort, columns]);

  const total = sorted.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);
  const visible = pagination ? sorted.slice((safePage - 1) * pageSize, safePage * pageSize) : sorted;

  const toggleSort = (column) => {
    if (!column.sortable) return;
    setSort((current) => {
      if (current?.key === column.key) {
        return { key: column.key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key: column.key, direction: 'asc' };
    });
  };

  return (
    <div className={`data-table-block ${className}`.trim()}>
      <div className="table-scroll">
        <table className={`data-table ${dense ? 'data-table--dense' : ''}`.trim()} aria-label={ariaLabel}>
          <thead>
            <tr>
              {columns.map((column) => {
                const isSorted = sort?.key === column.key;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    className={`${column.align === 'right' ? 'is-right' : ''} ${
                      column.sortable ? 'is-sortable' : ''
                    } ${isSorted ? 'is-sorted' : ''} ${column.className || ''}`.trim()}
                    style={column.width ? { width: column.width } : undefined}
                    aria-sort={
                      isSorted ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined
                    }
                  >
                    {column.sortable ? (
                      <button type="button" className="data-table__sort" onClick={() => toggleSort(column)}>
                        <span>{column.label}</span>
                        <Icon
                          name={
                            isSorted
                              ? sort.direction === 'asc'
                                ? 'chevronUp'
                                : 'chevronDown'
                              : 'selector'
                          }
                          size={13}
                          className={isSorted ? 'is-active' : undefined}
                        />
                      </button>
                    ) : (
                      column.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visible.length ? (
              visible.map((row, index) => (
                <tr
                  key={row[rowKey] ?? index}
                  className={onRowClick ? 'is-clickable' : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={
                    onRowClick
                      ? (event) => {
                          if (event.key === 'Enter') onRowClick(row);
                        }
                      : undefined
                  }
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`${column.align === 'right' ? 'is-right' : ''} ${column.className || ''}`.trim()}
                    >
                      {column.render ? column.render(row, index) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="data-table__empty-cell">
                  {emptyState || (
                    <EmptyState
                      icon="search"
                      title="Nothing to show"
                      description="Try changing the filters or search term."
                      compact
                    />
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pagination && total > 0 ? (
        <div className="data-table__footer">
          <Pagination
            page={safePage}
            pageCount={pageCount}
            onChange={setPage}
            total={total}
            pageSize={pageSize}
            label="records"
          />
        </div>
      ) : null}
      {footer}
    </div>
  );
}
