# Setting Up Google Authentication

This guide will help you configure Google authentication correctly for the Gmail Categorizer application.

## 1. Set Up OAuth Credentials in Google Cloud Console

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Go to "APIs & Services" > "Credentials"
4. Click "Create Credentials" > "OAuth client ID"
5. Select "Web application" as the application type
6. Add a name for your OAuth client
7. Add authorized JavaScript origins:
   - `http://localhost:3000` (for development)
   - Your production frontend URL (if applicable)
8. Add authorized redirect URIs:
   - `http://localhost:5001/api/auth/google/callback` (for development)
   - Your production callback URL (if applicable)
9. Click "Create" and note your Client ID and Client Secret

## 2. Configure Environment Variables

### Backend (`.env` file)

Make sure your backend `.env` file includes:

```
# Google OAuth credentials
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/google-callback
GOOGLE_AUTH_REDIRECT_URI=http://localhost:5001/api/auth/google/callback

# URLs for redirects
FRONTEND_URL=http://localhost:3000
API_URL=http://localhost:5001
```

### Frontend (`.env` file)

Make sure your frontend `.env` file includes:

```
REACT_APP_API_URL=http://localhost:5001
REACT_APP_GOOGLE_AUTH_REDIRECT_PATH=/auth/callback
```

## 3. Verify Google API Access

1. Ensure you've enabled the "Gmail API" in the Google Cloud Console:
   - Go to "APIs & Services" > "Library"
   - Search for "Gmail API"
   - Click on it and press "Enable"

2. Make sure your OAuth consent screen is configured properly:
   - Go to "APIs & Services" > "OAuth consent screen"
   - Fill out required information
   - Add the necessary scopes:
     - `https://www.googleapis.com/auth/gmail.readonly`
     - `https://www.googleapis.com/auth/gmail.modify`
     - `https://www.googleapis.com/auth/userinfo.email`
     - `https://www.googleapis.com/auth/userinfo.profile`

## Troubleshooting

If you're experiencing authentication issues:

1. Check browser console for error messages
2. Verify that all environment variables are correctly set
3. Make sure your Google Cloud OAuth credentials have the correct redirect URIs
4. Ensure you've enabled the Gmail API in your Google Cloud project
5. Check that your application is requesting the correct scopes

### Common Errors

- "Google login failed": Check that your Client ID and Secret are correct in the backend .env file
- "No token received": The redirect URI might be misconfigured
- "Invalid redirect URI": Make sure the redirect URI in your Google Cloud Console matches exactly with what's in your code

## Testing the Authentication Flow

1. Start both frontend and backend servers
2. Go to the login page
3. Click "Sign in with Google"
4. You should be redirected to Google's login page
5. After logging in, you should be redirected back to your application's dashboard

If you encounter any errors, check the server logs for detailed error messages.