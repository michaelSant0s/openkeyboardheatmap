Contributing to Open Keyboard Heatmap

First off, thank you for considering contributing to Open Keyboard Heatmap! 🎉

This is a community-driven, privacy-first open-source project. Whether you're fixing a bug, adding a new feature, suggesting an enhancement, or just improving the documentation, your help is highly appreciated.
🗺️ Table of Contents

    How Can I Contribute?

    Local Development Setup

    Project Architecture

    Pull Request Process

    Code Style & Guidelines

🛠️ How Can I Contribute?
Reporting Bugs

If you find a bug, please check the Issues tab to see if it has already been reported. If not, open a new issue and include:

    Your Operating System (Windows 11, macOS Sonoma, Ubuntu 24.04, etc.).

    Your physical keyboard layout (QWERTY, QWERTZ, AZERTY, ISO/ANSI).

    Steps to reproduce the bug.

    The relevant output from the debug logs (<app-data>/logs/debug-YYYY-MM-DD.log).

Suggesting Enhancements

Have an idea for a new feature or a better heatmap visualization?

    Open a Discussion or an Issue.

    Explain why this feature would be useful and how it should work.

    If you want to build it yourself, please open an Issue first to discuss the implementation details before writing code. This saves everyone time!

💻 Local Development Setup

To get the project running on your local machine, follow these steps:
1. Prerequisites

    Node.js (v18 or higher recommended)

    npm

Linux specifically: You will need native build tools and X11/Wayland headers for uiohook-napi. Run:
Bash

sudo apt install libx11-dev libxtst-dev libxt-dev libxinerama-dev \
  libx11-xcb-dev libxkbcommon-dev libxkbcommon-x11-dev libxkbfile-dev

2. Installation

Clone the repository and install the dependencies:
Bash

git clone https://github.com/michaelSant0s/openkeyboardheatmap.git
cd openkeyboardheatmap
npm install

3. Running the App

Start the app in development mode with Hot Module Replacement (HMR):
Bash

npm run dev

Note for Linux users: Global keyboard capture might require elevated privileges on certain display servers (like Wayland). You can use the provided script to test the built app with elevated privileges:
Bash

./scripts/linux-run-built-sudo.sh

🏗️ Project Architecture

To help you navigate the codebase, here is a quick overview of our stack:

    Framework: Electron (via electron-vite)

    Frontend (Renderer): React, Vite, TypeScript

    Backend (Main): Node.js, TypeScript

    Keylogging: uiohook-napi (Catches global keystrokes at the OS level)

    Database: SQLite via better-sqlite3-multiple-ciphers (Encrypted, local-only storage)

Data Flow:
The main process intercepts keystrokes, instantly drops sequence and precise timestamp data to preserve privacy, buffers the aggregate counts in memory, and writes them to the SQLite database every 5-30 seconds (randomized interval). The React frontend then queries this database to render the UI.
🔄 Pull Request Process

We welcome pull requests (PRs)! To ensure a smooth review process:

    Fork the repository and create your branch from main.

    Use a descriptive branch name (e.g., feature/custom-color-themes or fix/mac-modifier-keys).

    Run tests before committing to ensure nothing is broken:
    Bash

    npm test

    Make your changes. If you add a new feature, please add or update the respective tests using vitest.

    Commit your changes. Write clear, concise commit messages.

    Push to your fork and submit a Pull Request.

    Wait for the maintainer to review. We might suggest some tweaks or improvements.

📝 Code Style & Guidelines

    TypeScript First: Please use TypeScript and avoid any wherever possible. Define proper interfaces for new data structures.

    Privacy by Design: Remember our core philosophy. Never introduce code that tracks keystroke sequences, exact timestamps, or sends data over the internet. All data must remain aggregated and locally stored.

    UI Consistency: Try to match the existing UI paradigms. The app should feel native, lightweight, and responsive.

Thank you for helping make Open Keyboard Heatmap better for everyone! 🚀
