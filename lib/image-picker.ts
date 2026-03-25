import * as ImagePicker from 'expo-image-picker';

export type PickedImageFile = {
  uri: string;
  type: string;
  name: string;
};

export async function pickImagesFromLibrary(filePrefix: string): Promise<PickedImageFile[]> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (permission.status !== 'granted') {
    throw new Error('Media library permission is required to upload images.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    allowsMultipleSelection: true,
    quality: 0.8,
  });
  if (result.canceled) {
    return [];
  }

  const timestamp = Date.now();
  return result.assets.map((asset, index) => ({
    uri: asset.uri,
    type: asset.mimeType ?? 'image/jpeg',
    name: asset.fileName ?? `${filePrefix}-${timestamp}-${index + 1}.jpg`,
  }));
}
