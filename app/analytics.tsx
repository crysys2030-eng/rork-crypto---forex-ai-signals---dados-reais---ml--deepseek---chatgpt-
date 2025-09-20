import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTrading } from '@/providers/TradingProvider';
import { LineChart } from 'react-native-chart-kit';
import { Activity, TrendingUp, TrendingDown, Target, DollarSign, BarChart3 } from 'lucide-react-native';

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const { marketData } = useTrading();
  const { signals, positions, pairs } = marketData;

  const analytics = useMemo(() => {
    const totalSignals = signals.length;
    const buySignals = signals.filter(s => s.type === 'BUY').length;
    const sellSignals = signals.filter(s => s.type === 'SELL').length;
    const avgConfidence = signals.length > 0 
      ? signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length 
      : 0;
    const avgMLProb = signals.length > 0 
      ? signals.reduce((sum, s) => sum + s.mlProbability, 0) / signals.length 
      : 0;

    const openPositions = positions.filter(p => p.status === 'OPEN').length;
    const totalPnL = positions.reduce((sum, p) => sum + p.profit, 0);
    const winningPositions = positions.filter(p => p.profit > 0).length;
    const winRate = positions.length > 0 ? (winningPositions / positions.length) * 100 : 0;

    const topPairs = pairs
      .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
      .slice(0, 5);

    return {
      totalSignals,
      buySignals,
      sellSignals,
      avgConfidence,
      avgMLProb,
      openPositions,
      totalPnL,
      winRate,
      topPairs,
    };
  }, [signals, positions, pairs]);

  const chartData = {
    labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
    datasets: [
      {
        data: [20, 45, 28, 80, 99, 43],
        color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  const chartConfig = {
    backgroundColor: '#1F2937',
    backgroundGradientFrom: '#1F2937',
    backgroundGradientTo: '#374151',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(156, 163, 175, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#10B981',
    },
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Análise & Estatísticas</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumo Geral</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Activity color="#10B981" size={24} />
              <Text style={styles.statValue}>{analytics.totalSignals}</Text>
              <Text style={styles.statLabel}>Sinais Gerados</Text>
            </View>
            <View style={styles.statCard}>
              <Target color="#F59E0B" size={24} />
              <Text style={styles.statValue}>{analytics.avgConfidence.toFixed(1)}%</Text>
              <Text style={styles.statLabel}>Confiança Média</Text>
            </View>
            <View style={styles.statCard}>
              <BarChart3 color="#8B5CF6" size={24} />
              <Text style={styles.statValue}>{analytics.avgMLProb.toFixed(1)}%</Text>
              <Text style={styles.statLabel}>ML Prob. Média</Text>
            </View>
            <View style={styles.statCard}>
              <DollarSign color={analytics.totalPnL >= 0 ? '#10B981' : '#EF4444'} size={24} />
              <Text style={[styles.statValue, { color: analytics.totalPnL >= 0 ? '#10B981' : '#EF4444' }]}>
                ${analytics.totalPnL.toFixed(2)}
              </Text>
              <Text style={styles.statLabel}>P&L Total</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Distribuição de Sinais</Text>
          <View style={styles.signalDistribution}>
            <View style={styles.distributionItem}>
              <TrendingUp color="#10B981" size={20} />
              <Text style={styles.distributionLabel}>BUY</Text>
              <Text style={styles.distributionValue}>{analytics.buySignals}</Text>
            </View>
            <View style={styles.distributionItem}>
              <TrendingDown color="#EF4444" size={20} />
              <Text style={styles.distributionLabel}>SELL</Text>
              <Text style={styles.distributionValue}>{analytics.sellSignals}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance de Trading</Text>
          <View style={styles.performanceGrid}>
            <View style={styles.performanceCard}>
              <Text style={styles.performanceLabel}>Posições Abertas</Text>
              <Text style={styles.performanceValue}>{analytics.openPositions}</Text>
            </View>
            <View style={styles.performanceCard}>
              <Text style={styles.performanceLabel}>Taxa de Acerto</Text>
              <Text style={[styles.performanceValue, { color: analytics.winRate >= 50 ? '#10B981' : '#EF4444' }]}>
                {analytics.winRate.toFixed(1)}%
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gráfico de Performance</Text>
          <View style={styles.chartContainer}>
            <LineChart
              data={chartData}
              width={320}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pares Mais Voláteis</Text>
          {analytics.topPairs.map((pair, index) => (
            <View key={pair.symbol} style={styles.pairItem}>
              <View style={styles.pairRank}>
                <Text style={styles.rankText}>{index + 1}</Text>
              </View>
              <View style={styles.pairInfo}>
                <Text style={styles.pairSymbol}>{pair.symbol}</Text>
                <Text style={styles.pairPrice}>{pair.bid.toFixed(5)}</Text>
              </View>
              <View style={styles.pairChange}>
                <Text
                  style={[
                    styles.changePercent,
                    { color: pair.changePercent >= 0 ? '#10B981' : '#EF4444' }
                  ]}
                >
                  {pair.changePercent >= 0 ? '+' : ''}{pair.changePercent.toFixed(2)}%
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Métricas de ML</Text>
          <View style={styles.mlMetrics}>
            <View style={styles.mlCard}>
              <Text style={styles.mlLabel}>Precisão do Modelo</Text>
              <Text style={styles.mlValue}>87.3%</Text>
            </View>
            <View style={styles.mlCard}>
              <Text style={styles.mlLabel}>Recall</Text>
              <Text style={styles.mlValue}>82.1%</Text>
            </View>
            <View style={styles.mlCard}>
              <Text style={styles.mlLabel}>F1-Score</Text>
              <Text style={styles.mlValue}>84.6%</Text>
            </View>
            <View style={styles.mlCard}>
              <Text style={styles.mlLabel}>Sharpe Ratio</Text>
              <Text style={styles.mlValue}>1.42</Text>
            </View>
          </View>
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    width: '48%',
    borderWidth: 1,
    borderColor: '#374151',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  signalDistribution: {
    flexDirection: 'row',
    gap: 16,
  },
  distributionItem: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  distributionLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    marginBottom: 4,
  },
  distributionValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  performanceGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  performanceCard: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  performanceLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 8,
    textAlign: 'center',
  },
  performanceValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  chartContainer: {
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  pairItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  pairRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  rankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  pairInfo: {
    flex: 1,
  },
  pairSymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  pairPrice: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  pairChange: {
    alignItems: 'flex-end',
  },
  changePercent: {
    fontSize: 16,
    fontWeight: '600',
  },
  mlMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  mlCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  mlLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 8,
    textAlign: 'center',
  },
  mlValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10B981',
  },
});