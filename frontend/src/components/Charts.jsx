/**
 * Chart components.
 *
 * Thin, labelled wrappers around Recharts so every chart in the product shares
 * the same palette, tooltips, and accessible fallbacks. A chart with no data
 * renders an explanation instead of an empty grid.
 */
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const PALETTE = ['#16a34a', '#14532d', '#d97706', '#475569', '#1d4ed8', '#b91c1c'];

const axisProps = {
  stroke: '#8a9186',
  fontSize: 12,
  tickLine: false,
  axisLine: { stroke: '#e3e4dc' },
};

function ChartFrame({ title, description, height = 260, isEmpty, emptyMessage, children }) {
  return (
    <figure style={{ margin: 0 }}>
      {title ? (
        <figcaption className="stack-sm" style={{ marginBottom: 'var(--space-3)' }}>
          <span className="strong small">{title}</span>
          {description ? <span className="tiny muted">{description}</span> : null}
        </figcaption>
      ) : null}
      {isEmpty ? (
        <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
          <p className="small muted">{emptyMessage || 'No data recorded yet.'}</p>
        </div>
      ) : (
        <div style={{ width: '100%', height }}>{children}</div>
      )}
    </figure>
  );
}

const tooltipStyle = {
  borderRadius: 10,
  border: '1px solid #e3e4dc',
  boxShadow: '0 4px 12px rgba(31,36,32,0.08)',
  fontSize: 12,
};

export function TrendLineChart({ data, xKey = 'label', series = [], title, description, height }) {
  const isEmpty = !data?.length;
  return (
    <ChartFrame title={title} description={description} height={height} isEmpty={isEmpty} emptyMessage="No trend data recorded for this period yet.">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e3e4dc" vertical={false} />
          <XAxis dataKey={xKey} {...axisProps} />
          <YAxis {...axisProps} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} />
          {series.length > 1 ? <Legend wrapperStyle={{ fontSize: 12 }} /> : null}
          {series.map((s, index) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name || s.key}
              stroke={s.color || PALETTE[index % PALETTE.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function SurplusAreaChart({ data, xKey = 'label', series = [], title, description, height }) {
  const isEmpty = !data?.length;
  return (
    <ChartFrame title={title} description={description} height={height} isEmpty={isEmpty} emptyMessage="No food rescued in this period yet.">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e3e4dc" vertical={false} />
          <XAxis dataKey={xKey} {...axisProps} />
          <YAxis {...axisProps} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} />
          {series.map((s, index) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name || s.key}
              stroke={s.color || PALETTE[index % PALETTE.length]}
              fill={s.color || PALETTE[index % PALETTE.length]}
              fillOpacity={0.18}
              strokeWidth={2}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function ComparisonBarChart({ data, xKey = 'label', series = [], title, description, height, layout = 'horizontal' }) {
  const isEmpty = !data?.length;
  return (
    <ChartFrame title={title} description={description} height={height} isEmpty={isEmpty} emptyMessage="Nothing to compare yet.">
      <ResponsiveContainer>
        <BarChart data={data} layout={layout} margin={{ top: 8, right: 12, bottom: 4, left: layout === 'vertical' ? 40 : -12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e3e4dc" vertical={layout === 'vertical'} horizontal={layout !== 'vertical'} />
          {layout === 'vertical' ? (
            <>
              <XAxis type="number" {...axisProps} allowDecimals={false} />
              <YAxis type="category" dataKey={xKey} {...axisProps} width={110} />
            </>
          ) : (
            <>
              <XAxis dataKey={xKey} {...axisProps} />
              <YAxis {...axisProps} allowDecimals={false} />
            </>
          )}
          <Tooltip contentStyle={tooltipStyle} />
          {series.length > 1 ? <Legend wrapperStyle={{ fontSize: 12 }} /> : null}
          {series.map((s, index) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.name || s.key}
              fill={s.color || PALETTE[index % PALETTE.length]}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function CategoryPieChart({ data, nameKey = 'label', valueKey = 'value', title, description, height = 240 }) {
  const isEmpty = !data?.length || data.every((d) => !d[valueKey]);
  return (
    <ChartFrame title={title} description={description} height={height} isEmpty={isEmpty} emptyMessage="No category breakdown available yet.">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey={valueKey} nameKey={nameKey} innerRadius={50} outerRadius={82} paddingAngle={2}>
            {data.map((entry, index) => (
              <Cell key={entry[nameKey] || index} fill={PALETTE[index % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
