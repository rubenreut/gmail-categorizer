# Gmail Categorizer

An AI-powered email organization application that automatically categorizes your Gmail emails using natural language processing.

## Features

- Connect to Gmail with secure OAuth 2.0
- Automatically categorize emails using NLP
- Custom filters and categories
- Manual or automatic sync intervals
- Dark/light theme toggle
- Responsive web interface

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- MongoDB
- Google Cloud Console account

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/gmail-categorizer.git
   cd gmail-categorizer
   ```

2. Install dependencies for both frontend and backend:
   ```
   # Install backend dependencies
   cd backend
   npm install

   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

3. Set up environment variables:
   ```
   # In the backend directory
   cp .env.example .env
   ```
   
   Then edit the `.env` file with your MongoDB connection string and other variables.

### Setting up Google Cloud Credentials

For Gmail integration to work, you need to set up Google Cloud credentials:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable the Gmail API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Gmail API" and enable it
4. Create OAuth credentials:
   - Navigate to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application" type
   - Add authorized JavaScript origins: `http://localhost:5001`
   - Add authorized redirect URIs: `http://localhost:5001/api/gmail/callback`
   - Copy the generated client ID and secret
5. Configure OAuth consent screen:
   - Navigate to "APIs & Services" > "OAuth consent screen"
   - Choose "External" user type
   - Fill in the required fields (App name, User support email, Developer contact info)
   - Add the scope: `https://www.googleapis.com/auth/gmail.readonly`
   - Add test users (your Gmail address)

### Running the Application

1. Start the backend server:
   ```
   cd backend
   npm run dev
   ```

2. Start the frontend development server:
   ```
   cd frontend
   npm start
   ```

3. Access the application at `http://localhost:3000`

## Troubleshooting Gmail Integration

If you encounter issues with Gmail integration:

1. Verify your `.env` file has the correct credentials:
   ```
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:5001/api/gmail/callback
   ```

2. Check that your redirect URI exactly matches what's configured in Google Cloud Console

3. Make sure your OAuth consent screen is properly configured with the correct scope

4. Confirm that you've added your email as a test user in the OAuth consent screen settings

5. Clear cookies and try the authentication process again

## License

This project is licensed under the MIT License - see the LICENSE file for details.