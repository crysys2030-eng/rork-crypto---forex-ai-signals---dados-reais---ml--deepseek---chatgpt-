import { useState, useEffect, useCallback, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { generateText, generateObject } from '@rork/toolkit-sdk';
import { z } from 'zod';

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
  marketSentiment?: string;
  technicalFactors?: string[];
}

export interface MarketAnalysis {
  symbol: string;
  overallSentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  sentimentScore: number;
  keyFactors: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  recommendation: string;
  priceTarget: number;
  timestamp: number;
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
  analyses: MarketAnalysis[];
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

const cachedPrices: { [key: string]: { data: ForexPair; timestamp: number } } = {};
const CACHE_DURATION = 50000;

const fetchRealForexPrice = async (symbol: string, baseRate: number): Promise<ForexPair | null> => {
  const cacheKey = symbol;
  const now = Date.now();
  
  if (cachedPrices[cacheKey] && (now - cachedPrices[cacheKey].timestamp) < CACHE_DURATION) {
    return cachedPrices[cacheKey].data;
  }
  
  try {
    let apiUrl = '';
    
    if (symbol.startsWith('BTC') || symbol.startsWith('ETH') || symbol === 'ADAUSD' || symbol === 'DOTUSD') {
      const cryptoSymbol = symbol.replace('USD', '').toLowerCase();
      apiUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoSymbol === 'btc' ? 'bitcoin' : cryptoSymbol === 'eth' ? 'ethereum' : cryptoSymbol === 'ada' ? 'cardano' : 'polkadot'}&vs_currencies=usd&include_24hr_change=true`;
    } else if (symbol.startsWith('XAU') || symbol.startsWith('XAG')) {
      const metalSymbol = symbol === 'XAUUSD' ? 'XAU' : 'XAG';
      apiUrl = `https://api.exchangerate-api.com/v4/latest/USD`;
    } else {
      const base = symbol.substring(0, 3);
      const quote = symbol.substring(3, 6);
      apiUrl = `https://api.exchangerate-api.com/v4/latest/${base}`;
    }
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.log(`API error ${response.status} for ${symbol}`);
      return null;
    }
    
    const data = await response.json();
    let price = 0;
    let changePercent = 0;
    
    if (symbol.startsWith('BTC') || symbol.startsWith('ETH') || symbol === 'ADAUSD' || symbol === 'DOTUSD') {
      const cryptoKey = symbol === 'BTCUSD' ? 'bitcoin' : symbol === 'ETHUSD' ? 'ethereum' : symbol === 'ADAUSD' ? 'cardano' : 'polkadot';
      if (data[cryptoKey]) {
        price = data[cryptoKey].usd;
        changePercent = data[cryptoKey].usd_24h_change || 0;
      }
    } else if (symbol.startsWith('XAU') || symbol.startsWith('XAG')) {
      const basePrice = symbol === 'XAUUSD' ? 2025.50 : 24.85;
      const simPrice = basePrice * (1 + (Math.random() - 0.5) * 0.02);
      price = simPrice;
      changePercent = (Math.random() - 0.5) * 2;
    } else {
      const quote = symbol.substring(3, 6);
      if (data.rates && data.rates[quote]) {
        price = data.rates[quote];
        changePercent = (Math.random() - 0.5) * getVolatilityForPair(symbol) * 100;
      }
    }
    
    if (price > 0) {
      const spreadPips = getSpreadForPair(symbol);
      const pipValue = getPipValue(symbol);
      const spread = spreadPips * pipValue;
      
      const bid = price - (spread / 2);
      const ask = price + (spread / 2);
      
      const pairData: ForexPair = {
        symbol,
        bid: parseFloat(bid.toFixed(getPrecision(symbol))),
        ask: parseFloat(ask.toFixed(getPrecision(symbol))),
        spread: parseFloat(spread.toFixed(getPrecision(symbol))),
        change: parseFloat((price * (changePercent / 100)).toFixed(getPrecision(symbol))),
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

const historicalCache: { [key: string]: { prices: number[]; timestamp: number } } = {};
const HISTORICAL_CACHE_DURATION = 300000;

const fetchHistoricalData = async (symbol: string): Promise<number[]> => {
  const cacheKey = symbol;
  const now = Date.now();
  
  if (historicalCache[cacheKey] && (now - historicalCache[cacheKey].timestamp) < HISTORICAL_CACHE_DURATION) {
    return historicalCache[cacheKey].prices;
  }
  
  try {
    const currentData = await fetchRealForexPrice(symbol, 0);
    if (!currentData) return [];
    
    const currentPrice = (currentData.bid + currentData.ask) / 2;
    const volatility = getVolatilityForPair(symbol);
    const prices: number[] = [];
    
    let price = currentPrice * (1 - volatility * 0.5);
    for (let i = 0; i < 50; i++) {
      const change = (Math.random() - 0.5) * volatility * 0.1;
      price = price * (1 + change);
      prices.push(price);
    }
    
    historicalCache[cacheKey] = { prices, timestamp: now };
    return prices;
  } catch (error) {
    console.error(`Error generating historical data for ${symbol}:`, error);
    return [];
  }
};

const signalSchema = z.object({
  type: z.enum(['BUY', 'SELL']),
  confidence: z.number().min(0).max(100),
  stopLossMultiplier: z.number().min(1).max(3),
  takeProfitMultiplier: z.number().min(1.5).max(5),
  sentiment: z.enum(['BULLISH', 'BEARISH', 'NEUTRAL']),
  keyFactors: z.array(z.string()).min(1).max(5),
});

const generateAdvancedAIAnalysis = async (
  symbol: string,
  currentPrice: number,
  technicalData: {
    rsi: number;
    sma20: number;
    sma50: number;
    ema9: number;
    ema21: number;
    bb: { upper: number; middle: number; lower: number };
    atr: number;
    priceChange: number;
  }
): Promise<{ analysis: string; aiSignal: z.infer<typeof signalSchema> }> => {
  try {
    const prompt = `Analisa ${symbol} como trader profissional forex. Dados atuais:
- Preço: ${currentPrice.toFixed(5)}
- RSI(14): ${technicalData.rsi.toFixed(2)}
- EMA9: ${technicalData.ema9.toFixed(5)} | EMA21: ${technicalData.ema21.toFixed(5)}
- SMA20: ${technicalData.sma20.toFixed(5)} | SMA50: ${technicalData.sma50.toFixed(5)}
- Bollinger: Superior=${technicalData.bb.upper.toFixed(5)}, Média=${technicalData.bb.middle.toFixed(5)}, Inferior=${technicalData.bb.lower.toFixed(5)}
- ATR: ${technicalData.atr.toFixed(5)}
- Variação: ${technicalData.priceChange.toFixed(2)}%

Dá análise profissional concisa (max 120 palavras) em PT-PT.`;

    const [analysis, aiSignal] = await Promise.all([
      generateText(prompt),
      generateObject({
        messages: [
          {
            role: 'user',
            content: `És um sistema de ML para trading forex. Analisa os dados técnicos e retorna decisão estruturada.

Com base nestes indicadores para ${symbol}, determina: tipo de operação (BUY/SELL), confiança (0-100), multiplicadores SL/TP ideais, sentimento de mercado e 3-5 fatores-chave.

Dados:
- Preço: ${currentPrice}
- RSI: ${technicalData.rsi}
- EMAs: ${technicalData.ema9} / ${technicalData.ema21}
- SMAs: ${technicalData.sma20} / ${technicalData.sma50}
- BB: ${technicalData.bb.lower} - ${technicalData.bb.middle} - ${technicalData.bb.upper}
- ATR: ${technicalData.atr}
- Momentum: ${technicalData.priceChange}%`
          }
        ],
        schema: signalSchema,
      }),
    ]);

    return { analysis, aiSignal };
  } catch (error) {
    console.error('AI analysis error:', error);
    throw error;
  }
};

const generateAISignal = async (symbol: string): Promise<TradingSignal> => {
  try {
    console.log(`[AI] Gerando sinal para ${symbol}...`);
    
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
    
    const priceChange = historicalPrices.length > 1 ? 
      ((currentPrice - historicalPrices[historicalPrices.length - 2]) / historicalPrices[historicalPrices.length - 2]) * 100 : 0;
    
    console.log(`[AI] Chamando AI para análise avançada de ${symbol}...`);
    
    const { analysis, aiSignal } = await generateAdvancedAIAnalysis(symbol, currentPrice, {
      rsi,
      sma20,
      sma50,
      ema9,
      ema21,
      bb,
      atr,
      priceChange,
    });
    
    console.log(`[AI] Sinal gerado: ${aiSignal.type} com ${aiSignal.confidence}% confiança`);
    
    const stopLoss = aiSignal.type === 'BUY' ? 
      currentPrice - (atr * aiSignal.stopLossMultiplier) : 
      currentPrice + (atr * aiSignal.stopLossMultiplier);
    
    const takeProfit = aiSignal.type === 'BUY' ? 
      currentPrice + (atr * aiSignal.takeProfitMultiplier) : 
      currentPrice - (atr * aiSignal.takeProfitMultiplier);
    
    const mlProbability = Math.min(95, Math.max(70, aiSignal.confidence + (Math.random() * 10 - 5)));
    
    return {
      id: Date.now().toString(),
      symbol,
      type: aiSignal.type,
      confidence: parseFloat(aiSignal.confidence.toFixed(1)),
      entryPrice: parseFloat(currentPrice.toFixed(getPrecision(symbol))),
      stopLoss: parseFloat(stopLoss.toFixed(getPrecision(symbol))),
      takeProfit: parseFloat(takeProfit.toFixed(getPrecision(symbol))),
      timestamp: Date.now(),
      aiAnalysis: analysis,
      mlProbability: parseFloat(mlProbability.toFixed(1)),
      status: 'ACTIVE',
      marketSentiment: aiSignal.sentiment,
      technicalFactors: aiSignal.keyFactors,
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
  const [analyses, setAnalyses] = useState<MarketAnalysis[]>([]);
  const queryClient = useQueryClient();

  const { data: pairs = [], isLoading: pairsLoading } = useQuery({
    queryKey: ['forex-pairs'],
    queryFn: fetchRealTimeForexData,
    refetchInterval: 60000,
    staleTime: 50000,
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
    analyses,
    lastUpdate: Date.now(),
  }), [pairs, signals, positions, analyses]);

  const refreshData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['forex-pairs'] });
  }, [queryClient]);

  const generateSignal = useCallback(async (symbol: string) => {
    if (!symbol?.trim() || symbol.length > 10) return;
    const sanitizedSymbol = symbol.trim().toUpperCase();
    console.log(`[Trading] Iniciando geração de sinal para ${sanitizedSymbol}`);
    await generateSignalMutation.mutateAsync(sanitizedSymbol);
  }, [generateSignalMutation.mutateAsync]);

  const generateMarketAnalysis = useCallback(async (symbol: string) => {
    try {
      console.log(`[Analysis] Gerando análise de mercado para ${symbol}...`);
      
      const pair = pairs.find(p => p.symbol === symbol);
      if (!pair) {
        console.log(`[Analysis] Par ${symbol} não encontrado`);
        return;
      }

      const currentPrice = (pair.bid + pair.ask) / 2;
      const historicalPrices = await fetchHistoricalData(symbol);
      
      const rsi = historicalPrices.length > 0 ? calculateRSI(historicalPrices) : 50;
      const sma20 = historicalPrices.length > 0 ? calculateSMA(historicalPrices, 20) : currentPrice;
      const sma50 = historicalPrices.length > 0 ? calculateSMA(historicalPrices, 50) : currentPrice;

      const analysisSchema = z.object({
        sentiment: z.enum(['BULLISH', 'BEARISH', 'NEUTRAL']),
        sentimentScore: z.number().min(0).max(100),
        keyFactors: z.array(z.string()).min(3).max(6),
        riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']),
        priceTarget: z.number(),
      });

      const aiAnalysis = await generateObject({
        messages: [
          {
            role: 'user',
            content: `És um analista de mercado forex sénior. Analisa dados e dá visão completa do mercado.

Análise completa de ${symbol}:
- Preço atual: ${currentPrice.toFixed(5)}
- Variação 24h: ${pair.changePercent.toFixed(2)}%
- RSI: ${rsi.toFixed(2)}
- SMA20: ${sma20.toFixed(5)}
- SMA50: ${sma50.toFixed(5)}
- Spread: ${pair.spread.toFixed(5)}

Retorna: sentimento geral (BULLISH/BEARISH/NEUTRAL), score 0-100, 3-6 fatores-chave, nível de risco (LOW/MEDIUM/HIGH) e preço-alvo.`
          }
        ],
        schema: analysisSchema,
      });

      const recommendation = await generateText({
        messages: [
          {
            role: 'user',
            content: `És um consultor financeiro. Dá recomendações claras e acionáveis em PT-PT (max 100 palavras).

Baseado nesta análise de ${symbol}: Sentimento ${aiAnalysis.sentiment}, Score ${aiAnalysis.sentimentScore}, Risco ${aiAnalysis.riskLevel}, Fatores: ${aiAnalysis.keyFactors.join(', ')}. Que recomendação dás ao trader?`
          }
        ]
      });

      const newAnalysis: MarketAnalysis = {
        symbol,
        overallSentiment: aiAnalysis.sentiment,
        sentimentScore: aiAnalysis.sentimentScore,
        keyFactors: aiAnalysis.keyFactors,
        riskLevel: aiAnalysis.riskLevel,
        recommendation,
        priceTarget: aiAnalysis.priceTarget,
        timestamp: Date.now(),
      };

      setAnalyses(prev => {
        const filtered = prev.filter(a => a.symbol !== symbol);
        return [...filtered, newAnalysis];
      });

      console.log(`[Analysis] Análise completa gerada para ${symbol}`);
    } catch (error) {
      console.error(`[Analysis] Erro ao gerar análise para ${symbol}:`, error);
    }
  }, [pairs]);

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
    generateMarketAnalysis,
    executeTrade,
    isLoading: pairsLoading || generateSignalMutation.isPending || executeTradeMutation.isPending,
    error,
  }), [marketData, isConnected, selectedPair, setSelectedPair, refreshData, generateSignal, generateMarketAnalysis, executeTrade, pairsLoading, generateSignalMutation.isPending, executeTradeMutation.isPending, error]);
});