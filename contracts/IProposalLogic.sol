// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;


interface  IProposalLogic {
    

    function deposit(uint256 amount) external;

    // Submit a proposal for review
    function submitProposalForReview(uint256 amount) external returns (uint256);

    // Create a proposal with multiple options
    function createProposalWithOptions(
        string memory proposalDescription,
        string[] memory optionDescriptions,
        uint amount,
        uint256 endtime
    ) external returns (uint256);

    // Process a user's stake in a proposal
    function processUserStakedProposal(
        address userAddress,
        string memory proposalDescription,
        uint256 stakeAmount,
        string[] memory optionDescriptions,
        uint256 stakeIndex,
        uint256 endtime
    ) external returns (uint256);

    // Withdraw from the contract
    function withdraw(uint256 _amount) external;

    // Get the available balance that can be withdrawn
    function getAvailableWithdrawBalance(
        address user
    ) external view returns (uint256);

    // Check the status of a proposal
    function getProposalStatus(
        uint256 _proposalId
    ) external view returns (bool);

    // Vote on a proposal's option
    function vote(
        uint256 _proposalId,
        uint256 _optionId,
        uint256 _amount
    ) external;

    // Get the contract's balance
    function getContractBalance() external view returns (uint);

    // Pause the contract
    function pause() external;

    // Unpause the contract
    function unpause() external;

    // Get a user's voting history
    function getUserVotingHistory(
        address _user
    )
        external
        view
        returns (uint256[] memory, uint256[] memory, uint256[] memory);

    // Get the length of the proposals array
    function proposalsLength() external view returns (uint256);

    // Get the number of options for a proposal
    function getOptionsCount(
        uint256 proposalId
    ) external view returns (uint256);

    // Get the vote count for an option in a proposal
    function getOptionVoteCount(
        uint256 proposalId,
        uint256 optionIndex
    ) external view returns (uint256);

    // Get the ID of the current proposal
    function getCurrentProposalId() external view returns (uint256);

    // Process a stake release
    function handleStakeRelease(
        address user,
        uint256 stakeIndex,
        bool penalizeStake
    ) external;

    // Settle rewards
    function settleRewards(
        uint256 proposalId,
        uint256 winningOptionId
    ) external;

    // Settle funds for the average quality
    function settleFundsForAverageQuality(uint256 _proposalId) external;

    // Verify compliance and expectations
    function verifyComplianceAndExpectations(
        uint256 _proposalId
    ) external;

    // Check if the quality compliance is below expectations
    function checkQualityComplianceBelowExpectations(
        uint256 _proposalId
    ) external;

    // Deactivate a proposal
    function deactivateProposal(uint256 _proposalId) external;
}
