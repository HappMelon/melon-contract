// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./Proposal.sol";

contract Assessor {
    struct ProposalJury {
        uint minimumRequiredNumberOfVotes;
        uint winOption;
        address[] voters;
        uint numberOfVotesCast;
        mapping(address => bool) voted;
    }

    address public immutable proposalAddr;
    mapping(uint => ProposalJury) public proposalJuries;
    mapping(address => bool) public juryMembers;
    uint public numberOfJuries;

    error JuryHasBeenCreated(uint proposalId);
    error NoVotingRights(uint proposalId, address voter);
    error AlreadyVoted(uint proposalId, address voter);
    error InvalidJuryMember(address juryMember);

    modifier onlyJury() {
        require(
            juryMembers[msg.sender],
            "Only jury members can call this function"
        );
        _;
    }

    modifier onlyVoter(uint proposalId, address voter) {
        ProposalJury storage proposalJury = proposalJuries[proposalId];
        address[] memory voters = proposalJury.voters;
        bool isVoter = false;
        bool alreadyVoted = proposalJury.voted[voter];

        for (uint i = 0; i < voters.length; i++) {
            if (voters[i] == voter) {
                isVoter = true;
                break;
            }
        }
        if (!isVoter) {
            revert NoVotingRights(proposalId, voter);
        }
        if (alreadyVoted) {
            revert AlreadyVoted(proposalId, voter);
        }
        _;
    }

    event CreateProposalJury(
        uint proposalId,
        uint minimumRequiredNumberOfVotes,
        uint winOption,
        address[] initialVoters
    );
    event JuryFail(uint proposalId);
    event JurySuccess(uint proposalId);

    constructor(address _proposalAddr) {
        proposalAddr = _proposalAddr;
    }

    function updateJurorStatus(bool status) external {
        juryMembers[msg.sender] = status;
        if (status) {
            numberOfJuries++;
        } else {
            numberOfJuries--;
        }
    }

    function getVoters(
        uint proposalId
    ) external view returns (address[] memory) {
        return proposalJuries[proposalId].voters;
    }

    function isVoted(
        uint proposalId,
        address voter
    ) external view returns (bool) {
        return proposalJuries[proposalId].voted[voter];
    }

    function createProposalJury(
        uint proposalId,
        uint minimumRequiredNumberOfVotes,
        uint winOption,
        address[] memory initialVoters
    ) external {
        if (proposalJuries[proposalId].minimumRequiredNumberOfVotes != 0) {
            revert JuryHasBeenCreated(proposalId);
        }
      
        for (uint i = 0; i < initialVoters.length; i++) {
            if (!isJury(initialVoters[i])) {
                revert InvalidJuryMember(initialVoters[i]);
            }
        }

        ProposalJury storage newProposalJury = proposalJuries[proposalId];
        newProposalJury
            .minimumRequiredNumberOfVotes = minimumRequiredNumberOfVotes;
        newProposalJury.winOption = winOption;
        for (uint i = 0; i < initialVoters.length; i++) {
            newProposalJury.voters.push(initialVoters[i]);
        }

        emit CreateProposalJury(
            proposalId,
            minimumRequiredNumberOfVotes,
            winOption,
            initialVoters
        );
    }

    function vote(
        uint proposalId,
        uint option
    ) external onlyVoter(proposalId, msg.sender) {
        ProposalJury storage proposalJury = proposalJuries[proposalId];
        if (proposalJury.winOption != option) {
            emit JuryFail(proposalId);
            // clear info about proposalJury
            delete proposalJuries[proposalId];
        } else {
            proposalJury.numberOfVotesCast++;
            proposalJury.voted[msg.sender] = true;
            if (
                proposalJury.numberOfVotesCast ==
                proposalJury.minimumRequiredNumberOfVotes
            ) {
                Proposal(proposalAddr).proposalSettlement(proposalId, option);
                emit JurySuccess(proposalId);
            }
        }
    }

    function isJury(address _user) public view returns (bool) {
        return juryMembers[_user];
    }
}
