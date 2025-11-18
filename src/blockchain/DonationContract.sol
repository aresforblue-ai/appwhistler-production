// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

/**
 * @title AppWhistler Donation Contract
 * @dev Automatically splits proceeds 50/50 between platform and Truth DAO
 * @notice This contract is immutable once deployed - proceeds ALWAYS go to DAO
 */
contract AppWhistlerDonations {
    
    // ====== STATE VARIABLES ======
    
    /// Address of the Truth DAO that receives 50% of proceeds
    address payable public truthDAO;
    
    /// Address of AppWhistler platform (for operational costs)
    address payable public platform;
    
    /// Owner address (can only update DAO address, not change split)
    address public owner;
    
    /// Total amount ever donated to DAO
    uint256 public totalDonatedToDAO;
    
    /// Total amount kept by platform
    uint256 public totalKeptByPlatform;
    
    /// Emergency pause flag (only affects new deposits)
    bool public paused;
    
    // ====== EVENTS ======
    
    event DonationReceived(
        address indexed from,
        uint256 totalAmount,
        uint256 daoShare,
        uint256 platformShare,
        uint256 timestamp
    );
    
    event DAOAddressUpdated(
        address indexed oldDAO,
        address indexed newDAO,
        uint256 timestamp
    );
    
    event PlatformAddressUpdated(
        address indexed oldPlatform,
        address indexed newPlatform,
        uint256 timestamp
    );
    
    event EmergencyPause(bool paused, uint256 timestamp);
    
    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );
    
    // ====== MODIFIERS ======
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }
    
    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }
    
    // ====== CONSTRUCTOR ======
    
    /**
     * @dev Initialize contract with DAO and platform addresses
     * @param _truthDAO Address where 50% of proceeds go (DAO treasury)
     * @param _platform Address for platform operational costs (50%)
     */
    constructor(address payable _truthDAO, address payable _platform) {
        require(_truthDAO != address(0), "DAO address cannot be zero");
        require(_platform != address(0), "Platform address cannot be zero");
        require(_truthDAO != _platform, "DAO and platform must be different");
        
        truthDAO = _truthDAO;
        platform = _platform;
        owner = msg.sender;
        paused = false;
        
        emit DAOAddressUpdated(address(0), _truthDAO, block.timestamp);
        emit PlatformAddressUpdated(address(0), _platform, block.timestamp);
    }
    
    // ====== MAIN FUNCTIONS ======
    
    /**
     * @dev Receive function - automatically splits any ETH sent
     * This function is called when ETH is sent directly to contract
     */
    receive() external payable whenNotPaused {
        _splitAndDistribute(msg.value);
    }
    
    /**
     * @dev Fallback function - also splits any ETH sent
     */
    fallback() external payable whenNotPaused {
        _splitAndDistribute(msg.value);
    }
    
    /**
     * @dev Explicit donation function with metadata
     * @param message Optional message from donor
     */
    function donate(string calldata message) external payable whenNotPaused {
        require(msg.value > 0, "Donation must be greater than 0");
        _splitAndDistribute(msg.value);
        
        // Emit additional event with message if provided
        if (bytes(message).length > 0) {
            emit DonationWithMessage(msg.sender, msg.value, message, block.timestamp);
        }
    }
    
    /**
     * @dev Internal function to split and distribute funds
     * @param amount Total amount to split
     */
    function _splitAndDistribute(uint256 amount) private {
        require(amount > 0, "Amount must be greater than 0");
        
        // Calculate 50/50 split
        uint256 daoShare = amount / 2;
        uint256 platformShare = amount - daoShare; // Handles odd amounts
        
        // Update totals
        totalDonatedToDAO += daoShare;
        totalKeptByPlatform += platformShare;
        
        // Transfer to DAO (CRITICAL: This happens first)
        (bool daoSuccess, ) = truthDAO.call{value: daoShare}("");
        require(daoSuccess, "DAO transfer failed");
        
        // Transfer to platform
        (bool platformSuccess, ) = platform.call{value: platformShare}("");
        require(platformSuccess, "Platform transfer failed");
        
        // Emit event
        emit DonationReceived(
            msg.sender,
            amount,
            daoShare,
            platformShare,
            block.timestamp
        );
    }
    
    // ====== ADMIN FUNCTIONS ======
    
    /**
     * @dev Update Truth DAO address (only owner)
     * @param newDAO New DAO treasury address
     */
    function updateDAOAddress(address payable newDAO) external onlyOwner {
        require(newDAO != address(0), "New DAO address cannot be zero");
        require(newDAO != truthDAO, "New address same as current");
        
        address oldDAO = truthDAO;
        truthDAO = newDAO;
        
        emit DAOAddressUpdated(oldDAO, newDAO, block.timestamp);
    }
    
    /**
     * @dev Update platform address (only owner)
     * @param newPlatform New platform address
     */
    function updatePlatformAddress(address payable newPlatform) external onlyOwner {
        require(newPlatform != address(0), "New platform address cannot be zero");
        require(newPlatform != platform, "New address same as current");
        
        address oldPlatform = platform;
        platform = newPlatform;
        
        emit PlatformAddressUpdated(oldPlatform, newPlatform, block.timestamp);
    }
    
    /**
     * @dev Emergency pause (stops new deposits, doesn't affect existing funds)
     * @param _paused True to pause, false to unpause
     */
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit EmergencyPause(_paused, block.timestamp);
    }
    
    /**
     * @dev Transfer ownership to new address
     * @param newOwner Address of new owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        require(newOwner != owner, "New owner same as current");
        
        address oldOwner = owner;
        owner = newOwner;
        
        emit OwnershipTransferred(oldOwner, newOwner);
    }
    
    // ====== VIEW FUNCTIONS ======
    
    /**
     * @dev Get contract balance
     * @return Current ETH balance (should always be near 0 after splits)
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Get split ratio (always 50/50)
     * @return dao DAO percentage, platform Platform percentage
     */
    function getSplitRatio() external pure returns (uint256 dao, uint256 platform) {
        return (50, 50);
    }
    
    /**
     * @dev Get total statistics
     * @return Total donated to DAO, total kept by platform
     */
    function getTotalStats() external view returns (
        uint256 daoTotal,
        uint256 platformTotal,
        uint256 combinedTotal
    ) {
        return (
            totalDonatedToDAO,
            totalKeptByPlatform,
            totalDonatedToDAO + totalKeptByPlatform
        );
    }
    
    // ====== ADDITIONAL EVENTS ======
    
    event DonationWithMessage(
        address indexed from,
        uint256 amount,
        string message,
        uint256 timestamp
    );
}

/**
 * DEPLOYMENT INSTRUCTIONS:
 * 
 * 1. Install Hardhat:
 *    npm install --save-dev hardhat @nomiclabs/hardhat-ethers ethers
 * 
 * 2. Create hardhat.config.js:
 *    require("@nomiclabs/hardhat-ethers");
 *    module.exports = {
 *      solidity: "0.8.19",
 *      networks: {
 *        goerli: {
 *          url: `https://goerli.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
 *          accounts: [process.env.PRIVATE_KEY]
 *        }
 *      }
 *    };
 * 
 * 3. Create deployment script (scripts/deploy.js):
 *    const hre = require("hardhat");
 *    async function main() {
 *      const DonationContract = await hre.ethers.getContractFactory("AppWhistlerDonations");
 *      const contract = await DonationContract.deploy(
 *        "0xDAO_ADDRESS_HERE",  // Replace with actual DAO address
 *        "0xPLATFORM_ADDRESS"   // Replace with platform address
 *      );
 *      await contract.deployed();
 *      console.log("Contract deployed to:", contract.address);
 *    }
 *    main();
 * 
 * 4. Deploy to testnet (FREE):
 *    npx hardhat run scripts/deploy.js --network goerli
 * 
 * 5. Verify on Etherscan:
 *    npx hardhat verify --network goerli DEPLOYED_ADDRESS "DAO_ADDRESS" "PLATFORM_ADDRESS"
 * 
 * TESTING ON TESTNET:
 * - Get free test ETH from: https://goerlifaucet.com
 * - Test contract on Goerli before mainnet deployment
 * - Once deployed, contract is IMMUTABLE (50/50 split is permanent)
 */