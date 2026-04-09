import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

type StudyTimeSlice = {
  name: string;
  value: number;
  color: string;
};

const RADIAN = Math.PI / 180;

const renderCustomLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: any) => {
  if (percent < 0.05) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      className="text-xs font-black"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const formatMins = (mins: number) => {
  if (mins === 0) return "0m";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
};

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0].payload;
  return (
    <div className="bg-card border rounded-xl px-3 py-2 shadow-lg text-xs font-bold">
      <span className="text-foreground">{name}</span>
      <span className="text-muted-foreground ml-2">{formatMins(value)}</span>
    </div>
  );
};

export default function StudyTimeDonutChart({
  manualMinutes,
  focusMinutes,
}: {
  manualMinutes: number;
  focusMinutes: number;
}) {
  const total = manualMinutes + focusMinutes;

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm font-medium gap-2">
        <div className="w-24 h-24 rounded-full border-4 border-dashed border-muted flex items-center justify-center">
          <span className="text-lg font-black">0m</span>
        </div>
        <p className="text-xs">No study time logged yet</p>
      </div>
    );
  }

  const data: StudyTimeSlice[] = [
    { name: "Manual", value: manualMinutes, color: "#14b8a6" },
    { name: "Goal-Linked Focus", value: focusMinutes, color: "#6366f1" },
  ].filter((s) => s.value > 0);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="w-full h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={data.length > 1 ? 4 : 0}
              dataKey="value"
              labelLine={false}
              label={renderCustomLabel}
              strokeWidth={0}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <text
              x="50%"
              y="46%"
              textAnchor="middle"
              dominantBaseline="central"
              className="text-2xl font-black fill-foreground"
            >
              {formatMins(total)}
            </text>
            <text
              x="50%"
              y="58%"
              textAnchor="middle"
              dominantBaseline="central"
              className="text-[10px] font-bold uppercase tracking-widest fill-muted-foreground"
            >
              total
            </text>
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-center gap-6">
        {data.map((slice) => (
          <div key={slice.name} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: slice.color }}
            />
            <span className="text-xs font-bold text-muted-foreground">
              {slice.name}
            </span>
            <span className="text-xs font-black text-foreground">
              {formatMins(slice.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
