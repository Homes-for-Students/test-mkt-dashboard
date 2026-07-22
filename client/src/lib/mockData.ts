export interface Property {
  id: string;
  name: string;
  city: string;
  beds: number;
  occupancyRate: number;
  brand: string;
}

export interface ChannelMetrics {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  ctr: number;
  cpc: number;
  roas: number;
}

export interface PropertyData {
  propertyId: string;
  propertyName: string;
  city: string;
  overall: ChannelMetrics;
  channels: {
    googleAds: ChannelMetrics;
    metaAds: ChannelMetrics;
    googleMaps: {
      views: number;
      searches: number;
      actions: number; // website clicks, directions, calls
    };
    studentCrowd: {
      views: number;
      reviews: number;
      leads: number;
      rating: number;
    };
    emailMarketing: ChannelMetrics;
  };
}

export interface Campaign {
  id: string;
  name: string;
  channel: 'Google Ads' | 'Meta Ads' | 'StudentCrowd' | 'Email';
  status: 'Active' | 'Paused' | 'Completed' | 'Optimizing';
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  roas: number;
  trend: 'up' | 'down' | 'stable';
}

export interface HeatmapPoint {
  lat: number;
  lng: number;
  weight: number;
  cityName: string;
  propertyCount: number;
  leadsCount: number;
}

// Generate data for 200+ properties across major UK student cities
export const UK_CITIES = [
  { name: 'London', lat: 51.5074, lng: -0.1278 },
  { name: 'Manchester', lat: 53.4808, lng: -2.2426 },
  { name: 'Birmingham', lat: 52.4862, lng: -1.8904 },
  { name: 'Leeds', lat: 53.8008, lng: -1.5491 },
  { name: 'Sheffield', lat: 53.3811, lng: -1.4701 },
  { name: 'Liverpool', lat: 53.4084, lng: -2.9916 },
  { name: 'Newcastle', lat: 54.9783, lng: -1.6178 },
  { name: 'Bristol', lat: 51.4545, lng: -2.5879 },
  { name: 'Nottingham', lat: 52.9548, lng: -1.1581 },
  { name: 'Glasgow', lat: 55.8642, lng: -4.2518 },
  { name: 'Edinburgh', lat: 55.9533, lng: -3.1883 },
  { name: 'Cardiff', lat: 51.4816, lng: -3.1791 },
  { name: 'Leicester', lat: 52.6369, lng: -1.1398 },
  { name: 'Coventry', lat: 52.4068, lng: -1.5197 },
  { name: 'Southampton', lat: 50.9097, lng: -1.4044 },
];

// Helper to generate realistic properties (exactly 20 real properties under HFS brands)
export const generateProperties = (): Property[] => {
  return [
    { id: 'prop-1', name: 'Brunswick House', brand: 'Homes for Students', city: 'Southampton', beds: 350, occupancyRate: 94.2 },
    { id: 'prop-2', name: 'Calcott Ten', brand: 'Homes for Students', city: 'Coventry', beds: 420, occupancyRate: 91.5 },
    { id: 'prop-3', name: 'City Heights', brand: 'Homes for Students', city: 'Cardiff', beds: 500, occupancyRate: 95.8 },
    { id: 'prop-4', name: 'Park Court', brand: 'Homes for Students', city: 'Sheffield', beds: 280, occupancyRate: 89.4 },
    { id: 'prop-5', name: 'St Giles Point', brand: 'Homes for Students', city: 'London', beds: 180, occupancyRate: 98.2 },
    { id: 'prop-6', name: 'The Groves', brand: 'Homes for Students', city: 'Leeds', beds: 310, occupancyRate: 92.0 },
    { id: 'prop-7', name: 'Element', brand: 'Homes for Students', city: 'Sheffield', beds: 450, occupancyRate: 90.1 },
    { id: 'prop-8', name: 'Boyce House', brand: 'Prestige Student Living', city: 'Glasgow', beds: 250, occupancyRate: 96.5 },
    { id: 'prop-9', name: 'Bridle Works', brand: 'Prestige Student Living', city: 'Glasgow', beds: 380, occupancyRate: 97.8 },
    { id: 'prop-10', name: 'Goods Corner', brand: 'Prestige Student Living', city: 'Edinburgh', beds: 210, occupancyRate: 99.1 },
    { id: 'prop-11', name: 'Stanley Court', brand: 'Prestige Student Living', city: 'Liverpool', beds: 160, occupancyRate: 95.0 },
    { id: 'prop-12', name: 'Straits Meadow', brand: 'Prestige Student Living', city: 'Edinburgh', beds: 290, occupancyRate: 94.7 },
    { id: 'prop-13', name: 'The Glasshouse', brand: 'Prestige Student Living', city: 'Nottingham', beds: 620, occupancyRate: 93.3 },
    { id: 'prop-14', name: 'The Metropolis', brand: 'Essential Student Living', city: 'Manchester', beds: 550, occupancyRate: 88.9 },
    { id: 'prop-15', name: 'Century Square', brand: 'Essential Student Living', city: 'Sheffield', beds: 320, occupancyRate: 92.4 },
    { id: 'prop-16', name: 'Corporation Common', brand: 'Essential Student Living', city: 'Coventry', beds: 480, occupancyRate: 90.7 },
    { id: 'prop-17', name: 'Garth Heads', brand: 'Essential Student Living', city: 'Newcastle', beds: 190, occupancyRate: 91.2 },
    { id: 'prop-18', name: 'EVO Liverpool', brand: 'EVO Student', city: 'Liverpool', beds: 340, occupancyRate: 96.2 },
    { id: 'prop-19', name: 'St Andrews Court', brand: 'Urban Student Life', city: 'Glasgow', beds: 220, occupancyRate: 95.5 },
    { id: 'prop-20', name: 'Austin Hall', brand: 'Universal Student Living', city: 'Leeds', beds: 270, occupancyRate: 93.8 },
  ];
};

export const PROPERTIES = generateProperties();

// Aggregated/Summary metrics for the PBSA portfolio (over 200 properties)
export const PORTFOLIO_SUMMARY = {
  totalProperties: PROPERTIES.length,
  totalBeds: PROPERTIES.reduce((sum, p) => sum + p.beds, 0),
  averageOccupancy: PROPERTIES.reduce((sum, p) => sum + p.occupancyRate, 0) / PROPERTIES.length,
  timePeriods: ['Last 7 Days', 'Last 30 Days', 'Last Quarter', 'This Year'],
};

// Generate Campaign metrics
export const CAMPAIGNS: Campaign[] = [
  {
    id: 'camp-1',
    name: 'Google Search - High Intent - London Chapters',
    channel: 'Google Ads',
    status: 'Active',
    spend: 42500,
    impressions: 280000,
    clicks: 32000,
    ctr: 11.4,
    conversions: 1850,
    roas: 4.8,
    trend: 'up',
  },
  {
    id: 'camp-2',
    name: 'Meta Retargeting - Video - Summer Booking Push',
    channel: 'Meta Ads',
    status: 'Active',
    spend: 28400,
    impressions: 850000,
    clicks: 45000,
    ctr: 5.29,
    conversions: 1210,
    roas: 3.9,
    trend: 'up',
  },
  {
    id: 'camp-3',
    name: 'StudentCrowd - Premium Profile & Review Boost',
    channel: 'StudentCrowd',
    status: 'Active',
    spend: 15000,
    impressions: 120000,
    clicks: 18000,
    ctr: 15.0,
    conversions: 620,
    roas: 3.1,
    trend: 'stable',
  },
  {
    id: 'camp-4',
    name: 'Google Performance Max - Regional Cities',
    channel: 'Google Ads',
    status: 'Active',
    spend: 31000,
    impressions: 540000,
    clicks: 41000,
    ctr: 7.59,
    conversions: 1420,
    roas: 4.2,
    trend: 'up',
  },
  {
    id: 'camp-5',
    name: 'Meta Lookalike - Freshers Audience 2026',
    channel: 'Meta Ads',
    status: 'Optimizing',
    spend: 19500,
    impressions: 620000,
    clicks: 28000,
    ctr: 4.52,
    conversions: 780,
    roas: 3.2,
    trend: 'down',
  },
  {
    id: 'camp-6',
    name: 'Email Nurture - Waitlist & Early Bird Bookers',
    channel: 'Email',
    status: 'Active',
    spend: 4500,
    impressions: 95000,
    clicks: 14000,
    ctr: 14.74,
    conversions: 590,
    roas: 8.5,
    trend: 'up',
  },
  {
    id: 'camp-7',
    name: 'Google Maps Local Pack - High Intent Directions',
    channel: 'Google Ads',
    status: 'Active',
    spend: 8500,
    impressions: 310000,
    clicks: 22000,
    ctr: 7.1,
    conversions: 410,
    roas: 3.6,
    trend: 'stable',
  },
  {
    id: 'camp-8',
    name: 'Meta Carousel - Virtual 3D Room Tours',
    channel: 'Meta Ads',
    status: 'Paused',
    spend: 12000,
    impressions: 410000,
    clicks: 19500,
    ctr: 4.76,
    conversions: 390,
    roas: 2.8,
    trend: 'down',
  },
];

// Aggregated channel metrics
export const CHANNEL_PERFORMANCE_DATA = [
  { name: 'Google Ads', spend: 82000, conversions: 3680, revenue: 352800, clicks: 95000, color: '#3B82F6' },
  { name: 'Meta Ads', spend: 59900, conversions: 2380, revenue: 215600, clicks: 92500, color: '#8B5CF6' },
  { name: 'StudentCrowd', spend: 15000, conversions: 620, revenue: 46500, clicks: 18000, color: '#F59E0B' },
  { name: 'Email Marketing', spend: 4500, conversions: 590, revenue: 38250, clicks: 14000, color: '#10B981' },
  { name: 'Google Maps (Local)', spend: 5000, conversions: 250, revenue: 18000, clicks: 8000, color: '#EC4899' },
];

// Historical Performance (Last 6 Months)
export const HISTORICAL_PERFORMANCE = [
  { month: 'Jan', spend: 28000, revenue: 98000, leads: 1100, roas: 3.5 },
  { month: 'Feb', spend: 32000, revenue: 118400, leads: 1350, roas: 3.7 },
  { month: 'Mar', spend: 45000, revenue: 175500, leads: 1980, roas: 3.9 },
  { month: 'Apr', spend: 52000, revenue: 218400, leads: 2450, roas: 4.2 },
  { month: 'May', spend: 68000, revenue: 292400, leads: 3100, roas: 4.3 },
  { month: 'Jun', spend: 85000, revenue: 382500, leads: 3950, roas: 4.5 },
];

// Generate Heatmap points based on UK Cities & Property concentration
export const generateHeatmapPoints = (): HeatmapPoint[] => {
  const properties = PROPERTIES;
  
  return UK_CITIES.map(city => {
    const cityProps = properties.filter(p => p.city === city.name);
    const totalBeds = cityProps.reduce((sum, p) => sum + p.beds, 0);
    
    // Scale weights and lead metrics based on city size & properties
    const leadsCount = Math.floor(totalBeds * (0.8 + Math.random() * 0.5));
    const weight = Math.min(1.0, leadsCount / 3500); // normalized weight for heatmap

    return {
      lat: city.lat,
      lng: city.lng,
      weight,
      cityName: city.name,
      propertyCount: cityProps.length,
      leadsCount,
    };
  });
};

export const HEATMAP_POINTS = generateHeatmapPoints();

// Unified Google Cloud Integration status
export const INTEGRATION_STATUS = [
  { name: 'Google Ads API', source: 'Google Cloud ADC', status: 'Connected', lastSync: '10 mins ago', latency: '0.4s' },
  { name: 'Google Analytics (GA4)', source: 'Google Cloud ADC', status: 'Connected', lastSync: '15 mins ago', latency: '0.6s' },
  { name: 'Google Maps Profile', source: 'Dynamic Mock', status: 'Disconnected', lastSync: '1 hour ago', latency: '0.2s' },
  { name: 'StudentCrowd Feeds', source: 'Dynamic Mock', status: 'Connected', lastSync: '4 hours ago', latency: '1.1s' },
  { name: 'Sales Booking Sheets', source: 'Google Cloud ADC', status: 'Connected', lastSync: '2 mins ago', latency: '0.8s' },
];
