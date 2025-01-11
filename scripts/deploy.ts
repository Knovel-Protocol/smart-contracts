import hre from "hardhat";

async function main() {

  const [deployerWalletClient] = await hre.viem.getWalletClients();
  console.log("Deploying contract with address:", deployerWalletClient.account.address);

  const publishContract = await hre.viem.deployContract("PublishRegistry");
  console.log("Deployed to:", publishContract.address);

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
  console.error(error);
  process.exit(1);
});