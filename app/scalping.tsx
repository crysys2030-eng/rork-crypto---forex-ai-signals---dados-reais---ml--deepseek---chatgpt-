import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useTrading } from '@/providers/TradingProvider';
import { Zap, TrendingUp, TrendingDown, Search, Clock, Target, AlertTriangle, Activity, BarChart2 } from 'lucide-react-native';

export default function ScalpingScreen() {
  const { marketData, generateScalpingSignal, isLoading } = useTrading();
  const { scalpingSignals, pairs } = marketData;
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredSignals = scalpingSignals.filter(signal =>
    signal.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleGenerateScalpingSignal = async (symbol: string) => {
    if (!symbol?.trim() || symbol.length > 10) return;
    await generateScalpingSignal(symbol);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return '#10B981';
    if (confidence >= 70) return '#F59E0B';
    return '#EF4444';
  };

  const getMultiAIColor = (score: number) => {
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Zap color="#10B981" size={28} />
          <Text style={styles.title}>Scalping 5min</Text>
        </View>
        <Text style={styles.subtitle}>Sinais rápidos com Multi-IA</Text>
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
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Gerar Sinais de Scalping</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>5 MIN</Text>
            </View>
          </View>
          <View style={styles.pairsGrid}>
            {pairs.slice(0, 8).map((pair) => (
              <TouchableOpacity
                key={pair.symbol}
                style={styles.generateCard}
                onPress={() => handleGenerateScalpingSignal(pair.symbol)}
                disabled={isLoading}
              >
                <Text style={styles.generateSymbol}>{pair.symbol}</Text>
                <View style={styles.generateInfo}>
                  <Text style={[
                    styles.generatePrice,
                    { color: pair.changePercent >= 0 ? '#10B981' : '#EF4444' }
                  ]}>
                    {pair.changePercent >= 0 ? '+' : ''}{pair.changePercent.toFixed(2)}%
                  </Text>
                  <Zap color="#10B981" size={14} />
                </View>
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
              <Activity color="#6B7280" size={64} />
              <Text style={styles.emptyText}>Nenhum sinal de scalping</Text>
              <Text style={styles.emptySubtext}>
                {searchQuery ? 'Tente outro termo' : 'Gere sinais tocando nos pares acima'}
              </Text>
            </View>
          ) : (
            filteredSignals.map((signal) => (
              <View key={signal.id} style={styles.signalCard}>
                <View style={styles.signalHeader}>
                  <View style={styles.signalTitleRow}>
                    <Text style={styles.signalSymbol}>{signal.symbol}</Text>
                    <View style={[
                      styles.typeChip,
                      { backgroundColor: signal.type === 'BUY' ? '#10B981' : '#EF4444' }
                    ]}>
                      {signal.type === 'BUY' ? (
                        <TrendingUp color="#FFFFFF" size={16} />
                      ) : (
                        <TrendingDown color="#FFFFFF" size={16} />
                      )}
                      <Text style={styles.typeText}>{signal.type}</Text>
                    </View>
                  </View>
                  <View style={styles.badgesRow}>
                    <View style={styles.timeBadge}>
                      <Clock color="#F59E0B" size={14} />
                      <Text style={styles.timeBadgeText}>{signal.expectedDuration} min</Text>
                    </View>
                    {signal.quickEntry && (
                      <View style={styles.quickBadge}>
                        <Zap color="#FFFFFF" size={12} />
                        <Text style={styles.quickBadgeText}>RÁPIDO</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.scoresGrid}>
                  <View style={styles.scoreCard}>
                    <Text style={styles.scoreLabel}>Confiança</Text>
                    <Text style={[styles.scoreValue, { color: getConfidenceColor(signal.confidence) }]}>
                      {signal.confidence}%
                    </Text>
                  </View>
                  <View style={styles.scoreCard}>
                    <Text style={styles.scoreLabel}>Multi-IA</Text>
                    <Text style={[styles.scoreValue, { color: getMultiAIColor(signal.multiAIScore) }]}>
                      {signal.multiAIScore}%
                    </Text>
                  </View>
                  <View style={styles.scoreCard}>
                    <Text style={styles.scoreLabel}>R:R</Text>
                    <Text style={[styles.scoreValue, { color: '#10B981' }]}>
                      1:{signal.riskReward.toFixed(2)}
                    </Text>
                  </View>
                </View>

                <View style={styles.priceSection}>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>Entry:</Text>
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

                <View style={styles.indicatorsSection}>
                  <View style={styles.indicatorRow}>
                    <View style={styles.indicatorItem}>
                      <Text style={styles.indicatorLabel}>RSI</Text>
                      <Text style={styles.indicatorValue}>-</Text>
                    </View>
                    <View style={styles.indicatorItem}>
                      <Text style={styles.indicatorLabel}>Stochastic</Text>
                      <Text style={styles.indicatorValue}>
                        K:{signal.indicators.stochastic.k.toFixed(1)} D:{signal.indicators.stochastic.d.toFixed(1)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.indicatorRow}>
                    <View style={styles.indicatorItem}>
                      <Text style={styles.indicatorLabel}>MACD</Text>
                      <Text style={[
                        styles.indicatorValue,
                        { color: signal.indicators.macd.histogram > 0 ? '#10B981' : '#EF4444' }
                      ]}>
                        {signal.indicators.macd.histogram > 0 ? 'Positivo' : 'Negativo'}
                      </Text>
                    </View>
                    <View style={styles.indicatorItem}>
                      <Text style={styles.indicatorLabel}>Momentum</Text>
                      <Text style={[
                        styles.indicatorValue,
                        { color: signal.indicators.momentum > 0 ? '#10B981' : '#EF4444' }
                      ]}>
                        {signal.indicators.momentum.toFixed(2)}%
                      </Text>
                    </View>
                  </View>
                  <View style={styles.indicatorRow}>
                    <View style={styles.indicatorItem}>
                      <Text style={styles.indicatorLabel}>Volume</Text>
                      <View style={styles.volumeIndicator}>
                        <BarChart2 
                          color={signal.indicators.volume.trend === 'INCREASING' ? '#10B981' : '#EF4444'} 
                          size={14} 
                        />
                        <Text style={[
                          styles.indicatorValue,
                          { color: signal.indicators.volume.trend === 'INCREASING' ? '#10B981' : '#EF4444' }
                        ]}>
                          {signal.indicators.volume.trend === 'INCREASING' ? 'Subindo' : 'Descendo'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.indicatorItem}>
                      <Text style={styles.indicatorLabel}>Spread</Text>
                      <Text style={styles.indicatorValue}>
                        {signal.indicators.spread.toFixed(5)}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.analysisSection}>
                  <View style={styles.analysisTitleRow}>
                    <Target color="#10B981" size={16} />
                    <Text style={styles.analysisTitle}>Análise Multi-IA:</Text>
                  </View>
                  <Text style={styles.analysisText}>{signal.aiAnalysis}</Text>
                </View>

                <View style={styles.footerSection}>
                  <View style={styles.timestampSection}>
                    <Clock color="#6B7280" size={14} />
                    <Text style={styles.timestamp}>
                      {new Date(signal.timestamp).toLocaleString('pt-PT', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </Text>
                  </View>
                  <View style={styles.warningRow}>
                    <AlertTriangle color="#F59E0B" size={14} />
                    <Text style={styles.warningText}>Scalping requer execução rápida</Text>
                  </View>
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
    backgroundColor: '#0F172A',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  badge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  pairsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  generateCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    minWidth: 100,
    borderWidth: 1,
    borderColor: '#334155',
  },
  generateSymbol: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  generateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  generatePrice: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  signalCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
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
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  typeText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  timeBadgeText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '600' as const,
  },
  quickBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  quickBadgeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600' as const,
  },
  scoresGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  scoreCard: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  scoreLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: 'bold' as const,
  },
  priceSection: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
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
    color: '#94A3B8',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  indicatorsSection: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  indicatorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  indicatorItem: {
    flex: 1,
  },
  indicatorLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 4,
  },
  indicatorValue: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  volumeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  analysisSection: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  analysisTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  analysisTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  analysisText: {
    fontSize: 14,
    color: '#CBD5E1',
    lineHeight: 20,
  },
  footerSection: {
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 12,
  },
  timestampSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#64748B',
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  warningText: {
    fontSize: 11,
    color: '#F59E0B',
    fontStyle: 'italic' as const,
  },
  emptyState: {
    alignItems: 'center',
    padding: 48,
  },
  emptyText: {
    fontSize: 18,
    color: '#94A3B8',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center' as const,
  },
});
