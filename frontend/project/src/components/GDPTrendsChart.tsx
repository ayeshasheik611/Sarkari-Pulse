import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Download } from 'lucide-react';
import { ChartExporter } from '../utils/chartExport';

interface GDPTrendsChartProps {
  countryCodes: string[];
  title?: string;
  height?: number;
}

interface TrendData {
  year: number;
  [countryCode: string]: number;
}

const GDPTrendsChart: React.FC<GDPTrendsChartProps> = ({ 
  countryCodes, 
  title = "GDP Growth Trends",
  height = 400 
}) => {
  const [trendsData, setTrendsData] = useState<TrendData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  useEffect(() => {
    const loadTrendsData = async () => {
      try {
        setIsLoading(true);
        const dataService = (await import('../services/dataService')).DataService.getInstance();
        const trends = await dataService.getGDPTrendsForCountries(countryCodes);
        
        // Transform data for chart
        const yearSet = new Set<number>();
        Object.values(trends).forEach(countryTrends => {
          countryTrends.forEach(trend => yearSet.add(trend.year));
        });
        
        const years = Array.from(yearSet).sort();
        const chartData: TrendData[] = years.map(year => {
          const dataPoint: TrendData = { year };
          countryCodes.forEach(countryCode => {
            const countryTrends = trends[countryCode] || [];
            const yearData = countryTrends.find(trend => trend.year === year);
            dataPoint[countryCode] = yearData ? yearData.gdp / 1e12 : 0; // Convert to trillions
          });
          return dataPoint;
        });
        
        setTrendsData(chartData);
      } catch (error) {
        console.error('Error loading GDP trends:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (countryCodes.length > 0) {
      loadTrendsData();
    }
  }, [countryCodes]);

  const handleExport = async () => {
    try {
      await ChartExporter.exportChart('gdp-trends-chart', {
        filename: `gdp-trends-${countryCodes.join('-')}-${new Date().toISOString().split('T')[0]}`,
        format: 'png',
        quality: 2.0
      });
    } catch (error) {
      console.error('Error exporting chart:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading GDP trends...</div>
        </div>
      </div>
    );
  }

  if (trendsData.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <div className="text-gray-500">No trend data available</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="gdp-trends-chart" className="bg-gray-50 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        <button 
          onClick={handleExport}
          className="text-gray-500 hover:text-gray-700"
          title="Export chart"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
      
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={trendsData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="year" 
            type="number"
            scale="linear"
            domain={['dataMin', 'dataMax']}
          />
          <YAxis 
            label={{ value: 'GDP (Trillions USD)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip 
            formatter={(value: number, name: string) => [
              `$${value.toFixed(2)}T`, 
              name
            ]}
            labelFormatter={(year) => `Year: ${year}`}
          />
          <Legend />
          {countryCodes.map((countryCode, index) => (
            <Line
              key={countryCode}
              type="monotone"
              dataKey={countryCode}
              stroke={COLORS[index % COLORS.length]}
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              name={countryCode}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      
      <div className="mt-4 text-sm text-gray-600">
        <p>GDP trends from 2000-2023 for selected countries (World Bank data)</p>
      </div>
    </div>
  );
};

export default GDPTrendsChart;