# Required Google OAuth Redirect URIs

Add these exact redirect URIs to your Google Cloud Console OAuth Client configuration:

## Redirect URIs for localhost development

```
http://localhost:5001/api/auth/google/callback
http://localhost:5001/api/gmail/callback
```

## Steps to add these URIs:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to "APIs & Services" > "Credentials"
4. Find your OAuth 2.0 Client ID (Web application) and click "Edit"
5. Under "Authorized redirect URIs", add both of the above URIs exactly as written
6. Click "Save"

## Verify Your Configuration

Ensure that:

1. Your OAuth consent screen has at least the following scopes:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
   - `https://mail.google.com/`

2. The Gmail API is enabled in your project

3. Your test user (your Google email) is added to the OAuth consent screen test users if your app is in "External" mode