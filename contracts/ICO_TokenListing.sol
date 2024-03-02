// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract ICO_TokenListing is ERC20, Ownable, ERC20Permit {
    // Mapping to store transfer records from the initial owner(ICO)
    mapping(address => mapping(uint256 => TransferRecord))
        private transferRecords;
    uint256 private transferCount;
    uint256 public tokenPrice;
    uint256 public TOKEN_ProjectID;
    address public TOKEN_InitialOwner;

    struct TransferRecord {
        address to;
        uint256 amount;
        uint256 timestamp;
    }

    constructor(
        string memory TOKEN_Name,
        string memory TOKEN_Symbol,
        uint256 TOKEN_TotalSupply,
        address _TOKEN_InitialOwner,
        uint256 _ProjectID,
        uint256 _tokenPrice
    )
        ERC20(TOKEN_Name, TOKEN_Symbol)
        Ownable(_TOKEN_InitialOwner)
        ERC20Permit(TOKEN_Name)
    {
        _mint(_TOKEN_InitialOwner, TOKEN_TotalSupply);
        TOKEN_ProjectID = _ProjectID;
        tokenPrice = _tokenPrice;
        TOKEN_InitialOwner = _TOKEN_InitialOwner;
    }

    modifier onlyInitialOwner() {
        require(
            msg.sender == TOKEN_InitialOwner,
            "Only the initial owner can call this function"
        );
        _;
    }

    // constructor()
    //     ERC20("ROHIT", "RHT")
    //     Ownable(0x5B38Da6a701c568545dCfcB03FcB875f56beddC4)
    //     ERC20Permit("ROHIT")
    // {
    //     _mint(0x5B38Da6a701c568545dCfcB03FcB875f56beddC4, 100);
    //     TOKEN_ProjectID = 1;
    // }

    function updateTokenPrice(
        uint256 _updatedTokenPrice
    ) external onlyInitialOwner {
        tokenPrice = _updatedTokenPrice;
    }

    // function mint(address to, uint256 amount) public onlyOwner {
    //     _mint(to, amount);
    // }

    // Function to return all transactions
    function getAllTransactions()
        public
        view
        returns (TransferRecord[] memory)
    {
        TransferRecord[] memory allTransactions = new TransferRecord[](
            transferCount
        );
        for (uint256 i = 1; i <= transferCount; i++) {
            allTransactions[i - 1] = transferRecords[owner()][i];
        }
        return allTransactions;
    }

    function buyTokens(uint256 tokensToBuy) external payable {
        require(msg.value > 0, "Insufficient ether provided.");
        require(
            tokensToBuy > 0,
            "Amount of tokens to buy must be greater than 0."
        );

        uint256 totalPrice = tokensToBuy * tokenPrice;
        uint256 ownerShare = (totalPrice * 2) / 100; // Calculate 2% of total price for owner

        require(
            tokensToBuy <= balanceOf(owner()),
            "Not enough tokens available for sale."
        );

        uint256 excessAmount = msg.value - totalPrice; // Calculate excess amount
        if (excessAmount > 0) {
            payable(msg.sender).transfer(excessAmount); // Refund excess ether to the buyer
        }

        payable(owner()).transfer(ownerShare); // Transfer owner's share to owner

        transferCount++;
        transferRecords[owner()][transferCount] = TransferRecord(
            msg.sender,
            tokensToBuy,
            block.timestamp
        );
        _transfer(owner(), msg.sender, tokensToBuy);
    }

    // function sellTokens(uint256 amount) external {
    //     require(amount > 0, "Amount must be greater than 0.");
    //     require(balanceOf(msg.sender) >= amount, "Insufficient tokens.");

    //     uint256 etherAmount = amount * tokenPrice; // Calculate the amount of ether to receive
    //     require(
    //         address(this).balance >= etherAmount,
    //         "Contract does not have enough ether."
    //     );

    //     _transfer(msg.sender, owner(), amount);

    //     payable(msg.sender).transfer(etherAmount); // Transfer ether to the seller
    // }

    function getContractBalance()
        external
        view
        onlyInitialOwner
        returns (uint256)
    {
        return address(this).balance;
    }
}
