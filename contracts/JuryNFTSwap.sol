// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "./Jury.sol";
import "./MelonToken.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

contract JuryNFTSwap is IERC721Receiver {
    
    struct Info {
        address nftAddr;
        uint tokenId;
        uint price;
    }

    MelonToken public melonToken;
    Info[] public infos;

    // nftAddress => tokenId => Info
    mapping(address => mapping(uint => Info)) public nftListings;

    event HangOut(address indexed nftAddress, uint indexed tokenId, uint price);

    event BuyNFT(
        address indexed buyer,
        address nftAddress,
        uint tokenId,
        uint price
    );

    event Redeem(
        address indexed redeemer,
        address  nftAddress,
        uint  tokenId,
        uint redeemPrice
    );

    error HasListed(address nftAddress, uint tokenId);

    error RedemptionTimeNotReached(
        address nftAddress,
        uint tokenId,
        uint redemptionTime
    );

    modifier isListed(address nftAddress, uint tokenId) {
        Info memory curListing = nftListings[nftAddress][
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

    constructor(address token) {
        melonToken = MelonToken(token);
    }

    function getAllListing()
        external
        view
        returns (Info[] memory, uint totalInfo)
    {
        return (infos, infos.length);
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
        IERC721 nft = IERC721(nftAddr);

        if (nftListings[nftAddr][tokenId].price > 0) {
            revert HasListed(nftAddr, tokenId);
        }

        nft.safeTransferFrom(msg.sender, address(this), tokenId);

        Info memory newListing = Info({
            price: price,
            nftAddr: nftAddr,
            tokenId: tokenId
        });

        nftListings[nftAddr][tokenId] = newListing;
        infos.push(newListing);
        emit HangOut(nftAddr, tokenId, price);
    }

    function buy(
        address nftAddr,
        uint tokenId
    ) external isListed(nftAddr, tokenId) {
        IERC721 nft = IERC721(nftAddr);

        Info memory curListing = nftListings[nftAddr][tokenId];

        handleRemove(infos, nftAddr, tokenId);

        melonToken.transferFrom(msg.sender, address(this), curListing.price);

        nft.safeTransferFrom(address(this), msg.sender, tokenId);

        delete nftListings[nftAddr][tokenId];

        emit BuyNFT(msg.sender, nftAddr, tokenId, curListing.price);
    }

    function redeem(address nftAddr, uint tokenId, uint price) external {        
        hangOut(nftAddr, tokenId, price);
        melonToken.transfer(msg.sender, (price * 98) / 100);
        emit Redeem(msg.sender, nftAddr, tokenId, price);
    }

    function handleRemove(
        Info[] storage listings,
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
