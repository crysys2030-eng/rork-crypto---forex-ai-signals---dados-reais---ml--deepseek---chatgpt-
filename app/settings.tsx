import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Settings, Key, Bell, Palette, Info, Shield, Database, Check } from 'lucide-react-native';
import { useTrading } from '@/providers/TradingProvider';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { forexApiKey, saveForexApiKey } = useTrading();
  const [apiKey, setApiKey] = useState<string>('');
  const [mt5Login, setMt5Login] = useState<string>('');
  const [mt5Password, setMt5Password] = useState<string>('');
  const [mt5Server, setMt5Server] = useState<string>('');
  const [notifications, setNotifications] = useState<boolean>(true);
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [autoTrading, setAutoTrading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        if (forexApiKey) {
          setApiKey(forexApiKey);
        }
        const storedMt5Login = await AsyncStorage.getItem('mt5Login');
        const storedMt5Server = await AsyncStorage.getItem('mt5Server');
        const storedNotifications = await AsyncStorage.getItem('notifications');
        const storedDarkMode = await AsyncStorage.getItem('darkMode');
        const storedAutoTrading = await AsyncStorage.getItem('autoTrading');
        
        if (storedMt5Login) setMt5Login(storedMt5Login);
        if (storedMt5Server) setMt5Server(storedMt5Server);
        if (storedNotifications) setNotifications(JSON.parse(storedNotifications));
        if (storedDarkMode) setDarkMode(JSON.parse(storedDarkMode));
        if (storedAutoTrading) setAutoTrading(JSON.parse(storedAutoTrading));
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
      }
    };
    loadSettings();
  }, [forexApiKey]);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      if (apiKey.trim()) {
        await saveForexApiKey(apiKey.trim());
      }
      
      if (mt5Login.trim()) {
        await AsyncStorage.setItem('mt5Login', mt5Login.trim());
      }
      if (mt5Server.trim()) {
        await AsyncStorage.setItem('mt5Server', mt5Server.trim());
      }
      await AsyncStorage.setItem('notifications', JSON.stringify(notifications));
      await AsyncStorage.setItem('darkMode', JSON.stringify(darkMode));
      await AsyncStorage.setItem('autoTrading', JSON.stringify(autoTrading));
      
      Alert.alert('Sucesso', 'Configurações salvas com sucesso!', [{ text: 'OK' }]);
      console.log('Configurações salvas com sucesso');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      Alert.alert('Erro', 'Não foi possível salvar as configurações', [{ text: 'OK' }]);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Configurações</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Key color="#10B981" size={20} />
            <Text style={styles.sectionTitle}>API & Conexões</Text>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Chave API Forex</Text>
            <TextInput
              style={styles.textInput}
              value={apiKey}
              onChangeText={setApiKey}
              placeholder="Insira sua chave API"
              placeholderTextColor="#6B7280"
              secureTextEntry
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Login MT5</Text>
            <TextInput
              style={styles.textInput}
              value={mt5Login}
              onChangeText={setMt5Login}
              placeholder="Número da conta MT5"
              placeholderTextColor="#6B7280"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Senha MT5</Text>
            <TextInput
              style={styles.textInput}
              value={mt5Password}
              onChangeText={setMt5Password}
              placeholder="Senha da conta MT5"
              placeholderTextColor="#6B7280"
              secureTextEntry
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Servidor MT5</Text>
            <TextInput
              style={styles.textInput}
              value={mt5Server}
              onChangeText={setMt5Server}
              placeholder="ex: MetaQuotes-Demo"
              placeholderTextColor="#6B7280"
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Bell color="#F59E0B" size={20} />
            <Text style={styles.sectionTitle}>Notificações</Text>
          </View>
          
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Alertas de Sinais</Text>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#374151', true: '#10B981' }}
              thumbColor={notifications ? '#FFFFFF' : '#9CA3AF'}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Palette color="#8B5CF6" size={20} />
            <Text style={styles.sectionTitle}>Aparência</Text>
          </View>
          
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Modo Escuro</Text>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: '#374151', true: '#10B981' }}
              thumbColor={darkMode ? '#FFFFFF' : '#9CA3AF'}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Shield color="#EF4444" size={20} />
            <Text style={styles.sectionTitle}>Trading Automático</Text>
          </View>
          
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Executar Trades Automaticamente</Text>
            <Switch
              value={autoTrading}
              onValueChange={setAutoTrading}
              trackColor={{ false: '#374151', true: '#EF4444' }}
              thumbColor={autoTrading ? '#FFFFFF' : '#9CA3AF'}
            />
          </View>
          
          <Text style={styles.warningText}>
            ⚠️ Atenção: O trading automático pode resultar em perdas significativas. Use com cautela.
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Database color="#6B7280" size={20} />
            <Text style={styles.sectionTitle}>Dados & Armazenamento</Text>
          </View>
          
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Limpar Cache de Dados</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Exportar Histórico</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionButton, styles.dangerButton]}>
            <Text style={[styles.actionButtonText, styles.dangerButtonText]}>
              Resetar Todas as Configurações
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Info color="#3B82F6" size={20} />
            <Text style={styles.sectionTitle}>Informações</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Versão do App</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Última Atualização</Text>
            <Text style={styles.infoValue}>Hoje</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status da Conexão</Text>
            <Text style={[styles.infoValue, { color: '#10B981' }]}>Conectado</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]} 
          onPress={handleSaveSettings}
          disabled={isSaving}
        >
          {isSaving ? (
            <Text style={styles.saveButtonText}>Salvando...</Text>
          ) : (
            <View style={styles.saveButtonContent}>
              <Check color="#FFFFFF" size={20} />
              <Text style={styles.saveButtonText}>Salvar Configurações</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            ⚠️ Aviso Legal: Este aplicativo é apenas para fins educacionais. 
            O trading de forex envolve riscos significativos e pode resultar em perdas. 
            Sempre consulte um consultor financeiro qualificado antes de tomar decisões de investimento.
          </Text>
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 8,
    fontWeight: '500',
  },
  textInput: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#374151',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  settingLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  warningText: {
    fontSize: 12,
    color: '#F59E0B',
    fontStyle: 'italic',
    marginTop: 8,
    lineHeight: 16,
  },
  actionButton: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  actionButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '500',
  },
  dangerButton: {
    borderColor: '#EF4444',
  },
  dangerButtonText: {
    color: '#EF4444',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  infoLabel: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  infoValue: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#10B981',
    borderRadius: 16,
    paddingVertical: 18,
    marginBottom: 24,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#6B7280',
  },
  saveButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  disclaimer: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  disclaimerText: {
    fontSize: 12,
    color: '#F59E0B',
    lineHeight: 18,
    textAlign: 'center',
  },
});