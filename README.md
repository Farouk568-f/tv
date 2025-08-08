# CineStream TV

A modern TV streaming application built with React, TypeScript, and Vite.

## Features

- Modern TV-optimized interface
- Video streaming with HLS.js
- Responsive design
- Arabic language support
- TV navigation with cursor support

## Tech Stack

- React 19
- TypeScript
- Vite
- React Router DOM
- HLS.js
- Tailwind CSS

## Getting Started

### Prerequisites

- Node.js (version 18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Farouk568-f/tv.git
cd tv
```

2. Install dependencies:
```bash
npm install
```

3. Create environment variables:
```bash
cp .env.example .env.local
```

4. Add your Gemini API key to `.env.local`:
```
GEMINI_API_KEY=your_api_key_here
```

5. Start the development server:
```bash
npm run dev
```

## Deployment to Vercel

### Method 1: Using Vercel CLI (Recommended)

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy from your project directory:
```bash
vercel
```

4. Follow the prompts to configure your project.

### Method 2: Using Vercel Dashboard

1. Push your code to GitHub:
```bash
git add .
git commit -m "Initial commit"
git push -u origin main
```

2. Go to [Vercel Dashboard](https://vercel.com/dashboard)

3. Click "New Project"

4. Import your GitHub repository

5. Configure the project:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

6. Add environment variables:
   - Go to Project Settings > Environment Variables
   - Add `GEMINI_API_KEY` with your API key

7. Deploy!

### Environment Variables

Make sure to set the following environment variables in Vercel:

- `GEMINI_API_KEY`: Your Google Gemini API key

## Project Structure

```
├── components/          # React components
├── contexts/           # React contexts
├── pages/              # Page components
├── services/           # API services
├── types.ts           # TypeScript types
├── constants.ts       # App constants
├── translations.ts    # Language translations
└── vite.config.ts     # Vite configuration
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.
