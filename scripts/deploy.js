const hre = require("hardhat");

async function main() {
  const initialValue = 100;

  const simpleContract = await hre.ethers.deployContract("SimpleContract", [
    initialValue,
  ]);

  await simpleContract.waitForDeployment();

  console.log("SimpleContract deployed to:", simpleContract.target);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
