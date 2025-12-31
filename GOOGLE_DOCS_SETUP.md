# Google Docs Import Setup

This guide explains how to set up Google Docs API integration for importing trivia questions directly from Google Docs.

## Prerequisites

1. A Google Cloud Platform (GCP) account
2. A GCP project with the Google Docs API enabled

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your project ID

## Step 2: Enable Google Docs API

1. In the GCP Console, navigate to **APIs & Services** > **Library**
2. Search for "Google Docs API"
3. Click on it and click **Enable**

## Step 3: Create OAuth 2.0 Credentials

1. Navigate to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. If prompted, configure the OAuth consent screen:
   - Choose **External** (unless you have a Google Workspace)
   - Fill in the required fields (App name, User support email, Developer contact)
   - Add scopes:
     - `https://www.googleapis.com/auth/documents.readonly`
     - `https://www.googleapis.com/auth/userinfo.email`
     - `https://www.googleapis.com/auth/userinfo.profile`
   - Add test users (your email) if in testing mode
   - Save and continue
4. For Application type, select **Web application**
5. Add Authorized redirect URIs:
   - `http://localhost:3000/api/google/callback` (for local development)
   - `https://your-domain.com/api/google/callback` (for production)
6. Click **Create**
7. Copy the **Client ID** and **Client Secret**

## Step 4: Configure Environment Variables

Add these to your `.env.local` file (or Railway environment variables):

```env
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=https://your-domain.com/api/google/callback
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

For local development:
```env
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## Step 5: Document Format Requirements

Google Docs should be formatted in one of these ways:

### Option 1: Tables (Recommended)
Create a table with headers in the first row:
- Question | Answer | Topics | Explanation | etc.

### Option 2: Q&A Format
Format questions like:
```
Q1: What is the capital of France?
A1: Paris

Q2: Who wrote Romeo and Juliet?
A2: William Shakespeare
```

## Usage

1. Navigate to `/import/google` in your application
2. Click "Sign in with Google" and authorize access
3. Paste your Google Docs URL or document ID
4. Click "Fetch Document"
5. Review the parsed data
6. Click "Import" to add questions to your database

## Troubleshooting

### "Invalid credentials" error
- Check that your environment variables are set correctly
- Verify the redirect URI matches exactly in GCP Console

### "Access denied" error
- Make sure you've added yourself as a test user in OAuth consent screen
- Check that the Google Docs API is enabled

### "No data found" error
- Ensure your document contains tables or Q&A formatted content
- Check that the document is shared with the Google account you authenticated with

### Token expiration
- Tokens are stored in sessionStorage and will expire
- Re-authenticate if you see authentication errors

## Security Notes

- Never commit your `GOOGLE_CLIENT_SECRET` to version control
- Use environment variables for all sensitive credentials
- Consider implementing token refresh for production use
- In production, use secure cookies or server-side sessions instead of URL parameters for tokens

