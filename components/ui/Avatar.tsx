import { Image, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';

interface AvatarProps {
  uri?: string | null;
  initial: string;
  size?: number;
  gold?: boolean;
}

/**
 * Circular avatar with image fallback to initial.
 * Used everywhere a person is shown — profile hero, message rows, chat header,
 * activity host card, joined guest list, etc.
 */
export function Avatar({ uri, initial, size = 40, gold = false }: AvatarProps) {
  const radius = size / 2;
  const fontSize = Math.round(size * 0.42);

  const containerStyle = [
    styles.base,
    {
      width: size,
      height: size,
      borderRadius: radius,
      borderColor: gold ? colors.border.gold : colors.border.default,
    },
  ];

  if (uri) {
    return (
      <View style={containerStyle}>
        <Image source={{ uri }} style={{ width: size, height: size }} />
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      <Text style={[styles.initial, { fontSize }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    backgroundColor: colors.bg.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initial: {
    color: colors.accent.gold,
    fontWeight: '300',
  },
});
