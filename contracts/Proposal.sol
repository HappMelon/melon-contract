// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Proposal is Initializable, UUPSUpgradeable {
    struct Option {
        string desc;
        uint256 count;
    }

    struct ProposalInfo {
        address founder;
        Option[] options;
    }

    struct VoteInfo {
        address user;
        uint256 amount;
    }

    //事件
    event Deposited(address indexed user, uint256 amount);

    event Voted(
        address indexed _address,
        uint256 indexed _proposalId,
        uint256 indexed _optionId,
        uint256 _amount
    );

    event Withdraw(address indexed user, uint256 amount, uint256 balance);

    event CreateProposal(
        address indexed founder,
        uint256 indexed id,
        string[] options
    );
    event ProposalSettlement(
        address indexed voter,
        uint256 proposalId,
        int256 amount
    );

    event ExchangePoints(address indexed user, uint256 points);

    event ProposalRefunded(uint256 indexed proposalId, uint256 winOptionId);

    error InsufficientBalance(address user, uint256 availableBalance);

    error OwnableUnauthorizedAccount(address account);

    // state variable
    address public owner;

    address public logicAddress;

    address public mlnTokenAddr; // Token Address

    ProposalInfo[] public proposalInfos; // Proposal array

    mapping(address => uint256) public balances;

    mapping(address => uint256) public votingLock; // The amount voted by the user

    mapping(uint256 => mapping(uint256 => VoteInfo[]))
        public proposalVotingSituation;

    mapping(uint256 => uint256) public proposalWinningOption; // Record the winning options for settled proposals

    mapping(uint256 => mapping(address => int256)) public userProposalResults; // Record rewards or punishments for settlement proposal users

    // Modifier
    modifier onlyOwner() {
        if (owner != msg.sender) {
            revert OwnableUnauthorizedAccount(msg.sender);
        }
        _;
    }

    // function
    function initialize(address tokenAddr) external initializer {
        mlnTokenAddr = tokenAddr;
        owner = msg.sender;
    }

    function deposit(uint256 amount) external returns (uint256) {
        require(
            IERC20(mlnTokenAddr).transferFrom(
                msg.sender,
                address(this),
                amount
            ),
            "Transfer failed"
        );
        balances[msg.sender] += amount;
        emit Deposited(msg.sender, amount);
        return balances[msg.sender];
    }

    function getProposalInfo(
        uint256 proposalId
    )
        external
        view
        returns (
            address founder,
            string[] memory optionDescs,
            uint256[] memory optionCounts
        )
    {
        ProposalInfo storage proposal = proposalInfos[proposalId];
        uint256 optionLength = proposal.options.length;

        string[] memory descs = new string[](optionLength);
        uint256[] memory counts = new uint256[](optionLength);

        for (uint256 i = 0; i < optionLength; i++) {
            descs[i] = proposal.options[i].desc;
            counts[i] = proposal.options[i].count;
        }

        return (proposal.founder, descs, counts);
    }

    function createProposal(
        string[] memory optionDescs
    ) external returns (uint256) {
        // 推入一个新的ProposalInfo实例到数组中
        proposalInfos.push();
        uint256 len = proposalInfos.length - 1;

        ProposalInfo storage newProposal = proposalInfos[len];
        newProposal.founder = msg.sender;

        for (uint256 i = 0; i < optionDescs.length; i++) {
            newProposal.options.push(Option(optionDescs[i], 0));
        }

        emit CreateProposal(msg.sender, len, optionDescs);
        return len;
    }

    function exchangePoints(uint256 points) external returns (uint256) {
        require(points > 0, "Points must be greater than zero");
        balances[msg.sender] += points;
        emit ExchangePoints(msg.sender, points);
        return balances[msg.sender];
    }

    function withdraw(uint256 amount) external {
        uint256 availableBalance = getAvailableBalance(msg.sender);

        if (availableBalance >= amount) {
            revert InsufficientBalance(msg.sender, availableBalance);
        }
        require(
            IERC20(mlnTokenAddr).transfer(msg.sender, amount),
            "Transfer failed"
        );
        balances[msg.sender] -= amount;
        emit Withdraw(msg.sender, amount, balances[msg.sender]);
    }

    function vote(
        uint256 proposalId,
        uint256 optionId,
        uint256 amount
    ) external {
        require(
            getAvailableBalance(msg.sender) >= amount,
            "Insufficient voting rights"
        );
        votingLock[msg.sender] += amount;
        ProposalInfo storage proposal = proposalInfos[proposalId];
        proposal.options[optionId].count += amount;
        proposalVotingSituation[proposalId][optionId].push(
            VoteInfo(msg.sender, amount)
        );

        emit Voted(msg.sender, proposalId, optionId, amount);
    }

    function proposalSettlement(
        uint256 proposalId,
        uint256 winOptionId
    ) external {
        bool isSingleOptionStatus = isSingleOptionProposal(
            proposalId,
            winOptionId
        );

        if (isSingleOptionStatus) {
            handleSingleOptionProposal(proposalId, winOptionId);
        } else {
            handleMultiOptionProposal(proposalId, winOptionId);
        }
        proposalWinningOption[proposalId] = winOptionId;
    }

    function handleSingleOptionProposal(
        uint256 proposalId,
        uint256 winOptionId
    ) internal {
        mapping(uint256 => VoteInfo[])
            storage voteRecords = proposalVotingSituation[winOptionId];

        for (uint256 i = 0; i < voteRecords[winOptionId].length; i++) {
            VoteInfo memory voteInfo = voteRecords[winOptionId][i];
            votingLock[voteInfo.user] -= voteInfo.amount;
        }
        emit ProposalRefunded(proposalId, winOptionId);
    }

    function handleMultiOptionProposal(
        uint256 proposalId,
        uint256 winOptionId
    ) internal {
        ProposalInfo storage proposalInfo = proposalInfos[proposalId];
        mapping(uint256 => VoteInfo[])
            storage voteRecords = proposalVotingSituation[winOptionId];

        uint256 totalStake;
        uint256 optionCount = proposalInfo.options.length;
        uint256 winVoteCount = proposalInfo.options[winOptionId].count;

        for (uint256 i = 0; i < optionCount; i++) {
            totalStake += proposalInfo.options[i].count;
        }

        balances[proposalInfo.founder] += (totalStake * 5) / 100;
        uint256 totalStakeExtractFee = (totalStake * 90) / 100;

        for (uint256 i = 0; i < optionCount; i++) {
            distributeRewardsAndPenalties(
                proposalId,
                winOptionId,
                totalStakeExtractFee,
                winVoteCount,
                voteRecords[i],
                i
            );
        }
    }

    function distributeRewardsAndPenalties(
        uint256 proposalId,
        uint256 winOptionId,
        uint256 totalStakeExtractFee,
        uint256 winVoteCount,
        VoteInfo[] memory voteInfos,
        uint256 optionId
    ) internal {
        for (uint256 j = 0; j < voteInfos.length; j++) {
            VoteInfo memory voteInfo = voteInfos[j];
            votingLock[voteInfo.user] -= voteInfo.amount;

            if (optionId == winOptionId) {
                uint256 reward = (voteInfo.amount * totalStakeExtractFee) /
                    winVoteCount;
                uint256 rewardExcludingPrincipal = reward - voteInfo.amount;
                balances[voteInfo.user] += rewardExcludingPrincipal;
                userProposalResults[proposalId][voteInfo.user] = int256(
                    rewardExcludingPrincipal
                );
                emit ProposalSettlement(
                    voteInfo.user,
                    proposalId,
                    int256(rewardExcludingPrincipal)
                );
            } else {
                balances[voteInfo.user] -= voteInfo.amount;
                userProposalResults[proposalId][voteInfo.user] =
                    int256(voteInfo.amount) *
                    -1;
                emit ProposalSettlement(
                    voteInfo.user,
                    proposalId,
                    int256(voteInfo.amount) * -1
                );
            }
        }
    }

    function getAvailableBalance(address user) public view returns (uint256) {
        uint256 totalBalance = balances[user];
        uint256 lockedForVoting = votingLock[user];
        uint256 totalLocked = lockedForVoting;
        return totalBalance - totalLocked;
    }

    function isSingleOptionProposal(
        uint256 proposalId,
        uint256 winOptionId
    ) internal view returns (bool) {
        ProposalInfo memory proposalInfo = proposalInfos[proposalId];
        Option[] memory options = proposalInfo.options;
        for (uint256 i = 0; i < options.length; i++) {
            if (i != winOptionId && options[i].count > 0) {
                return false;
            }
        }
        return true;
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {
        logicAddress = newImplementation;
    }
}
