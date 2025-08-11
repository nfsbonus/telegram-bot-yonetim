import React, { ReactNode } from 'react';

interface TableProps<T> {
  data: T[];
  columns: {
    key: keyof T | 'actions';
    header: string;
    render?: (item: T) => ReactNode;
    className?: string;
  }[];
  onRowClick?: (item: T) => void;
  className?: string;
}

function Table<T extends { id: string }>({ 
  data, 
  columns, 
  onRowClick,
  className = ''
}: TableProps<T>) {
  return (
    <div className={`overflow-x-auto rounded-lg shadow ${className}`}>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key.toString()}
                scope="col"
                className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.className || ''}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center"
              >
                No data available
              </td>
            </tr>
          ) : (
            data.map((item, index) => (
              <tr
                key={item.id}
                className={onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}
                onClick={() => onRowClick && onRowClick(item)}
              >
                {columns.map((column) => (
                  <td
                    key={`${item.id}-${column.key.toString()}`}
                    className={`px-6 py-4 whitespace-nowrap text-sm ${column.className || ''}`}
                  >
                    {column.render
                      ? column.render(item)
                      : column.key !== 'actions'
                      ? String(item[column.key])
                      : null}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default Table;