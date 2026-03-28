import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type StreakPoint = {
  day: string;
  score: number;
};

export default function StreaksConsistencyChart({ data }: { data: StreakPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
        <defs>
          <filter id="streaks-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        <CartesianGrid
          strokeDasharray="5 5"
          vertical={true}
          horizontal={true}
          stroke="hsl(var(--muted)/0.2)"
        />
        <XAxis
          dataKey="day"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 13, fontWeight: 700, fill: "hsl(var(--muted-foreground))" }}
          dy={15}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fontWeight: 700, fill: "hsl(var(--muted-foreground))" }}
          domain={[0, 100]}
          tickFormatter={(val) => `${val}%`}
          dx={-10}
        />
        <Tooltip
          contentStyle={{
            borderRadius: "24px",
            border: "2px border-primary/10",
            backgroundColor: "hsl(var(--background)/0.9)",
            backdropFilter: "blur(8px)",
            boxShadow: "0 20px 40px -10px rgba(0,0,0,0.1)",
            fontWeight: "800",
            padding: "16px",
          }}
          itemStyle={{ color: "hsl(var(--primary))" }}
        />
        <Line
          type="monotone"
          dataKey="score"
          stroke="hsl(var(--primary))"
          strokeWidth={5}
          dot={{ r: 6, fill: "hsl(var(--primary))", strokeWidth: 3, stroke: "#fff" }}
          activeDot={{ r: 9, fill: "hsl(var(--primary))", strokeWidth: 4, stroke: "#fff" }}
          filter="url(#streaks-glow)"
          animationDuration={2000}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
