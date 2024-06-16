// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Jury.sol";
import "./MelonToken.sol";
import "./MelonNFT.sol";
import "./Proposal.sol";

contract JuryNFTSwap is IERC721Receiver, Ownable {
    struct Info {
        uint tokenId;
        uint price;
        string uri;
    }

    MelonToken public melonToken;

    MelonNFT public melonNFT;

    Proposal public proposal;

    Info[] public infos;

    mapping(uint => Info) public infoByTokenId;

    event HangOut(uint indexed tokenId, uint price);

    event StartUpNFTSending(address indexed buyer, uint tokenId, uint price);

    event BuyNFT(address indexed buyer, uint tokenId, uint price);

    event Redeem(address indexed redeemer, uint tokenId, uint redeemPrice);

    error NotListed(uint tokenId);

    error AlreadyListed(uint tokenId);

    error RedemptionTimeNotReached(
        address NFTAddr,
        uint tokenId,
        uint redemptionTime
    );

    error NotPledger(address pledger);

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

    modifier isPledger(address user) {
        uint pledgeLock = proposal.pledgeLock(user);
        if (pledgeLock == 0) {
            revert NotPledger(user);
        }
        _;
    }

    constructor(
        address _tokenAddr,
        address _melonNFTAddr,
        address _proposalAddr
    ) Ownable() {
        melonToken = MelonToken(_tokenAddr);
        melonNFT = MelonNFT(_melonNFTAddr);
        proposal = Proposal(_proposalAddr);
    }

    function getAllListing() external view returns (Info[] memory, uint) {
        return (infos, infos.length);
    }

    function issuanceStartUpNFT(
        uint tokenId,
        address pledger
    ) external isPledger(pledger) isListed(tokenId) {
        Info memory info = infoByTokenId[tokenId];

        melonNFT.safeTransferFrom(address(this), pledger, tokenId);

        handleRemove(infos, tokenId);

        delete infoByTokenId[tokenId];

        emit StartUpNFTSending(pledger, tokenId, info.price);
    }

    function initialNFTHangOut(
        uint tokenId,
        uint price
    ) public isOwner(msg.sender, tokenId) isUnListed(tokenId) onlyOwner {
        // Ensure the NFT is owned by the contract
        melonNFT.safeTransferFrom(msg.sender, address(this), tokenId);

        // Fetch the URI of the NFT
        string memory uri = melonNFT.tokenURI(tokenId);

        // Create a new listing
        Info memory newListing = Info({
            tokenId: tokenId,
            price: price,
            uri: uri
        });

        // Store the listing information
        infos.push(newListing);
        infoByTokenId[tokenId] = newListing;

        // Emit the event
        emit HangOut(tokenId, price);
    }

    function purchaseCommonNFT(uint tokenId) external isListed(tokenId) {
        uint balance = melonNFT.balanceOf(msg.sender);

        if (balance >= 3) {
            revert MaximumNumberOfHoldings(msg.sender, balance);
        }

        Info memory info = infoByTokenId[tokenId];

        melonToken.transferFrom(msg.sender, address(this), info.price);

        melonNFT.safeTransferFrom(address(this), msg.sender, tokenId);

        delete infoByTokenId[tokenId];

        handleRemove(infos, tokenId);

        emit BuyNFT(msg.sender, tokenId, info.price);
    }

    function redeem(
        uint tokenId,
        uint price
    ) external isOwner(msg.sender, tokenId) isUnListed(tokenId) {
        // Ensure the NFT is owned by the contract
        melonNFT.safeTransferFrom(msg.sender, address(this), tokenId);

        // Fetch the URI of the NFT
        string memory uri = melonNFT.tokenURI(tokenId);

        // Create a new listing
        Info memory newListing = Info({
            tokenId: tokenId,
            price: price,
            uri: uri
        });

        // Store the listing information
        infos.push(newListing);

        infoByTokenId[tokenId] = newListing;

        melonToken.transfer(msg.sender, (price * 98) / 100);

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
}
