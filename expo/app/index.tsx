import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTrading } from '@/providers/TradingProvider';
import { TrendingUp, TrendingDown, Wifi, WifiOff, Bot } from 'lucide-react-native';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { marketData, isConnected, generateSignal } = useTrading();
  const { pairs, signals, positions } = marketData;

  const handleGenerateSignal = async (symbol: string) => {
    if (!symbol?.trim() || symbol.length > 10) return;
    const sanitizedSymbol = symbol.trim().toUpperCase();
    await generateSignal(sanitizedSymbol);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.title}>Forex AI Trading</Text>
          <View style={styles.connectionStatus}>
            {isConnected ? (
              <Wifi color="#10B981" size={20} />
            ) : (
              <WifiOff color="#EF4444" size={20} />
            )}
            <Text style={[styles.statusText, { color: isConnected ? '#10B981' : '#EF4444' }]}>
              {isConnected ? 'Conectado' : 'Desconectado'}
            </Text>
          </View>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pares de Moedas</Text>
            <View style={styles.pairsGrid}>
              {pairs.slice(0, 12).map((pair) => (
                <TouchableOpacity
                  key={pair.symbol}
                  style={styles.pairCard}
                  onPress={() => handleGenerateSignal(pair.symbol)}
                >
                  <Text style={styles.pairSymbol}>{pair.symbol}</Text>
                  <Text style={styles.pairPrice}>
                    {pair.symbol.includes('JPY') ? pair.bid.toFixed(3) : 
                     pair.symbol.startsWith('XAU') || pair.symbol.startsWith('XAG') ? pair.bid.toFixed(2) :
                     pair.symbol.includes('BTC') || pair.symbol.includes('ETH') ? pair.bid.toFixed(2) :
                     pair.symbol.includes('OIL') ? pair.bid.toFixed(2) :
                     pair.bid.toFixed(5)}
                  </Text>
                  <View style={styles.changeContainer}>
                    {pair.changePercent >= 0 ? (
                      <TrendingUp color="#10B981" size={16} />
                    ) : (
                      <TrendingDown color="#EF4444" size={16} />
                    )}
                    <Text
                      style={[
                        styles.changeText,
                        { color: pair.changePercent >= 0 ? '#10B981' : '#EF4444' },
                      ]}
                    >
                      {pair.changePercent.toFixed(2)}%
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sinais AI Ativos</Text>
            {signals.length === 0 ? (
              <View style={styles.emptyState}>
                <Bot color="#6B7280" size={48} />
                <Text style={styles.emptyText}>Nenhum sinal ativo</Text>
                <Text style={styles.emptySubtext}>Toque em um par para gerar sinal</Text>
              </View>
            ) : (
              signals.slice(0, 3).map((signal) => (
                <View key={signal.id} style={styles.signalCard}>
                  <View style={styles.signalHeader}>
                    <Text style={styles.signalSymbol}>{signal.symbol}</Text>
                    <View
                      style={[
                        styles.signalType,
                        {
                          backgroundColor:
                            signal.type === 'BUY' ? '#10B981' : '#EF4444',
                        },
                      ]}
                    >
                      <Text style={styles.signalTypeText}>{signal.type}</Text>
                    </View>
                  </View>
                  <View style={styles.signalDetails}>
                    <View style={styles.signalRow}>
                      <Text style={styles.signalLabel}>Confiança:</Text>
                      <Text style={styles.signalValue}>{signal.confidence}%</Text>
                    </View>
                    <View style={styles.signalRow}>
                      <Text style={styles.signalLabel}>ML Prob:</Text>
                      <Text style={styles.signalValue}>{signal.mlProbability}%</Text>
                    </View>
                    <View style={styles.signalRow}>
                      <Text style={styles.signalLabel}>Entry:</Text>
                      <Text style={styles.signalValue}>{signal.entryPrice.toFixed(5)}</Text>
                    </View>
                    <View style={styles.signalRow}>
                      <Text style={styles.signalLabel}>SL:</Text>
                      <Text style={styles.signalValue}>{signal.stopLoss.toFixed(5)}</Text>
                    </View>
                    <View style={styles.signalRow}>
                      <Text style={styles.signalLabel}>TP:</Text>
                      <Text style={styles.signalValue}>{signal.takeProfit.toFixed(5)}</Text>
                    </View>
                  </View>
                  <Text style={styles.aiAnalysis} numberOfLines={3}>
                    {signal.aiAnalysis}
                  </Text>
                </View>
              ))
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Posições Abertas</Text>
            {positions.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Nenhuma posição aberta</Text>
              </View>
            ) : (
              positions.map((position) => (
                <View key={position.id} style={styles.positionCard}>
                  <View style={styles.positionHeader}>
                    <Text style={styles.positionSymbol}>{position.symbol}</Text>
                    <Text
                      style={[
                        styles.positionProfit,
                        { color: position.profit >= 0 ? '#10B981' : '#EF4444' },
                      ]}
                    >
                      {position.profit >= 0 ? '+' : ''}{position.profit.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.positionDetails}>
                    <Text style={styles.positionText}>
                      {position.type} {position.volume} lotes @ {position.entryPrice.toFixed(5)}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  pairsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  pairCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 12,
    width: '31%',
    borderWidth: 1,
    borderColor: '#374151',
    minHeight: 80,
  },
  pairSymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  pairPrice: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  signalCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  signalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  signalSymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  signalType: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  signalTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  signalDetails: {
    marginBottom: 12,
  },
  signalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  signalLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  signalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  aiAnalysis: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  positionCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  positionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  positionSymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  positionProfit: {
    fontSize: 16,
    fontWeight: '600',
  },
  positionDetails: {
    marginBottom: 4,
  },
  positionText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
});