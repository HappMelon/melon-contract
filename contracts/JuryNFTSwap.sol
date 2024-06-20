// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./MelonNFT.sol";
import "./Proposal.sol";

contract JuryNFTSwap is IERC721Receiver, Ownable {
    struct Info {
        uint tokenId;
        uint price;
        string uri;
        uint acquisitionTime; // 新增字段，记录获取时间
    }

    struct ApplyStartUpNFTInfo {
        uint pledgeAmount;
        address user;
    }

    MelonNFT public melonNFT;
    Info[] public infos;
    ApplyStartUpNFTInfo[] public applyStartUpNFTInfos;

    mapping(address => uint) public nftLock;
    mapping(uint => Info) public infoByTokenId;
    mapping(address => Info[]) public userPurchasedNFTs;

    event HangOut(uint indexed tokenId, uint price);
    event StartUpNFTSending(address indexed buyer, uint tokenId, uint price);
    event BuyNFT(address indexed buyer, uint tokenId, uint price);
    event Redeem(address indexed redeemer, uint tokenId, uint redeemPrice);
    event ApplyStartUpNFT(address indexed user, uint pledgeAmount);

    error NotListed(uint tokenId);
    error AlreadyListed(uint tokenId);
    error RedemptionTimeNotReached(
        address NFTAddr,
        uint tokenId,
        uint redemptionTime
    );
    error NotNFTOwner(address user, uint tokenId);
    error MaximumNumberOfHoldings(address user, uint holdAmount);

    modifier isListed(uint tokenId) {
        if (bytes(infoByTokenId[tokenId].uri).length == 0) {
            revert NotListed(tokenId);
        }
        _;
    }

    modifier isUnListed(uint tokenId) {
        if (bytes(infoByTokenId[tokenId].uri).length > 0) {
            revert AlreadyListed(tokenId);
        }
        _;
    }

    modifier isOwner(address user, uint tokenId) {
        if (melonNFT.ownerOf(tokenId) != user) {
            revert NotNFTOwner(user, tokenId);
        }
        _;
    }

    constructor(address _melonNFTAddr) Ownable() {
        melonNFT = MelonNFT(_melonNFTAddr);
    }

    function getAllListing() external view returns (Info[] memory, uint) {
        return (infos, infos.length);
    }

    function getUserPurchasedNFTDetails(
        address user
    ) external view returns (Info[] memory) {
        return userPurchasedNFTs[user];
    }

    function distributeStartUpNFT(
        address[] memory users,
        uint[] memory tokenIds
    ) external onlyOwner {
        require(
            users.length == tokenIds.length,
            "Users and tokenIds array lengths must match"
        );

        // Clear all apply locks
        clearApplyLock();

        // Process each user
        for (uint i = 0; i < users.length; i++) {
            address user = users[i];
            uint tokenId = tokenIds[i];

            // Check if the NFT is listed
            Info storage info = infoByTokenId[tokenId];
            if (bytes(info.uri).length == 0) {
                revert NotListed(tokenId);
            }

            // Transfer the NFT to the user
            melonNFT.safeTransferFrom(address(this), user, tokenId);

            // Clear the listing information
            delete infoByTokenId[tokenId];

            // Update the user's purchased NFTs list
            userPurchasedNFTs[user].push(info);

            // Remove the NFT from the infos array
            handleRemove(infos, tokenId);

            // Emit event for sending the start-up NFT
            emit StartUpNFTSending(user, tokenId, info.price);
        }
    }

    function applyStartUpNFT(uint pledgeAmount) external {
        applyStartUpNFTInfos.push(
            ApplyStartUpNFTInfo({pledgeAmount: pledgeAmount, user: msg.sender})
        );
        nftLock[msg.sender] = pledgeAmount;
        emit ApplyStartUpNFT(msg.sender, pledgeAmount);
    }

    function initialNFTHangOut(
        uint tokenId,
        uint price
    ) public isOwner(msg.sender, tokenId) isUnListed(tokenId) onlyOwner {
        melonNFT.safeTransferFrom(msg.sender, address(this), tokenId);

        string memory uri = melonNFT.tokenURI(tokenId);

        Info memory newListing = Info({
            tokenId: tokenId,
            price: price,
            uri: uri,
            acquisitionTime: block.timestamp
        });

        infos.push(newListing);
        infoByTokenId[tokenId] = newListing;

        emit HangOut(tokenId, price);
    }

    function purchaseCommonNFT(
        uint tokenId,
        Proposal proposal
    ) external isListed(tokenId) {
        uint balance = melonNFT.balanceOf(msg.sender);

        if (balance >= 3) {
            revert MaximumNumberOfHoldings(msg.sender, balance);
        }

        Info memory info = infoByTokenId[tokenId];

        require(
            proposal.getAvailableBalance(msg.sender) >= info.price,
            "Insufficient balance"
        );

        nftLock[msg.sender] += info.price;

        melonNFT.safeTransferFrom(address(this), msg.sender, tokenId);

        // 更新获取时间
        info.acquisitionTime = block.timestamp;

        // 存储到用户已购买NFT的映射中
        userPurchasedNFTs[msg.sender].push(info);

        // 从挂出的NFT列表中移除
        handleRemove(infos, tokenId);
        delete infoByTokenId[tokenId];

        emit BuyNFT(msg.sender, tokenId, info.price);
    }

    function redeem(
        uint tokenId,
        uint price
    ) external isOwner(msg.sender, tokenId) isUnListed(tokenId) {
        melonNFT.safeTransferFrom(msg.sender, address(this), tokenId);

        string memory uri = melonNFT.tokenURI(tokenId);

        Info memory newListing = Info({
            tokenId: tokenId,
            price: price,
            uri: uri,
            acquisitionTime: block.timestamp
        });

        infos.push(newListing);

        infoByTokenId[tokenId] = newListing;

        nftLock[msg.sender] -= (price * 98) / 100;

        emit Redeem(msg.sender, tokenId, price);
    }

    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }

    function handleRemove(Info[] storage infos, uint tokenId) internal {
        for (uint i = 0; i < infos.length; i++) {
            if (infos[i].tokenId == tokenId) {
                infos[i] = infos[infos.length - 1];
                infos.pop();
                break;
            }
        }
    }

    function clearApplyLock() internal {
        uint applyCount = applyStartUpNFTInfos.length;
        for (uint i = 0; i < applyCount; i++) {
            ApplyStartUpNFTInfo storage applyInfo = applyStartUpNFTInfos[i];
            nftLock[applyInfo.user] -= applyInfo.pledgeAmount;
        }
    }
}
