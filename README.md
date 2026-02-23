**OFLC Wage Map**
An interactive choropleth map for exploring U.S. Department of Labor (OFLC) prevailing wage data for H-1B, H-1B1, and E-3 visas. Built with React, MapLibre GL, and Vite, this tool empowers tech workers and employers to geographically visualize wage requirements across all 3,000+ U.S. counties.

Compare specific SOC (Standard Occupational Classification) codes against county-level data, or enter a personal salary to instantly determine what H-1B wage tier (Level I - IV) it legally qualifies for in any given region.

## Features

- 🗺️ **Interactive Choropleth Maps**: Dynamic color scaling across 3,000+ U.S. counties based on real OFLC prevailing wage data.
- 💵 **Personal Salary Tier Comparison**: Input your salary and the map dynamically repaints to show exactly which H-1B wage tier you qualify for—and mathematically calculates exactly how short you are from the next tier up.
- 🔗 **Shareable Deep Linking**: The entire application state (Exact Occupation, Wage Level, Personal Salary, Map Coordinates, and Zoom Level) silently syncs into the URL. Copy and paste specific views to friends and colleagues.
- 🌙 **"Linear" Dark Mode UI**: A highly polished, developer-friendly dark aesthetic featuring glassmorphic panel overlays, tactile button feedback, and refined typography.
- 📍 **Native Geolocation & Map Controls**: Tactile vector zoom controls and an HTML5 'Locate Me' geo-jump let you instantly view wages in your local neighborhood.
- ⚡ **Deploy-Ready Architecture**: Client-side geographic rendering via MapLibre GL and Vite, powered by instantly-distributable Vercel Next.js/Vite serverless functions inside `/api`.

## Local Development

1. Install dependencies:
\`\`\`bash
npm install
\`\`\`

2. Start the local Vite development server:
\`\`\`bash
npm run dev
\`\`\`

3. Build for production:
\`\`\`bash
npm run build
\`\`\`
