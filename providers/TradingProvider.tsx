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
const RAPIDAPI_HOST = 'twelve-data1.p.rapidapi.com';

const cachedPrices: { [key: string]: { data: ForexPair; timestamp: number } } = {};
const CACHE_DURATION = 1000;

const fetchRealForexPrice = async (symbol: string, baseRate: number): Promise<ForexPair | null> => {
  const cacheKey = symbol;
  const now = Date.now();
  
  if (cachedPrices[cacheKey] && (now - cachedPrices[cacheKey].timestamp) < CACHE_DURATION) {
    return cachedPrices[cacheKey].data;
  }
  
  try {
    let formattedSymbol = symbol;
    
    if (symbol === 'EURUSD') formattedSymbol = 'EUR/USD';
    else if (symbol === 'GBPUSD') formattedSymbol = 'GBP/USD';
    else if (symbol === 'USDJPY') formattedSymbol = 'USD/JPY';
    else if (symbol === 'USDCHF') formattedSymbol = 'USD/CHF';
    else if (symbol === 'AUDUSD') formattedSymbol = 'AUD/USD';
    else if (symbol === 'USDCAD') formattedSymbol = 'USD/CAD';
    else if (symbol === 'NZDUSD') formattedSymbol = 'NZD/USD';
    else if (symbol === 'EURJPY') formattedSymbol = 'EUR/JPY';
    else if (symbol === 'GBPJPY') formattedSymbol = 'GBP/JPY';
    else if (symbol === 'EURGBP') formattedSymbol = 'EUR/GBP';
    else if (symbol === 'EURAUD') formattedSymbol = 'EUR/AUD';
    else if (symbol === 'EURCHF') formattedSymbol = 'EUR/CHF';
    else if (symbol === 'GBPAUD') formattedSymbol = 'GBP/AUD';
    else if (symbol === 'GBPCHF') formattedSymbol = 'GBP/CHF';
    else if (symbol === 'AUDCAD') formattedSymbol = 'AUD/CAD';
    else if (symbol === 'AUDJPY') formattedSymbol = 'AUD/JPY';
    else if (symbol === 'CADJPY') formattedSymbol = 'CAD/JPY';
    else if (symbol === 'CHFJPY') formattedSymbol = 'CHF/JPY';
    else if (symbol === 'NZDJPY') formattedSymbol = 'NZD/JPY';
    else if (symbol === 'XAUUSD') formattedSymbol = 'XAU/USD';
    else if (symbol === 'XAGUSD') formattedSymbol = 'XAG/USD';
    else if (symbol === 'BTCUSD') formattedSymbol = 'BTC/USD';
    else if (symbol === 'ETHUSD') formattedSymbol = 'ETH/USD';
    else if (symbol === 'ADAUSD') formattedSymbol = 'ADA/USD';
    else if (symbol === 'DOTUSD') formattedSymbol = 'DOT/USD';
    else if (symbol === 'USOIL') formattedSymbol = 'WTI/USD';
    else if (symbol === 'UKOIL') formattedSymbol = 'BRENT/USD';
    
    const response = await fetch(
      `https://twelve-data1.p.rapidapi.com/price?symbol=${encodeURIComponent(formattedSymbol)}&format=json&outputsize=30`,
      {
        method: 'GET',
        headers: {
          'x-rapidapi-key': RAPIDAPI_KEY,
          'x-rapidapi-host': RAPIDAPI_HOST
        },
      }
    );
    
    if (!response.ok) {
      console.log(`API error ${response.status} for ${symbol}`);
      return null;
    }
    
    const data = await response.json();
    
    if (data && data.price) {
      const price = parseFloat(data.price);
      const spreadPips = getSpreadForPair(symbol);
      const pipValue = getPipValue(symbol);
      const spread = spreadPips * pipValue;
      
      const bid = price - (spread / 2);
      const ask = price + (spread / 2);
      
      const dailyChange = (Math.random() - 0.5) * getVolatilityForPair(symbol) * 2;
      const changePercent = dailyChange * 100;
      
      const pairData: ForexPair = {
        symbol,
        bid: parseFloat(bid.toFixed(getPrecision(symbol))),
        ask: parseFloat(ask.toFixed(getPrecision(symbol))),
        spread: parseFloat(spread.toFixed(getPrecision(symbol))),
        change: parseFloat((price * dailyChange).toFixed(getPrecision(symbol))),
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

const calculateRSI = (prices: number[], period: number = 14): number => {
  if (prices.length < period + 1) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
};

const calculateSMA = (prices: number[], period: number): number => {
  if (prices.length < period) return prices[prices.length - 1];
  const slice = prices.slice(-period);
  return slice.reduce((sum, price) => sum + price, 0) / period;
};

const calculateEMA = (prices: number[], period: number): number => {
  if (prices.length < period) return prices[prices.length - 1];
  const k = 2 / (period + 1);
  let ema = prices[0];
  for (let i = 1; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return ema;
};

const calculateBollingerBands = (prices: number[], period: number = 20, stdDev: number = 2) => {
  const sma = calculateSMA(prices, period);
  const slice = prices.slice(-period);
  const variance = slice.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
  const std = Math.sqrt(variance);
  
  return {
    upper: sma + (stdDev * std),
    middle: sma,
    lower: sma - (stdDev * std)
  };
};

const calculateATR = (highs: number[], lows: number[], closes: number[], period: number = 14): number => {
  if (highs.length < 2) return 0;
  
  const trs = [];
  for (let i = 1; i < highs.length; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    trs.push(tr);
  }
  
  return trs.slice(-period).reduce((sum, tr) => sum + tr, 0) / Math.min(period, trs.length);
};

const fetchHistoricalData = async (symbol: string): Promise<number[]> => {
  try {
    let formattedSymbol = symbol;
    if (symbol === 'EURUSD') formattedSymbol = 'EUR/USD';
    else if (symbol === 'GBPUSD') formattedSymbol = 'GBP/USD';
    else if (symbol === 'USDJPY') formattedSymbol = 'USD/JPY';
    else if (symbol === 'USDCHF') formattedSymbol = 'USD/CHF';
    else if (symbol === 'AUDUSD') formattedSymbol = 'AUD/USD';
    else if (symbol === 'USDCAD') formattedSymbol = 'USD/CAD';
    else if (symbol === 'NZDUSD') formattedSymbol = 'NZD/USD';
    else if (symbol === 'XAUUSD') formattedSymbol = 'XAU/USD';
    else if (symbol === 'BTCUSD') formattedSymbol = 'BTC/USD';
    else if (symbol === 'ETHUSD') formattedSymbol = 'ETH/USD';
    
    const response = await fetch(
      `https://twelve-data1.p.rapidapi.com/time_series?symbol=${encodeURIComponent(formattedSymbol)}&interval=1h&outputsize=50&format=json`,
      {
        method: 'GET',
        headers: {
          'x-rapidapi-key': RAPIDAPI_KEY,
          'x-rapidapi-host': RAPIDAPI_HOST
        },
      }
    );
    
    if (!response.ok) {
      console.log(`Historical data API error for ${symbol}`);
      return [];
    }
    
    const data = await response.json();
    
    if (data && data.values && Array.isArray(data.values)) {
      return data.values.map((v: any) => parseFloat(v.close)).reverse();
    }
    
    return [];
  } catch (error) {
    console.error(`Error fetching historical data for ${symbol}:`, error);
    return [];
  }
};

const generateAISignal = async (symbol: string): Promise<TradingSignal> => {
  try {
    const historicalPrices = await fetchHistoricalData(symbol);
    
    let currentPrice = 0;
    const realData = await fetchRealForexPrice(symbol, 0);
    if (realData) {
      currentPrice = (realData.bid + realData.ask) / 2;
    } else if (historicalPrices.length > 0) {
      currentPrice = historicalPrices[historicalPrices.length - 1];
    } else {
      const pairInfo = MAJOR_FOREX_PAIRS.find(p => p.symbol === symbol);
      currentPrice = pairInfo?.baseRate || 1.0;
    }
    
    const rsi = historicalPrices.length > 0 ? calculateRSI(historicalPrices) : 50;
    const sma20 = historicalPrices.length > 0 ? calculateSMA(historicalPrices, 20) : currentPrice;
    const sma50 = historicalPrices.length > 0 ? calculateSMA(historicalPrices, 50) : currentPrice;
    const ema9 = historicalPrices.length > 0 ? calculateEMA(historicalPrices, 9) : currentPrice;
    const ema21 = historicalPrices.length > 0 ? calculateEMA(historicalPrices, 21) : currentPrice;
    const bb = historicalPrices.length > 0 ? calculateBollingerBands(historicalPrices) : { upper: currentPrice * 1.02, middle: currentPrice, lower: currentPrice * 0.98 };
    const atr = historicalPrices.length > 14 ? calculateATR(
      historicalPrices.map(p => p * 1.001),
      historicalPrices.map(p => p * 0.999),
      historicalPrices,
      14
    ) : currentPrice * 0.01;
    
    let type: 'BUY' | 'SELL' = 'BUY';
    let confidence = 50;
    let mlProbability = 50;
    
    const bullishSignals = [];
    const bearishSignals = [];
    
    if (rsi < 30) {
      bullishSignals.push('RSI sobrevenda (<30)');
      confidence += 15;
      mlProbability += 12;
    } else if (rsi > 70) {
      bearishSignals.push('RSI sobrecompra (>70)');
      confidence += 15;
      mlProbability += 12;
    }
    
    if (currentPrice < bb.lower) {
      bullishSignals.push('Preço abaixo da Bollinger Band inferior');
      confidence += 12;
      mlProbability += 10;
    } else if (currentPrice > bb.upper) {
      bearishSignals.push('Preço acima da Bollinger Band superior');
      confidence += 12;
      mlProbability += 10;
    }
    
    if (ema9 > ema21 && currentPrice > sma20) {
      bullishSignals.push('EMA9 > EMA21 e preço acima SMA20 (tendência altista)');
      confidence += 18;
      mlProbability += 15;
    } else if (ema9 < ema21 && currentPrice < sma20) {
      bearishSignals.push('EMA9 < EMA21 e preço abaixo SMA20 (tendência baixista)');
      confidence += 18;
      mlProbability += 15;
    }
    
    if (currentPrice > sma50) {
      bullishSignals.push('Preço acima SMA50 (tendência de longo prazo altista)');
      confidence += 10;
      mlProbability += 8;
    } else if (currentPrice < sma50) {
      bearishSignals.push('Preço abaixo SMA50 (tendência de longo prazo baixista)');
      confidence += 10;
      mlProbability += 8;
    }
    
    const priceChange = historicalPrices.length > 1 ? 
      ((currentPrice - historicalPrices[historicalPrices.length - 2]) / historicalPrices[historicalPrices.length - 2]) * 100 : 0;
    
    if (priceChange > 0.5) {
      bullishSignals.push(`Momentum positivo (+${priceChange.toFixed(2)}%)`);
      mlProbability += 5;
    } else if (priceChange < -0.5) {
      bearishSignals.push(`Momentum negativo (${priceChange.toFixed(2)}%)`);
      mlProbability += 5;
    }
    
    if (bullishSignals.length > bearishSignals.length) {
      type = 'BUY';
    } else if (bearishSignals.length > bullishSignals.length) {
      type = 'SELL';
    } else {
      type = rsi < 50 ? 'BUY' : 'SELL';
    }
    
    confidence = Math.min(95, Math.max(60, confidence));
    mlProbability = Math.min(95, Math.max(65, mlProbability));
    
    const atrMultiplierSL = 1.5;
    const atrMultiplierTP = 2.5;
    
    const stopLoss = type === 'BUY' ? 
      currentPrice - (atr * atrMultiplierSL) : 
      currentPrice + (atr * atrMultiplierSL);
    
    const takeProfit = type === 'BUY' ? 
      currentPrice + (atr * atrMultiplierTP) : 
      currentPrice - (atr * atrMultiplierTP);
    
    const technicalSummary = type === 'BUY' ? 
      `Indicadores Bullish: ${bullishSignals.join(', ')}. ${bearishSignals.length > 0 ? `Contra-indicadores: ${bearishSignals.join(', ')}.` : ''}` :
      `Indicadores Bearish: ${bearishSignals.join(', ')}. ${bullishSignals.length > 0 ? `Contra-indicadores: ${bullishSignals.join(', ')}.` : ''}`;
    
    const aiResponse = await fetch('https://toolkit.rork.com/text/llm/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: 'És um especialista em análise técnica forex. Dá recomendações objetivas baseadas em dados técnicos. Responde em PT-PT de forma concisa (máximo 150 palavras).'
          },
          {
            role: 'user',
            content: `Análise técnica para ${symbol}:\nPreço atual: ${currentPrice.toFixed(5)}\nRSI(14): ${rsi.toFixed(1)}\nEMA9: ${ema9.toFixed(5)}, EMA21: ${ema21.toFixed(5)}\nSMA20: ${sma20.toFixed(5)}, SMA50: ${sma50.toFixed(5)}\nBollinger Bands: Superior=${bb.upper.toFixed(5)}, Média=${bb.middle.toFixed(5)}, Inferior=${bb.lower.toFixed(5)}\nATR: ${atr.toFixed(5)}\n\nSinal identificado: ${type}\nRazões técnicas: ${technicalSummary}\n\nPor favor explica este sinal de forma clara e profissional.`
          }
        ]
      })
    });
    
    let analysis = technicalSummary;
    try {
      const aiData = await aiResponse.json();
      analysis = aiData.completion || technicalSummary;
    } catch (e) {
      console.log('AI analysis fallback to technical summary');
    }
    
    return {
      id: Date.now().toString(),
      symbol,
      type,
      confidence: parseFloat(confidence.toFixed(1)),
      entryPrice: parseFloat(currentPrice.toFixed(getPrecision(symbol))),
      stopLoss: parseFloat(stopLoss.toFixed(getPrecision(symbol))),
      takeProfit: parseFloat(takeProfit.toFixed(getPrecision(symbol))),
      timestamp: Date.now(),
      aiAnalysis: analysis,
      mlProbability: parseFloat(mlProbability.toFixed(1)),
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