# BASED SQUARE ⬛

An interactive particle simulation controlled by hand gestures using your webcam. Pinch to form a glowing square, release to dissolve.

![Demo](https://img.shields.io/badge/demo-live-blue?style=for-the-badge)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![WebGL](https://img.shields.io/badge/WebGL-990000?style=for-the-badge&logo=webgl&logoColor=white)

## ✨ Features

- **12,000 particles** rendered in real-time with WebGL
- **Hand tracking** via MediaPipe Hands
- **Pinch gesture** detection for intuitive control
- **Magnetic attraction** - particles flow toward your hand
- **Square formation** - particles rush into a dense glowing grid
- **Smooth animations** with easing and staggered effects

## 🎮 How to Use

1. **Enable camera** - Click the button to start
2. **Show your hand** - Particles will follow it
3. **Pinch** (thumb + index finger) - Particles form a square
4. **Release** - Square dissolves back to flowing particles

## 🚀 Quick Start

```bash
# Clone the repo
git clone https://github.com/unknownking07/based-square.git

# Navigate to folder
cd based-square

# Start a local server
npx serve .

# Open in browser
# http://localhost:3000
```

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **MediaPipe Hands** | Real-time hand landmark detection |
| **WebGL** | High-performance particle rendering |
| **Vanilla JS** | Zero dependencies, pure JavaScript |

## 📁 Project Structure

```
based-square/
├── index.html      # Main HTML with MediaPipe CDN
├── styles.css      # Futuristic dark theme
└── js/
    ├── main.js     # App controller & animation loop
    ├── camera.js   # Webcam & hand tracking
    ├── particles.js # WebGL particle system
    ├── gestures.js # Pinch gesture detection
    └── utils.js    # Math & easing helpers
```

## 🎨 Customization

Edit `js/particles.js` to customize:
- `particleCount` - Number of particles (default: 12000)
- `cubeSize` - Size of the square formation
- Color values in the `render()` function

## 📄 License

MIT © [unknownking07](https://github.com/unknownking07)

---

Built with 💙 and hand gestures
