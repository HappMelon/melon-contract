// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract MelonNft is ERC721URIStorage {
    using Counters for Counters.Counter;

    Counters.Counter private tokenCounter;
    mapping(uint256 => uint256) public holdingTimes;

    event NFTMinted(
        address indexed sender,
        uint256 indexed tokenId,
        string tokenURI
    );

    constructor() ERC721("Melon_NFT", "MLN_NFT") {}

    function mint(string memory tokenURI) external returns (uint256) {
        uint256 tokenId = tokenCounter.current();
        tokenCounter.increment();
        _mint(msg.sender, tokenId);
        _setTokenURI(tokenId, tokenURI);
        emit NFTMinted(msg.sender, tokenId, tokenURI);
        return tokenId;
    }

    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public override(ERC721, IERC721) {
        super.transferFrom(from, to, tokenId);
        holdingTimes[tokenId] = block.timestamp;
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public override(ERC721, IERC721) {
        super.safeTransferFrom(from, to, tokenId);
        holdingTimes[tokenId] = block.timestamp;
    }
}
