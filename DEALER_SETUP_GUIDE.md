# 🎰 3D Dealer Setup Guide

Complete guide to set up and customize the 3D poker dealer in your DeepStack arena.

## 📦 What's Already Done

✅ **3D Infrastructure**: Three.js, React Three Fiber, and Drei installed
✅ **Dealer Component**: Placeholder 3D model with toon shader
✅ **Comment System**: 100+ non-repetitive sarcastic dealer comments
✅ **Animation Framework**: Idle animations, card dealing, chip raking
✅ **UI Integration**: Dealer positioned on left side of poker table
✅ **Performance Optimization**: Lightweight rendering for low-end devices

## 🎨 Current Status: Placeholder Model

The dealer currently uses a **geometric placeholder** (simple 3D shapes) to demonstrate positioning and functionality. To get a realistic dealer character, follow the steps below.

---

## 🚀 Upgrading to Real Mixamo Character (10-Minute Guide)

### Step 1: Download Mixamo Character (5 minutes)

1. **Go to Mixamo**
   Visit [https://www.mixamo.com](https://www.mixamo.com) and sign in (free Adobe account)

2. **Select a Character**
   - Click "Characters" tab
   - Search for: **"business"** or **"formal"**
   - Good options: "Malcolm", "Remy", "Swat Guy" (in formal attire)
   - Pick a male character that looks professional

3. **Download the Character**
   - Click your chosen character
   - Select animation: **"Idle"** (from the search bar)
   - Click "Download"
   - Settings:
     - Format: **GLB** (preferred) or FBX
     - Pose: T-Pose
     - Frames per second: 30
   - Download and save as `dealer-idle.glb`

4. **Download Additional Animations**
   With the same character selected, download these animations:

   **Animation: "Dealing Cards" or "Picking Up"**
   - Search "pick" or "reach"
   - Download as `dealer-dealing.glb`

   **Animation: "Waving" or "Pointing"**
   - For gesture animations
   - Download as `dealer-gesture.glb`

### Step 2: Add Models to Project (1 minute)

1. Create folder: `src/assets/models/dealer/`
2. Place your downloaded files:
   ```
   src/assets/models/dealer/
   ├── dealer-idle.glb
   ├── dealer-dealing.glb
   └── dealer-gesture.glb
   ```

### Step 3: Update DealerModel Component (2 minutes)

Open `src/components/Dealer3D/DealerModel.jsx` and **replace the entire file** with this:

```jsx
import React, { useRef, useEffect } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { createSimpleToonMaterial } from '../../shaders/toonShader';

const DealerModel = ({ animation = 'idle', position = [0, 0, 0] }) => {
  const groupRef = useRef();

  // Load model and animations
  const { scene, animations } = useGLTF('/models/dealer/dealer-idle.glb');
  const { actions } = useAnimations(animations, scene);

  // Apply toon materials to all meshes
  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        // Preserve original color but apply toon shader
        const originalColor = child.material.color;
        child.material = createSimpleToonMaterial(
          originalColor ? `#${originalColor.getHexString()}` : '#2c2c2c'
        );
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [scene]);

  // Play animations based on state
  useEffect(() => {
    if (actions[animation]) {
      actions[animation]?.reset().fadeIn(0.5).play();
      return () => actions[animation]?.fadeOut(0.5);
    }
    // Fallback to first animation if requested one doesn't exist
    const firstAction = Object.values(actions)[0];
    firstAction?.reset().fadeIn(0.5).play();
    return () => firstAction?.fadeOut(0.5);
  }, [animation, actions]);

  return (
    <group ref={groupRef} position={position}>
      <primitive object={scene} scale={1.2} />
    </group>
  );
};

// Preload models for better performance
useGLTF.preload('/models/dealer/dealer-idle.glb');

export default DealerModel;
```

### Step 4: Test It! (1 minute)

1. Start your dev server:
   ```bash
   npm run dev
   ```

2. Navigate to a poker game in your app

3. You should see the dealer on the left side of the table!

---

## 🎨 Customizing the Dealer

### Change Dealer Position

Edit `src/components/PokerTable.jsx`:

```jsx
// Find this line (around line 136)
<div className="absolute left-[8%] top-1/2 -translate-y-1/2 w-[200px] h-[300px] z-25">

// Adjust position:
left-[8%]    → left-[15%]   (move right)
top-1/2      → top-[40%]    (move up)
w-[200px]    → w-[250px]    (make bigger)
```

### Change Dealer Scale

Edit `src/components/Dealer3D/DealerModel.jsx`:

```jsx
// Find this line
<primitive object={scene} scale={1.2} />

// Adjust scale:
scale={1.2}  → scale={1.5}   (make bigger)
scale={1.2}  → scale={0.9}   (make smaller)
```

### Change Camera Angle

Edit `src/components/Dealer3D/Dealer3D.jsx`:

```jsx
// Find this section
<PerspectiveCamera
  makeDefault
  position={[2, 3, 4]}  // [x, y, z]
  fov={45}
/>

// Top-down view:     position={[0, 5, 2]}
// Side view:         position={[4, 2, 0]}
// 3/4 view (current): position={[2, 3, 4]}
```

### Change Dealer Colors (Outfit)

Edit the toon material colors in `DealerModel.jsx`:

```jsx
child.material = createSimpleToonMaterial('#2c2c2c'); // Dark vest

// Red vest:    '#8b0000'
// Blue vest:   '#1e3a8a'
// Black vest:  '#0a0a0a'
// White shirt: '#f5f5f5'
```

---

## 💬 Customizing Dealer Comments

### Add More Comments

Edit `src/data/dealerComments.js`:

```javascript
export const dealerComments = {
  raise: [
    "Bold move. Let's see if it pays off.",
    "YOUR NEW COMMENT HERE",
    "ANOTHER COMMENT HERE",
  ],
  // ... add to any category
};
```

### Adjust Comment Frequency

Edit `src/hooks/useDealer.js`:

```javascript
// Find this line (around line 63)
const shouldComment = Math.random() < 0.7; // 70% chance

// Change frequency:
0.7  → 1.0   (comment on every action)
0.7  → 0.5   (comment less often)
0.7  → 0.3   (rare comments)
```

### Change Comment Display Duration

Edit `src/hooks/useDealer.js`:

```javascript
// Find this line (around line 23)
commentTimeoutRef.current = setTimeout(() => {
  setCommentVisible(false);
}, 3500); // 3.5 seconds

// Adjust duration:
3500 → 5000  (show longer)
3500 → 2000  (show shorter)
```

---

## ⚙️ Performance Settings

### For High-End Devices (Better Graphics)

Edit `src/components/Dealer3D/Dealer3D.jsx`:

```jsx
<Canvas
  shadows
  gl={{
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  }}
>
```

### For Low-End Devices (Faster Performance)

```jsx
<Canvas
  shadows={false}  // Disable shadows
  gl={{
    alpha: true,
    antialias: false,  // Disable antialiasing
    powerPreference: 'low-power',
  }}
>
```

### Conditional Quality Based on Device

```jsx
const isLowEndDevice = navigator.hardwareConcurrency < 4;

<Canvas
  shadows={!isLowEndDevice}
  gl={{
    antialias: !isLowEndDevice,
    powerPreference: isLowEndDevice ? 'low-power' : 'high-performance',
  }}
>
```

---

## 🔧 Troubleshooting

### Problem: Dealer not appearing

**Solution 1**: Check if there are players at the table
- Dealer only appears when `players.length > 0`

**Solution 2**: Check browser console for errors
- Open DevTools (F12) → Console tab
- Look for Three.js or model loading errors

**Solution 3**: Verify model paths
```bash
# Check if models exist:
ls src/assets/models/dealer/
# Should show: dealer-idle.glb
```

### Problem: Dealer is too big/small

Edit scale in `DealerModel.jsx`:
```jsx
<primitive object={scene} scale={0.8} /> // Make smaller
```

### Problem: Dealer is rotated wrong

Add rotation to the group:
```jsx
<group ref={groupRef} position={position} rotation={[0, Math.PI, 0]}>
  {/* This rotates 180 degrees */}
</group>
```

### Problem: Performance is slow

1. **Reduce dealer canvas size**:
   ```jsx
   // In PokerTable.jsx
   w-[200px] h-[300px]  →  w-[150px] h-[225px]
   ```

2. **Disable shadows**:
   ```jsx
   // In Dealer3D.jsx
   <Canvas shadows={false}>
   ```

3. **Hide dealer on mobile**:
   ```jsx
   {players.length > 0 && !isMobile && (
     <Dealer3D ... />
   )}
   ```

### Problem: Comments not showing

Check that `eventLog` is being passed:
```jsx
// In PokerTable.jsx
<Dealer3D
  gameState={gameState}
  eventLog={eventLog}  // ← Make sure this exists
/>
```

---

## 📱 Mobile Optimization

### Hide Dealer on Small Screens

Add this to `PokerTable.jsx`:

```jsx
import { useState, useEffect } from 'react';

const [isMobile, setIsMobile] = useState(false);

useEffect(() => {
  const checkMobile = () => setIsMobile(window.innerWidth < 768);
  checkMobile();
  window.addEventListener('resize', checkMobile);
  return () => window.removeEventListener('resize', checkMobile);
}, []);

// Then in JSX:
{players.length > 0 && !isMobile && (
  <div className="absolute left-[8%] ...">
    <Dealer3D ... />
  </div>
)}
```

---

## 🎓 Advanced: Adding New Animations

### Step 1: Download New Animation from Mixamo
1. Select your character on Mixamo
2. Search for animation (e.g., "shuffle cards")
3. Download as GLB: `dealer-shuffle.glb`
4. Place in `src/assets/models/dealer/`

### Step 2: Update Animation Hook
Edit `src/hooks/useDealer.js`:

```javascript
const animationMap = {
  'raise': 'idle',
  'call': 'idle',
  'fold': 'idle',
  'shuffle': 'shuffle',  // ← Add this
};
```

### Step 3: Trigger the Animation
```javascript
// From game code:
triggerAnimation('shuffle');
```

---

## 📚 Resources

- **Mixamo**: [mixamo.com](https://www.mixamo.com) - Free 3D characters
- **Three.js Docs**: [threejs.org/docs](https://threejs.org/docs/)
- **React Three Fiber**: [docs.pmnd.rs/react-three-fiber](https://docs.pmnd.rs/react-three-fiber/)
- **Sketchfab**: [sketchfab.com](https://sketchfab.com) - Alternative 3D models

---

## ✅ Quick Checklist

- [ ] Downloaded Mixamo character (GLB format)
- [ ] Placed models in `src/assets/models/dealer/`
- [ ] Updated `DealerModel.jsx` with real model code
- [ ] Tested in browser (dealer appears on left side)
- [ ] Adjusted scale/position to your liking
- [ ] Customized dealer comments (optional)
- [ ] Optimized for your target devices

---

**Need Help?** Check the full README in `src/components/Dealer3D/README.md`

**Questions?** Open an issue or check the Three.js community forums.

---

🎲 **Enjoy your interactive poker dealer!** 🎰
