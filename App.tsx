import { Fredoka_500Medium, Fredoka_700Bold, useFonts } from '@expo-google-fonts/fredoka';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GameScreen } from './src/ui/GameScreen';
import { C } from './src/ui/theme';

export default function App() {
  const [fontsLoaded] = useFonts({ Fredoka_500Medium, Fredoka_700Bold });
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {fontsLoaded ? <GameScreen /> : <View style={{ flex: 1, backgroundColor: C.bg }} />}
    </SafeAreaProvider>
  );
}
