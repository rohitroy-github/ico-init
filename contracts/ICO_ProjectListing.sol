// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "contracts/ICO_TokenListing.sol";

error ICO_ProjectListing_NotAuthorizedAsSUPEROWNER();
error ICO_ProjectListing_NotAuthorizedAsListedProjectOwner();

contract ICO_ProjectListing {
    address public ICO_ProjectListing_SUPEROWNER;
    uint256 private projectIDCounter = 0;

    uint256 public listingFee = 0.1 ether;

    constructor() {
        ICO_ProjectListing_SUPEROWNER = msg.sender;
    }

    modifier onlySUPEROWNER() {
        if (msg.sender != ICO_ProjectListing_SUPEROWNER) {
            revert ICO_ProjectListing_NotAuthorizedAsSUPEROWNER();
        }
        _;
    }

    modifier onlyListedProjectOwner(uint256 _projectID) {
        if (msg.sender != projects[_projectID].projectOwner) {
            revert ICO_ProjectListing_NotAuthorizedAsListedProjectOwner();
        }
        _;
    }

    enum ProjectStatus {
        PROJECT_LISTED,
        PROJECT_TOKEN_MINTED,
        PROJECT_CLOSED
    }

    struct Project {
        uint256 projectID;
        string projectName;
        string projectDescription;
        address projectOwner;
        address tokenContract;
        string tokenName;
        string tokenSymbol;
        uint256 tokenPrice;
        uint256 tokenTotalSupply;
        ProjectStatus status;
        uint256 openingDate;
        uint256 closingDate;
    }

    event ProjectListed(
        uint256 indexed projectID,
        string projectName,
        address projectOwner
    );

    event TokenListed(
        uint256 indexed projectID,
        string tokenSymbol,
        address tokenInitialOwner,
        address tokenContractAddress
    );

    event ProjectClosedByOwner();

    // Mapping from projectID to Project
    mapping(uint256 => Project) public projects;

    // Function to create a new project
    function listNewProject(
        string memory _name,
        string memory _description,
        uint256 _openingDate,
        uint256 _closingDate
    ) public payable {
        require(msg.value >= listingFee, "Insufficient listing fee");

        uint256 excessPayment = msg.value - listingFee;
        if (excessPayment > 0) {
            payable(msg.sender).transfer(excessPayment); // Refund excess payment
        }

        uint256 _projectID = projectIDCounter;
        projectIDCounter++;

        projects[_projectID] = Project(
            _projectID,
            _name,
            _description,
            msg.sender,
            address(0),
            "", // Initialize tokenName
            "", // Initialize tokenSymbol
            0,
            0, // Initialize tokenTotalSupply
            ProjectStatus.PROJECT_LISTED,
            _openingDate,
            _closingDate
        );

        emit ProjectListed(_projectID, _name, msg.sender);
    }

    // function listNewProject() public payable {
    //     require(msg.value >= listingFee, "Insufficient listing fee");

    //     uint256 excessPayment = msg.value - listingFee;
    //     if (excessPayment > 0) {
    //         payable(msg.sender).transfer(excessPayment); // Refund excess payment
    //     }

    //     uint256 _projectID = projectIDCounter;
    //     string memory _name = "MyProject";
    //     string memory _description = "This is a description of my project";
    //     uint256 _openingDate = block.timestamp;
    //     uint256 _closingDate = block.timestamp + 7 days;

    //     projectIDCounter++;

    //     projects[_projectID] = Project(
    //         _projectID,
    //         _name,
    //         _description,
    //         msg.sender,
    //         address(0),
    //         "", // Initialize tokenName
    //         "", // Initialize tokenSymbol
    //         0,
    //         0, // Initialize tokenTotalSupply
    //         ProjectStatus.PROJECT_LISTED,
    //         _openingDate,
    //         _closingDate
    //     );

    //     emit ProjectListed(_projectID, _name, msg.sender);
    // }

    function createNewERC20Token(
        uint256 _projectID,
        string memory _tokenName,
        string memory _tokenSymbol,
        uint256 _tokenTotalSupply,
        uint256 _tokenPrice
    ) public returns (address) {
        require(
            projects[_projectID].projectOwner != address(0),
            "Project does not exist"
        );
        require(
            projects[_projectID].tokenContract == address(0),
            "Token already created for this project"
        );
        require(
            msg.sender == projects[_projectID].projectOwner,
            "Only the project owner can create a new token"
        );

        ICO_TokenListing newToken = new ICO_TokenListing(
            _tokenName,
            _tokenSymbol,
            _tokenTotalSupply,
            msg.sender,
            _projectID,
            _tokenPrice
        );

        projects[_projectID].tokenContract = address(newToken);
        projects[_projectID].tokenName = _tokenName;
        projects[_projectID].tokenSymbol = _tokenSymbol;
        projects[_projectID].tokenPrice = _tokenPrice;
        projects[_projectID].tokenTotalSupply = _tokenTotalSupply;
        projects[_projectID].status = ProjectStatus.PROJECT_TOKEN_MINTED;

        emit TokenListed(
            _projectID,
            _tokenSymbol,
            msg.sender,
            address(newToken)
        );

        return address(newToken);
    }

    function getProjectStatus(
        uint256 _projectID
    ) public view returns (string memory) {
        ProjectStatus status = projects[_projectID].status;
        if (status == ProjectStatus.PROJECT_LISTED) {
            return "PROJECT_LISTED";
        } else if (status == ProjectStatus.PROJECT_TOKEN_MINTED) {
            return "PROJECT_TOKEN_MINTED";
        } else if (status == ProjectStatus.PROJECT_CLOSED) {
            return "PROJECT_CLOSED";
        } else {
            return "UNKNOWN";
        }
    }

    function closeProject(
        uint256 _projectID
    ) public onlyListedProjectOwner(_projectID) {
        projects[_projectID].status = ProjectStatus.PROJECT_CLOSED;

        emit ProjectClosedByOwner();
    }

    function getContractBalance() public view onlySUPEROWNER returns (uint256) {
        return address(this).balance;
    }

    function withdrawContractBalance() public onlySUPEROWNER {
        uint256 contractBalance = address(this).balance;
        require(contractBalance > 0, "Contract balance is zero");

        payable(ICO_ProjectListing_SUPEROWNER).transfer(contractBalance);
    }

    function updateListingFee(uint256 _newFee) public onlySUPEROWNER {
        listingFee = _newFee;
    }

    function getProjectDetailsByID(
        uint256 _projectID
    )
        public
        view
        returns (
            string memory projectName,
            string memory projectDescription,
            address projectOwner,
            address tokenContract,
            string memory tokenName,
            string memory tokenSymbol,
            uint256 tokenPrice,
            uint256 tokenTotalSupply,
            string memory status,
            uint256 openingDate,
            uint256 closingDate
        )
    {
        projectName = projects[_projectID].projectName;
        projectDescription = projects[_projectID].projectDescription;
        projectOwner = projects[_projectID].projectOwner;
        tokenContract = projects[_projectID].tokenContract;
        tokenName = projects[_projectID].tokenName;
        tokenSymbol = projects[_projectID].tokenSymbol;
        tokenPrice = projects[_projectID].tokenPrice;
        tokenTotalSupply = projects[_projectID].tokenTotalSupply;
        status = getProjectStatus(_projectID);
        openingDate = projects[_projectID].openingDate;
        closingDate = projects[_projectID].closingDate;
    }
}
