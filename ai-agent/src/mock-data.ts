export const DEMO_EVENTS: Record<string, any> = {
  gpu_shortage: {
    news: "NVIDIA reports Q4 chip shortage affecting data centers",
    sentiment: 0.8,
    multiplier: 250, // 2.5x
  },
  bull_run: {
    news: "Bitcoin breaks $150k, AI tokens surge 40%",
    sentiment: 0.6,
    multiplier: 200, // 2.0x
  },
  low_demand: {
    news: "Market correction: Tech stocks down 15%",
    sentiment: -0.4,
    multiplier: 70, // 0.7x
  },
};

export function fetchMarketData() {
  const scenarios = [
    { stress: "High", event: "NVIDIA H100 shortage — supply chain issues in Taiwan", load: 0.95 },
    { stress: "Low", event: "New GPU cloud by AWS, supply increasing rapidly", load: 0.4 },
    { stress: "Medium", event: "Steady AI training demand from startups", load: 0.7 },
  ];
  return scenarios[Math.floor(Math.random() * scenarios.length)];
}
