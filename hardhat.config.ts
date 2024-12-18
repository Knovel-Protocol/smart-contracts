import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox-viem";
import "dotenv/config";
import "@nomiclabs/hardhat-ethers";

const config: HardhatUserConfig = {
  solidity: "0.8.27",

  networks: {
    sepolia: {
      url: `https://sepolia-rollup.arbitrum.io/rpc`,
      accounts: [process.env.PRIVATE_KEY ?? ''], 
      chainId: 421614

    },
    camp: {
      url: `https://rpc-campnetwork.xyz`,
      accounts: [process.env.PRIVATE_KEY ?? ''], 
      chainId: 325000
    }
  },
  etherscan: {
    apiKey: {
      arbitrumSepolia: process.env.ARBISCAN_API_KEY ?? '', // Replace with your Arbiscan API key
    },
  },
  sourcify: {
    enabled: true
  }
};

export default config;
