export const DEPLOYMENT_METADATA = Object.freeze({
  network: "Hyperliquid Testnet",
  chainId: 998,
  deploymentBlock: 62293050,
  deployer: "0x47C1D6b51B1f3d00f4D5e78B85486D4b7136eBE2",
  market: "YPF-PERP",
  underlying: "YPF",
  maxLeverage: "5x",
  totalCost: "0.00103711 ETH",
  gas: "1037110",
  averageGasPrice: "1 gwei",
  contracts: [
    {
      key: "ypfOracle",
      name: "YPFOracle",
      address: "0xb4daFE6f02F32b590da1758cCea04DE70F08555A",
      transaction: "0xcf22083edc1ea5927ea0598cb3e072e8dfecfdc761f402a036376562e902dc42",
    },
    {
      key: "kinetiqLaunchMock",
      name: "KinetiqLaunchMock",
      address: "0x6a48AC2826f0b252e5C1B60810326A370af5282F",
      transaction: "0x7d49b24ff551a82f887bbb657b1395b98481a861d73fdfda45a4d5cc158db687",
    },
  ],
  transactions: [
    {
      key: "ypfOracle",
      label: "YPFOracle deployment receipt",
      hash: "0xcf22083edc1ea5927ea0598cb3e072e8dfecfdc761f402a036376562e902dc42",
    },
    {
      key: "kinetiqLaunchMock",
      label: "KinetiqLaunchMock deployment receipt",
      hash: "0x7d49b24ff551a82f887bbb657b1395b98481a861d73fdfda45a4d5cc158db687",
    },
    {
      key: "marketDeploy",
      label: "YPF-PERP deployMarket call",
      hash: "0xf40bb65f0aeb21687dbb4998decb930c926c839cfeb2817c4722dc4c2e3b122",
    },
  ],
});
