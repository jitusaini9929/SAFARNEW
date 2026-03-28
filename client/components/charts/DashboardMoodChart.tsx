import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type WeeklyMoodPoint = {
  day: string;
  intensity: number;
  mood: string | number;
};

type DashboardMoodChartProps = {
  data: WeeklyMoodPoint[];
  moodIntensityLabel: string;
  moodLabel: string;
};

export default function DashboardMoodChart({
  data,
  moodIntensityLabel,
  moodLabel,
}: DashboardMoodChartProps) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <ComposedChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="dashboard-color-intensity" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" />
        <XAxis
          dataKey="day"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
        />
        <YAxis
          domain={[0, 5]}
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          width={30}
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--background))",
            borderColor: "hsl(var(--border))",
            borderRadius: "0.75rem",
            color: "hsl(var(--foreground))",
          }}
          labelStyle={{ fontWeight: "bold" }}
          formatter={(value: number | string, name: string) => {
            if (name === "mood") return [value, moodLabel];
            if (name === "intensity") return [value, moodIntensityLabel];
            return [value, name];
          }}
          itemSorter={(item) => (item.dataKey === "mood" ? -1 : 1)}
          cursor={{ fill: "hsl(var(--primary) / 0.1)" }}
        />
        <Legend wrapperStyle={{ fontSize: "0.8rem", paddingTop: "1rem" }} />
        <Area
          type="monotone"
          dataKey="intensity"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#dashboard-color-intensity)"
          name={moodIntensityLabel}
        />
        <Line
          type="monotone"
          dataKey="mood"
          stroke="hsl(var(--secondary))"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 6 }}
          name={moodLabel}
          strokeOpacity={0}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
