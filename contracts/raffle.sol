// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract RaffleNFT is VRFConsumerBase, ERC721 {
    address payable public owner;
    uint256 public ticketPrice;
    uint256 public totalTickets;
    uint256 public remainingTickets;
    uint256 public randomResult;
    bytes32 public requestId;
    uint256 public winnerTicketNumber;
    address public winnerAddress;

    mapping(address => uint256) public ticketBalance;
    mapping(bytes32 => address) public requestIdToAddress;

    event TicketPurchased(address indexed buyer, uint256 amount);
    event WinnerSelected(address indexed winnerAddress, uint256 indexed ticketNumber);
    event Received(address sender, uint256 amount);


    // Chainlink VRF variables
    bytes32 internal keyHash;
    uint256 internal fee;

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can call this function.");
        _;
    }

    constructor(
        address _vrfCoordinator,
        address _linkToken,
        bytes32 _keyHash,
        uint256 _fee,
        uint256 _ticketPrice,
        uint256 _totalTickets
    )
        ERC721("RaffleNFT", "RNFT")
        VRFConsumerBase(_vrfCoordinator, _linkToken)
    {
        owner = payable(msg.sender);
        keyHash = _keyHash;
        fee = _fee;
        ticketPrice = _ticketPrice;
        totalTickets = _totalTickets;
        remainingTickets = _totalTickets;
    }

    function buyTickets(uint256 _amount) external payable {
        require(_amount > 0, "Amount should be greater than zero.");
        require(msg.value >= ticketPrice * _amount, "Insufficient payment.");

        uint256 maxTicketsToBuy = (remainingTickets * 20) / 100;
        require(_amount <= maxTicketsToBuy, "You can't buy more than 20% of the remaining tickets.");

        ticketBalance[msg.sender] += _amount;
        remainingTickets -= _amount;

        emit TicketPurchased(msg.sender, _amount);
    }

    function withdrawFunds() external onlyOwner {
        require(address(this).balance > 0, "Contract balance is zero.");

        uint256 amount = address(this).balance;
        (bool success, ) = owner.call{value: amount}("");
        require(success, "Withdrawal failed.");
    }

    function fulfillRandomness(bytes32 _requestId, uint256 _randomness) internal override {
        randomResult = _randomness;
        requestId = _requestId;

        winnerTicketNumber = (_randomness % totalTickets) + 1;
        winnerAddress = address(this);
        address[] memory addresses = new address[](totalTickets);
        uint256 index = 0;

        for (uint256 i = 0; i < totalTickets; i++) {
            address addr = address(uint160(i)); // Convert uint256 to address
            if (ticketBalance[addr] > 0) {
                addresses[index] = addr;
                index++;
            }
        }

        for (uint256 i = 0; i < index; i++) {
            if (winnerTicketNumber <= ticketBalance[addresses[i]]) {
                winnerAddress = addresses[i];
                break;
            }
            winnerTicketNumber -= ticketBalance[addresses[i]];
        }

        emit WinnerSelected(winnerAddress, winnerTicketNumber);
        _mintNFT();
    }


    function _mintNFT() private {
        uint256 tokenId = totalTickets - remainingTickets;
        _safeMint(winnerAddress, tokenId);
    }

    function requestRandomNumber() external onlyOwner {
        require(LINK.balanceOf(address(this)) >= fee, "Not enough LINK tokens.");
        require(remainingTickets == 0, "Raffle is not yet completed.");

        requestId = requestRandomness(keyHash, fee);
        requestIdToAddress[requestId] = msg.sender;
    }

    function getTicketPrice() public view returns (uint256) {
    return ticketPrice;
    }

    function getTotalTickets() public view returns (uint256) {
    return totalTickets;
    }

    function getRemainingTickets() public view returns (uint256) {
    return remainingTickets;
    }

    function getWinnerAddress() public view returns (address) {
        return winnerAddress;
    }


    receive() external payable {
        emit Received(msg.sender, msg.value);
    }

    fallback() external payable {}
}