import { useState, useCallback } from 'react';
import { api } from '../utils/api';

export function useData() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [funnelData, setFunnelData] = useState(null);
  const [insightsData, setInsightsData] = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [funnel, insights] = await Promise.all([
        api.getFunnel(),
        api.getInsights(),
      ]);
      setFunnelData(funnel);
      setInsightsData(insights);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, funnelData, insightsData, loadAll };
}
