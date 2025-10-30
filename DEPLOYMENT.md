# Deployment Guide

## IPFS Deployment via Pinata

This project automatically deploys to IPFS via Pinata when you create a new release or push a version tag.

### Setup Instructions

#### 1. Get Pinata API Credentials

1. Go to [Pinata.cloud](https://pinata.cloud) and create an account
2. Navigate to **API Keys** in your Pinata dashboard
3. Click **New Key**
4. Give it a name (e.g., "LocalSafe GitHub Actions")
5. Enable the following permissions:
   - `pinFileToIPFS`
   - `pinJSONToIPFS`
   - `unpin`
6. Copy the **API Key** and **API Secret**

#### 2. Add Secrets to GitHub

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add three secrets:
   - Name: `PINATA_API_KEY`
     - Value: Your Pinata API Key
   - Name: `PINATA_SECRET_KEY`
     - Value: Your Pinata API Secret
   - Name: `WALLETCONNECT_PROJECT_ID`
     - Value: Your WalletConnect Project ID (get one free at [WalletConnect Cloud](https://cloud.walletconnect.com/))

### How to Deploy

#### Option 1: Create a GitHub Release

1. Go to your repository on GitHub
2. Click **Releases** → **Create a new release**
3. Create a new tag (e.g., `v0.2.0`)
4. Fill in release title and description
5. Click **Publish release**

The GitHub Action will automatically:
- Build the static site
- Deploy to IPFS via Pinata
- Output the IPFS CID and gateway URL in the Actions logs

#### Option 2: Push a Version Tag

```bash
git tag v0.2.0
git push origin v0.2.0
```

#### Option 3: Manual Trigger

1. Go to your repository on GitHub
2. Click **Actions** → **Build and Deploy to IPFS**
3. Click **Run workflow** dropdown
4. Select the branch to deploy
5. Click **Run workflow**

This is useful for testing deployments or deploying without creating a release/tag.

### Accessing Your Deployment

After deployment, you can access your app via:

- **Pinata Gateway**: `https://gateway.pinata.cloud/ipfs/<CID>`
- **IPFS Gateway**: `https://ipfs.io/ipfs/<CID>`
- **Cloudflare IPFS Gateway**: `https://cloudflare-ipfs.com/ipfs/<CID>`

The CID (Content Identifier) will be displayed in the GitHub Actions logs.

### Workflow Details

- **Workflow file**: `.github/workflows/deploy-ipfs.yml`
- **Triggers**:
  - Release published
  - Tag push (v*)
  - Manual workflow dispatch
- **Build command**: `pnpm run build`
- **Output directory**: `./out`
- **Pin alias format**: `localsafe-<version>`

### Troubleshooting

- **Build fails**: Check that `pnpm run build` works locally
- **Pinata authentication fails**: Verify your API keys are correct in GitHub Secrets
- **Deployment succeeds but CID not displayed**: Check the Actions log output for the CID
- **WalletConnect error in deployed app**: Ensure `WALLETCONNECT_PROJECT_ID` secret is set in GitHub Secrets
