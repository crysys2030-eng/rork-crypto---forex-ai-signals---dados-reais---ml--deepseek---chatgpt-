import { Tabs } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TradingProvider } from "@/providers/TradingProvider";
import { TrendingUp, BarChart3, Bot, Settings, Activity, Zap } from "lucide-react-native";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000,
      refetchInterval: 1000,
    },
  },
});

function RootLayoutNav() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#10B981',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#1F2937',
          borderTopColor: '#374151',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <TrendingUp color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="signals"
        options={{
          title: "Sinais AI",
          tabBarIcon: ({ color, size }) => (
            <Bot color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="scalping"
        options={{
          title: "Scalping",
          tabBarIcon: ({ color, size }) => (
            <Zap color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="trading"
        options={{
          title: "Trading",
          tabBarIcon: ({ color, size }) => (
            <BarChart3 color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: "Análise",
          tabBarIcon: ({ color, size }) => (
            <Activity color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Config",
          tabBarIcon: ({ color, size }) => (
            <Settings color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <QueryClientProvider client={queryClient}>
        <TradingProvider>
          <RootLayoutNav />
        </TradingProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
});