// Small HTML charts on Kern tokens, following the dataviz rules: thin columns (<= 24px) with 4px rounded data-ends
// on one baseline, recessive hairline grid, a legend only for two or more series, labels sparingly
// (value on the last column's cap), a hover tooltip on every mark, and a table view.
import { useId } from 'react'

const number = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 })

export function ColumnChart({ title, subtitle, data, series, format = value => number.format(value), max: fixedMax, emptyText = 'No data yet.' }) {
  const id = useId()
  const max = fixedMax ?? Math.max(1, ...data.flatMap(row => series.map(item => row[item.key] ?? 0)))
  const ticks = [0, 0.5, 1].map(step => step * max)
  return <figure className="chart" aria-labelledby={`${id}-title`}>
    <figcaption className="chart-heading">
      <h3 id={`${id}-title`}>{title}</h3>
      {subtitle && <p>{subtitle}</p>}
    </figcaption>
    {series.length > 1 && <ul className="chart-legend">{series.map(item => <li key={item.key}><i data-series={item.tone} aria-hidden="true" />{item.label}</li>)}</ul>}
    {data.length === 0 ? <p className="chart-empty">{emptyText}</p> : <>
      <div className="chart-plot" role="img" aria-label={`${title}: ${data.map(row => `${row.label} ${series.map(item => `${item.label.toLowerCase()} ${format(row[item.key] ?? 0)}`).join(', ')}`).join('; ')}`}>
        <div className="chart-grid" aria-hidden="true">{[...ticks].reverse().map(tick => <span key={tick}><em>{format(tick)}</em></span>)}</div>
        <div className="chart-columns" style={{ '--columns': data.length }}>
          {data.map((row, index) => <div className="chart-group" key={row.label}>
            <div className="chart-bars">
              {series.map(item => {
                const value = row[item.key] ?? 0
                return <span key={item.key} className="chart-bar" data-series={item.tone} style={{ height: `${Math.max(value / max * 100, value ? 2 : 0)}%` }}
                  data-tip={`${row.label} · ${item.label}: ${format(value)}`}>
                  {index === data.length - 1 && series.length === 1 && <b>{format(value)}</b>}
                </span>
              })}
            </div>
            <span className="chart-label">{row.short ?? row.label}</span>
          </div>)}
        </div>
      </div>
      <details className="chart-table">
        <summary>View as table</summary>
        <table><thead><tr><th scope="col">{data[0]?.axis ?? 'Month'}</th>{series.map(item => <th scope="col" key={item.key}>{item.label}</th>)}</tr></thead>
          <tbody>{data.map(row => <tr key={row.label}><th scope="row">{row.label}</th>{series.map(item => <td key={item.key}>{format(row[item.key] ?? 0)}</td>)}</tr>)}</tbody></table>
      </details>
    </>}
  </figure>
}

// Status split as one segmented bar with a labelled legend (identity never relies on colour alone).
export function StatusSplit({ title, items, labels, order }) {
  const total = order.reduce((sum, key) => sum + (items[key] ?? 0), 0)
  return <figure className="chart chart-split">
    <figcaption className="chart-heading"><h3>{title}</h3><p>{total} in total</p></figcaption>
    <div className="status-bar" role="img" aria-label={order.map(key => `${items[key] ?? 0} ${labels[key].toLowerCase()}`).join(', ')}>
      {total ? order.map(key => items[key] > 0 && <span key={key} data-status={key} style={{ flexGrow: items[key] }} data-tip={`${labels[key]}: ${items[key]}`} />) : <span data-status="empty" />}
    </div>
    <ul className="status-legend">{order.map(key => <li key={key} data-status={key}><i aria-hidden="true" />{labels[key]} <strong>{items[key] ?? 0}</strong></li>)}</ul>
  </figure>
}
