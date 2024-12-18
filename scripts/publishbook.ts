const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  // The proxy contract address
  const proxyAddress = "0xd1e8d20c5459cfe5ad04befb6513b5b2345b64b2";

  // The PublishRegistry contract address (implementation contract)
  const publishRegistryAddress = "0xed73426a4ce8e66d39c6646624b6e8eecd018082";

  // Connect to the proxy contract as if it's the implementation
  const proxy = await hre.ethers.getContractAt("PublishRegistry", proxyAddress);

  // Example to call the publishBook function through the proxy
  const title = "Testing";
  const author = "Abigail Cameron";
  const ipfsHash = "QmExampleHash123";
  const price = 0;

  // Call publishBook function
  const tx = await proxy.publishBook(title, author, ipfsHash, price);
  await tx.wait();
  console.log("Book published!", tx);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});