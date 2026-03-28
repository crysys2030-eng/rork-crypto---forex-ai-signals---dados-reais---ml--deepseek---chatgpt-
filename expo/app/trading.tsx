import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTrading } from '@/providers/TradingProvider';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react-native';

export default function TradingScreen() {
  const insets = useSafeAreaInsets();
  const { marketData, executeTrade, isLoading } = useTrading();
  const { signals, positions } = marketData;
  const [selectedSignal, setSelectedSignal] = useState<string | null>(null);
  const [volume, setVolume] = useState<string>('0.1');

  const activeSignals = signals.filter(signal => signal.status === 'ACTIVE');
  const openPositions = positions.filter(position => position.status === 'OPEN');

  const handleExecuteTrade = async (signal: any) => {
    const volumeNum = parseFloat(volume);
    if (isNaN(volumeNum) || volumeNum <= 0) {
      Alert.alert('Erro', 'Volume inválido');
      return;
    }

    try {
      await executeTrade(signal, volumeNum);
      Alert.alert('Sucesso', 'Trade executado com sucesso!');
      setSelectedSignal(null);
    } catch (error) {
      Alert.alert('Erro', 'Falha ao executar trade');
    }
  };

  const calculatePnL = (position: any) => {
    const priceDiff = position.currentPrice - position.entryPrice;
    const multiplier = position.type === 'BUY' ? 1 : -1;
    return priceDiff * multiplier * position.volume * 100000;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Trading MT5</Text>
        <View style={styles.balanceCard}>
          <DollarSign color="#10B981" size={20} />
          <Text style={styles.balanceText}>$10,000.00</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sinais Disponíveis</Text>
          {activeSignals.length === 0 ? (
            <View style={styles.emptyState}>
              <BarChart3 color="#6B7280" size={48} />
              <Text style={styles.emptyText}>Nenhum sinal ativo</Text>
              <Text style={styles.emptySubtext}>Vá para Sinais AI para gerar novos sinais</Text>
            </View>
          ) : (
            activeSignals.map((signal) => (
              <TouchableOpacity
                key={signal.id}
                style={[
                  styles.signalCard,
                  selectedSignal === signal.id && styles.selectedSignalCard
                ]}
                onPress={() => setSelectedSignal(signal.id)}
              >
                <View style={styles.signalHeader}>
                  <Text style={styles.signalSymbol}>{signal.symbol}</Text>
                  <View
                    style={[
                      styles.signalType,
                      { backgroundColor: signal.type === 'BUY' ? '#10B981' : '#EF4444' }
                    ]}
                  >
                    {signal.type === 'BUY' ? (
                      <TrendingUp color="#FFFFFF" size={16} />
                    ) : (
                      <TrendingDown color="#FFFFFF" size={16} />
                    )}
                    <Text style={styles.signalTypeText}>{signal.type}</Text>
                  </View>
                </View>

                <View style={styles.signalDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Entry:</Text>
                    <Text style={styles.detailValue}>{signal.entryPrice.toFixed(5)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>SL:</Text>
                    <Text style={styles.detailValue}>{signal.stopLoss.toFixed(5)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>TP:</Text>
                    <Text style={styles.detailValue}>{signal.takeProfit.toFixed(5)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Confiança:</Text>
                    <Text style={styles.detailValue}>{signal.confidence}%</Text>
                  </View>
                </View>

                {selectedSignal === signal.id && (
                  <View style={styles.tradeForm}>
                    <View style={styles.volumeContainer}>
                      <Text style={styles.volumeLabel}>Volume (lotes):</Text>
                      <TextInput
                        style={styles.volumeInput}
                        value={volume}
                        onChangeText={setVolume}
                        keyboardType="decimal-pad"
                        placeholder="0.1"
                        placeholderTextColor="#6B7280"
                      />
                    </View>
                    <TouchableOpacity
                      style={styles.executeButton}
                      onPress={() => handleExecuteTrade(signal)}
                      disabled={isLoading}
                    >
                      <Text style={styles.executeButtonText}>
                        {isLoading ? 'Executando...' : 'Executar Trade'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Posições Abertas ({openPositions.length})</Text>
          {openPositions.length === 0 ? (
            <View style={styles.emptyState}>
              <Activity color="#6B7280" size={48} />
              <Text style={styles.emptyText}>Nenhuma posição aberta</Text>
            </View>
          ) : (
            openPositions.map((position) => {
              const pnl = calculatePnL(position);
              return (
                <View key={position.id} style={styles.positionCard}>
                  <View style={styles.positionHeader}>
                    <Text style={styles.positionSymbol}>{position.symbol}</Text>
                    <Text
                      style={[
                        styles.positionPnL,
                        { color: pnl >= 0 ? '#10B981' : '#EF4444' }
                      ]}
                    >
                      {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                    </Text>
                  </View>

                  <View style={styles.positionDetails}>
                    <View style={styles.positionRow}>
                      <Text style={styles.positionLabel}>Tipo:</Text>
                      <Text
                        style={[
                          styles.positionValue,
                          { color: position.type === 'BUY' ? '#10B981' : '#EF4444' }
                        ]}
                      >
                        {position.type}
                      </Text>
                    </View>
                    <View style={styles.positionRow}>
                      <Text style={styles.positionLabel}>Volume:</Text>
                      <Text style={styles.positionValue}>{position.volume} lotes</Text>
                    </View>
                    <View style={styles.positionRow}>
                      <Text style={styles.positionLabel}>Entry:</Text>
                      <Text style={styles.positionValue}>{position.entryPrice.toFixed(5)}</Text>
                    </View>
                    <View style={styles.positionRow}>
                      <Text style={styles.positionLabel}>Atual:</Text>
                      <Text style={styles.positionValue}>{position.currentPrice.toFixed(5)}</Text>
                    </View>
                    <View style={styles.positionRow}>
                      <Text style={styles.positionLabel}>SL:</Text>
                      <Text style={styles.positionValue}>{position.stopLoss.toFixed(5)}</Text>
                    </View>
                    <View style={styles.positionRow}>
                      <Text style={styles.positionLabel}>TP:</Text>
                      <Text style={styles.positionValue}>{position.takeProfit.toFixed(5)}</Text>
                    </View>
                  </View>

                  <TouchableOpacity style={styles.closeButton}>
                    <Text style={styles.closeButtonText}>Fechar Posição</Text>
                  </TouchableOpacity>
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
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 8,
  },
  balanceText: {
    fontSize: 16,
    fontWeight: '600',
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
  signalCard: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  selectedSignalCard: {
    borderColor: '#10B981',
    borderWidth: 2,
  },
  signalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  signalSymbol: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  signalType: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  signalTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  signalDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  tradeForm: {
    borderTopWidth: 1,
    borderTopColor: '#374151',
    paddingTop: 16,
  },
  volumeContainer: {
    marginBottom: 16,
  },
  volumeLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  volumeInput: {
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
  },
  executeButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  executeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  positionCard: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  positionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  positionSymbol: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  positionPnL: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  positionDetails: {
    marginBottom: 16,
  },
  positionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  positionLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  positionValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  closeButton: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
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