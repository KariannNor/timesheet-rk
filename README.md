# Timesheet Tracker

A React TypeScript application for tracking consultant hours and costs for prosjects.

## Features

- Track consultant time entries with descriptions
- Separate billing for project management hours
- Monthly budget tracking (200 hours/month)
- Export to Excel/CSV format
- View single month or multiple months
- Cost calculations with Norwegian formatting

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Lucide React (icons)

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Project Structure

```
src/
├── components/
│   └── TimesheetTracker.tsx    # Main application component
├── App.tsx                     # App wrapper
├── main.tsx                    # Entry point
└── index.css                   # Tailwind imports
```

## Usage

1. Select viewing mode (single month or multiple months)
2. Choose month(s) to view
3. Add time entries with consultant, date, hours, and description
4. View statistics and export data to Excel/CSV
