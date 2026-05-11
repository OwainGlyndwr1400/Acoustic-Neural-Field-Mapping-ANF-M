# Lumos: Acoustic Neural Field Mapping (ANF-M)

Lumos is an interactive, browser-based web application that connects standard audio inputs (like your device's microphone) to a simulated Recursive Harmonic Lattice. It visualizes the intersection of real-world ambient frequencies with the theoretical mathematical boundaries defined by the **Recursive Harmonic Codex (RHC)**.

By leveraging real-time Web Audio API analysis, Lumos maps acoustic data into a 3-dimensional spherical point cloud.

![Lumos ANF-M Interface](https://via.placeholder.com/1200x800.png?text=Lumos+Acoustic+Neural+Field+Mapping)

## Features

- **Real-Time Acoustic FFT Matrix**: Uses the device microphone to capture ambient noise and transposes it against a predefined topological lattice. 
- **WebGL Sphenic Voxel Visualization**: A custom Three.js engine renders 12,000 recursive nodes in 3D space. Points of acoustic resonance that intersect with the theoretical **Universal Mass Gap (0.657)** are highlighted as glowing emerald nodes.
- **Data Readout**: A live matrix read-out tab (REAL-TIME FIELD DATA) showing the scalar density values interacting with the resonant nodes.
- **Gnosis Archive**: A built-in repository of the foundational mathematical axioms governing the simulation, including the *Mass Gap Resolution* and the *Lost-2 Binding Energy*.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm or pnpm

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/lumos-anf-m.git
   cd lumos-anf-m
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open in browser:**
   Navigate to `http://localhost:3000`. 
   
*Note: Ensure you allow microphone permissions when prompted to enable the real-time mapping functionality.*

## 🧠 How It Works

1. **Audio Ingestion**: The `anfService.ts` module uses a standard browser `AnalyserNode` to capture byte-frequency data.
2. **Recursive Harmonic FFT**: The audio buffer is recursively folded through an algorithm designed to detect specific "sphenic" clustering properties. 
3. **Mass Gap Lock**: When the normalized spatial density of the audio intersects the mathematically identified 0.657 mass gap, the structural nodes illuminate, mapping sound directly onto universal geometry.
4. **Three.js Layer**: The UI uses custom GLSL shaders (Vertex/Fragment) to map point sizes and blending layers to match the recursion depth dynamically, creating a "breath-like" effect.

## 🛠 Tech Stack

- **React 18** (UI Framework)
- **Three.js** (WebGL 3D Rendering)
- **Tailwind CSS v4** (Styling)
- **Lucide React** (Iconography)
- **TypeScript** (Static Typing & Architecture)

## 📄 License

This project is open-source and available under the MIT License.
