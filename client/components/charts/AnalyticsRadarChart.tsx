import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

type RadarDatum = {
  subject: string;
  score: number;
};

export default function AnalyticsRadarChart({ data }: { data: RadarDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={data}>
        <PolarGrid stroke="hsl(var(--muted))" />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fontWeight: 700 }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} axisLine={false} tick={false} />
        <Radar
          dataKey="score"
          stroke="hsl(var(--primary))"
          strokeWidth={3}
          fill="hsl(var(--primary))"
          fillOpacity={0.2}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
