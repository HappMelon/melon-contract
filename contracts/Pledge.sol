// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./Proposal.sol";

contract Pledge {
    struct PledgeInfo {
        uint deadline;
        uint margins;
        uint amount;
    }

    event NewPledge(
        address indexed user,
        uint256 deadline,
        uint256 margins,
        uint256 amount
    );

    event PledgeCleared(
        address indexed user,
        uint256 principal,
        uint256 interest,
        uint256 totalAmount
    );


    mapping(address => uint256) public pledgeLock; // The amount stack by the user

    mapping(address => PledgeInfo[]) public pledgeInfos;

    uint256 public totalPledgedAmount;

    uint256 public totalPledgers;

    function createPledge(uint deadline, uint margins, uint amount) external {
        require(
            deadline > block.timestamp,
            "Deadline must be greater than current time"
        );

        PledgeInfo memory pledgeInfo = PledgeInfo(deadline, margins, amount);

        // Increase the number of pledging users if they are pledging for the first time
        if (pledgeLock[msg.sender] == 0) {
            totalPledgers++;
        }

        pledgeInfos[msg.sender].push(pledgeInfo);
        pledgeLock[msg.sender] += amount;
        totalPledgedAmount += amount;

        emit NewPledge(msg.sender, deadline, margins, amount);
    }

    function getPledgeStats() external view returns (uint256, uint256) {
        return (totalPledgers, totalPledgedAmount);
    }

    function clearPledge(address user, Proposal proposal) external {
        uint256 totalAmount = 0;
        uint256 principalAmount = 0;
        uint256 interestAmount = 0;

        for (uint256 i = 0; i < pledgeInfos[user].length; i++) {
            PledgeInfo memory info = pledgeInfos[user][i];

            if (info.deadline < block.timestamp) {
                uint256 amountWithInterest = (info.amount *
                    (100 + info.margins)) / 100;
                principalAmount += info.amount;
                interestAmount += amountWithInterest - info.amount;
                totalAmount += amountWithInterest;
                removePledge(i);
                pledgeLock[user] -= info.amount;
            }
        }
        proposal.addInterest(user, interestAmount);
        emit PledgeCleared(user, principalAmount, interestAmount, totalAmount);
    }

    function getPledges() external view returns (PledgeInfo[] memory) {
        return pledgeInfos[msg.sender];
    }

    function removePledge(uint256 index) internal {
        require(index < pledgeInfos[msg.sender].length, "Index out of bounds");

        uint256 lastIndex = pledgeInfos[msg.sender].length - 1;

        if (index != lastIndex) {
            pledgeInfos[msg.sender][index] = pledgeInfos[msg.sender][lastIndex];
        }

        pledgeInfos[msg.sender].pop();
    }
}
