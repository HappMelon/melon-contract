// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "./MelonNft.sol";
import "./Jury.sol";
import "./MelonToken.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

contract JuryNFTSwap is IERC721Receiver {
    struct NFTSalesInformation {
        address nftAddr;
        uint tokenId;
        uint price;
        uint timestamp;
    }

    Jury public jury;
    MelonToken public melonToken;
    NFTSalesInformation[] public nftSaleInfoList;
    // nftAddress => tokenId => NFTSalesInformation
    mapping(address => mapping(uint => NFTSalesInformation)) public nftListings;

    event HangOut(address indexed nftAddress, uint indexed tokenId, uint price);
    event BuyNFT(
        address indexed buyer,
        address indexed nftAddress,
        uint indexed tokenId,
        uint price
    );
    event Redeem(
        address redeemer,
        address indexed nftAddress,
        uint indexed tokenId,
        uint redeemPrice
    );

    error HasListed(address nftAddress, uint tokenId);
    error RedemptionTimeNotReached(
        address nftAddress,
        uint tokenId,
        uint redemptionTime
    );

    modifier isListed(address nftAddress, uint tokenId) {
        NFTSalesInformation memory curListing = nftListings[nftAddress][
            tokenId
        ];
        require(curListing.price > 0, "Current NFT has no listed!");
        _;
    }

    modifier isOwner(address nftAddress, uint tokenId) {
        IERC721 nft = IERC721(nftAddress);
        require(
            nft.ownerOf(tokenId) == msg.sender,
            "This NFT is not belong to current address!"
        );
        _;
    }

    constructor(address token, address _assessor) {
        melonToken = MelonToken(token);
        jury = Jury(_assessor);
    }

    function getAllListing()
        external
        view
        returns (NFTSalesInformation[] memory)
    {
        return nftSaleInfoList;
    }

    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }

    function hangOut(
        address nftAddr,
        uint tokenId,
        uint price
    ) public isOwner(nftAddr, tokenId) {
        MelonNft nft = MelonNft(nftAddr);

        if (nftListings[nftAddr][tokenId].price > 0) {
            revert HasListed(nftAddr, tokenId);
        }

        nft.safeTransferFrom(msg.sender, address(this), tokenId);
        // First 5 10MLN, 101 and later initial price+(current number of casters x 1%)

        NFTSalesInformation memory newListing = NFTSalesInformation({
            price: price,
            nftAddr: nftAddr,
            tokenId: tokenId,
            timestamp: block.timestamp
        });

        nftListings[nftAddr][tokenId] = newListing;
        nftSaleInfoList.push(newListing);
        emit HangOut(nftAddr, tokenId, price);
    }

    function buy(
        address nftAddr,
        uint tokenId
    ) external isListed(nftAddr, tokenId) {
        MelonNft nft = MelonNft(nftAddr);
        NFTSalesInformation memory curListing = nftListings[nftAddr][tokenId];

        delete nftListings[nftAddr][tokenId];

        handleRemove(nftSaleInfoList, nftAddr, tokenId);

        melonToken.transferFrom(msg.sender, address(this), curListing.price);
        nft.safeTransferFrom(address(this), msg.sender, tokenId);

        // jury.updateJurorStatus(true);

        emit BuyNFT(msg.sender, nftAddr, tokenId, curListing.price);
    }

    function redeem(address nftAddr, uint tokenId, uint marketPrice) external {
        // Redemption price:=min (casting price, current market price)
        MelonNft nft = MelonNft(nftAddr);
        uint holdingTime = nft.holdingTimes(tokenId);
        if (holdingTime + 5 seconds > block.timestamp) {
            revert RedemptionTimeNotReached(
                nftAddr,
                tokenId,
                holdingTime + 5 seconds
            );
        }
        hangOut(nftAddr, tokenId, marketPrice);
        melonToken.transfer(msg.sender, (marketPrice * 98) / 100);
        emit Redeem(msg.sender, nftAddr, tokenId, marketPrice);
    }

    function handleRemove(
        NFTSalesInformation[] storage listings,
        address nftAddr,
        uint tokenId
    ) internal {
        for (uint i = 0; i < listings.length; i++) {
            if (
                listings[i].nftAddr == nftAddr && listings[i].tokenId == tokenId
            ) {
                listings[i] = listings[listings.length - 1];
                listings.pop();
                break;
            }
        }
    }
}
