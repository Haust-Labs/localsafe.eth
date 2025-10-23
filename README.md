# localsafe.eth

> **Disclaimer**: Bear in mind this is still a project in early development. It still needs further testing and polishing. Feedback and contributions are welcome!

A 100% local web interface for managing multisignature wallets inspired by SafeWallet and EternalSafeWallet. No worrying about the SafeAPI being compromised... Run an instance yourself!

- [localsafe.eth](#localsafeeth)
  - [Features](#features)
  - [Tech Stack:](#tech-stack)
  - [Quickstart](#quickstart)
    - [Requirements](#requirements)
    - [Running the dev server](#running-the-dev-server)
    - [Running E2E Tests](#running-e2e-tests)
    - [Run localsafe.eth with Production Build](#run-localsafeeth-with-production-build)
    - [Anvil State Management: --dump-state \& --load-state](#anvil-state-management---dump-state----load-state)
    - [Example: Test Runner Script](#example-test-runner-script)
    - [Example: Playwright Test (export)](#example-playwright-test-export)
  - [Developer Notes](#developer-notes)
  - [Deploying Safe Contracts Locally with `safe-smart-account`](#deploying-safe-contracts-locally-with-safe-smart-account)
  - [TODO](#todo)
  - [References](#references)
  - [Contributors](#contributors)

## Features

- **Safe Account Dashboard**: View Safe details, owners, threshold, nonce, and balance.
- **Transaction Workflow**: Create, import, export, and execute Safe transactions.
- **SafeWallet Data Import/Export**: Backup and restore address book, visited accounts, and undeployed safes.
- **Modal Interactions**: Deployment, broadcast, error, and import/export modals.
- **Wallet Connection**: MetaMask and RainbowKit integration.
- **Client-Side State**: All wallet and transaction logic is handled client-side using wagmi, RainbowKit, and Safe Protocol Kit.

## Tech Stack:

- **Next.js**: React framework for server-side rendering and static site generation.
- **TypeScript**: Superset of JavaScript for type safety.
- **Tailwind CSS & DaisyUI**: Utility-first CSS framework and component library for styling.
- **wagmi & RainbowKit**: React hooks and components for Ethereum wallet management.
- **Safe Protocol Kit**: SDK for interacting with Safe contracts.
- **Synpress & Playwright**: E2E testing with MetaMask automation and browser control.
- **Foundry & Anvil**: Smart contract development and local Ethereum node for testing.

## Quickstart

### Requirements

- Node.js v18+
- pnpm
- Anvil (for E2E tests)

### Running the dev server

1. Install [pnpm](https://pnpm.io/installation).

2. Clone the repository and install dependencies:

```bash
  git clone https://github.com/cyfrin/localsafe.eth
  cd localsafe.eth
  pnpm install
```

3. Create a `.env` file in the root (take `.env.example` as a reference):

```ini
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
```

4. Start the development server:

```bash
  pnpm dev
```

5. Open your browser and navigate to `http://localhost:3000`.

### Running E2E Tests

1. Ensure you have [Anvil](https://getfoundry.sh/) installed and updated.

2. You follow the steps above to clone the repo, install dependencies, and create a `.env` file.

3. We need to install Playwright dependencies for E2E tests:

```bash
  pnpm exec playwright install --with-deps
```

4. Execute synpress once to set up its cache:

```bash
  pnpm run synpress:build # it runs anvil in the background
  # pnpm exec synpress -- you can can run it by itself too
```

_Note: you may need to start anvil in another terminal with `anvil` if you see errors about MetaMask not being able to connect to the network. After completion you can close it._

5. To run the E2E tests in headless mode (default):

```bash
  pnpm run test:e2e
```

_Note: there is a utility command `pnpm run test:clean` to clean up any wild processes (next-server, anvil) that may remain running in the background._

- Tests are written using Synpress (MetaMask automation) and Playwright.
- Test scripts are located in `tests/` and cover Safe account creation, dashboard, wallet import/export, and transaction workflows.
- The test runner script (`tests/scripts/start-anvil-and-test.sh`) starts Anvil, runs Synpress, and then Playwright tests.
- UI-based tests in the devcontainer are a work in progress; headed mode may not display correctly due to Xvfb/browser limitations.But headless tests should work fine.

### Run localsafe.eth with Production Build

To run the app with a production build locally and run the optimized version:

```bash
  pnpm run localsafe
```

### Anvil State Management: --dump-state & --load-state

To ensure deterministic E2E tests, we use Anvil’s state management:

- After setting up contracts and accounts, run:
  ```sh
  anvil --dump-state ./anvil-safe-state.json
  ```
  This creates a snapshot of the chain state in `anvil-safe-state.json`.
- For all test runs, start Anvil with:
  ```sh
  anvil --load-state ./anvil-safe-state.json --block-time 1
  ```
  This restores the chain to the known state for reproducible tests.
- The test runner script and package.json use this approach:
  ```json
  "anvil": "anvil --load-state ./anvil-safe-state.json --block-time 1",
  "test:e2e": "bash tests/scripts/start-anvil-and-test.sh"
  ```

### Example: Test Runner Script

```bash
echo "[E2E] Running E2E tests with Anvil"
#!/bin/bash
set -e

# Run E2E tests (Synpress and Playwright)
USE_XVFB=1
ARGS=()
for arg in "$@"; do
  if [ "$arg" == "--ui" ]; then
    USE_XVFB=0
  fi
  ARGS+=("$arg")
done

if [ "$USE_XVFB" -eq 1 ]; then
  echo "[E2E] Running in headless mode (xvfb)"
  echo "[E2E] Starting Anvil in the background..."
  echo ""
  # Start Anvil in the background
  anvil --load-state ./anvil-safe-state.json --block-time 1 > /dev/null 2>&1 &
  ANVIL_PID=$!

  trap "kill $ANVIL_PID" EXIT
  xvfb-run --auto-servernum pnpm exec synpress
  xvfb-run --auto-servernum pnpm exec playwright test "${ARGS[@]}"
else
  # You need to run anvil manually in another terminal if using --ui
  # useful if you need to restart anvil without restarting tests
  echo "[E2E] Running in UI mode (--ui)"
  echo "[E2E] Ensure Anvil is running in another terminal:"
  echo "      pnpm run anvil"
  echo ""
  pnpm exec synpress
  pnpm exec playwright test "${ARGS[@]}"
fi

```

### Example: Playwright Test (export)

```typescript
const exportBtn = page.locator('[data-testid="safe-dashboard-export-tx-btn"]');
await exportBtn.waitFor({ state: "visible" });
// Instead of waiting for download, use page.evaluate to get the exported JSON
const exportedJson = await page.evaluate(() => {
  // Expose exportTx to window for testing, or call directly if possible
  return window.exportTx && window.exportTx(window.safeAddress);
});
expect(exportedJson).toContain("expected data");
```

## Developer Notes

- All wallet and Safe logic is handled client-side for maximum privacy and flexibility.
- The project structure is modular, with reusable components and hooks.
- E2E tests require manual cache management when switching environments.
- For local contract deployment, see the instructions below.
- Ensure `.cache-synpress` is built for the environment you are using (devcontainer vs local). Else you may face issues with Synpress not finding MetaMask extension. Please refresh the cache by running `pnpm exec synpress --force` again if you switch environments.
- Sometimes some `next-server` and `anvil` processes may remain running in the background. Please kill them if you face weird issues.

## Deploying Safe Contracts Locally with `safe-smart-account`

To run your own local Safe contracts for development, follow these steps:

1. **Clone the Repository**
   ```sh
   git clone https://github.com/safe-global/safe-smart-account.git
   cd safe-smart-account
   ```
2. **Checkout the Correct Version**
   ```sh
   git checkout tags/v1.4.1-3
   ```
3. **Install Dependencies and Build**
   ```sh
   npm install
   npm run build
   ```
4. **Start a Local Anvil Node**
   ```sh
   anvil
   ```
5. **Create a `.env` File**
   ```ini
   MNEMONIC="test test test test test test test test test test test junk"
   NODE_URL="http://127.0.0.1:8545"
   ```
6. **Deploy Contracts**
   ```sh
   npx hardhat --network custom deploy
   ```
7. **Update Contract Addresses**
   - After deployment, copy the contract addresses from the output and update them in your project’s `localContractNetworks.ts` file.

> **Note:**
> Currently, contract addresses are manually maintained in `localContractNetworks.ts`. In the future, we may automate this process or use environment variables for better flexibility.

## TODO

- [ ] Improve devcontainer setup for E2E tests; currently, UI mode has limitations.
- [ ] Ensure smooth DX when switching between local and devcontainer environments and wild processes cleaning (next-server, anvil).
- [ ] Adapted for SafeWallet@1.4.1-3 contracts; need to adapt to any versions.
- [ ] Automate `version` value in `DEFAULT_SAFE_WALLET_DATA` constant (`app/utils/constants.ts` hardcoded to `3.0.0` now).
- [ ] Ensure responsiveness of UI on every screen size.
- [ ] Optimize reactivity from first batch of code.
- [ ] Add more detailed error handling and user feedback (tooltips, notifications).
- [ ] Add more comments and documentation in code.
- [ ] Tests with other wallets like WalletConnect, Coinbase Wallet, Phantom, etc.
- [ ] Improve E2E test reliability and coverage.

## References

- [SafeSDK: Protocol Kit](https://docs.safe.global/sdk/protocol-kit)
- [wagmi](https://wagmi.sh/)
- [RainbowKit](https://www.rainbowkit.com/)
- [Synpress](https://docs.synpress.io/)
- [Playwright](https://playwright.dev/)
- [Foundry](https://getfoundry.sh/)
- [Tailwind CSS](https://tailwindcss.com/)
- [DaisyUI](https://daisyui.com/)

## Contributors

Special thanks to all contributors!

<a href="https://github.com/cyfrin/localsafe.eth/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=cyfrin/localsafe.eth" />
</a>
