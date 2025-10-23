# Udhari Kitab - Frontend

Frontend application for Udhari Kitab, a modern expense tracking and splitting application built with React.

## Features

- 👥 **User Authentication** - Secure login and registration
- 💰 **Expense Management** - Create, edit, and delete expenses with multiple participants
- 📊 **Balance Tracking** - Real-time balance calculations with friends
- 🤝 **Friend System** - Add friends and manage relationships
- 💸 **Settlement** - Record payments and settle balances
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile
- 🌓 **Dark Mode** - Built-in dark theme support
- 📸 **Profile Pictures** - Upload and manage profile pictures via Cloudinary
- 🔔 **Activity Feed** - Track all expense and transaction activities

## Tech Stack

- **React 19** - UI framework
- **React Router** - Navigation and routing
- **Axios** - HTTP client
- **Tailwind CSS** - Styling
- **Vite** - Build tool and dev server
- **Lucide React** - Icons
- **React Toastify** - Toast notifications
- **Day.js** - Date formatting

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Backend API running (see backend README)

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/SammyUrfen/Udhari-Kitap-frontend.git
cd Udhari-Kitap-frontend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Update the `.env` file with your backend API URL:

```env
VITE_API_URL=http://localhost:5000
```

### 4. Run the development server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/          # Reusable components
│   ├── auth/           # Authentication components
│   └── layout/         # Layout components (Navbar, etc.)
├── context/            # React context providers
│   ├── AuthContext.jsx # Authentication state
│   └── ThemeContext.jsx # Theme (dark/light mode)
├── pages/              # Page components
│   ├── auth/          # Login, Register
│   ├── dashboard/     # Dashboard/Home
│   ├── expenses/      # Expense management
│   ├── friends/       # Friends list and management
│   └── profile/       # User profile
├── services/          # API service modules
│   ├── api.js        # Axios configuration
│   ├── auth.js       # Authentication API
│   ├── expenses.js   # Expenses API
│   ├── friends.js    # Friends API
│   ├── transactions.js # Transactions API
│   ├── balances.js   # Balance calculations API
│   └── activities.js # Activity feed API
├── utils/            # Utility functions
│   ├── currency.js   # Currency formatting
│   ├── date.js       # Date formatting
│   └── splitCalculations.js # Split logic
├── styles/          # Global styles
└── App.jsx          # Main app component
```

## Key Features Implementation

### Split Methods
- **Equal Split** - Divide expense equally among participants
- **Unequal Split** - Specify custom amounts for each participant
- **Percentage Split** - Assign percentages to participants

### Balance Warnings
- Warns when deleting expenses that affect settled balances
- Shows detailed information about affected users

### Activity Tracking
- Tracks expense creation, updates, and deletions
- Records transaction settlements
- Shows restore actions for deleted expenses

### Profile Management
- Upload profile pictures via Cloudinary
- Update name and email
- View and manage account settings

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL | `http://localhost:5000` |

## Building for Production

```bash
npm run build
```

The build output will be in the `dist/` directory, ready to be deployed to any static hosting service.

## Deployment

The frontend can be deployed to:
- Vercel
- Netlify

Make sure to set the `VITE_API_URL` environment variable to your production backend URL.

## License

MIT License - see the LICENSE file for details
