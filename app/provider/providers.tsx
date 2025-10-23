import { SafeWalletProvider } from "./SafeWalletProvider";
import { SafeTxProvider } from "./SafeTxProvider";
import { WagmiConfigProvider } from "./WagmiConfigProvider";
import { WalletConnectProvider } from "./WalletConnectProvider";
import WalletConnectRequestHandler from "../components/WalletConnectRequestHandler";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiConfigProvider>
      <SafeWalletProvider>
        <SafeTxProvider>
          <WalletConnectProvider>
            <WalletConnectRequestHandler />
            {children}
          </WalletConnectProvider>
        </SafeTxProvider>
      </SafeWalletProvider>
    </WagmiConfigProvider>
  );
}
