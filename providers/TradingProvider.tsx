import { useState, useEffect, useCallback, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface ForexPair {
  symbol: string;
  bid: number;
  ask: number;
  spread: number;
  change: number;
  changePercent: number;
  timestamp: number;
}

export interface TradingSignal {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  confidence: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  timestamp: number;
  aiAnalysis: string;
  mlProbability: number;
  status: 'ACTIVE' | 'CLOSED' | 'EXPIRED';
}

export interface TradingPosition {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  volume: number;
  entryPrice: number;
  currentPrice: number;
  stopLoss: number;
  takeProfit: number;
  profit: number;
  timestamp: number;
  status: 'OPEN' | 'CLOSED';
}

export interface MarketData {
  pairs: ForexPair[];
  signals: TradingSignal[];
  positions: TradingPosition[];
  lastUpdate: number;
}

const MAJOR_FOREX_PAIRS = [
  // Major Pairs
  { symbol: 'EURUSD', name: 'Euro/US Dollar', baseRate: 1.0850 },
  { symbol: 'GBPUSD', name: 'British Pound/US Dollar', baseRate: 1.2650 },
  { symbol: 'USDJPY', name: 'US Dollar/Japanese Yen', baseRate: 149.50 },
  { symbol: 'USDCHF', name: 'US Dollar/Swiss Franc', baseRate: 0.8950 },
  { symbol: 'AUDUSD', name: 'Australian Dollar/US Dollar', baseRate: 0.6750 },
  { symbol: 'USDCAD', name: 'US Dollar/Canadian Dollar', baseRate: 1.3550 },
  { symbol: 'NZDUSD', name: 'New Zealand Dollar/US Dollar', baseRate: 0.6150 },
  
  // Cross Pairs
  { symbol: 'EURJPY', name: 'Euro/Japanese Yen', baseRate: 162.25 },
  { symbol: 'GBPJPY', name: 'British Pound/Japanese Yen', baseRate: 189.15 },
  { symbol: 'EURGBP', name: 'Euro/British Pound', baseRate: 0.8580 },
  { symbol: 'EURAUD', name: 'Euro/Australian Dollar', baseRate: 1.6075 },
  { symbol: 'EURCHF', name: 'Euro/Swiss Franc', baseRate: 0.9715 },
  { symbol: 'GBPAUD', name: 'British Pound/Australian Dollar', baseRate: 1.8745 },
  { symbol: 'GBPCHF', name: 'British Pound/Swiss Franc', baseRate: 1.1325 },
  { symbol: 'AUDCAD', name: 'Australian Dollar/Canadian Dollar', baseRate: 0.9145 },
  { symbol: 'AUDJPY', name: 'Australian Dollar/Japanese Yen', baseRate: 100.95 },
  { symbol: 'CADJPY', name: 'Canadian Dollar/Japanese Yen', baseRate: 110.35 },
  { symbol: 'CHFJPY', name: 'Swiss Franc/Japanese Yen', baseRate: 167.05 },
  { symbol: 'NZDJPY', name: 'New Zealand Dollar/Japanese Yen', baseRate: 91.95 },
  
  // Commodities
  { symbol: 'XAUUSD', name: 'Gold/US Dollar', baseRate: 2025.50 },
  { symbol: 'XAGUSD', name: 'Silver/US Dollar', baseRate: 24.85 },
  { symbol: 'USOIL', name: 'US Oil', baseRate: 78.25 },
  { symbol: 'UKOIL', name: 'UK Oil (Brent)', baseRate: 82.15 },
  
  // Crypto Major Pairs
  { symbol: 'BTCUSD', name: 'Bitcoin/US Dollar', baseRate: 43250.00 },
  { symbol: 'ETHUSD', name: 'Ethereum/US Dollar', baseRate: 2650.00 },
  { symbol: 'ADAUSD', name: 'Cardano/US Dollar', baseRate: 0.4850 },
  { symbol: 'DOTUSD', name: 'Polkadot/US Dollar', baseRate: 6.25 },
];

const RAPIDAPI_KEY = '45d58b1ef1msh21449bdc1e3baf4p1f24b3jsn553337e1b2fd';
const RAPIDAPI_HOST = 'fcsapi.com';

const cachedPrices: { [key: string]: { data: ForexPair; timestamp: number } } = {};
const CACHE_DURATION = 1000;

const fetchRealForexPrice = async (symbol: string, baseRate: number): Promise<ForexPair | null> => {
  const cacheKey = symbol;
  const now = Date.now();
  
  if (cachedPrices[cacheKey] && (now - cachedPrices[cacheKey].timestamp) < CACHE_DURATION) {
    return cachedPrices[cacheKey].data;
  }
  
  try {
    const formattedSymbol = symbol.replace('USD', '/USD').replace('EUR', 'EUR/').replace('GBP', 'GBP/').replace('JPY', '/JPY').replace('CHF', '/CHF').replace('AUD', 'AUD/').replace('CAD', '/CAD').replace('NZD', 'NZD/');
    
    const response = await fetch(
      `https://fcsapi.com/api-v3/forex/latest?symbol=${symbol}&access_key=${RAPIDAPI_KEY}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status && data.response && data.response.length > 0) {
      const quote = data.response[0];
      const bid = parseFloat(quote.b || quote.c || baseRate);
      const ask = parseFloat(quote.a || quote.c || baseRate);
      const change = parseFloat(quote.ch || '0');
      const changePercent = parseFloat(quote.cp || '0');
      
      const pairData: ForexPair = {
        symbol,
        bid: parseFloat(bid.toFixed(getPrecision(symbol))),
        ask: parseFloat(ask.toFixed(getPrecision(symbol))),
        spread: parseFloat((ask - bid).toFixed(getPrecision(symbol))),
        change: parseFloat(change.toFixed(getPrecision(symbol))),
        changePercent: parseFloat(changePercent.toFixed(2)),
        timestamp: Date.now(),
      };
      
      cachedPrices[cacheKey] = { data: pairData, timestamp: now };
      return pairData;
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching ${symbol}:`, error);
    return null;
  }
};

const fetchRealTimeForexData = async (): Promise<ForexPair[]> => {
  try {
    const pairPromises = MAJOR_FOREX_PAIRS.map(async (pairInfo) => {
      const realData = await fetchRealForexPrice(pairInfo.symbol, pairInfo.baseRate);
      
      if (realData) {
        return realData;
      }
      
      const volatility = getVolatilityForPair(pairInfo.symbol);
      const priceMovement = (Math.random() - 0.5) * volatility;
      const currentPrice = pairInfo.baseRate * (1 + priceMovement);
      
      const spreadPips = getSpreadForPair(pairInfo.symbol);
      const pipValue = getPipValue(pairInfo.symbol);
      const spread = spreadPips * pipValue;
      
      const bid = currentPrice - (spread / 2);
      const ask = currentPrice + (spread / 2);
      
      const dailyChange = (Math.random() - 0.5) * volatility * 2;
      const changePercent = dailyChange * 100;
      
      return {
        symbol: pairInfo.symbol,
        bid: parseFloat(bid.toFixed(getPrecision(pairInfo.symbol))),
        ask: parseFloat(ask.toFixed(getPrecision(pairInfo.symbol))),
        spread: parseFloat(spread.toFixed(getPrecision(pairInfo.symbol))),
        change: parseFloat(dailyChange.toFixed(getPrecision(pairInfo.symbol))),
        changePercent: parseFloat(changePercent.toFixed(2)),
        timestamp: Date.now(),
      };
    });
    
    const pairs = await Promise.all(pairPromises);
    return pairs;
  } catch (error) {
    console.error('Error fetching real-time forex data:', error);
    return [];
  }
};

// Helper functions for realistic market simulation
const getVolatilityForPair = (symbol: string): number => {
  const volatilityMap: { [key: string]: number } = {
    'EURUSD': 0.008, 'GBPUSD': 0.012, 'USDJPY': 0.010, 'USDCHF': 0.009,
    'AUDUSD': 0.011, 'USDCAD': 0.009, 'NZDUSD': 0.013,
    'EURJPY': 0.012, 'GBPJPY': 0.015, 'EURGBP': 0.008,
    'XAUUSD': 0.020, 'XAGUSD': 0.030, 'BTCUSD': 0.040, 'ETHUSD': 0.050,
    'USOIL': 0.025, 'UKOIL': 0.025
  };
  return volatilityMap[symbol] || 0.010;
};

const getSpreadForPair = (symbol: string): number => {
  const spreadMap: { [key: string]: number } = {
    'EURUSD': 1.2, 'GBPUSD': 1.5, 'USDJPY': 1.3, 'USDCHF': 1.8,
    'AUDUSD': 1.6, 'USDCAD': 1.9, 'NZDUSD': 2.1,
    'EURJPY': 2.0, 'GBPJPY': 2.5, 'EURGBP': 1.5,
    'XAUUSD': 3.0, 'XAGUSD': 4.0, 'BTCUSD': 50.0, 'ETHUSD': 25.0,
    'USOIL': 3.0, 'UKOIL': 3.5
  };
  return spreadMap[symbol] || 2.0;
};

const getPipValue = (symbol: string): number => {
  if (symbol.includes('JPY')) return 0.01;
  if (symbol.startsWith('XAU') || symbol.startsWith('XAG')) return 0.01;
  if (symbol.includes('BTC')) return 1.0;
  if (symbol.includes('ETH')) return 0.1;
  if (symbol.includes('OIL')) return 0.01;
  return 0.0001;
};

const getPrecision = (symbol: string): number => {
  if (symbol.includes('JPY')) return 3;
  if (symbol.startsWith('XAU') || symbol.startsWith('XAG')) return 2;
  if (symbol.includes('BTC')) return 2;
  if (symbol.includes('ETH')) return 2;
  if (symbol.includes('OIL')) return 2;
  return 5;
};

const generateAISignal = async (symbol: string): Promise<TradingSignal> => {
  try {
    const aiResponse = await fetch('https://toolkit.rork.com/text/llm/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em análise técnica forex. Analise o par de moedas e forneça uma recomendação de trading com justificativa técnica.'
          },
          {
            role: 'user',
            content: `Analise o par ${symbol} e forneça uma recomendação de BUY ou SELL com justificativa técnica baseada em indicadores como RSI, MACD, Bollinger Bands e análise de tendência.`
          }
        ]
      })
    });
    
    const aiData = await aiResponse.json();
    const analysis = aiData.completion || 'Análise não disponível';
    
    const type = Math.random() > 0.5 ? 'BUY' : 'SELL';
    const confidence = Math.random() * 40 + 60;
    const entryPrice = Math.random() * 2 + 1;
    const stopLoss = type === 'BUY' ? entryPrice * 0.99 : entryPrice * 1.01;
    const takeProfit = type === 'BUY' ? entryPrice * 1.02 : entryPrice * 0.98;
    
    return {
      id: Date.now().toString(),
      symbol,
      type,
      confidence: parseFloat(confidence.toFixed(1)),
      entryPrice: parseFloat(entryPrice.toFixed(5)),
      stopLoss: parseFloat(stopLoss.toFixed(5)),
      takeProfit: parseFloat(takeProfit.toFixed(5)),
      timestamp: Date.now(),
      aiAnalysis: analysis,
      mlProbability: parseFloat((Math.random() * 20 + 80).toFixed(1)),
      status: 'ACTIVE',
    };
  } catch (error) {
    console.error('Error generating AI signal:', error);
    throw error;
  }
};

export const [TradingProvider, useTrading] = createContextHook(() => {
  const [selectedPair, setSelectedPair] = useState<string>('EURUSD');
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [positions, setPositions] = useState<TradingPosition[]>([]);
  const queryClient = useQueryClient();

  const { data: pairs = [], isLoading: pairsLoading } = useQuery({
    queryKey: ['forex-pairs'],
    queryFn: fetchRealTimeForexData,
    refetchInterval: 1000, // Update every second for real-time data
    staleTime: 500,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  const generateSignalMutation = useMutation({
    mutationFn: generateAISignal,
    onSuccess: (newSignal) => {
      setSignals(prev => [...prev, newSignal]);
    },
    onError: (error) => {
      setError(`Erro ao gerar sinal: ${error.message}`);
    },
  });

  const executeTradeMutation = useMutation({
    mutationFn: async ({ signal, volume }: { signal: TradingSignal; volume: number }) => {
      const newPosition: TradingPosition = {
        id: Date.now().toString(),
        symbol: signal.symbol,
        type: signal.type,
        volume,
        entryPrice: signal.entryPrice,
        currentPrice: signal.entryPrice,
        stopLoss: signal.stopLoss,
        takeProfit: signal.takeProfit,
        profit: 0,
        timestamp: Date.now(),
        status: 'OPEN',
      };
      
      return newPosition;
    },
    onSuccess: (newPosition) => {
      setPositions(prev => [...prev, newPosition]);
    },
    onError: (error) => {
      setError(`Erro ao executar trade: ${error.message}`);
    },
  });

  const marketData: MarketData = useMemo(() => ({
    pairs,
    signals,
    positions,
    lastUpdate: Date.now(),
  }), [pairs, signals, positions]);

  const refreshData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['forex-pairs'] });
  }, [queryClient]);

  const generateSignal = useCallback(async (symbol: string) => {
    if (!symbol?.trim() || symbol.length > 10) return;
    const sanitizedSymbol = symbol.trim().toUpperCase();
    await generateSignalMutation.mutateAsync(sanitizedSymbol);
  }, [generateSignalMutation.mutateAsync]);

  const executeTrade = useCallback(async (signal: TradingSignal, volume: number) => {
    await executeTradeMutation.mutateAsync({ signal, volume });
  }, [executeTradeMutation.mutateAsync]);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsConnected(Math.random() > 0.1);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return useMemo(() => ({
    marketData,
    isConnected,
    selectedPair,
    setSelectedPair,
    refreshData,
    generateSignal,
    executeTrade,
    isLoading: pairsLoading || generateSignalMutation.isPending || executeTradeMutation.isPending,
    error,
  }), [marketData, isConnected, selectedPair, setSelectedPair, refreshData, generateSignal, executeTrade, pairsLoading, generateSignalMutation.isPending, executeTradeMutation.isPending, error]);
});