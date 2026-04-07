# RiteDoc

A desktop document application built with Tauri 2.0, React, and TypeScript.

## Tech Stack

- **Desktop Framework:** Tauri 2.0 (Rust backend)
- **Frontend:** React 19 + TypeScript
- **Build Tool:** Vite
- **Database:** SQLite (via rusqlite)

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/)
- [Rust](https://www.rust-lang.org/tools/install) (stable)
- System dependencies for Tauri: see [Tauri Prerequisites](https://tauri.app/start/prerequisites/)

## Getting Started

### Install dependencies

```bash
pnpm install
```

### Run in development mode

```bash
pnpm tauri dev
```

### Build for production

```bash
pnpm tauri build
```

## Project Structure

```
ritedoc/
├── src/                    # React frontend source
│   ├── App.tsx             # Main application component
│   ├── App.css             # Application styles
│   ├── index.css           # Global styles
│   └── main.tsx            # React entry point
├── src-tauri/              # Tauri / Rust backend
│   ├── src/
│   │   ├── main.rs         # Rust entry point
│   │   └── lib.rs          # Application logic & Tauri commands
│   ├── capabilities/       # Tauri permission capabilities
│   ├── icons/              # Application icons
│   ├── Cargo.toml          # Rust dependencies
│   └── tauri.conf.json     # Tauri configuration
├── public/                 # Static assets
├── index.html              # HTML entry point
├── package.json            # Node.js dependencies & scripts
├── vite.config.ts          # Vite configuration
└── tsconfig.json           # TypeScript configuration
```

## License

Private
