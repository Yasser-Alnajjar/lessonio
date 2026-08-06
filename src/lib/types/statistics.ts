export interface StatCard {
  key: string;
  label: string;
  value: number;
  suffix?: string; // "%", "h", etc.
}

export interface ChartPoint {
  label: string; // x-axis: day, week, month name
  value: number;
}

export interface SubjectDistributionPoint {
  subjectName: string;
  subjectColor: string;
  value: number;
}

export interface HeatMapCell {
  date: string; // ISO date
  intensity: number; // 0-4
}

export interface StatisticsOverviewData {
  cards: StatCard[];
  weeklyStudyTime: ChartPoint[];
  monthlyLessons: ChartPoint[];
  attendanceBreakdown: ChartPoint[];
  subjectDistribution: SubjectDistributionPoint[];
  studyProgress: ChartPoint[];
  heatMap: HeatMapCell[];
  dailyActivity: ChartPoint[];
  monthlyGrowth: ChartPoint[];
}
