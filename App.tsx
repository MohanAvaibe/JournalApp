import React from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ScribbleCanvas from './components/ScribbleCanvas';
import ScribbleMultiPage from './components/ScribbleCanvas';

export default function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <GestureHandlerRootView style={styles.container}>
        <ScribbleCanvas />
        {/* <ScribbleMultiPage /> */}
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
