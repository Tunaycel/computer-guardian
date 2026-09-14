import type { ReactNode } from "react";

interface Column<Row> {
  key: string;
  label: string;
  render: (row: Row) => ReactNode;
}

interface TableProps<Row> {
  caption: string;
  columns: readonly Column<Row>[];
  rows: readonly Row[];
  rowKey: (row: Row) => string;
}

export function Table<Row>({ caption, columns, rows, rowKey }: TableProps<Row>) {
  return (
    <div className="table-scroll" role="region" aria-label={caption} tabIndex={0}>
      <table>
        <caption className="sr-only">{caption}</caption>
        <thead><tr>{columns.map(column => <th scope="col" key={column.key}>{column.label}</th>)}</tr></thead>
        <tbody>{rows.map(row => <tr key={rowKey(row)}>{columns.map((column, index) => index === 0
          ? <th scope="row" key={column.key}>{column.render(row)}</th>
          : <td key={column.key}>{column.render(row)}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
