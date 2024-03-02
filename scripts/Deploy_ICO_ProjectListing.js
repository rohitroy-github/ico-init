const hre = require("hardhat");

async function main() {
  console.log("Deploying contract \u23F3");

  const ICO_ProjectListing_Contract = await hre.ethers.deployContract(
    "ICO_ProjectListing"
  );

  await ICO_ProjectListing_Contract.waitForDeployment();

  console.log("Contract deployed successfully \u2705");

  console.log(`Contract address : ${ICO_ProjectListing_Contract.target}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

// npx hardhat run --network localhost .\scripts\Deploy_ICO_ProjectListing.js
