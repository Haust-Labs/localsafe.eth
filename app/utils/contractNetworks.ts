// contractNetworks.ts: Dynamic and local Safe contract addresses for ProtocolKit
import {
  getSafeSingletonDeployment,
  getProxyFactoryDeployment,
  getFallbackHandlerDeployment,
  getMultiSendDeployment,
  getMultiSendCallOnlyDeployment,
  getSignMessageLibDeployment,
  getCreateCallDeployment,
  getSimulateTxAccessorDeployment,
  getTokenCallbackHandlerDeployment,
} from "@safe-global/safe-deployments";

// Local config for dev (Anvil/Hardhat)
const localContractNetworks = {
  31337: {
    safeSingletonAddress: "0x41675C099F32341bf84BFc5382aF534df5C7461a",
    safeProxyFactoryAddress: "0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67",
    multiSendAddress: "0x38869bf66a61cF6bDB996A6aE40D5853Fd43B526",
    multiSendCallOnlyAddress: "0x9641d764fc13c8B624c04430C7356C1C7C8102e2",
    fallbackHandlerAddress: "0xfd0732Dc9E303f09fCEf3a7388Ad10A83459Ec99",
    signMessageLibAddress: "0xd53cd0aB83D845Ac265BE939c57F53AD838012c9",
    createCallAddress: "0x9b35Af71d77eaf8d7e40252370304687390A1A52",
    simulateTxAccessorAddress: "0x3d4BA2E0884aa488718476ca2FB8Efc291A46199",
    tokenCallbackHandlerAddress: "0xeDCF620325E82e3B9836eaaeFdc4283E99Dd7562",
    safeToL2SetupAddress: "0xBD89A1CE4DDe368FFAB0eC35506eEcE0b1fFdc54",
    safeL2Address: "0x29fcB43b46531BcA003ddC8FCB67FFE91900C762",
    safeToL2MigrationAddress: "0xfF83F6335d8930cBad1c0D439A841f01888D9f69",
    safeMigrationAddress: "0x526643F69b81B008F46d95CD5ced5eC0edFFDaC6",
    // Add any other required addresses here
  },
  // Haust Mainnet (Chain ID: 3864)
  3864: {
    safeSingletonAddress: "0x8dBD3A49Fa6f53BBd082aa99d91c8ADeFbA8E7E7",
    safeProxyFactoryAddress: "0x38E8Acc939923dEac6162Ac174b9683bbE4Dc945",
    multiSendAddress: "0x7B21BBDBdE8D01Df591fdc2dc0bE9956Dde1e16C",
    multiSendCallOnlyAddress: "0x32228dDEA8b9A2bd7f2d71A958fF241D79ca5eEC",
    fallbackHandlerAddress: "0xcB4a8d3609A7CCa2D9c063a742f75c899BF2f7b5",
    signMessageLibAddress: "0x309C7b0A0D2f250Be322739753386911E1187C4E",
    createCallAddress: "0x8BbCaE989A0Bdf15c8E783357a0E5848e36233d0",
    simulateTxAccessorAddress: "0xB59bD9861a97F9c309B7b73338503507580625D2",
    tokenCallbackHandlerAddress: "0x63117fd9761850f4aC685457E484A01D752D5cC4",
  },
};

// Helper to build contractNetworks for selected chainIds and Safe version
export type ContractAddresses = {
  safeSingletonAddress?: string;
  safeProxyFactoryAddress?: string;
  fallbackHandlerAddress?: string;
  multiSendAddress?: string;
  multiSendCallOnlyAddress?: string;
  signMessageLibAddress?: string;
  createCallAddress?: string;
  simulateTxAccessorAddress?: string;
  tokenCallbackHandlerAddress?: string;
  // Add more if needed
};

export type ContractNetworks = {
  [chainId: string]: ContractAddresses;
};

export async function buildContractNetworks(
  chainIds: number[],
  safeVersion = "1.4.1",
): Promise<ContractNetworks> {
  const contractNetworks: ContractNetworks = {};
  for (const chainId of chainIds) {
    // Check if it's a local/custom network first
    if (localContractNetworks[chainId as keyof typeof localContractNetworks]) {
      contractNetworks[chainId] =
        localContractNetworks[chainId as keyof typeof localContractNetworks];
      continue;
    }
    try {
      const singleton = getSafeSingletonDeployment({
        network: chainId.toString(),
        version: safeVersion,
      });
      const proxyFactory = getProxyFactoryDeployment({
        network: chainId.toString(),
        version: safeVersion,
      });
      const fallbackHandler = getFallbackHandlerDeployment({
        network: chainId.toString(),
        version: safeVersion,
      });
      const multiSend = getMultiSendDeployment({ network: chainId.toString() });
      const multiSendCallOnly = getMultiSendCallOnlyDeployment({
        network: chainId.toString(),
      });
      const signMessageLib = getSignMessageLibDeployment({
        network: chainId.toString(),
      });
      const createCall = getCreateCallDeployment({
        network: chainId.toString(),
      });
      const simulateTxAccessor = getSimulateTxAccessorDeployment({
        network: chainId.toString(),
      });
      const tokenCallbackHandler = getTokenCallbackHandlerDeployment({
        network: chainId.toString(),
      });

      contractNetworks[chainId] = {
        safeSingletonAddress: singleton?.defaultAddress,
        safeProxyFactoryAddress: proxyFactory?.defaultAddress,
        fallbackHandlerAddress: fallbackHandler?.defaultAddress,
        multiSendAddress: multiSend?.defaultAddress,
        multiSendCallOnlyAddress: multiSendCallOnly?.defaultAddress,
        signMessageLibAddress: signMessageLib?.defaultAddress,
        createCallAddress: createCall?.defaultAddress,
        simulateTxAccessorAddress: simulateTxAccessor?.defaultAddress,
        tokenCallbackHandlerAddress: tokenCallbackHandler?.defaultAddress,
      };
    } catch {
      // If Safe 1.4.1 is not available, display error and skip this chain
      // TODO: In future, support dynamic Safe version fallback
      console.error(
        `Safe contracts for version 1.4.1 not found on chain ${chainId}. Skipping.`,
      );
      continue;
    }
  }
  return contractNetworks;
}
