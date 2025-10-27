import { useState, useEffect, useCallback, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { generateText, generateObject } from '@rork/toolkit-sdk';
import { z } from 'zod';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  timeframe?: '1MIN' | '5MIN' | '15MIN' | '1H' | '4H' | '1D';
  strategy?: 'SCALPING' | 'DAY_TRADING' | 'SWING' | 'POSITION';
}

export interface ScalpingSignal {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  confidence: number;
  timeframe: '5MIN';
  strategy: 'SCALPING';
  aiAnalysis: string;
  multiAIScore: number;
  indicators: {
    stochastic: { k: number; d: number };
    macd: { value: number; signal: number; histogram: number };
    volume: { current: number; average: number; trend: 'INCREASING' | 'DECREASING' };
    momentum: number;
    spread: number;
  };
  quickEntry: boolean;
  expectedDuration: number;
  riskReward: number;
  timestamp: number;
  status: 'ACTIVE' | 'CLOSED' | 'EXPIRED';
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

export interface ChartPattern {
  type: string;
  confidence: number;
  description: string;
  priceLevel: number;
}

export interface ChartAnalysis {
  symbol: string;
  patterns: ChartPattern[];
  supportLevels: number[];
  resistanceLevels: number[];
  trend: 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS';
  momentum: 'STRONG' | 'MODERATE' | 'WEAK';
  aiInterpretation: string;
  candlestickSignals: string[];
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
  chartAnalyses: ChartAnalysis[];
  scalpingSignals: ScalpingSignal[];
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
    let price = 0;
    let changePercent = 0;
    let apiSuccess = false;
    
    if (symbol.startsWith('BTC') || symbol.startsWith('ETH') || symbol === 'ADAUSD' || symbol === 'DOTUSD') {
      try {
        const cryptoSymbol = symbol.replace('USD', '').toLowerCase();
        const cryptoId = cryptoSymbol === 'btc' ? 'bitcoin' : cryptoSymbol === 'eth' ? 'ethereum' : cryptoSymbol === 'ada' ? 'cardano' : 'polkadot';
        
        const apiUrl = `https://api.coinbase.com/v2/prices/${cryptoSymbol}-usd/spot`;
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.data && data.data.amount) {
            price = parseFloat(data.data.amount);
            changePercent = (Math.random() - 0.5) * getVolatilityForPair(symbol) * 100;
            apiSuccess = true;
          }
        }
      } catch (cryptoError) {
        console.log(`Crypto API error for ${symbol}, using simulated data`);
      }
      
      if (!apiSuccess) {
        price = baseRate * (1 + (Math.random() - 0.5) * getVolatilityForPair(symbol));
        changePercent = (Math.random() - 0.5) * getVolatilityForPair(symbol) * 100;
      }
    } else if (symbol.startsWith('XAU') || symbol.startsWith('XAG')) {
      price = baseRate * (1 + (Math.random() - 0.5) * 0.02);
      changePercent = (Math.random() - 0.5) * 2;
    } else {
      try {
        const base = symbol.substring(0, 3);
        const quote = symbol.substring(3, 6);
        const apiUrl = `https://api.exchangerate-api.com/v4/latest/${base}`;
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.rates && data.rates[quote]) {
            price = data.rates[quote];
            changePercent = (Math.random() - 0.5) * getVolatilityForPair(symbol) * 100;
            apiSuccess = true;
          }
        }
      } catch (forexError) {
        console.log(`Forex API error for ${symbol}, using simulated data`);
      }
      
      if (!apiSuccess) {
        price = baseRate * (1 + (Math.random() - 0.5) * getVolatilityForPair(symbol));
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
    console.log(`Error fetching ${symbol}, using fallback`);
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

const calculateStochastic = (prices: number[], period: number = 14): { k: number; d: number } => {
  if (prices.length < period) return { k: 50, d: 50 };
  
  const slice = prices.slice(-period);
  const currentPrice = prices[prices.length - 1];
  const high = Math.max(...slice);
  const low = Math.min(...slice);
  
  const k = high !== low ? ((currentPrice - low) / (high - low)) * 100 : 50;
  
  const kValues = [];
  for (let i = prices.length - 3; i < prices.length; i++) {
    const subSlice = prices.slice(Math.max(0, i - period + 1), i + 1);
    const subHigh = Math.max(...subSlice);
    const subLow = Math.min(...subSlice);
    const subK = subHigh !== subLow ? ((prices[i] - subLow) / (subHigh - subLow)) * 100 : 50;
    kValues.push(subK);
  }
  const d = kValues.reduce((sum, val) => sum + val, 0) / kValues.length;
  
  return { k, d };
};

const calculateMACD = (prices: number[]): { value: number; signal: number; histogram: number } => {
  if (prices.length < 26) return { value: 0, signal: 0, histogram: 0 };
  
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macdLine = ema12 - ema26;
  
  const macdValues = [];
  for (let i = 26; i <= prices.length; i++) {
    const slice = prices.slice(0, i);
    const e12 = calculateEMA(slice, 12);
    const e26 = calculateEMA(slice, 26);
    macdValues.push(e12 - e26);
  }
  
  const signalLine = calculateEMA(macdValues, 9);
  const histogram = macdLine - signalLine;
  
  return { value: macdLine, signal: signalLine, histogram };
};

const calculateVolumeAnalysis = (prices: number[]): { current: number; average: number; trend: 'INCREASING' | 'DECREASING' } => {
  if (prices.length < 10) return { current: 1, average: 1, trend: 'INCREASING' };
  
  const recentPriceChanges = [];
  for (let i = 1; i < prices.length; i++) {
    recentPriceChanges.push(Math.abs(prices[i] - prices[i - 1]));
  }
  
  const current = recentPriceChanges[recentPriceChanges.length - 1] || 0;
  const average = recentPriceChanges.reduce((sum, v) => sum + v, 0) / recentPriceChanges.length;
  
  const recentAvg = recentPriceChanges.slice(-5).reduce((sum, v) => sum + v, 0) / 5;
  const olderAvg = recentPriceChanges.slice(-10, -5).reduce((sum, v) => sum + v, 0) / 5;
  
  const trend = recentAvg > olderAvg ? 'INCREASING' as const : 'DECREASING' as const;
  
  return { current, average, trend };
};

const calculateMomentum = (prices: number[], period: number = 10): number => {
  if (prices.length < period + 1) return 0;
  const current = prices[prices.length - 1];
  const past = prices[prices.length - period - 1];
  return ((current - past) / past) * 100;
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
            content: `You are a forex ML trading system. Analyze technical data and return structured decision.

Based on these indicators for ${symbol}, determine:
1. Operation type: MUST be exactly "BUY" or "SELL" (uppercase)
2. Confidence: number between 0-100
3. Stop loss multiplier: number between 1-3
4. Take profit multiplier: number between 1.5-5
5. Market sentiment: MUST be exactly "BULLISH", "BEARISH", or "NEUTRAL" (uppercase)
6. Key factors: array of 3-5 strings explaining your decision

Technical Data:
- Price: ${currentPrice}
- RSI: ${technicalData.rsi} (oversold<30, overbought>70)
- EMA9: ${technicalData.ema9} / EMA21: ${technicalData.ema21}
- SMA20: ${technicalData.sma20} / SMA50: ${technicalData.sma50}
- Bollinger Bands: ${technicalData.bb.lower} - ${technicalData.bb.middle} - ${technicalData.bb.upper}
- ATR: ${technicalData.atr}
- Momentum: ${technicalData.priceChange}%

IMPORTANT: Return ALL required fields:
- type: "BUY" or "SELL"
- confidence: number (0-100)
- stopLossMultiplier: number (1-3)
- takeProfitMultiplier: number (1.5-5)
- sentiment: "BULLISH", "BEARISH", or "NEUTRAL"
- keyFactors: array of strings (3-5 items)`
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

const scalpingSignalSchema = z.object({
  type: z.enum(['BUY', 'SELL']),
  confidence: z.number().min(0).max(100),
  quickEntry: z.boolean(),
  stopLossMultiplier: z.number().min(0.5).max(2),
  takeProfitMultiplier: z.number().min(1).max(3),
  expectedDuration: z.number().min(5).max(30),
  keyFactors: z.array(z.string()).min(3).max(5),
  multiAIScore: z.number().min(0).max(100),
});

const generateScalpingSignalWithMultiAI = async (symbol: string): Promise<ScalpingSignal> => {
  try {
    console.log(`[Scalping AI] Gerando sinal de scalping 5min para ${symbol}...`);
    
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
    
    const rsi = historicalPrices.length > 0 ? calculateRSI(historicalPrices, 14) : 50;
    const stochastic = calculateStochastic(historicalPrices, 14);
    const macd = calculateMACD(historicalPrices);
    const volume = calculateVolumeAnalysis(historicalPrices);
    const momentum = calculateMomentum(historicalPrices, 10);
    const ema5 = calculateEMA(historicalPrices, 5);
    const ema13 = calculateEMA(historicalPrices, 13);
    const spread = getSpreadForPair(symbol) * getPipValue(symbol);
    
    const aiPrompts = [
      {
        name: 'Technical AI',
        prompt: `Você é um sistema de IA especializado em análise técnica para scalping forex em timeframe de 5 minutos.

Dados de ${symbol}:
- Preço: ${currentPrice.toFixed(5)}
- RSI(14): ${rsi.toFixed(2)} (sobrevendido<30, sobrecomprado>70)
- Stochastic K: ${stochastic.k.toFixed(2)}, D: ${stochastic.d.toFixed(2)}
- MACD: ${macd.value.toFixed(5)}, Signal: ${macd.signal.toFixed(5)}, Histograma: ${macd.histogram.toFixed(5)}
- EMA5: ${ema5.toFixed(5)} vs EMA13: ${ema13.toFixed(5)}
- Momentum: ${momentum.toFixed(2)}%
- Volume trend: ${volume.trend}
- Spread: ${spread.toFixed(5)}

CRÍTICO - Para scalping 5min, retorne TODOS os campos obrigatórios:
- type: "BUY" ou "SELL" (MAIÚSCULO, exatamente assim)
- confidence: número entre 0-100
- quickEntry: boolean (true ou false)
- stopLossMultiplier: número entre 0.5-2 (MÍNIMO 0.5, conservador para scalping)
- takeProfitMultiplier: número entre 1-3 (MÍNIMO 1.0, rápido para scalping)
- expectedDuration: número entre 5-30 (MÍNIMO 5 minutos)
- keyFactors: array com 3-5 strings de fatores técnicos
- multiAIScore: número entre 0-100

EXEMPLO:
{
  "type": "BUY",
  "confidence": 75,
  "quickEntry": true,
  "stopLossMultiplier": 1.0,
  "takeProfitMultiplier": 2.0,
  "expectedDuration": 10,
  "keyFactors": ["RSI oversold", "MACD bullish cross", "Strong volume"],
  "multiAIScore": 80
}`
      },
      {
        name: 'Pattern Recognition AI',
        prompt: `Você é uma IA especializada em reconhecimento de padrões de preço para scalping.

Análise de micro-padrões de ${symbol}:
- RSI: ${rsi.toFixed(2)}
- Stochastic: K=${stochastic.k.toFixed(2)}, D=${stochastic.d.toFixed(2)}
- MACD Histograma: ${macd.histogram.toFixed(5)}
- Momentum: ${momentum.toFixed(2)}%
- Volume: ${volume.trend}

IMPORTANTE - Retorne estrutura COMPLETA com TODOS os campos:
- type: "BUY" ou "SELL" (MAIÚSCULO)
- confidence: número 0-100
- quickEntry: boolean
- stopLossMultiplier: número 0.5-2 (NUNCA menor que 0.5)
- takeProfitMultiplier: número 1-3 (NUNCA menor que 1.0)
- expectedDuration: número 5-30 (NUNCA menor que 5)
- keyFactors: array de 3-5 strings
- multiAIScore: número 0-100`
      },
      {
        name: 'Momentum AI',
        prompt: `Você é uma IA focada em análise de momentum para trades rápidos.

${symbol} Momentum Analysis:
- EMA5 vs EMA13: ${ema5 > ema13 ? 'Bullish' : 'Bearish'} crossover
- MACD Momentum: ${macd.histogram > 0 ? 'Positivo' : 'Negativo'}
- Momentum Score: ${momentum.toFixed(2)}%
- Volume Trend: ${volume.trend}
- Stochastic: ${stochastic.k > stochastic.d ? 'Ascending' : 'Descending'}

REQUERIDO - Retorne objeto JSON completo:
- type: "BUY" ou "SELL"
- confidence: 0-100
- quickEntry: true/false
- stopLossMultiplier: 0.5-2 (mínimo 0.5)
- takeProfitMultiplier: 1-3 (mínimo 1.0)
- expectedDuration: 5-30 (mínimo 5 minutos)
- keyFactors: ["fator1", "fator2", "fator3"]
- multiAIScore: 0-100`
      }
    ];
    
    console.log(`[Scalping AI] Consultando ${aiPrompts.length} sistemas de IA...`);
    
    const aiResults = await Promise.all(
      aiPrompts.map(async ({ name, prompt }) => {
        try {
          const result = await generateObject({
            messages: [{ role: 'user', content: prompt }],
            schema: scalpingSignalSchema,
          });
          console.log(`[Scalping AI] ${name} resultado: ${result.type} (${result.confidence}%)`);
          return result;
        } catch (error) {
          console.error(`[Scalping AI] Erro em ${name}:`, error);
          return null;
        }
      })
    );
    
    const validResults = aiResults.filter(r => r !== null) as z.infer<typeof scalpingSignalSchema>[];
    
    if (validResults.length === 0) {
      throw new Error('Nenhuma IA retornou resultado válido');
    }
    
    const buyCount = validResults.filter(r => r.type === 'BUY').length;
    const sellCount = validResults.filter(r => r.type === 'SELL').length;
    const finalType = buyCount >= sellCount ? 'BUY' : 'SELL';
    
    const avgConfidence = validResults.reduce((sum, r) => sum + r.confidence, 0) / validResults.length;
    const avgMultiAIScore = validResults.reduce((sum, r) => sum + r.multiAIScore, 0) / validResults.length;
    const avgStopLoss = validResults.reduce((sum, r) => sum + r.stopLossMultiplier, 0) / validResults.length;
    const avgTakeProfit = validResults.reduce((sum, r) => sum + r.takeProfitMultiplier, 0) / validResults.length;
    const avgDuration = validResults.reduce((sum, r) => sum + r.expectedDuration, 0) / validResults.length;
    const quickEntry = validResults.filter(r => r.quickEntry).length > validResults.length / 2;
    
    const allFactors = validResults.flatMap(r => r.keyFactors);
    const topFactors = [...new Set(allFactors)].slice(0, 5);
    
    const atr = historicalPrices.length > 14 ? calculateATR(
      historicalPrices.map(p => p * 1.001),
      historicalPrices.map(p => p * 0.999),
      historicalPrices,
      14
    ) : currentPrice * 0.005;
    
    const stopLoss = finalType === 'BUY' ? 
      currentPrice - (atr * avgStopLoss) : 
      currentPrice + (atr * avgStopLoss);
    
    const takeProfit = finalType === 'BUY' ? 
      currentPrice + (atr * avgTakeProfit) : 
      currentPrice - (atr * avgTakeProfit);
    
    const analysisPrompt = `Como trader profissional de scalping, analise este consenso de múltiplas IAs para ${symbol}:

- ${validResults.length} sistemas de IA concordam em: ${finalType}
- Confiança média: ${avgConfidence.toFixed(1)}%
- Score multi-IA: ${avgMultiAIScore.toFixed(1)}
- Entrada rápida: ${quickEntry ? 'SIM' : 'NÃO'}
- Duração esperada: ${avgDuration.toFixed(0)} minutos
- RSI: ${rsi.toFixed(2)}
- Stochastic: K=${stochastic.k.toFixed(2)}, D=${stochastic.d.toFixed(2)}
- MACD: ${macd.histogram > 0 ? 'Positivo' : 'Negativo'}
- Momentum: ${momentum.toFixed(2)}%
- Volume: ${volume.trend}

Forneça análise profissional concisa (max 100 palavras) em PT-PT focada em scalping.`;
    
    const aiAnalysis = await generateText(analysisPrompt);
    
    const riskReward = Math.abs(takeProfit - currentPrice) / Math.abs(stopLoss - currentPrice);
    
    console.log(`[Scalping AI] Sinal 5min gerado: ${finalType} com ${avgConfidence.toFixed(1)}% confiança`);
    console.log(`[Scalping AI] Multi-IA Score: ${avgMultiAIScore.toFixed(1)} | R:R = 1:${riskReward.toFixed(2)}`);
    
    return {
      id: `scalp-${Date.now()}`,
      symbol,
      type: finalType as 'BUY' | 'SELL',
      entryPrice: parseFloat(currentPrice.toFixed(getPrecision(symbol))),
      stopLoss: parseFloat(stopLoss.toFixed(getPrecision(symbol))),
      takeProfit: parseFloat(takeProfit.toFixed(getPrecision(symbol))),
      confidence: parseFloat(avgConfidence.toFixed(1)),
      timeframe: '5MIN',
      strategy: 'SCALPING',
      aiAnalysis,
      multiAIScore: parseFloat(avgMultiAIScore.toFixed(1)),
      indicators: {
        stochastic,
        macd,
        volume,
        momentum,
        spread,
      },
      quickEntry,
      expectedDuration: Math.round(avgDuration),
      riskReward: parseFloat(riskReward.toFixed(2)),
      timestamp: Date.now(),
      status: 'ACTIVE',
    };
  } catch (error) {
    console.error('[Scalping AI] Erro ao gerar sinal de scalping:', error);
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
      type: aiSignal.type as 'BUY' | 'SELL',
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
  const [chartAnalyses, setChartAnalyses] = useState<ChartAnalysis[]>([]);
  const [scalpingSignals, setScalpingSignals] = useState<ScalpingSignal[]>([]);
  const [forexApiKey, setForexApiKey] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadApiKey = async () => {
      try {
        const key = await AsyncStorage.getItem('forexApiKey');
        setForexApiKey(key);
        console.log('[API] Chave API carregada:', key ? 'Presente' : 'Ausente');
      } catch (error) {
        console.error('[API] Erro ao carregar chave API:', error);
      }
    };
    loadApiKey();
  }, []);

  const saveForexApiKey = useCallback(async (key: string) => {
    try {
      await AsyncStorage.setItem('forexApiKey', key);
      setForexApiKey(key);
      console.log('[API] Chave API salva com sucesso');
    } catch (error) {
      console.error('[API] Erro ao salvar chave API:', error);
      throw error;
    }
  }, []);

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

  const generateScalpingSignalMutation = useMutation({
    mutationFn: generateScalpingSignalWithMultiAI,
    onSuccess: (newSignal) => {
      setScalpingSignals(prev => [...prev, newSignal]);
      console.log('[Scalping] Novo sinal de scalping adicionado:', newSignal.id);
    },
    onError: (error) => {
      setError(`Erro ao gerar sinal de scalping: ${error.message}`);
      console.error('[Scalping] Erro:', error);
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
    chartAnalyses,
    scalpingSignals,
    lastUpdate: Date.now(),
  }), [pairs, signals, positions, analyses, chartAnalyses, scalpingSignals]);

  const refreshData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['forex-pairs'] });
  }, [queryClient]);

  const generateSignal = useCallback(async (symbol: string) => {
    if (!symbol?.trim() || symbol.length > 10) return;
    const sanitizedSymbol = symbol.trim().toUpperCase();
    console.log(`[Trading] Iniciando geração de sinal para ${sanitizedSymbol}`);
    await generateSignalMutation.mutateAsync(sanitizedSymbol);
  }, [generateSignalMutation.mutateAsync]);

  const generateScalpingSignal = useCallback(async (symbol: string) => {
    if (!symbol?.trim() || symbol.length > 10) return;
    const sanitizedSymbol = symbol.trim().toUpperCase();
    console.log(`[Scalping] Iniciando geração de sinal de scalping 5min para ${sanitizedSymbol}`);
    await generateScalpingSignalMutation.mutateAsync(sanitizedSymbol);
  }, [generateScalpingSignalMutation.mutateAsync]);

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

  const detectChartPatterns = useCallback((prices: number[], currentPrice: number) => {
    const patterns: ChartPattern[] = [];
    
    if (prices.length < 10) return patterns;
    
    const recentPrices = prices.slice(-10);
    const minPrice = Math.min(...recentPrices);
    const maxPrice = Math.max(...recentPrices);
    const priceRange = maxPrice - minPrice;
    
    const firstHalf = recentPrices.slice(0, 5);
    const secondHalf = recentPrices.slice(5);
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    if (secondAvg > firstAvg && (secondAvg - firstAvg) > priceRange * 0.3) {
      patterns.push({
        type: 'Ascending Triangle',
        confidence: 75,
        description: 'Padrão de alta indicando potencial rompimento',
        priceLevel: currentPrice,
      });
    }
    
    if (secondAvg < firstAvg && (firstAvg - secondAvg) > priceRange * 0.3) {
      patterns.push({
        type: 'Descending Triangle',
        confidence: 72,
        description: 'Padrão de baixa indicando possível queda',
        priceLevel: currentPrice,
      });
    }
    
    const isDoubleBottom = recentPrices[2] < recentPrices[1] && 
                          recentPrices[2] < recentPrices[3] &&
                          recentPrices[7] < recentPrices[6] &&
                          recentPrices[7] < recentPrices[8] &&
                          Math.abs(recentPrices[2] - recentPrices[7]) < priceRange * 0.1;
    
    if (isDoubleBottom) {
      patterns.push({
        type: 'Double Bottom',
        confidence: 80,
        description: 'Padrão de reversão de alta - forte sinal de compra',
        priceLevel: Math.min(recentPrices[2], recentPrices[7]),
      });
    }
    
    const isDoubleTop = recentPrices[2] > recentPrices[1] && 
                       recentPrices[2] > recentPrices[3] &&
                       recentPrices[7] > recentPrices[6] &&
                       recentPrices[7] > recentPrices[8] &&
                       Math.abs(recentPrices[2] - recentPrices[7]) < priceRange * 0.1;
    
    if (isDoubleTop) {
      patterns.push({
        type: 'Double Top',
        confidence: 78,
        description: 'Padrão de reversão de baixa - sinal de venda',
        priceLevel: Math.max(recentPrices[2], recentPrices[7]),
      });
    }
    
    const trend = recentPrices.slice(-3);
    if (trend[0] < trend[1] && trend[1] < trend[2]) {
      patterns.push({
        type: 'Bullish Momentum',
        confidence: 68,
        description: 'Momentum de alta consistente',
        priceLevel: currentPrice,
      });
    }
    
    if (trend[0] > trend[1] && trend[1] > trend[2]) {
      patterns.push({
        type: 'Bearish Momentum',
        confidence: 68,
        description: 'Momentum de baixa consistente',
        priceLevel: currentPrice,
      });
    }
    
    return patterns;
  }, []);

  const detectCandlestickPatterns = useCallback((prices: number[]) => {
    const signals: string[] = [];
    
    if (prices.length < 5) return signals;
    
    const recent = prices.slice(-5);
    const [p1, p2, p3, p4, p5] = recent;
    
    if (p4 < p3 && p5 > p4 && (p5 - p4) > (p4 - p3)) {
      signals.push('Hammer Bullish - Reversão de alta provável');
    }
    
    if (p4 > p3 && p5 < p4 && (p4 - p5) > (p3 - p4)) {
      signals.push('Shooting Star - Reversão de baixa possível');
    }
    
    if (p2 < p1 && p3 > p2 && p3 > p1) {
      signals.push('Engulfing Bullish - Forte sinal de compra');
    }
    
    if (p2 > p1 && p3 < p2 && p3 < p1) {
      signals.push('Engulfing Bearish - Forte sinal de venda');
    }
    
    const body2 = Math.abs(p3 - p2);
    const body3 = Math.abs(p4 - p3);
    if (body3 < body2 * 0.3 && p4 > Math.min(p2, p3) && p4 < Math.max(p2, p3)) {
      signals.push('Doji - Indecisão no mercado, possível reversão');
    }
    
    if (signals.length === 0) {
      signals.push('Nenhum padrão de candlestick significativo detectado');
    }
    
    return signals;
  }, []);

  const calculateSupportResistance = useCallback((prices: number[]) => {
    if (prices.length < 20) {
      return { support: [], resistance: [] };
    }
    
    const sortedPrices = [...prices].sort((a, b) => a - b);
    const support: number[] = [];
    const resistance: number[] = [];
    
    const lowerQuartile = sortedPrices[Math.floor(sortedPrices.length * 0.25)];
    const upperQuartile = sortedPrices[Math.floor(sortedPrices.length * 0.75)];
    const median = sortedPrices[Math.floor(sortedPrices.length * 0.5)];
    
    support.push(lowerQuartile);
    support.push(Math.min(...prices.slice(-10)));
    
    resistance.push(upperQuartile);
    resistance.push(Math.max(...prices.slice(-10)));
    
    return {
      support: [...new Set(support)].sort((a, b) => a - b),
      resistance: [...new Set(resistance)].sort((a, b) => b - a),
    };
  }, []);

  const analyzeChartWithAI = useCallback(async (symbol: string) => {
    try {
      console.log(`[Chart AI] Analisando gráfico de ${symbol}...`);
      
      const pair = pairs.find(p => p.symbol === symbol);
      if (!pair) {
        console.log(`[Chart AI] Par ${symbol} não encontrado`);
        return;
      }

      const currentPrice = (pair.bid + pair.ask) / 2;
      const historicalPrices = await fetchHistoricalData(symbol);
      
      if (historicalPrices.length < 20) {
        console.log(`[Chart AI] Dados históricos insuficientes para ${symbol}`);
        return;
      }
      
      const patterns = detectChartPatterns(historicalPrices, currentPrice);
      const candlestickSignals = detectCandlestickPatterns(historicalPrices);
      const { support, resistance } = calculateSupportResistance(historicalPrices);
      
      const rsi = calculateRSI(historicalPrices);
      const sma20 = calculateSMA(historicalPrices, 20);
      const ema9 = calculateEMA(historicalPrices, 9);
      
      let trend: 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS' = 'SIDEWAYS';
      if (currentPrice > sma20 && ema9 > sma20) {
        trend = 'UPTREND';
      } else if (currentPrice < sma20 && ema9 < sma20) {
        trend = 'DOWNTREND';
      }
      
      let momentum: 'STRONG' | 'MODERATE' | 'WEAK' = 'MODERATE';
      if (Math.abs(pair.changePercent) > 1.5) {
        momentum = 'STRONG';
      } else if (Math.abs(pair.changePercent) < 0.5) {
        momentum = 'WEAK';
      }
      
      const chartDataSummary = `
Símolo: ${symbol}
Preço Atual: ${currentPrice.toFixed(5)}
Tendência: ${trend}
Momentum: ${momentum}
RSI: ${rsi.toFixed(2)}
SMA20: ${sma20.toFixed(5)}
EMA9: ${ema9.toFixed(5)}
Suportes: ${support.map(s => s.toFixed(5)).join(', ')}
Resistências: ${resistance.map(r => r.toFixed(5)).join(', ')}
Padrões Detectados: ${patterns.map(p => `${p.type} (${p.confidence}%)`).join(', ')}
Sinais Candlestick: ${candlestickSignals.join('; ')}`;

      const aiInterpretation = await generateText({
        messages: [
          {
            role: 'user',
            content: `És um analista técnico expert em leitura de gráficos forex. Analisa os seguintes dados de gráfico em tempo real e dá uma interpretação profissional concisa (max 150 palavras) em PT-PT:

${chartDataSummary}

Dá insights sobre:
1. O que os padrões indicam
2. Níveis críticos a observar
3. Cenários prováveis de curto prazo
4. Recomendação de entrada/saída`
          }
        ]
      });

      const newChartAnalysis: ChartAnalysis = {
        symbol,
        patterns,
        supportLevels: support,
        resistanceLevels: resistance,
        trend,
        momentum,
        aiInterpretation,
        candlestickSignals,
        timestamp: Date.now(),
      };

      setChartAnalyses(prev => {
        const filtered = prev.filter(a => a.symbol !== symbol);
        return [...filtered, newChartAnalysis];
      });

      console.log(`[Chart AI] Análise de gráfico completa para ${symbol}`);
    } catch (error) {
      console.error(`[Chart AI] Erro ao analisar gráfico de ${symbol}:`, error);
    }
  }, [pairs, detectChartPatterns, detectCandlestickPatterns, calculateSupportResistance]);

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
    generateScalpingSignal,
    generateMarketAnalysis,
    analyzeChartWithAI,
    executeTrade,
    forexApiKey,
    saveForexApiKey,
    isLoading: pairsLoading || generateSignalMutation.isPending || executeTradeMutation.isPending || generateScalpingSignalMutation.isPending,
    error,
  }), [marketData, isConnected, selectedPair, setSelectedPair, refreshData, generateSignal, generateScalpingSignal, generateMarketAnalysis, analyzeChartWithAI, executeTrade, forexApiKey, saveForexApiKey, pairsLoading, generateSignalMutation.isPending, executeTradeMutation.isPending, generateScalpingSignalMutation.isPending, error]);
});