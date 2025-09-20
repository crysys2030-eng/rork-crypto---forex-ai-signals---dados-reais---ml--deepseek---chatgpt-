import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useTrading } from '@/providers/TradingProvider';
import { Bot, TrendingUp, TrendingDown, Search, Zap } from 'lucide-react-native';

export default function SignalsScreen() {
  const { marketData, generateSignal, isLoading } = useTrading();
  const { signals, pairs } = marketData;
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredSignals = signals.filter(signal =>
    signal.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleGenerateSignal = async (symbol: string) => {
    if (!symbol?.trim() || symbol.length > 10) return;
    await generateSignal(symbol);
  };

  const getSignalStrength = (confidence: number, mlProbability: number) => {
    const avgScore = (confidence + mlProbability) / 2;
    if (avgScore >= 85) return { text: 'FORTE', color: '#10B981' };
    if (avgScore >= 70) return { text: 'MÉDIO', color: '#F59E0B' };
    return { text: 'FRACO', color: '#EF4444' };
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sinais AI & ML</Text>
        <View style={styles.searchContainer}>
          <Search color="#6B7280" size={20} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar par..."
            placeholderTextColor="#6B7280"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gerar Novos Sinais</Text>
          <View style={styles.pairsGrid}>
            {pairs.slice(0, 6).map((pair) => (
              <TouchableOpacity
                key={pair.symbol}
                style={styles.generateCard}
                onPress={() => handleGenerateSignal(pair.symbol)}
                disabled={isLoading}
              >
                <Text style={styles.generateSymbol}>{pair.symbol}</Text>
                <Zap color="#10B981" size={16} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Sinais Ativos ({filteredSignals.length})
          </Text>
          
          {filteredSignals.length === 0 ? (
            <View style={styles.emptyState}>
              <Bot color="#6B7280" size={64} />
              <Text style={styles.emptyText}>Nenhum sinal encontrado</Text>
              <Text style={styles.emptySubtext}>
                {searchQuery ? 'Tente outro termo de busca' : 'Gere sinais tocando nos pares acima'}
              </Text>
            </View>
          ) : (
            filteredSignals.map((signal) => {
              const strength = getSignalStrength(signal.confidence, signal.mlProbability);
              return (
                <View key={signal.id} style={styles.signalCard}>
                  <View style={styles.signalHeader}>
                    <View style={styles.signalTitleRow}>
                      <Text style={styles.signalSymbol}>{signal.symbol}</Text>
                      <View style={[styles.strengthBadge, { backgroundColor: strength.color }]}>
                        <Text style={styles.strengthText}>{strength.text}</Text>
                      </View>
                    </View>
                    <View style={styles.signalTypeContainer}>
                      {signal.type === 'BUY' ? (
                        <TrendingUp color="#10B981" size={24} />
                      ) : (
                        <TrendingDown color="#EF4444" size={24} />
                      )}
                      <Text
                        style={[
                          styles.signalTypeText,
                          { color: signal.type === 'BUY' ? '#10B981' : '#EF4444' }
                        ]}
                      >
                        {signal.type}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.metricsGrid}>
                    <View style={styles.metricCard}>
                      <Text style={styles.metricLabel}>Confiança AI</Text>
                      <Text style={styles.metricValue}>{signal.confidence}%</Text>
                    </View>
                    <View style={styles.metricCard}>
                      <Text style={styles.metricLabel}>Prob. ML</Text>
                      <Text style={styles.metricValue}>{signal.mlProbability}%</Text>
                    </View>
                  </View>

                  <View style={styles.priceSection}>
                    <View style={styles.priceRow}>
                      <Text style={styles.priceLabel}>Entry Price:</Text>
                      <Text style={styles.priceValue}>{signal.entryPrice.toFixed(5)}</Text>
                    </View>
                    <View style={styles.priceRow}>
                      <Text style={styles.priceLabel}>Stop Loss:</Text>
                      <Text style={[styles.priceValue, { color: '#EF4444' }]}>
                        {signal.stopLoss.toFixed(5)}
                      </Text>
                    </View>
                    <View style={styles.priceRow}>
                      <Text style={styles.priceLabel}>Take Profit:</Text>
                      <Text style={[styles.priceValue, { color: '#10B981' }]}>
                        {signal.takeProfit.toFixed(5)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.analysisSection}>
                    <Text style={styles.analysisTitle}>Análise AI:</Text>
                    <Text style={styles.analysisText}>{signal.aiAnalysis}</Text>
                  </View>

                  <View style={styles.timestampSection}>
                    <Text style={styles.timestamp}>
                      {new Date(signal.timestamp).toLocaleString('pt-PT')}
                    </Text>
                  </View>
                </View>
              );
            })
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
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  pairsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  generateCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minWidth: 100,
    borderWidth: 1,
    borderColor: '#374151',
  },
  generateSymbol: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  signalCard: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  signalHeader: {
    marginBottom: 16,
  },
  signalTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  signalSymbol: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  strengthBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  signalTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  signalTypeText: {
    fontSize: 18,
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  priceSection: {
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  analysisSection: {
    marginBottom: 16,
  },
  analysisTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  analysisText: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 20,
  },
  timestampSection: {
    borderTopWidth: 1,
    borderTopColor: '#374151',
    paddingTop: 12,
  },
  timestamp: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 48,
  },
  emptyText: {
    fontSize: 18,
    color: '#9CA3AF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});