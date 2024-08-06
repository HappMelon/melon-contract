// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./Proposal.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";

contract Jury is Initializable, UUPSUpgradeable {
    struct JuryInfo {
        Selection[] selections;
        uint256 deadline;
    }

    struct Selection {
        address juror;
        uint256 optionId;
    }

    address public proposalAddr;
    address public impleAddr;
    
    mapping(uint256 => JuryInfo) public juryInfos;

    error JuryHasBeenCreated(uint256 proposalId);
    error NotYetDue(uint256 proposalId, uint256 deadline);
    error InvalidProposalId(uint256 proposalId);
    error NoVotes(uint256 proposalId);

    event Fail(uint256 proposalId);
    event Success(uint256 proposalId);
    event CreateProposalJury(uint256 proposalId, uint256 deadline);

    function initialize(address _proposalAddr) external initializer {
        proposalAddr = _proposalAddr;
    }

    function setNewProposal(address _proposalAddr) external {
        proposalAddr = _proposalAddr;
    }

    function getDetail(uint256 proposalId) public view returns (address[] memory jurors, uint256[] memory optionId) {
        JuryInfo memory juryInfo = juryInfos[proposalId];
        Selection[] memory selections = juryInfo.selections;

        jurors = new address[](selections.length);
        optionId = new uint256[](selections.length);

        for (uint256 i = 0; i < selections.length; i++) {
            Selection memory selection = selections[i];
            jurors[i] = selection.juror;
            optionId[i] = selection.optionId;
        }
    }

    function deleteById(uint256 proposalId) public {
        delete juryInfos[proposalId];
    }

    function create(uint256 proposalId, uint256 deadline) external {
        if (juryInfos[proposalId].deadline != 0) {
            revert JuryHasBeenCreated(proposalId);
        }

        JuryInfo storage newProposalJury = juryInfos[proposalId];
        newProposalJury.deadline = deadline;

        emit CreateProposalJury(proposalId, deadline);
    }

    function vote(uint256 proposalId, uint256 optionId) external {
        Selection memory newSelection = Selection({
            juror: msg.sender,
            optionId: optionId
        });

        JuryInfo storage proposalJury = juryInfos[proposalId];
        proposalJury.selections.push(newSelection);
    }

    function handleResult(uint256 proposalId) external {
        if (juryInfos[proposalId].deadline == 0) {
            revert InvalidProposalId(proposalId);
        }
        
        JuryInfo storage juryInfo = juryInfos[proposalId];
        Selection[] memory selections = juryInfo.selections;
        (address[] memory jurors, ) = getDetail(proposalId);

        if (juryInfo.deadline > block.timestamp) {
            revert NotYetDue(proposalId, juryInfo.deadline);
        }

        if (selections.length == 0) {
            revert NoVotes(proposalId);
        }

        uint256 majorityOption = selections[0].optionId;
        for (uint256 i = 1; i < selections.length; i++) {
            if (selections[i].optionId != majorityOption) {
                Proposal(proposalAddr).refundForFailedProposal(proposalId);
                emit Fail(proposalId);
                return;
            }
        }

        Proposal(proposalAddr).settle(proposalId, majorityOption, jurors);
        emit Success(proposalId);
    }

    function _authorizeUpgrade(address newImplementation) internal override {
        impleAddr = newImplementation;
    }
}
