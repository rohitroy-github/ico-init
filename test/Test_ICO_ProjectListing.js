const {expect} = require("chai");
const {ethers} = require("hardhat");

async function deployICO_ProjectListing() {
  const ICO_ProjectListing_Contract = await hre.ethers.deployContract(
    "ICO_ProjectListing"
  );

  await ICO_ProjectListing_Contract.waitForDeployment();

  return ICO_ProjectListing_Contract;
}

function listNewProject(
  contract,
  account,
  name,
  description,
  openingDate,
  closingDate
) {
  const listingFee = ethers.parseEther("0.1");

  const contractPayableValue = {
    value: listingFee,
  };

  return contract
    .connect(account)
    .listNewProject(
      name,
      description,
      openingDate,
      closingDate,
      contractPayableValue
    );
}

describe("ICO_ProjectListing : Main", function () {
  let ICO_ProjectListing_Contract;

  let ICO_ProjectListing_Owner;
  let userAddress1;
  let userAddress2;

  let newlyListedProject;
  let newlyListedToken;

  const testProject1 = {
    name: "testProject1",
    description: "testProject1 desciption",
    openingDate: Math.floor(Date.now() / 1000),
    closingDate: Math.floor(Date.now() / 1000) + 7 * 24 * 3600,
  };

  const testToken1 = {
    _projectID: 0,
    _tokenName: "testToken1",
    _tokenSymbol: "TTK",
    _tokenTotalSupply: 100,
    _tokenPrice: ethers.parseEther("0.01"),
  };

  beforeEach(async function () {
    [ICO_ProjectListing_Owner, userAddress1, userAddress2] =
      await ethers.getSigners();

    ICO_ProjectListing_Contract = await deployICO_ProjectListing();
  });

  it("Should set ICO_ProjectListing owner as SUPEROWNER", async function () {
    expect(
      await ICO_ProjectListing_Contract.ICO_ProjectListing_SUPEROWNER()
    ).to.equal(ICO_ProjectListing_Owner.address);
  });

  it("Should set the listing fee correctly", async function () {
    const listingFee = await ICO_ProjectListing_Contract.listingFee();
    expect(listingFee).to.equal(ethers.parseEther("0.1"));
  });

  describe("ICO_ProjectListing : Contract management", function () {
    beforeEach(async function () {
      // List the new test project
      newlyListedProject = await listNewProject(
        ICO_ProjectListing_Contract,
        userAddress1,
        testProject1.name,
        testProject1.description,
        testProject1.openingDate,
        testProject1.closingDate
      );
    });

    it("Should update the listing fee by the owner", async function () {
      const newFee = ethers.parseEther("0.2");
      await ICO_ProjectListing_Contract.connect(
        ICO_ProjectListing_Owner
      ).updateListingFee(newFee);
      const updatedFee = await ICO_ProjectListing_Contract.listingFee();
      expect(updatedFee).to.equal(newFee);
    });

    it("Should withdraw contract balance by the owner", async function () {
      await ICO_ProjectListing_Contract.connect(
        ICO_ProjectListing_Owner
      ).withdrawContractBalance();

      const finalBalance = await ethers.provider.getBalance(
        ICO_ProjectListing_Contract
      );
      expect(finalBalance).to.equal(0);
    });

    it("Should get contract balance by the owner", async function () {
      const initialBalance = await ethers.provider.getBalance(
        ICO_ProjectListing_Contract
      );
      const balance = await ICO_ProjectListing_Contract.getContractBalance();
      expect(balance).to.equal(initialBalance);
    });
  });

  describe("ICO_ProjectListing : Listing a new project", function () {
    beforeEach(async function () {
      newlyListedProject = await listNewProject(
        ICO_ProjectListing_Contract,
        userAddress1,
        testProject1.name,
        testProject1.description,
        testProject1.openingDate,
        testProject1.closingDate
      );
    });

    it("Should create a new project when listingNewProject is called with sufficient listing fee", async function () {
      await expect(newlyListedProject)
        .to.emit(ICO_ProjectListing_Contract, "ProjectListed")
        .withArgs(0, testProject1.name, userAddress1.address);
    });

    it("Should return correct status for a listed project", async function () {
      const projectStatus = await ICO_ProjectListing_Contract.getProjectStatus(
        0
      );

      expect(projectStatus).to.equal("PROJECT_LISTED");
    });

    it("Should allow the project owner to close the project", async function () {
      await expect(
        ICO_ProjectListing_Contract.connect(userAddress1).closeProject(0)
      ).to.emit(ICO_ProjectListing_Contract, "ProjectClosedByOwner");

      const projectStatus = await ICO_ProjectListing_Contract.getProjectStatus(
        0
      );

      expect(projectStatus).to.equal("PROJECT_CLOSED");
    });

    it("Should revert if a non-owner tries to close the project", async function () {
      await expect(
        ICO_ProjectListing_Contract.connect(userAddress2).closeProject(0)
      ).to.be.revertedWithCustomError(
        ICO_ProjectListing_Contract,
        "ICO_ProjectListing_NotAuthorizedAsListedProjectOwner"
      );
    });
  });

  describe("ICO_ProjectListing : Creating a new ERC20 token", function () {
    beforeEach(async function () {
      // List the new test project
      newlyListedProject = await listNewProject(
        ICO_ProjectListing_Contract,
        userAddress1,
        testProject1.name,
        testProject1.description,
        testProject1.openingDate,
        testProject1.closingDate
      );
    });

    it("Should revert if project does not exist", async function () {
      await expect(
        ICO_ProjectListing_Contract.connect(userAddress1).createNewERC20Token(
          1, // Assuming project with ID 1 does not exist
          "Token Name",
          "TKN",
          ethers.parseEther("1000"),
          ethers.parseEther("0.01")
        )
      ).to.be.revertedWith("Project does not exist");
    });

    it("Should revert if token already created for this project", async function () {
      newlyListedToken = await ICO_ProjectListing_Contract.connect(
        userAddress1
      ).createNewERC20Token(
        testToken1._projectID,
        testToken1._tokenName,
        testToken1._tokenSymbol,
        testToken1._tokenTotalSupply,
        testToken1._tokenPrice
      );

      await expect(
        ICO_ProjectListing_Contract.connect(userAddress1).createNewERC20Token(
          0, // Assuming the existing project has ID 0
          "Token Name",
          "TKN",
          100,
          ethers.parseEther("0.01")
        )
      ).to.be.revertedWith("Token already created for this project");
    });

    it("Should revert if caller is not the project owner", async function () {
      await expect(
        ICO_ProjectListing_Contract.connect(userAddress2).createNewERC20Token(
          testToken1._projectID,
          testToken1._tokenName,
          testToken1._tokenSymbol,
          testToken1._tokenTotalSupply,
          testToken1._tokenPrice
        )
      ).to.be.revertedWith("Only the project owner can create a new token");
    });

    it("Should create a new ERC20 token for the project", async function () {
      newlyListedToken = await ICO_ProjectListing_Contract.connect(
        userAddress1
      ).createNewERC20Token(
        testToken1._projectID,
        testToken1._tokenName,
        testToken1._tokenSymbol,
        testToken1._tokenTotalSupply,
        testToken1._tokenPrice
      );

      expect(newlyListedToken)
        .to.emit(ICO_ProjectListing_Contract, "TokenListed")
        .withArgs(0, testToken1._tokenSymbol, userAddress1);
    });
  });

  describe("ICO_ProjectListing : Listing a token and a project and check all the details together", function () {
    beforeEach(async function () {
      // List the new test project
      await listNewProject(
        ICO_ProjectListing_Contract,
        userAddress1,
        testProject1.name,
        testProject1.description,
        testProject1.openingDate,
        testProject1.closingDate
      );

      // Create a new ERC20 token for the project
      newlyListedToken = await ICO_ProjectListing_Contract.connect(
        userAddress1
      ).createNewERC20Token(
        testToken1._projectID,
        testToken1._tokenName,
        testToken1._tokenSymbol,
        testToken1._tokenTotalSupply,
        testToken1._tokenPrice
      );
    });

    it("Should list a project and a token successfully", async function () {
      const projectStatus = await ICO_ProjectListing_Contract.getProjectStatus(
        0
      );
      expect(projectStatus).to.equal("PROJECT_TOKEN_MINTED");

      const listedProject = await ICO_ProjectListing_Contract.projects(0);
      // Checking event data for owner's address
      expect(listedProject[3]).to.equal(userAddress1);
    });

    it("Should return correct details of the project and token", async function () {
      const projectDetails =
        await ICO_ProjectListing_Contract.getProjectDetailsByID(0);

      expect(projectDetails.projectName).to.equal(testProject1.name);
      expect(projectDetails.projectDescription).to.equal(
        testProject1.description
      );
      expect(projectDetails.projectOwner).to.equal(userAddress1);
      expect(projectDetails.tokenContract).to.not.equal(0x0);
      expect(projectDetails.tokenName).to.equal(testToken1._tokenName);
      expect(projectDetails.tokenSymbol).to.equal(testToken1._tokenSymbol);
      expect(projectDetails.tokenPrice).to.equal(testToken1._tokenPrice);
    });
  });
});
