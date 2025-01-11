import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying PublicRegistry contract with the account:", deployer.address);

  const PublishRegistry = await ethers.getContractFactory("PublishRegistry");
  const publishRegistry = await PublishRegistry.deploy();

  await publishRegistry.deployed();

  console.log(`PublishRegistry deployed to: ${publishRegistry.address}`);

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
  console.error(error);
  process.exit(1);
});