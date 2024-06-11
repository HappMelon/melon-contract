// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";


contract MelonNft is ERC721URIStorage, Ownable  {
    uint256 private _nextTokenId;

    event MintNFT(address indexed to, uint256 tokenId);

    constructor() ERC721("Melon_NFT", "MLN_NFT") Ownable(){}

    function mint(address to, string memory uri) external onlyOwner {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        emit MintNFT(to, tokenId);
    }

}