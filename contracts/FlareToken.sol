// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";

contract FlareToken is ERC20Permit, Ownable, ERC20Pausable {
    constructor()
        ERC20("FlareToken", "FLR")
        ERC20Permit("flare")
        // Ownable(msg.sender)
        Ownable()
    {}

    // 在这里覆盖另一个基类的 _update 函数
    // function _update(
    //     address from,
    //     address to,
    //     uint256 value
    // ) internal override(ERC20, ERC20Pausable) {
    //     // 调用 ERC20 的 _update 函数
    //     super._update(from, to, value);
    // }

    // 铸造代币
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    // // 暂停代币转账
    // function pause() public onlyOwner {
    //     _pause();
    // }

    // // 恢复代币转账
    // function unpause() public onlyOwner {
    //     _unpause();
    // }
    function _beforeTokenTransfer(address from, address to, uint256 amount) internal override(ERC20, ERC20Pausable) {
        super._beforeTokenTransfer(from, to, amount);

        // require(!paused(), "ERC20Pausable: token transfer while paused");
    }
}
