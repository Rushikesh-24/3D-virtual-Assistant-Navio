# How to Add Your 3D Avatar Model

This folder is where you can place your 3D avatar models (.glb or .gltf files).

## Getting a 3D Avatar Model

### Option 1: Ready Player Me (Recommended)

1. Visit [Ready Player Me](https://readyplayer.me/)
2. Create a custom avatar
3. Download as GLB format
4. Place the file in this folder (e.g., `avatar.glb`)

### Option 2: Mixamo

1. Visit [Mixamo](https://www.mixamo.com/)
2. Choose a character
3. Download in GLB format
4. Place the file in this folder

### Option 3: Free Models from Sketchfab

1. Visit [Sketchfab](https://sketchfab.com/)
2. Search for "avatar" or "character"
3. Filter by "Downloadable" and "Free"
4. Download in GLB/GLTF format
5. Place the file in this folder

## Using Your Model

Once you have a model file in this folder:

1. Open `src/components/Avatar.tsx`
2. Find the commented section for GLTF models
3. Uncomment the `GltfAvatarModel` function
4. Update the file path in `useGLTF('/models/your-avatar.glb')`
5. Replace `<AvatarModel isSpeaking={isSpeaking} />` with `<GltfAvatarModel isSpeaking={isSpeaking} />`
6. Adjust the `scale` and `position` props as needed

## Model Requirements

- Format: .glb or .gltf
- Size: Keep under 10MB for best performance
- Optimized for web (use tools like gltf-pipeline if needed)
- Ideally rigged for animations (though basic models work too)

## Example Structure

```
public/
  models/
    avatar.glb          <- Your main avatar
    backup-avatar.glb   <- Alternative avatar
    README.md           <- This file
```

The current app uses a simple procedural avatar as a placeholder. Replace it with your custom model for a more realistic experience!
