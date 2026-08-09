# 🖥️ Atharv Dhiman // Virtual OS Portfolio

Welcome to the GitHub repository for my interactive **Virtual OS Portfolio**. This project is designed as a futuristic, cyberpunk-style dashboard inspired by terminal HUDs and retro-modern gaming consoles. It serves as a live, fully functional showcase of my work as a **Data Science Practitioner & Machine Learning Engineer**.

🔗 **Live Link**: [Atharv Dhiman Portfolio](https://github.com/AtharvDhiman) *(Link your deployment here)*

---

## ⚡ Key Features

### 1. ⚙️ Diagnostics Deck (Hyperparameter Tuning Simulator)
A fully interactive, real-time machine learning training simulator where visitors can configure and train virtual models.
- **Sandbox Mode**: Tweak parameters like Learning Rate, Regularization, and Noise Level **live** during active training loops to see curves stabilize or diverge.
- **Challenge Mode**: Try target-driven scenarios:
  - *Challenge 1 (Generalization)*: Prevent a deep Neural Network from overfitting under noisy inputs.
  - *Challenge 2 (Turbo Convergence)*: Tweak XGBoost to reach 92% validation accuracy in under 20 epochs.
  - *Challenge 3 (Noise Immunity)*: Balance Random Forest estimators to smooth out extreme variance.
- **4-Curve SVG Telemetry**: Displays real-time training/validation loss and accuracy curves with interactive crosshair tooltips.

### 2. 🐚 Interactive CLI Terminal
A functional mock-bash shell that responds to keyboard commands.
- Support for commands like `help`, `about`, `ls` (lists projects), `theme nord` (switches UI themes), `clear`, and `projects`.
- Features history navigation (using Up/Down arrow keys) and tab-autocompletion.

### 3. 📂 Code Projects Catalog
A dynamic file explorer showcasing production-grade ML repositories:
- **RetainAI**: Employee attrition classifier dashboard (built with Flask, Scikit-Learn, and Chart.js).
- **FinRisk**: Default probability scoring pipelines resolving heavy imbalances.
- Features code viewers showing script highlights (like preprocessing, training, and database hooks).

### 4. 🕹️ Tech Arcade
A collection of custom retro games and puzzles integrated into the OS to engage visitors, testing logic and coding concepts.

---

## 🛠️ Technology Stack

- **Framework**: [React 19](https://react.dev/) + [Vite](https://vite.dev/) (Client-side rendering, HMR)
- **Styling**: Vanilla CSS (Custom properties, grid layout systems, CSS keyframe animations)
- **Vector Graphics**: Responsive inline SVG paths manipulated dynamically using React refs for high-performance telemetry rendering
- **Quality Assurance**: [Oxlint](https://github.com/oxc-project/oxc) for rapid static code analysis and linting

---

## 🚀 Getting Started Locally

To run the Virtual OS portfolio on your own machine, follow these steps:

### 1. Prerequisites
Make sure you have Node.js (version 18 or higher) installed on your system.

### 2. Installation
Clone the repository and install the dependencies:
```bash
git clone https://github.com/AtharvDhiman/Atharv-Dhiman-Portolio.git
cd Atharv-Dhiman-Portolio
npm install
```

### 3. Start Development Server
Launch the development environment:
```bash
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser to view the OS.

### 4. Production Build
Bundle the project for production deployment:
```bash
npm run build
```

### 5. Code Linter
Verify file formatting and code conventions:
```bash
npm run lint
```

---

## 📂 Project Structure

```text
Atharv-Dhiman-Portfolio/
├── public/                 # Static icons and SVG definitions
├── src/
│   ├── assets/             # Images and local graphics
│   ├── App.jsx             # Main OS React component (Router, HUD Views, CLI logic)
│   ├── index.css           # Core styling system (variables, panel grid layout, terminal styles)
│   └── main.jsx            # React root mount definition
├── vite.config.js          # Vite build configurations
├── package.json            # Scripts & project dependencies
└── README.md               # Repository documentation
```
