const {expect} = require("chai");
const {ethers} = require("hardhat");

async function deployICO_TokenListing(
  TOKEN_Name,
  TOKEN_Symbol,
  TOKEN_TotalSupply,
  _TOKEN_InitialOwner,
  _ProjectID,
  _tokenPrice
) {
  const deployICO_TokenListing_Contract = await hre.ethers.deployContract(
    "ICO_TokenListing",
    [
      TOKEN_Name,
      TOKEN_Symbol,
      TOKEN_TotalSupply,
      _TOKEN_InitialOwner,
      _ProjectID,
      _tokenPrice,
    ]
  );

  await deployICO_TokenListing_Contract.waitForDeployment();

  return deployICO_TokenListing_Contract;
}

describe("ICO_TokenListing : Main", function () {
  let ICO_TokenListing_Contract;
  let ICO_TokenListing_Owner;
  let userAddress1;
  let userAddress2;

  const testToken = {
    TOKEN_Name: "testToken",
    TOKEN_Symbol: "TTK",
    TOKEN_TotalSupply: 100, //100 in Number
    _ProjectID: 0,
    _tokenPriceInWei: 1000000000000, //0.000001 Ether
  };

  beforeEach(async function () {
    [ICO_TokenListing_Owner, userAddress1, userAddress2] =
      await ethers.getSigners();

    ICO_TokenListing_Contract = await deployICO_TokenListing(
      testToken.TOKEN_Name,
      testToken.TOKEN_Symbol,
      testToken.TOKEN_TotalSupply,
      ICO_TokenListing_Owner,
      testToken._ProjectID,
      testToken._tokenPriceInWei
    );
  });

  it("Should return the correct name and symbol", async function () {
    expect(await ICO_TokenListing_Contract.name()).to.equal(
      testToken.TOKEN_Name
    );
    expect(await ICO_TokenListing_Contract.symbol()).to.equal(
      testToken.TOKEN_Symbol
    );
  });

  it("Should update token price by owner", async function () {
    const newTokenPrice = ethers.parseEther("0.002");
    await ICO_TokenListing_Contract.connect(
      ICO_TokenListing_Owner
    ).updateTokenPrice(newTokenPrice);

    expect(await ICO_TokenListing_Contract.tokenPrice()).to.equal(
      newTokenPrice
    );
  });

  it("Should restrict token price updation by a non-owner", async function () {
    const newTokenPrice = ethers.parseEther("0.002");
    await expect(
      ICO_TokenListing_Contract.connect(userAddress1).updateTokenPrice(
        newTokenPrice
      )
    ).to.be.revertedWith("Only the initial owner can call this function");
  });

  describe("ICO_TokenListing : Token Management", function () {
    it("Should allow buying tokens & checking balances after token trasfer", async function () {
      const initialBalanceOwner = await ethers.provider.getBalance(
        ICO_TokenListing_Owner
      );
      // console.log("initialBalanceOwner", ethers.formatEther(initialBalanceOwner));

      const initialBalanceAddr1 = await ethers.provider.getBalance(
        userAddress1
      );
      // console.log("initialBalanceAddr1", ethers.formatEther(initialBalanceAddr1));

      const tokensToBuy = 10;

      const totalBuyingAmountInWei = tokensToBuy * testToken._tokenPriceInWei;
      // console.log(
      //   "totalBuyingAmount",
      //   ethers.formatEther(totalBuyingAmountInWei)
      // );

      // Send the transaction
      await ICO_TokenListing_Contract.connect(userAddress1).buyTokens(
        tokensToBuy,
        {
          value: totalBuyingAmountInWei,
        }
      );

      await expect(
        await ICO_TokenListing_Contract.balanceOf(ICO_TokenListing_Owner)
      ).to.equal(testToken.TOKEN_TotalSupply - tokensToBuy);

      await expect(
        await ICO_TokenListing_Contract.balanceOf(userAddress1)
      ).to.equal(tokensToBuy);
    });
  });

  describe("ICO_TokenListing : Transaction Management", function () {
    it("Contract balance should be initially 0", async function () {
      const contractBalance =
        await ICO_TokenListing_Contract.getContractBalance();
      expect(contractBalance).to.equal(0);
    });

    it("Contract balance should update after making a transfer", async function () {
      const initialContractBalance =
        await ICO_TokenListing_Contract.getContractBalance();

      const tokensToBuy = 10;

      const totalBuyingAmountInWei = tokensToBuy * testToken._tokenPriceInWei;

      // Send the transaction
      expect(
        await ICO_TokenListing_Contract.connect(userAddress1).buyTokens(
          tokensToBuy,
          {
            value: totalBuyingAmountInWei,
          }
        )
      ).to.changeEtherBalance(
        ICO_TokenListing_Contract,
        -ethers.formatEther(totalBuyingAmountInWei)
      );
    });

    it("Transactions should be 0 initially", async function () {
      const allTransactions =
        await ICO_TokenListing_Contract.getAllTransactions();
      expect(allTransactions.length).to.equal(0);
    });

    it("Should display transfer details after making one transfer", async function () {
      const tokensToBuy = 10;
      const totalBuyingAmountInWei = tokensToBuy * testToken._tokenPriceInWei;

      // Make a transaction by buying tokens
      await ICO_TokenListing_Contract.connect(userAddress1).buyTokens(
        tokensToBuy,
        {
          value: totalBuyingAmountInWei,
        }
      );

      // Retrieve transaction details
      const allTransactions =
        await ICO_TokenListing_Contract.getAllTransactions();

      expect(allTransactions.length).to.equal(1);
      const transaction = allTransactions[0];
      expect(transaction.to).to.equal(userAddress1);
      expect(transaction.amount).to.equal(tokensToBuy);
    });
  });
});
