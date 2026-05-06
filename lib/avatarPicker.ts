import * as ImagePicker from 'expo-image-picker';
import { ActionSheetIOS, Alert, Platform } from 'react-native';

type Handlers = {
  onPicked: (uri: string) => void;
  onRemoved?: () => void;
};

async function pickFromLibrary(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert(
      'Photos permission needed',
      'Enable Photos access in Settings to choose a picture.',
    );
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.85,
  });
  if (result.canceled || !result.assets?.length) return null;
  return result.assets[0].uri;
}

async function pickFromCamera(): Promise<string | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    Alert.alert(
      'Camera permission needed',
      'Enable Camera access in Settings to take a picture.',
    );
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.85,
  });
  if (result.canceled || !result.assets?.length) return null;
  return result.assets[0].uri;
}

export function presentAvatarPicker({ onPicked, onRemoved }: Handlers) {
  const runLibrary = async () => {
    const uri = await pickFromLibrary();
    if (uri) onPicked(uri);
  };
  const runCamera = async () => {
    const uri = await pickFromCamera();
    if (uri) onPicked(uri);
  };

  if (Platform.OS === 'ios') {
    const options = onRemoved
      ? ['Take photo', 'Choose from library', 'Remove', 'Cancel']
      : ['Take photo', 'Choose from library', 'Cancel'];
    const destructiveIndex = onRemoved ? 2 : -1;
    const cancelIndex = options.length - 1;
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex: cancelIndex,
        destructiveButtonIndex: destructiveIndex >= 0 ? destructiveIndex : undefined,
        userInterfaceStyle: 'dark',
      },
      (idx) => {
        if (idx === 0) runCamera();
        else if (idx === 1) runLibrary();
        else if (idx === 2 && onRemoved) onRemoved();
      },
    );
    return;
  }

  // Android fallback — Alert with buttons
  const buttons: {
    text: string;
    style?: 'default' | 'cancel' | 'destructive';
    onPress?: () => void;
  }[] = [
    { text: 'Take photo', onPress: runCamera },
    { text: 'Choose from library', onPress: runLibrary },
  ];
  if (onRemoved) {
    buttons.push({ text: 'Remove', style: 'destructive', onPress: onRemoved });
  }
  buttons.push({ text: 'Cancel', style: 'cancel' });
  Alert.alert('Profile picture', undefined, buttons);
}
